import PolaritySymbol from './PolaritySymbol';
import { POLARITIES } from '../constants/polarities';
import { COLOR } from '../constants/theme';
import { DRAG_MIME } from '../utils/slotMoves';
import { useState } from 'react';

// Shared mod-slot tile: label, mod name+polarity glyph, cost, inline rank
// slider, and a polarity-picker row. Used by every equipment piece's mod
// grid (Loadout tab's Warframe/Primary/Secondary/Melee, Companion tab's
// Companion/Companion Weapon) -- extracted from LoadoutEquipmentSection so
// both can share it instead of duplicating ~80 lines of slot UI.
//
// onSetRank here takes just the next rank -- the caller pre-binds which
// id/setter (real mod vs Riven) it writes to, so this component doesn't
// need to know the difference.
//
// Compact by design (like the in-game card): the default face is only the
// name, rank and drain. The effect text (`description`) shows in a floating
// popover on hover/keyboard focus -- absolutely positioned, so it never
// changes the card's size or reflows the grid.
//
// Drag and drop is opt-in: pass `slotId` + `onDropMod(payload)` to make the
// card draggable (when filled) and a drop target. The caller decides what a
// drop means (move, swap, or a mod dragged in from the picker).
export default function SlotBox({ label, slot, mod, rank, onOpenPicker, onSetPolarity, onSetRank, onClear, cost, discounted, accent, description, slotId, onDropMod }) {
  const cap = mod?.max_rank ?? 0;
  const [dragOver, setDragOver] = useState(false);
  const dndEnabled = slotId != null && !!onDropMod;

  return (
    <div
      onClick={onOpenPicker}
      className="group relative rounded-xl border p-3 cursor-pointer transition-colors hover:bg-black/10"
      style={{
        borderColor: dragOver ? accent : mod ? `${accent}55` : COLOR.border,
        background: dragOver ? `${accent}18` : COLOR.surface2,
      }}
      draggable={dndEnabled && !!mod}
      onDragStart={dndEnabled ? e => {
        e.dataTransfer.setData(DRAG_MIME, JSON.stringify({ kind: 'slot', from: slotId }));
        e.dataTransfer.effectAllowed = 'move';
      } : undefined}
      onDragOver={dndEnabled ? e => {
        // Only react to our own mod drags (not files/text dragged from elsewhere).
        if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (!dragOver) setDragOver(true);
      } : undefined}
      onDragLeave={dndEnabled ? () => setDragOver(false) : undefined}
      onDrop={dndEnabled ? e => {
        setDragOver(false);
        const raw = e.dataTransfer.getData(DRAG_MIME);
        if (!raw) return;
        e.preventDefault();
        try { onDropMod(JSON.parse(raw)); } catch { /* malformed payload: ignore */ }
      } : undefined}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] uppercase tracking-widest" style={{ color: COLOR.mutedInk }}>{label}</span>
        {mod && (
          <span className="flex items-center gap-2">
            <span className="text-xs font-bold" style={{ color: discounted ? COLOR.success : COLOR.mutedInk }}>
              {cost}
            </span>
            {/* One-tap clear, so emptying a slot doesn't mean opening the
                picker and choosing Clear. Keeps the slot's polarity. */}
            {onClear && (
              <button
                type="button"
                aria-label={`Remove ${mod.name} from this slot`}
                title="Remove from slot"
                onClick={e => { e.stopPropagation(); onClear(); }}
                className="px-1 text-sm leading-none rounded hover:bg-black/20"
                style={{ color: COLOR.mutedInk }}
              >
                &times;
              </button>
            )}
          </span>
        )}
      </div>

      <div>
        {mod ? (
          <div className="flex items-center gap-1.5">
            <PolaritySymbol polarity={mod.polarity} size={13} color={COLOR.mutedInk} />
            <p className="text-sm font-bold" style={{ color: COLOR.ink }}>{mod.name}</p>
          </div>
        ) : (
          <p className="text-sm" style={{ color: COLOR.mutedInk }}>Empty</p>
        )}
      </div>

      {/* Hover popover with the effect text. Out of normal flow (absolute),
          non-interactive so it can't steal the mouse from the slider below. */}
      {mod && description && (
        <div
          role="tooltip"
          className="pointer-events-none absolute left-1/2 top-full z-30 mt-1 hidden w-60 -translate-x-1/2 rounded-lg border p-2 text-xs leading-snug shadow-lg group-hover:block"
          style={{ background: COLOR.surface1, borderColor: `${accent}77`, color: COLOR.ink }}
        >
          <p className="mb-1 font-bold" style={{ color: accent }}>{mod.name}</p>
          {description}
        </div>
      )}

      {/* Rank editing in-place: ranking a mod up mid-build is the common
          case (you fuse it right there in the Arsenal), so it shouldn't
          require a trip out to the Mods page. Writes the mod's owned_rank,
          which is global to the mod, not per-slot. */}
      {mod && (
        <div className="mt-1.5" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs" style={{ color: COLOR.mutedInk }}>Rank {rank}/{cap}</span>
            <button
              onClick={() => onSetRank(cap)}
              disabled={cap === 0 || rank === cap}
              className="text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded disabled:opacity-30"
              style={{ background: `${accent}18`, border: `1px solid ${accent}55`, color: accent }}
            >
              Max
            </button>
          </div>
          <input
            type="range"
            min="0"
            max={cap}
            step="1"
            value={rank}
            onChange={e => onSetRank(Number(e.target.value))}
            disabled={cap === 0}
            className="w-full"
            style={{ accentColor: accent }}
          />
        </div>
      )}

      <div
        className="flex items-center gap-1 mt-2 flex-wrap"
        onClick={e => e.stopPropagation()}
      >
        {POLARITIES.map(p => (
          <button
            key={p}
            onClick={() => onSetPolarity(slot.polarity === p ? null : p)}
            title={p}
            className="rounded-md p-1 transition-colors"
            style={{
              background: slot.polarity === p ? `${accent}22` : 'transparent',
              border: `1px solid ${slot.polarity === p ? accent : 'transparent'}`,
            }}
          >
            <PolaritySymbol polarity={p} size={13} color={slot.polarity === p ? accent : COLOR.mutedInk} />
          </button>
        ))}
      </div>
    </div>
  );
}
