import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { cn, getRank, RANK_TIERS } from '../lib/utils';
import { Settings, User, Palette, Activity, Save, Upload, Download, Database, Trash2, Moon, Sun, AlertTriangle, Cloud, RefreshCw } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useAuth } from '../AuthContext';
import { useCloudSync } from '../useCloudSync';
import { format } from 'date-fns';

export function SettingsView() {
  const userStats = useLiveQuery(() => db.userStats.get(1));
  const { theme, toggleTheme } = useStore();
  const { user, isGuest } = useAuth();
  const { isSyncing, lastSync, forceSync } = useCloudSync();
  
  const level = Math.floor((userStats?.xp || 0) / 1000) + 1;
  const rankColor = getRank(level).color;
  const themeColor = userStats?.selectedColor || rankColor;

  const [name, setName] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [fitnessGoal, setFitnessGoal] = useState<'lose' | 'maintain' | 'build'>('maintain');
  const [activityLevel, setActivityLevel] = useState<'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'>('sedentary');
  const [avatar, setAvatar] = useState('');
  const [role, setRole] = useState('Player');
  const [uiTheme, setUiTheme] = useState('default');
  const [selectedColor, setSelectedColor] = useState('');
  const [backgroundImage, setBackgroundImage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (userStats) {
      setName(userStats.name || '');
      setHeight(userStats.height?.toString() || '');
      setAge(userStats.age?.toString() || '');
      setGender(userStats.gender || 'male');
      setFitnessGoal(userStats.fitnessGoal || 'maintain');
      setActivityLevel(userStats.activityLevel || 'sedentary');
      setAvatar(userStats.avatar || '');
      setRole(userStats.role || 'Player');
      setUiTheme(userStats.uiTheme || 'default');
      setSelectedColor(userStats.selectedColor || '');
      setBackgroundImage(userStats.backgroundImage || '');
    }
  }, [userStats]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBackgroundImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveBgImage = () => {
    setBackgroundImage('');
  };

  const handleSave = async () => {
    setIsSaving(true);
    await db.userStats.update(1, {
      name,
      height: height ? parseFloat(height) : undefined,
      age: age ? parseInt(age) : undefined,
      gender,
      fitnessGoal,
      activityLevel,
      avatar,
      role,
      uiTheme,
      selectedColor,
      backgroundImage
    });
    if (user) {
      await forceSync();
    }
    setTimeout(() => setIsSaving(false), 500);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          await db.transaction('rw', [db.userStats, db.quests, db.inventory, db.shopItems, db.vesselLogs, db.weeklyReviews, db.tasks, db.ledger, db.dungeons, db.nutritionLogs, db.tacticalLogs], async () => {
            if (data.userStats) { await db.userStats.clear(); await db.userStats.bulkAdd(data.userStats); }
            if (data.quests) { await db.quests.clear(); await db.quests.bulkAdd(data.quests); }
            if (data.inventory) { await db.inventory.clear(); await db.inventory.bulkAdd(data.inventory); }
            if (data.shopItems) { await db.shopItems.clear(); await db.shopItems.bulkAdd(data.shopItems); }
            if (data.vesselLogs) { await db.vesselLogs.clear(); await db.vesselLogs.bulkAdd(data.vesselLogs); }
            if (data.weeklyReviews) { await db.weeklyReviews.clear(); await db.weeklyReviews.bulkAdd(data.weeklyReviews); }
            if (data.tasks) { await db.tasks.clear(); await db.tasks.bulkAdd(data.tasks); }
            if (data.ledger) { await db.ledger.clear(); await db.ledger.bulkAdd(data.ledger); }
            if (data.dungeons) { await db.dungeons.clear(); await db.dungeons.bulkAdd(data.dungeons); }
            if (data.nutritionLogs) { await db.nutritionLogs.clear(); await db.nutritionLogs.bulkAdd(data.nutritionLogs); }
            if (data.tacticalLogs) { await db.tacticalLogs.clear(); await db.tacticalLogs.bulkAdd(data.tacticalLogs); }
          });
          if (user) {
            await forceSync();
          }
          alert('System data imported successfully!');
          window.location.reload();
        } catch (error) {
          console.error('Import failed', error);
          alert('Failed to import data. Invalid format.');
        }
      };
      reader.readAsText(file);
    }
  };

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetText, setResetText] = useState('');

  const handleExport = async () => {
    const data = {
      userStats: await db.userStats.toArray(),
      quests: await db.quests.toArray(),
      dungeons: await db.dungeons.toArray(),
      inventory: await db.inventory.toArray(),
      shopItems: await db.shopItems.toArray(),
      vesselLogs: await db.vesselLogs.toArray(),
      weeklyReviews: await db.weeklyReviews.toArray(),
      tasks: await db.tasks.toArray(),
      ledger: await db.ledger.toArray(),
      nutritionLogs: await db.nutritionLogs.toArray(),
      tacticalLogs: await db.tacticalLogs.toArray(),
    };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'system_backup.json';
    a.click();
  };

  const handleReset = async () => {
    if (resetText === 'RESET') {
      localStorage.setItem('system_reset_pending', 'true');
      await db.delete();
      window.location.reload();
    }
  };

  if (!userStats) return <div className="opacity-80">Loading Settings...</div>;

  return (
    <div className="space-y-8 pb-10">
      <header className="hidden md:block border-b border-[#262626] pb-6">
        <h2 className="text-3xl font-mono font-bold tracking-tight text-white flex items-center uppercase" style={{ color: themeColor }}>
          SYSTEM CONFIGURATION
        </h2>
        <p className="text-[#A3A3A3] text-sm mt-1 font-mono uppercase tracking-widest">Manage profile, biometrics, and interface preferences.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Profile Settings */}
        <div className="bg-[#0A0A0A] border border-[#262626] rounded-sm p-6 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2" style={{ borderColor: themeColor }}></div>
          <h3 className="text-xl font-mono text-white flex items-center border-b border-[#262626] pb-4 font-bold tracking-widest uppercase">
            <User className="w-5 h-5 mr-2" style={{ color: themeColor }} />
            IDENTITY
          </h3>
          
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
            <div className="relative w-24 h-24 rounded-sm border-2 border-dashed border-[#262626] flex items-center justify-center overflow-hidden bg-[#141414]">
              {avatar ? (
                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-[#A3A3A3]" />
              )}
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-[10px] font-mono text-[#A3A3A3] mb-1 tracking-widest uppercase">CODENAME / ALIAS</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#141414] border border-[#262626] rounded-sm px-4 py-3 text-white font-mono text-xs tracking-wider focus:outline-none focus:ring-1 transition-colors uppercase placeholder:text-[#555]"
                style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
                placeholder="ENTER YOUR ALIAS"
              />
              <p className="text-[10px] text-[#A3A3A3] mt-2 flex items-center tracking-widest uppercase">
                <Upload className="w-3 h-3 mr-1" /> CLICK AVATAR TO UPLOAD IMAGE
              </p>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-[10px] font-mono text-[#A3A3A3] mb-1 tracking-widest uppercase">CLASS / ROLE</label>
            <select 
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-[#141414] border border-[#262626] rounded-sm px-4 py-3 text-white font-mono text-xs tracking-wider focus:outline-none focus:ring-1 transition-colors uppercase"
              style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
            >
              <option value="Player">PLAYER</option>
              <option value="Hunter">HUNTER</option>
              <option value="Assassin">ASSASSIN</option>
              <option value="Mage">MAGE</option>
              <option value="Tank">TANK</option>
              <option value="Healer">HEALER</option>
              <option value="Fighter">FIGHTER</option>
              <option value="Ranger">RANGER</option>
              <option value="Necromancer">NECROMANCER</option>
              <option value="Monarch">MONARCH</option>
            </select>
          </div>

          <div className="mt-4">
            <label className="block text-[10px] font-mono text-[#A3A3A3] mb-1 tracking-widest uppercase">BACKGROUND IMAGE</label>
            <div className="flex items-center gap-4">
              <div className="relative flex-1 bg-[#141414] border border-[#262626] hover:border-[#333] rounded-sm px-4 py-3 text-white font-mono text-xs tracking-widest uppercase transition-colors cursor-pointer flex items-center justify-center">
                <Upload className="w-4 h-4 mr-2" />
                <span>{backgroundImage ? 'CHANGE IMAGE' : 'UPLOAD IMAGE'}</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleBgImageUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
              {backgroundImage && (
                <button 
                  onClick={handleRemoveBgImage}
                  className="p-3 text-[#A3A3A3] hover:text-red-400 transition-colors border border-[#262626] rounded-sm bg-[#141414]"
                  title="Remove Background"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            {backgroundImage && (
              <div className="mt-2 text-[10px] text-green-400 flex items-center tracking-widest uppercase font-mono">
                <Cloud className="w-3 h-3 mr-1" /> BACKGROUND IMAGE ACTIVE
              </div>
            )}
          </div>
        </div>

        {/* Biometrics */}
        <div className="bg-[#0A0A0A] border border-[#262626] rounded-sm p-6 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2" style={{ borderColor: themeColor }}></div>
          <h3 className="text-xl font-mono text-white flex items-center border-b border-[#262626] pb-4 font-bold tracking-widest uppercase">
            <Activity className="w-5 h-5 mr-2" style={{ color: themeColor }} />
            BIOMETRICS
          </h3>
          <p className="text-[10px] text-[#A3A3A3] font-mono tracking-widest uppercase">Required for advanced Vessel Tracker analysis (BMI/BMR).</p>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-mono text-[#A3A3A3] mb-1 tracking-widest uppercase">HEIGHT (CM)</label>
              <input 
                type="number" 
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="w-full bg-[#141414] border border-[#262626] rounded-sm px-4 py-3 text-white font-mono text-xs tracking-wider focus:outline-none placeholder:text-[#555]"
                placeholder="175"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-[#A3A3A3] mb-1 tracking-widest uppercase">AGE</label>
              <input 
                type="number" 
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full bg-[#141414] border border-[#262626] rounded-sm px-4 py-3 text-white font-mono text-xs tracking-wider focus:outline-none placeholder:text-[#555]"
                placeholder="25"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-mono text-[#A3A3A3] mb-1 tracking-widest uppercase">BIOLOGICAL SEX (FOR BMR CALC)</label>
              <select 
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full bg-[#141414] border border-[#262626] rounded-sm px-4 py-3 text-white font-mono text-xs tracking-wider focus:outline-none uppercase"
              >
                <option value="male">MALE</option>
                <option value="female">FEMALE</option>
                <option value="other">OTHER</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-mono text-[#A3A3A3] mb-1 tracking-widest uppercase">FITNESS GOAL</label>
              <select 
                value={fitnessGoal}
                onChange={(e) => setFitnessGoal(e.target.value as any)}
                className="w-full bg-[#141414] border border-[#262626] rounded-sm px-4 py-3 text-white font-mono text-xs tracking-wider focus:outline-none uppercase"
              >
                <option value="lose">LOSE WEIGHT / CUT</option>
                <option value="maintain">MAINTAIN WEIGHT / RECOMP</option>
                <option value="build">BUILD MUSCLE / BULK</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-mono text-[#A3A3A3] mb-1 tracking-widest uppercase">ACTIVITY LEVEL</label>
              <select 
                value={activityLevel}
                onChange={(e) => setActivityLevel(e.target.value as any)}
                className="w-full bg-[#141414] border border-[#262626] rounded-sm px-4 py-3 text-white font-mono text-xs tracking-wider focus:outline-none uppercase"
              >
                <option value="sedentary">SEDENTARY (LITTLE TO NO EXERCISE)</option>
                <option value="light">LIGHTLY ACTIVE (LIGHT EXERCISE 1-3 DAYS/WEEK)</option>
                <option value="moderate">MODERATELY ACTIVE (MODERATE EXERCISE 3-5 DAYS/WEEK)</option>
                <option value="active">ACTIVE (HARD EXERCISE 6-7 DAYS/WEEK)</option>
                <option value="very_active">VERY ACTIVE (VERY HARD EXERCISE/PHYSICAL JOB)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Theme Settings */}
        <div className="bg-[#0A0A0A] border border-[#262626] rounded-sm p-6 space-y-6 lg:col-span-2 relative overflow-hidden">
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2" style={{ borderColor: themeColor }}></div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[#262626] pb-4 gap-4">
            <h3 className="text-xl font-mono text-white flex items-center font-bold tracking-widest uppercase">
              <Palette className="w-5 h-5 mr-2" style={{ color: themeColor }} />
              INTERFACE THEME
            </h3>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 bg-[#141414] border border-[#262626] hover:border-[#333] px-4 py-2 rounded-sm transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-blue-400" />}
              <span className="text-[10px] font-mono text-white tracking-widest uppercase">{theme === 'dark' ? 'LIGHT MODE' : 'DARK MODE'}</span>
            </button>
          </div>
          <p className="text-[10px] text-[#A3A3A3] font-mono tracking-widest uppercase">
            Your system theme color is automatically determined by your current Rank. Level up to unlock new colors!
          </p>
          
          <div className="mt-4">
            <label className="block text-[10px] font-mono text-[#A3A3A3] mb-1 tracking-widest uppercase">ACCENT COLOR</label>
            <select 
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              className="w-full bg-[#141414] border border-[#262626] rounded-sm px-4 py-3 text-white font-mono text-xs tracking-wider focus:outline-none focus:ring-1 transition-colors uppercase"
              style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
            >
              <option value="">AUTO (CURRENT RANK)</option>
              <option value="#00F0FF">SYSTEM DEFAULT (CYAN)</option>
              {RANK_TIERS.filter(t => level >= t.minLevel).map(t => (
                <option key={t.rank} value={t.color}>{t.rank.toUpperCase()} ({t.color})</option>
              ))}
            </select>
          </div>
          
          <div className="mt-4">
            <label className="block text-[10px] font-mono text-[#A3A3A3] mb-1 tracking-widest uppercase">UI THEME (RANK UNLOCKS)</label>
            <select 
              value={uiTheme}
              onChange={(e) => setUiTheme(e.target.value)}
              className="w-full bg-[#141414] border border-[#262626] rounded-sm px-4 py-3 text-white font-mono text-xs tracking-wider focus:outline-none focus:ring-1 transition-colors uppercase"
              style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
            >
              <option value="default">DEFAULT (STANDARD UI)</option>
              {level >= 50 && <option value="s_class">S-CLASS UI (RANK S+)</option>}
              {level >= 100 && <option value="monarch">MONARCH UI (RANK MONARCH)</option>}
            </select>
          </div>
          
          <div className="mt-4 pt-4 border-t border-[#262626]">
            <label className="block text-[10px] font-mono text-[#A3A3A3] mb-2 tracking-widest uppercase">SYSTEM BACKGROUND IMAGE</label>
            <p className="text-[10px] text-[#A3A3A3] font-mono tracking-widest uppercase mb-4">
              Upload a custom background image. Toggle 'System Cloak' to view it clearly.
            </p>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleBgImageUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  title="Upload Background Image"
                />
                <button className="bg-[#141414] border border-[#262626] hover:bg-[#1A1A1A] text-white px-4 py-2 rounded-sm font-mono text-xs tracking-widest uppercase transition-colors flex items-center">
                  <Upload className="w-4 h-4 mr-2" /> UPLOAD IMAGE
                </button>
              </div>
              {backgroundImage && (
                <button 
                  onClick={handleRemoveBgImage}
                  className="text-red-400 hover:text-red-300 font-mono text-xs tracking-widest uppercase flex items-center transition-colors"
                >
                  <Trash2 className="w-4 h-4 mr-1" /> CLEAR
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div className="bg-[#0A0A0A] border border-[#262626] rounded-sm p-6 space-y-6 lg:col-span-2 relative overflow-hidden">
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2" style={{ borderColor: themeColor }}></div>
          <h3 className="text-xl font-mono text-white flex items-center border-b border-[#262626] pb-4 font-bold tracking-widest uppercase">
            <Database className="w-5 h-5 mr-2" style={{ color: themeColor }} />
            DATA MANAGEMENT
          </h3>
          <p className="text-[10px] text-[#A3A3A3] font-mono tracking-widest uppercase">Backup your local database or restore from a previous backup.</p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={handleExport}
              className="flex-1 bg-[#141414] border border-[#262626] hover:bg-[#1A1A1A] text-white px-4 py-3 rounded-sm font-mono text-xs font-bold tracking-widest uppercase transition-colors flex items-center justify-center"
            >
              <Download className="w-4 h-4 mr-2" /> EXPORT SYSTEM DATA
            </button>
            <div className="flex-1 relative">
              <input 
                type="file" 
                accept=".json" 
                onChange={handleImport}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                title="Import System Data"
              />
              <button className="w-full bg-[#141414] border border-[#262626] hover:bg-[#1A1A1A] text-white px-4 py-3 rounded-sm font-mono text-xs font-bold tracking-widest uppercase transition-colors flex items-center justify-center">
                <Upload className="w-4 h-4 mr-2" /> IMPORT SYSTEM DATA
              </button>
            </div>
          </div>
          
          {user && !isGuest && (
            <div className="pt-4 border-t border-[#262626]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center text-white font-mono font-bold tracking-widest uppercase">
                  <Cloud className="w-5 h-5 mr-2" style={{ color: themeColor }} />
                  CLOUD SYNC
                </div>
                {lastSync && (
                  <span className="text-[10px] text-[#A3A3A3] font-mono tracking-widest uppercase">
                    LAST SYNCED: {format(lastSync, 'MMM d, HH:mm')}
                  </span>
                )}
              </div>
              <button 
                onClick={forceSync}
                disabled={isSyncing}
                className="w-full bg-[#141414] border border-[#262626] hover:bg-[#1A1A1A] text-white px-4 py-3 rounded-sm font-mono text-xs font-bold tracking-widest uppercase transition-colors flex items-center justify-center disabled:opacity-50"
              >
                <RefreshCw className={cn("w-4 h-4 mr-2", isSyncing && "animate-spin")} /> 
                {isSyncing ? 'SYNCING...' : 'FORCE CLOUD SYNC'}
              </button>
              
              <div className="mt-4 p-4 bg-blue-950/20 border border-blue-900/50 rounded-sm">
                <h4 className="text-[10px] font-mono text-blue-400 mb-2 flex items-center tracking-widest uppercase">
                  <AlertTriangle className="w-3 h-3 mr-1" /> FIREBASE DOMAIN ISSUE?
                </h4>
                <p className="text-[10px] text-[#A3A3A3] font-mono leading-relaxed uppercase tracking-wider">
                  If you see "Invalid website or domain" on GitHub Pages, you must add your GitHub Pages URL (e.g., <code className="text-blue-300">username.github.io</code>) to the <strong>Authorized Domains</strong> list in your Firebase Console under <code className="text-blue-300">Authentication &gt; Settings</code>.
                </p>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-[#262626]">
            <button 
              onClick={() => setShowResetConfirm(true)}
              className="w-full bg-red-950/30 border border-red-900/50 hover:bg-red-900/50 text-red-400 px-4 py-3 rounded-sm font-mono text-xs font-bold tracking-widest uppercase transition-colors flex items-center justify-center"
            >
              <Trash2 className="w-4 h-4 mr-2" /> FACTORY RESET (WIPE ALL DATA)
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end pb-10">
        <button 
          onClick={handleSave}
          className="bg-[#141414] border border-[#262626] hover:bg-[#1A1A1A] text-white px-8 py-3 rounded-sm font-mono text-xs font-bold tracking-widest uppercase transition-all flex items-center"
          style={{ borderColor: isSaving ? themeColor : undefined, color: isSaving ? themeColor : 'white' }}
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'CONFIG SAVED' : 'SAVE CONFIGURATION'}
        </button>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] border border-red-900/50 rounded-sm max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
            <h3 className="text-xl font-mono text-red-500 font-bold mb-4 flex items-center tracking-widest uppercase">
              <AlertTriangle className="w-6 h-6 mr-2" />
              CRITICAL WARNING
            </h3>
            <p className="text-[#A3A3A3] text-xs font-mono mb-6 tracking-widest uppercase leading-relaxed">
              This action will permanently delete all your data, including quests, inventory, logs, and settings. This cannot be undone.
            </p>
            <div className="mb-6">
              <label className="block text-[10px] font-mono text-[#A3A3A3] mb-2 tracking-widest uppercase">
                TYPE <span className="text-white font-bold">RESET</span> TO CONFIRM:
              </label>
              <input 
                type="text" 
                value={resetText}
                onChange={(e) => setResetText(e.target.value)}
                className="w-full bg-[#141414] border border-[#262626] rounded-sm px-4 py-3 text-white font-mono text-center focus:outline-none focus:border-red-500 tracking-widest uppercase"
                placeholder="RESET"
              />
            </div>
            <div className="flex space-x-4">
              <button 
                onClick={() => {
                  setShowResetConfirm(false);
                  setResetText('');
                }}
                className="flex-1 bg-[#141414] hover:bg-[#262626] border border-[#262626] text-white px-4 py-3 rounded-sm font-mono text-xs font-bold tracking-widest uppercase transition-colors"
              >
                CANCEL
              </button>
              <button 
                onClick={handleReset}
                disabled={resetText !== 'RESET'}
                className={cn(
                  "flex-1 px-4 py-3 rounded-sm font-mono text-xs font-bold tracking-widest uppercase transition-colors",
                  resetText === 'RESET' 
                    ? "bg-red-600 hover:bg-red-700 text-white" 
                    : "bg-red-950/30 text-red-900 cursor-not-allowed"
                )}
              >
                CONFIRM WIPE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
