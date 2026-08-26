import { useState, useMemo } from 'react';
import Panel from './ui/Panel';
import LoadoutSlotPickerModal from './LoadoutSlotPickerModal';
import PolaritySymbol, { POLARITIES } from './PolaritySymbol';
import { COLOR } from '../constants/theme';
import { effectiveDrain, pieceCapacity } from '../utils/modCapacity';

const NUMBERED_SLOTS = ['1', '2', '3', '4', '5', '6', '7', '8'];

function SlotBox({ label, slot, mod, rank, onOpenPicker, onSetPolarity, onSetRank, cost, discounted, accent }) {
  const cap = mod?.max_rank ?? 0;

  return (
    <div
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

      <div onClick={onOpenPicker}>
        {mod ? (
          <div className="flex items-center gap-1.5">
            <PolaritySymbol polarity={mod.polarity} size={13} color={COLOR.mutedInk} />
            <p className="text-sm font-bold" style={{ color: COLOR.ink }}>{mod.name}</p>
          </div>
        ) : (
          <p className="text-sm" style={{ color: COLOR.mutedInk }}>Empty</p>
        )}
      </div>

      {/* Rank editing in-place: ranking a mod up mid-build is the common
          case (you fuse it right there in the Arsenal), so it shouldn't
          require a trip out to the Mods page. Writes the mod's owned_rank,
          which is global to the mod, not per-slot. */}
      {mod && (
        <div className="mt-1.5" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs" style={{ color: COLOR.mutedInk }}>Rank {rank}/{cap}</span>
            <button
              onClick={() => onSetRank(mod.mod_id, cap)}
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
            onChange={e => onSetRank(mod.mod_id, Number(e.target.value))}
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

export default function LoadoutEquipmentSection({
  equipmentType,
  meta,
  slotsByPosition,
  ownedMods,
  auraMods,
  ownedByModId,
  modsById,
  masteryRank,
  onSetMeta,
  onSetSlot,
  onSetRank,
  accent,
}) {
  const [picker, setPicker] = useState(null); // { slotPosition, pool }

  const isWarframe = equipmentType === 'Warframe';

  const capacity = pieceCapacity({ hasCatalyst: meta.has_catalyst, masteryRank });

  const auraSlot = slotsByPosition.get('aura') ?? { mod_id: null, polarity: null };
  const auraMod = auraSlot.mod_id ? modsById.get(auraSlot.mod_id) : null;
  const auraRank = auraMod ? (ownedByModId.get(auraMod.mod_id)?.owned_rank ?? 0) : 0;
  const auraDrain = auraMod ? effectiveDrain(auraMod, auraRank, auraSlot.polarity) : 0;

  const exilusSlot = slotsByPosition.get('exilus') ?? { mod_id: null, polarity: null };
  const exilusMod = exilusSlot.mod_id ? modsById.get(exilusSlot.mod_id) : null;
  const exilusRank = exilusMod ? (ownedByModId.get(exilusMod.mod_id)?.owned_rank ?? 0) : 0;
  const exilusDrain = exilusMod ? effectiveDrain(exilusMod, exilusRank, exilusSlot.polarity) : 0;

  const { used, netCapacity } = useMemo(() => {
    let total = 0;
    NUMBERED_SLOTS.forEach(pos => {
      const slot = slotsByPosition.get(pos);
      if (!slot?.mod_id) return;
      const mod = modsById.get(slot.mod_id);
      if (!mod) return;
      const rank = ownedByModId.get(mod.mod_id)?.owned_rank ?? 0;
      total += effectiveDrain(mod, rank, slot.polarity);
    });
    // Aura's drain is negative on real aura mods, so subtracting it adds
    // capacity back. Exilus never touches capacity at all.
    return { used: total, netCapacity: capacity - auraDrain };
  }, [slotsByPosition, modsById, ownedByModId, capacity, auraDrain]);

  const overBudget = used > netCapacity;

  return (
    <Panel accent={accent} className="mb-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: accent }}>{equipmentType}</h3>

        <div className="flex items-center gap-4 text-xs" style={{ color: COLOR.mutedInk }}>
          <label className="flex items-center gap-2">
            Forma
            <input
              type="number"
              min="0"
              max="99"
              value={meta.forma_count}
              onChange={e => onSetMeta({ forma_count: Math.max(0, Number(e.target.value) || 0) })}
              className="w-14 rounded-lg border px-2 py-1 text-xs outline-none"
              style={{ background: COLOR.surface2, border: `1px solid ${COLOR.border}`, color: COLOR.ink }}
            />
          </label>

          <button
            onClick={() => onSetMeta({ has_catalyst: !meta.has_catalyst })}
            className="rounded-lg px-3 py-1.5 text-[10px] uppercase font-bold tracking-widest"
            style={{
              background: meta.has_catalyst ? `${accent}22` : COLOR.surface2,
              border: `1px solid ${meta.has_catalyst ? accent : COLOR.border}`,
              color: meta.has_catalyst ? accent : COLOR.mutedInk,
            }}
          >
            {isWarframe ? 'Reactor' : 'Catalyst'} {meta.has_catalyst ? 'Installed' : 'Not Installed'}
          </button>

          <span className="font-bold" style={{ color: overBudget ? COLOR.danger : COLOR.ink }}>
            {used} / {netCapacity} Capacity
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-3">
        {isWarframe && (
          <SlotBox
            label="Aura"
            slot={auraSlot}
            mod={auraMod}
            rank={auraRank}
            cost={auraDrain}
            discounted={auraSlot.polarity && auraMod?.polarity === auraSlot.polarity}
            accent={accent}
            onOpenPicker={() => setPicker({ slotPosition: 'aura', pool: auraMods, slot: auraSlot })}
            onSetPolarity={polarity => onSetSlot('aura', { mod_id: auraSlot.mod_id, polarity })}
            onSetRank={onSetRank}
          />
        )}

        <SlotBox
          label="Exilus"
          slot={exilusSlot}
          mod={exilusMod}
          rank={exilusRank}
          cost={exilusDrain}
          discounted={exilusSlot.polarity && exilusMod?.polarity === exilusSlot.polarity}
          accent={accent}
          onOpenPicker={() => setPicker({ slotPosition: 'exilus', pool: ownedMods, slot: exilusSlot })}
          onSetPolarity={polarity => onSetSlot('exilus', { mod_id: exilusSlot.mod_id, polarity })}
          onSetRank={onSetRank}
        />

        {NUMBERED_SLOTS.map(pos => {
          const slot = slotsByPosition.get(pos) ?? { mod_id: null, polarity: null };
          const mod = slot.mod_id ? modsById.get(slot.mod_id) : null;
          const rank = mod ? (ownedByModId.get(mod.mod_id)?.owned_rank ?? 0) : 0;
          const cost = mod ? effectiveDrain(mod, rank, slot.polarity) : 0;

          return (
            <SlotBox
              key={pos}
              label={`Slot ${pos}`}
              slot={slot}
              mod={mod}
              rank={rank}
              cost={cost}
              discounted={slot.polarity && mod?.polarity === slot.polarity}
              accent={accent}
              onOpenPicker={() => setPicker({ slotPosition: pos, pool: ownedMods, slot })}
              onSetPolarity={polarity => onSetSlot(pos, { mod_id: slot.mod_id, polarity })}
              onSetRank={onSetRank}
            />
          );
        })}
      </div>

      {picker && (
        <LoadoutSlotPickerModal
          mods={picker.pool}
          ownedByModId={ownedByModId}
          slotPolarity={picker.slot.polarity}
          onSelect={modId => {
            onSetSlot(picker.slotPosition, { mod_id: modId, polarity: picker.slot.polarity });
            setPicker(null);
          }}
          onClear={() => {
            onSetSlot(picker.slotPosition, { mod_id: null, polarity: picker.slot.polarity });
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
        />
      )}
    </Panel>
  );
}
