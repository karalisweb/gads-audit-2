import { IsOptional, IsString, IsEnum } from 'class-validator';
import { LandingPageBriefStatus } from '../../../entities';

export class UpdateBriefDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(LandingPageBriefStatus)
  status?: LandingPageBriefStatus;

  @IsOptional()
  @IsString()
  sourceUrl?: string;
}
