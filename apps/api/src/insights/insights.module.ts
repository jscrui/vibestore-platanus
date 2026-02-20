import { Module } from '@nestjs/common';

import { InsightsService } from '../analysis/services/insights.service';
import { InsightsFallbackService } from './services/insights-fallback.service';
import { LlmInsightsService } from './services/llm-insights.service';

@Module({
  providers: [LlmInsightsService, InsightsFallbackService, InsightsService],
  exports: [InsightsService],
})
export class InsightsModule {}
