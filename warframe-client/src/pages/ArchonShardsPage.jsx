// ArchonShardsPage.jsx
import { useState, useEffect } from 'react';
import { wfUser } from '../lib/supabase';

const SHARD_CONFIG = [
  { type: 'crimson', label: 'Crimson', color: '#D63A3A' },
  { type: 'amber',   label: 'Amber',   color: '#E8B84B' },
  { type: 'azure',   label: 'Azure',   color: '#4A90D9' },
  { type: 'emerald', label: 'Emerald', color: '#4CAF50' },
  { type: 'topaz',   label: 'Topaz',   color: '#E08A3C' },
  { type: 'violet',  label: 'Violet',  color: '#9B59B6' },
];

export default function ArchonShardsPage () {
  const [inventory, setInventory] = useState({}); // { crimson: { base: 0, tau: 0 }, ... }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInventory();
  }, []);

  async function fetchInventory() {
    const { data, error } = await wfUser
      .from('archon_shard_inventory')
      .select('*');

    if (error) {
      console.error('Failed to fetch shard inventory:', error);
      setLoading(false);
      return;
    }

    const grouped = {};
    SHARD_CONFIG.forEach(({ type }) => {
      grouped[type] = { base: 0, tau: 0 };
    });

    data.forEach(row => {
      if (!grouped[row.shard_type]) grouped[row.shard_type] = { base: 0, tau: 0 };
      grouped[row.shard_type][row.is_tauforged ? 'tau' : 'base'] = row.quantity;
    });

    setInventory(grouped);
    setLoading(false);
  }

  async function updateCount(shardType, isTauforged, delta) {
    const key = isTauforged ? 'tau' : 'base';
    const current = inventory[shardType]?.[key] ?? 0;
    const newValue = Math.max(0, current + delta);

    // optimistic update
    setInventory(prev => ({
      ...prev,
      [shardType]: { ...prev[shardType], [key]: newValue }
    }));

    const { error } = await wfUser
      .from('archon_shard_inventory')
      .update({ quantity: newValue, updated_at: new Date().toISOString() })
      .eq('shard_type', shardType)
      .eq('is_tauforged', isTauforged);

    if (error) {
      console.error('Update failed:', error);
      fetchInventory(); // revert via re-fetch
      return;
    }

    // verify write (Supabase silent-failure pattern)
    const { data: confirm, error: confirmError } = await wfUser
      .from('archon_shard_inventory')
      .select('quantity')
      .eq('shard_type', shardType)
      .eq('is_tauforged', isTauforged)
      .single();

    if (confirmError || confirm.quantity !== newValue) {
      console.error('Write verification failed, re-syncing');
      fetchInventory();
    }
  }

  if (loading) {
    return <div className="text-warm-gray p-6">Loading shard inventory...</div>;
  }

  const totalShards = Object.values(inventory).reduce(
    (sum, { base, tau }) => sum + base + tau, 0
  );

  return (
    <div className="min-h-screen bg-[#1C1608] p-6">
      <h1 className="text-2xl font-bold text-yellow-500 mb-2">Archon Shard Inventory</h1>
      <p className="text-gray-300 mb-6">{totalShards} shards owned across all colors</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SHARD_CONFIG.map(({ type, label, color }) => (
          <div
            key={type}
            className="rounded-lg border border-gray-700 bg-[#2A2218] p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <span
                className="w-4 h-4 rounded-full inline-block"
                style={{ backgroundColor: color }}
              />
              <h2 className="text-lg font-semibold text-yellow-500">{label}</h2>
            </div>

            {/* Base row */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-300">Base</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => updateCount(type, false, -1)}
                  className="w-7 h-7 rounded bg-gray-700 text-white hover:bg-gray-600"
                >−</button>
                <span className="text-white w-6 text-center">
                  {inventory[type]?.base ?? 0}
                </span>
                <button
                  onClick={() => updateCount(type, false, 1)}
                  className="w-7 h-7 rounded bg-gray-700 text-white hover:bg-gray-600"
                >+</button>
              </div>
            </div>

            {/* Tauforged row */}
            <div className="flex items-center justify-between rounded p-2 border border-yellow-600/50 bg-yellow-900/10">
              <span className="text-yellow-400 font-medium">Tauforged</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => updateCount(type, true, -1)}
                  className="w-7 h-7 rounded bg-gray-700 text-white hover:bg-gray-600"
                >−</button>
                <span className="text-yellow-300 w-6 text-center font-semibold">
                  {inventory[type]?.tau ?? 0}
                </span>
                <button
                  onClick={() => updateCount(type, true, 1)}
                  className="w-7 h-7 rounded bg-gray-700 text-white hover:bg-gray-600"
                >+</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}