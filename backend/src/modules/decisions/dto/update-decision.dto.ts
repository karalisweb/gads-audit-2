import { IsString, IsOptional, IsObject, MaxLength } from 'class-validator';

export class UpdateDecisionDto {
  @IsObject()
  @IsOptional()
  afterValue?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  rationale?: string;

  @IsObject()
  @IsOptional()
  evidence?: Record<string, unknown>;
}
