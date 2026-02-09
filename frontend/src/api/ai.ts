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
