import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { cn } from '../lib/utils';
import { Wallet, ArrowUpRight, ArrowDownRight, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export function LedgerView() {
  const ledger = useLiveQuery(() => db.ledger.orderBy('date').reverse().toArray());
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;

    await db.ledger.add({
      amount: parseFloat(amount),
      description,
      type,
      date
    });

    setAmount('');
    setDescription('');
  };

  const deleteEntry = async (id: number) => {
    await db.ledger.delete(id);
  };

  if (!ledger) return <div className="animate-pulse">Loading Treasury...</div>;

  const totalIncome = ledger.filter(l => l.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = ledger.filter(l => l.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
  const balance = totalIncome - totalExpense;

  return (
    <div className="space-y-8">
      <header className="border-b border-[#262626] pb-6">
        <h2 className="text-3xl font-mono font-bold tracking-tight text-white">TREASURY</h2>
        <p className="text-[#A3A3A3] text-sm mt-1">Financial Ledger & Resource Allocation</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
          <div className="text-xs font-mono text-[#A3A3A3] mb-2">NET BALANCE</div>
          <div className={cn("text-4xl font-mono", balance >= 0 ? "text-white" : "text-red-500")}>
            ${balance.toFixed(2)}
          </div>
        </div>
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
          <div className="text-xs font-mono text-[#A3A3A3] mb-2 flex items-center">
            <ArrowUpRight className="w-4 h-4 mr-1 text-green-500" /> TOTAL INFLOW
          </div>
          <div className="text-2xl font-mono text-green-500">
            ${totalIncome.toFixed(2)}
          </div>
        </div>
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
          <div className="text-xs font-mono text-[#A3A3A3] mb-2 flex items-center">
            <ArrowDownRight className="w-4 h-4 mr-1 text-red-500" /> TOTAL OUTFLOW
          </div>
          <div className="text-2xl font-mono text-red-500">
            ${totalExpense.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-mono text-white flex items-center">
            <Wallet className="w-5 h-5 mr-2 text-[#00F0FF]" />
            TRANSACTION LOG
          </h3>
          
          <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden">
            {ledger.length > 0 ? (
              <div className="divide-y divide-[#262626]">
                {ledger.map(entry => (
                  <div key={entry.id} className="p-4 flex items-center justify-between hover:bg-[#1A1A1A] transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center border",
                        entry.type === 'income' ? "bg-green-950/30 border-green-900/50 text-green-500" : "bg-red-950/30 border-red-900/50 text-red-500"
                      )}>
                        {entry.type === 'income' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className="font-mono text-white text-sm">{entry.description}</h4>
                        <div className="text-xs font-mono text-[#A3A3A3] mt-1">{entry.date}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={cn(
                        "font-mono font-bold",
                        entry.type === 'income' ? "text-green-500" : "text-white"
                      )}>
                        {entry.type === 'income' ? '+' : '-'}${entry.amount.toFixed(2)}
                      </span>
                      <button onClick={() => deleteEntry(entry.id!)} className="text-[#A3A3A3] hover:text-red-500 transition-colors">
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

        <div>
          <form onSubmit={handleAddEntry} className="bg-[#141414] border border-[#262626] rounded-xl p-6 sticky top-8">
            <h4 className="text-sm font-mono text-white mb-4">LOG TRANSACTION</h4>
            <div className="space-y-4">
              <div className="flex bg-[#0A0A0A] border border-[#262626] rounded-md p-1">
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={cn(
                    "flex-1 py-2 text-xs font-mono rounded transition-colors",
                    type === 'expense' ? "bg-red-950/50 text-red-400 border border-red-900/50" : "text-[#A3A3A3] hover:text-white"
                  )}
                >
                  EXPENSE
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={cn(
                    "flex-1 py-2 text-xs font-mono rounded transition-colors",
                    type === 'income' ? "bg-green-950/50 text-green-400 border border-green-900/50" : "text-[#A3A3A3] hover:text-white"
                  )}
                >
                  INCOME
                </button>
              </div>

              <div>
                <label className="block text-xs font-mono text-[#A3A3A3] mb-1">AMOUNT ($)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-[#00F0FF]"
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <label className="block text-xs font-mono text-[#A3A3A3] mb-1">DESCRIPTION</label>
                <input 
                  type="text" 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-[#00F0FF]"
                  placeholder="e.g., Groceries"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[#A3A3A3] mb-1">DATE</label>
                <input 
                  type="date" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-[#00F0FF]"
                />
              </div>
              
              <button type="submit" className="w-full bg-[#262626] hover:bg-[#333] text-white px-4 py-3 rounded-md font-mono text-sm transition-colors flex items-center justify-center mt-4">
                <Plus className="w-4 h-4 mr-2" /> ADD RECORD
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
