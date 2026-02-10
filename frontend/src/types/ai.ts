export interface AIRecommendation {
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
  campaignId?: string;
  adGroupId?: string;
}

export interface AIAnalysisResponse {
  moduleId: number;
  moduleName: string;
  summary: string;
  recommendations: AIRecommendation[];
  analyzedAt: string;
  dataStats: {
    totalRecords: number;
    analyzedRecords: number;
  };
}

export interface SupportedModule {
  moduleId: number;
  moduleName: string;
  moduleNameIt: string;
}

export interface AnalyzeModuleRequest {
  moduleId: number;
  filters?: Record<string, unknown>;
}

export interface CreateFromAIRequest {
  accountId: string;
  moduleId: number;
  recommendations: AIRecommendation[];
}

export interface CreateFromAIResponseItem {
  recommendationId: string;
  modificationId?: string;
  status: 'created' | 'skipped' | 'error';
  error?: string;
}

export interface CreateFromAIResponse {
  results: CreateFromAIResponseItem[];
  totalCreated: number;
  totalSkipped: number;
  totalErrors: number;
}
