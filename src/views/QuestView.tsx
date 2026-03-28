import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, addXp } from '../db/db';
import { cn } from '../lib/utils';
import { AlertTriangle, CheckCircle, Circle, Plus, Trash2 } from 'lucide-react';

export function QuestView() {
  const userStats = useLiveQuery(() => db.userStats.get(1));
  const today = new Date().toISOString().split('T')[0];
  const quests = useLiveQuery(() => db.quests.where('date').equals(today).toArray());
  
  const [newQuestTitle, setNewQuestTitle] = useState('');
  const [newQuestAttr, setNewQuestAttr] = useState<'STR' | 'VIT' | 'AGI' | 'INT' | 'SEN'>('STR');
  const [newQuestTarget, setNewQuestTarget] = useState(1);

  const isPenalty = userStats?.penaltyActive;

  const handleComplete = async (questId: number, currentVal: number, targetVal: number, attr: string, baseReward: number) => {
    if (currentVal >= targetVal) return; // Already done

    const newVal = currentVal + 1;
    const completed = newVal >= targetVal;

    await db.quests.update(questId, { currentValue: newVal, completed });

    if (completed) {
      // Add XP and Credits
      if (userStats) {
        const xpGain = baseReward;
        const creditGain = Math.floor(baseReward / 2);
        
        await db.userStats.update(1, {
          credits: userStats.credits + creditGain
        });
        
        await addXp(xpGain);

        // If it was a penalty quest, clear penalty state
        const quest = await db.quests.get(questId);
        if (quest?.type === 'penalty') {
          await db.userStats.update(1, { penaltyActive: false });
        }
      }
    }
  };

  const handleAddQuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestTitle) return;

    await db.quests.add({
      title: newQuestTitle,
      attribute: newQuestAttr,
      targetValue: newQuestTarget,
      currentValue: 0,
      type: 'daily',
      completed: false,
      date: today,
      baseReward: newQuestTarget * 10
    });

    setNewQuestTitle('');
    setNewQuestTarget(1);
  };

  const handleDeleteQuest = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this quest?')) {
      await db.quests.delete(id);
    }
  };

  if (!quests) return <div>Loading Quests...</div>;

  const penaltyQuests = quests.filter(q => q.type === 'penalty');
  const dailyQuests = quests.filter(q => q.type === 'daily');

  return (
    <div className="space-y-8">
      <header className="border-b border-[#262626] pb-6">
        <h2 className={cn(
          "text-3xl font-mono font-bold tracking-tight",
          isPenalty ? "text-red-500" : "text-white"
        )}>
          {isPenalty ? 'PENALTY ZONE' : 'DAILY QUESTS'}
        </h2>
        <p className="text-[#A3A3A3] text-sm mt-1">
          {isPenalty ? 'Complete the penalty task to restore system access.' : 'Consistency is enforced through a high-stakes routine engine.'}
        </p>
      </header>

      {isPenalty && (
        <div className="bg-red-950/30 border border-red-900 rounded-xl p-6 mb-8">
          <div className="flex items-center text-red-500 mb-4">
            <AlertTriangle className="w-6 h-6 mr-2" />
            <h3 className="text-xl font-mono font-bold">WARNING: QUEST FAILED</h3>
          </div>
          <p className="text-red-400/80 text-sm mb-6 font-mono">
            You failed to complete yesterday's daily quests. The system has entered a Penalty State. The Reward Shop is locked. Complete the penalty task to restore access.
          </p>
          
          <div className="grid gap-4">
            {penaltyQuests.map(quest => (
              <QuestCard 
                key={quest.id} 
                quest={quest} 
                onProgress={() => handleComplete(quest.id!, quest.currentValue, quest.targetValue, quest.attribute, quest.baseReward)} 
                onDelete={() => handleDeleteQuest(quest.id!)}
              />
            ))}
          </div>
        </div>
      )}

      <div className={cn("space-y-6", isPenalty && "opacity-50 pointer-events-none")}>
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-mono text-white">ACTIVE QUESTS</h3>
        </div>

        <div className="grid gap-4">
          {dailyQuests.map(quest => (
            <QuestCard 
              key={quest.id} 
              quest={quest} 
              onProgress={() => handleComplete(quest.id!, quest.currentValue, quest.targetValue, quest.attribute, quest.baseReward)} 
              onDelete={() => handleDeleteQuest(quest.id!)}
            />
          ))}
          {dailyQuests.length === 0 && (
            <div className="text-center py-12 border border-dashed border-[#262626] rounded-xl text-[#A3A3A3] font-mono text-sm">
              No quests assigned for today.
            </div>
          )}
        </div>

        {/* Add Quest Form */}
        <form onSubmit={handleAddQuest} className="bg-[#141414] border border-[#262626] rounded-xl p-6 mt-8">
          <h4 className="text-sm font-mono text-white mb-4">ADD NEW QUEST</h4>
          <div className="flex flex-col sm:flex-row gap-4">
            <input 
              type="text" 
              placeholder="Quest Title (e.g., 5km Run)" 
              value={newQuestTitle}
              onChange={(e) => setNewQuestTitle(e.target.value)}
              className="bg-[#0A0A0A] border border-[#262626] rounded-md px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-[#00F0FF] flex-1"
            />
            <select 
              value={newQuestAttr}
              onChange={(e) => setNewQuestAttr(e.target.value as any)}
              className="bg-[#0A0A0A] border border-[#262626] rounded-md px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-[#00F0FF]"
            >
              <option value="STR">STR</option>
              <option value="VIT">VIT</option>
              <option value="AGI">AGI</option>
              <option value="INT">INT</option>
              <option value="SEN">SEN</option>
            </select>
            <input 
              type="number" 
              placeholder="Target" 
              value={newQuestTarget}
              onChange={(e) => setNewQuestTarget(parseInt(e.target.value) || 1)}
              className="bg-[#0A0A0A] border border-[#262626] rounded-md px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-[#00F0FF] w-24"
              min="1"
            />
            <button type="submit" className="bg-[#262626] hover:bg-[#333] text-white px-4 py-2 rounded-md font-mono text-sm transition-colors flex items-center justify-center">
              <Plus className="w-4 h-4 mr-2" /> ADD
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const QuestCard: React.FC<{ quest: any, onProgress: () => void, onDelete?: () => void }> = ({ quest, onProgress, onDelete }) => {
  const progress = (quest.currentValue / quest.targetValue) * 100;
  
  return (
    <div className={cn(
      "bg-[#141414] border rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all group",
      quest.completed ? "border-green-900/50 opacity-70" : quest.type === 'penalty' ? "border-red-900" : "border-[#262626] hover:border-[#333]"
    )}>
      <div className="flex items-center gap-4 flex-1 w-full">
        <button 
          onClick={onProgress}
          disabled={quest.completed}
          className={cn(
            "flex-shrink-0 transition-colors",
            quest.completed ? "text-green-500" : quest.type === 'penalty' ? "text-red-500 hover:text-red-400" : "text-[#A3A3A3] hover:text-[#00F0FF]"
          )}
        >
          {quest.completed ? <CheckCircle className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
        </button>
        <div className="flex-1 w-full">
          <div className="flex justify-between items-center mb-2">
            <h4 className={cn("font-mono text-sm sm:text-base", quest.completed && "line-through text-[#A3A3A3]")}>
              {quest.title}
            </h4>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#A3A3A3] bg-[#0A0A0A] px-2 py-1 rounded border border-[#262626]">
                +{quest.baseReward} XP [{quest.attribute}]
              </span>
              {onDelete && (
                <button 
                  onClick={onDelete}
                  className="text-[#A3A3A3] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                  title="Delete Quest"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <div className="w-full bg-[#0A0A0A] h-1.5 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full transition-all duration-500",
                quest.type === 'penalty' ? "bg-red-500" : "bg-[#00F0FF]"
              )}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="text-right text-xs font-mono text-[#A3A3A3] mt-1">
            {quest.currentValue} / {quest.targetValue}
          </div>
        </div>
      </div>
    </div>
  );
}
