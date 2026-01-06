import { apiClient } from './client';
import type { AIAnalysisResponse, SupportedModule, AnalyzeModuleRequest } from '@/types/ai';

export async function analyzeModule(
  accountId: string,
  request: AnalyzeModuleRequest,
): Promise<AIAnalysisResponse> {
  return apiClient.post<AIAnalysisResponse>(`/ai/analyze/${accountId}`, request);
}

export async function getSupportedModules(): Promise<SupportedModule[]> {
  return apiClient.get<SupportedModule[]>('/ai/modules');
}
