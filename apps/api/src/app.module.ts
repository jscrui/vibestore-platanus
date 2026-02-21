import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'node:path';

import { AnalyzeModule } from './analyze/analyze.module';
import { AppController } from './app.controller';
import { ChatModule } from './chat/chat.module';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [resolve(__dirname, '../../../.env'), '.env'],
    }),
    CommonModule,
    AnalyzeModule,
    ChatModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
