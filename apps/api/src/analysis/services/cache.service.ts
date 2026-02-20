import { Injectable } from '@nestjs/common';

import { CacheStore } from '../../cache/cache-store.service';

@Injectable()
export class AnalysisCacheService {
  constructor(private readonly cacheStore: CacheStore) {}

  get<T>(key: string): T | null {
    return this.cacheStore.get<T>(key);
  }

  set<T>(key: string, value: T, ttlSeconds: number): void {
    this.cacheStore.set(key, value, ttlSeconds);
  }
}
