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

        const allCompleted = yesterdayQuests.every(q => q.completed);

        if (!allCompleted && yesterdayQuests.length > 0) {
          // Penalty Protocol Triggered
          await db.userStats.update(1, { 
            penaltyActive: true,
            lastResetDate: today
          });

          // Generate Penalty Quest
          await db.quests.add({
            title: 'Penalty: 200 Burpees',
            attribute: 'VIT',
            targetValue: 200,
            currentValue: 0,
            type: 'penalty',
            completed: false,
            date: today,
            baseReward: 0
          });
        } else {
          // Reset successful, generate new daily quests if needed
          await db.userStats.update(1, { 
            penaltyActive: false,
            lastResetDate: today
          });
          
          // Duplicate yesterday's quests for today (simple routine engine)
          const newQuests = yesterdayQuests.map(q => ({
            ...q,
            id: undefined,
            currentValue: 0,
            completed: false,
            date: today
          }));
          if (newQuests.length > 0) {
             await db.quests.bulkAdd(newQuests);
          }
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
