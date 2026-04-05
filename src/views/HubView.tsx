import React from 'react';
import { useStore } from '../store/useStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { 
  Activity, Crosshair, Shield, ShoppingCart, Swords, 
  BookOpen, CalendarDays, Wallet, Settings, Flame, 
  ChevronRight, LayoutGrid, Users, Zap, Terminal, Cpu
} from 'lucide-react';
import { cn, getRank } from '../lib/utils';
import { motion } from 'framer-motion';

export function HubView() {
  const { setView } = useStore();
  const userStats = useLiveQuery(() => db.userStats.get(1));
  const quests = useLiveQuery(() => db.quests.toArray());
  
  const level = Math.floor((userStats?.xp || 0) / 1000) + 1;
  const rankColor = getRank(level).color;
  const themeColor = userStats?.selectedColor || rankColor;
  const uiTheme = userStats?.uiTheme || 'default';

  const activeQuests = quests?.filter(q => !q.completed).length || 0;
  const credits = userStats?.credits || 0;

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
      <header className="border-b border-[#262626] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 relative">
        {uiTheme === 'monarch' && (
          <div className="absolute top-0 right-1/4 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        )}
        {uiTheme === 's_class' && (
          <div className="absolute top-0 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        )}
        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-2">
            <Terminal className="w-5 h-5 text-[#A3A3A3]" />
            <span className="text-xs font-mono text-[#A3A3A3] tracking-widest uppercase">
              {uiTheme === 'monarch' ? 'Monarch Protocol Initialized' : 
               uiTheme === 's_class' ? 'S-Class Subsystems Online' : 
               'System Initialization Complete'}
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-mono font-bold tracking-tight text-white flex items-center" style={{ textShadow: `0 0 20px ${themeColor}40` }}>
            <LayoutGrid className="w-8 h-8 md:w-10 md:h-10 mr-4" style={{ color: themeColor }} />
            {uiTheme === 'monarch' ? 'MONARCH COMMAND' : 
             uiTheme === 's_class' ? 'S-CLASS HUB' : 
             'COMMAND HUB'}
          </h2>
        </div>
        <div className={cn(
          "flex items-center space-x-2 border px-4 py-2 rounded-lg relative z-10 transition-colors duration-500",
          uiTheme === 'monarch' ? "bg-indigo-950/30 border-indigo-500/50" :
          uiTheme === 's_class' ? "bg-purple-950/30 border-purple-500/50" :
          "bg-[#141414] border-[#262626]"
        )}>
          <div className={cn(
            "w-2 h-2 rounded-full animate-pulse",
            uiTheme === 'monarch' ? "bg-indigo-400" :
            uiTheme === 's_class' ? "bg-purple-400" :
            "bg-green-500"
          )} />
          <span className={cn(
            "text-xs font-mono tracking-widest",
            uiTheme === 'monarch' ? "text-indigo-400" :
            uiTheme === 's_class' ? "text-purple-400" :
            "text-green-500"
          )}>
            {uiTheme === 'monarch' ? 'MONARCH ONLINE' : 
             uiTheme === 's_class' ? 'S-CLASS ONLINE' : 
             'SYSTEM ONLINE'}
          </span>
        </div>
      </header>

      {/* Quick Stats Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-white/5 to-transparent rounded-bl-full" />
          <div className="text-[#A3A3A3] text-[10px] font-mono tracking-widest mb-1 flex items-center">
            <Cpu className="w-3 h-3 mr-1" />
            CURRENT LEVEL
          </div>
          <div className="text-2xl font-mono font-bold text-white">{level}</div>
          <div className="absolute bottom-0 left-0 h-1 bg-white/20 w-full">
            <div className="h-full" style={{ width: `${((userStats?.xp || 0) % 1000) / 10}%`, backgroundColor: themeColor }} />
          </div>
        </div>
        
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-yellow-500/5 to-transparent rounded-bl-full" />
          <div className="text-[#A3A3A3] text-[10px] font-mono tracking-widest mb-1 flex items-center">
            <Wallet className="w-3 h-3 mr-1" />
            TREASURY
          </div>
          <div className="text-2xl font-mono font-bold text-yellow-500">{credits.toLocaleString()} <span className="text-sm text-yellow-500/50">G</span></div>
        </div>

        <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-blue-500/5 to-transparent rounded-bl-full" />
          <div className="text-[#A3A3A3] text-[10px] font-mono tracking-widest mb-1 flex items-center">
            <Shield className="w-3 h-3 mr-1" />
            ACTIVE QUESTS
          </div>
          <div className="text-2xl font-mono font-bold text-blue-400">{activeQuests}</div>
        </div>

        <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-purple-500/5 to-transparent rounded-bl-full" />
          <div className="text-[#A3A3A3] text-[10px] font-mono tracking-widest mb-1 flex items-center">
            <Zap className="w-3 h-3 mr-1" />
            ENERGY
          </div>
          <div className="text-2xl font-mono font-bold text-purple-400">100<span className="text-sm text-purple-400/50">%</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map((cat, idx) => (
          <motion.div 
            key={cat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-[#0A0A0A] border border-[#262626] rounded-2xl p-6 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-white/5 to-transparent rounded-bl-full pointer-events-none" style={{ backgroundImage: `linear-gradient(to bottom left, ${themeColor}10, transparent)` }} />
            
            <h3 className="text-xs font-mono text-white tracking-[0.2em] mb-6 flex items-center">
              <div className="w-1 h-4 mr-3 rounded-full" style={{ backgroundColor: themeColor }} />
              {cat.title}
            </h3>
            
            <div className="grid grid-cols-1 gap-3 relative z-10">
              {cat.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setView(item.id as any)}
                  className={cn(
                    "group flex items-center justify-between p-4 bg-[#141414] border rounded-xl transition-all duration-300 text-left hover:shadow-lg relative overflow-hidden",
                    uiTheme === 'monarch' ? "border-indigo-900/30 hover:border-indigo-500/50" :
                    uiTheme === 's_class' ? "border-purple-900/30 hover:border-purple-500/50" :
                    "border-[#262626] hover:border-[#333]"
                  )}
                  style={{ '--hover-color': themeColor } as any}
                >
                  {/* High rank hover glow */}
                  {(uiTheme === 'monarch' || uiTheme === 's_class') && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
                  )}
                  
                  <div className="flex items-center space-x-4 relative z-10">
                    <div className={cn(
                      "p-2.5 bg-[#0A0A0A] border rounded-lg group-hover:scale-110 transition-transform duration-300 shadow-inner",
                      uiTheme === 'monarch' ? "border-indigo-900/50 group-hover:border-indigo-500" :
                      uiTheme === 's_class' ? "border-purple-900/50 group-hover:border-purple-500" :
                      "border-[#262626] group-hover:border-[var(--hover-color)]"
                    )}>
                      <item.icon className="w-5 h-5 transition-colors duration-300" style={{ color: themeColor }} />
                    </div>
                    <div>
                      <div className="text-sm font-mono font-bold text-white group-hover:text-white transition-colors">{item.label}</div>
                      <div className="text-[10px] font-mono text-[#A3A3A3] uppercase tracking-widest mt-0.5">{item.desc}</div>
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
