import {
  Controller,
  Get,
  Put,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { AISettingsDto, AISettingsResponseDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators';
import { UserRole } from '../../entities/user.entity';

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('ai')
  @Roles(UserRole.ADMIN)
  async getAISettings(): Promise<AISettingsResponseDto> {
    return this.settingsService.getAISettings();
  }

  @Patch('ai')
  @Roles(UserRole.ADMIN)
  async updateAISettings(@Body() dto: AISettingsDto): Promise<AISettingsResponseDto> {
    return this.settingsService.updateAISettings(dto);
  }

  @Get('schedule')
  @Roles(UserRole.ADMIN)
  async getScheduleSettings() {
    const emailRecipients = await this.settingsService.getScheduleEmailRecipients();
    return { emailRecipients };
  }

  @Put('schedule')
  @Roles(UserRole.ADMIN)
  async updateScheduleSettings(
    @Body() dto: { emailRecipients?: string[] },
  ) {
    if (dto.emailRecipients !== undefined) {
      await this.settingsService.updateScheduleEmailRecipients(dto.emailRecipients);
    }
    const emailRecipients = await this.settingsService.getScheduleEmailRecipients();
    return { emailRecipients };
  }

  @Get('next-analysis')
  @Roles(UserRole.ADMIN)
  async getNextAnalysis() {
    return this.settingsService.getNextAnalysisInfo();
  }
}
