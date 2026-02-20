import { Module } from '@nestjs/common';

import { AnalysisController } from '../analysis/analysis.controller';
import { AnalysisService } from '../analysis/analysis.service';
import { IsAvgTicketValueConstraint } from '../analysis/dto/avg-ticket.validator';
import { CacheModule } from '../cache/cache.module';
import { InsightsModule } from '../insights/insights.module';
import { PlacesModule } from '../places/places.module';
import { ReportModule } from '../report/report.module';
import { ScoringModule } from '../scoring/scoring.module';

@Module({
  imports: [CacheModule, PlacesModule, ScoringModule, InsightsModule, ReportModule],
  controllers: [AnalysisController],
  providers: [AnalysisService, IsAvgTicketValueConstraint],
  exports: [AnalysisService],
})
export class AnalyzeModule {}
