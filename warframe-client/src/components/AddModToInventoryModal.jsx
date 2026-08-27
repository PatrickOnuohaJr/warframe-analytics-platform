import { useState, useMemo } from 'react';
import { wfUser } from '../lib/supabase';
import ModalShell from './ui/ModalShell';
import { COLOR } from '../constants/theme';
import { isAugment, isPrimeMod, modSetName, weaponTag, statGroups, statGroupsFor } from '../utils/modMeta';
import PolaritySymbol from './PolaritySymbol';

// Aura/Exilus/Augment are Warframe-only in the real data (confirmed
// against the catalog: 0 weapon mods carry any of the three), so they
// only belong in the type/stat picker when browsing All or Warframe --
// showing them under Primary/Secondary/Melee would just be a menu option
// that always selects nothing.

const CATEGORIES = ['All', 'Warframe', 'Primary', 'Secondary', 'Melee'];

// Bulk ownership picker for Mod Inventory -- same pattern as
// AddWeaponToInventoryModal (Armory): browse a category, check off every
// mod you own, commit in one insert. New rows start at owned_rank 0;
// rank is edited from the inventory list after adding.
export default function AddModToInventoryModal({ catalog, ownedIds, initialCategory = 'All', onClose, onAdded }) {
  const [category, setCategory] = useState(CATEGORIES.includes(initialCategory) ? initialCategory : 'All');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog
      .filter(m => !ownedIds.has(m.mod_id))
      .filter(m => category === 'All' || m.category === category)
      .filter(m => !q || m.name.toLowerCase().includes(q))
      .filter(m => !showSelectedOnly || selected.has(m.mod_id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [catalog, ownedIds, category, search, showSelectedOnly, selected]);

  // Real WFCD data behind "groupable": isAugment flag, isPrime flag, and
  // modSet (parsed to a human name, e.g. "Umbra", "Augur", "Strain") --
  // whatever sets actually exist in the catalog, not a guessed list.
  // Scoped to the active category so browsing Primary doesn't list Umbra/
  // Augur/etc sets that belong entirely to Warframe mods.
  const groups = useMemo(() => {
    const inCategory = catalog.filter(m => category === 'All' || m.category === category);
    let primeCount = 0;
    const setCounts = new Map();

    inCategory.forEach(m => {
      if (isPrimeMod(m)) primeCount += 1;
      const set = modSetName(m);
      if (set) setCounts.set(set, (setCounts.get(set) || 0) + 1);
    });

    return {
      primeCount,
      sets: [...setCounts.entries()].sort((a, b) => a[0].localeCompare(b[0])),
    };
  }, [catalog, category]);

  // Mod type / stat groups -- a separate menu from the themed-set one
  // above, since "what kind of mod is this" (Aura/Exilus/Augment) and
  // "what stat does it boost" (Health/Shield/... or Fire Rate/Multishot/
  // ... or Attack Speed/Range/...) is a different grouping axis than
  // "which themed set is it part of." Both halves are category-scoped:
  // Aura/Exilus/Augment only for All/Warframe (see note above), and the
  // stat groups themselves via statGroupsFor, same category-aware list
  // the Mods page and the Loadout mod picker already use.
  const showTypeGroups = category === 'All' || category === 'Warframe';
  const statGroupNames = category === 'All' ? [] : statGroupsFor(category);
  const typeStatGroupNames = [...(showTypeGroups ? ['Aura', 'Exilus', 'Augment'] : []), ...statGroupNames];

  const typeStatCounts = useMemo(() => {
    const inCategory = catalog.filter(m => category === 'All' || m.category === category);
    const counts = {};
    typeStatGroupNames.forEach(g => { counts[g] = 0; });
    inCategory.forEach(m => {
      if (showTypeGroups && m.is_aura) counts.Aura += 1;
      if (showTypeGroups && m.is_exilus) counts.Exilus += 1;
      if (showTypeGroups && isAugment(m)) counts.Augment += 1;
      statGroups(m).forEach(g => { if (g in counts) counts[g] += 1; });
    });
    return counts;
  }, [catalog, category, typeStatGroupNames, showTypeGroups]);

  function matchesTypeStatGroup(mod, group) {
    if (group === 'Aura') return mod.is_aura;
    if (group === 'Exilus') return mod.is_exilus;
    if (group === 'Augment') return isAugment(mod);
    return statGroups(mod).includes(group);
  }

  function selectGroup(groupKey) {
    // Scoped to the active category, matching the counts shown next to
    // each option -- otherwise "All Prime Mods (21)" for Primary would
    // actually pull in Prime mods from every category.
    const inCategory = m => category === 'All' || m.category === category;

    let matches;
    if (groupKey === 'prime') matches = catalog.filter(m => isPrimeMod(m) && inCategory(m));
    else if (groupKey.startsWith('set:')) {
      const setName = groupKey.slice(4);
      matches = catalog.filter(m => modSetName(m) === setName && inCategory(m));
    } else if (groupKey.startsWith('typestat:')) {
      // Primary and Secondary share the same stat-group names (Crit
      // Chance, Fire Rate, ...), so this needs the category filter too --
      // otherwise picking "Crit Chance" while browsing Primary would
      // silently pull in Secondary mods as well.
      const group = groupKey.slice(9);
      matches = catalog.filter(m => matchesTypeStatGroup(m, group) && inCategory(m));
    } else {
      return;
    }

    setSelected(prev => {
      const next = new Set(prev);
      matches.forEach(m => { if (!ownedIds.has(m.mod_id)) next.add(m.mod_id); });
      return next;
    });

    // Jump straight to reviewing what got picked -- the whole point of
    // grouping is not having to scroll the full 600+ list to check it.
    setShowSelectedOnly(true);
  }

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

      <select
        value=""
        onChange={e => { if (e.target.value) selectGroup(e.target.value); }}
        className="w-full rounded-lg border px-3 py-2 text-sm outline-none mb-3"
        style={{ background: COLOR.surface2, border: `1px solid ${COLOR.border}`, color: COLOR.ink }}
      >
        <option value="">Select a themed set to add...</option>
        <option value="prime">All Prime Mods ({groups.primeCount})</option>
        {groups.sets.map(([name, count]) => (
          <option key={name} value={`set:${name}`}>{name} Set ({count})</option>
        ))}
      </select>

      <select
        value=""
        onChange={e => { if (e.target.value) selectGroup(e.target.value); }}
        className="w-full rounded-lg border px-3 py-2 text-sm outline-none mb-3"
        style={{ background: COLOR.surface2, border: `1px solid ${COLOR.border}`, color: COLOR.ink }}
      >
        <option value="">Select a mod type or stat to add...</option>
        {typeStatGroupNames.map(group => (
          <option key={group} value={`typestat:${group}`}>{group} ({typeStatCounts[group]})</option>
        ))}
      </select>

      <input
        type="text"
        autoFocus
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search mod catalog..."
        className="w-full rounded-lg border px-3 py-2 text-sm outline-none mb-3"
        style={{ background: COLOR.surface2, border: `1px solid ${COLOR.border}`, color: COLOR.ink }}
      />

      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <p className="text-xs" style={{ color: COLOR.mutedInk }}>
          Showing {results.length} · {selected.size} selected total
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setShowSelectedOnly(v => !v)}
            className="text-xs font-bold"
            style={{ color: showSelectedOnly ? COLOR.gold : COLOR.mutedInk }}
          >
            {showSelectedOnly ? 'Showing Selected Only' : 'Show Selected Only'}
          </button>
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
            <PolaritySymbol polarity={m.polarity} size={14} color={COLOR.mutedInk} />
            <span style={{ color: COLOR.ink }} className="flex-1">{m.name}</span>
            <span className="text-xs" style={{ color: COLOR.mutedInk }}>
              {m.category}
              {weaponTag(m) ? ` · ${weaponTag(m)}` : ''}
              {' '}{m.is_aura ? '· Aura' : ''}{m.is_exilus ? '· Exilus' : ''}
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
