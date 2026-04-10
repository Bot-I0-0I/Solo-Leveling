import { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { db as localDb } from './db/db';
import { db as cloudDb } from './firebase';
import { collection, doc, getDoc, getDocs, setDoc, writeBatch, query, where } from 'firebase/firestore';
import { toast } from 'sonner';
import { getRank } from './lib/utils';
import { useLiveQuery } from 'dexie-react-hooks';

export function useCloudSync() {
  const { user } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const localStats = useLiveQuery(() => localDb.userStats.get(1));

  useEffect(() => {
    if (!user) return;

    const syncData = async () => {
      setIsSyncing(true);
      try {
        const localStats = await localDb.userStats.get(1);
        const isLocalOwnedByUser = localStats && localStats.uid === user.uid;

        // 1. Check if cloud has data
        const userStatsRef = doc(cloudDb, 'userStats', user.uid);
        const userStatsSnap = await getDoc(userStatsRef);

        if (!isLocalOwnedByUser) {
          if (userStatsSnap.exists()) {
            // New device or account switch: pull from cloud
            await pullFromCloud(user.uid);
          } else {
            // First time login: push local guest data to cloud
            await pushToCloud(user.uid);
          }
        } else {
          // Page refresh: push local data to cloud to ensure backup
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
    delete newObj.id;
    Object.keys(newObj).forEach(key => {
      if (newObj[key] === undefined || newObj[key] === null || Number.isNaN(newObj[key])) {
        delete newObj[key];
      }
    });
    return newObj;
  };

  const pushToCloud = async (uid: string) => {
    try {
      const chunks: Promise<void>[] = [];
      let currentBatch = writeBatch(cloudDb);
      let opCount = 0;

      const addToBatch = (ref: any, data: any) => {
        currentBatch.set(ref, data);
        opCount++;
        if (opCount >= 400) {
          chunks.push(currentBatch.commit());
          currentBatch = writeBatch(cloudDb);
          opCount = 0;
        }
      };

      // User Stats
      const localStats = await localDb.userStats.get(1);
      if (localStats) {
        const statsRef = doc(cloudDb, 'userStats', uid);
        const cleanedStats = cleanData({ ...localStats, uid });
        // Explicitly remove legacy fields that might still be in IndexedDB
        delete cleanedStats.penaltyActive;
        delete cleanedStats.friends;
        delete cleanedStats.publicProfile;
        delete cleanedStats.friendRequests;
        addToBatch(statsRef, cleanedStats);
      }

      // Quests
      const quests = await localDb.quests.toArray();
      quests.forEach(q => {
        const ref = doc(cloudDb, 'quests', `${uid}_${q.id}`);
        addToBatch(ref, cleanData({ ...q, uid }));
      });

      // Dungeons
      const dungeons = await localDb.dungeons.toArray();
      dungeons.forEach(d => {
        const ref = doc(cloudDb, 'dungeons', `${uid}_${d.id}`);
        addToBatch(ref, cleanData({ ...d, uid }));
      });

      // Inventory
      const inventory = await localDb.inventory.toArray();
      inventory.forEach(i => {
        const ref = doc(cloudDb, 'inventory', `${uid}_${i.id}`);
        addToBatch(ref, cleanData({ ...i, uid }));
      });

      // Shop Items
      const shopItems = await localDb.shopItems.toArray();
      shopItems.forEach(s => {
        const ref = doc(cloudDb, 'shopItems', `${uid}_${s.id}`);
        addToBatch(ref, cleanData({ ...s, uid }));
      });

      // Vessel Logs
      const vesselLogs = await localDb.vesselLogs.toArray();
      vesselLogs.forEach(v => {
        const ref = doc(cloudDb, 'vesselLogs', `${uid}_${v.id}`);
        addToBatch(ref, cleanData({ ...v, uid }));
      });

      // Weekly Reviews
      const weeklyReviews = await localDb.weeklyReviews.toArray();
      weeklyReviews.forEach(w => {
        const ref = doc(cloudDb, 'weeklyReviews', `${uid}_${w.id}`);
        addToBatch(ref, cleanData({ ...w, uid }));
      });

      // Tasks
      const tasks = await localDb.tasks.toArray();
      tasks.forEach(t => {
        const ref = doc(cloudDb, 'tasks', `${uid}_${t.id}`);
        addToBatch(ref, cleanData({ ...t, uid }));
      });

      // Ledger
      const ledger = await localDb.ledger.toArray();
      ledger.forEach(l => {
        const ref = doc(cloudDb, 'ledger', `${uid}_${l.id}`);
        addToBatch(ref, cleanData({ ...l, uid }));
      });

      // Nutrition Logs
      const nutritionLogs = await localDb.nutritionLogs.toArray();
      nutritionLogs.forEach(n => {
        const ref = doc(cloudDb, 'nutritionLogs', `${uid}_${n.id}`);
        addToBatch(ref, cleanData({ ...n, uid }));
      });

      // Tactical Logs
      const tacticalLogs = await localDb.tacticalLogs.toArray();
      tacticalLogs.forEach(t => {
        const ref = doc(cloudDb, 'tacticalLogs', `${uid}_${t.id}`);
        addToBatch(ref, cleanData({ ...t, uid }));
      });

      // Mission Logs
      const missionLogs = await localDb.missionLogs.toArray();
      missionLogs.forEach(m => {
        const ref = doc(cloudDb, 'missionLogs', `${uid}_${m.id}`);
        addToBatch(ref, cleanData({ ...m, uid }));
      });

      if (opCount > 0) {
        chunks.push(currentBatch.commit());
      }

      await Promise.all(chunks);
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
        const { uid: _, penaltyActive, ...localData } = data;
        await localDb.userStats.put({ ...localData, id: 1, uid } as any);
      }

      // Helper to fetch and sync collections
      const syncCollection = async (collectionName: string, localTable: any) => {
        const q = query(collection(cloudDb, collectionName), where("uid", "==", uid));
        const snap = await getDocs(q);
        const items = snap.docs.map(doc => {
          const data = doc.data();
          const { uid: _, ...localData } = data;
          const idStr = doc.id.split('_')[1];
          if (idStr) {
            localData.id = parseInt(idStr, 10);
          }
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
        syncCollection('missionLogs', localDb.missionLogs),
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
