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

  // Schedule: email recipients (per-account scheduling is on the account entity)
  async getScheduleEmailRecipients(): Promise<string[]> {
    const recipients = await this.getSetting('schedule_email_recipients');
    return recipients ? recipients.split(',').map(e => e.trim()).filter(Boolean) : [];
  }

  async updateScheduleEmailRecipients(recipients: string[]): Promise<string[]> {
    await this.setSetting('schedule_email_recipients', recipients.join(','));
    this.logger.log('Schedule email recipients updated');
    return recipients;
  }

  // =========================================================================
  // DASHBOARD: Prossima analisi schedulata (per-account)
  // =========================================================================

  async getNextAnalysisInfo(): Promise<{
    enabled: boolean;
    nextRunAt: string | null;
    nextAccounts: string[];
    scheduledAccounts: Array<{
      accountId: string;
      accountName: string;
      scheduleDays: number[];
      scheduleTime: string;
      scheduleFrequency: string;
    }>;
  }> {
    const accounts = await this.accountsRepository.find({
      where: { isActive: true, scheduleEnabled: true },
      order: { customerName: 'ASC' },
    });

    if (accounts.length === 0) {
      return {
        enabled: false,
        nextRunAt: null,
        nextAccounts: [],
        scheduledAccounts: [],
      };
    }

    // Calcola prossimo run: trova il primo (giorno, ora) tra tutti gli account schedulati
    const now = new Date();
    let nextRunAt: Date | null = null;
    let nextAccounts: string[] = [];

    for (let daysAhead = 0; daysAhead <= 7; daysAhead++) {
      const candidate = new Date(now);
      candidate.setDate(candidate.getDate() + daysAhead);
      const dayOfWeek = candidate.getDay();

      // Raggruppa account per orario in questo giorno
      const timeMap = new Map<string, string[]>();
      for (const acc of accounts) {
        if (acc.scheduleDays?.includes(dayOfWeek)) {
          const time = acc.scheduleTime || '07:00';
          if (!timeMap.has(time)) timeMap.set(time, []);
          timeMap.get(time)!.push(acc.customerName || acc.customerId);
        }
      }

      // Ordina per orario e trova il primo slot non ancora passato
      const sortedTimes = Array.from(timeMap.keys()).sort();
      for (const time of sortedTimes) {
        const [h, m] = time.split(':').map(Number);
        const runDate = new Date(candidate);
        runDate.setHours(h, m, 0, 0);

        if (runDate.getTime() > now.getTime()) {
          nextRunAt = runDate;
          nextAccounts = timeMap.get(time)!;
          break;
        }
      }

      if (nextRunAt) break;
    }

    return {
      enabled: true,
      nextRunAt: nextRunAt ? nextRunAt.toISOString() : null,
      nextAccounts,
      scheduledAccounts: accounts.map(a => ({
        accountId: a.id,
        accountName: a.customerName || a.customerId,
        scheduleDays: a.scheduleDays || [],
        scheduleTime: a.scheduleTime || '07:00',
        scheduleFrequency: a.scheduleFrequency || 'weekly',
      })),
    };
  }
}
