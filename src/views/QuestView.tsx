import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, addXp } from '../db/db';
import { cn, getRank } from '../lib/utils';
import { AlertTriangle, CheckCircle, Circle, Plus, Trash2, FastForward, Repeat, Save, Trophy, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export function QuestView() {
  const userStats = useLiveQuery(() => db.userStats.get(1));
  const today = new Date().toISOString().split('T')[0];
  const quests = useLiveQuery(() => db.quests.where('date').equals(today).toArray());
  const questTemplates = useLiveQuery(() => db.questTemplates.toArray());
  
  const [newQuestTitle, setNewQuestTitle] = useState('');
  const [newQuestAttr, setNewQuestAttr] = useState<string>('chest');
  const [newQuestTarget, setNewQuestTarget] = useState(1);
  const [newQuestReward, setNewQuestReward] = useState(50);
  const [isRecurring, setIsRecurring] = useState(false);

  const isPenalty = false; // Penalty system removed
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

  if (!quests) return <div className="opacity-80 font-mono">Loading System Data...</div>;

  const dailyQuests = quests.filter(q => q.type === 'daily');

  return (
    <div className="space-y-6 pb-10">
      {/* Desktop Header */}
      <header className="hidden md:block border-b border-[#262626] pb-6">
        <h2 className="text-3xl font-mono font-bold tracking-tight text-white flex items-center uppercase" style={{ color: themeColor }}>
          DAILY QUESTS
        </h2>
        <p className="text-[#A3A3A3] text-sm mt-1 font-mono uppercase tracking-widest">Task Execution & Rewards</p>
      </header>

      {/* ACTIVE QUESTS TITLE */}
      <div className="flex items-center space-x-2 text-[#A3A3A3] font-mono text-[10px] font-bold tracking-widest uppercase mb-4">
        <Shield className="w-4 h-4" style={{ color: themeColor }} />
        <span>ACTIVE DIRECTIVES</span>
      </div>

      {/* Active Quests List */}
      <div className="space-y-4">
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
          <div className="bg-[#0A0A0A] border border-dashed border-[#262626] rounded-sm p-8 text-center relative">
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#262626]"></div>
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#262626]"></div>
            <span className="text-xs font-mono tracking-widest text-[#A3A3A3] uppercase">NO ACTIVE DIRECTIVES DETECTED</span>
          </div>
        )}
      </div>

      {/* ADD QUEST FORM */}
      <div className="bg-[#0A0A0A] border border-[#262626] rounded-sm p-5 relative overflow-hidden mt-8">
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2" style={{ borderColor: themeColor }}></div>
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2" style={{ borderColor: themeColor }}></div>
        
        <div className="flex items-center space-x-2 mb-6">
          <Plus className="w-4 h-4" style={{ color: themeColor }} />
          <span className="text-[10px] font-mono font-bold tracking-widest uppercase" style={{ color: themeColor }}>INITIALIZE NEW QUEST</span>
        </div>

        <form onSubmit={handleAddQuest} className="space-y-4">
          <div className="flex flex-col sm:flex-row flex-wrap gap-4">
            <input 
              type="text" 
              placeholder="QUEST TITLE (E.G., 5KM RUN)" 
              value={newQuestTitle}
              onChange={(e) => setNewQuestTitle(e.target.value)}
              className="bg-[#141414] border border-[#262626] rounded-sm px-4 py-3 text-white font-mono text-[10px] tracking-widest focus:outline-none focus:ring-1 transition-colors flex-1 min-w-[200px] uppercase placeholder:text-[#555]"
              style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
            />
            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
              <select 
                value={newQuestAttr}
                onChange={(e) => setNewQuestAttr(e.target.value)}
                className="bg-[#141414] border border-[#262626] rounded-sm px-4 py-3 text-white font-mono text-[10px] tracking-widest focus:outline-none focus:ring-1 transition-colors flex-1 sm:flex-none uppercase"
                style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
              >
                <option value="chest">CHEST</option>
                <option value="back">BACK</option>
                <option value="legs">LEGS</option>
                <option value="arms">ARMS</option>
                <option value="shoulders">SHOULDERS</option>
                <option value="core">CORE</option>
                <option value="cardio">CARDIO</option>
              </select>
              <input 
                type="number" 
                placeholder="TARGET" 
                value={newQuestTarget}
                onChange={(e) => setNewQuestTarget(parseInt(e.target.value) || 1)}
                className="bg-[#141414] border border-[#262626] rounded-sm px-4 py-3 text-white font-mono text-[10px] tracking-widest focus:outline-none focus:ring-1 w-full sm:w-24 transition-colors flex-1 sm:flex-none placeholder:text-[#555] uppercase"
                style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
                min="1"
              />
              <input 
                type="number" 
                placeholder="XP" 
                value={newQuestReward}
                onChange={(e) => setNewQuestReward(parseInt(e.target.value) || 0)}
                className="bg-[#141414] border border-[#262626] rounded-sm px-4 py-3 text-white font-mono text-[10px] tracking-widest focus:outline-none focus:ring-1 w-full sm:w-24 transition-colors flex-1 sm:flex-none placeholder:text-[#555] uppercase"
                style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
                min="0"
              />
            </div>
            <div className="flex items-center justify-between sm:justify-start gap-4 w-full sm:w-auto mt-2 sm:mt-0">
              <label className="flex items-center gap-2 text-[#A3A3A3] font-mono text-[10px] tracking-widest cursor-pointer whitespace-nowrap uppercase">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4 rounded-sm border-[#262626] bg-[#141414] text-current focus:ring-1 focus:ring-offset-0"
                  style={{ color: themeColor, '--tw-ring-color': themeColor } as any}
                />
                DAILY
              </label>
              <div className="flex gap-2">
                <button type="submit" className="text-black px-6 py-3 rounded-sm font-mono text-[10px] font-bold tracking-widest transition-transform active:scale-95 flex items-center justify-center flex-1 sm:flex-none uppercase" style={{ backgroundColor: themeColor }}>
                  <Plus className="w-4 h-4 mr-2" /> ADD
                </button>
                <button 
                  type="button" 
                  onClick={handleSaveTemplate}
                  className="bg-[#141414] border border-[#262626] hover:border-[#333] text-white px-4 py-3 rounded-sm font-mono text-xs transition-colors flex items-center justify-center flex-shrink-0"
                  title="Save as Template"
                >
                  <Save className="w-4 h-4 text-[#A3A3A3]" />
                </button>
              </div>
            </div>
          </div>
          
          {questTemplates && questTemplates.length > 0 && (
            <div className="mt-6 pt-6 border-t border-[#262626]">
              <h5 className="text-[10px] font-mono text-[#A3A3A3] mb-3 tracking-widest uppercase">LOAD TEMPLATE</h5>
              <div className="flex flex-wrap gap-2">
                {questTemplates.map(template => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleLoadTemplate(template)}
                    className="text-[10px] font-mono bg-[#141414] border border-[#262626] hover:border-[#444] text-[#A3A3A3] hover:text-white px-3 py-2 rounded-sm transition-colors flex items-center tracking-widest uppercase"
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
        "bg-[#0A0A0A] border rounded-sm p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all group relative overflow-hidden",
        quest.completed ? "border-[#262626] opacity-50" : "border-[#262626] hover:border-[#444]"
      )}
    >
      {!quest.completed && (
        <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: themeColor }}></div>
      )}
      
      <div className="flex items-center gap-4 flex-1 w-full relative z-10 pl-2">
        <button 
          onClick={onProgress}
          disabled={quest.completed}
          className={cn(
            "flex-shrink-0 transition-all duration-300 transform active:scale-90",
            quest.completed ? "text-[#555]" : "text-[#A3A3A3]"
          )}
          style={!quest.completed ? { color: themeColor } : {}}
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
        <div className="flex-1 w-full min-w-0">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 gap-2 sm:gap-0">
            <div className="flex items-center gap-2 truncate">
              <h4 className={cn(
                "font-mono text-sm sm:text-base transition-all duration-300 truncate uppercase tracking-wider", 
                quest.completed ? "line-through text-[#555]" : "text-white"
              )}>
                {quest.title}
              </h4>
              {quest.isRecurring && (
                <div className="flex-shrink-0 flex items-center px-1 py-0.5 rounded-sm bg-[#141414] border border-[#262626]" title="Recurring Quest">
                  <Repeat className="w-3 h-3 text-[#A3A3A3]" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-[10px] font-mono text-[#A3A3A3] bg-[#141414] px-2 py-1 rounded-sm border border-[#262626] flex items-center whitespace-nowrap tracking-widest">
                <Trophy className="w-3 h-3 mr-1 text-yellow-500/50" />
                {quest.baseReward} XP [{quest.attribute}]
              </span>
              {!quest.completed && quest.targetValue > 1 && (
                <button 
                  onClick={onMax}
                  className="text-[#A3A3A3] opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-1 flex items-center hover:text-white"
                  title="Complete All"
                >
                  <FastForward className="w-4 h-4" />
                </button>
              )}
              {onDelete && (
                <button 
                  onClick={onDelete}
                  className="text-[#A3A3A3] hover:text-red-500 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-1"
                  title="Delete Quest"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <div className="w-full bg-[#141414] h-1.5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full transition-colors duration-500"
              style={{ backgroundColor: quest.completed ? '#262626' : themeColor }}
            ></motion.div>
          </div>
          <div className="text-right text-[10px] font-mono text-[#A3A3A3] mt-1 tracking-widest">
            {quest.currentValue} / {quest.targetValue}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
