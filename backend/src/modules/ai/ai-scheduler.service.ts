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

  /**
   * Calcola il numero della settimana ISO dell'anno.
   * Usato per determinare se eseguire l'analisi in base alla frequenza.
   */
  private getISOWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  /**
   * Determina se l'analisi deve essere eseguita questa settimana
   * in base alla frequenza configurata.
   * - weekly: ogni settimana
   * - biweekly: settimane pari (2, 4, 6...)
   * - monthly: solo la prima settimana del mese (giorno 1-7)
   */
  private shouldRunThisWeek(now: Date, frequency: string): boolean {
    switch (frequency) {
      case 'biweekly': {
        const weekNum = this.getISOWeekNumber(now);
        return weekNum % 2 === 0; // Esegui nelle settimane pari
      }
      case 'monthly': {
        return now.getDate() <= 7; // Esegui solo nella prima settimana del mese
      }
      case 'weekly':
      default:
        return true; // Esegui sempre
    }
  }

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
        // Check day of week
        if (!account.scheduleDays || !account.scheduleDays.includes(currentDay)) {
          return false;
        }
        // Check hour
        const [scheduledHour] = (account.scheduleTime || '07:00').split(':');
        if (currentHour !== scheduledHour.padStart(2, '0')) {
          return false;
        }
        // Check frequency
        return this.shouldRunThisWeek(now, account.scheduleFrequency || 'weekly');
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
