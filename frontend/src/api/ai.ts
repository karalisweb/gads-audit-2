import { apiClient } from './client';
import type {
  AIAnalysisResponse,
  SupportedModule,
  AnalyzeModuleRequest,
  CreateFromAIRequest,
  CreateFromAIResponse,
} from '@/types/ai';

export async function analyzeModule(
  accountId: string,
  request: AnalyzeModuleRequest,
): Promise<AIAnalysisResponse> {
  return apiClient.post<AIAnalysisResponse>(`/ai/analyze/${accountId}`, request);
}

export async function getSupportedModules(): Promise<SupportedModule[]> {
  return apiClient.get<SupportedModule[]>('/ai/modules');
}

export async function createModificationsFromAI(
  data: CreateFromAIRequest,
): Promise<CreateFromAIResponse> {
  return apiClient.post<CreateFromAIResponse>('/modifications/from-ai', data);
}

// AI Analysis Log
export interface AIAnalysisLog {
  id: string;
  accountId: string;
  triggeredById: string | null;
  triggeredBy?: { email: string } | null;
  triggerType: 'manual' | 'scheduled';
  modulesAnalyzed: number[];
  totalRecommendations: number;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  errorMessage: string | null;
  moduleResults: Record<string, { success: boolean; recommendations: number; error?: string }> | null;
}

export interface AcceptanceRate {
  total: number;
  approved: number;
  rejected: number;
  pending: number;
  applied: number;
  rate: number;
}

export async function analyzeAllModules(accountId: string): Promise<AIAnalysisLog> {
  return apiClient.post<AIAnalysisLog>(`/ai/analyze-all/${accountId}`);
}

export async function getAnalysisHistory(accountId: string, limit = 10): Promise<AIAnalysisLog[]> {
  return apiClient.get<AIAnalysisLog[]>(`/ai/history/${accountId}`, { limit });
}

export async function getAcceptanceRate(accountId: string): Promise<AcceptanceRate> {
  return apiClient.get<AcceptanceRate>(`/ai/acceptance-rate/${accountId}`);
}
