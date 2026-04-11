import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, addXp } from '../db/db';
import { cn, getRank } from '../lib/utils';
import { Play, Square, Plus, ShieldAlert, Trash2 } from 'lucide-react';

export function DungeonView() {
  const dungeons = useLiveQuery(() => db.dungeons.toArray());
  const userStats = useLiveQuery(() => db.userStats.get(1));
  const [newTitle, setNewTitle] = useState('');
  const [newHealth, setNewHealth] = useState(100);
  const [newRewardCredits, setNewRewardCredits] = useState(500);
  const [newRewardXp, setNewRewardXp] = useState(500);
  const [activeDungeonId, setActiveDungeonId] = useState<number | null>(null);
  const [customDamage, setCustomDamage] = useState('');

  const level = Math.floor((userStats?.xp || 0) / 1000) + 1;
  const rankColor = getRank(level).color;
  const themeColor = userStats?.selectedColor || rankColor;

  const handleAddDungeon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    await db.dungeons.add({
      title: newTitle,
      totalHealth: newHealth,
      currentHealth: newHealth,
      status: 'active',
      shadowExtracted: false,
      rewardCredits: newRewardCredits,
      rewardXp: newRewardXp
    });
    setNewTitle('');
    setNewHealth(100);
    setNewRewardCredits(500);
    setNewRewardXp(500);
  };

  const handleDamage = async (id: number, current: number, amount: number) => {
    if (amount <= 0) return;
    const newHealth = Math.max(0, current - amount);
    const isCleared = newHealth === 0;
    
    await db.dungeons.update(id, { 
      currentHealth: newHealth,
      status: isCleared ? 'cleared' : 'active'
    });
    
    if (isCleared) {
      const dungeon = await db.dungeons.get(id);
      if (dungeon) {
        const creditsReward = dungeon.rewardCredits ?? 500;
        const xpReward = dungeon.rewardXp ?? 500;

        // Log income to ledger
        if (creditsReward > 0) {
          await db.ledger.add({
            date: new Date().toISOString().split('T')[0],
            amount: creditsReward,
            type: 'income',
            description: `Instance Cleared: ${dungeon.title}`
          });
        }
        
        // Add credits to user
        const userStats = await db.userStats.get(1);
        if (userStats) {
          await db.userStats.update(1, { credits: userStats.credits + creditsReward });
        }

        // Add XP
        if (xpReward > 0) {
          await addXp(xpReward);
        }
      }
    }
    
    setCustomDamage('');
  };

  const handleDeleteDungeon = async (id: number) => {
    await db.dungeons.delete(id);
  };

  if (!dungeons) return <div>Loading Instances...</div>;

  const activeDungeons = dungeons.filter(d => d.status === 'active');
  const clearedDungeons = dungeons.filter(d => d.status === 'cleared');

  // Fullscreen HUD Mode
  if (activeDungeonId) {
    const dungeon = dungeons.find(d => d.id === activeDungeonId);
    if (!dungeon) {
      setActiveDungeonId(null);
      return null;
    }

    const healthPercent = (dungeon.currentHealth / dungeon.totalHealth) * 100;

    return (
      <div className="fixed inset-0 bg-[#050505] z-[100] flex flex-col items-center justify-center p-8">
        <div className="absolute top-8 right-8">
          <button 
            onClick={() => setActiveDungeonId(null)}
            className="text-[#A3A3A3] hover:text-white font-mono text-sm flex items-center"
          >
            <Square className="w-4 h-4 mr-2" /> EXIT INSTANCE
          </button>
        </div>
        
        <div className="max-w-3xl w-full text-center space-y-12">
          <div className="text-red-500 font-mono text-sm tracking-[0.5em] flex items-center justify-center">
            <ShieldAlert className="w-4 h-4 mr-2" /> INSTANCE LOCK ACTIVE
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black font-mono text-white uppercase tracking-tighter">
            {dungeon.title}
          </h1>

          <div className="space-y-4">
            <div className="flex justify-between text-sm font-mono text-[#A3A3A3]">
              <span>BOSS HP</span>
              <span>{dungeon.currentHealth} / {dungeon.totalHealth}</span>
            </div>
            <div className="w-full h-4 bg-[#1A0505] border rounded-full overflow-hidden relative" style={{ borderColor: `${themeColor}80` }}>
              <div 
                className="absolute top-0 left-0 h-full transition-all duration-1000 ease-out"
                style={{ width: `${healthPercent}%`, backgroundColor: themeColor }}
              ></div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-12">
            {[10, 25, 50, 100].map(dmg => (
              <button
                key={dmg}
                onClick={() => handleDamage(dungeon.id!, dungeon.currentHealth, dmg)}
                disabled={dungeon.currentHealth === 0}
                className="bg-[#141414] border border-[#262626] text-white p-6 rounded-xl font-mono text-xl transition-all disabled:opacity-50"
                style={{ borderColor: dungeon.currentHealth === 0 ? '#262626' : `${themeColor}50` }}
              >
                -{dmg} HP
              </button>
            ))}
          </div>
          <div className="pt-4 flex justify-center items-center gap-4">
            <input
              type="number"
              value={customDamage}
              onChange={(e) => setCustomDamage(e.target.value)}
              placeholder="Custom DMG"
              className="bg-[#141414] border border-[#262626] rounded-md px-4 py-3 text-white font-mono text-sm focus:outline-none focus:ring-1 w-40 transition-colors"
              style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
            />
            <button
              onClick={() => handleDamage(dungeon.id!, dungeon.currentHealth, parseInt(customDamage) || 0)}
              disabled={dungeon.currentHealth === 0 || !customDamage}
              className="border px-6 py-3 rounded-md font-mono text-sm transition-colors disabled:opacity-50"
              style={{ color: themeColor, borderColor: `${themeColor}80`, backgroundColor: `${themeColor}20` }}
            >
              DEAL DAMAGE
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <header className="hidden md:block border-b border-[#262626] pb-6">
        <h2 className="text-3xl font-mono font-bold tracking-tight text-white uppercase" style={{ color: themeColor }}>INSTANCES</h2>
        <p className="text-[#A3A3A3] text-sm mt-1 font-mono uppercase tracking-widest">Dungeon Mode: Time Blocking & Project Management</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-mono text-white font-bold tracking-widest uppercase">ACTIVE DUNGEONS</h3>
          <div className="grid gap-4">
            {activeDungeons.map(dungeon => (
              <div key={dungeon.id} className="bg-[#0A0A0A] border border-[#262626] rounded-sm p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#262626]"></div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6 gap-4">
                  <div className="w-full sm:w-auto">
                    <h4 className="text-xl font-mono font-bold text-white uppercase truncate tracking-widest">{dungeon.title}</h4>
                    <div className="flex flex-wrap gap-3 mt-1">
                      <span className="text-[10px] text-red-400 font-mono tracking-widest uppercase">BOSS ENTITY</span>
                      <span className="text-[10px] text-[#00F0FF] font-mono whitespace-nowrap tracking-widest uppercase">+{dungeon.rewardXp ?? 500} XP</span>
                      <span className="text-[10px] text-[#FFD700] font-mono whitespace-nowrap tracking-widest uppercase">+{dungeon.rewardCredits ?? 500} CR</span>
                    </div>
                  </div>
                  <div className="flex gap-2 self-end sm:self-auto">
                    <button 
                      onClick={() => setActiveDungeonId(dungeon.id!)}
                      className="bg-red-950/30 text-red-500 hover:bg-red-900/50 px-4 py-2 rounded-sm font-mono text-[10px] font-bold tracking-widest uppercase flex items-center transition-colors border border-red-900/50"
                      style={{ color: themeColor, borderColor: `${themeColor}80`, backgroundColor: `${themeColor}20` }}
                    >
                      <Play className="w-4 h-4 mr-2" /> ENTER
                    </button>
                    <button 
                      onClick={() => handleDeleteDungeon(dungeon.id!)}
                      className="text-[#A3A3A3] hover:text-red-500 p-2 rounded-sm transition-colors"
                      title="Delete Instance"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-mono text-[#A3A3A3] tracking-widest uppercase">
                    <span>HP</span>
                    <span>{dungeon.currentHealth} / {dungeon.totalHealth}</span>
                  </div>
                  <div className="w-full h-1 bg-[#141414] rounded-sm overflow-hidden">
                    <div 
                      className="h-full transition-all duration-500"
                      style={{ width: `${(dungeon.currentHealth / dungeon.totalHealth) * 100}%`, backgroundColor: themeColor }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
            {activeDungeons.length === 0 && (
              <div className="text-center py-12 border border-dashed border-[#262626] rounded-sm text-[#A3A3A3] font-mono text-xs tracking-widest uppercase">
                NO ACTIVE DUNGEONS. CREATE ONE TO BEGIN.
              </div>
            )}
          </div>

          <h3 className="text-xl font-mono text-white pt-8 font-bold tracking-widest uppercase">CLEARED DUNGEONS</h3>
          <div className="grid gap-4 opacity-70">
            {clearedDungeons.map(dungeon => (
              <div key={dungeon.id} className="bg-[#141414] border border-[#262626] rounded-sm p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 group">
                <div className="flex flex-col w-full sm:w-auto">
                  <span className="font-mono text-xs font-bold tracking-widest uppercase text-[#A3A3A3] line-through truncate">{dungeon.title}</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className="text-[10px] text-[#00F0FF]/50 font-mono whitespace-nowrap tracking-widest uppercase">+{dungeon.rewardXp ?? 500} XP</span>
                    <span className="text-[10px] text-[#FFD700]/50 font-mono whitespace-nowrap tracking-widest uppercase">+{dungeon.rewardCredits ?? 500} CR</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 self-end sm:self-auto">
                  {!dungeon.shadowExtracted ? (
                    <button 
                      onClick={async () => {
                        await db.dungeons.update(dungeon.id!, { shadowExtracted: true });
                        await db.inventory.add({
                          name: `Shadow: ${dungeon.title}`,
                          type: 'shadow',
                          attributeBoosts: { INT: 2, AGI: 2 },
                          equipped: false
                        });
                      }}
                      className="text-[10px] font-mono font-bold tracking-widest uppercase text-[#00F0FF] hover:text-white border border-[#00F0FF]/30 px-3 py-1 rounded-sm"
                    >
                      EXTRACT SHADOW
                    </button>
                  ) : (
                    <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-purple-400">SHADOW EXTRACTED</span>
                  )}
                  <button 
                    onClick={() => handleDeleteDungeon(dungeon.id!)}
                    className="text-[#A3A3A3] hover:text-red-500 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    title="Delete Record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <form onSubmit={handleAddDungeon} className="bg-[#0A0A0A] border border-[#262626] rounded-sm p-6 sticky top-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2" style={{ borderColor: themeColor }}></div>
            <h4 className="text-sm font-mono text-white mb-4 font-bold tracking-widest uppercase">CREATE DUNGEON</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono text-[#A3A3A3] mb-1 tracking-widest uppercase">PROJECT NAME</label>
                <input 
                  type="text" 
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#141414] border border-[#262626] rounded-sm px-4 py-3 text-white font-mono text-xs tracking-wider focus:outline-none focus:ring-1 transition-colors uppercase placeholder:text-[#555]"
                  style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
                  placeholder="E.G., Q3 MARKETING PLAN"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-[#A3A3A3] mb-1 tracking-widest uppercase">TOTAL HP (EST. EFFORT)</label>
                <input 
                  type="number" 
                  value={newHealth}
                  onChange={(e) => setNewHealth(parseInt(e.target.value) || 100)}
                  className="w-full bg-[#141414] border border-[#262626] rounded-sm px-4 py-3 text-white font-mono text-xs tracking-wider focus:outline-none focus:ring-1 transition-colors"
                  style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
                  min="10"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono text-[#A3A3A3] mb-1 tracking-widest uppercase">REWARD (CREDITS)</label>
                  <input 
                    type="number" 
                    value={newRewardCredits}
                    onChange={(e) => setNewRewardCredits(parseInt(e.target.value) || 0)}
                    className="w-full bg-[#141414] border border-[#262626] rounded-sm px-4 py-3 text-white font-mono text-xs tracking-wider focus:outline-none focus:ring-1 transition-colors"
                    style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-[#A3A3A3] mb-1 tracking-widest uppercase">REWARD (XP)</label>
                  <input 
                    type="number" 
                    value={newRewardXp}
                    onChange={(e) => setNewRewardXp(parseInt(e.target.value) || 0)}
                    className="w-full bg-[#141414] border border-[#262626] rounded-sm px-4 py-3 text-white font-mono text-xs tracking-wider focus:outline-none focus:ring-1 transition-colors"
                    style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
                    min="0"
                  />
                </div>
              </div>
              <button type="submit" className="w-full bg-[#141414] border border-[#262626] hover:bg-[#1A1A1A] text-white px-4 py-3 rounded-sm font-mono text-xs font-bold tracking-widest uppercase transition-colors flex items-center justify-center mt-4">
                <Plus className="w-4 h-4 mr-2" /> INITIALIZE
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
