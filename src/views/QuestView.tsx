import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, addXp } from '../db/db';
import { cn, getRank } from '../lib/utils';
import { AlertTriangle, CheckCircle, Circle, Plus, Trash2, FastForward, Repeat, Save, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export function QuestView() {
  const userStats = useLiveQuery(() => db.userStats.get(1));
  const today = new Date().toISOString().split('T')[0];
  const quests = useLiveQuery(() => db.quests.where('date').equals(today).toArray());
  const questTemplates = useLiveQuery(() => db.questTemplates.toArray());
  
  const [newQuestTitle, setNewQuestTitle] = useState('');
  const [newQuestAttr, setNewQuestAttr] = useState<'STR' | 'VIT' | 'AGI' | 'INT' | 'SEN'>('STR');
  const [newQuestTarget, setNewQuestTarget] = useState(1);
  const [newQuestReward, setNewQuestReward] = useState(50);
  const [isRecurring, setIsRecurring] = useState(false);

  const isPenalty = userStats?.penaltyActive;
  const level = Math.floor((userStats?.xp || 0) / 1000) + 1;
  const rankColor = getRank(level).color;
  const themeColor = userStats?.selectedColor || rankColor;

  const handleComplete = async (questId: number, currentVal: number, targetVal: number, attr: string, baseReward: number, type: string, maxOut: boolean = false) => {
    if (currentVal >= targetVal) return; // Already done

    const newVal = maxOut ? targetVal : currentVal + 1;
    const completed = newVal >= targetVal;

    await db.quests.update(questId, { currentValue: newVal, completed });

    if (completed) {
      // Add XP
      if (userStats) {
        const xpGain = baseReward;
        
        await addXp(xpGain, attr as any);

        toast.success(`Quest Completed! +${xpGain} XP gained.`, {
          icon: <Trophy className="w-4 h-4 text-yellow-400" />,
          description: `Attribute: ${attr}`,
          duration: 3000,
        });

        // If it was a penalty quest, clear penalty state
        if (type === 'penalty') {
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
      baseReward: newQuestReward,
      isRecurring
    });

    setNewQuestTitle('');
    setNewQuestTarget(1);
    setNewQuestReward(50);
    setIsRecurring(false);
  };

  const handleDeleteQuest = async (id: number) => {
    await db.quests.delete(id);
  };

  const handleSaveTemplate = async () => {
    if (!newQuestTitle) return;
    await db.questTemplates.add({
      title: newQuestTitle,
      attribute: newQuestAttr,
      targetValue: newQuestTarget,
      baseReward: newQuestReward,
      isRecurring
    });
  };

  const handleLoadTemplate = (template: any) => {
    setNewQuestTitle(template.title);
    setNewQuestAttr(template.attribute);
    setNewQuestTarget(template.targetValue);
    setNewQuestReward(template.baseReward);
    setIsRecurring(template.isRecurring || false);
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
                themeColor={themeColor}
                onProgress={() => handleComplete(quest.id!, quest.currentValue, quest.targetValue, quest.attribute, quest.baseReward, quest.type)} 
                onMax={() => handleComplete(quest.id!, quest.currentValue, quest.targetValue, quest.attribute, quest.baseReward, quest.type, true)}
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
              themeColor={themeColor}
              onProgress={() => handleComplete(quest.id!, quest.currentValue, quest.targetValue, quest.attribute, quest.baseReward, quest.type)} 
              onMax={() => handleComplete(quest.id!, quest.currentValue, quest.targetValue, quest.attribute, quest.baseReward, quest.type, true)}
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
          <div className="flex flex-col sm:flex-row flex-wrap gap-4">
            <input 
              type="text" 
              placeholder="Quest Title (e.g., 5km Run)" 
              value={newQuestTitle}
              onChange={(e) => setNewQuestTitle(e.target.value)}
              className="bg-[#0A0A0A] border border-[#262626] rounded-md px-4 py-2 text-white font-mono text-sm focus:outline-none focus:ring-1 transition-colors flex-1 min-w-[200px]"
              style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
            />
            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
              <select 
                value={newQuestAttr}
                onChange={(e) => setNewQuestAttr(e.target.value as any)}
                className="bg-[#0A0A0A] border border-[#262626] rounded-md px-4 py-2 text-white font-mono text-sm focus:outline-none focus:ring-1 transition-colors flex-1 sm:flex-none"
                style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
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
                className="bg-[#0A0A0A] border border-[#262626] rounded-md px-4 py-2 text-white font-mono text-sm focus:outline-none focus:ring-1 w-full sm:w-24 transition-colors flex-1 sm:flex-none"
                style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
                min="1"
              />
              <input 
                type="number" 
                placeholder="XP" 
                value={newQuestReward}
                onChange={(e) => setNewQuestReward(parseInt(e.target.value) || 0)}
                className="bg-[#0A0A0A] border border-[#262626] rounded-md px-4 py-2 text-white font-mono text-sm focus:outline-none focus:ring-1 w-full sm:w-24 transition-colors flex-1 sm:flex-none"
                style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
                min="0"
              />
            </div>
            <div className="flex items-center justify-between sm:justify-start gap-4 w-full sm:w-auto mt-2 sm:mt-0">
              <label className="flex items-center gap-2 text-[#A3A3A3] font-mono text-sm cursor-pointer whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4 rounded border-[#262626] bg-[#0A0A0A] text-current focus:ring-1 focus:ring-offset-0"
                  style={{ color: themeColor, '--tw-ring-color': themeColor } as any}
                />
                Daily
              </label>
              <div className="flex gap-2">
                <button type="submit" className="bg-[#262626] hover:bg-[#333] text-white px-4 py-2 rounded-md font-mono text-sm transition-colors flex items-center justify-center flex-1 sm:flex-none">
                  <Plus className="w-4 h-4 mr-2" /> ADD
                </button>
                <button 
                  type="button" 
                  onClick={handleSaveTemplate}
                  className="bg-[#0A0A0A] border border-[#262626] hover:border-[#333] text-white px-3 py-2 rounded-md font-mono text-sm transition-colors flex items-center justify-center flex-shrink-0"
                  title="Save as Template"
                >
                  <Save className="w-4 h-4 text-indigo-400" />
                </button>
              </div>
            </div>
          </div>
          
          {questTemplates && questTemplates.length > 0 && (
            <div className="mt-6 pt-6 border-t border-[#262626]">
              <h5 className="text-xs font-mono text-[#A3A3A3] mb-3">LOAD TEMPLATE</h5>
              <div className="flex flex-wrap gap-2">
                {questTemplates.map(template => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleLoadTemplate(template)}
                    className="text-xs font-mono bg-[#0A0A0A] border border-[#262626] hover:border-indigo-400 text-[#A3A3A3] hover:text-white px-3 py-1.5 rounded transition-colors flex items-center"
                  >
                    {template.title}
                    <span className="ml-2 opacity-50">[{template.attribute}]</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

const QuestCard: React.FC<{ quest: any, themeColor: string, onProgress: () => void, onMax: () => void, onDelete?: () => void }> = ({ quest, themeColor, onProgress, onMax, onDelete }) => {
  const progress = (quest.currentValue / quest.targetValue) * 100;
  
  return (
    <motion.div 
      layout
      className={cn(
        "bg-[#141414] border rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all group relative overflow-hidden",
        quest.completed ? "border-green-900/50 opacity-70" : quest.type === 'penalty' ? "border-red-900" : "border-[#262626] hover:border-[#333]"
      )}
    >
      {quest.completed && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-green-500/5 pointer-events-none"
        />
      )}
      <div className="flex items-center gap-4 flex-1 w-full relative z-10">
        <button 
          onClick={onProgress}
          disabled={quest.completed}
          className={cn(
            "flex-shrink-0 transition-all duration-300 transform active:scale-90",
            quest.completed ? "text-green-500" : quest.type === 'penalty' ? "text-red-500 hover:text-red-400" : "text-[#A3A3A3]"
          )}
          style={!quest.completed && quest.type !== 'penalty' ? { color: themeColor } : {}}
        >
          <AnimatePresence mode="wait">
            {quest.completed ? (
              <motion.div
                key="completed"
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
              >
                <CheckCircle className="w-6 h-6" />
              </motion.div>
            ) : (
              <motion.div
                key="pending"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
              >
                <Circle className="w-6 h-6" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
        <div className="flex-1 w-full">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <h4 className={cn(
                "font-mono text-sm sm:text-base transition-all duration-300", 
                quest.completed && "line-through text-[#A3A3A3]"
              )}>
                {quest.title}
              </h4>
              {quest.isRecurring && (
                <div className="flex items-center px-1 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20" title="Recurring Quest">
                  <Repeat className="w-3 h-3 text-indigo-400" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#A3A3A3] bg-[#0A0A0A] px-2 py-1 rounded border border-[#262626] flex items-center">
                <Trophy className="w-3 h-3 mr-1 text-yellow-500/50" />
                {quest.baseReward} XP [{quest.attribute}]
              </span>
              {!quest.completed && quest.targetValue > 1 && (
                <button 
                  onClick={onMax}
                  className="text-[#A3A3A3] opacity-0 group-hover:opacity-100 transition-opacity p-1 flex items-center"
                  style={{ color: themeColor }}
                  title="Complete All"
                >
                  <FastForward className="w-4 h-4" />
                </button>
              )}
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
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className={cn(
                "h-full transition-colors duration-500",
                quest.type === 'penalty' ? "bg-red-500" : ""
              )}
              style={{ backgroundColor: quest.type !== 'penalty' ? themeColor : undefined }}
            ></motion.div>
          </div>
          <div className="text-right text-xs font-mono text-[#A3A3A3] mt-1">
            {quest.currentValue} / {quest.targetValue}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
