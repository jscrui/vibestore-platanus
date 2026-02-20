import { Module } from '@nestjs/common';

import { FeaturesService } from '../analysis/services/features.service';
import { ScoringService } from '../analysis/services/scoring.service';
import { FeaturesBuilderService } from './services/features-builder.service';
import { ScoreEngineService } from './services/score-engine.service';
import { VerdictEngineService } from './services/verdict-engine.service';

@Module({
  providers: [
    FeaturesBuilderService,
    ScoreEngineService,
    VerdictEngineService,
    FeaturesService,
    ScoringService,
  ],
  exports: [FeaturesService, ScoringService],
})
export class ScoringModule {}
