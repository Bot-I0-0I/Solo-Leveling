import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { cn, getRank } from '../lib/utils';
import { Activity, Brain, Zap, Heart, Target, CheckCircle, Flame, Coins, Calendar, Edit3 } from 'lucide-react';
import { format, startOfWeek } from 'date-fns';

export function StatusView() {
  const userStats = useLiveQuery(() => db.userStats.get(1));
  const inventory = useLiveQuery(() => db.inventory.toArray());
  const vesselLogs = useLiveQuery(() => db.vesselLogs.orderBy('date').toArray());
  
  const today = format(new Date(), 'yyyy-MM-dd');
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  
  const todayQuests = useLiveQuery(() => db.quests.where('date').equals(today).toArray());
  const activeDungeons = useLiveQuery(() => db.dungeons.where('status').equals('active').toArray());
  const todayNutrition = useLiveQuery(() => db.nutritionLogs.where('date').equals(today).toArray());
  const todayLedger = useLiveQuery(() => db.ledger.where('date').equals(today).toArray());
  const weeklyReview = useLiveQuery(() => db.weeklyReviews.where('weekStartDate').equals(weekStart).first());

  const level = Math.floor((userStats?.xp || 0) / 1000) + 1;
  const { rank, color: rankColor } = getRank(level);
  const themeColor = userStats?.selectedColor || rankColor;

  const [notes, setNotes] = React.useState(userStats?.notes || '');

  React.useEffect(() => {
    if (userStats?.notes !== undefined && notes === '') {
      setNotes(userStats.notes);
    }
  }, [userStats?.notes]);

  const handleSaveNotes = async () => {
    await db.userStats.update(1, { notes });
  };

  if (!userStats) return <div className="opacity-80 font-mono">Loading System Data...</div>;

  const chestLvl = Math.floor((userStats.chestXp || 0) / 100);
  const backLvl = Math.floor((userStats.backXp || 0) / 100);
  const legsLvl = Math.floor((userStats.legsXp || 0) / 100);
  const armsLvl = Math.floor((userStats.armsXp || 0) / 100);
  const shouldersLvl = Math.floor((userStats.shouldersXp || 0) / 100);
  const coreLvl = Math.floor((userStats.coreXp || 0) / 100);
  const cardioLvl = Math.floor((userStats.cardioXp || 0) / 100);

  const maxAttribute = Math.max(chestLvl, backLvl, legsLvl, armsLvl, shouldersLvl, coreLvl, cardioLvl, 10);
  const chartFullMark = Math.ceil(maxAttribute / 5) * 5;

  const chartData = [
    { subject: 'CHEST', A: chestLvl, fullMark: chartFullMark },
    { subject: 'BACK', A: backLvl, fullMark: chartFullMark },
    { subject: 'LEGS', A: legsLvl, fullMark: chartFullMark },
    { subject: 'ARMS', A: armsLvl, fullMark: chartFullMark },
    { subject: 'SHLDRS', A: shouldersLvl, fullMark: chartFullMark },
    { subject: 'CORE', A: coreLvl, fullMark: chartFullMark },
    { subject: 'CARDIO', A: cardioLvl, fullMark: chartFullMark },
  ];

  const attributes = [
    { key: 'chest', label: 'Chest', value: chestLvl, xp: userStats.chestXp || 0, icon: Activity, color: 'text-red-400' },
    { key: 'back', label: 'Back', value: backLvl, xp: userStats.backXp || 0, icon: Activity, color: 'text-green-400' },
    { key: 'legs', label: 'Legs', value: legsLvl, xp: userStats.legsXp || 0, icon: Activity, color: 'text-yellow-400' },
    { key: 'arms', label: 'Arms', value: armsLvl, xp: userStats.armsXp || 0, icon: Activity, color: 'text-blue-400' },
    { key: 'shoulders', label: 'Shoulders', value: shouldersLvl, xp: userStats.shouldersXp || 0, icon: Activity, color: 'text-purple-400' },
    { key: 'core', label: 'Core', value: coreLvl, xp: userStats.coreXp || 0, icon: Activity, color: 'text-orange-400' },
    { key: 'cardio', label: 'Cardio', value: cardioLvl, xp: userStats.cardioXp || 0, icon: Activity, color: 'text-teal-400' },
  ];

  // Overview calculations
  const completedQuests = todayQuests?.filter(q => q.completed).length || 0;
  const totalQuests = todayQuests?.length || 0;
  const activeDungeonCount = activeDungeons?.length || 0;
  
  const consumedCals = todayNutrition?.filter(n => n.type === 'food').reduce((sum, n) => sum + n.calories, 0) || 0;
  const burnedCals = todayNutrition?.filter(n => n.type === 'exercise').reduce((sum, n) => sum + n.calories, 0) || 0;
  const netCals = consumedCals - burnedCals;

  const todayIncome = todayLedger?.filter(l => l.type === 'income').reduce((sum, l) => sum + l.amount, 0) || 0;
  const todayExpense = todayLedger?.filter(l => l.type === 'expense').reduce((sum, l) => sum + l.amount, 0) || 0;
  const netCredits = todayIncome - todayExpense;

  // Recovery Status Calculation
  const last7DaysLogs = vesselLogs?.filter(log => {
    const logDate = new Date(log.date);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return logDate >= sevenDaysAgo;
  }) || [];

  const sleepLogs = last7DaysLogs.filter(l => l.sleepHours !== undefined);
  const avgSleep = sleepLogs.length > 0 
    ? sleepLogs.reduce((sum, l) => sum + (l.sleepHours || 0), 0) / sleepLogs.length 
    : 0;

  let recoveryStatus = 'Unknown';
  let recoveryColor = 'text-[#A3A3A3]';
  if (avgSleep > 0) {
    if (avgSleep >= 7 && avgSleep <= 9) {
      recoveryStatus = 'Optimal';
      recoveryColor = 'text-green-400';
    } else if (avgSleep >= 6) {
      recoveryStatus = 'Fair';
      recoveryColor = 'text-yellow-400';
    } else {
      recoveryStatus = 'Poor';
      recoveryColor = 'text-red-400';
    }
  }

  const rankParts = rank.split(' ');
  const rankTitle = rankParts[0];
  const rankSubtitle = rankParts.slice(1).join(' ') || 'CLASS';

  return (
    <div className="space-y-6 pb-10">
      {/* Desktop Header */}
      <header className="hidden md:block border-b border-[#262626] pb-6">
        <h2 className="text-3xl font-mono font-bold tracking-tight text-white flex items-center" style={{ color: themeColor }}>
          STATUS WINDOW
        </h2>
        <p className="text-[#A3A3A3] text-sm mt-1 font-mono uppercase">Identity Dashboard & Attribute Matrix</p>
      </header>

      {/* SYSTEM OVERVIEW TITLE */}
      <div className="flex items-center space-x-2 text-[#A3A3A3] font-mono text-sm tracking-widest uppercase mb-4">
        <Activity className="w-4 h-4" style={{ color: themeColor }} />
        <span>SYSTEM OVERVIEW</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* RANK & LEVEL CARD */}
        <div className="md:col-span-2 bg-[#0A0A0A] border border-[#262626] rounded-sm p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2" style={{ borderColor: themeColor }}></div>
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2" style={{ borderColor: themeColor }}></div>

          <div className="inline-block border border-[#262626] px-3 py-1 mb-4">
            <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: themeColor }}>CURRENT RANK</span>
          </div>

          <h2 className="text-4xl sm:text-5xl font-black font-mono tracking-tighter leading-none mb-1 text-white uppercase">
            {rankTitle}
          </h2>
          <h2 className="text-4xl sm:text-5xl font-black font-mono tracking-tighter leading-none mb-4 uppercase" style={{ color: themeColor, textShadow: `0 0 15px ${themeColor}80` }}>
            {rankSubtitle}
          </h2>

          <div className="space-y-1 mb-6">
            <p className="text-xs font-mono text-[#A3A3A3]">&gt; Level {level} Entity</p>
            <p className="text-xs font-mono text-[#A3A3A3]">&gt; Role: {userStats.role || 'Player'}</p>
          </div>

          <div className="bg-[#141414] border-l-4 p-4" style={{ borderColor: themeColor }}>
            <div className="flex justify-between items-end mb-2">
              <span className="text-xs font-mono font-bold tracking-widest" style={{ color: themeColor }}>EXPERIENCE</span>
              <span className="text-xs font-mono font-bold" style={{ color: themeColor }}>{userStats.xp % 1000} / 1000</span>
            </div>
            <div className="w-full bg-[#262626] h-2 mb-2">
              <div className="h-full" style={{ width: `${(userStats.xp % 1000) / 10}%`, backgroundColor: themeColor }}></div>
            </div>
            <span className="text-[10px] font-mono tracking-widest" style={{ color: themeColor }}>TO NEXT LEVEL</span>
          </div>
        </div>
      </div>

      {/* MUSCLE DEVELOPMENT & FIGURE */}
      <div className="bg-[#0A0A0A] border border-[#262626] rounded-sm p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2" style={{ borderColor: themeColor }}></div>
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2" style={{ borderColor: themeColor }}></div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-[#A3A3A3] absolute top-3 left-3">
          MUSCLE DEVELOPMENT
        </div>
        
        {/* Figures */}
        <div className="flex justify-center gap-8 w-full h-[350px] pt-8 pb-4">
          {/* Front View */}
          <svg viewBox="0 0 200 440" className="h-full w-auto drop-shadow-[0_0_15px_rgba(0,0,0,0.8)]">
            <defs>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <linearGradient id="metal" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2a2a2a" />
                <stop offset="50%" stopColor="#111" />
                <stop offset="100%" stopColor="#0a0a0a" />
              </linearGradient>
            </defs>
            
            {/* Base Silhouette / Under-suit */}
            <path d="M 100 10 C 80 10, 75 35, 85 55 C 90 65, 95 70, 100 70 C 105 70, 110 65, 115 55 C 125 35, 120 10, 100 10 Z M 88 65 L 85 80 L 115 80 L 112 65 Z M 83 82 L 50 85 C 35 90, 30 110, 35 130 L 50 135 L 60 100 Z M 117 82 L 150 85 C 165 90, 170 110, 165 130 L 150 135 L 140 100 Z M 95 85 L 65 105 C 60 120, 65 140, 70 145 L 95 150 Z M 105 85 L 135 105 C 140 120, 135 140, 130 145 L 105 150 Z M 95 155 L 75 150 L 78 175 L 95 180 Z M 105 155 L 125 150 L 122 175 L 105 180 Z M 95 185 L 80 180 L 82 205 L 95 210 Z M 105 185 L 120 180 L 118 205 L 105 210 Z M 95 215 L 85 210 L 88 235 L 95 240 Z M 105 215 L 115 210 L 112 235 L 105 240 Z M 70 152 C 60 170, 65 200, 80 225 L 82 205 L 75 175 Z M 130 152 C 140 170, 135 200, 120 225 L 118 205 L 125 175 Z M 45 140 C 35 150, 30 170, 35 190 L 50 185 L 55 145 Z M 155 140 C 165 150, 170 170, 165 190 L 150 185 L 145 145 Z M 32 195 C 20 220, 15 250, 25 265 L 40 255 L 48 190 Z M 168 195 C 180 220, 185 250, 175 265 L 160 255 L 152 190 Z M 95 245 L 75 235 C 55 260, 50 300, 60 330 L 85 340 Z M 105 245 L 125 235 C 145 260, 150 300, 140 330 L 115 340 Z M 82 345 L 58 335 C 50 370, 55 410, 65 420 L 80 415 Z M 118 345 L 142 335 C 150 370, 145 410, 135 420 L 120 415 Z" fill="url(#metal)" />

            {/* Head & Neck */}
            <path d="M 100 12 C 82 12, 77 35, 87 55 C 92 65, 96 68, 100 68 C 104 68, 108 65, 113 55 C 123 35, 118 12, 100 12 Z" fill="#111" stroke="#444" strokeWidth="1"/>
            <path d="M 89 66 L 86 80 L 114 80 L 111 66 Z" fill="#111" stroke="#444" strokeWidth="1"/>
            
            {/* Shoulders (Deltoids) - Segmented */}
            <path d="M 83 82 L 55 85 C 45 88, 40 100, 42 115 L 55 110 L 62 95 Z" fill={getRank(shouldersLvl).color} fillOpacity={0.9} stroke="#000" strokeWidth="1" className="hover:brightness-125 transition-all duration-300"/>
            <path d="M 40 118 C 35 125, 35 135, 45 140 L 52 125 L 55 112 Z" fill={getRank(shouldersLvl).color} fillOpacity={0.7} stroke="#000" strokeWidth="1" className="hover:brightness-125 transition-all duration-300"/>
            <path d="M 117 82 L 145 85 C 155 88, 160 100, 158 115 L 145 110 L 138 95 Z" fill={getRank(shouldersLvl).color} fillOpacity={0.9} stroke="#000" strokeWidth="1" className="hover:brightness-125 transition-all duration-300"/>
            <path d="M 160 118 C 165 125, 165 135, 155 140 L 148 125 L 145 112 Z" fill={getRank(shouldersLvl).color} fillOpacity={0.7} stroke="#000" strokeWidth="1" className="hover:brightness-125 transition-all duration-300"/>
            
            {/* Chest (Pecs) - Upper/Lower Split */}
            <path d="M 97 85 L 68 100 C 65 105, 65 115, 70 120 L 97 115 Z" fill={getRank(chestLvl).color} fillOpacity={0.9} stroke="#000" strokeWidth="1" className="hover:brightness-125 transition-all duration-300"/>
            <path d="M 97 118 L 70 123 C 68 135, 72 145, 80 148 L 97 145 Z" fill={getRank(chestLvl).color} fillOpacity={0.7} stroke="#000" strokeWidth="1" className="hover:brightness-125 transition-all duration-300"/>
            <path d="M 103 85 L 132 100 C 135 105, 135 115, 130 120 L 103 115 Z" fill={getRank(chestLvl).color} fillOpacity={0.9} stroke="#000" strokeWidth="1" className="hover:brightness-125 transition-all duration-300"/>
            <path d="M 103 118 L 130 123 C 132 135, 128 145, 120 148 L 103 145 Z" fill={getRank(chestLvl).color} fillOpacity={0.7} stroke="#000" strokeWidth="1" className="hover:brightness-125 transition-all duration-300"/>
            
            {/* Cardio (Core Reactor) - Enhanced */}
            <polygon points="100,105 112,120 100,138 88,120" fill={getRank(cardioLvl).color} filter="url(#glow)" className="hover:brightness-150 transition-all duration-300"/>
            <polygon points="100,110 106,120 100,130 94,120" fill="#fff" />
            <circle cx="100" cy="120" r="2" fill="#fff" filter="url(#glow)"/>
            
            {/* Core (Abs) - 6 Pack + Serratus */}
            <path d="M 97 155 L 82 152 L 84 172 L 97 175 Z" fill={getRank(coreLvl).color} fillOpacity={0.9} stroke="#000" strokeWidth="1" className="hover:brightness-125 transition-all duration-300"/>
            <path d="M 103 155 L 118 152 L 116 172 L 103 175 Z" fill={getRank(coreLvl).color} fillOpacity={0.9} stroke="#000" strokeWidth="1" className="hover:brightness-125 transition-all duration-300"/>
            <path d="M 97 178 L 84 175 L 86 198 L 97 202 Z" fill={getRank(coreLvl).color} fillOpacity={0.8} stroke="#000" strokeWidth="1" className="hover:brightness-125 transition-all duration-300"/>
            <path d="M 103 178 L 116 175 L 114 198 L 103 202 Z" fill={getRank(coreLvl).color} fillOpacity={0.8} stroke="#000" strokeWidth="1" className="hover:brightness-125 transition-all duration-300"/>
            <path d="M 97 205 L 86 201 L 88 225 L 97 230 Z" fill={getRank(coreLvl).color} fillOpacity={0.7} stroke="#000" strokeWidth="1" className="hover:brightness-125 transition-all duration-300"/>
            <path d="M 103 205 L 114 201 L 112 225 L 103 230 Z" fill={getRank(coreLvl).color} fillOpacity={0.7} stroke="#000" strokeWidth="1" className="hover:brightness-125 transition-all duration-300"/>
            
            {/* Core (Obliques) */}
            <path d="M 78 152 C 68 170, 72 195, 82 215 L 84 195 L 80 175 Z" fill={getRank(coreLvl).color} fillOpacity={0.85} stroke="#000" strokeWidth="1" className="hover:brightness-125 transition-all duration-300"/>
            <path d="M 122 152 C 132 170, 128 195, 118 215 L 116 195 L 120 175 Z" fill={getRank(coreLvl).color} fillOpacity={0.85} stroke="#000" strokeWidth="1" className="hover:brightness-125 transition-all duration-300"/>
            
            {/* Arms (Biceps/Triceps) */}
            <path d="M 48 142 C 38 150, 35 165, 40 180 L 52 175 L 55 145 Z" fill={getRank(armsLvl).color} fillOpacity={0.9} stroke="#000" strokeWidth="1" className="hover:brightness-125 transition-all duration-300"/>
            <path d="M 152 142 C 162 150, 165 165, 160 180 L 148 175 L 145 145 Z" fill={getRank(armsLvl).color} fillOpacity={0.9} stroke="#000" strokeWidth="1" className="hover:brightness-125 transition-all duration-300"/>
            
            {/* Arms (Forearms) */}
            <path d="M 38 185 C 25 210, 22 235, 30 250 L 42 240 L 48 185 Z" fill={getRank(armsLvl).color} fillOpacity={0.8} stroke="#000" strokeWidth="1" className="hover:brightness-125 transition-all duration-300"/>
            <path d="M 162 185 C 175 210, 178 235, 170 250 L 158 240 L 152 185 Z" fill={getRank(armsLvl).color} fillOpacity={0.8} stroke="#000" strokeWidth="1" className="hover:brightness-125 transition-all duration-300"/>
            
            {/* Legs (Quads) - Segmented */}
            <path d="M 96 240 L 80 232 C 65 255, 62 285, 70 310 L 88 320 L 96 280 Z" fill={getRank(legsLvl).color} fillOpacity={0.9} stroke="#000" strokeWidth="1" className="hover:brightness-125 transition-all duration-300"/>
            <path d="M 68 315 C 65 325, 70 335, 85 340 L 88 322 L 70 312 Z" fill={getRank(legsLvl).color} fillOpacity={0.7} stroke="#000" strokeWidth="1" className="hover:brightness-125 transition-all duration-300"/>
            <path d="M 104 240 L 120 232 C 135 255, 138 285, 130 310 L 112 320 L 104 280 Z" fill={getRank(legsLvl).color} fillOpacity={0.9} stroke="#000" strokeWidth="1" className="hover:brightness-125 transition-all duration-300"/>
            <path d="M 132 315 C 135 325, 130 335, 115 340 L 112 322 L 130 312 Z" fill={getRank(legsLvl).color} fillOpacity={0.7} stroke="#000" strokeWidth="1" className="hover:brightness-125 transition-all duration-300"/>
            
            {/* Legs (Calves) */}
            <path d="M 82 345 L 62 338 C 55 365, 60 395, 68 410 L 80 405 Z" fill={getRank(legsLvl).color} fillOpacity={0.85} stroke="#000" strokeWidth="1" className="hover:brightness-125 transition-all duration-300"/>
            <path d="M 118 345 L 138 338 C 145 365, 140 395, 132 410 L 120 405 Z" fill={getRank(legsLvl).color} fillOpacity={0.85} stroke="#000" strokeWidth="1" className="hover:brightness-125 transition-all duration-300"/>
          </svg>
          
          {/* Back View */}
          <svg viewBox="0 0 200 440" className="h-full w-auto drop-shadow-[0_0_15px_rgba(0,0,0,0.8)]">
            {/* Base Silhouette / Under-suit */}
            <path d="M 100 10 C 80 10, 75 35, 85 55 C 90 65, 95 70, 100 70 C 105 70, 110 65, 115 55 C 125 35, 120 10, 100 10 Z M 98 65 L 85 75 L 50 85 C 35 90, 30 110, 35 130 L 50 135 L 65 100 L 98 120 Z M 102 65 L 115 75 L 150 85 C 165 90, 170 110, 165 130 L 150 135 L 135 100 L 102 120 Z M 98 125 L 65 105 C 55 130, 60 170, 75 200 L 98 220 Z M 102 125 L 135 105 C 145 130, 140 170, 125 200 L 102 220 Z M 98 225 L 78 205 L 85 240 L 98 245 Z M 102 225 L 122 205 L 115 240 L 102 245 Z M 45 140 C 35 150, 30 170, 35 190 L 50 185 L 55 145 Z M 155 140 C 165 150, 170 170, 165 190 L 150 185 L 145 145 Z M 32 195 C 20 220, 15 250, 25 265 L 40 255 L 48 190 Z M 168 195 C 180 220, 185 250, 175 265 L 160 255 L 152 190 Z M 98 250 L 80 245 C 65 255, 60 280, 70 295 L 98 300 Z M 102 250 L 120 245 C 135 255, 140 280, 130 295 L 102 300 Z M 95 305 L 68 300 C 60 320, 65 340, 70 355 L 88 360 Z M 105 305 L 132 300 C 140 320, 135 340, 130 355 L 112 360 Z M 85 365 L 68 360 C 55 380, 60 410, 70 420 L 82 415 Z M 115 365 L 132 360 C 145 380, 140 410, 130 420 L 118 415 Z" fill="url(#metal)" />

            {/* Head & Neck */}
            <path d="M 100 12 C 82 12, 77 35, 87 55 C 92 65, 96 68, 100 68 C 104 68, 108 65, 113 55 C 123 35, 118 12, 100 12 Z" fill="#111" stroke="#444" strokeWidth="1"/>
            
            {/* Traps (Shoulders/Upper Back) */}
            <path d="M 98 67 L 86 76 L 52 86 C 40 90, 35 105, 38 120 L 50 125 L 65 98 L 98 118 Z" fill={getRank(shouldersLvl).color} fillOpacity={0.9} stroke="#000" strokeWidth="1" className="hover:brightness-125 transition-all duration-300"/>
            <path d="M 102 67 L 114 76 L 148 86 C 160 90, 165 105, 162 120 L 150 125 L 135 98 L 102 118 Z" fill={getRank(shouldersLvl).color} fillOpacity={0.9} stroke="#000" strokeWidth="1" className="hover:brightness-125 transition-all duration-300"/>
            
            {/* Lats (Back) - Segmented */}
            <path d="M 97 122 L 68 105 C 60 125, 62 155, 72 180 L 97 195 Z" fill={getRank(backLvl).color} fillOpacity={0.9} stroke="#000" strokeWidth="1" className="hover:brightness-125 transition-all duration-300"/>
            <path d="M 97 198 L 74 183 C 76 195, 80 205, 85 215 L 97 220 Z" fill={getRank(backLvl).color} fillOpacity={0.7} stroke="#000" strokeWidth="1" className="hover:brightness-125 transition-all duration-300"/>
            <path d="M 103 122 L 132 105 C 140 125, 138 155, 128 180 L 103 195 Z" fill={getRank(backLvl).color} fillOpacity={0.9} stroke="#000" strokeWidth="1" className="hover:brightness-125 transition-all duration-300"/>
            <path d="M 103 198 L 126 183 C 124 195, 120 205, 115 215 L 103 220 Z" fill={getRank(backLvl).color} fillOpacity={0.7} stroke="#000" strokeWidth="1" className="hover:brightness-125 transition-all duration-300"/>
            
            {/* Lower Back (Core) */}
            <path d="M 97 225 L 80 210 L 85 240 L 97 245 Z" fill={getRank(coreLvl).color} fillOpacity={0.85} stroke="#000" strokeWidth="1" className="hover:brightness-125 transition-all duration-300"/>
            <path d="M 103 225 L 120 210 L 115 240 L 103 245 Z" fill={getRank(coreLvl).color} fillOpacity={0.85} stroke="#000" strokeWidth="1" className="hover:brightness-125 transition-all duration-300"/>
            
            {/* Arms (Triceps) */}
            <path d="M 48 135 C 38 145, 35 160, 38 175 L 50 170 L 55 140 Z" fill={getRank(armsLvl).color} fillOpacity={0.9} stroke="#000" strokeWidth="1" className="hover:brightness-125 transition-all duration-300"/>
            <path d="M 152 135 C 162 145, 165 160, 162 175 L 150 170 L 145 140 Z" fill={getRank(armsLvl).color} fillOpacity={0.9} stroke="#000" strokeWidth="1" className="hover:brightness-125 transition-all duration-300"/>
            
            {/* Arms (Forearms) */}
            <path d="M 35 185 C 22 210, 18 235, 28 250 L 40 240 L 48 185 Z" fill={getRank(armsLvl).color} fillOpacity={0.8} stroke="#000" strokeWidth="1" className="hover:brightness-125 transition-all duration-300"/>
            <path d="M 165 185 C 178 210, 182 235, 172 250 L 160 240 L 152 185 Z" fill={getRank(armsLvl).color} fillOpacity={0.8} stroke="#000" strokeWidth="1" className="hover:brightness-125 transition-all duration-300"/>
            
            {/* Legs (Glutes) */}
            <path d="M 97 250 L 82 246 C 68 255, 65 275, 72 290 L 97 295 Z" fill={getRank(legsLvl).color} fillOpacity={0.9} stroke="#000" strokeWidth="1" className="hover:brightness-125 transition-all duration-300"/>
            <path d="M 103 250 L 118 246 C 132 255, 135 275, 128 290 L 103 295 Z" fill={getRank(legsLvl).color} fillOpacity={0.9} stroke="#000" strokeWidth="1" className="hover:brightness-125 transition-all duration-300"/>
            
            {/* Legs (Hamstrings) */}
            <path d="M 94 300 L 70 295 C 62 315, 66 335, 72 350 L 88 355 Z" fill={getRank(legsLvl).color} fillOpacity={0.85} stroke="#000" strokeWidth="1" className="hover:brightness-125 transition-all duration-300"/>
            <path d="M 106 300 L 130 295 C 138 315, 134 335, 128 350 L 112 355 Z" fill={getRank(legsLvl).color} fillOpacity={0.85} stroke="#000" strokeWidth="1" className="hover:brightness-125 transition-all duration-300"/>
            
            {/* Legs (Calves) */}
            <path d="M 85 360 L 70 355 C 58 375, 62 400, 72 410 L 82 405 Z" fill={getRank(legsLvl).color} fillOpacity={0.8} stroke="#000" strokeWidth="1" className="hover:brightness-125 transition-all duration-300"/>
            <path d="M 115 360 L 130 355 C 142 375, 138 400, 128 410 L 118 405 Z" fill={getRank(legsLvl).color} fillOpacity={0.8} stroke="#000" strokeWidth="1" className="hover:brightness-125 transition-all duration-300"/>
          </svg>
        </div>

        {/* Clean List Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
          {[
            { key: 'chest', label: 'Chest', value: chestLvl, xp: userStats.chestXp || 0 },
            { key: 'back', label: 'Back', value: backLvl, xp: userStats.backXp || 0 },
            { key: 'arms', label: 'Arms', value: armsLvl, xp: userStats.armsXp || 0 },
            { key: 'shoulders', label: 'Shoulders', value: shouldersLvl, xp: userStats.shouldersXp || 0 },
            { key: 'core', label: 'Core', value: coreLvl, xp: userStats.coreXp || 0 },
            { key: 'legs', label: 'Legs', value: legsLvl, xp: userStats.legsXp || 0 },
            { key: 'cardio', label: 'Cardio', value: cardioLvl, xp: userStats.cardioXp || 0 },
          ].map(attr => (
            <div key={attr.key} className="flex items-center justify-between bg-[#111] border border-[#262626] p-3 rounded-sm">
              <div className="flex items-center gap-3 w-1/3">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getRank(attr.value).color }}></div>
                <span className="text-xs font-mono text-white uppercase tracking-wider">{attr.label}</span>
              </div>
              <div className="flex-1 px-4">
                <div className="w-full bg-[#262626] h-1 rounded-full overflow-hidden">
                  <div className="h-full transition-all duration-500" style={{ width: `${attr.xp % 100}%`, backgroundColor: getRank(attr.value).color }}></div>
                </div>
              </div>
              <div className="w-1/4 text-right">
                <span className="text-xs font-mono font-bold" style={{ color: getRank(attr.value).color }}>LVL {attr.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SCRATCHPAD */}
        <div className="bg-[#0A0A0A] border border-[#262626] rounded-sm p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2" style={{ borderColor: themeColor }}></div>
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2" style={{ borderColor: themeColor }}></div>
          
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-2">
              <Edit3 className="w-4 h-4" style={{ color: themeColor }} />
              <span className="text-xs font-mono font-bold tracking-widest" style={{ color: themeColor }}>SYSTEM SCRATCHPAD</span>
            </div>
            <button 
              onClick={handleSaveNotes}
              className="text-[10px] font-mono tracking-widest text-black px-2 py-1 rounded-sm"
              style={{ backgroundColor: themeColor }}
            >
              SAVE
            </button>
          </div>
          
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleSaveNotes}
            placeholder="Enter quick notes, thoughts, or temporary data here..."
            className="w-full h-32 bg-[#141414] border border-[#262626] rounded-sm p-4 text-[#A3A3A3] font-mono text-sm focus:outline-none focus:text-white transition-colors resize-none"
            style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
          />
        </div>

        {/* PERSONAL DETAILS */}
        <div className="bg-[#0A0A0A] border border-[#262626] rounded-sm p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#262626]"></div>
          
          <div className="flex items-center space-x-2 mb-4">
            <Activity className="w-4 h-4 text-[#A3A3A3]" />
            <span className="text-xs font-mono font-bold tracking-widest text-[#A3A3A3]">VESSEL DETAILS</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#141414] border border-[#262626] p-3 rounded-sm">
              <div className="text-[10px] font-mono text-[#A3A3A3] tracking-widest mb-1">HEIGHT</div>
              <div className="text-lg font-mono font-bold text-white">{userStats.height ? `${userStats.height} CM` : '--'}</div>
            </div>
            <div className="bg-[#141414] border border-[#262626] p-3 rounded-sm">
              <div className="text-[10px] font-mono text-[#A3A3A3] tracking-widest mb-1">WEIGHT</div>
              <div className="text-lg font-mono font-bold text-white">
                {vesselLogs && vesselLogs.length > 0 && vesselLogs[vesselLogs.length - 1].weight 
                  ? `${vesselLogs[vesselLogs.length - 1].weight} KG` 
                  : '--'}
              </div>
            </div>
            <div className="bg-[#141414] border border-[#262626] p-3 rounded-sm">
              <div className="text-[10px] font-mono text-[#A3A3A3] tracking-widest mb-1">AGE</div>
              <div className="text-lg font-mono font-bold text-white">{userStats.age ? `${userStats.age} YRS` : '--'}</div>
            </div>
            <div className="bg-[#141414] border border-[#262626] p-3 rounded-sm">
              <div className="text-[10px] font-mono text-[#A3A3A3] tracking-widest mb-1">GENDER</div>
              <div className="text-lg font-mono font-bold text-white uppercase">{userStats.gender || '--'}</div>
            </div>
            <div className="bg-[#141414] border border-[#262626] p-3 rounded-sm col-span-2">
              <div className="text-[10px] font-mono text-[#A3A3A3] tracking-widest mb-1">ACTIVITY LEVEL</div>
              <div className="text-lg font-mono font-bold text-white uppercase">{userStats.activityLevel?.replace('_', ' ') || '--'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
