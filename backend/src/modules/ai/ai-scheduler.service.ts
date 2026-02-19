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

  // Check every hour at :00 — actual time/day checks are inside
  @Cron('0 * * * *')
  async handleScheduledAnalysis() {
    if (this.runningAnalysis) {
      return;
    }

    const settings = await this.settingsService.getScheduleSettings();

    if (!settings.enabled) {
      return;
    }

    // Check if current hour matches the configured time
    if (!this.isScheduledTime(settings.time)) {
      return;
    }

    // Check if today matches the cron day-of-week
    if (!this.shouldRunToday(settings.cronExpression)) {
      return;
    }

    this.runningAnalysis = true;

    try {
      const allAccounts = await this.accountRepository.find({
        where: { isActive: true },
        order: { customerName: 'ASC' },
      });

      if (allAccounts.length === 0) {
        this.logger.log('No active accounts found, skipping scheduled analysis');
        return;
      }

      // Rotazione: prendi i prossimi N account
      const accountsPerRun = settings.accountsPerRun;
      const lastIndex = await this.settingsService.getLastAccountIndex();
      const accountsToAnalyze = this.getNextAccounts(allAccounts, lastIndex, accountsPerRun);

      // Aggiorna l'indice per la prossima esecuzione
      const newIndex = (lastIndex + accountsPerRun) % allAccounts.length;
      await this.settingsService.setLastAccountIndex(newIndex);

      const accountNames = accountsToAnalyze.map(a => a.customerName || a.customerId).join(', ');
      this.logger.log(`Starting scheduled AI analysis for ${accountsToAnalyze.length} accounts: ${accountNames}`);

      const results: { accountName: string; success: boolean; recommendations: number; modificationsCreated: number; modificationsSkipped: number; error?: string }[] = [];

      for (const account of accountsToAnalyze) {
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
      if (settings.emailRecipients.length > 0) {
        try {
          await this.emailService.sendAnalysisDigest(settings.emailRecipients, results);
          this.logger.log(`Analysis digest sent to ${settings.emailRecipients.join(', ')}`);
        } catch (error) {
          this.logger.error(`Failed to send analysis digest: ${error.message}`);
        }
      }
    } finally {
      this.runningAnalysis = false;
    }
  }

  private isScheduledTime(time: string): boolean {
    const now = new Date();
    const currentHour = now.getHours().toString().padStart(2, '0');
    const currentMinute = now.getMinutes().toString().padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;

    // Il cron gira ogni ora a :00, quindi confrontiamo solo l'ora
    const [scheduledHour] = (time || '07:00').split(':');
    return currentHour === scheduledHour.padStart(2, '0');
  }

  private shouldRunToday(cronExpression: string): boolean {
    try {
      const parts = cronExpression.split(' ');
      if (parts.length < 5) return true;

      const dayOfWeek = parts[4];
      const today = new Date().getDay(); // 0=Sunday, 6=Saturday

      if (dayOfWeek === '*') return true;

      // Handle ranges like "1-5"
      if (dayOfWeek.includes('-')) {
        const [start, end] = dayOfWeek.split('-').map(d => parseInt(d.trim(), 10));
        return today >= start && today <= end;
      }

      // Handle comma-separated values like "1,3,5"
      const allowedDays = dayOfWeek.split(',').map(d => parseInt(d.trim(), 10));
      return allowedDays.includes(today);
    } catch {
      return true;
    }
  }

  private getNextAccounts(
    allAccounts: GoogleAdsAccount[],
    startIndex: number,
    count: number,
  ): GoogleAdsAccount[] {
    const total = allAccounts.length;
    if (count >= total) return allAccounts;

    const safeStart = startIndex % total;
    const selected: GoogleAdsAccount[] = [];
    for (let i = 0; i < count; i++) {
      selected.push(allAccounts[(safeStart + i) % total]);
    }
    return selected;
  }
}
