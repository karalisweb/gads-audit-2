import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '@/api/client';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  pendingUserId: string | null;
  requiresTwoFactor: boolean;

  login: (email: string, password: string) => Promise<boolean>;
  verifyTwoFactor: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string, user: User) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      pendingUserId: null,
      requiresTwoFactor: false,

      login: async (email: string, password: string): Promise<boolean> => {
        set({ isLoading: true });
        try {
          const response = await apiClient.post<{
            tokens?: { accessToken: string; refreshToken: string };
            user: Partial<User>;
            requiresTwoFactor: boolean;
          }>('/auth/login', { email, password });

          if (response.requiresTwoFactor) {
            set({
              pendingUserId: response.user.id || null,
              requiresTwoFactor: true,
              isLoading: false,
            });
            return true; // Requires 2FA
          } else if (response.tokens) {
            apiClient.setAccessToken(response.tokens.accessToken);
            set({
              user: response.user as User,
              accessToken: response.tokens.accessToken,
              refreshToken: response.tokens.refreshToken,
              isAuthenticated: true,
              requiresTwoFactor: false,
              pendingUserId: null,
              isLoading: false,
            });
            return false; // Login complete, no 2FA needed
          }
          return false;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      verifyTwoFactor: async (code: string) => {
        const { pendingUserId } = get();
        if (!pendingUserId) throw new Error('No pending 2FA verification');

        set({ isLoading: true });
        try {
          const response = await apiClient.post<{
            tokens: { accessToken: string; refreshToken: string };
            user: User;
          }>('/auth/verify-2fa', { userId: pendingUserId, code });

          apiClient.setAccessToken(response.tokens.accessToken);
          set({
            user: response.user,
            accessToken: response.tokens.accessToken,
            refreshToken: response.tokens.refreshToken,
            isAuthenticated: true,
            requiresTwoFactor: false,
            pendingUserId: null,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        const { refreshToken } = get();
        try {
          if (refreshToken) {
            await apiClient.post('/auth/logout', { refreshToken });
          }
        } finally {
          apiClient.setAccessToken(null);
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            pendingUserId: null,
            requiresTwoFactor: false,
          });
        }
      },

      refreshTokens: async () => {
        const { refreshToken } = get();
        if (!refreshToken) throw new Error('No refresh token');

        try {
          const response = await apiClient.post<{
            accessToken: string;
            refreshToken: string;
          }>('/auth/refresh', { refreshToken });

          apiClient.setAccessToken(response.accessToken);
          set({
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
          });
        } catch {
          get().clearAuth();
          throw new Error('Session expired');
        }
      },

      setTokens: (accessToken: string, refreshToken: string, user: User) => {
        apiClient.setAccessToken(accessToken);
        set({
          accessToken,
          refreshToken,
          user,
          isAuthenticated: true,
        });
      },

      clearAuth: () => {
        apiClient.setAccessToken(null);
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          pendingUserId: null,
          requiresTwoFactor: false,
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) {
          apiClient.setAccessToken(state.accessToken);
        }
        // Registra l'auto-refresh per il client API
        apiClient.setRefreshHandler(async () => {
          const store = useAuthStore.getState();
          await store.refreshTokens();
        });
      },
    }
  )
);
