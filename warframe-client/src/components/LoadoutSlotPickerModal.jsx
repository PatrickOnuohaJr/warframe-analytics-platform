import { useState, useMemo } from 'react';
import ModalShell from './ui/ModalShell';
import PolaritySymbol from './PolaritySymbol';
import { COLOR } from '../constants/theme';
import { effectiveDrain } from '../utils/modCapacity';
import { statGroups, STAT_GROUPS } from '../utils/modMeta';

// Mod picker for a single loadout slot. `mods` is already pre-filtered by
// the caller (right equipment category, aura-only / exilus-only as
// appropriate) to owned mods only.
export default function LoadoutSlotPickerModal({ mods, ownedByModId, slotPolarity, onSelect, onClear, onClose }) {
  const [search, setSearch] = useState('');
  const [statFilter, setStatFilter] = useState(null);

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mods
      .filter(m => !q || m.name.toLowerCase().includes(q))
      .filter(m => !statFilter || statGroups(m).includes(statFilter))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [mods, search, statFilter]);

  return (
    <ModalShell onClose={onClose} accent={COLOR.gold} maxWidth="max-w-lg" zIndex={70}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold" style={{ color: COLOR.gold }}>Choose a Mod</h2>
        <button onClick={onClose} className="text-xl leading-none" style={{ color: COLOR.mutedInk }}>×</button>
      </div>

      <input
        type="text"
        autoFocus
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search owned mods..."
        className="w-full rounded-lg border px-3 py-2 text-sm outline-none mb-3"
        style={{ background: COLOR.surface2, border: `1px solid ${COLOR.border}`, color: COLOR.ink }}
      />

      <button
        onClick={onClear}
        className="w-full text-left rounded-lg px-3 py-2 mb-2 text-sm"
        style={{ background: COLOR.surface2, border: `1px solid ${COLOR.border}`, color: COLOR.mutedInk }}
      >
        Clear slot
      </button>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <button
          onClick={() => setStatFilter(null)}
          className="text-[9px] uppercase tracking-widest px-2 py-1 rounded"
          style={{
            background: !statFilter ? `${COLOR.gold}22` : 'transparent',
            color: !statFilter ? COLOR.gold : COLOR.mutedInk,
            border: `1px solid ${!statFilter ? COLOR.gold : COLOR.border}`,
          }}
        >
          All
        </button>
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

      <div className="max-h-96 overflow-y-auto space-y-1">
        {results.length === 0 && (
          <p className="text-sm" style={{ color: COLOR.mutedInk }}>
            No owned mods match this slot. Add some from the Mods page first.
          </p>
        )}

        {results.map(mod => {
          const rank = ownedByModId.get(mod.mod_id)?.owned_rank ?? 0;
          const cost = effectiveDrain(mod, rank, slotPolarity);
          const discounted = slotPolarity && mod.polarity === slotPolarity;

          return (
            <button
              key={mod.mod_id}
              onClick={() => onSelect(mod.mod_id)}
              className="w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-black/20"
            >
              <div className="flex items-center gap-2">
                <PolaritySymbol polarity={mod.polarity} size={15} color={COLOR.mutedInk} />
                <span style={{ color: COLOR.ink }}>{mod.name}</span>
                <span className="text-xs" style={{ color: COLOR.mutedInk }}>
                  Rank {rank}/{mod.max_rank ?? 0}
                </span>
              </div>
              <span className="text-xs font-bold" style={{ color: discounted ? COLOR.success : COLOR.mutedInk }}>
                {cost}
              </span>
            </button>
          );
        })}
      </div>
    </ModalShell>
  );
}
