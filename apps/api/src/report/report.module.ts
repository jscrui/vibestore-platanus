import { Module } from '@nestjs/common';

import { ReportController } from '../analysis/report.controller';
import { ReportService } from '../analysis/services/report.service';
import { ReportStoreService } from '../analysis/services/report-store.service';

@Module({
  controllers: [ReportController],
  providers: [ReportStoreService, ReportService],
  exports: [ReportStoreService, ReportService],
})
export class ReportModule {}
