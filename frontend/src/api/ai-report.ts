import { apiClient } from './client';

export interface AuditReport {
  id: string;
  accountId: string;
  content: string | null;
  status: 'generating' | 'completed' | 'failed';
  generatedAt: string;
  durationMs: number | null;
  aiProvider: string | null;
  aiModel: string | null;
  metadata: Record<string, unknown> | null;
}

export interface ReportMessage {
  id: string;
  reportId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface ReportHistoryResponse {
  reports: AuditReport[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function generateReport(accountId: string): Promise<AuditReport> {
  return apiClient.post<AuditReport>(`/ai/report/${accountId}`);
}

export async function getLatestReport(accountId: string): Promise<AuditReport | null> {
  return apiClient.get<AuditReport | null>(`/ai/report/${accountId}`);
}

export async function sendChatMessage(accountId: string, message: string, reportId?: string): Promise<ReportMessage> {
  return apiClient.post<ReportMessage>(`/ai/report/${accountId}/chat`, { message, reportId });
}

export async function getReportMessages(accountId: string): Promise<ReportMessage[]> {
  return apiClient.get<ReportMessage[]>(`/ai/report/${accountId}/messages`);
}

export async function getReportHistory(accountId: string, page = 1, limit = 20): Promise<ReportHistoryResponse> {
  return apiClient.get<ReportHistoryResponse>(`/ai/reports/${accountId}?page=${page}&limit=${limit}`);
}

export async function getReportById(accountId: string, reportId: string): Promise<AuditReport | null> {
  return apiClient.get<AuditReport | null>(`/ai/reports/${accountId}/${reportId}`);
}

export async function getReportMessagesById(accountId: string, reportId: string): Promise<ReportMessage[]> {
  return apiClient.get<ReportMessage[]>(`/ai/reports/${accountId}/${reportId}/messages`);
}
