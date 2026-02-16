import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AIService } from './ai.service';
import { EmailService } from '../email/email.service';
import { SettingsService } from '../settings/settings.service';
import { ModificationsService } from '../modifications/modifications.service';
import { GoogleAdsAccount, AnalysisTriggerType } from '../../entities';

@Injectable()
export class AISchedulerService {
  private readonly logger = new Logger(AISchedulerService.name);

  constructor(
    private readonly aiService: AIService,
    private readonly emailService: EmailService,
    private readonly settingsService: SettingsService,
    private readonly modificationsService: ModificationsService,
    @InjectRepository(GoogleAdsAccount)
    private readonly accountRepository: Repository<GoogleAdsAccount>,
  ) {}

  // Run every day at 8:30 AM — the actual schedule check (day of week) is inside
  @Cron('30 8 * * *')
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

    const results: { accountName: string; success: boolean; recommendations: number; modificationsCreated: number; modificationsSkipped: number; error?: string }[] = [];

    for (const account of accounts) {
      try {
        const { log, moduleRecommendations } = await this.aiService.analyzeAllModules(
          account.id,
          undefined, // No user for scheduled
          AnalysisTriggerType.SCHEDULED,
        );

        // Auto-create modifications from recommendations
        let totalCreated = 0;
        let totalSkipped = 0;
        for (const { moduleId, recommendations } of moduleRecommendations) {
          if (recommendations.length === 0) continue;
          try {
            const createResult = await this.modificationsService.createFromAI(
              {
                accountId: account.id,
                moduleId,
                recommendations: recommendations.map(r => ({
                  id: r.id,
                  priority: r.priority,
                  entityType: r.entityType,
                  entityId: r.entityId,
                  entityName: r.entityName,
                  action: r.action,
                  currentValue: r.currentValue,
                  suggestedValue: r.suggestedValue,
                  rationale: r.rationale,
                  expectedImpact: r.expectedImpact,
                  campaignId: r.campaignId,
                  adGroupId: r.adGroupId,
                })),
              },
              null,
            );
            totalCreated += createResult.totalCreated;
            totalSkipped += createResult.totalSkipped;
          } catch (error) {
            this.logger.error(`Failed to create modifications for module ${moduleId} of ${account.customerName}: ${error.message}`);
          }
        }

        results.push({
          accountName: account.customerName || account.customerId,
          success: true,
          recommendations: log.totalRecommendations,
          modificationsCreated: totalCreated,
          modificationsSkipped: totalSkipped,
        });
        this.logger.log(`Scheduled analysis completed for ${account.customerName}: ${log.totalRecommendations} recommendations, ${totalCreated} modifications created`);
      } catch (error) {
        results.push({
          accountName: account.customerName || account.customerId,
          success: false,
          recommendations: 0,
          modificationsCreated: 0,
          modificationsSkipped: 0,
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
