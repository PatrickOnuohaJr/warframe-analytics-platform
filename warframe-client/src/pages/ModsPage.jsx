import { useState, useEffect, useMemo } from 'react';
import { wfBase, wfUser } from '../lib/supabase';
import Panel from '../components/ui/Panel';
import Button from '../components/ui/Button';
import AddModToInventoryModal from '../components/AddModToInventoryModal';
import { COLOR } from '../constants/theme';

// ============================================================================
// ModsPage.jsx (Mods Inventory & DB -- first slice)
// ============================================================================
// Ownership + rank tracking only, same shape as ArmoryPage (D.1): a mod
// exists in wf_user.mod_inventory if you own it, owned_rank tracks how far
// it's fused (0..max_rank). No loadout assignment yet -- the 8-slot
// builder with capacity/drain math is a separate, later slice of this arc.
// ============================================================================

const CATEGORY_FILTERS = ['All', 'Warframe', 'Primary', 'Secondary', 'Melee'];

export default function ModsPage() {
  const [catalog, setCatalog] = useState([]);
  const [owned, setOwned] = useState(new Map()); // mod_id -> { inventory_id, owned_rank }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [auraOnly, setAuraOnly] = useState(false);
  const [exilusOnly, setExilusOnly] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [rankDrafts, setRankDrafts] = useState({}); // mod_id -> string, in-progress edits

  async function loadInventory() {
    setLoading(true);
    setError(null);

    const { data: invRows, error: invError } = await wfUser
      .from('mod_inventory')
      .select('inventory_id, mod_id, owned_rank');

    if (invError) {
      console.error('Failed to load mod inventory:', invError);
      setError('Could not load your mod inventory.');
      setLoading(false);
      return;
    }

    const { data: modRows, error: modsError } = await wfBase
      .from('mods')
      .select('mod_id, name, category, polarity, base_drain, max_rank, rarity, is_aura, is_exilus')
      .order('name', { ascending: true });

    if (modsError) {
      console.error('Failed to load mod catalog:', modsError);
      setError('Could not load the mod catalog.');
      setLoading(false);
      return;
    }

    setCatalog(modRows || []);
    setOwned(new Map((invRows || []).map(r => [r.mod_id, r])));
    setLoading(false);
  }

  useEffect(() => { loadInventory(); }, []);

  const ownedMods = useMemo(
    () => catalog.filter(m => owned.has(m.mod_id)),
    [catalog, owned]
  );

  const visibleMods = useMemo(() => {
    return ownedMods.filter(m => {
      if (categoryFilter !== 'All' && m.category !== categoryFilter) return false;
      if (auraOnly && !m.is_aura) return false;
      if (exilusOnly && !m.is_exilus) return false;
      return true;
    });
  }, [ownedMods, categoryFilter, auraOnly, exilusOnly]);

  async function handleRemove(mod) {
    const confirmed = window.confirm(`Remove ${mod.name} from your inventory?`);
    if (!confirmed) return;

    const { error: deleteError } = await wfUser
      .from('mod_inventory')
      .delete()
      .eq('mod_id', mod.mod_id);

    if (deleteError) {
      console.error('Failed to remove mod:', deleteError);
      return;
    }

    setOwned(prev => {
      const next = new Map(prev);
      next.delete(mod.mod_id);
      return next;
    });
  }

  async function commitRank(mod) {
    const draft = rankDrafts[mod.mod_id];
    if (draft === undefined) return;

    const cap = mod.max_rank ?? 0;
    const nextRank = Math.max(0, Math.min(cap, Number(draft) || 0));
    const current = owned.get(mod.mod_id);

    setRankDrafts(prev => {
      const next = { ...prev };
      delete next[mod.mod_id];
      return next;
    });

    if (!current || current.owned_rank === nextRank) return;

    const { error: updateError } = await wfUser
      .from('mod_inventory')
      .update({ owned_rank: nextRank })
      .eq('mod_id', mod.mod_id);

    if (updateError) {
      console.error('Failed to update mod rank:', updateError);
      return;
    }

    setOwned(prev => {
      const next = new Map(prev);
      next.set(mod.mod_id, { ...current, owned_rank: nextRank });
      return next;
    });
  }

  if (loading) {
    return <p style={{ color: COLOR.mutedInk }}>Loading Mods...</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold uppercase tracking-wide mb-2" style={{ color: COLOR.gold }}>
        Mods
      </h1>
      <p className="text-sm mb-6" style={{ color: COLOR.mutedInk }}>
        Mods you own and their fused rank. Loadout assignment and capacity math come in a later pass.
      </p>

      {error && <p className="text-red-400 mb-4">{error}</p>}

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex gap-2 flex-wrap">
          {CATEGORY_FILTERS.map(c => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className="rounded-xl px-4 py-2 text-[10px] uppercase font-bold tracking-[0.25em] transition-colors"
              style={{
                background: categoryFilter === c ? `${COLOR.gold}18` : COLOR.surface1,
                border: `1px solid ${categoryFilter === c ? `${COLOR.gold}55` : COLOR.border}`,
                color: categoryFilter === c ? COLOR.gold : COLOR.mutedInk,
              }}
            >
              {c}
            </button>
          ))}
        </div>

        <Button variant="primary" color={COLOR.gold} onClick={() => setShowAddModal(true)}>
          + Add Mod
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setAuraOnly(v => !v)}
          className="text-[10px] uppercase tracking-widest px-2 py-1 rounded"
          style={{
            background: auraOnly ? `${COLOR.gold}22` : 'transparent',
            color: auraOnly ? COLOR.gold : COLOR.mutedInk,
            border: `1px solid ${auraOnly ? COLOR.gold : COLOR.border}`,
          }}
        >
          Aura Only
        </button>
        <button
          onClick={() => setExilusOnly(v => !v)}
          className="text-[10px] uppercase tracking-widest px-2 py-1 rounded"
          style={{
            background: exilusOnly ? `${COLOR.gold}22` : 'transparent',
            color: exilusOnly ? COLOR.gold : COLOR.mutedInk,
            border: `1px solid ${exilusOnly ? COLOR.gold : COLOR.border}`,
          }}
        >
          Exilus Only
        </button>
      </div>

      {ownedMods.length === 0 && (
        <p style={{ color: COLOR.mutedInk }}>No mods in your inventory yet. Add one to get started.</p>
      )}

      {ownedMods.length > 0 && visibleMods.length === 0 && (
        <p style={{ color: COLOR.mutedInk }}>No owned mods match this filter.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleMods.map(mod => {
          const inv = owned.get(mod.mod_id);
          const rankValue = rankDrafts[mod.mod_id] ?? String(inv?.owned_rank ?? 0);
          const cap = mod.max_rank ?? 0;

          return (
            <Panel key={mod.mod_id} accent={COLOR.gold}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold" style={{ color: COLOR.ink }}>{mod.name}</p>
                  <p className="text-xs" style={{ color: COLOR.mutedInk }}>
                    {mod.category} · {mod.polarity ?? '—'} · {mod.rarity ?? '—'}
                    {mod.is_aura ? ' · Aura' : ''}
                    {mod.is_exilus ? ' · Exilus' : ''}
                  </p>
                </div>
                <button
                  onClick={() => handleRemove(mod)}
                  className="text-xs"
                  style={{ color: '#F87171' }}
                >
                  Remove
                </button>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <label className="text-xs" style={{ color: COLOR.mutedInk }}>Rank</label>
                <input
                  type="number"
                  min="0"
                  max={cap}
                  value={rankValue}
                  onChange={e => setRankDrafts(prev => ({ ...prev, [mod.mod_id]: e.target.value }))}
                  onBlur={() => commitRank(mod)}
                  className="w-16 rounded-lg border px-2 py-1 text-sm outline-none"
                  style={{ background: COLOR.surface2, border: `1px solid ${COLOR.border}`, color: COLOR.ink }}
                />
                <span className="text-xs" style={{ color: COLOR.mutedInk }}>/ {cap}</span>
              </div>
            </Panel>
          );
        })}
      </div>

      {showAddModal && (
        <AddModToInventoryModal
          catalog={catalog}
          ownedIds={new Set(owned.keys())}
          initialCategory={categoryFilter}
          onClose={() => setShowAddModal(false)}
          onAdded={mods => {
            setOwned(prev => {
              const next = new Map(prev);
              mods.forEach(m => next.set(m.mod_id, { mod_id: m.mod_id, owned_rank: 0 }));
              return next;
            });
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
}
