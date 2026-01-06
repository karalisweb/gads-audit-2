import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { CsvGeneratorService } from './csv-generator.service';
import { ChangeSet } from '../../entities/change-set.entity';
import { Decision } from '../../entities/decision.entity';
import { Audit } from '../../entities/audit.entity';
import { GoogleAdsAccount } from '../../entities/google-ads-account.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChangeSet, Decision, Audit, GoogleAdsAccount]),
  ],
  controllers: [ExportController],
  providers: [ExportService, CsvGeneratorService],
  exports: [ExportService, CsvGeneratorService],
})
export class ExportModule {}
