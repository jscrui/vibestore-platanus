import { ServerResponse } from 'node:http';

import { Controller, Get, Post, Body, Query, Res, HttpStatus } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags, ApiQuery, ApiBody } from '@nestjs/swagger';

import { HealthResponseDto } from './app.dto';

function sanitizeEnv(value: string | undefined, fallback: string): string {
  const source = (value ?? fallback).trim();
  const hasDoubleQuotes = source.startsWith('"') && source.endsWith('"');
  const hasSingleQuotes = source.startsWith("'") && source.endsWith("'");
  return hasDoubleQuotes || hasSingleQuotes ? source.slice(1, -1) : source;
}

@ApiTags('Health')
@Controller()
export class AppController {
  @ApiOperation({
    summary: 'Health check',
    description: 'Confirma que la API está levantada y lista para recibir requests.',
  })
  @ApiOkResponse({
    description: 'Estado operativo del servicio.',
    type: HealthResponseDto,
  })
  @Get('health')
  health(): HealthResponseDto {
    return {
      status: 'ok',
      service: '@vibe-store/api',
      timestamp: new Date().toISOString(),
    };
  }

  // ── Street View proxy ──────────────────────────────────────────────────────

  @ApiOperation({
    summary: 'Street View proxy',
    description: 'Sirve una imagen de Google Street View Static sin exponer la API key al cliente.',
  })
  @ApiQuery({ name: 'lat', type: String })
  @ApiQuery({ name: 'lng', type: String })
  @ApiQuery({ name: 'width', type: String, required: false })
  @ApiQuery({ name: 'height', type: String, required: false })
  @ApiQuery({ name: 'fov', type: String, required: false })
  @Get('streetview')
  async streetview(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('width') width = '800',
    @Query('height') height = '400',
    @Query('fov') fov = '90',
    @Res() res: ServerResponse,
  ): Promise<void> {
    const apiKey =
      process.env.GOOGLE_MAPS_API_KEY ?? process.env.GOOGLE_PLACES_API_KEY;

    const sendJson = (status: number, body: object): void => {
      const data = JSON.stringify(body);
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(data);
    };

    if (!apiKey) {
      sendJson(HttpStatus.BAD_GATEWAY, { error: 'API key not configured' });
      return;
    }

    if (!lat || !lng) {
      sendJson(HttpStatus.BAD_REQUEST, { error: 'lat and lng are required' });
      return;
    }

    const params = new URLSearchParams({
      size: `${width}x${height}`,
      location: `${lat},${lng}`,
      fov,
      pitch: '0',
      key: apiKey,
    });

    const url = `https://maps.googleapis.com/maps/api/streetview?${params.toString()}`;

    try {
      const upstream = await fetch(url);
      const contentType = upstream.headers.get('content-type') ?? 'image/jpeg';
      const buffer = Buffer.from(await upstream.arrayBuffer());
      res.writeHead(upstream.status, {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Content-Length': buffer.length,
      });
      res.end(buffer);
    } catch {
      sendJson(HttpStatus.BAD_GATEWAY, { error: 'Failed to fetch Street View' });
    }
  }

  // ── LLM Visual Diagnosis ───────────────────────────────────────────────────

