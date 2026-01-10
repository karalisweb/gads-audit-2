import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { HmacAuthGuard } from './guards/hmac-auth.guard';
import { ModificationsModule } from '../modifications/modifications.module';
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
    forwardRef(() => ModificationsModule),
  ],
  controllers: [IntegrationsController],
  providers: [IntegrationsService, HmacAuthGuard],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
