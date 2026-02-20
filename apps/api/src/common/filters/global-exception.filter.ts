import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { RequestContextService } from '../services/request-context.service';

interface ErrorBody {
  errorCode: string;
  message: string;
  details?: Record<string, unknown>;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly requestContext: RequestContextService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<{ headers?: Record<string, string | string[] | undefined> }>();
    const response = http.getResponse<{
      setHeader: (name: string, value: string) => void;
      status: (statusCode: number) => { json: (body: ErrorBody) => void };
    }>();

    const requestId =
      this.requestContext.getRequestId() ??
      this.extractRequestIdFromHeaders(request.headers) ??
      randomUUID();

    const { statusCode, body } = this.normalizeException(exception);
    const enriched: ErrorBody = {
      ...body,
      details: {
        ...(body.details ?? {}),
        ...(requestId ? { traceId: requestId } : {}),
      },
    };

    if (statusCode >= 500) {
      this.logger.error(
        `${body.errorCode} - ${body.message} - requestId=${requestId ?? 'n/a'}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.setHeader('x-request-id', requestId);
    response.status(statusCode).json(enriched);
  }

  private normalizeException(exception: unknown): {
    statusCode: number;
    body: ErrorBody;
  } {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const raw = exception.getResponse();

      if (typeof raw === 'object' && raw !== null) {
        const payload = raw as Record<string, unknown>;

        if (typeof payload.errorCode === 'string' && typeof payload.message === 'string') {
          return {
            statusCode,
            body: {
              errorCode: payload.errorCode,
              message: payload.message,
              details: this.normalizeDetails(payload.details),
            },
          };
        }

        if (statusCode === HttpStatus.BAD_REQUEST) {
          const validationMessage = this.extractValidationMessage(payload.message);
          const errorCode = this.isCategoryValidationError(payload.message)
            ? 'INVALID_CATEGORY'
            : 'VALIDATION_ERROR';

          return {
            statusCode,
            body: {
              errorCode,
              message: validationMessage,
              details: {
                issues: payload.message,
              },
            },
          };
        }
      }

      return {
        statusCode,
        body: {
          errorCode: statusCode === HttpStatus.BAD_REQUEST ? 'VALIDATION_ERROR' : 'HTTP_ERROR',
          message: exception.message,
        },
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        errorCode: 'INTERNAL_ERROR',
        message: 'Error interno no controlado.',
      },
    };
  }

  private normalizeDetails(details: unknown): Record<string, unknown> | undefined {
    if (!details || typeof details !== 'object') {
      return undefined;
    }

    return details as Record<string, unknown>;
  }

  private isCategoryValidationError(message: unknown): boolean {
    if (Array.isArray(message)) {
      return message.some((item) =>
        typeof item === 'string' ? item.toLowerCase().includes('businesscategory') : false,
      );
    }

    return typeof message === 'string'
      ? message.toLowerCase().includes('businesscategory')
      : false;
  }

  private extractValidationMessage(message: unknown): string {
    if (Array.isArray(message) && message.length > 0) {
      const first = message[0];
      return typeof first === 'string' ? first : 'Payload inválido.';
    }

    return typeof message === 'string' ? message : 'Payload inválido.';
  }

  private extractRequestIdFromHeaders(
    headers: Record<string, string | string[] | undefined> | undefined,
  ): string | undefined {
    const value = headers?.['x-request-id'];
    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }
}
