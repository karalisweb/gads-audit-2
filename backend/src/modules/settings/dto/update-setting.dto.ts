import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class UpdateSettingDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsOptional()
  value?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class AISettingsDto {
  @IsString()
  @IsOptional()
  aiProvider?: string;

  @IsString()
  @IsOptional()
  openaiApiKey?: string;

  @IsString()
  @IsOptional()
  openaiModel?: string;

  @IsString()
  @IsOptional()
  geminiApiKey?: string;

  @IsString()
  @IsOptional()
  geminiModel?: string;

  @IsString()
  @IsOptional()
  claudeApiKey?: string;

  @IsString()
  @IsOptional()
  claudeModel?: string;
}

export class AISettingsResponseDto {
  provider: string;
  hasApiKey: boolean;
  apiKeyLast4?: string;
  model: string;
  hasGeminiApiKey: boolean;
  geminiApiKeyLast4?: string;
  geminiModel: string;
  hasClaudeApiKey: boolean;
  claudeApiKeyLast4?: string;
  claudeModel: string;
}
