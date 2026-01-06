import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { HmacAuthGuard } from './guards/hmac-auth.guard';
import {
  GoogleAdsAccount,
  ImportRun,
  ImportChunk,
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
} from '../../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GoogleAdsAccount,
      ImportRun,
      ImportChunk,
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
    ]),
  ],
  controllers: [IntegrationsController],
  providers: [IntegrationsService, HmacAuthGuard],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
