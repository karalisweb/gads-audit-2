import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class GeminiProvider {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly configService: ConfigService,
  ) {}

  async getClient(): Promise<GoogleGenAI> {
    let apiKey = await this.settingsService.getGeminiApiKey();
    if (!apiKey) {
      apiKey = this.configService.get<string>('ai.geminiApiKey') ?? null;
    }
    if (!apiKey) {
      throw new BadRequestException(
        'Gemini API key not configured. Please configure it in Settings > AI.',
      );
    }
    return new GoogleGenAI({ apiKey });
  }

  async getModelConfig(): Promise<{ model: string; maxTokens: number }> {
    let model = await this.settingsService.getGeminiModel();
    if (!model) {
      model = this.configService.get<string>('ai.geminiModel') || 'gemini-3-flash-preview';
    }
    const maxTokens = this.configService.get<number>('ai.maxTokens') || 4096;
    return { model, maxTokens };
  }
}
