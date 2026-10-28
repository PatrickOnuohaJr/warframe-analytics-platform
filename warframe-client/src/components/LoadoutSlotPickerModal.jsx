import { useState, useMemo } from 'react';
import ModalShell from './ui/ModalShell';
import PolaritySymbol from './PolaritySymbol';
import { COLOR } from '../constants/theme';
import { effectiveDrain, isDiscounted } from '../utils/modCapacity';
import { statGroups, statGroupsFor, effectTextAtRank } from '../utils/modMeta';

// Mod picker for a single loadout slot. `mods` is already pre-filtered by
// the caller (right equipment category, aura-only / exilus-only as
// appropriate) to owned mods only, plus that weapon's Rivens for a
// numbered slot (tagged `isRiven: true`, never present for Warframe/
// Exilus/Aura). `category` picks which stat-group chips apply -- a weapon
// slot never offers Health/Shield/Armor, a Warframe slot never offers Fire
// Rate/Multishot. `onCreateRiven`/`onEditRiven` are only passed for weapon
// slots that allow Rivens (see LoadoutEquipmentSection).
export default function LoadoutSlotPickerModal({
  mods,
  category,
  ownedByModId,
  augmentCatalog = [],
  auraCatalog = [],
  isAuraSlot = false,
  slotPolarity,
  onSelect,
  onClear,
  onClose,
  onCreateRiven,
  onEditRiven,
}) {
  const [search, setSearch] = useState('');
  const [statFilter, setStatFilter] = useState(null);
  // Special views, one at a time:
  //   'augments' -- every augment that fits THIS Warframe (owned ones are
  //                 pickable, unowned dimmed) so they don't have to be looked
  //                 up elsewhere. Needs augmentCatalog.
  //   'exilus'   -- owned Exilus-capable mods from the current pool.
  //   'aura'     -- owned Aura mods, for browsing while filling a numbered
  //                 slot; they can only be equipped in the Aura slot, so they
  //                 show dimmed unless this IS the Aura slot picker.
  const [view, setView] = useState(null);
  const hasExilus = mods.some(m => m.is_exilus);
  const showAuraChip = auraCatalog.length > 0 && !isAuraSlot;
  const groups = statGroupsFor(category);

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (view === 'augments') {
      return augmentCatalog
        .filter(m => !q || m.name.toLowerCase().includes(q))
        .map(m => ({ ...m, disabledLabel: ownedByModId.has(m.mod_id) ? null : 'Not owned' }));
    }
    if (view === 'aura') {
      return auraCatalog
        .filter(m => !q || m.name.toLowerCase().includes(q))
        .map(m => ({ ...m, disabledLabel: 'Aura slot only' }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    return mods
      .filter(m => !q || m.name.toLowerCase().includes(q))
      .filter(m => view !== 'exilus' || m.is_exilus)
      .filter(m => !statFilter || statGroups(m).includes(statFilter))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [mods, search, statFilter, view, augmentCatalog, auraCatalog, ownedByModId]);

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

      {onCreateRiven && (
        <button
          onClick={onCreateRiven}
          className="w-full text-left rounded-lg px-3 py-2 mb-2 text-sm font-bold"
          style={{ background: `${COLOR.gold}14`, border: `1px solid ${COLOR.gold}55`, color: COLOR.gold }}
        >
          + Create New Riven
        </button>
      )}

      <div className="flex flex-wrap gap-1.5 mb-3">
        <button
          onClick={() => { setStatFilter(null); setView(null); }}
          className="text-[9px] uppercase tracking-widest px-2 py-1 rounded"
          style={{
            background: !statFilter && !view ? `${COLOR.gold}22` : 'transparent',
            color: !statFilter && !view ? COLOR.gold : COLOR.mutedInk,
            border: `1px solid ${!statFilter && !view ? COLOR.gold : COLOR.border}`,
          }}
        >
          All
        </button>
        {[
          augmentCatalog.length > 0 && { id: 'augments', label: `Augments (${augmentCatalog.length})` },
          showAuraChip && { id: 'aura', label: `Aura (${auraCatalog.length})` },
          hasExilus && { id: 'exilus', label: 'Exilus' },
        ].filter(Boolean).map(chip => (
          <button
            key={chip.id}
            onClick={() => { setView(v => (v === chip.id ? null : chip.id)); setStatFilter(null); }}
            className="text-[9px] uppercase tracking-widest px-2 py-1 rounded"
            style={{
              background: view === chip.id ? `${COLOR.gold}22` : 'transparent',
              color: view === chip.id ? COLOR.gold : COLOR.mutedInk,
              border: `1px solid ${view === chip.id ? COLOR.gold : COLOR.border}`,
            }}
          >
            {chip.label}
          </button>
        ))}
        {groups.map(group => (
          <button
            key={group}
            onClick={() => { setView(null); setStatFilter(statFilter === group ? null : group); }}
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
            {view === 'augments' ? 'No augments match.'
              : view === 'aura' ? 'No owned Aura mods match.'
              : view === 'exilus' ? 'No owned Exilus mods match.'
              : 'No owned mods match this slot. Add some from the Mods page first.'}
          </p>
        )}

        {results.map(mod => {
          // Rivens carry their own rank inline (owned_rank); real mods
          // still resolve rank from the shared inventory map.
          const rank = mod.owned_rank ?? ownedByModId.get(mod.mod_id)?.owned_rank ?? 0;
          const cost = effectiveDrain(mod, rank, slotPolarity);
          const discounted = isDiscounted(mod, slotPolarity);
          const key = mod.mod_id ?? `riven-${mod.riven_id}`;

          return (
            <div key={key} className="w-full flex items-center gap-1" style={{ opacity: mod.disabledLabel ? 0.5 : 1 }}>
              <button
                onClick={() => onSelect(mod)}
                disabled={!!mod.disabledLabel}
                className="flex-1 flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-black/20 disabled:cursor-not-allowed"
              >
                <div>
                <div className="flex items-center gap-2">
                  <PolaritySymbol polarity={mod.polarity} size={15} color={COLOR.mutedInk} />
                  {mod.isRiven && (
                    <span
                      className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
                      style={{ background: `${COLOR.gold}18`, color: COLOR.gold }}
                    >
                      Riven
                    </span>
                  )}
                  <span style={{ color: COLOR.ink }}>{mod.name}</span>
                  <span className="text-xs" style={{ color: COLOR.mutedInk }}>
                    {mod.disabledLabel ?? `Rank ${rank}/${mod.max_rank ?? 0}`}
                  </span>
                </div>
                {view === 'augments' && (
                  // The augment's own effect text names the ability it changes.
                  <p className="text-[11px] mt-1 leading-snug" style={{ color: COLOR.mutedInk }}>
                    {effectTextAtRank(mod, mod.max_rank ?? 0)}
                  </p>
                )}
                </div>
                <span className="text-xs font-bold" style={{ color: discounted ? COLOR.success : COLOR.mutedInk }}>
                  {cost}
                </span>
              </button>
              {mod.isRiven && onEditRiven && (
                <button
                  onClick={() => onEditRiven(mod)}
                  title="Edit Riven"
                  className="text-xs px-2 py-2"
                  style={{ color: COLOR.mutedInk }}
                >
                  ✎
                </button>
              )}
            </div>
          );
        })}
      </div>
    </ModalShell>
  );
}
