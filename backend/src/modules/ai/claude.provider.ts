import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class ClaudeProvider {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly configService: ConfigService,
  ) {}

  async getClient(): Promise<Anthropic> {
    let apiKey = await this.settingsService.getClaudeApiKey();
    if (!apiKey) {
      apiKey = this.configService.get<string>('ai.claudeApiKey') ?? null;
    }
    if (!apiKey) {
      throw new BadRequestException(
        'Claude API key not configured. Please configure it in Settings > AI.',
      );
    }
    return new Anthropic({ apiKey });
  }

  async getModelConfig(): Promise<{ model: string; maxTokens: number }> {
    let model = await this.settingsService.getClaudeModel();
    if (!model) {
      model = this.configService.get<string>('ai.claudeModel') || 'claude-sonnet-4-20250514';
    }
    const maxTokens = this.configService.get<number>('ai.maxTokens') || 4096;
    return { model, maxTokens };
  }
}
