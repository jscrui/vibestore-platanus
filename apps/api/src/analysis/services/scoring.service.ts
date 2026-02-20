import { Injectable } from '@nestjs/common';

import { ScoreEngineService } from '../../scoring/services/score-engine.service';
import { VerdictEngineService } from '../../scoring/services/verdict-engine.service';
import type { HardMetrics, ScoreComputation } from '../types/analyze.types';

@Injectable()
export class ScoringService {
  constructor(
    private readonly scoreEngine: ScoreEngineService,
    private readonly verdictEngine: VerdictEngineService,
  ) {}

  compute(hardMetrics: HardMetrics): ScoreComputation {
    const scoreResult = this.scoreEngine.compute(hardMetrics);

    return {
      viabilityScore: scoreResult.viabilityScore,
      verdict: this.verdictEngine.pick(scoreResult.viabilityScore),
      metrics: scoreResult.metrics,
      internal: scoreResult.internal,
    };
  }
}
