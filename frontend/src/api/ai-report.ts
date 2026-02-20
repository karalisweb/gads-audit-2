import { apiClient } from './client';

export interface AuditReport {
  id: string;
  accountId: string;
  content: string | null;
  status: 'generating' | 'completed' | 'failed';
  generatedAt: string;
  durationMs: number | null;
  metadata: Record<string, unknown> | null;
}

export interface ReportMessage {
  id: string;
  reportId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export async function generateReport(accountId: string): Promise<AuditReport> {
  return apiClient.post<AuditReport>(`/ai/report/${accountId}`);
}

export async function getLatestReport(accountId: string): Promise<AuditReport | null> {
  return apiClient.get<AuditReport | null>(`/ai/report/${accountId}`);
}

export async function sendChatMessage(accountId: string, message: string): Promise<ReportMessage> {
  return apiClient.post<ReportMessage>(`/ai/report/${accountId}/chat`, { message });
}

export async function getReportMessages(accountId: string): Promise<ReportMessage[]> {
  return apiClient.get<ReportMessage[]>(`/ai/report/${accountId}/messages`);
}
