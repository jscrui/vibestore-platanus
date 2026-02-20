import { Module } from '@nestjs/common';

import { AnalysisCacheService } from '../analysis/services/cache.service';
import { CacheStore } from './cache-store.service';

@Module({
  providers: [CacheStore, AnalysisCacheService],
  exports: [CacheStore, AnalysisCacheService],
})
export class CacheModule {}
