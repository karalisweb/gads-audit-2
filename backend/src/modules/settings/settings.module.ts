import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { SystemSetting, GoogleAdsAccount } from '../../entities';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([SystemSetting, GoogleAdsAccount])],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
