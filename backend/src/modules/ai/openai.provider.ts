import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class OpenAIProvider {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly configService: ConfigService,
  ) {}

  async getClient(): Promise<OpenAI> {
    let apiKey = await this.settingsService.getOpenAIApiKey();
    if (!apiKey) {
      apiKey = this.configService.get<string>('ai.openaiApiKey') ?? null;
    }
    if (!apiKey) {
      throw new BadRequestException(
        'OpenAI API key not configured. Please configure it in Settings > AI.',
      );
    }
    return new OpenAI({ apiKey });
  }

  async getModelConfig(): Promise<{ model: string; isGpt5: boolean; maxTokens: number }> {
    let model = await this.settingsService.getOpenAIModel();
    if (!model) {
      model = this.configService.get<string>('ai.openaiModel') || 'gpt-4o';
    }
    const maxTokens = this.configService.get<number>('ai.maxTokens') || 4096;
    const isGpt5 = model.startsWith('gpt-5');
    return { model, isGpt5, maxTokens };
  }
}
