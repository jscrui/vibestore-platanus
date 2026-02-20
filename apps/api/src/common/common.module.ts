import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { RequestContextInterceptor } from './interceptors/request-context.interceptor';
import { RequestContextService } from './services/request-context.service';

@Module({
  providers: [
    RequestContextService,
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestContextInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
  exports: [RequestContextService],
})
export class CommonModule {}
