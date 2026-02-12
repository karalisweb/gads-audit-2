import { apiClient } from './client';
import type {
  Modification,
  ModificationFilters,
  ModificationSummary,
  CreateModificationDto,
  PaginatedResponse,
} from '@/types';

// Helper to build query params
function buildParams(
  filters: Record<string, unknown>,
): Record<string, string | number | boolean | undefined> {
  const params: Record<string, string | number | boolean | undefined> = {};
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        params[key] = value;
      }
    }
  });
  return params;
}

// Get all modifications for an account
export async function getModifications(
  accountId: string,
  filters: ModificationFilters = {},
): Promise<PaginatedResponse<Modification>> {
  const params = buildParams(filters as Record<string, unknown>);
  return apiClient.get<PaginatedResponse<Modification>>(
    `/modifications/account/${accountId}`,
    params,
  );
}

// Get modification summary
export async function getModificationSummary(
  accountId: string,
): Promise<ModificationSummary> {
  return apiClient.get<ModificationSummary>(
    `/modifications/account/${accountId}/summary`,
  );
}

// Get single modification
export async function getModification(id: string): Promise<Modification> {
  return apiClient.get<Modification>(`/modifications/${id}`);
}

// Create a new modification
export async function createModification(
  data: CreateModificationDto,
): Promise<Modification> {
  return apiClient.post<Modification>('/modifications', data);
}

// Approve a modification
export async function approveModification(id: string): Promise<Modification> {
  return apiClient.post<Modification>(`/modifications/${id}/approve`);
}

// Reject a modification
export async function rejectModification(
  id: string,
  reason: string,
): Promise<Modification> {
  return apiClient.post<Modification>(`/modifications/${id}/reject`, {
    reason,
  });
}

// Cancel a modification
export async function cancelModification(id: string): Promise<Modification> {
  return apiClient.post<Modification>(`/modifications/${id}/cancel`);
}

// Bulk approve modifications
export async function bulkApproveModifications(
  ids: string[],
): Promise<(Modification | { id: string; error: string })[]> {
  return apiClient.post<(Modification | { id: string; error: string })[]>(
    '/modifications/bulk-approve',
    { ids },
  );
}

// Bulk reject modifications
export async function bulkRejectModifications(
  ids: string[],
  reason: string,
): Promise<(Modification | { id: string; error: string })[]> {
  return apiClient.post<(Modification | { id: string; error: string })[]>(
    '/modifications/bulk-reject',
    { ids, reason },
  );
}
