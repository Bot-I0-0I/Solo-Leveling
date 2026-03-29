import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, addXp } from '../db/db';
import { cn } from '../lib/utils';
import { BookOpen, CheckCircle, Plus, Calendar } from 'lucide-react';
import { format, startOfWeek } from 'date-fns';

export function ReviewView() {
  const userStats = useLiveQuery(() => db.userStats.get(1));
  const reviews = useLiveQuery(() => db.weeklyReviews.toArray());
  
  const [accomplishments, setAccomplishments] = useState('');
  const [challenges, setChallenges] = useState('');
  const [intentions, setIntentions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!reviews || !userStats) return <div className="animate-pulse">Loading Archives...</div>;

  const pendingReview = reviews.find(r => r.status === 'pending');
  const completedReviews = reviews.filter(r => r.status === 'completed').reverse();

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
    <div className="space-y-8">
      <header className="border-b border-[#262626] pb-6">
        <h2 className="text-3xl font-mono font-bold tracking-tight text-white">WEEKLY REVIEW</h2>
        <p className="text-[#A3A3A3] text-sm mt-1">System Reflection & Calibration Protocol</p>
      </header>

      {pendingReview ? (
        <div className="bg-[#141414] border border-[#00F0FF]/50 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00F0FF] to-transparent opacity-50"></div>
          <h3 className="text-xl font-mono text-white mb-6 flex items-center">
            <BookOpen className="w-5 h-5 mr-2 text-[#00F0FF]" />
            PENDING CALIBRATION: WEEK OF {pendingReview.weekStartDate}
          </h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-mono text-[#A3A3A3] mb-2 uppercase">1. Accomplishments (What went well?)</label>
              <textarea 
                value={accomplishments}
                onChange={(e) => setAccomplishments(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-[#00F0FF] min-h-[100px]"
                placeholder="Logged 5 workouts, finished the project..."
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-[#A3A3A3] mb-2 uppercase">2. Challenges (What blocked you?)</label>
              <textarea 
                value={challenges}
                onChange={(e) => setChallenges(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-red-500 min-h-[100px]"
                placeholder="Poor sleep on Wednesday, distracted by social media..."
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-[#A3A3A3] mb-2 uppercase">3. Intentions (Focus for next week)</label>
              <textarea 
                value={intentions}
                onChange={(e) => setIntentions(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-purple-500 min-h-[100px]"
                placeholder="Prioritize deep work in the mornings, hit 10k steps daily..."
              />
            </div>
            
            <button 
              onClick={handleSubmitReview}
              disabled={!accomplishments || !challenges || !intentions || isSubmitting}
              className="w-full bg-[#262626] hover:bg-[#333] disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-md font-mono text-sm transition-colors flex items-center justify-center border border-[#262626] hover:border-[#00F0FF]/50"
            >
              <CheckCircle className="w-4 h-4 mr-2 text-[#00F0FF]" /> 
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
            className="mt-4 bg-[#0A0A0A] border border-[#262626] hover:border-[#00F0FF]/50 text-[#A3A3A3] hover:text-white px-4 py-2 rounded-md font-mono text-xs transition-colors flex items-center"
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
                  <h5 className="text-xs font-mono text-[#00F0FF] mb-2">ACCOMPLISHMENTS</h5>
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
