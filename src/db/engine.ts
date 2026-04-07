import { useEffect } from 'react';
import { db } from './db';
import { format, startOfWeek } from 'date-fns';
import { useLiveQuery } from 'dexie-react-hooks';

export function useSystemEngine() {
  const userStats = useLiveQuery(() => db.userStats.get(1));

  useEffect(() => {
    const checkMidnightReset = async () => {
      if (!userStats) return;

      const today = format(new Date(), 'yyyy-MM-dd');
      if (userStats.lastResetDate !== today) {
        // It's a new day. Check yesterday's quests.
        const yesterdayQuests = await db.quests
          .where('date')
          .equals(userStats.lastResetDate)
          .and(q => q.type === 'daily')
          .toArray();

        // Reset successful, generate new daily quests if needed
        await db.userStats.update(1, { 
          lastResetDate: today
        });
        
        // Duplicate yesterday's recurring quests for today
        const recurringQuests = yesterdayQuests.filter(q => q.isRecurring);
        const newQuests = recurringQuests.map(q => ({
          ...q,
          id: undefined,
          currentValue: 0,
          completed: false,
          date: today
        }));
        if (newQuests.length > 0) {
           await db.quests.bulkAdd(newQuests as any);
        }
      }

      // Weekly Review Logic
      const todayDate = new Date();
      if (todayDate.getDay() === 0) { // Sunday
        const weekStart = format(startOfWeek(todayDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        const existingReview = await db.weeklyReviews.where('weekStartDate').equals(weekStart).first();
        
        if (!existingReview) {
          await db.weeklyReviews.add({
            weekStartDate: weekStart,
            accomplishments: '',
            challenges: '',
            intentions: '',
            status: 'pending'
          });
        }
      }
    };

    checkMidnightReset();
    // Check every minute just in case the app is left open overnight
    const interval = setInterval(checkMidnightReset, 60000);
    return () => clearInterval(interval);
  }, [userStats]);

  return { userStats };
}
