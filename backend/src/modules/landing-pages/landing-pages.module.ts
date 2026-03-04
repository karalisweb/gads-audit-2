import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LandingPagesController } from './landing-pages.controller';
import { LandingPagesService } from './landing-pages.service';
import { ScraperService } from './scraper.service';
import { AIModule } from '../ai/ai.module';
import {
  LandingPageBrief,
  Keyword,
  GoogleAdsAccount,
  ImportRun,
} from '../../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LandingPageBrief,
      Keyword,
      GoogleAdsAccount,
      ImportRun,
    ]),
    AIModule,
  ],
  controllers: [LandingPagesController],
  providers: [LandingPagesService, ScraperService],
  exports: [LandingPagesService],
})
export class LandingPagesModule {}
