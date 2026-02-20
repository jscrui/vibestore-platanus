import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

interface RequestContextStore {
  requestId: string;
}

@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<RequestContextStore>();

  run<T>(requestId: string, fn: () => T): T {
    return this.storage.run({ requestId }, fn);
  }

  getRequestId(): string | undefined {
    return this.storage.getStore()?.requestId;
  }
}
