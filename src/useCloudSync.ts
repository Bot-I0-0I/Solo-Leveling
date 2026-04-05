import { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { db as localDb } from './db/db';
import { db as cloudDb } from './firebase';
import { collection, doc, getDoc, getDocs, setDoc, writeBatch, query, where } from 'firebase/firestore';
import { toast } from 'sonner';
import { getRank } from './lib/utils';

export function useCloudSync() {
  const { user } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    if (!user) return;

    const syncData = async () => {
      setIsSyncing(true);
      try {
        // 1. Check if cloud has data
        const userStatsRef = doc(cloudDb, 'userStats', user.uid);
        const userStatsSnap = await getDoc(userStatsRef);

        if (userStatsSnap.exists()) {
          // Cloud has data, pull to local
          await pullFromCloud(user.uid);
        } else {
          // Cloud is empty, push local to cloud
          await pushToCloud(user.uid);
        }
        setLastSync(new Date());
      } catch (error) {
        console.error("Sync error:", error);
        toast.error("Failed to sync with cloud");
      } finally {
        setIsSyncing(false);
      }
    };

    syncData();
  }, [user]);

  const cleanData = (obj: any) => {
    const newObj = { ...obj };
    Object.keys(newObj).forEach(key => {
      if (newObj[key] === undefined) {
        delete newObj[key];
      }
    });
    return newObj;
  };

  const pushToCloud = async (uid: string) => {
    try {
      const batch = writeBatch(cloudDb);

      // User Stats
      const localStats = await localDb.userStats.get(1);
      if (localStats) {
        const statsRef = doc(cloudDb, 'userStats', uid);
        batch.set(statsRef, cleanData({ ...localStats, uid }));

        // Public Profile
        const publicProfileRef = doc(cloudDb, 'publicProfiles', uid);
        const level = Math.floor((localStats.xp || 0) / 1000) + 1;
        const rank = getRank(level).rank;
        batch.set(publicProfileRef, cleanData({
          uid,
          email: user?.email || '',
          name: localStats.name || user?.email?.split('@')[0] || 'Unknown',
          avatar: localStats.avatar || '',
          level,
          rank
        }));
      }

      // Quests
      const quests = await localDb.quests.toArray();
      quests.forEach(q => {
        const ref = doc(collection(cloudDb, 'quests'));
        batch.set(ref, cleanData({ ...q, uid }));
      });

      // Dungeons
      const dungeons = await localDb.dungeons.toArray();
      dungeons.forEach(d => {
        const ref = doc(collection(cloudDb, 'dungeons'));
        batch.set(ref, cleanData({ ...d, uid }));
      });

      // Inventory
      const inventory = await localDb.inventory.toArray();
      inventory.forEach(i => {
        const ref = doc(collection(cloudDb, 'inventory'));
        batch.set(ref, cleanData({ ...i, uid }));
      });

      // Shop Items
      const shopItems = await localDb.shopItems.toArray();
      shopItems.forEach(s => {
        const ref = doc(collection(cloudDb, 'shopItems'));
        batch.set(ref, cleanData({ ...s, uid }));
      });

      // Vessel Logs
      const vesselLogs = await localDb.vesselLogs.toArray();
      vesselLogs.forEach(v => {
        const ref = doc(collection(cloudDb, 'vesselLogs'));
        batch.set(ref, cleanData({ ...v, uid }));
      });

      // Weekly Reviews
      const weeklyReviews = await localDb.weeklyReviews.toArray();
      weeklyReviews.forEach(w => {
        const ref = doc(collection(cloudDb, 'weeklyReviews'));
        batch.set(ref, cleanData({ ...w, uid }));
      });

      // Tasks
      const tasks = await localDb.tasks.toArray();
      tasks.forEach(t => {
        const ref = doc(collection(cloudDb, 'tasks'));
        batch.set(ref, cleanData({ ...t, uid }));
      });

      // Ledger
      const ledger = await localDb.ledger.toArray();
      ledger.forEach(l => {
        const ref = doc(collection(cloudDb, 'ledger'));
        batch.set(ref, cleanData({ ...l, uid }));
      });

      // Nutrition Logs
      const nutritionLogs = await localDb.nutritionLogs.toArray();
      nutritionLogs.forEach(n => {
        const ref = doc(collection(cloudDb, 'nutritionLogs'));
        batch.set(ref, cleanData({ ...n, uid }));
      });

      // Tactical Logs
      const tacticalLogs = await localDb.tacticalLogs.toArray();
      tacticalLogs.forEach(t => {
        const ref = doc(collection(cloudDb, 'tacticalLogs'));
        batch.set(ref, cleanData({ ...t, uid }));
      });

      await batch.commit();
      toast.success("Data pushed to cloud");
    } catch (error) {
      console.error("Push error:", error);
      throw error;
    }
  };

  const pullFromCloud = async (uid: string) => {
    try {
      // User Stats
      const statsSnap = await getDoc(doc(cloudDb, 'userStats', uid));
      if (statsSnap.exists()) {
        const data = statsSnap.data();
        const { uid: _, ...localData } = data;
        await localDb.userStats.put({ ...localData, id: 1 } as any);
      }

      // Helper to fetch and sync collections
      const syncCollection = async (collectionName: string, localTable: any) => {
        const q = query(collection(cloudDb, collectionName), where("uid", "==", uid));
        const snap = await getDocs(q);
        const items = snap.docs.map(doc => {
          const data = doc.data();
          const { uid: _, ...localData } = data;
          return localData;
        });
        
        await localDb.transaction('rw', localTable, async () => {
          await localTable.clear();
          if (items.length > 0) {
            await localTable.bulkAdd(items);
          }
        });
      };

      await Promise.all([
        syncCollection('quests', localDb.quests),
        syncCollection('dungeons', localDb.dungeons),
        syncCollection('inventory', localDb.inventory),
        syncCollection('shopItems', localDb.shopItems),
        syncCollection('vesselLogs', localDb.vesselLogs),
        syncCollection('weeklyReviews', localDb.weeklyReviews),
        syncCollection('tasks', localDb.tasks),
        syncCollection('ledger', localDb.ledger),
        syncCollection('nutritionLogs', localDb.nutritionLogs),
        syncCollection('tacticalLogs', localDb.tacticalLogs),
      ]);

      toast.success("Data pulled from cloud");
    } catch (error) {
      console.error("Pull error:", error);
      throw error;
    }
  };

  const forceSync = async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      await pushToCloud(user.uid);
      setLastSync(new Date());
    } catch (error) {
      toast.error("Failed to force sync");
    } finally {
      setIsSyncing(false);
    }
  };

  return { isSyncing, lastSync, forceSync };
}