  @ApiOperation({
    summary: 'LLM visual diagnosis',
    description:
      'Genera un diagnóstico de viabilidad con visión basado en la imagen de Street View y los datos del análisis.',
  })
  @ApiBody({ schema: { type: 'object' } })
  @Post('diagnosis')
  async diagnosis(@Body() body: Record<string, unknown>): Promise<{ diagnosis: string }> {
    const llmEndpoint = sanitizeEnv(
      process.env.LLM_ENDPOINT,
      'https://api.anthropic.com/v1/messages',
    );
    const llmModel = sanitizeEnv(process.env.LLM_MODEL, 'claude-3-5-sonnet-latest');
    const llmApiKey = sanitizeEnv(
      process.env.LLM_API_KEY ?? process.env.ANTHROPIC_API_KEY ?? process.env.OPENAI_API_KEY,
      '',
    );
    const anthropicVersion = sanitizeEnv(process.env.ANTHROPIC_VERSION, '2023-06-01');
    const isAnthropic =
      llmEndpoint.includes('anthropic.com') || llmModel.includes('claude');
    const mapsKey = process.env.GOOGLE_MAPS_API_KEY ?? process.env.GOOGLE_PLACES_API_KEY ?? '';

    const { lat, lng, address, businessCategory, viabilityScore, verdict, hardMetrics, avgTicket } =
      body as Record<string, unknown>;

    // Fetch Street View image as base64 to pass to the LLM
    let imageBase64: string | null = null;
    let imageMime = 'image/jpeg';
    if (lat && lng && mapsKey) {
      try {
        const svParams = new URLSearchParams({
          size: '640x400',
          location: `${lat},${lng}`,
          fov: '85',
          pitch: '0',
          key: mapsKey,
        });
        const svRes = await fetch(
          `https://maps.googleapis.com/maps/api/streetview?${svParams.toString()}`,
        );
        if (svRes.ok) {
          const ct = svRes.headers.get('content-type') ?? 'image/jpeg';
          if (ct.startsWith('image/')) {
            imageMime = ct;
            imageBase64 = Buffer.from(await svRes.arrayBuffer()).toString('base64');
          }
        }
      } catch {
        // continue without image
      }
    }

    const metrics = hardMetrics as Record<string, unknown> | undefined;
    const contextText = [
      `Dirección: ${address ?? 'desconocida'}`,
      `Rubro: ${businessCategory ?? 'desconocido'}`,
      `Score de viabilidad: ${viabilityScore ?? 'N/A'}/100`,
      `Veredicto: ${verdict ?? 'N/A'}`,
      `Ticket promedio: ${avgTicket ? `$${avgTicket}` : 'no especificado'}`,
      `Competidores en 800m del mismo rubro: ${metrics?.count_same_800m ?? 'N/A'}`,
      `Negocios totales en 800m: ${metrics?.density_all_800m ?? 'N/A'}`,
      `Rating promedio de competidores: ${metrics?.avg_rating_same ?? 'N/A'}`,
    ].join('\n');

    const systemPrompt = [
      'Eres un experto en análisis de viabilidad comercial y retail.',
      'Tu tarea es generar un diagnóstico conciso, honesto y accionable en español.',
      'Analiza los datos cuantitativos y la imagen de Street View de la ubicación (si está disponible).',
      'Evalúa el entorno visual: peatones, tipo de calle, densidad urbana, locales vecinos, estado del barrio.',
      'Combina lo visual con los datos para dar una evaluación holística.',
      'El texto debe tener MÁXIMO 1000 caracteres. Sé directo y específico.',
      'No uses bullet points. Escribe en párrafos fluidos.',
      'No empieces con "La ubicación" ni repitas el nombre del negocio al inicio.',
      'Finaliza con una recomendación concreta: proceder, ajustar o descartar.',
    ].join(' ');

    if (!llmApiKey) {
      return {
        diagnosis: `Score ${viabilityScore ?? 'N/A'}/100 — Análisis generado sin LLM configurado.`,
      };
    }

    try {
      let requestBody: object;

      if (isAnthropic) {
        const userContent: unknown[] = [];
        if (imageBase64) {
          userContent.push({
            type: 'image',
            source: { type: 'base64', media_type: imageMime, data: imageBase64 },
          });
        }
        userContent.push({ type: 'text', text: contextText });
        requestBody = {
          model: llmModel,
          temperature: 0.5,
          max_tokens: 700,
          system: systemPrompt,
          messages: [{ role: 'user', content: userContent }],
        };
      } else {
        const userContent: unknown[] = [];
        if (imageBase64) {
          userContent.push({
            type: 'image_url',
            image_url: { url: `data:${imageMime};base64,${imageBase64}` },
          });
        }
        userContent.push({ type: 'text', text: contextText });
        requestBody = {
          model: llmModel,
          temperature: 0.5,
          max_tokens: 700,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
        };
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (isAnthropic) {
        headers['x-api-key'] = llmApiKey;
        headers['anthropic-version'] = anthropicVersion;
      } else {
        headers['Authorization'] = `Bearer ${llmApiKey}`;
      }

      const llmRes = await fetch(llmEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!llmRes.ok) {
        return { diagnosis: 'No se pudo generar el diagnóstico en este momento.' };
      }

      const payload = (await llmRes.json()) as Record<string, unknown>;
      let text: string | null = null;

      if (isAnthropic) {
        const content = payload.content as Array<{ type?: string; text?: string }> | undefined;
        text = content?.find((b) => b.type === 'text')?.text ?? null;
      } else {
        const choices = payload.choices as
          | Array<{ message?: { content?: string } }>
          | undefined;
        text = choices?.[0]?.message?.content ?? null;
      }

      if (!text) {
        return { diagnosis: 'No se pudo generar el diagnóstico en este momento.' };
      }

      const trimmed = text.length > 1000 ? text.slice(0, 997) + '...' : text;
      return { diagnosis: trimmed };
    } catch {
      return { diagnosis: 'Error al generar el diagnóstico. Intenta nuevamente.' };
    }
  }
}
