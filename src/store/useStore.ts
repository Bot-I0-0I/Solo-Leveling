import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  isCloaked: boolean;
  theme: 'dark' | 'light';
  currentView: 'status' | 'quests' | 'dungeons' | 'tactical' | 'store' | 'reviews' | 'scheduler' | 'ledger' | 'settings' | 'nutrition' | 'hub';
  levelUpModal: number | null;
  toggleCloak: () => void;
  toggleTheme: () => void;
  setView: (view: 'status' | 'quests' | 'dungeons' | 'tactical' | 'store' | 'reviews' | 'scheduler' | 'ledger' | 'settings' | 'nutrition' | 'hub') => void;
  setLevelUpModal: (level: number | null) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      isCloaked: false,
      theme: 'dark',
      currentView: 'status',
      levelUpModal: null,
      toggleCloak: () => set((state) => ({ isCloaked: !state.isCloaked })),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      setView: (view) => set({ currentView: view }),
      setLevelUpModal: (level) => set({ levelUpModal: level }),
    }),
    {
      name: 'system-ui-storage',
    }
  )
);
