import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting, GoogleAdsAccount } from '../../entities';
import { AISettingsDto, AISettingsResponseDto } from './dto';
import * as crypto from 'crypto';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private readonly encryptionKey: string;

  constructor(
    @InjectRepository(SystemSetting)
    private settingRepository: Repository<SystemSetting>,
    @InjectRepository(GoogleAdsAccount)
    private accountsRepository: Repository<GoogleAdsAccount>,
  ) {
    // Use JWT_SECRET as encryption key or fallback
    this.encryptionKey = process.env.JWT_SECRET || 'default-encryption-key-change-me';
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(encryptedText: string): string {
    try {
      const parts = encryptedText.split(':');
      if (parts.length !== 2) return encryptedText;
      const iv = Buffer.from(parts[0], 'hex');
      const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(parts[1], 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      this.logger.error('Decryption error:', error);
      return encryptedText;
    }
  }

  async getSetting(key: string): Promise<string | null> {
    const setting = await this.settingRepository.findOne({ where: { key } });
    if (!setting || !setting.value) return null;
    return setting.isEncrypted ? this.decrypt(setting.value) : setting.value;
  }

  async setSetting(key: string, value: string, isEncrypted = false): Promise<SystemSetting> {
    let setting = await this.settingRepository.findOne({ where: { key } });
    
    const storedValue = isEncrypted ? this.encrypt(value) : value;

    if (setting) {
      setting.value = storedValue;
      setting.isEncrypted = isEncrypted;
    } else {
      setting = this.settingRepository.create({
        key,
        value: storedValue,
        isEncrypted,
      });
    }

    return this.settingRepository.save(setting);
  }

  async getAISettings(): Promise<AISettingsResponseDto> {
    const apiKey = await this.getSetting('openai_api_key');
    const model = await this.getSetting('openai_model');

    return {
      hasApiKey: !!apiKey && apiKey.length > 0,
      apiKeyLast4: apiKey ? '****' + apiKey.slice(-4) : undefined,
      model: model || 'gpt-4o',
    };
  }

  async updateAISettings(dto: AISettingsDto): Promise<AISettingsResponseDto> {
    if (dto.openaiApiKey !== undefined) {
      if (dto.openaiApiKey === '') {
        // Clear the API key
        await this.settingRepository.delete({ key: 'openai_api_key' });
      } else {
        await this.setSetting('openai_api_key', dto.openaiApiKey, true);
      }
    }

    if (dto.openaiModel !== undefined) {
      await this.setSetting('openai_model', dto.openaiModel, false);
    }

    this.logger.log('AI settings updated');
    return this.getAISettings();
  }

  // Method to get API key for AIService
  async getOpenAIApiKey(): Promise<string | null> {
    return this.getSetting('openai_api_key');
  }

  async getOpenAIModel(): Promise<string> {
    const model = await this.getSetting('openai_model');
    return model || 'gpt-4o';
  }

  // Schedule settings
  async getScheduleSettings(): Promise<{
    enabled: boolean;
    cronExpression: string;
    emailRecipients: string[];
    time: string;
    accountsPerRun: number;
  }> {
    const enabled = await this.getSetting('schedule_enabled');
    const cron = await this.getSetting('schedule_cron');
    const recipients = await this.getSetting('schedule_email_recipients');
    const time = await this.getSetting('schedule_time');
    const accountsPerRun = await this.getSetting('schedule_accounts_per_run');

    return {
      enabled: enabled === 'true',
      cronExpression: cron || '0 7 * * 1', // Default: Monday 7 AM
      emailRecipients: recipients ? recipients.split(',').map(e => e.trim()) : [],
      time: time || '07:00',
      accountsPerRun: accountsPerRun ? parseInt(accountsPerRun, 10) : 2,
    };
  }

  async updateScheduleSettings(settings: {
    enabled?: boolean;
    cronExpression?: string;
    emailRecipients?: string[];
    time?: string;
    accountsPerRun?: number;
  }): Promise<{ enabled: boolean; cronExpression: string; emailRecipients: string[]; time: string; accountsPerRun: number }> {
    if (settings.enabled !== undefined) {
      await this.setSetting('schedule_enabled', String(settings.enabled));
    }
    if (settings.cronExpression !== undefined) {
      await this.setSetting('schedule_cron', settings.cronExpression);
    }
    if (settings.emailRecipients !== undefined) {
      await this.setSetting('schedule_email_recipients', settings.emailRecipients.join(','));
    }
    if (settings.time !== undefined) {
      await this.setSetting('schedule_time', settings.time);
    }
    if (settings.accountsPerRun !== undefined) {
      await this.setSetting('schedule_accounts_per_run', String(settings.accountsPerRun));
    }
    this.logger.log('Schedule settings updated');
    return this.getScheduleSettings();
  }

  // Internal: rotazione account
  async getLastAccountIndex(): Promise<number> {
    const val = await this.getSetting('schedule_last_account_index');
    return val ? parseInt(val, 10) : 0;
  }

  async setLastAccountIndex(index: number): Promise<void> {
    await this.setSetting('schedule_last_account_index', String(index));
  }

  // =========================================================================
  // DASHBOARD: Prossima analisi schedulata
  // =========================================================================

  async getNextAnalysisInfo(): Promise<{
    enabled: boolean;
    nextRunAt: string | null;
    nextAccounts: string[];
    accountsPerRun: number;
    time: string;
  }> {
    const schedule = await this.getScheduleSettings();

    if (!schedule.enabled) {
      return {
        enabled: false,
        nextRunAt: null,
        nextAccounts: [],
        accountsPerRun: schedule.accountsPerRun,
        time: schedule.time,
      };
    }

    // Calcola prossimi account in rotazione
    const accounts = await this.accountsRepository.find({
      order: { customerName: 'ASC' },
    });

    const lastIndex = await this.getLastAccountIndex();
    const perRun = schedule.accountsPerRun;
    const nextAccounts: string[] = [];

    for (let i = 0; i < perRun && accounts.length > 0; i++) {
      const idx = (lastIndex + i) % accounts.length;
      nextAccounts.push(accounts[idx].customerName);
    }

    // Calcola prossima data/ora di esecuzione
    const nextRunAt = this.calculateNextRun(schedule.cronExpression, schedule.time);

    return {
      enabled: true,
      nextRunAt,
      nextAccounts,
      accountsPerRun: schedule.accountsPerRun,
      time: schedule.time,
    };
  }

  private calculateNextRun(cronExpression: string, time: string): string | null {
    try {
      // Estrai ora e minuti dal campo time (es: "08:45")
      const [hours, minutes] = time.split(':').map(Number);

      // Estrai i giorni dalla cron expression (campo 5: day of week)
      const cronParts = cronExpression.trim().split(/\s+/);
      const dayOfWeekField = cronParts[4] || '*'; // 0=Dom, 1=Lun, ...

      // Parse giorni validi
      let validDays: number[] = [];
      if (dayOfWeekField === '*') {
        validDays = [0, 1, 2, 3, 4, 5, 6];
      } else if (dayOfWeekField.includes('-')) {
        const [start, end] = dayOfWeekField.split('-').map(Number);
        for (let d = start; d <= end; d++) validDays.push(d);
      } else if (dayOfWeekField.includes(',')) {
        validDays = dayOfWeekField.split(',').map(Number);
      } else {
        validDays = [parseInt(dayOfWeekField, 10)];
      }

      // Cerca il prossimo slot valido (max 14 giorni avanti)
      const now = new Date();
      for (let daysAhead = 0; daysAhead <= 14; daysAhead++) {
        const candidate = new Date(now);
        candidate.setDate(candidate.getDate() + daysAhead);
        candidate.setHours(hours, minutes, 0, 0);

        const dayOfWeek = candidate.getDay();
        if (!validDays.includes(dayOfWeek)) continue;

        // Se è oggi, controlla che l'ora non sia già passata
        if (daysAhead === 0 && candidate.getTime() <= now.getTime()) continue;

        return candidate.toISOString();
      }

      return null;
    } catch {
      return null;
    }
  }
}
