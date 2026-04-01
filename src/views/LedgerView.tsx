import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { cn, getRank } from '../lib/utils';
import { Wallet, ArrowUpRight, ArrowDownRight, Plus, Trash2, PieChart as PieChartIcon, BarChart3 } from 'lucide-react';
import { format, subDays, isAfter } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LineChart, Line } from 'recharts';

export function LedgerView() {
  const ledger = useLiveQuery(() => db.ledger.orderBy('date').reverse().toArray());
  const userStats = useLiveQuery(() => db.userStats.get(1));
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('Food/Drink');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [chartType, setChartType] = useState<'pie' | 'bar' | 'line'>('pie');

  const level = Math.floor((userStats?.xp || 0) / 1000) + 1;
  const { color: themeColor } = getRank(level);

  const incomeCategories = ['Quest Reward', 'Salary', 'Investment', 'Other'];
  const expenseCategories = ['Shop Purchase', 'Food/Drink', 'Bills', 'Entertainment', 'Other'];

  const handleTypeChange = (newType: 'income' | 'expense') => {
    setType(newType);
    setCategory(newType === 'income' ? incomeCategories[0] : expenseCategories[0]);
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description || !userStats) return;

    const val = parseFloat(amount);
    await db.ledger.add({
      amount: val,
      description,
      type,
      date,
      category
    } as any);

    // Update user credits
    const newCredits = type === 'income' ? userStats.credits + val : userStats.credits - val;
    await db.userStats.update(1, { credits: newCredits });

    setAmount('');
    setDescription('');
  };

  const deleteEntry = async (entry: any) => {
    if (!userStats) return;
    await db.ledger.delete(entry.id);
    
    // Reverse the credit change
    const newCredits = entry.type === 'income' ? userStats.credits - entry.amount : userStats.credits + entry.amount;
    await db.userStats.update(1, { credits: newCredits });
  };

  const chartData = useMemo(() => {
    if (!ledger) return { pie: [], bar: [] };

    // Pie Chart Data (Expenses by Category)
    const expenses = ledger.filter(l => l.type === 'expense');
    const expensesByCategory = expenses.reduce((acc, curr) => {
      const cat = curr.category || 'Other';
      acc[cat] = (acc[cat] || 0) + curr.amount;
      return acc;
    }, {} as Record<string, number>);

    const pieData = Object.entries(expensesByCategory)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Bar Chart Data (Last 7 Days Income vs Expense)
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = subDays(new Date(), 6 - i);
      return format(d, 'yyyy-MM-dd');
    });

    const barData = last7Days.map(day => {
      const dayEntries = ledger.filter(l => l.date === day);
      const income = dayEntries.filter(l => l.type === 'income').reduce((sum, l) => sum + l.amount, 0);
      const expense = dayEntries.filter(l => l.type === 'expense').reduce((sum, l) => sum + l.amount, 0);
      return {
        date: format(new Date(day), 'MMM dd'),
        Income: income,
        Expense: expense
      };
    });

    // Line Chart Data (Cumulative Balance over last 30 days)
    const last30Days = Array.from({ length: 30 }).map((_, i) => {
      const d = subDays(new Date(), 29 - i);
      return format(d, 'yyyy-MM-dd');
    });

    let currentBalance = 0;
    // Calculate initial balance before the 30 days window
    const before30Days = ledger.filter(l => l.date < last30Days[0]);
    currentBalance = before30Days.reduce((acc, l) => acc + (l.type === 'income' ? l.amount : -l.amount), 0);

    const lineData = last30Days.map(day => {
      const dayEntries = ledger.filter(l => l.date === day);
      const dayNet = dayEntries.reduce((sum, l) => sum + (l.type === 'income' ? l.amount : -l.amount), 0);
      currentBalance += dayNet;
      return {
        date: format(new Date(day), 'MMM dd'),
        Balance: currentBalance
      };
    });

    return { pie: pieData, bar: barData, line: lineData };
  }, [ledger]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ff6b6b'];

  if (!ledger || !userStats) return <div className="opacity-80">Loading Treasury...</div>;

  const totalIncome = ledger.filter(l => l.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = ledger.filter(l => l.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
  const balance = totalIncome - totalExpense;

  return (
    <div className="space-y-6 md:space-y-8">
      <header className="border-b border-[#262626] pb-4 md:pb-6">
        <h2 className="text-2xl md:text-3xl font-mono font-bold tracking-tight text-white">TREASURY</h2>
        <p className="text-[#A3A3A3] text-xs md:text-sm mt-1">Financial Ledger & Resource Allocation</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 md:p-6">
          <div className="text-[10px] md:text-xs font-mono text-[#A3A3A3] mb-1 md:mb-2">NET BALANCE</div>
          <div className={cn("text-2xl md:text-4xl font-mono", balance >= 0 ? "text-white" : "text-red-500")}>
            ${balance.toFixed(2)}
          </div>
        </div>
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 md:p-6">
          <div className="text-[10px] md:text-xs font-mono text-[#A3A3A3] mb-1 md:mb-2 flex items-center">
            <ArrowUpRight className="w-3 h-3 md:w-4 md:h-4 mr-1 text-green-500" /> TOTAL INFLOW
          </div>
          <div className="text-xl md:text-2xl font-mono text-green-500">
            ${totalIncome.toFixed(2)}
          </div>
        </div>
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 md:p-6">
          <div className="text-[10px] md:text-xs font-mono text-[#A3A3A3] mb-1 md:mb-2 flex items-center">
            <ArrowDownRight className="w-3 h-3 md:w-4 md:h-4 mr-1 text-red-500" /> TOTAL OUTFLOW
          </div>
          <div className="text-xl md:text-2xl font-mono text-red-500">
            ${totalExpense.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 space-y-6">
          
          {/* Charts Section */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 md:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h3 className="text-sm md:text-base font-mono text-white flex items-center">
                {chartType === 'pie' ? <PieChartIcon className="w-4 h-4 mr-2" style={{ color: themeColor }} /> : <BarChart3 className="w-4 h-4 mr-2" style={{ color: themeColor }} />}
                {chartType === 'pie' ? 'EXPENSES BY CATEGORY' : chartType === 'bar' ? '7-DAY CASH FLOW' : '30-DAY BALANCE'}
              </h3>
              <div className="flex flex-wrap bg-[#0A0A0A] border border-[#262626] rounded-md p-1">
                <button
                  onClick={() => setChartType('pie')}
                  className={cn("px-3 py-1 text-xs font-mono rounded transition-colors", chartType === 'pie' ? "bg-[#262626] text-white" : "text-[#A3A3A3] hover:text-white")}
                >
                  PIE
                </button>
                <button
                  onClick={() => setChartType('bar')}
                  className={cn("px-3 py-1 text-xs font-mono rounded transition-colors", chartType === 'bar' ? "bg-[#262626] text-white" : "text-[#A3A3A3] hover:text-white")}
                >
                  BAR
                </button>
                <button
                  onClick={() => setChartType('line')}
                  className={cn("px-3 py-1 text-xs font-mono rounded transition-colors", chartType === 'line' ? "bg-[#262626] text-white" : "text-[#A3A3A3] hover:text-white")}
                >
                  LINE
                </button>
              </div>
            </div>
            
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'pie' ? (
                  <PieChart>
                    <Pie
                      data={chartData.pie}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.pie.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value: number) => `$${value.toFixed(2)}`}
                      contentStyle={{ backgroundColor: '#141414', borderColor: '#262626', color: '#fff', fontFamily: 'monospace', fontSize: '12px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Legend wrapperStyle={{ fontFamily: 'monospace', fontSize: '10px', color: '#A3A3A3' }} />
                  </PieChart>
                ) : chartType === 'bar' ? (
                  <BarChart data={chartData.bar} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                    <XAxis dataKey="date" stroke="#A3A3A3" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#A3A3A3" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                    <RechartsTooltip 
                      formatter={(value: number) => `$${value.toFixed(2)}`}
                      contentStyle={{ backgroundColor: '#141414', borderColor: '#262626', color: '#fff', fontFamily: 'monospace', fontSize: '12px' }}
                      cursor={{ fill: '#262626', opacity: 0.4 }}
                    />
                    <Legend wrapperStyle={{ fontFamily: 'monospace', fontSize: '10px' }} />
                    <Bar dataKey="Income" fill="#22c55e" radius={[2, 2, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="Expense" fill="#ef4444" radius={[2, 2, 0, 0]} maxBarSize={40} />
                  </BarChart>
                ) : (
                  <LineChart data={chartData.line} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                    <XAxis dataKey="date" stroke="#A3A3A3" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#A3A3A3" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                    <RechartsTooltip 
                      formatter={(value: number) => `$${value.toFixed(2)}`}
                      contentStyle={{ backgroundColor: '#141414', borderColor: '#262626', color: '#fff', fontFamily: 'monospace', fontSize: '12px' }}
                    />
                    <Line type="monotone" dataKey="Balance" stroke={themeColor} strokeWidth={2} dot={false} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          <h3 className="text-lg md:text-xl font-mono text-white flex items-center mt-8">
            <Wallet className="w-5 h-5 mr-2" style={{ color: themeColor }} />
            TRANSACTION LOG
          </h3>
          
          <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden">
            {ledger.length > 0 ? (
              <div className="divide-y divide-[#262626]">
                {ledger.map(entry => (
                  <div key={entry.id} className="p-3 md:p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-[#1A1A1A] transition-colors gap-3 sm:gap-0">
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className={cn(
                        "w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center border flex-shrink-0",
                        entry.type === 'income' ? "bg-green-950/30 border-green-900/50 text-green-500" : "bg-red-950/30 border-red-900/50 text-red-500"
                      )}>
                        {entry.type === 'income' ? <ArrowUpRight className="w-4 h-4 md:w-5 md:h-5" /> : <ArrowDownRight className="w-4 h-4 md:w-5 md:h-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-mono text-white text-xs md:text-sm truncate">{entry.description}</h4>
                        <div className="text-[10px] md:text-xs font-mono text-[#A3A3A3] mt-1 flex flex-wrap items-center gap-1 md:gap-2">
                          <span>{entry.date}</span>
                          {entry.category && (
                            <>
                              <span className="hidden sm:inline">•</span>
                              <span className="bg-[#262626] px-1.5 py-0.5 rounded uppercase truncate max-w-[100px] sm:max-w-none">{entry.category}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pl-11 sm:pl-0">
                      <span className={cn(
                        "font-mono font-bold text-sm md:text-base",
                        entry.type === 'income' ? "text-green-500" : "text-white"
                      )}>
                        {entry.type === 'income' ? '+' : '-'}${entry.amount.toFixed(2)}
                      </span>
                      <button onClick={() => deleteEntry(entry)} className="text-[#A3A3A3] hover:text-red-500 transition-colors p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-[#A3A3A3] font-mono text-sm">
                No transactions recorded.
              </div>
            )}
          </div>
        </div>

        <div className="order-first lg:order-last mb-6 lg:mb-0">
          <form onSubmit={handleAddEntry} className="bg-[#141414] border border-[#262626] rounded-xl p-4 md:p-6 sticky top-8">
            <h4 className="text-sm font-mono text-white mb-4">LOG TRANSACTION</h4>
            <div className="space-y-4">
              <div className="flex bg-[#0A0A0A] border border-[#262626] rounded-md p-1">
                <button
                  type="button"
                  onClick={() => handleTypeChange('expense')}
                  className={cn(
                    "flex-1 py-2 text-xs font-mono rounded transition-colors",
                    type === 'expense' ? "bg-red-950/50 text-red-400 border border-red-900/50" : "text-[#A3A3A3] hover:text-white"
                  )}
                >
                  EXPENSE
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange('income')}
                  className={cn(
                    "flex-1 py-2 text-xs font-mono rounded transition-colors",
                    type === 'income' ? "bg-green-950/50 text-green-400 border border-green-900/50" : "text-[#A3A3A3] hover:text-white"
                  )}
                >
                  INCOME
                </button>
              </div>

              <div>
                <label className="block text-[10px] md:text-xs font-mono text-[#A3A3A3] mb-1">CATEGORY</label>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-3 md:px-4 py-2 text-white font-mono text-xs md:text-sm focus:outline-none focus:ring-1 transition-colors"
                  style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
                >
                  {(type === 'income' ? incomeCategories : expenseCategories).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] md:text-xs font-mono text-[#A3A3A3] mb-1">AMOUNT ($)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-3 md:px-4 py-2 text-white font-mono text-xs md:text-sm focus:outline-none focus:ring-1 transition-colors"
                  style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <label className="block text-[10px] md:text-xs font-mono text-[#A3A3A3] mb-1">DESCRIPTION</label>
                <input 
                  type="text" 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-3 md:px-4 py-2 text-white font-mono text-xs md:text-sm focus:outline-none focus:ring-1 transition-colors"
                  style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
                  placeholder="e.g., Groceries"
                />
              </div>

              <div>
                <label className="block text-[10px] md:text-xs font-mono text-[#A3A3A3] mb-1">DATE</label>
                <input 
                  type="date" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-3 md:px-4 py-2 text-white font-mono text-xs md:text-sm focus:outline-none focus:ring-1 transition-colors"
                  style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
                />
              </div>
              
              <button type="submit" className="w-full border px-4 py-2 md:py-3 rounded-md font-mono text-xs md:text-sm transition-colors flex items-center justify-center mt-4" style={{ color: themeColor, borderColor: `${themeColor}80`, backgroundColor: `${themeColor}10` }}>
                <Plus className="w-4 h-4 mr-2" /> ADD RECORD
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
