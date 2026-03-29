import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid } from 'recharts';
import { cn } from '../lib/utils';
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

  const themeColor = userStats?.themeColor || '#00F0FF';

  const [weight, setWeight] = React.useState('');
  const [bodyFat, setBodyFat] = React.useState('');
  const [stressLevel, setStressLevel] = React.useState('');
  const [notes, setNotes] = React.useState(userStats?.notes || '');

  React.useEffect(() => {
    if (userStats?.notes !== undefined && notes === '') {
      setNotes(userStats.notes);
    }
  }, [userStats?.notes]);

  const handleSaveNotes = async () => {
    await db.userStats.update(1, { notes });
  };

  const handleLogVessel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weight) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    const existing = await db.vesselLogs.where('date').equals(today).first();

    const logData = {
      weight: parseFloat(weight),
      bodyFat: bodyFat ? parseFloat(bodyFat) : undefined,
      stressLevel: stressLevel ? parseInt(stressLevel) as 1|2|3|4|5 : undefined
    };

    if (existing) {
      await db.vesselLogs.update(existing.id!, logData);
    } else {
      await db.vesselLogs.add({
        date: today,
        ...logData
      });
    }

    setWeight('');
    setBodyFat('');
    setStressLevel('');
  };

  if (!userStats) return <div className="animate-pulse">Loading System Data...</div>;

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

  const level = Math.floor((userStats.xp || 0) / 1000) + 1;
  const statPoints = userStats.statPoints || 0;

  const handleAllocateStat = async (attr: 'STR' | 'VIT' | 'AGI' | 'INT' | 'SEN') => {
    if (statPoints > 0) {
      await db.userStats.update(1, {
        [attr]: userStats[attr] + 1,
        statPoints: statPoints - 1
      });
    }
  };
  
  let rank = 'E';
  if (level >= 100) rank = 'S';
  else if (level >= 80) rank = 'A';
  else if (level >= 60) rank = 'B';
  else if (level >= 40) rank = 'C';
  else if (level >= 20) rank = 'D';

  const chartData = [
    { subject: 'STR', A: totalSTR, fullMark: 150 },
    { subject: 'VIT', A: totalVIT, fullMark: 150 },
    { subject: 'AGI', A: totalAGI, fullMark: 150 },
    { subject: 'INT', A: totalINT, fullMark: 150 },
    { subject: 'SEN', A: totalSEN, fullMark: 150 },
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

  const latestLog = vesselLogs?.[vesselLogs.length - 1];
  const currentWeight = latestLog?.weight;
  
  let bmi = null;
  let bmr = null;
  let bmiCategory = '';
  let idealWeightMin = 0;
  let idealWeightMax = 0;

  if (currentWeight && userStats.height && userStats.age) {
    const heightM = userStats.height / 100;
    bmi = currentWeight / (heightM * heightM);
    
    if (bmi < 18.5) bmiCategory = 'Underweight';
    else if (bmi < 25) bmiCategory = 'Optimal';
    else if (bmi < 30) bmiCategory = 'Overweight';
    else bmiCategory = 'Obese';

    // Mifflin-St Jeor Equation
    if (userStats.gender === 'female') {
      bmr = (10 * currentWeight) + (6.25 * userStats.height) - (5 * userStats.age) - 161;
    } else {
      bmr = (10 * currentWeight) + (6.25 * userStats.height) - (5 * userStats.age) + 5;
    }

    idealWeightMin = 18.5 * (heightM * heightM);
    idealWeightMax = 24.9 * (heightM * heightM);
  }

  // Calculate TDEE based on activity level
  let activityMultiplier = 1.2; // sedentary
  switch (userStats?.activityLevel) {
    case 'light': activityMultiplier = 1.375; break;
    case 'moderate': activityMultiplier = 1.55; break;
    case 'active': activityMultiplier = 1.725; break;
    case 'very_active': activityMultiplier = 1.9; break;
  }
  const tdee = bmr ? bmr * activityMultiplier : null;

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
          <div className={cn(
            "text-8xl font-black font-mono leading-none mb-4",
            rank === 'S' ? 'text-[#FFD700] drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]' :
            rank === 'A' ? 'text-purple-500' :
            rank === 'B' ? 'text-blue-500' :
            rank === 'C' ? 'text-green-500' :
            'text-gray-400'
          )}>
            {rank}
          </div>
          <div className="text-2xl font-mono text-white">LEVEL {level}</div>
          <div className="mt-4 w-full bg-[#262626] h-2 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#00F0FF]" 
              style={{ width: `${(userStats.xp % 1000) / 10}%` }}
            ></div>
          </div>
          <div className="text-xs text-[#A3A3A3] mt-2 text-right w-full">{userStats.xp % 1000} / 1000 XP</div>
        </div>

        {/* Radar Chart */}
        <div className="col-span-1 md:col-span-2 bg-[#141414] border border-[#262626] rounded-xl p-6 h-[300px]">
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
              {statPoints > 0 && (
                <button
                  onClick={() => handleAllocateStat(attr.key as any)}
                  className="bg-[#262626] hover:bg-[#333] text-white p-1.5 rounded-md transition-colors"
                  title={`Allocate 1 point to ${attr.label}`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {statPoints > 0 && (
        <div className="bg-[#1A1A1A] border border-[#00F0FF]/30 rounded-xl p-4 flex items-center justify-between shadow-[0_0_15px_rgba(0,240,255,0.1)]" style={{ borderColor: `${themeColor}40` }}>
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full animate-pulse mr-3" style={{ backgroundColor: themeColor }}></div>
            <span className="font-mono text-sm text-white">UNALLOCATED ATTRIBUTE POINTS</span>
          </div>
          <span className="font-mono font-bold text-xl" style={{ color: themeColor }}>{statPoints}</span>
        </div>
      )}

      {/* Vessel Tracker */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
        <h3 className="text-lg font-mono text-white mb-4 flex items-center">
          <Heart className="w-5 h-5 mr-2 text-red-400" />
          VESSEL TRACKER
        </h3>
        <p className="text-sm text-[#A3A3A3] mb-6">Log your physical capacity metrics and monitor vessel integrity over time.</p>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-[250px] bg-[#0A0A0A] border border-[#262626] rounded-lg p-4">
            {vesselLogs && vesselLogs.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <LineChart data={vesselLogs}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                  <XAxis dataKey="date" stroke="#A3A3A3" fontSize={10} tickFormatter={(val) => val.substring(5)} />
                  <YAxis yAxisId="left" stroke="#A3A3A3" fontSize={10} domain={['dataMin - 2', 'dataMax + 2']} />
                  <YAxis yAxisId="right" orientation="right" stroke="#A3A3A3" fontSize={10} domain={[0, 'dataMax + 5']} hide />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#141414', borderColor: '#262626', color: '#fff' }}
                    itemStyle={{ color: themeColor }}
                  />
                  <Line yAxisId="left" type="monotone" dataKey="weight" name="Weight (kg)" stroke={themeColor} strokeWidth={2} dot={{ r: 4, fill: themeColor }} activeDot={{ r: 6 }} />
                  <Line yAxisId="right" type="monotone" dataKey="bodyFat" name="Body Fat %" stroke="#FFD700" strokeWidth={2} dot={{ r: 4, fill: '#FFD700' }} />
                  <Line yAxisId="right" type="monotone" dataKey="stressLevel" name="Stress (1-5)" stroke="#ef4444" strokeWidth={2} dot={{ r: 4, fill: '#ef4444' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#A3A3A3] font-mono text-sm">
                No vessel data logged yet.
              </div>
            )}
          </div>

          <div>
            <form onSubmit={handleLogVessel} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[#A3A3A3] mb-1">WEIGHT (KG)</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="e.g., 75.5" 
                  className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-[#00F0FF]"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-[#A3A3A3] mb-1">BODY FAT % (OPTIONAL)</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={bodyFat}
                  onChange={(e) => setBodyFat(e.target.value)}
                  placeholder="e.g., 15.2" 
                  className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-[#00F0FF]"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-[#A3A3A3] mb-1">STRESS (1-5)</label>
                <input 
                  type="number" 
                  min="1"
                  max="5"
                  value={stressLevel}
                  onChange={(e) => setStressLevel(e.target.value)}
                  placeholder="1 = Low" 
                  className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-[#00F0FF]"
                />
              </div>
              <button type="submit" className="w-full bg-[#262626] hover:bg-[#333] text-white px-4 py-3 rounded-md font-mono text-sm transition-colors flex items-center justify-center mt-2">
                <Plus className="w-4 h-4 mr-2" /> LOG VESSEL DATA
              </button>
            </form>
          </div>
        </div>

        {/* Growth Analysis Panel */}
        {bmi && bmr && tdee && (
          <div className="mt-6 pt-6 border-t border-[#262626] grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#0A0A0A] border border-[#262626] rounded-lg p-4">
              <div className="text-xs font-mono text-[#A3A3A3] mb-1 flex items-center">
                <Activity className="w-3 h-3 mr-1" /> BMI INDEX
              </div>
              <div className="text-2xl font-mono text-white mb-1">{bmi.toFixed(1)}</div>
              <div className={cn(
                "text-xs font-mono px-2 py-1 rounded inline-block",
                bmiCategory === 'Optimal' ? "bg-green-950/30 text-green-500 border border-green-900/50" :
                bmiCategory === 'Underweight' ? "bg-blue-950/30 text-blue-500 border border-blue-900/50" :
                "bg-red-950/30 text-red-500 border border-red-900/50"
              )}>
                {bmiCategory.toUpperCase()}
              </div>
            </div>
            
            <div className="bg-[#0A0A0A] border border-[#262626] rounded-lg p-4">
              <div className="text-xs font-mono text-[#A3A3A3] mb-1 flex items-center">
                <Zap className="w-3 h-3 mr-1" /> METABOLIC RATE (TDEE)
              </div>
              <div className="text-2xl font-mono text-white mb-1">{Math.round(tdee)} <span className="text-sm text-[#A3A3A3]">kcal/day</span></div>
              <div className="text-xs font-mono text-[#A3A3A3] mt-2">
                Base BMR: <span className="text-white">{Math.round(bmr)} kcal</span>
              </div>
            </div>

            <div className="bg-[#0A0A0A] border border-[#262626] rounded-lg p-4">
              <div className="text-xs font-mono text-[#A3A3A3] mb-1 flex items-center">
                <TrendingUp className="w-3 h-3 mr-1" /> OPTIMAL CAPACITY
              </div>
              <div className="text-2xl font-mono text-white mb-1">
                {idealWeightMin.toFixed(1)} - {idealWeightMax.toFixed(1)} <span className="text-sm text-[#A3A3A3]">kg</span>
              </div>
              <div className="text-xs font-mono text-[#A3A3A3] mt-2">
                Target range for maximum physical efficiency.
              </div>
            </div>
          </div>
        )}
        {!bmi && (
          <div className="mt-6 pt-6 border-t border-[#262626] flex items-center text-xs font-mono text-[#A3A3A3]">
            <AlertCircle className="w-4 h-4 mr-2 text-yellow-500" />
            Configure Height, Age, and Gender in Settings to unlock Maximum Growth Analysis.
          </div>
        )}
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
          className="w-full h-32 bg-[#0A0A0A] border border-[#262626] rounded-md p-4 text-[#A3A3A3] font-mono text-sm focus:outline-none focus:border-[#00F0FF] focus:text-white transition-colors resize-none"
          style={{ focusBorderColor: themeColor } as any}
        />
      </div>
    </div>
  );
}
