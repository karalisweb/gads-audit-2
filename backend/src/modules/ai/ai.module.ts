import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AIController } from './ai.controller';
import { AIService } from './ai.service';
import { AISchedulerService } from './ai-scheduler.service';
import { ModificationsModule } from '../modifications/modifications.module';
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
    ]),
    ModificationsModule,
  ],
  controllers: [AIController],
  providers: [AIService, AISchedulerService],
  exports: [AIService],
})
export class AIModule {}
