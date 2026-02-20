import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AnalyzeModule } from './analyze/analyze.module';
import { AppController } from './app.controller';
import { CommonModule } from './common/common.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), CommonModule, AnalyzeModule],
  controllers: [AppController],
})
export class AppModule {}
