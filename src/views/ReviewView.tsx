import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, addXp } from '../db/db';
import { cn, getRank } from '../lib/utils';
import { BookOpen, CheckCircle, Plus, Calendar, Wand2 } from 'lucide-react';
import { format, startOfWeek, subDays, isAfter } from 'date-fns';

export function ReviewView() {
  const userStats = useLiveQuery(() => db.userStats.get(1));
  const reviews = useLiveQuery(() => db.weeklyReviews.toArray());
  
  const [accomplishments, setAccomplishments] = useState('');
  const [challenges, setChallenges] = useState('');
  const [intentions, setIntentions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const pendingReview = reviews?.find(r => r.status === 'pending');

  React.useEffect(() => {
    if (pendingReview && !accomplishments && !challenges && !intentions && !isGenerating) {
      handleAutoGenerate();
    }
  }, [pendingReview]);

  if (!reviews || !userStats) return <div className="opacity-80">Loading Archives...</div>;

  const completedReviews = reviews.filter(r => r.status === 'completed').reverse();
  
  const level = Math.floor((userStats?.xp || 0) / 1000) + 1;
  const rankColor = getRank(level).color;
  const themeColor = userStats?.selectedColor || rankColor;

  const handleInitializeReview = async () => {
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const existing = await db.weeklyReviews.where('weekStartDate').equals(weekStart).first();
    
    if (!existing) {
      await db.weeklyReviews.add({
        weekStartDate: weekStart,
        accomplishments: '',
        challenges: '',
        intentions: '',
        status: 'pending'
      });
    }
  };

  const handleAutoGenerate = async () => {
    setIsGenerating(true);
    try {
      const weekStart = pendingReview?.weekStartDate || format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const startDate = new Date(weekStart);
      
      // Fetch data for the week
      const allQuests = await db.quests.toArray();
      const completedQuests = allQuests.filter(q => q.completed && new Date(q.date) >= startDate);
      const failedQuests = allQuests.filter(q => !q.completed && new Date(q.date) >= startDate);
      
      const allLogs = await db.nutritionLogs.toArray();
      const weekLogs = allLogs.filter(l => new Date(l.date) >= startDate);
      const workouts = weekLogs.filter(l => l.type === 'exercise');
      
      const allLedger = await db.ledger.toArray();
      const weekLedger = allLedger.filter(l => new Date(l.date) >= startDate);
      const income = weekLedger.filter(l => l.type === 'income').reduce((acc, l) => acc + l.amount, 0);
      const expenses = weekLedger.filter(l => l.type === 'expense').reduce((acc, l) => acc + l.amount, 0);

      // Generate text
      let accText = `• Completed ${completedQuests.length} quests this week.\n`;
      if (workouts.length > 0) {
        accText += `• Logged ${workouts.length} workout sessions.\n`;
      }
      if (income > 0) {
        accText += `• Earned $${income.toFixed(2)} in income.\n`;
      }
      if (completedQuests.length > 0) {
        accText += `• Notable wins: ${completedQuests.slice(0, 3).map(q => q.title).join(', ')}.\n`;
      }

      let chalText = '';
      if (failedQuests.length > 0) {
        chalText += `• Missed ${failedQuests.length} quests (e.g., ${failedQuests.slice(0, 2).map(q => q.title).join(', ')}).\n`;
      }
      if (expenses > income) {
        chalText += `• Expenses ($${expenses.toFixed(2)}) exceeded income ($${income.toFixed(2)}).\n`;
      }
      if (workouts.length < 3) {
        chalText += `• Low physical activity (${workouts.length} sessions).\n`;
      }
      if (!chalText) {
        chalText = "• No major challenges recorded in the system. Everything ran smoothly.\n";
      }

      let intText = `• Complete all daily recurring quests.\n`;
      if (workouts.length < 3) {
        intText += `• Increase physical activity to at least 3 sessions.\n`;
      }
      if (expenses > income) {
        intText += `• Reduce unnecessary expenses to maintain positive cash flow.\n`;
      }

      setAccomplishments(accText);
      setChallenges(chalText);
      setIntentions(intText);
    } catch (error) {
      console.error("Error auto-generating review:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!pendingReview || !pendingReview.id || isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      await db.weeklyReviews.update(pendingReview.id, {
        accomplishments,
        challenges,
        intentions,
        status: 'completed'
      });

      // Reward for completing the review
      await db.userStats.update(1, {
        INT: userStats.INT + 1,
        SEN: userStats.SEN + 1
      });
      await addXp(200);

      setAccomplishments('');
      setChallenges('');
      setIntentions('');
    } catch (error) {
      console.error(error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="border-b border-[#262626] pb-6">
        <h2 className="text-3xl font-mono font-bold tracking-tight text-white">WEEKLY REVIEW</h2>
        <p className="text-[#A3A3A3] text-sm mt-1">System Reflection & Calibration Protocol</p>
      </header>

      {pendingReview ? (
        <div className="bg-[#141414] border rounded-xl p-6 relative overflow-hidden" style={{ borderColor: `${themeColor}80` }}>
          <div className="absolute top-0 left-0 w-full h-1 opacity-50" style={{ background: `linear-gradient(to right, transparent, ${themeColor}, transparent)` }}></div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h3 className="text-xl font-mono text-white flex items-center">
              <BookOpen className="w-5 h-5 mr-2" style={{ color: themeColor }} />
              PENDING CALIBRATION: WEEK OF {pendingReview.weekStartDate}
            </h3>
            <button
              onClick={handleAutoGenerate}
              disabled={isGenerating}
              className="flex items-center text-xs font-mono px-3 py-1.5 rounded bg-[#0A0A0A] border border-[#262626] hover:border-indigo-400 text-[#A3A3A3] hover:text-white transition-colors"
            >
              <Wand2 className="w-3 h-3 mr-1.5 text-indigo-400" />
              {isGenerating ? 'GENERATING...' : 'AUTO-GENERATE'}
            </button>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-mono text-[#A3A3A3] mb-2 uppercase">1. Accomplishments (What went well?)</label>
              <textarea 
                value={accomplishments}
                onChange={(e) => setAccomplishments(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-4 py-3 text-white font-mono text-sm focus:outline-none focus:ring-1 min-h-[100px] transition-colors"
                style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
                placeholder="Logged 5 workouts, finished the project..."
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-[#A3A3A3] mb-2 uppercase">2. Challenges (What blocked you?)</label>
              <textarea 
                value={challenges}
                onChange={(e) => setChallenges(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-4 py-3 text-white font-mono text-sm focus:outline-none focus:ring-1 min-h-[100px] transition-colors"
                style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
                placeholder="Poor sleep on Wednesday, distracted by social media..."
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-[#A3A3A3] mb-2 uppercase">3. Intentions (Focus for next week)</label>
              <textarea 
                value={intentions}
                onChange={(e) => setIntentions(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-4 py-3 text-white font-mono text-sm focus:outline-none focus:ring-1 min-h-[100px] transition-colors"
                style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
                placeholder="Prioritize deep work in the mornings, hit 10k steps daily..."
              />
            </div>
            
            <button 
              onClick={handleSubmitReview}
              disabled={!accomplishments || !challenges || !intentions || isSubmitting}
              className="w-full bg-[#262626] hover:bg-[#333] disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-md font-mono text-sm transition-colors flex items-center justify-center border border-[#262626]"
              style={{ borderColor: accomplishments && challenges && intentions ? themeColor : undefined }}
            >
              <CheckCircle className="w-4 h-4 mr-2" style={{ color: themeColor }} /> 
              {isSubmitting ? 'SUBMITTING...' : 'SUBMIT CALIBRATION (+200 XP, +1 INT, +1 SEN)'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#262626] flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <h3 className="text-lg font-mono text-white">SYSTEM CALIBRATED</h3>
            <p className="text-sm text-[#A3A3A3] font-mono mt-1">No pending reviews. The system will auto-generate a new review prompt on Sunday.</p>
          </div>
          <button 
            onClick={handleInitializeReview}
            className="mt-4 bg-[#0A0A0A] border border-[#262626] text-[#A3A3A3] hover:text-white px-4 py-2 rounded-md font-mono text-xs transition-colors flex items-center"
            style={{ borderColor: themeColor }}
          >
            <Plus className="w-3 h-3 mr-2" /> FORCE GENERATE REVIEW
          </button>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-xl font-mono text-white flex items-center pt-4">
          <Calendar className="w-5 h-5 mr-2 text-[#A3A3A3]" />
          ARCHIVES
        </h3>
        
        <div className="grid gap-4">
          {completedReviews.map(review => (
            <div key={review.id} className="bg-[#0A0A0A] border border-[#262626] rounded-xl p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-[#262626] pb-4">
                <h4 className="font-mono text-white font-bold">WEEK OF {review.weekStartDate}</h4>
                <span className="text-xs font-mono text-green-500 border border-green-900/50 bg-green-950/20 px-2 py-1 rounded">COMPLETED</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h5 className="text-xs font-mono mb-2" style={{ color: themeColor }}>ACCOMPLISHMENTS</h5>
                  <p className="text-sm text-[#E5E5E5] whitespace-pre-wrap">{review.accomplishments}</p>
                </div>
                <div>
                  <h5 className="text-xs font-mono text-red-400 mb-2">CHALLENGES</h5>
                  <p className="text-sm text-[#E5E5E5] whitespace-pre-wrap">{review.challenges}</p>
                </div>
                <div>
                  <h5 className="text-xs font-mono text-purple-400 mb-2">INTENTIONS</h5>
                  <p className="text-sm text-[#E5E5E5] whitespace-pre-wrap">{review.intentions}</p>
                </div>
              </div>
            </div>
          ))}
          
          {completedReviews.length === 0 && (
            <div className="text-center py-12 border border-dashed border-[#262626] rounded-xl text-[#A3A3A3] font-mono text-sm">
              No archived reviews found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

