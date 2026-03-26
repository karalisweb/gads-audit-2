import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AIController } from './ai.controller';
import { AIService } from './ai.service';
import { AISchedulerService } from './ai-scheduler.service';
import { OpenAIProvider } from './openai.provider';
import { GeminiProvider } from './gemini.provider';
import { ClaudeProvider } from './claude.provider';
import { ModificationsModule } from '../modifications/modifications.module';
import { AuditModule } from '../audit/audit.module';
import {
  Campaign,
  AdGroup,
  Ad,
  Keyword,
  SearchTerm,
  NegativeKeyword,
  Asset,
  ConversionAction,
  GeoPerformance,
  DevicePerformance,
  GoogleAdsAccount,
  ImportRun,
  AIAnalysisLog,
  Modification,
  AuditReport,
  AuditReportMessage,
  AuditIssue,
} from '../../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Campaign,
      AdGroup,
      Ad,
      Keyword,
      SearchTerm,
      NegativeKeyword,
      Asset,
      ConversionAction,
      GeoPerformance,
      DevicePerformance,
      GoogleAdsAccount,
      ImportRun,
      AIAnalysisLog,
      Modification,
      AuditReport,
      AuditReportMessage,
      AuditIssue,
    ]),
    ModificationsModule,
    AuditModule,
  ],
  controllers: [AIController],
  providers: [AIService, AISchedulerService, OpenAIProvider, GeminiProvider, ClaudeProvider],
  exports: [AIService, OpenAIProvider, GeminiProvider, ClaudeProvider],
})
export class AIModule {}
