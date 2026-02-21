import { HttpStatus, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { BusinessCategory } from '../analysis/constants/business-category';
import { ApiError } from '../common/api-error';
import type { ChatSessionResponseDto } from './dto/chat.dto';

const MAX_USER_MESSAGE_LENGTH = 240;
const MAX_INVALID_ATTEMPTS = 3;
const REQUIRED_FIELDS = ['address', 'businessCategory', 'avgTicket'] as const;
const BUSINESS_CATEGORY_VALUES = Object.values(BusinessCategory);
const DEFAULT_COUNTRY_BIAS = 'AR';

type RequiredField = (typeof REQUIRED_FIELDS)[number];
type SessionStatus = 'ACTIVE' | 'COMPLETED' | 'CLOSED';
type LlmProvider = 'openai' | 'anthropic';

interface ChatCollectedData {
  address?: string;
  businessCategory?: BusinessCategory;
  avgTicket?: number;
  addressDraft?: string;
}

interface ChatSession {
  sessionId: string;
  status: SessionStatus;
  invalidAttempts: number;
  collectedData: ChatCollectedData;
  createdAt: string;
  updatedAt: string;
}

interface LlmExtractionResponse {
  isAllowedInput?: unknown;
  address?: unknown;
  addressHasCountry?: unknown;
  businessCategory?: unknown;
  avgTicket?: unknown;
}

interface LlmFollowUpResponse {
  assistantMessage?: unknown;
}

interface OpenAiResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

interface AnthropicResponse {
  content?: Array<{ type?: string; text?: string }>;
}

function sanitizeEnv(value: string | undefined, fallback: string): string {
  const source = (value ?? fallback).trim();
  const hasDoubleQuotes = source.startsWith('"') && source.endsWith('"');
  const hasSingleQuotes = source.startsWith("'") && source.endsWith("'");
  return hasDoubleQuotes || hasSingleQuotes ? source.slice(1, -1) : source;
}

function resolveProvider(endpoint: string, model: string): LlmProvider {
  const normalizedEndpoint = endpoint.toLowerCase();
  const normalizedModel = model.toLowerCase();

  if (normalizedEndpoint.includes('anthropic.com') || normalizedModel.includes('claude')) {
    return 'anthropic';
  }

  return 'openai';
}

@Injectable()
export class ChatService {
  private readonly sessions = new Map<string, ChatSession>();

  private readonly llmEndpoint = sanitizeEnv(
    process.env.LLM_ENDPOINT,
    'https://api.anthropic.com/v1/messages',
  );
  private readonly llmModel = sanitizeEnv(process.env.LLM_MODEL, 'claude-3-5-sonnet-latest');
  private readonly llmApiKey = sanitizeEnv(
    process.env.LLM_API_KEY ?? process.env.ANTHROPIC_API_KEY ?? process.env.OPENAI_API_KEY,
    '',
  );
  private readonly llmProvider = resolveProvider(this.llmEndpoint, this.llmModel);
  private readonly anthropicVersion = sanitizeEnv(
    process.env.ANTHROPIC_VERSION,
    '2023-06-01',
  );
  private readonly timeoutMs = Number(process.env.LLM_TIMEOUT_MS ?? 10000);

  startSession(): ChatSessionResponseDto {
    const now = new Date().toISOString();
    const sessionId = `chat_${randomUUID().replaceAll('-', '').slice(0, 16)}`;

    const session: ChatSession = {
      sessionId,
      status: 'ACTIVE',
      invalidAttempts: 0,
      collectedData: {},
      createdAt: now,
      updatedAt: now,
    };

    this.sessions.set(sessionId, session);

    return this.buildResponse(
      session,
      '¿Dónde piensas abrir tu tienda? Dime la dirección completa con país, rubro y ticket promedio.',
    );
  }

  async processMessage(sessionId: string, message: string): Promise<ChatSessionResponseDto> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new ApiError(
        HttpStatus.NOT_FOUND,
        'CHAT_SESSION_NOT_FOUND',
        'No existe una sesión de chat con ese identificador.',
        { sessionId },
      );
    }

    if (session.status !== 'ACTIVE') {
      const assistantMessage =
        session.status === 'CLOSED'
          ? 'La sesión está cerrada. Inicia una nueva sesión para continuar.'
          : 'Ya tengo toda la información requerida. Inicia una nueva sesión para otro análisis.';

      return this.buildResponse(session, assistantMessage);
    }

    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      return this.handleInvalidAttempt(
        session,
        'Mensaje no permitido. Solo puedo recibir dirección completa con país, rubro y ticket promedio.',
      );
    }

    if (trimmedMessage.length > MAX_USER_MESSAGE_LENGTH) {
      return this.handleInvalidAttempt(
        session,
        'Mensaje no permitido. El máximo permitido es 240 caracteres.',
      );
    }

    const extraction = await this.extractFromMessage(session, trimmedMessage);
    if (!extraction.isAllowedInput) {
      return this.handleInvalidAttempt(
        session,
        'Mensaje no permitido. Solo puedo recibir dirección completa con país, rubro y ticket promedio.',
      );
    }

    let requiresCountryInAddress = false;

    if (extraction.address && extraction.addressHasCountry) {
      session.collectedData.address = extraction.address;
      session.collectedData.addressDraft = undefined;
    } else if (extraction.address && !extraction.addressHasCountry) {
      requiresCountryInAddress = true;
      session.collectedData.addressDraft = extraction.address;
    }

    if (extraction.businessCategory) {
      session.collectedData.businessCategory = extraction.businessCategory;
    }

    if (extraction.avgTicket !== null) {
      session.collectedData.avgTicket = extraction.avgTicket;
    }

    session.updatedAt = new Date().toISOString();

    const missingFields = this.getMissingFields(session.collectedData);
    if (missingFields.length === 0) {
      session.status = 'COMPLETED';
      session.updatedAt = new Date().toISOString();

      return this.buildResponse(
        session,
        'Perfecto. Ya tengo dirección completa, rubro y ticket promedio. Genera el análisis para ver tu evaluación.',
      );
    }

    const followUpMessage = await this.buildFollowUpMessage(
      session,
      trimmedMessage,
      missingFields,
      requiresCountryInAddress,
    );

    return this.buildResponse(session, followUpMessage);
  }

  private async extractFromMessage(
    session: ChatSession,
    userMessage: string,
  ): Promise<{
    isAllowedInput: boolean;
    address: string | null;
    addressHasCountry: boolean;
    businessCategory: BusinessCategory | null;
    avgTicket: number | null;
  }> {
    if (!this.llmApiKey) {
      return this.emptyExtraction(true);
    }

    const systemPrompt = [
      'You are a strict extraction and policy engine for a retail feasibility intake chat.',
      'Return JSON only with keys:',
      '{"isAllowedInput": boolean, "address": string|null, "addressHasCountry": boolean, "businessCategory": string|null, "avgTicket": number|null}.',
      'Allowed user intent: messages related to collecting these required fields: full address with country, business category, average ticket.',
      'Valid messages can provide one field, two fields, all fields, corrections, or ask what is still missing.',
      'Set isAllowedInput=true when the message is related to this intake flow, even if only one field is present.',
      'If user is clearly off-topic and unrelated to the intake flow: isAllowedInput=false.',
      `businessCategory must be one of: ${BUSINESS_CATEGORY_VALUES.join(', ')} or null.`,
      'addressHasCountry=true only if the address explicitly includes country.',
      'avgTicket must be numeric and positive, otherwise null.',
    ].join(' ');

    const userPayload = JSON.stringify({
      message: userMessage,
      collectedData: session.collectedData,
    });

    const content = await this.requestLlmContent(systemPrompt, userPayload);
    if (!content) {
      return this.emptyExtraction(true);
    }

    let parsed: LlmExtractionResponse;
    try {
      parsed = this.parseJsonContent(content);
    } catch {
      return this.emptyExtraction(true);
    }

    const address = this.normalizeString(parsed.address);
    const businessCategory = this.normalizeBusinessCategory(parsed.businessCategory);
    const avgTicket = this.normalizeAvgTicket(parsed.avgTicket);
    const hasExtractedField = Boolean(address || businessCategory || avgTicket !== null);

    return {
      isAllowedInput: parsed.isAllowedInput === true || hasExtractedField,
      address,
      addressHasCountry: parsed.addressHasCountry === true,
      businessCategory,
      avgTicket,
    };
  }

  private emptyExtraction(isAllowedInput: boolean): {
    isAllowedInput: boolean;
    address: string | null;
    addressHasCountry: boolean;
    businessCategory: BusinessCategory | null;
    avgTicket: number | null;
  } {
    return {
      isAllowedInput,
      address: null,
      addressHasCountry: false,
      businessCategory: null,
      avgTicket: null,
    };
  }

  private async buildFollowUpMessage(
    session: ChatSession,
    userMessage: string,
    missingFields: RequiredField[],
    requiresCountryInAddress: boolean,
  ): Promise<string> {
    if (!this.llmApiKey) {
      return this.buildMissingFieldsMessage(
        missingFields,
        requiresCountryInAddress,
        session.collectedData.addressDraft ?? null,
      );
    }

    const systemPrompt = [
      'Eres el asistente conversacional de onboarding de Vibe Store.',
      'Tu objetivo es recolectar exactamente tres datos obligatorios:',
      'dirección completa con país, rubro y ticket promedio numérico.',
      'Habla en español, con tono natural, cálido y breve.',
      'Si la dirección es parcial (sin ciudad o país), reconoce positivamente y pregunta ciudad y país.',
      'Haz seguimiento de lo que falta sin repetir mensajes rígidos.',
      'No inicies análisis todavía si faltan datos.',
      'Devuelve SOLO JSON con esta forma: {"assistantMessage":"string"}.',
    ].join(' ');

    const userPayload = JSON.stringify({
      userMessage,
      collectedData: session.collectedData,
      missingFields,
      requiresCountryInAddress,
    });

    const content = await this.requestLlmContent(systemPrompt, userPayload);
    if (!content) {
      return this.buildMissingFieldsMessage(
        missingFields,
        requiresCountryInAddress,
        session.collectedData.addressDraft ?? null,
      );
    }

    let parsed: LlmFollowUpResponse;
    try {
      parsed = this.parseJsonContent(content) as LlmFollowUpResponse;
    } catch {
      return this.buildMissingFieldsMessage(
        missingFields,
        requiresCountryInAddress,
        session.collectedData.addressDraft ?? null,
      );
    }

    const assistantMessage = this.normalizeString(parsed.assistantMessage);
    if (!assistantMessage) {
      return this.buildMissingFieldsMessage(
        missingFields,
        requiresCountryInAddress,
        session.collectedData.addressDraft ?? null,
      );
    }

    return assistantMessage;
  }

  private async requestLlmContent(systemPrompt: string, userPayload: string): Promise<string | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: globalThis.Response;

    try {
      response = await fetch(
        this.llmEndpoint,
        this.llmProvider === 'anthropic'
          ? {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.llmApiKey,
                'anthropic-version': this.anthropicVersion,
              },
              body: JSON.stringify({
                model: this.llmModel,
                temperature: 0.2,
                max_tokens: 450,
                system: systemPrompt,
                messages: [
                  {
                    role: 'user',
                    content: userPayload,
                  },
                ],
              }),
              signal: controller.signal,
            }
          : {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.llmApiKey}`,
              },
              body: JSON.stringify({
                model: this.llmModel,
                temperature: 0.2,
                response_format: { type: 'json_object' },
                messages: [
                  {
                    role: 'system',
                    content: systemPrompt,
                  },
                  {
                    role: 'user',
                    content: userPayload,
                  },
                ],
              }),
              signal: controller.signal,
            },
      );
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      return null;
    }

    try {
      return this.llmProvider === 'anthropic'
        ? this.extractAnthropicContent((await response.json()) as AnthropicResponse)
        : this.extractOpenAiContent((await response.json()) as OpenAiResponse);
    } catch {
      return null;
    }
  }

  private extractOpenAiContent(payload: OpenAiResponse): string | null {
    return payload.choices?.[0]?.message?.content ?? null;
  }

  private extractAnthropicContent(payload: AnthropicResponse): string | null {
    const block = payload.content?.find(
      (entry): entry is { type: string; text: string } =>
        entry?.type === 'text' && typeof entry.text === 'string',
    );

    return block?.text ?? null;
  }

  private parseJsonContent(content: string): LlmExtractionResponse {
    try {
      return JSON.parse(content) as LlmExtractionResponse;
    } catch {
      const firstBrace = content.indexOf('{');
      const lastBrace = content.lastIndexOf('}');
      if (firstBrace >= 0 && lastBrace > firstBrace) {
        const objectLike = content.slice(firstBrace, lastBrace + 1);
        return JSON.parse(objectLike) as LlmExtractionResponse;
      }

      throw new Error('Invalid JSON');
    }
  }

  private normalizeString(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private normalizeBusinessCategory(value: unknown): BusinessCategory | null {
    if (typeof value !== 'string') {
      return null;
    }

    const normalized = value.trim().toUpperCase();
    return BUSINESS_CATEGORY_VALUES.includes(normalized as BusinessCategory)
      ? (normalized as BusinessCategory)
      : null;
  }

  private normalizeAvgTicket(value: unknown): number | null {
    const asNumber =
      typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? Number(value.replaceAll('.', '').replace(',', '.'))
          : Number.NaN;

    if (!Number.isFinite(asNumber) || asNumber <= 0) {
      return null;
    }

    return Math.round(asNumber * 100) / 100;
  }

  private handleInvalidAttempt(
    session: ChatSession,
    assistantMessage: string,
  ): ChatSessionResponseDto {
    session.invalidAttempts += 1;

    if (session.invalidAttempts >= MAX_INVALID_ATTEMPTS) {
      session.status = 'CLOSED';
      session.updatedAt = new Date().toISOString();

      return this.buildResponse(
        session,
        'Sesión cerrada por exceder 3 intentos no permitidos. Inicia una nueva sesión para continuar.',
      );
    }

    session.updatedAt = new Date().toISOString();

    return this.buildResponse(session, assistantMessage);
  }

  private getMissingFields(collectedData: ChatCollectedData): RequiredField[] {
    const missing: RequiredField[] = [];

    if (!collectedData.address) {
      missing.push('address');
    }

    if (!collectedData.businessCategory) {
      missing.push('businessCategory');
    }

    if (collectedData.avgTicket === undefined) {
      missing.push('avgTicket');
    }

    return missing;
  }

  private buildMissingFieldsMessage(
    missingFields: RequiredField[],
    requiresCountryInAddress: boolean,
    addressDraft: string | null,
  ): string {
    if (requiresCountryInAddress && missingFields.includes('address')) {
      const addressContext = addressDraft
        ? ` Tengo "${addressDraft}" como referencia de dirección.`
        : '';
      const needsCategory = missingFields.includes('businessCategory');
      const needsAvgTicket = missingFields.includes('avgTicket');

      if (needsCategory && needsAvgTicket) {
        return `¡Qué bueno!${addressContext} ¿En qué ciudad y país queda? También compárteme rubro y ticket promedio numérico.`;
      }

      if (needsAvgTicket) {
        return `¡Qué bueno!${addressContext} ¿En qué ciudad y país queda? También compárteme el ticket promedio numérico.`;
      }

      if (needsCategory) {
        return `¡Qué bueno!${addressContext} ¿En qué ciudad y país queda? También necesito el rubro.`;
      }

      return `¡Qué bueno!${addressContext} ¿En qué ciudad y país queda exactamente?`;
    }

    if (missingFields.length === REQUIRED_FIELDS.length) {
      return 'Para avanzar necesito tres datos: dirección completa con país, rubro y ticket promedio numérico.';
    }

    const missingAddress = missingFields.includes('address');
    const missingCategory = missingFields.includes('businessCategory');
    const missingAvgTicket = missingFields.includes('avgTicket');

    if (missingAddress && missingAvgTicket && !missingCategory) {
      return 'Perfecto, ya tengo el rubro. Ahora necesito la dirección completa con país y el ticket promedio numérico.';
    }

    if (missingAddress && missingCategory && !missingAvgTicket) {
      return 'Perfecto, ya tengo el ticket promedio. Ahora necesito la dirección completa con país y el rubro.';
    }

    if (missingCategory && missingAvgTicket && !missingAddress) {
      return 'Perfecto, ya tengo la dirección completa. Ahora necesito el rubro y el ticket promedio numérico.';
    }

    if (missingFields.length === 1 && missingFields[0] === 'address') {
      return 'Falta la dirección completa con país.';
    }

    if (missingFields.length === 1 && missingFields[0] === 'businessCategory') {
      return 'Falta el rubro. Envíalo con una categoría concreta.';
    }

    if (missingFields.length === 1 && missingFields[0] === 'avgTicket') {
      return 'Falta el ticket promedio numérico.';
    }

    return `Aún faltan datos obligatorios: ${missingFields.join(', ')}.`;
  }

  private buildResponse(session: ChatSession, assistantMessage: string): ChatSessionResponseDto {
    const missingFields = this.getMissingFields(session.collectedData);
    const readyForAnalysis = session.status === 'COMPLETED' && missingFields.length === 0;

    return {
      sessionId: session.sessionId,
      sessionStatus: session.status,
      assistantMessage,
      invalidAttempts: session.invalidAttempts,
      remainingInvalidAttempts:
        session.status === 'CLOSED'
          ? 0
          : Math.max(0, MAX_INVALID_ATTEMPTS - session.invalidAttempts),
      missingFields,
      readyForAnalysis,
      collectedData: {
        address: session.collectedData.address,
        businessCategory: session.collectedData.businessCategory,
        avgTicket: session.collectedData.avgTicket,
      },
      analysisPayload: readyForAnalysis
        ? {
            address: session.collectedData.address!,
            businessCategory: session.collectedData.businessCategory!,
            avgTicket: session.collectedData.avgTicket!,
            countryBias: DEFAULT_COUNTRY_BIAS,
          }
        : undefined,
    };
  }
}
