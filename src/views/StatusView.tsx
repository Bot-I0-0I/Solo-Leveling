import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid } from 'recharts';
import { cn, getRank } from '../lib/utils';
import { Activity, Brain, Zap, Heart, Target, Plus, TrendingUp, AlertCircle, Edit3, CheckCircle, Flame, Coins, Calendar } from 'lucide-react';
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

  if (!userStats) return <div className="opacity-80">Loading System Data...</div>;

  // Calculate equipped boosts
  const equippedItems = inventory?.filter(i => i.equipped) || [];
  const boosts = equippedItems.reduce((acc, item) => {
    Object.entries(item.attributeBoosts).forEach(([attr, val]) => {
      acc[attr as keyof typeof acc] = (acc[attr as keyof typeof acc] || 0) + (val as number);
    });
    return acc;
  }, { STR: 0, VIT: 0, AGI: 0, INT: 0, SEN: 0 });

  const totalSTR = userStats.STR + boosts.STR;
  const totalVIT = userStats.VIT + boosts.VIT;
  const totalAGI = userStats.AGI + boosts.AGI;
  const totalINT = userStats.INT + boosts.INT;
  const totalSEN = userStats.SEN + boosts.SEN;

  const maxAttribute = Math.max(totalSTR, totalVIT, totalAGI, totalINT, totalSEN, 150);
  const chartFullMark = Math.ceil(maxAttribute / 50) * 50; // Round up to nearest 50

  const chartData = [
    { subject: 'STR', A: totalSTR, fullMark: chartFullMark },
    { subject: 'VIT', A: totalVIT, fullMark: chartFullMark },
    { subject: 'AGI', A: totalAGI, fullMark: chartFullMark },
    { subject: 'INT', A: totalINT, fullMark: chartFullMark },
    { subject: 'SEN', A: totalSEN, fullMark: chartFullMark },
  ];

  const attributes = [
    { key: 'STR', label: 'Strength', value: totalSTR, icon: Activity, color: 'text-red-400' },
    { key: 'VIT', label: 'Vitality', value: totalVIT, icon: Heart, color: 'text-green-400' },
    { key: 'AGI', label: 'Agility', value: totalAGI, icon: Zap, color: 'text-yellow-400' },
    { key: 'INT', label: 'Intelligence', value: totalINT, icon: Brain, color: 'text-blue-400' },
    { key: 'SEN', label: 'Sense', value: totalSEN, icon: Target, color: 'text-purple-400' },
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

  return (
    <div className="space-y-6 md:space-y-8">
      <header className="border-b border-[#262626] pb-4 md:pb-6">
        <h2 className="text-2xl md:text-3xl font-mono font-bold tracking-tight text-white">STATUS WINDOW</h2>
        <p className="text-[#A3A3A3] text-xs md:text-sm mt-1">Identity Dashboard & Attribute Matrix</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* System Overview */}
        <div className="col-span-1 md:col-span-3 bg-[#141414] border border-[#262626] rounded-xl p-6">
          <h3 className="text-lg font-mono text-white mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2" style={{ color: themeColor }} />
            SYSTEM OVERVIEW
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-[#0A0A0A] border border-[#262626] rounded-lg p-3">
              <div className="text-xs font-mono text-[#A3A3A3] mb-1 flex items-center">
                <CheckCircle className="w-3 h-3 mr-1 text-green-400" /> QUESTS
              </div>
              <div className="text-xl font-mono text-white">{completedQuests} / {totalQuests}</div>
            </div>
            <div className="bg-[#0A0A0A] border border-[#262626] rounded-lg p-3">
              <div className="text-xs font-mono text-[#A3A3A3] mb-1 flex items-center">
                <Target className="w-3 h-3 mr-1 text-red-400" /> DUNGEONS
              </div>
              <div className="text-xl font-mono text-white">{activeDungeonCount} <span className="text-sm text-[#A3A3A3]">ACTIVE</span></div>
            </div>
            <div className="bg-[#0A0A0A] border border-[#262626] rounded-lg p-3">
              <div className="text-xs font-mono text-[#A3A3A3] mb-1 flex items-center">
                <Flame className="w-3 h-3 mr-1 text-orange-400" /> CALORIES
              </div>
              <div className="text-xl font-mono text-white">{netCals} <span className="text-sm text-[#A3A3A3]">NET</span></div>
            </div>
            <div className="bg-[#0A0A0A] border border-[#262626] rounded-lg p-3">
              <div className="text-xs font-mono text-[#A3A3A3] mb-1 flex items-center">
                <Coins className="w-3 h-3 mr-1 text-yellow-400" /> CREDITS
              </div>
              <div className="text-xl font-mono text-white">{netCredits > 0 ? '+' : ''}{netCredits} <span className="text-sm text-[#A3A3A3]">TODAY</span></div>
            </div>
            <div className="bg-[#0A0A0A] border border-[#262626] rounded-lg p-3">
              <div className="text-xs font-mono text-[#A3A3A3] mb-1 flex items-center">
                <Calendar className="w-3 h-3 mr-1 text-purple-400" /> REVIEW
              </div>
              <div className={cn("text-sm font-mono mt-1", weeklyReview?.status === 'completed' ? "text-green-400" : "text-yellow-400")}>
                {weeklyReview?.status === 'completed' ? 'COMPLETED' : 'PENDING'}
              </div>
            </div>
          </div>
        </div>

        {/* Level & Rank Card */}
        <div className="col-span-1 bg-[#141414] border border-[#262626] rounded-xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00F0FF] to-transparent opacity-50"></div>
          <div className="text-sm font-mono text-[#A3A3A3] mb-2">CURRENT RANK</div>
          <div 
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black font-mono leading-none mb-4 text-center px-2"
            style={{ color: themeColor, textShadow: `0 0 10px ${themeColor}40` }}
          >
            {rank}
          </div>
          <div className="text-2xl font-mono text-white">LEVEL {level}</div>
          <div className="text-sm font-mono text-[#A3A3A3] mt-1 uppercase tracking-widest">{userStats.role || 'Player'}</div>
          <div className="mt-4 w-full bg-[#262626] h-2 rounded-full overflow-hidden">
            <div 
              className="h-full transition-all duration-500" 
              style={{ width: `${(userStats.xp % 1000) / 10}%`, backgroundColor: themeColor }}
            ></div>
          </div>
          <div className="text-xs text-[#A3A3A3] mt-2 text-right w-full">{userStats.xp % 1000} / 1000 XP</div>
        </div>

        {/* Radar Chart */}
        <div className="col-span-1 md:col-span-2 bg-[#141414] border border-[#262626] rounded-xl p-6 h-[350px] min-h-[300px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
              <PolarGrid stroke="#262626" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#A3A3A3', fontSize: 12, fontFamily: 'monospace' }} />
              <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
              <Radar name="Attributes" dataKey="A" stroke={themeColor} fill={themeColor} fillOpacity={0.2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Attributes List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {attributes.map((attr) => (
          <div key={attr.key} className="bg-[#141414] border border-[#262626] rounded-xl p-4 flex flex-col relative overflow-hidden group">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-mono text-[#A3A3A3] uppercase">{attr.label}</span>
              <attr.icon className={cn("w-4 h-4", attr.color)} />
            </div>
            <div className="text-3xl font-mono text-white mt-auto flex items-end justify-between">
              <div>
                {attr.value}
                {boosts[attr.key as keyof typeof boosts] > 0 && (
                  <span className="text-sm text-green-400 ml-2">+{boosts[attr.key as keyof typeof boosts]}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Scratchpad */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-mono text-white flex items-center">
            <Edit3 className="w-5 h-5 mr-2" style={{ color: themeColor }} />
            SYSTEM SCRATCHPAD
          </h3>
          <button 
            onClick={handleSaveNotes}
            className="text-xs font-mono text-[#A3A3A3] hover:text-white transition-colors border border-[#262626] hover:border-[#333] px-3 py-1 rounded bg-[#0A0A0A]"
          >
            SAVE LOG
          </button>
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleSaveNotes}
          placeholder="Enter quick notes, thoughts, or temporary data here..."
          className="w-full h-32 bg-[#0A0A0A] border border-[#262626] rounded-md p-4 text-[#A3A3A3] font-mono text-sm focus:outline-none focus:text-white transition-colors resize-none"
          style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
        />
      </div>

      {/* Recovery Status */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
        <h3 className="text-lg font-mono text-white mb-4 flex items-center">
          <Heart className="w-5 h-5 mr-2 text-red-400" />
          RECOVERY & GROWTH STATUS
        </h3>
        <p className="text-sm text-[#A3A3A3] mb-6">Monitor your vessel's recovery state based on recent sleep patterns.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#0A0A0A] border border-[#262626] rounded-lg p-4">
            <div className="text-xs font-mono text-[#A3A3A3] mb-1 flex items-center">
              <Activity className="w-3 h-3 mr-1" /> 7-DAY AVG SLEEP
            </div>
            <div className="text-2xl font-mono text-white mb-1">{avgSleep > 0 ? avgSleep.toFixed(1) : '--'} <span className="text-sm text-[#A3A3A3]">hrs</span></div>
            <div className={cn("text-xs font-mono px-2 py-1 rounded inline-block bg-[#1A1A1A] border border-[#333]", recoveryColor)}>
              {recoveryStatus}
            </div>
          </div>
          <div className="bg-[#0A0A0A] border border-[#262626] rounded-lg p-4 md:col-span-2 flex flex-col justify-center">
            <p className="text-sm text-[#A3A3A3] font-mono leading-relaxed">
              {recoveryStatus === 'Optimal' && "Your vessel is in an optimal state for muscle synthesis and cognitive recovery. Maintain current sleep patterns."}
              {recoveryStatus === 'Fair' && "Recovery is adequate but could be improved. Aim for 7-9 hours of sleep to maximize growth and performance."}
              {recoveryStatus === 'Poor' && "Warning: Insufficient recovery detected. Cortisol levels may be elevated, hindering muscle growth and fat loss. Prioritize rest."}
              {recoveryStatus === 'Unknown' && "Insufficient data to determine recovery status. Log your sleep in the Metabolism tab."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
