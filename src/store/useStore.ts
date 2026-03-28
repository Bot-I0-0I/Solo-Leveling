import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  isCloaked: boolean;
  theme: 'dark' | 'light';
  currentView: 'status' | 'quests' | 'dungeons' | 'tactical' | 'store' | 'reviews' | 'scheduler' | 'ledger' | 'settings' | 'nutrition';
  toggleCloak: () => void;
  toggleTheme: () => void;
  setView: (view: 'status' | 'quests' | 'dungeons' | 'tactical' | 'store' | 'reviews' | 'scheduler' | 'ledger' | 'settings' | 'nutrition') => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      isCloaked: false,
      theme: 'dark',
      currentView: 'status',
      toggleCloak: () => set((state) => ({ isCloaked: !state.isCloaked })),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      setView: (view) => set({ currentView: view }),
    }),
    {
      name: 'system-ui-storage',
    }
  )
);
