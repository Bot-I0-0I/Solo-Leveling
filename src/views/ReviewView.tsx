import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, addXp } from '../db/db';
import { cn, getRank } from '../lib/utils';
import { BookOpen, CheckCircle, Plus, Calendar } from 'lucide-react';
import { format, startOfWeek, subDays, isAfter } from 'date-fns';
import { toast } from 'sonner';

export function ReviewView() {
  const userStats = useLiveQuery(() => db.userStats.get(1));
  const reviews = useLiveQuery(() => db.weeklyReviews.toArray());
  
  const [accomplishments, setAccomplishments] = useState('');
  const [challenges, setChallenges] = useState('');
  const [intentions, setIntentions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const pendingReview = reviews?.find(r => r.status === 'pending');

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
    <div className="space-y-8 pb-10">
      <header className="hidden md:block border-b border-[#262626] pb-6">
        <h2 className="text-3xl font-mono font-bold tracking-tight text-white uppercase" style={{ color: themeColor }}>WEEKLY REVIEW</h2>
        <p className="text-[#A3A3A3] text-sm mt-1 font-mono uppercase tracking-widest">System Reflection & Calibration Protocol</p>
      </header>

      {pendingReview ? (
        <div className="bg-[#0A0A0A] border border-[#262626] rounded-sm p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2" style={{ borderColor: themeColor }}></div>
          <div className="absolute top-0 left-0 w-full h-1 opacity-50" style={{ background: `linear-gradient(to right, transparent, ${themeColor}, transparent)` }}></div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h3 className="text-xl font-mono text-white flex items-center font-bold tracking-widest uppercase">
              <BookOpen className="w-5 h-5 mr-2" style={{ color: themeColor }} />
              PENDING CALIBRATION: WEEK OF {pendingReview.weekStartDate}
            </h3>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-mono text-[#A3A3A3] mb-2 tracking-widest uppercase">1. ACCOMPLISHMENTS (WHAT WENT WELL?)</label>
              <textarea 
                value={accomplishments}
                onChange={(e) => setAccomplishments(e.target.value)}
                className="w-full bg-[#141414] border border-[#262626] rounded-sm px-4 py-3 text-white font-mono text-xs focus:outline-none focus:ring-1 min-h-[100px] transition-colors uppercase placeholder:text-[#555]"
                style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
                placeholder="LOGGED 5 WORKOUTS, FINISHED THE PROJECT..."
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-[#A3A3A3] mb-2 tracking-widest uppercase">2. CHALLENGES (WHAT BLOCKED YOU?)</label>
              <textarea 
                value={challenges}
                onChange={(e) => setChallenges(e.target.value)}
                className="w-full bg-[#141414] border border-[#262626] rounded-sm px-4 py-3 text-white font-mono text-xs focus:outline-none focus:ring-1 min-h-[100px] transition-colors uppercase placeholder:text-[#555]"
                style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
                placeholder="POOR SLEEP ON WEDNESDAY, DISTRACTED BY SOCIAL MEDIA..."
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-[#A3A3A3] mb-2 tracking-widest uppercase">3. INTENTIONS (FOCUS FOR NEXT WEEK)</label>
              <textarea 
                value={intentions}
                onChange={(e) => setIntentions(e.target.value)}
                className="w-full bg-[#141414] border border-[#262626] rounded-sm px-4 py-3 text-white font-mono text-xs focus:outline-none focus:ring-1 min-h-[100px] transition-colors uppercase placeholder:text-[#555]"
                style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
                placeholder="PRIORITIZE DEEP WORK IN THE MORNINGS, HIT 10K STEPS DAILY..."
              />
            </div>
            
            <button 
              onClick={handleSubmitReview}
              disabled={!accomplishments || !challenges || !intentions || isSubmitting}
              className="w-full bg-[#141414] border border-[#262626] hover:bg-[#1A1A1A] disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-sm font-mono text-xs font-bold tracking-widest uppercase transition-colors flex items-center justify-center"
              style={{ borderColor: accomplishments && challenges && intentions ? themeColor : undefined }}
            >
              <CheckCircle className="w-4 h-4 mr-2" style={{ color: themeColor }} /> 
              {isSubmitting ? 'SUBMITTING...' : 'SUBMIT CALIBRATION (+200 XP, +1 INT, +1 SEN)'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-[#0A0A0A] border border-[#262626] rounded-sm p-6 flex flex-col items-center justify-center text-center space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2" style={{ borderColor: themeColor }}></div>
          <div className="w-12 h-12 rounded-sm bg-[#141414] border border-[#262626] flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <h3 className="text-lg font-mono text-white font-bold tracking-widest uppercase">SYSTEM CALIBRATED</h3>
            <p className="text-xs text-[#A3A3A3] font-mono mt-1 tracking-widest uppercase">NO PENDING REVIEWS. THE SYSTEM WILL AUTO-GENERATE A NEW REVIEW PROMPT ON SUNDAY.</p>
          </div>
          <button 
            onClick={handleInitializeReview}
            className="mt-4 bg-[#141414] border border-[#262626] text-[#A3A3A3] hover:text-white px-4 py-2 rounded-sm font-mono text-[10px] font-bold tracking-widest uppercase transition-colors flex items-center"
            style={{ borderColor: themeColor }}
          >
            <Plus className="w-3 h-3 mr-2" /> FORCE GENERATE REVIEW
          </button>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-xl font-mono text-white flex items-center pt-4 font-bold tracking-widest uppercase">
          <Calendar className="w-5 h-5 mr-2 text-[#A3A3A3]" />
          ARCHIVES
        </h3>
        
        <div className="grid gap-4">
          {completedReviews.map(review => (
            <div key={review.id} className="bg-[#141414] border border-[#262626] rounded-sm p-6 space-y-4 relative overflow-hidden">
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#262626]"></div>
              <div className="flex justify-between items-center border-b border-[#262626] pb-4">
                <h4 className="font-mono text-white font-bold tracking-widest uppercase">WEEK OF {review.weekStartDate}</h4>
                <span className="text-[10px] font-mono font-bold tracking-widest text-green-500 border border-green-900/50 bg-green-950/20 px-2 py-1 rounded-sm uppercase">COMPLETED</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h5 className="text-[10px] font-mono font-bold tracking-widest uppercase mb-2" style={{ color: themeColor }}>ACCOMPLISHMENTS</h5>
                  <p className="text-xs font-mono text-[#E5E5E5] whitespace-pre-wrap uppercase tracking-wider">{review.accomplishments}</p>
                </div>
                <div>
                  <h5 className="text-[10px] font-mono font-bold tracking-widest uppercase text-red-400 mb-2">CHALLENGES</h5>
                  <p className="text-xs font-mono text-[#E5E5E5] whitespace-pre-wrap uppercase tracking-wider">{review.challenges}</p>
                </div>
                <div>
                  <h5 className="text-[10px] font-mono font-bold tracking-widest uppercase text-purple-400 mb-2">INTENTIONS</h5>
                  <p className="text-xs font-mono text-[#E5E5E5] whitespace-pre-wrap uppercase tracking-wider">{review.intentions}</p>
                </div>
              </div>
            </div>
          ))}
          
          {completedReviews.length === 0 && (
            <div className="text-center py-12 border border-dashed border-[#262626] rounded-sm text-[#A3A3A3] font-mono text-xs tracking-widest uppercase">
              NO ARCHIVED REVIEWS FOUND.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

