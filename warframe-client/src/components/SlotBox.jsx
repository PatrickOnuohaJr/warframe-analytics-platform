import PolaritySymbol, { POLARITIES } from './PolaritySymbol';
import { COLOR } from '../constants/theme';

// Shared mod-slot tile: label, mod name+polarity glyph, cost, inline rank
// slider, and a polarity-picker row. Used by every equipment piece's mod
// grid (Loadout tab's Warframe/Primary/Secondary/Melee, Companion tab's
// Companion/Companion Weapon) -- extracted from LoadoutEquipmentSection so
// both can share it instead of duplicating ~80 lines of slot UI.
//
// onSetRank here takes just the next rank -- the caller pre-binds which
// id/setter (real mod vs Riven) it writes to, so this component doesn't
// need to know the difference.
export default function SlotBox({ label, slot, mod, rank, onOpenPicker, onSetPolarity, onSetRank, cost, discounted, accent, description }) {
  const cap = mod?.max_rank ?? 0;

  return (
    <div
      onClick={onOpenPicker}
      className="rounded-xl border p-3 cursor-pointer transition-colors hover:bg-black/10"
      style={{ borderColor: mod ? `${accent}55` : COLOR.border, background: COLOR.surface2 }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] uppercase tracking-widest" style={{ color: COLOR.mutedInk }}>{label}</span>
        {mod && (
          <span className="text-xs font-bold" style={{ color: discounted ? COLOR.success : COLOR.mutedInk }}>
            {cost}
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

      {mod && description && (
        <p className="text-xs mt-1 leading-snug" style={{ color: COLOR.mutedInk }}>{description}</p>
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
