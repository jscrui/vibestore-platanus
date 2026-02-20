import { HttpStatus, Injectable } from '@nestjs/common';

import { ApiError } from '../../common/api-error';
import type { BusinessCategory, Verdict } from '../../analysis/constants/business-category';
import type { HardMetrics, InsightPack } from '../../analysis/types/analyze.types';

interface LlmResponseShape {
  bullets?: unknown;
  summary?: unknown;
  recommendationAngle?: unknown;
}

const ALLOWED_ANGLES = [
  'specialty',
  'take-away',
  'hours',
  'pricing',
  'niche-audience',
] as const;

type RecommendationAngle = (typeof ALLOWED_ANGLES)[number];

@Injectable()
export class LlmInsightsService {
  private readonly llmEndpoint =
    process.env.LLM_ENDPOINT ?? 'https://api.openai.com/v1/chat/completions';
  private readonly llmModel = process.env.LLM_MODEL ?? 'gpt-4.1-mini';
  private readonly llmApiKey = process.env.LLM_API_KEY ?? process.env.OPENAI_API_KEY;
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
      response = await fetch(this.llmEndpoint, {
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
                'You are an analyst. Use ONLY provided metrics. Return STRICT JSON with keys: bullets, summary, recommendationAngle.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
        signal: controller.signal,
      });
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

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('LLM empty response');
    }

    const parsed = JSON.parse(content) as LlmResponseShape;

    return this.normalizeLlmResponse(parsed, fallbackPack);
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
      `Business category: ${params.businessCategory}`,
      `Address: ${params.formattedAddress}`,
      '',
      'Metrics:',
      `count_same_800m=${params.hardMetrics.count_same_800m}`,
      `count_same_1500m=${params.hardMetrics.count_same_1500m}`,
      `density_all_800m=${params.hardMetrics.density_all_800m}`,
      `avg_rating_same=${params.hardMetrics.avg_rating_same}`,
      `median_reviews_same=${params.hardMetrics.median_reviews_same}`,
      `total_reviews_all_800m=${params.hardMetrics.total_reviews_all_800m}`,
      `count_food_drink_800m=${params.hardMetrics.count_food_drink_800m}`,
      `price_level_distribution=${JSON.stringify(params.hardMetrics.price_level_distribution)}`,
      `detected_price_gap=${JSON.stringify(params.hardMetrics.detected_price_gap)}`,
      `finalScore=${params.finalScore}`,
      `verdict=${params.verdict}`,
      '',
      'Task:',
      '1) Provide 5 actionable bullets grounded in metrics and include numbers.',
      '2) Provide a concise 2-3 sentence summary.',
      '3) Suggest ONE recommendationAngle among: specialty, take-away, hours, pricing, niche-audience.',
      'Return JSON only.',
    ].join('\n');
  }
}
