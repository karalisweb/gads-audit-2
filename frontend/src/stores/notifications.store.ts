import { create } from 'zustand';
import { getPendingSummary } from '@/api/modifications';

interface NotificationsState {
  pendingCount: number;
  highPriorityCount: number;
  isLoading: boolean;
  fetchPendingCount: () => Promise<void>;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  pendingCount: 0,
  highPriorityCount: 0,
  isLoading: false,

  fetchPendingCount: async () => {
    set({ isLoading: true });
    try {
      const summary = await getPendingSummary();
      set({
        pendingCount: summary.totalPending,
        highPriorityCount: summary.totalHighPriority,
      });
    } catch {
      // Silently fail - badge will just show 0
    } finally {
      set({ isLoading: false });
    }
  },
}));
