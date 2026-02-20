import { Injectable } from '@nestjs/common';

import { InsightsFallbackService } from '../../insights/services/insights-fallback.service';
import { LlmInsightsService } from '../../insights/services/llm-insights.service';
import type { BusinessCategory, Verdict } from '../constants/business-category';
import type { HardMetrics, InsightPack } from '../types/analyze.types';

@Injectable()
export class InsightsService {
  constructor(
    private readonly llmInsightsService: LlmInsightsService,
    private readonly insightsFallbackService: InsightsFallbackService,
  ) {}

  async generate(params: {
    businessCategory: BusinessCategory;
    formattedAddress: string;
    hardMetrics: HardMetrics;
    finalScore: number;
    verdict: Verdict;
  }): Promise<InsightPack> {
    const fallback = this.insightsFallbackService.generate(params);

    if (!this.llmInsightsService.isEnabled()) {
      return fallback;
    }

    try {
      return await this.llmInsightsService.generate(params, fallback);
    } catch {
      return fallback;
    }
  }
}
