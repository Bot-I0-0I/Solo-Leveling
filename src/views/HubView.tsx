import React from 'react';
import { useStore } from '../store/useStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { 
  Activity, Crosshair, Shield, ShoppingCart, Swords, 
  BookOpen, CalendarDays, Wallet, Settings, Flame, 
  ChevronRight, LayoutGrid, Users
} from 'lucide-react';
import { cn, getRank } from '../lib/utils';
import { motion } from 'framer-motion';

export function HubView() {
  const { setView } = useStore();
  const userStats = useLiveQuery(() => db.userStats.get(1));
  
  const level = Math.floor((userStats?.xp || 0) / 1000) + 1;
  const rankColor = getRank(level).color;
  const themeColor = userStats?.selectedColor || rankColor;

  const categories = [
    {
      title: "CORE SYSTEMS",
      items: [
        { id: 'status', icon: Activity, label: 'Status Window', desc: 'Matrix & Attributes' },
        { id: 'quests', icon: Shield, label: 'Daily Quests', desc: 'Active Objectives' },
        { id: 'scheduler', icon: CalendarDays, label: 'Directives', desc: 'Time Management' },
      ]
    },
    {
      title: "OPERATIONS",
      items: [
        { id: 'dungeons', icon: Swords, label: 'Instances', desc: 'Combat & Training' },
        { id: 'tactical', icon: Crosshair, label: 'Tactical Readiness', desc: 'Skill Assessment' },
        { id: 'reviews', icon: BookOpen, label: 'Weekly Review', desc: 'System Analysis' },
      ]
    },
    {
      title: "RESOURCES",
      items: [
        { id: 'nutrition', icon: Flame, label: 'Metabolism', desc: 'Vessel Fueling' },
        { id: 'store', icon: ShoppingCart, label: 'System Store', desc: 'Equipment & Items' },
        { id: 'ledger', icon: Wallet, label: 'Treasury', desc: 'Credit Management' },
      ]
    },
    {
      title: "SYSTEM",
      items: [
        { id: 'friends', icon: Users, label: 'Network', desc: 'Allies & Connections' },
        { id: 'settings', icon: Settings, label: 'Settings', desc: 'Interface & Identity' },
      ]
    }
  ];

  return (
    <div className="space-y-8 pb-12">
      <header className="border-b border-[#262626] pb-6">
        <h2 className="text-3xl font-mono font-bold tracking-tight text-white flex items-center">
          <LayoutGrid className="w-8 h-8 mr-3" style={{ color: themeColor }} />
          SYSTEM HUB
        </h2>
        <p className="text-[#A3A3A3] text-sm mt-1 font-mono uppercase tracking-widest">Central Command Interface</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {categories.map((cat, idx) => (
          <motion.div 
            key={cat.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="space-y-4"
          >
            <h3 className="text-xs font-mono text-[#A3A3A3] tracking-[0.2em] border-l-2 pl-3" style={{ borderColor: themeColor }}>
              {cat.title}
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {cat.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setView(item.id as any)}
                  className="group flex items-center justify-between p-4 bg-[#141414] border border-[#262626] hover:border-[#333] rounded-xl transition-all duration-300 text-left"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-[#0A0A0A] rounded-lg group-hover:scale-110 transition-transform duration-300">
                      <item.icon className="w-5 h-5" style={{ color: themeColor }} />
                    </div>
                    <div>
                      <div className="text-sm font-mono text-white group-hover:text-white transition-colors">{item.label}</div>
                      <div className="text-[10px] font-mono text-[#A3A3A3] uppercase tracking-tighter">{item.desc}</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#262626] group-hover:text-white group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
