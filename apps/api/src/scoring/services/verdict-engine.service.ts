import { Injectable } from '@nestjs/common';

import type { Verdict } from '../../analysis/constants/business-category';

@Injectable()
export class VerdictEngineService {
  pick(score: number): Verdict {
    if (score <= 39) {
      return 'DO_NOT_OPEN';
    }

    if (score <= 69) {
      return 'OPEN_WITH_CONDITIONS';
    }

    return 'OPEN';
  }
}
