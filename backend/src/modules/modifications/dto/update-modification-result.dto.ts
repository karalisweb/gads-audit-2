import { IsBoolean, IsString, IsOptional, IsObject } from 'class-validator';

export class UpdateModificationResultDto {
  @IsBoolean()
  success: boolean;

  @IsString()
  @IsOptional()
  message?: string;

  @IsObject()
  @IsOptional()
  details?: Record<string, unknown>;
}
