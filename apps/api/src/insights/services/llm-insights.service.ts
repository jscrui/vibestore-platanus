import { HttpStatus, Injectable } from '@nestjs/common';

import { ApiError } from '../../common/api-error';
import type { BusinessCategory, Verdict } from '../../analysis/constants/business-category';
import type { HardMetrics, InsightPack } from '../../analysis/types/analyze.types';

interface LlmResponseShape {
  bullets?: unknown;
  summary?: unknown;
  recommendationAngle?: unknown;
}

interface OpenAiResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

interface AnthropicResponse {
  content?: Array<{ type?: string; text?: string }>;
}

const ALLOWED_ANGLES = [
  'specialty',
  'take-away',
  'hours',
  'pricing',
  'niche-audience',
] as const;

type RecommendationAngle = (typeof ALLOWED_ANGLES)[number];
type LlmProvider = 'openai' | 'anthropic';

function sanitizeEnv(value: string | undefined, fallback: string): string {
  const source = (value ?? fallback).trim();
  return source.replace(/^['"]|['"]$/g, '');
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
export class LlmInsightsService {
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

  isEnabled(): boolean {
    return Boolean(this.llmApiKey);
  }

  async generate(
    params: {
      businessCategory: BusinessCategory;
      formattedAddress: string;
      hardMetrics: HardMetrics;
      finalScore: number;
      verdict: Verdict;
    },
    fallbackPack: InsightPack,
  ): Promise<InsightPack> {
    if (!this.llmApiKey) {
      return fallbackPack;
    }

    const prompt = this.buildPrompt(params);

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
              max_tokens: 900,
              system:
                'You are an analyst. Use ONLY provided metrics. Return STRICT JSON with keys: bullets, summary, recommendationAngle.',
              messages: [
                {
                  role: 'user',
                  content: prompt,
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
                  content:
                    'Eres un analista experto en viabilidad comercial. Usa SOLO las métricas proporcionadas. Responde ÚNICAMENTE en JSON con las claves: bullets (array de strings en español), summary (string en español), recommendationAngle (string en inglés).',
                },
                {
                  role: 'user',
                  content: prompt,
                },
              ],
            }),
            signal: controller.signal,
          },
      );
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError(
          HttpStatus.GATEWAY_TIMEOUT,
          'TIMEOUT',
          'Timeout consultando proveedor externo.',
          { upstream: 'LLM', timeoutMs: this.timeoutMs },
        );
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new Error(`LLM request failed: ${response.status}`);
    }

    const content = this.llmProvider === 'anthropic'
      ? this.extractAnthropicContent((await response.json()) as AnthropicResponse)
      : this.extractOpenAiContent((await response.json()) as OpenAiResponse);

    if (!content) {
      throw new Error('LLM empty response');
    }

    const parsed = this.parseJsonContent(content);

    return this.normalizeLlmResponse(parsed, fallbackPack);
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

  private parseJsonContent(content: string): LlmResponseShape {
    try {
      return JSON.parse(content) as LlmResponseShape;
    } catch {
      const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
      if (fenced) {
        return JSON.parse(fenced) as LlmResponseShape;
      }

      const objectLike = content.match(/\{[\s\S]*\}/)?.[0];
      if (objectLike) {
        return JSON.parse(objectLike) as LlmResponseShape;
      }

      throw new Error('LLM invalid JSON response');
    }
  }

  private normalizeLlmResponse(llm: LlmResponseShape, fallbackPack: InsightPack): InsightPack {
    const bulletsRaw = Array.isArray(llm.bullets)
      ? llm.bullets.filter((item): item is string => typeof item === 'string')
      : [];

    const bullets = bulletsRaw.slice(0, 5);
    while (bullets.length < 5) {
      bullets.push(fallbackPack.bullets[bullets.length]);
    }

    const summary =
      typeof llm.summary === 'string' && llm.summary.trim().length > 0
        ? llm.summary.trim()
        : fallbackPack.summary;

    const recommendationAngle: RecommendationAngle =
      typeof llm.recommendationAngle === 'string' &&
        ALLOWED_ANGLES.includes(llm.recommendationAngle as RecommendationAngle)
        ? (llm.recommendationAngle as RecommendationAngle)
        : fallbackPack.recommendationAngle;

    return {
      bullets,
      summary,
      recommendationAngle,
    };
  }

  private buildPrompt(params: {
    businessCategory: BusinessCategory;
    formattedAddress: string;
    hardMetrics: HardMetrics;
    finalScore: number;
    verdict: Verdict;
  }): string {
    return [
      `Rubro: ${params.businessCategory}`,
      `Dirección: ${params.formattedAddress}`,
      '',
      'Métricas reales de la zona:',
      `count_same_800m=${params.hardMetrics.count_same_800m}`,
      `count_same_1500m=${params.hardMetrics.count_same_1500m}`,
      `density_all_800m=${params.hardMetrics.density_all_800m}`,
      `avg_rating_same=${params.hardMetrics.avg_rating_same}`,
      `median_reviews_same=${params.hardMetrics.median_reviews_same}`,
      `total_reviews_all_800m=${params.hardMetrics.total_reviews_all_800m}`,
      `count_food_drink_800m=${params.hardMetrics.count_food_drink_800m}`,
      `price_level_distribution=${JSON.stringify(params.hardMetrics.price_level_distribution)}`,
      `detected_price_gap=${JSON.stringify(params.hardMetrics.detected_price_gap)}`,
      `score_final=${params.finalScore}`,
      `veredicto=${params.verdict}`,
      '',
      'Tarea:',
      '1) Escribe 5 recomendaciones accionables en español, fundamentadas en las métricas, incluyendo números concretos.',
      '2) Escribe un resumen conciso de 2-3 oraciones en español.',
      '3) Sugiere UN ángulo de recomendación entre: specialty, take-away, hours, pricing, niche-audience.',
      'Responde SOLO en JSON.',
    ].join('\n');
  }

}
