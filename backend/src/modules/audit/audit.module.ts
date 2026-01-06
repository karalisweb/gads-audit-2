import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditRulesService } from './audit-rules.service';
import {
  GoogleAdsAccount,
  ImportRun,
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
  AuditIssue,
  User,
} from '../../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GoogleAdsAccount,
      ImportRun,
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
      AuditIssue,
      User,
    ]),
  ],
  controllers: [AuditController],
  providers: [AuditService, AuditRulesService],
  exports: [AuditService, AuditRulesService],
})
export class AuditModule {}
