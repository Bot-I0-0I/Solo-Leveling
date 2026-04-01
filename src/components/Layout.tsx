import React from 'react';
import { useStore } from '../store/useStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Activity, Crosshair, Shield, ShoppingCart, Swords, EyeOff, Eye, BookOpen, CalendarDays, Wallet, Settings, User, Flame, LogIn, LogOut } from 'lucide-react';
import { cn, getRank } from '../lib/utils';
import { motion } from 'framer-motion';
import { useAuth } from '../AuthContext';

export function Layout({ children }: { children: React.ReactNode }) {
  const { isCloaked, currentView, toggleCloak, setView } = useStore();
  const userStats = useLiveQuery(() => db.userStats.get(1));
  const { user, login, logout } = useAuth();

  const isPenalty = userStats?.penaltyActive;

  const navItems = [
    { id: 'status', icon: Activity, label: 'Status Window' },
    { id: 'quests', icon: Shield, label: 'Daily Quests' },
    { id: 'scheduler', icon: CalendarDays, label: 'Directives' },
    { id: 'dungeons', icon: Swords, label: 'Instances' },
    { id: 'tactical', icon: Crosshair, label: 'Tactical Readiness' },
    { id: 'nutrition', icon: Flame, label: 'Metabolism' },
    { id: 'store', icon: ShoppingCart, label: 'System Store' },
    { id: 'ledger', icon: Wallet, label: 'Treasury' },
    { id: 'reviews', icon: BookOpen, label: 'Weekly Review' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ] as const;

  const pendingReviews = useLiveQuery(() => db.weeklyReviews?.where('status').equals('pending').toArray()) || [];
  const level = Math.floor((userStats?.xp || 0) / 1000) + 1;
  const { color: themeColor } = getRank(level);
  const uiTheme = userStats?.uiTheme || 'default';

  const themeClasses: Record<string, string> = {
    default: '',
    elite: 'border-blue-500/20',
    s: 'border-yellow-500/20',
    s_plus: 'border-yellow-400/30',
    ss: 'border-red-500/20',
    sss: 'border-purple-500/20',
    national: 'border-cyan-500/20',
    monarch: 'border-indigo-500/30 bg-[#05050A]',
  };

  return (
    <div className={cn(
      "min-h-screen bg-[#0A0A0A] text-[#E5E5E5] font-sans flex flex-col md:flex-row transition-colors duration-500 relative",
      themeClasses[uiTheme] || '',
      isPenalty && "bg-[#1A0505] border-red-900"
    )}>
      {userStats?.backgroundImage && (
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20 pointer-events-none" 
          style={{ backgroundImage: `url(${userStats.backgroundImage})` }}
        />
      )}
      
      {/* Sidebar / Bottom Bar */}
      <nav className={cn(
        "fixed bottom-0 left-0 right-0 md:relative md:w-64 border-t md:border-t-0 md:border-r border-[#262626] bg-[#0A0A0A]/90 backdrop-blur-md z-50 flex md:flex-col justify-start p-2 md:p-4 overflow-x-auto md:overflow-x-hidden md:overflow-y-auto overflow-y-hidden hide-scrollbar md:custom-scrollbar space-x-2 md:space-x-0 md:space-y-2 transition-colors duration-500",
        uiTheme === 'monarch' && "bg-[#05050A]/90 border-indigo-500/30",
        uiTheme === 'national' && "border-cyan-500/20",
        uiTheme === 'sss' && "border-purple-500/20",
        uiTheme === 'ss' && "border-red-500/20",
        uiTheme === 's_plus' && "border-yellow-400/30",
        uiTheme === 's' && "border-yellow-500/20",
        uiTheme === 'elite' && "border-blue-500/20",
        isPenalty && "border-red-900/50 bg-[#1A0505]/90"
      )}>
        <div className="hidden md:flex flex-col mb-8 px-4">
          <h1 className={cn(
            "text-2xl font-bold tracking-tighter uppercase font-mono transition-all duration-500",
            isPenalty ? "text-red-500" : ""
          )} style={!isPenalty ? { color: themeColor, textShadow: `0 0 10px ${themeColor}80` } : {}}>
            {isPenalty ? 'PENALTY ZONE' : 'LIFE CONTROL SYSTEM'}
          </h1>
          
          {userStats?.name && (
            <div className="flex items-center mt-4 space-x-3 bg-[#141414] p-2 rounded-lg border border-[#262626]">
              {userStats.avatar ? (
                <img src={userStats.avatar} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-[#262626]" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#262626] flex items-center justify-center">
                  <User className="w-4 h-4 text-[#A3A3A3]" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono text-white truncate">{userStats.name}</p>
                <p className="text-[10px] font-mono text-[#A3A3A3]">Lvl {Math.floor((userStats.xp || 0) / 1000) + 1} • {userStats.role || 'Player'}</p>
              </div>
            </div>
          )}
        </div>

        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={cn(
              "flex flex-col md:flex-row items-center justify-center md:justify-start md:space-x-3 p-3 rounded-lg transition-all duration-200 relative min-w-[72px] md:min-w-0 flex-shrink-0",
              currentView === item.id 
                ? (isPenalty ? "bg-red-900/20 text-red-400" : "bg-[#262626]")
                : "text-[#A3A3A3] hover:bg-[#1A1A1A] hover:text-white"
            )}
            style={currentView === item.id && !isPenalty ? { color: themeColor } : {}}
          >
            <item.icon className="w-5 h-5 md:w-5 md:h-5 mb-1 md:mb-0" />
            <span className="text-[10px] md:text-sm font-medium block md:hidden">{item.label.split(' ')[0]}</span>
            <span className="text-[10px] md:text-sm font-medium hidden md:block">{item.label}</span>
            {item.id === 'reviews' && pendingReviews.length > 0 && (
              <span className="absolute top-1 right-1 md:top-3 md:right-3 w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </button>
        ))}

        <div className="hidden md:flex flex-col mt-auto space-y-2">
          {user ? (
            <button
              onClick={logout}
              className="flex items-center space-x-3 p-3 rounded-lg text-[#A3A3A3] hover:bg-[#1A1A1A] hover:text-white transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">Cloud Logout</span>
            </button>
          ) : (
            <button
              onClick={login}
              className="flex items-center space-x-3 p-3 rounded-lg text-[#A3A3A3] hover:bg-[#1A1A1A] hover:text-white transition-all"
            >
              <LogIn className="w-5 h-5" />
              <span className="text-sm font-medium">Cloud Login</span>
            </button>
          )}
          <button
            onClick={toggleCloak}
            className="flex items-center space-x-3 p-3 rounded-lg text-[#A3A3A3] hover:bg-[#1A1A1A] hover:text-white transition-all"
          >
            {isCloaked ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            <span className="text-sm font-medium">System Cloak</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className={cn(
        "flex-1 p-4 md:p-8 pb-24 md:pb-8 overflow-y-auto custom-scrollbar relative z-10",
        isCloaked && "blur-sm transition-all duration-300 hover:blur-none"
      )}>
        {/* Mobile Header */}
        <div className="md:hidden flex justify-between items-center mb-6">
          <h1 className={cn(
            "text-xl font-bold tracking-tighter uppercase font-mono transition-all duration-500",
            isPenalty ? "text-red-500" : ""
          )} style={!isPenalty ? { color: themeColor, textShadow: `0 0 10px ${themeColor}80` } : {}}>
            {isPenalty ? 'PENALTY ZONE' : 'LIFE CONTROL'}
          </h1>
          <div className="flex space-x-2">
            {user ? (
              <button onClick={logout} className="p-2 bg-[#262626] rounded-md">
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={login} className="p-2 bg-[#262626] rounded-md">
                <LogIn className="w-4 h-4" />
              </button>
            )}
            <button onClick={toggleCloak} className="p-2 bg-[#262626] rounded-md">
              {isCloaked ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* View Content */}
        <motion.div
          key={currentView}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-5xl mx-auto"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
