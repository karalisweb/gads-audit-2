import {
  IsString,
  IsOptional,
  IsUUID,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AIRecommendationItem {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  priority: string;

  @IsString()
  @IsNotEmpty()
  entityType: string;

  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsString()
  @IsNotEmpty()
  entityName: string;

  @IsString()
  @IsNotEmpty()
  action: string;

  @IsString()
  @IsOptional()
  currentValue?: string;

  @IsString()
  @IsOptional()
  suggestedValue?: string;

  @IsString()
  @IsOptional()
  rationale?: string;

  @IsString()
  @IsOptional()
  expectedImpact?: string;
}

export class CreateFromAIDto {
  @IsUUID()
  @IsNotEmpty()
  accountId: string;

  @IsNumber()
  moduleId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AIRecommendationItem)
  recommendations: AIRecommendationItem[];
}

export class CreateFromAIResponseItem {
  recommendationId: string;
  modificationId?: string;
  status: 'created' | 'skipped' | 'error';
  error?: string;
}

export class CreateFromAIResponse {
  results: CreateFromAIResponseItem[];
  totalCreated: number;
  totalSkipped: number;
  totalErrors: number;
}
