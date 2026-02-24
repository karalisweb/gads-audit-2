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
  private runningAnalysis = false;

  constructor(
    private readonly aiService: AIService,
    private readonly emailService: EmailService,
    private readonly settingsService: SettingsService,
    private readonly modificationsService: ModificationsService,
    @InjectRepository(GoogleAdsAccount)
    private readonly accountRepository: Repository<GoogleAdsAccount>,
  ) {}

  // Check every hour at :00 — each account has its own day/time config
  @Cron('0 * * * *')
  async handleScheduledAnalysis() {
    if (this.runningAnalysis) {
      return;
    }

    this.runningAnalysis = true;

    try {
      // Find all active accounts with scheduling enabled
      const accounts = await this.accountRepository.find({
        where: { isActive: true, scheduleEnabled: true },
      });

      if (accounts.length === 0) {
        return;
      }

      const now = new Date();
      const currentHour = now.getHours().toString().padStart(2, '0');
      const currentDay = now.getDay(); // 0=Sunday, 6=Saturday

      // Filter accounts that should run right now
      const accountsToRun = accounts.filter(account => {
        if (!account.scheduleDays || !account.scheduleDays.includes(currentDay)) {
          return false;
        }
        const [scheduledHour] = (account.scheduleTime || '07:00').split(':');
        return currentHour === scheduledHour.padStart(2, '0');
      });

      if (accountsToRun.length === 0) {
        return;
      }

      const accountNames = accountsToRun.map(a => a.customerName || a.customerId).join(', ');
      this.logger.log(`Starting scheduled AI analysis for ${accountsToRun.length} accounts: ${accountNames}`);

      const results: { accountName: string; success: boolean; recommendations: number; modificationsCreated: number; modificationsSkipped: number; error?: string }[] = [];

      for (const account of accountsToRun) {
        try {
          const { log, moduleRecommendations } = await this.aiService.analyzeAllModules(
            account.id,
            undefined,
            AnalysisTriggerType.SCHEDULED,
          );

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
      const emailRecipients = await this.settingsService.getScheduleEmailRecipients();
      if (emailRecipients.length > 0 && results.length > 0) {
        try {
          await this.emailService.sendAnalysisDigest(emailRecipients, results);
          this.logger.log(`Analysis digest sent to ${emailRecipients.join(', ')}`);
        } catch (error) {
          this.logger.error(`Failed to send analysis digest: ${error.message}`);
        }
      }
    } finally {
      this.runningAnalysis = false;
    }
  }
}
