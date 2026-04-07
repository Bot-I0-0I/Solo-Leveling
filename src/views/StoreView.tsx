import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { cn, getRank } from '../lib/utils';
import { Coins, Package, Lock, Plus, ShoppingCart, Trash2 } from 'lucide-react';

export function StoreView() {
  const userStats = useLiveQuery(() => db.userStats.get(1));
  const shopItems = useLiveQuery(() => db.shopItems.toArray());
  const inventory = useLiveQuery(() => db.inventory.toArray());

  const [newItemName, setNewItemName] = useState('');
  const [newItemCost, setNewItemCost] = useState('');
  const [newItemAttr, setNewItemAttr] = useState('STR');
  const [newItemBoost, setNewItemBoost] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const isPenalty = false; // Penalty system removed
  const level = Math.floor((userStats?.xp || 0) / 1000) + 1;
  const rankColor = getRank(level).color;
  const themeColor = userStats?.selectedColor || rankColor;

  const handleBuy = async (item: any) => {
    if (!userStats || userStats.credits < item.cost || isPenalty) return;

    await db.userStats.update(1, { credits: userStats.credits - item.cost });
    await db.shopItems.update(item.id, { purchased: true });
    await db.inventory.add({
      name: item.name,
      type: 'item',
      attributeBoosts: item.attributeBoosts,
      equipped: false
    });
    
    // Log expense to ledger
    await db.ledger.add({
      date: new Date().toISOString().split('T')[0],
      amount: item.cost,
      type: 'expense',
      category: 'Shop Purchase',
      description: `Purchased item: ${item.name}`
    } as any);
  };

  const handleEquip = async (id: number, currentEquipped: boolean) => {
    await db.inventory.update(id, { equipped: !currentEquipped });
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !newItemCost || !newItemBoost) return;

    await db.shopItems.add({
      name: newItemName,
      cost: parseInt(newItemCost, 10),
      attributeBoosts: { [newItemAttr]: parseInt(newItemBoost, 10) },
      purchased: false
    });

    setNewItemName('');
    setNewItemCost('');
    setNewItemBoost('');
    setIsAdding(false);
  };

  const handleDeleteShopItem = async (id: number) => {
    await db.shopItems.delete(id);
  };

  const handleDeleteInventoryItem = async (id: number) => {
    await db.inventory.delete(id);
  };

  if (!userStats || !shopItems || !inventory) return <div>Loading Economy...</div>;

  const availableItems = shopItems.filter(i => !i.purchased);

  return (
    <div className="space-y-8">
      <header className="border-b border-[#262626] pb-6 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-mono font-bold tracking-tight text-white">SYSTEM ECONOMY</h2>
          <p className="text-[#A3A3A3] text-sm mt-1">Purchase lifestyle upgrades and manage inventory.</p>
        </div>
        <div className="text-right">
          <div className="text-xs font-mono text-[#A3A3A3] mb-1">AVAILABLE CREDITS</div>
          <div className="text-3xl font-mono text-[#FFD700] flex items-center justify-end">
            <Coins className="w-6 h-6 mr-2" />
            {userStats.credits}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Store */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-mono text-white flex items-center">
              <ShoppingCart className="w-5 h-5 mr-2" style={{ color: themeColor }} />
              REWARD SHOP
            </h3>
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="text-xs font-mono border px-3 py-1 rounded transition-colors flex items-center"
              style={{ color: themeColor, borderColor: `${themeColor}80`, backgroundColor: `${themeColor}10` }}
            >
              <Plus className="w-3 h-3 mr-1" /> ADD ITEM
            </button>
          </div>

          {isAdding && (
            <form onSubmit={handleAddItem} className="bg-[#141414] border rounded-xl p-4 space-y-4 mb-4" style={{ borderColor: `${themeColor}50` }}>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-mono text-[#A3A3A3] mb-1">ITEM NAME</label>
                  <input 
                    type="text" 
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-3 py-2 text-white font-mono text-sm focus:outline-none focus:ring-1 transition-colors"
                    style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
                    placeholder="e.g. Energy Drink"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-[#A3A3A3] mb-1">COST (CREDITS)</label>
                  <input 
                    type="number" 
                    value={newItemCost}
                    onChange={(e) => setNewItemCost(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-3 py-2 text-white font-mono text-sm focus:outline-none focus:ring-1 transition-colors"
                    style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
                    placeholder="100"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-[#A3A3A3] mb-1">ATTRIBUTE</label>
                  <select 
                    value={newItemAttr}
                    onChange={(e) => setNewItemAttr(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-3 py-2 text-white font-mono text-sm focus:outline-none focus:ring-1 transition-colors"
                    style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
                  >
                    <option value="STR">STR</option>
                    <option value="AGI">AGI</option>
                    <option value="INT">INT</option>
                    <option value="SEN">SEN</option>
                    <option value="END">END</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-mono text-[#A3A3A3] mb-1">BOOST AMOUNT</label>
                  <input 
                    type="number" 
                    value={newItemBoost}
                    onChange={(e) => setNewItemBoost(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-3 py-2 text-white font-mono text-sm focus:outline-none focus:ring-1 transition-colors"
                    style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
                    placeholder="5"
                    min="1"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button 
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 text-xs font-mono text-[#A3A3A3] hover:text-white transition-colors"
                >
                  CANCEL
                </button>
                <button 
                  type="submit"
                  className="border px-4 py-2 rounded-md font-mono text-xs transition-colors"
                  style={{ color: themeColor, borderColor: `${themeColor}80`, backgroundColor: `${themeColor}30` }}
                >
                  CREATE ITEM
                </button>
              </div>
            </form>
          )}

          <div className="grid gap-4">
            {availableItems.map(item => (
              <div key={item.id} className="bg-[#141414] border border-[#262626] rounded-xl p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 hover:border-[#333] transition-colors group">
                <div className="w-full sm:w-auto">
                  <h4 className="font-mono text-white truncate">{item.name}</h4>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {Object.entries(item.attributeBoosts).map(([attr, val]) => (
                      <span key={attr} className="text-xs font-mono text-[#A3A3A3] bg-[#0A0A0A] px-2 py-0.5 rounded border border-[#262626]">
                        +{val as number} {attr}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button 
                    onClick={() => handleDeleteShopItem(item.id!)}
                    className="text-[#A3A3A3] hover:text-red-500 p-2 rounded-md transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                    title="Delete Item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleBuy(item)}
                    disabled={userStats.credits < item.cost}
                    className="bg-[#262626] hover:bg-[#333] disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md font-mono text-sm transition-colors flex items-center"
                  >
                    <Coins className="w-4 h-4 mr-2 text-[#FFD700]" />
                    {item.cost}
                  </button>
                </div>
              </div>
            ))}
            {availableItems.length === 0 && (
              <div className="text-center py-12 border border-dashed border-[#262626] rounded-xl text-[#A3A3A3] font-mono text-sm">
                Shop inventory depleted.
              </div>
            )}
          </div>
        </div>

        {/* Inventory */}
        <div className="space-y-6">
          <h3 className="text-xl font-mono text-white flex items-center">
            <Package className="w-5 h-5 mr-2" style={{ color: themeColor }} />
            INVENTORY
          </h3>
          <div className="grid gap-4">
            {inventory.map(item => (
              <div key={item.id} className={cn(
                "bg-[#141414] border rounded-xl p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 transition-colors group",
                item.equipped ? "bg-[#141414]" : "border-[#262626]"
              )} style={item.equipped ? { borderColor: `${themeColor}50`, backgroundColor: `${themeColor}05` } : {}}>
                <div className="w-full sm:w-auto">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-mono text-white truncate">{item.name}</h4>
                    {item.type === 'shadow' && (
                      <span className="text-[10px] font-mono text-purple-400 border border-purple-900 px-1 rounded">SHADOW</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {Object.entries(item.attributeBoosts).map(([attr, val]) => (
                      <span key={attr} className="text-xs font-mono text-[#A3A3A3] bg-[#0A0A0A] px-2 py-0.5 rounded border border-[#262626]">
                        +{val as number} {attr}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button 
                    onClick={() => handleDeleteInventoryItem(item.id!)}
                    className="text-[#A3A3A3] hover:text-red-500 p-2 rounded-md transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                    title="Delete Item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleEquip(item.id!, item.equipped)}
                    className={cn(
                      "px-4 py-2 rounded-md font-mono text-sm transition-colors border",
                      !item.equipped && "bg-[#262626] text-white border-transparent hover:bg-[#333]"
                    )}
                    style={item.equipped ? { color: themeColor, borderColor: `${themeColor}50`, backgroundColor: `${themeColor}20` } : {}}
                  >
                    {item.equipped ? 'EQUIPPED' : 'EQUIP'}
                  </button>
                </div>
              </div>
            ))}
            {inventory.length === 0 && (
              <div className="text-center py-12 border border-dashed border-[#262626] rounded-xl text-[#A3A3A3] font-mono text-sm">
                Inventory empty.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple icon component since ShoppingCart is imported as ShoppingCartIcon to avoid conflict
function ShoppingCartIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  );
}
