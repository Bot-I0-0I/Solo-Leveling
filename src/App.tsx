/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Layout } from './components/Layout';
import { StatusView } from './views/StatusView';
import { QuestView } from './views/QuestView';
import { DungeonView } from './views/DungeonView';
import { TacticalView } from './views/TacticalView';
import { StoreView } from './views/StoreView';
import { ReviewView } from './views/ReviewView';
import { SchedulerView } from './views/SchedulerView';
import { LedgerView } from './views/LedgerView';
import { SettingsView } from './views/SettingsView';
import { NutritionView } from './views/NutritionView';
import { useStore } from './store/useStore';
import { useSystemEngine } from './db/engine';
import { useCloudSync } from './useCloudSync';

import { Toaster } from 'sonner';

export default function App() {
  // Initialize background engine
  useSystemEngine();
  // Initialize cloud sync
  useCloudSync();
  
  const currentView = useStore((state) => state.currentView);
  const theme = useStore((state) => state.theme);

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  }, [theme]);

  return (
    <Layout>
      <Toaster theme="dark" position="top-center" />
      {currentView === 'status' && <StatusView />}
      {currentView === 'quests' && <QuestView />}
      {currentView === 'scheduler' && <SchedulerView />}
      {currentView === 'dungeons' && <DungeonView />}
      {currentView === 'tactical' && <TacticalView />}
      {currentView === 'store' && <StoreView />}
      {currentView === 'ledger' && <LedgerView />}
      {currentView === 'reviews' && <ReviewView />}
      {currentView === 'nutrition' && <NutritionView />}
      {currentView === 'settings' && <SettingsView />}
    </Layout>
  );
}
