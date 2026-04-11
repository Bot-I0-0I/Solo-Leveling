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
      
        {/* MUSCLE FIGURE */}
        <div className="col-span-1 bg-[#0A0A0A] border border-[#262626] rounded-sm p-5 relative h-[300px] md:h-auto flex items-center justify-center">
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2" style={{ borderColor: themeColor }}></div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#A3A3A3] absolute top-3 left-3">
            MUSCLE DEVELOPMENT
          </div>
          <div className="flex justify-center gap-4 w-full h-full pt-6">
            {/* Front View */}
            <svg viewBox="0 0 100 200" className="h-full w-auto max-w-[45%] drop-shadow-md">
              <defs>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              {/* Head & Neck */}
              <path d="M 42 15 L 58 15 L 62 30 L 50 40 L 38 30 Z" fill="#1A1A1A" stroke="#333" strokeWidth="1.5"/>
              <path d="M 46 40 L 54 40 L 56 45 L 44 45 Z" fill="#1A1A1A" stroke="#333" strokeWidth="1.5"/>
              
              {/* Shoulders */}
              <path d="M 42 45 L 25 48 L 20 65 L 32 60 Z" fill={getRank(shouldersLvl).color} stroke="#141414" strokeWidth="1.5"/>
              <path d="M 58 45 L 75 48 L 80 65 L 68 60 Z" fill={getRank(shouldersLvl).color} stroke="#141414" strokeWidth="1.5"/>
              
              {/* Chest */}
              <path d="M 48 48 L 32 60 L 35 75 L 48 80 Z" fill={getRank(chestLvl).color} stroke="#141414" strokeWidth="1.5"/>
              <path d="M 52 48 L 68 60 L 65 75 L 52 80 Z" fill={getRank(chestLvl).color} stroke="#141414" strokeWidth="1.5"/>
              
              {/* Cardio (Core Reactor) */}
              <path d="M 50 60 L 44 65 L 44 75 L 50 80 L 56 75 L 56 65 Z" fill={getRank(cardioLvl).color} stroke="#fff" strokeWidth="1" filter="url(#glow)"/>
              
              {/* Core (Abs) */}
              <path d="M 48 82 L 37 77 L 40 90 L 48 93 Z" fill={getRank(coreLvl).color} stroke="#141414" strokeWidth="1.5"/>
              <path d="M 52 82 L 63 77 L 60 90 L 52 93 Z" fill={getRank(coreLvl).color} stroke="#141414" strokeWidth="1.5"/>
              <path d="M 48 95 L 41 92 L 43 105 L 48 110 Z" fill={getRank(coreLvl).color} stroke="#141414" strokeWidth="1.5"/>
              <path d="M 52 95 L 59 92 L 57 105 L 52 110 Z" fill={getRank(coreLvl).color} stroke="#141414" strokeWidth="1.5"/>
              
              {/* Arms */}
              <path d="M 20 65 L 15 90 L 25 95 L 30 70 Z" fill={getRank(armsLvl).color} stroke="#141414" strokeWidth="1.5"/>
              <path d="M 80 65 L 85 90 L 75 95 L 70 70 Z" fill={getRank(armsLvl).color} stroke="#141414" strokeWidth="1.5"/>
              <path d="M 15 92 L 10 125 L 20 130 L 25 97 Z" fill={getRank(armsLvl).color} stroke="#141414" strokeWidth="1.5"/>
              <path d="M 85 92 L 90 125 L 80 130 L 75 97 Z" fill={getRank(armsLvl).color} stroke="#141414" strokeWidth="1.5"/>
              
              {/* Legs */}
              <path d="M 48 112 L 35 107 L 30 150 L 45 155 Z" fill={getRank(legsLvl).color} stroke="#141414" strokeWidth="1.5"/>
              <path d="M 52 112 L 65 107 L 70 150 L 55 155 Z" fill={getRank(legsLvl).color} stroke="#141414" strokeWidth="1.5"/>
              <path d="M 30 155 L 25 195 L 40 195 L 43 158 Z" fill={getRank(legsLvl).color} stroke="#141414" strokeWidth="1.5"/>
              <path d="M 70 155 L 75 195 L 60 195 L 57 158 Z" fill={getRank(legsLvl).color} stroke="#141414" strokeWidth="1.5"/>
            </svg>
            
            {/* Back View */}
            <svg viewBox="0 0 100 200" className="h-full w-auto max-w-[45%] drop-shadow-md">
              {/* Head & Neck */}
              <path d="M 42 15 L 58 15 L 62 30 L 50 40 L 38 30 Z" fill="#1A1A1A" stroke="#333" strokeWidth="1.5"/>
              
              {/* Traps (Shoulders) */}
              <path d="M 50 40 L 65 50 L 75 50 L 50 70 L 25 50 L 35 50 Z" fill={getRank(shouldersLvl).color} stroke="#141414" strokeWidth="1.5"/>
              
              {/* Lats (Back) */}
              <path d="M 50 72 L 75 60 L 65 100 L 50 110 L 35 100 L 25 60 Z" fill={getRank(backLvl).color} stroke="#141414" strokeWidth="1.5"/>
              
              {/* Arms (Triceps & Forearms) */}
              <path d="M 25 50 L 15 90 L 25 95 L 30 65 Z" fill={getRank(armsLvl).color} stroke="#141414" strokeWidth="1.5"/>
              <path d="M 75 50 L 85 90 L 75 95 L 70 65 Z" fill={getRank(armsLvl).color} stroke="#141414" strokeWidth="1.5"/>
              <path d="M 15 92 L 10 125 L 20 130 L 25 97 Z" fill={getRank(armsLvl).color} stroke="#141414" strokeWidth="1.5"/>
              <path d="M 85 92 L 90 125 L 80 130 L 75 97 Z" fill={getRank(armsLvl).color} stroke="#141414" strokeWidth="1.5"/>
              
              {/* Legs (Glutes, Hamstrings, Calves) */}
              <path d="M 48 112 L 35 100 L 30 150 L 45 155 Z" fill={getRank(legsLvl).color} stroke="#141414" strokeWidth="1.5"/>
              <path d="M 52 112 L 65 100 L 70 150 L 55 155 Z" fill={getRank(legsLvl).color} stroke="#141414" strokeWidth="1.5"/>
              <path d="M 30 155 L 25 195 L 40 195 L 43 158 Z" fill={getRank(legsLvl).color} stroke="#141414" strokeWidth="1.5"/>
              <path d="M 70 155 L 75 195 L 60 195 L 57 158 Z" fill={getRank(legsLvl).color} stroke="#141414" strokeWidth="1.5"/>
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
