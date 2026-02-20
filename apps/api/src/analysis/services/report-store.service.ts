import { Injectable } from '@nestjs/common';

import type { AnalysisResponse } from '../types/analyze.types';

@Injectable()
export class ReportStoreService {
  private readonly store = new Map<string, AnalysisResponse>();

  save(result: AnalysisResponse): void {
    this.store.set(result.requestId, result);
  }

  get(requestId: string): AnalysisResponse | null {
    return this.store.get(requestId) ?? null;
  }
}
