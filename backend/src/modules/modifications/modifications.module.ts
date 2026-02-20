import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModificationsController } from './modifications.controller';
import { ModificationsService } from './modifications.service';
import { Modification } from '../../entities/modification.entity';
import { GoogleAdsAccount } from '../../entities/google-ads-account.entity';
import { User } from '../../entities/user.entity';
import { AIAnalysisLog } from '../../entities/ai-analysis-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Modification, GoogleAdsAccount, User, AIAnalysisLog])],
  controllers: [ModificationsController],
  providers: [ModificationsService],
  exports: [ModificationsService],
})
export class ModificationsModule {}
