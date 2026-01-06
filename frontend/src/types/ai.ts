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
