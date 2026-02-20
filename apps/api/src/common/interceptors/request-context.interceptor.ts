import { randomUUID } from 'node:crypto';

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { RequestContextService } from '../services/request-context.service';

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestContextInterceptor.name);

  constructor(private readonly requestContext: RequestContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<{ method?: string; originalUrl?: string; url?: string; headers?: Record<string, string | string[] | undefined> }>();
    const response = http.getResponse<{ setHeader: (name: string, value: string) => void; statusCode?: number }>();

    const incomingRequestId = request.headers?.['x-request-id'];
    const requestId =
      (Array.isArray(incomingRequestId) ? incomingRequestId[0] : incomingRequestId) ??
      randomUUID();

    response.setHeader('x-request-id', requestId);

    const method = request.method ?? 'UNKNOWN';
    const url = request.originalUrl ?? request.url ?? '';
    const startedAt = Date.now();

    return this.requestContext.run(requestId, () =>
      next.handle().pipe(
        finalize(() => {
          const elapsedMs = Date.now() - startedAt;
          const statusCode = response.statusCode ?? 0;
          this.logger.log(
            `${method} ${url} ${statusCode} - ${elapsedMs}ms - requestId=${requestId}`,
          );
        }),
      ),
    );
  }
}
