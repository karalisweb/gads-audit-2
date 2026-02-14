import { apiClient } from './client';
import type { User } from '@/types';

export async function getUsers(): Promise<User[]> {
  return apiClient.get<User[]>('/users');
}

export async function getUser(id: string): Promise<User> {
  return apiClient.get<User>(`/users/${id}`);
}

export async function updateUserRole(id: string, role: 'admin' | 'user'): Promise<User> {
  return apiClient.patch<User>(`/users/${id}/role`, { role });
}

export async function deactivateUser(id: string): Promise<{ message: string }> {
  return apiClient.patch<{ message: string }>(`/users/${id}/deactivate`);
}

export async function activateUser(id: string): Promise<{ message: string }> {
  return apiClient.patch<{ message: string }>(`/users/${id}/activate`);
}

export async function deleteUser(id: string): Promise<{ message: string }> {
  return apiClient.delete<{ message: string }>(`/users/${id}`);
}

export async function inviteUser(email: string): Promise<{ message: string; inviteToken?: string }> {
  return apiClient.post<{ message: string; inviteToken?: string }>('/auth/invite', { email });
}
