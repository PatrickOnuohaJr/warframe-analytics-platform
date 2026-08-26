import { useState, useMemo } from 'react';
import { wfUser } from '../lib/supabase';
import ModalShell from './ui/ModalShell';
import { COLOR } from '../constants/theme';

const CATEGORIES = ['All', 'Warframe', 'Primary', 'Secondary', 'Melee'];

// Bulk ownership picker for Mod Inventory -- same pattern as
// AddWeaponToInventoryModal (Armory): browse a category, check off every
// mod you own, commit in one insert. New rows start at owned_rank 0;
// rank is edited from the inventory list after adding.
export default function AddModToInventoryModal({ catalog, ownedIds, initialCategory = 'All', onClose, onAdded }) {
  const [category, setCategory] = useState(CATEGORIES.includes(initialCategory) ? initialCategory : 'All');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog
      .filter(m => !ownedIds.has(m.mod_id))
      .filter(m => category === 'All' || m.category === category)
      .filter(m => !q || m.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [catalog, ownedIds, category, search]);

  function toggle(modId) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(modId)) next.delete(modId);
      else next.add(modId);
      return next;
    });
  }

  function selectAllVisible() {
    setSelected(prev => {
      const next = new Set(prev);
      results.forEach(m => next.add(m.mod_id));
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function changeCategory(next) {
    setCategory(next);
    setSearch('');
  }

  async function handleAddSelected() {
    if (selected.size === 0) return;

    setSaving(true);
    setError(null);

    const mods = catalog.filter(m => selected.has(m.mod_id));

    const { error: insertError } = await wfUser
      .from('mod_inventory')
      .insert(mods.map(m => ({ mod_id: m.mod_id, owned_rank: 0 })));

    setSaving(false);

    if (insertError) {
      console.error('Failed to add mods to inventory:', insertError);
      setError('Failed to add mods.');
      return;
    }

    onAdded(mods);
  }

  return (
    <ModalShell onClose={onClose} accent={COLOR.gold} maxWidth="max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold" style={{ color: COLOR.gold }}>Add Mods to Inventory</h2>
        <button onClick={onClose} className="text-xl leading-none" style={{ color: COLOR.mutedInk }}>×</button>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => changeCategory(c)}
            className="rounded-xl px-3 py-1.5 text-[10px] uppercase font-bold tracking-[0.2em] transition-colors"
            style={{
              background: category === c ? `${COLOR.gold}18` : COLOR.surface1,
              border: `1px solid ${category === c ? `${COLOR.gold}55` : COLOR.border}`,
              color: category === c ? COLOR.gold : COLOR.mutedInk,
            }}
          >
            {c}
          </button>
        ))}
      </div>

      <input
        type="text"
        autoFocus
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search mod catalog..."
        className="w-full rounded-lg border px-3 py-2 text-sm outline-none mb-3"
        style={{ background: COLOR.surface2, border: `1px solid ${COLOR.border}`, color: COLOR.ink }}
      />

      <div className="flex items-center justify-between mb-2">
        <p className="text-xs" style={{ color: COLOR.mutedInk }}>
          {results.length} mod{results.length === 1 ? '' : 's'} · {selected.size} selected
        </p>
        <div className="flex gap-3">
          <button onClick={selectAllVisible} className="text-xs" style={{ color: COLOR.gold }}>
            Select All Visible
          </button>
          <button onClick={clearSelection} className="text-xs" style={{ color: COLOR.mutedInk }}>
            Clear
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

      <div className="max-h-80 overflow-y-auto space-y-1 mb-4">
        {results.length === 0 && (
          <p className="text-sm" style={{ color: COLOR.mutedInk }}>No matching mods.</p>
        )}

        {results.map(m => (
          <label
            key={m.mod_id}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer transition-colors hover:bg-black/20"
          >
            <input
              type="checkbox"
              checked={selected.has(m.mod_id)}
              onChange={() => toggle(m.mod_id)}
            />
            <span style={{ color: COLOR.ink }} className="flex-1">{m.name}</span>
            <span className="text-xs" style={{ color: COLOR.mutedInk }}>
              {m.category} · {m.polarity ?? '—'} {m.is_aura ? '· Aura' : ''}{m.is_exilus ? '· Exilus' : ''}
            </span>
          </label>
        ))}
      </div>

      <button
        onClick={handleAddSelected}
        disabled={saving || selected.size === 0}
        className="w-full rounded-xl px-4 py-2.5 text-[10px] uppercase font-bold tracking-[0.25em] transition-colors disabled:opacity-40"
        style={{ background: `${COLOR.gold}18`, border: `1px solid ${COLOR.gold}55`, color: COLOR.gold }}
      >
        {saving ? 'Adding...' : `Add ${selected.size || ''} Mod${selected.size === 1 ? '' : 's'}`}
      </button>
    </ModalShell>
  );
}
