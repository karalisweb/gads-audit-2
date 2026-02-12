import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AIService } from './ai.service';
import { EmailService } from '../email/email.service';
import { SettingsService } from '../settings/settings.service';
import { GoogleAdsAccount, AnalysisTriggerType } from '../../entities';

@Injectable()
export class AISchedulerService {
  private readonly logger = new Logger(AISchedulerService.name);

  constructor(
    private readonly aiService: AIService,
    private readonly emailService: EmailService,
    private readonly settingsService: SettingsService,
    @InjectRepository(GoogleAdsAccount)
    private readonly accountRepository: Repository<GoogleAdsAccount>,
  ) {}

  // Run every day at 7:00 AM — the actual schedule check is inside
  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async handleScheduledAnalysis() {
    const settings = await this.settingsService.getScheduleSettings();

    if (!settings.enabled) {
      return;
    }

    // Check if today matches the cron expression
    // For simplicity, the cron decorator runs daily; we check settings for which day
    // The cron expression from settings is used for display/config but we check day match
    if (!this.shouldRunToday(settings.cronExpression)) {
      return;
    }

    this.logger.log('Starting scheduled AI analysis for all accounts');

    const accounts = await this.accountRepository.find({
      where: { isActive: true },
    });

    const results: { accountName: string; success: boolean; recommendations: number; error?: string }[] = [];

    for (const account of accounts) {
      try {
        const log = await this.aiService.analyzeAllModules(
          account.id,
          undefined, // No user for scheduled
          AnalysisTriggerType.SCHEDULED,
        );
        results.push({
          accountName: account.customerName || account.customerId,
          success: true,
          recommendations: log.totalRecommendations,
        });
        this.logger.log(`Scheduled analysis completed for ${account.customerName}: ${log.totalRecommendations} recommendations`);
      } catch (error) {
        results.push({
          accountName: account.customerName || account.customerId,
          success: false,
          recommendations: 0,
          error: error.message,
        });
        this.logger.error(`Scheduled analysis failed for ${account.customerName}: ${error.message}`);
      }
    }

    // Send email digest
    if (settings.emailRecipients.length > 0) {
      try {
        await this.emailService.sendAnalysisDigest(settings.emailRecipients, results);
        this.logger.log(`Analysis digest sent to ${settings.emailRecipients.join(', ')}`);
      } catch (error) {
        this.logger.error(`Failed to send analysis digest: ${error.message}`);
      }
    }
  }

  private shouldRunToday(cronExpression: string): boolean {
    try {
      // Parse the cron expression to check day of week
      // Format: minute hour dayOfMonth month dayOfWeek
      const parts = cronExpression.split(' ');
      if (parts.length < 5) return true; // If invalid, run anyway

      const dayOfWeek = parts[4];
      const today = new Date().getDay(); // 0=Sunday, 6=Saturday

      if (dayOfWeek === '*') return true;

      // Handle comma-separated values like "1,3,5"
      const allowedDays = dayOfWeek.split(',').map(d => parseInt(d.trim(), 10));
      return allowedDays.includes(today);
    } catch {
      return true; // If parsing fails, run
    }
  }
}
