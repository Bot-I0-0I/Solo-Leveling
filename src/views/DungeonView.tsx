import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { cn } from '../lib/utils';
import { Play, Square, Plus, ShieldAlert, Trash2 } from 'lucide-react';

export function DungeonView() {
  const dungeons = useLiveQuery(() => db.dungeons.toArray());
  const [newTitle, setNewTitle] = useState('');
  const [newHealth, setNewHealth] = useState(100);
  const [activeDungeonId, setActiveDungeonId] = useState<number | null>(null);
  const [customDamage, setCustomDamage] = useState('');

  const handleAddDungeon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    await db.dungeons.add({
      title: newTitle,
      totalHealth: newHealth,
      currentHealth: newHealth,
      status: 'active',
      shadowExtracted: false
    });
    setNewTitle('');
    setNewHealth(100);
  };

  const handleDamage = async (id: number, current: number, amount: number) => {
    if (amount <= 0) return;
    const newHealth = Math.max(0, current - amount);
    await db.dungeons.update(id, { 
      currentHealth: newHealth,
      status: newHealth === 0 ? 'cleared' : 'active'
    });
    setCustomDamage('');
  };

  const handleDeleteDungeon = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this instance?')) {
      await db.dungeons.delete(id);
    }
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
          <div className="text-red-500 font-mono text-sm tracking-[0.5em] animate-pulse flex items-center justify-center">
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
            <div className="w-full h-4 bg-[#1A0505] border border-red-900/50 rounded-full overflow-hidden relative">
              <div 
                className="absolute top-0 left-0 h-full bg-red-600 transition-all duration-1000 ease-out"
                style={{ width: `${healthPercent}%` }}
              ></div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-12">
            {[10, 25, 50, 100].map(dmg => (
              <button
                key={dmg}
                onClick={() => handleDamage(dungeon.id!, dungeon.currentHealth, dmg)}
                disabled={dungeon.currentHealth === 0}
                className="bg-[#141414] border border-[#262626] hover:border-red-500/50 text-white p-6 rounded-xl font-mono text-xl transition-all hover:bg-red-950/20 disabled:opacity-50"
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
              className="bg-[#141414] border border-[#262626] rounded-md px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-red-500 w-40"
            />
            <button
              onClick={() => handleDamage(dungeon.id!, dungeon.currentHealth, parseInt(customDamage) || 0)}
              disabled={dungeon.currentHealth === 0 || !customDamage}
              className="bg-red-950/30 border border-red-900/50 hover:bg-red-900/50 text-red-500 px-6 py-3 rounded-md font-mono text-sm transition-colors disabled:opacity-50"
            >
              DEAL DAMAGE
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="border-b border-[#262626] pb-6">
        <h2 className="text-3xl font-mono font-bold tracking-tight text-white">INSTANCES</h2>
        <p className="text-[#A3A3A3] text-sm mt-1">Dungeon Mode: Time Blocking & Project Management</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-mono text-white">ACTIVE DUNGEONS</h3>
          <div className="grid gap-4">
            {activeDungeons.map(dungeon => (
              <div key={dungeon.id} className="bg-[#141414] border border-[#262626] rounded-xl p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h4 className="text-xl font-mono font-bold text-white uppercase">{dungeon.title}</h4>
                    <span className="text-xs text-red-400 font-mono">BOSS ENTITY</span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setActiveDungeonId(dungeon.id!)}
                      className="bg-red-950/30 text-red-500 hover:bg-red-900/50 px-4 py-2 rounded-md font-mono text-sm flex items-center transition-colors border border-red-900/50"
                    >
                      <Play className="w-4 h-4 mr-2" /> ENTER
                    </button>
                    <button 
                      onClick={() => handleDeleteDungeon(dungeon.id!)}
                      className="text-[#A3A3A3] hover:text-red-500 p-2 rounded-md transition-colors"
                      title="Delete Instance"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono text-[#A3A3A3]">
                    <span>HP</span>
                    <span>{dungeon.currentHealth} / {dungeon.totalHealth}</span>
                  </div>
                  <div className="w-full h-2 bg-[#0A0A0A] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-600 transition-all duration-500"
                      style={{ width: `${(dungeon.currentHealth / dungeon.totalHealth) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
            {activeDungeons.length === 0 && (
              <div className="text-center py-12 border border-dashed border-[#262626] rounded-xl text-[#A3A3A3] font-mono text-sm">
                No active dungeons. Create one to begin.
              </div>
            )}
          </div>

          <h3 className="text-xl font-mono text-white pt-8">CLEARED DUNGEONS</h3>
          <div className="grid gap-4 opacity-70">
            {clearedDungeons.map(dungeon => (
              <div key={dungeon.id} className="bg-[#0A0A0A] border border-[#262626] rounded-xl p-4 flex justify-between items-center group">
                <span className="font-mono text-sm text-[#A3A3A3] line-through">{dungeon.title}</span>
                <div className="flex items-center gap-4">
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
                      className="text-xs font-mono text-[#00F0FF] hover:text-white border border-[#00F0FF]/30 px-3 py-1 rounded"
                    >
                      EXTRACT SHADOW
                    </button>
                  ) : (
                    <span className="text-xs font-mono text-purple-400">SHADOW EXTRACTED</span>
                  )}
                  <button 
                    onClick={() => handleDeleteDungeon(dungeon.id!)}
                    className="text-[#A3A3A3] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
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
          <form onSubmit={handleAddDungeon} className="bg-[#141414] border border-[#262626] rounded-xl p-6 sticky top-8">
            <h4 className="text-sm font-mono text-white mb-4">CREATE DUNGEON</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[#A3A3A3] mb-1">PROJECT NAME</label>
                <input 
                  type="text" 
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-[#00F0FF]"
                  placeholder="e.g., Q3 Marketing Plan"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-[#A3A3A3] mb-1">TOTAL HP (EST. EFFORT)</label>
                <input 
                  type="number" 
                  value={newHealth}
                  onChange={(e) => setNewHealth(parseInt(e.target.value) || 100)}
                  className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-[#00F0FF]"
                  min="10"
                />
              </div>
              <button type="submit" className="w-full bg-[#262626] hover:bg-[#333] text-white px-4 py-3 rounded-md font-mono text-sm transition-colors flex items-center justify-center mt-4">
                <Plus className="w-4 h-4 mr-2" /> INITIALIZE
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
