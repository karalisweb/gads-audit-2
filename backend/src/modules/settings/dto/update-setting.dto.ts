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
  openaiApiKey?: string;

  @IsString()
  @IsOptional()
  openaiModel?: string;
}

export class AISettingsResponseDto {
  hasApiKey: boolean;
  apiKeyLast4?: string;
  model: string;
}
