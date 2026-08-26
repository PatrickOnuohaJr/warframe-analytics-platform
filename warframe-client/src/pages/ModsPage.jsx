import { useState, useEffect, useMemo } from 'react';
import { wfBase, wfUser } from '../lib/supabase';
import Panel from '../components/ui/Panel';
import Button from '../components/ui/Button';
import ModalShell from '../components/ui/ModalShell';
import AddModToInventoryModal from '../components/AddModToInventoryModal';
import { COLOR } from '../constants/theme';
import { isAugment, augmentTarget, effectTextAtRank, weaponTag, statGroups, STAT_GROUPS } from '../utils/modMeta';
import PolaritySymbol from '../components/PolaritySymbol';

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
  const [augmentOnly, setAugmentOnly] = useState(false);
  const [statFilter, setStatFilter] = useState(null);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMod, setSelectedMod] = useState(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelected, setBulkSelected] = useState(new Set());
  const [bulkRankInput, setBulkRankInput] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);

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
      .select('mod_id, name, category, polarity, base_drain, max_rank, rarity, is_aura, is_exilus, raw_json')
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
    const q = search.trim().toLowerCase();
    return ownedMods.filter(m => {
      if (categoryFilter !== 'All' && m.category !== categoryFilter) return false;
      if (auraOnly && !m.is_aura) return false;
      if (exilusOnly && !m.is_exilus) return false;
      if (augmentOnly && !isAugment(m)) return false;
      if (statFilter && !statGroups(m).includes(statFilter)) return false;
      if (q && !m.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [ownedMods, categoryFilter, auraOnly, exilusOnly, augmentOnly, statFilter, search]);

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

  function handleRankChange(mod, nextRank) {
    const current = owned.get(mod.mod_id);
    if (!current || current.owned_rank === nextRank) return;

    // Optimistic: update locally first so the slider and effect text move
    // together, then persist. Slider steps are small integers (max_rank
    // rarely exceeds 10), so a write per step is cheap.
    setOwned(prev => {
      const next = new Map(prev);
      next.set(mod.mod_id, { ...current, owned_rank: nextRank });
      return next;
    });

    wfUser
      .from('mod_inventory')
      .update({ owned_rank: nextRank })
      .eq('mod_id', mod.mod_id)
      .then(({ error: updateError }) => {
        if (updateError) console.error('Failed to update mod rank:', updateError);
      });
  }

  function toggleBulkMode() {
    setBulkMode(v => !v);
    setBulkSelected(new Set());
    setBulkRankInput('');
  }

  function toggleBulkSelected(modId) {
    setBulkSelected(prev => {
      const next = new Set(prev);
      if (next.has(modId)) next.delete(modId);
      else next.add(modId);
      return next;
    });
  }

  function selectAllVisibleForBulk() {
    setBulkSelected(new Set(visibleMods.map(m => m.mod_id)));
  }

  // Shared by both bulk actions -- computeNextRank decides each mod's new
  // rank from its own max_rank, since a mixed selection (augments cap at
  // 3, most other mods cap at 10) can't share one flat target number.
  async function applyBulkRank(computeNextRank) {
    const targets = catalog.filter(m => bulkSelected.has(m.mod_id));
    if (targets.length === 0) return;

    setBulkSaving(true);

    const updates = targets.map(mod => {
      const cap = mod.max_rank ?? 0;
      const nextRank = Math.max(0, Math.min(cap, computeNextRank(mod)));
      return { mod, nextRank };
    });

    setOwned(prev => {
      const next = new Map(prev);
      updates.forEach(({ mod, nextRank }) => {
        const current = next.get(mod.mod_id);
        if (current) next.set(mod.mod_id, { ...current, owned_rank: nextRank });
      });
      return next;
    });

    await Promise.all(
      updates.map(({ mod, nextRank }) =>
        wfUser.from('mod_inventory').update({ owned_rank: nextRank }).eq('mod_id', mod.mod_id)
      )
    );

    setBulkSaving(false);
  }

  function handleBulkMax() {
    applyBulkRank(mod => mod.max_rank ?? 0);
  }

  function handleBulkSetRank() {
    const n = Number(bulkRankInput);
    if (!Number.isFinite(n)) return;
    applyBulkRank(() => n);
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

        <div className="flex gap-2">
          <Button
            variant={bulkMode ? 'primary' : 'ghost'}
            color={COLOR.gold}
            onClick={toggleBulkMode}
          >
            {bulkMode ? 'Exit Bulk Edit' : 'Bulk Edit'}
          </Button>
          <Button variant="primary" color={COLOR.gold} onClick={() => setShowAddModal(true)}>
            + Add Mod
          </Button>
        </div>
      </div>

      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search your mod inventory..."
        className="w-full rounded-lg border px-3 py-2 text-sm outline-none mb-4"
        style={{ background: COLOR.surface2, border: `1px solid ${COLOR.border}`, color: COLOR.ink }}
      />

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
        <button
          onClick={() => setAugmentOnly(v => !v)}
          className="text-[10px] uppercase tracking-widest px-2 py-1 rounded"
          style={{
            background: augmentOnly ? `${COLOR.gold}22` : 'transparent',
            color: augmentOnly ? COLOR.gold : COLOR.mutedInk,
            border: `1px solid ${augmentOnly ? COLOR.gold : COLOR.border}`,
          }}
        >
          Augment Only
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {STAT_GROUPS.map(group => (
          <button
            key={group}
            onClick={() => setStatFilter(statFilter === group ? null : group)}
            className="text-[9px] uppercase tracking-widest px-2 py-1 rounded"
            style={{
              background: statFilter === group ? `${COLOR.gold}22` : 'transparent',
              color: statFilter === group ? COLOR.gold : COLOR.mutedInk,
              border: `1px solid ${statFilter === group ? COLOR.gold : COLOR.border}`,
            }}
          >
            {group}
          </button>
        ))}
      </div>

      {bulkMode && (
        <Panel accent={COLOR.gold} className="mb-4">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
            <p className="text-xs" style={{ color: COLOR.mutedInk }}>
              {bulkSelected.size} selected {bulkMode ? `of ${visibleMods.length} shown` : ''}
            </p>
            <div className="flex gap-3">
              <button onClick={selectAllVisibleForBulk} className="text-xs" style={{ color: COLOR.gold }}>
                Select All Shown
              </button>
              <button onClick={() => setBulkSelected(new Set())} className="text-xs" style={{ color: COLOR.mutedInk }}>
                Clear Selection
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="primary"
              color={COLOR.gold}
              size="sm"
              disabled={bulkSelected.size === 0 || bulkSaving}
              onClick={handleBulkMax}
            >
              Max All Selected
            </Button>

            <div className="flex items-center gap-2">
              <label className="text-xs" style={{ color: COLOR.mutedInk }}>Set rank to</label>
              <input
                type="number"
                min="0"
                value={bulkRankInput}
                onChange={e => setBulkRankInput(e.target.value)}
                placeholder="e.g. 2"
                className="w-16 rounded-lg border px-2 py-1 text-sm outline-none"
                style={{ background: COLOR.surface2, border: `1px solid ${COLOR.border}`, color: COLOR.ink }}
              />
              <Button
                variant="ghost"
                size="sm"
                disabled={bulkSelected.size === 0 || bulkRankInput === '' || bulkSaving}
                onClick={handleBulkSetRank}
              >
                Apply
              </Button>
            </div>

            {bulkSaving && <span className="text-xs" style={{ color: COLOR.mutedInk }}>Saving...</span>}
          </div>
        </Panel>
      )}

      {ownedMods.length === 0 && (
        <p style={{ color: COLOR.mutedInk }}>No mods in your inventory yet. Add one to get started.</p>
      )}

      {ownedMods.length > 0 && visibleMods.length === 0 && (
        <p style={{ color: COLOR.mutedInk }}>No owned mods match this filter.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleMods.map(mod => {
          const inv = owned.get(mod.mod_id);
          const rank = inv?.owned_rank ?? 0;
          const cap = mod.max_rank ?? 0;

          const augment = isAugment(mod);
          const effect = effectTextAtRank(mod, rank);
          const weapon = weaponTag(mod);
          const checked = bulkSelected.has(mod.mod_id);

          return (
            <Panel
              key={mod.mod_id}
              accent={COLOR.gold}
              interactive
              onClick={() => bulkMode ? toggleBulkSelected(mod.mod_id) : setSelectedMod(mod)}
              style={bulkMode && checked ? { background: `${COLOR.gold}14` } : {}}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start gap-2">
                  {bulkMode && (
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleBulkSelected(mod.mod_id)}
                      onClick={e => e.stopPropagation()}
                      className="mt-1"
                    />
                  )}
                  <div>
                  <div className="flex items-center gap-1.5">
                    <PolaritySymbol polarity={mod.polarity} size={14} color={COLOR.mutedInk} />
                    <p className="font-bold" style={{ color: COLOR.ink }}>{mod.name}</p>
                  </div>
                  <p className="text-xs" style={{ color: COLOR.mutedInk }}>
                    {mod.category}
                    {weapon ? ` · ${weapon}` : ''}
                    {' · '}{mod.rarity ?? '—'}
                    {mod.is_aura ? ' · Aura' : ''}
                    {mod.is_exilus ? ' · Exilus' : ''}
                  </p>
                  {augment && (
                    <p className="text-xs mt-1" style={{ color: COLOR.gold }}>
                      ◆ {augmentTarget(mod) || 'Augment'} Augment
                    </p>
                  )}
                  </div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); handleRemove(mod); }}
                  className="text-xs"
                  style={{ color: '#F87171' }}
                >
                  Remove
                </button>
              </div>

              <div className="mt-2" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs" style={{ color: COLOR.mutedInk }}>Rank</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold" style={{ color: COLOR.gold }}>{rank} / {cap}</span>
                    <button
                      onClick={() => handleRankChange(mod, cap)}
                      disabled={cap === 0 || rank === cap}
                      className="text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded disabled:opacity-30"
                      style={{ background: `${COLOR.gold}18`, border: `1px solid ${COLOR.gold}55`, color: COLOR.gold }}
                    >
                      Max
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max={cap}
                  step="1"
                  value={rank}
                  onChange={e => handleRankChange(mod, Number(e.target.value))}
                  disabled={cap === 0}
                  className="w-full"
                  style={{ accentColor: COLOR.gold }}
                />
              </div>

              {effect && (
                <p className="text-xs mt-2" style={{ color: COLOR.ink }}>{effect}</p>
              )}
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

      {selectedMod && (() => {
        const inv = owned.get(selectedMod.mod_id);
        const rank = inv?.owned_rank ?? 0;
        const cap = selectedMod.max_rank ?? 0;
        const augment = isAugment(selectedMod);
        const effect = effectTextAtRank(selectedMod, rank);
        const weapon = weaponTag(selectedMod);

        return (
          <ModalShell onClose={() => setSelectedMod(null)} accent={COLOR.gold} maxWidth="max-w-lg">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <PolaritySymbol polarity={selectedMod.polarity} size={20} color={COLOR.gold} />
                  <h2 className="text-xl font-bold" style={{ color: COLOR.gold }}>{selectedMod.name}</h2>
                </div>
                <p className="text-xs" style={{ color: COLOR.mutedInk }}>
                  {selectedMod.category}
                  {weapon ? ` · ${weapon}` : ''}
                  {' · '}{selectedMod.rarity ?? '—'} · Rank {rank}/{cap}
                </p>
              </div>
              <button onClick={() => setSelectedMod(null)} className="text-xl leading-none" style={{ color: COLOR.mutedInk }}>×</button>
            </div>

            {augment && (
              <p className="text-sm font-bold mb-3" style={{ color: COLOR.gold }}>
                ◆ {augmentTarget(selectedMod) || 'Augment'} Augment
              </p>
            )}

            <p className="text-sm" style={{ color: COLOR.ink }}>
              {effect || 'No effect text available for this mod.'}
            </p>
          </ModalShell>
        );
      })()}
    </div>
  );
}
