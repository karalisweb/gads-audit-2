import { apiClient } from './client';
import type { PaginatedResponse } from '@/types/audit';
import type {
  Decision,
  DecisionFilters,
  DecisionSummary,
  CreateDecisionDto,
  UpdateDecisionDto,
  ChangeSet,
  ChangeSetFilters,
  CreateChangeSetDto,
  UpdateChangeSetDto,
  ExportPreview,
} from '@/types/decisions';

// Decisions API

export async function getDecisions(
  accountId: string,
  filters: DecisionFilters = {},
): Promise<PaginatedResponse<Decision>> {
  return apiClient.get<PaginatedResponse<Decision>>(`/decisions/account/${accountId}`, {
    ...filters,
  });
}

export async function getDecisionSummary(accountId: string): Promise<DecisionSummary> {
  return apiClient.get<DecisionSummary>(`/decisions/account/${accountId}/summary`);
}

export async function getDecision(id: string): Promise<Decision> {
  return apiClient.get<Decision>(`/decisions/${id}`);
}

export async function getDecisionHistory(groupId: string): Promise<Decision[]> {
  return apiClient.get<Decision[]>(`/decisions/group/${groupId}/history`);
}

export async function createDecision(dto: CreateDecisionDto): Promise<Decision> {
  return apiClient.post<Decision>('/decisions', dto);
}

export async function updateDecision(id: string, dto: UpdateDecisionDto): Promise<Decision> {
  return apiClient.patch<Decision>(`/decisions/${id}`, dto);
}

export async function approveDecision(id: string): Promise<Decision> {
  return apiClient.post<Decision>(`/decisions/${id}/approve`);
}

export async function bulkApproveDecisions(ids: string[]): Promise<Decision[]> {
  return apiClient.post<Decision[]>('/decisions/bulk-approve', { ids });
}

export async function rollbackDecision(id: string): Promise<Decision> {
  return apiClient.post<Decision>(`/decisions/${id}/rollback`);
}

export async function deleteDecision(id: string): Promise<{ deleted: boolean; id: string }> {
  return apiClient.delete<{ deleted: boolean; id: string }>(`/decisions/${id}`);
}

// Change Sets (Export) API

export async function getChangeSets(
  accountId: string,
  filters: ChangeSetFilters = {},
): Promise<PaginatedResponse<ChangeSet>> {
  return apiClient.get<PaginatedResponse<ChangeSet>>(`/export/account/${accountId}/change-sets`, {
    ...filters,
  });
}

export async function getExportableDecisions(accountId: string): Promise<Decision[]> {
  return apiClient.get<Decision[]>(`/export/account/${accountId}/exportable-decisions`);
}

export async function getChangeSet(id: string): Promise<ChangeSet> {
  return apiClient.get<ChangeSet>(`/export/change-sets/${id}`);
}

export async function getExportPreview(changeSetId: string): Promise<ExportPreview> {
  return apiClient.get<ExportPreview>(`/export/change-sets/${changeSetId}/preview`);
}

export async function createChangeSet(dto: CreateChangeSetDto): Promise<ChangeSet> {
  return apiClient.post<ChangeSet>('/export/change-sets', dto);
}

export async function updateChangeSet(id: string, dto: UpdateChangeSetDto): Promise<ChangeSet> {
  return apiClient.patch<ChangeSet>(`/export/change-sets/${id}`, dto);
}

export async function addDecisionsToChangeSet(
  changeSetId: string,
  decisionIds: string[],
): Promise<ChangeSet> {
  return apiClient.post<ChangeSet>(`/export/change-sets/${changeSetId}/add-decisions`, {
    decisionIds,
  });
}

export async function removeDecisionFromChangeSet(
  changeSetId: string,
  decisionId: string,
): Promise<ChangeSet> {
  return apiClient.post<ChangeSet>(`/export/change-sets/${changeSetId}/remove-decision`, {
    decisionId,
  });
}

export async function approveChangeSet(id: string): Promise<ChangeSet> {
  return apiClient.post<ChangeSet>(`/export/change-sets/${id}/approve`);
}

export async function exportChangeSet(id: string): Promise<ChangeSet> {
  return apiClient.post<ChangeSet>(`/export/change-sets/${id}/export`);
}

export async function downloadChangeSet(id: string): Promise<void> {
  const token = apiClient.getAccessToken();
  const url = `/api/export/change-sets/${id}/download`;

  const response = await fetch(url, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Download failed');
  }

  const blob = await response.blob();
  const contentDisposition = response.headers.get('Content-Disposition');
  const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || 'export.zip';

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export async function markChangeSetAsApplied(id: string): Promise<ChangeSet> {
  return apiClient.post<ChangeSet>(`/export/change-sets/${id}/mark-applied`);
}

export async function deleteChangeSet(id: string): Promise<{ deleted: boolean; id: string }> {
  return apiClient.delete<{ deleted: boolean; id: string }>(`/export/change-sets/${id}`);
}
