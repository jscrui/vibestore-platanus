import { Injectable } from '@nestjs/common';

import { FeaturesBuilderService } from '../../scoring/services/features-builder.service';
import type { TicketBucket } from '../constants/business-category';
import type { HardMetrics, PlaceRecord } from '../types/analyze.types';

@Injectable()
export class FeaturesService {
  constructor(private readonly featuresBuilder: FeaturesBuilderService) {}

  buildHardMetrics(params: {
    same800: PlaceRecord[];
    same1500: PlaceRecord[];
    all800: PlaceRecord[];
    ticketBucket?: TicketBucket;
    isFoodCategory: boolean;
  }): HardMetrics {
    return this.featuresBuilder.buildHardMetrics(params);
  }
}
