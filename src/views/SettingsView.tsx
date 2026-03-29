import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { cn } from '../lib/utils';
import { Settings, User, Palette, Activity, Save, Upload, Download, Database, Trash2, Moon, Sun, AlertTriangle } from 'lucide-react';
import { useStore } from '../store/useStore';

const THEMES = [
  { name: 'Cyan (Default)', hex: '#00F0FF' },
  { name: 'Neon Green', hex: '#39FF14' },
  { name: 'Purple', hex: '#B026FF' },
  { name: 'Crimson', hex: '#FF003C' },
  { name: 'Gold', hex: '#FFD700' },
  { name: 'Monochrome', hex: '#FFFFFF' },
];

export function SettingsView() {
  const userStats = useLiveQuery(() => db.userStats.get(1));
  const { theme, toggleTheme } = useStore();
  
  const [name, setName] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [fitnessGoal, setFitnessGoal] = useState<'lose' | 'maintain' | 'build'>('maintain');
  const [activityLevel, setActivityLevel] = useState<'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'>('sedentary');
  const [themeColor, setThemeColor] = useState('#00F0FF');
  const [avatar, setAvatar] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (userStats) {
      setName(userStats.name || '');
      setHeight(userStats.height?.toString() || '');
      setAge(userStats.age?.toString() || '');
      setGender(userStats.gender || 'male');
      setFitnessGoal(userStats.fitnessGoal || 'maintain');
      setActivityLevel(userStats.activityLevel || 'sedentary');
      setThemeColor(userStats.themeColor || '#00F0FF');
      setAvatar(userStats.avatar || '');
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

  const handleSave = async () => {
    setIsSaving(true);
    await db.userStats.update(1, {
      name,
      height: height ? parseFloat(height) : undefined,
      age: age ? parseInt(age) : undefined,
      gender,
      fitnessGoal,
      activityLevel,
      themeColor,
      avatar
    });
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
      await db.delete();
      window.location.reload();
    }
  };

  if (!userStats) return <div className="animate-pulse">Loading Settings...</div>;

  return (
    <div className="space-y-8">
      <header className="border-b border-[#262626] pb-6">
        <h2 className="text-3xl font-mono font-bold tracking-tight text-white flex items-center">
          <Settings className="w-8 h-8 mr-3" style={{ color: themeColor }} />
          SYSTEM CONFIGURATION
        </h2>
        <p className="text-[#A3A3A3] text-sm mt-1">Manage profile, biometrics, and interface preferences.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Profile Settings */}
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 space-y-6">
          <h3 className="text-xl font-mono text-white flex items-center border-b border-[#262626] pb-4">
            <User className="w-5 h-5 mr-2" style={{ color: themeColor }} />
            IDENTITY
          </h3>
          
          <div className="flex items-center space-x-6">
            <div className="relative w-24 h-24 rounded-full border-2 border-dashed border-[#262626] flex items-center justify-center overflow-hidden bg-[#0A0A0A]">
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
            <div className="flex-1">
              <label className="block text-xs font-mono text-[#A3A3A3] mb-1">CODENAME / ALIAS</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-4 py-2 text-white font-mono text-sm focus:outline-none transition-colors"
                style={{ focusBorderColor: themeColor }}
                placeholder="Enter your alias"
              />
              <p className="text-xs text-[#A3A3A3] mt-2 flex items-center">
                <Upload className="w-3 h-3 mr-1" /> Click avatar to upload image
              </p>
            </div>
          </div>
        </div>

        {/* Biometrics */}
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 space-y-6">
          <h3 className="text-xl font-mono text-white flex items-center border-b border-[#262626] pb-4">
            <Activity className="w-5 h-5 mr-2" style={{ color: themeColor }} />
            BIOMETRICS
          </h3>
          <p className="text-xs text-[#A3A3A3] font-mono">Required for advanced Vessel Tracker analysis (BMI/BMR).</p>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-[#A3A3A3] mb-1">HEIGHT (CM)</label>
              <input 
                type="number" 
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-4 py-2 text-white font-mono text-sm focus:outline-none"
                placeholder="175"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-[#A3A3A3] mb-1">AGE</label>
              <input 
                type="number" 
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-4 py-2 text-white font-mono text-sm focus:outline-none"
                placeholder="25"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-mono text-[#A3A3A3] mb-1">BIOLOGICAL SEX (For BMR calc)</label>
              <select 
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-4 py-2 text-white font-mono text-sm focus:outline-none"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-mono text-[#A3A3A3] mb-1">FITNESS GOAL</label>
              <select 
                value={fitnessGoal}
                onChange={(e) => setFitnessGoal(e.target.value as any)}
                className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-4 py-2 text-white font-mono text-sm focus:outline-none"
              >
                <option value="lose">Lose Weight / Cut</option>
                <option value="maintain">Maintain Weight / Recomp</option>
                <option value="build">Build Muscle / Bulk</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-mono text-[#A3A3A3] mb-1">ACTIVITY LEVEL</label>
              <select 
                value={activityLevel}
                onChange={(e) => setActivityLevel(e.target.value as any)}
                className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-4 py-2 text-white font-mono text-sm focus:outline-none"
              >
                <option value="sedentary">Sedentary (Little to no exercise)</option>
                <option value="light">Lightly Active (Light exercise 1-3 days/week)</option>
                <option value="moderate">Moderately Active (Moderate exercise 3-5 days/week)</option>
                <option value="active">Active (Hard exercise 6-7 days/week)</option>
                <option value="very_active">Very Active (Very hard exercise/physical job)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Theme Settings */}
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 space-y-6 lg:col-span-2">
          <div className="flex justify-between items-center border-b border-[#262626] pb-4">
            <h3 className="text-xl font-mono text-white flex items-center">
              <Palette className="w-5 h-5 mr-2" style={{ color: themeColor }} />
              INTERFACE THEME
            </h3>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 bg-[#0A0A0A] border border-[#262626] hover:border-[#333] px-4 py-2 rounded-md transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-blue-400" />}
              <span className="text-xs font-mono text-white">{theme === 'dark' ? 'LIGHT MODE' : 'DARK MODE'}</span>
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {THEMES.map((theme) => (
              <button
                key={theme.hex}
                onClick={() => setThemeColor(theme.hex)}
                className={cn(
                  "flex flex-col items-center justify-center p-4 rounded-lg border transition-all",
                  themeColor === theme.hex ? "bg-[#1A1A1A]" : "border-[#262626] hover:border-[#333] bg-[#0A0A0A]"
                )}
                style={{ borderColor: themeColor === theme.hex ? theme.hex : undefined }}
              >
                <div className="w-8 h-8 rounded-full mb-2 shadow-lg" style={{ backgroundColor: theme.hex, boxShadow: `0 0 10px ${theme.hex}80` }}></div>
                <span className="text-xs font-mono text-[#A3A3A3]">{theme.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Data Management */}
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 space-y-6 lg:col-span-2">
          <h3 className="text-xl font-mono text-white flex items-center border-b border-[#262626] pb-4">
            <Database className="w-5 h-5 mr-2" style={{ color: themeColor }} />
            DATA MANAGEMENT
          </h3>
          <p className="text-xs text-[#A3A3A3] font-mono">Backup your local database or restore from a previous backup.</p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={handleExport}
              className="flex-1 bg-[#0A0A0A] border border-[#262626] hover:bg-[#1A1A1A] text-white px-4 py-3 rounded-md font-mono text-sm transition-colors flex items-center justify-center"
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
              <button className="w-full bg-[#0A0A0A] border border-[#262626] hover:bg-[#1A1A1A] text-white px-4 py-3 rounded-md font-mono text-sm transition-colors flex items-center justify-center">
                <Upload className="w-4 h-4 mr-2" /> IMPORT SYSTEM DATA
              </button>
            </div>
          </div>
          <div className="pt-4 border-t border-[#262626]">
            <button 
              onClick={() => setShowResetConfirm(true)}
              className="w-full bg-red-950/30 border border-red-900/50 hover:bg-red-900/50 text-red-400 px-4 py-3 rounded-md font-mono text-sm transition-colors flex items-center justify-center"
            >
              <Trash2 className="w-4 h-4 mr-2" /> FACTORY RESET (WIPE ALL DATA)
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button 
          onClick={handleSave}
          className="bg-[#141414] border border-[#262626] hover:bg-[#1A1A1A] text-white px-8 py-3 rounded-md font-mono text-sm transition-all flex items-center"
          style={{ borderColor: isSaving ? themeColor : undefined, color: isSaving ? themeColor : 'white' }}
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'CONFIG SAVED' : 'SAVE CONFIGURATION'}
        </button>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-red-900/50 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-xl font-mono text-red-500 font-bold mb-4 flex items-center">
              <AlertTriangle className="w-6 h-6 mr-2" />
              CRITICAL WARNING
            </h3>
            <p className="text-[#A3A3A3] text-sm font-mono mb-6">
              This action will permanently delete all your data, including quests, inventory, logs, and settings. This cannot be undone.
            </p>
            <div className="mb-6">
              <label className="block text-xs font-mono text-[#A3A3A3] mb-2">
                Type <span className="text-white font-bold">RESET</span> to confirm:
              </label>
              <input 
                type="text" 
                value={resetText}
                onChange={(e) => setResetText(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-4 py-3 text-white font-mono text-center focus:outline-none focus:border-red-500"
                placeholder="RESET"
              />
            </div>
            <div className="flex space-x-4">
              <button 
                onClick={() => {
                  setShowResetConfirm(false);
                  setResetText('');
                }}
                className="flex-1 bg-[#262626] hover:bg-[#333] text-white px-4 py-3 rounded-md font-mono text-sm transition-colors"
              >
                CANCEL
              </button>
              <button 
                onClick={handleReset}
                disabled={resetText !== 'RESET'}
                className={cn(
                  "flex-1 px-4 py-3 rounded-md font-mono text-sm transition-colors",
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
