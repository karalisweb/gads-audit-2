import { IsNumber, IsUUID, IsOptional, IsObject } from 'class-validator';

export class AnalyzeModuleDto {
  @IsNumber()
  moduleId: number;

  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;
}

export class AIRecommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  entityType: string;
  entityId: string;
  entityName: string;
  action: string;
  currentValue?: string;
  suggestedValue?: string;
  rationale: string;
  expectedImpact?: string;
}

export class AIAnalysisResponse {
  moduleId: number;
  moduleName: string;
  summary: string;
  recommendations: AIRecommendation[];
  analyzedAt: Date;
  dataStats: {
    totalRecords: number;
    analyzedRecords: number;
  };
}

export class ApproveRecommendationsDto {
  @IsUUID('4', { each: true })
  recommendationIds: string[];

  @IsNumber()
  moduleId: number;
}

export class ApprovedRecommendation {
  recommendationId: string;
  decisionId: string;
  status: 'created' | 'error';
  error?: string;
}

export class ApproveRecommendationsResponse {
  approved: ApprovedRecommendation[];
  totalCreated: number;
  totalErrors: number;
}
