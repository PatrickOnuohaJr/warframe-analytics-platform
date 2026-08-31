import { useState, useMemo } from 'react';
import Panel from './ui/Panel';
import LoadoutSlotPickerModal from './LoadoutSlotPickerModal';
import SlotBox from './SlotBox';
import WeaponInput from './WeaponInput';
import { COLOR } from '../constants/theme';
import { effectiveDrain, pieceCapacity, isDiscounted } from '../utils/modCapacity';
import { effectTextAtRank } from '../utils/modMeta';
import { cleanValue } from '../utils/shardHelpers';
import { wfUser } from '../lib/supabase';
import useDebouncedField from '../hooks/useDebouncedField';

const NUMBERED_SLOTS = ['1', '2', '3', '4', '5', '6', '7', '8'];
const IDENTITY_FIELD = { Companion: 'companion', CompanionWeapon: 'companion_weapon' };
const LABEL = { Companion: 'Companion', CompanionWeapon: 'Companion Weapon' };
const PLACEHOLDER = { Companion: 'e.g. Wyrm Prime', CompanionWeapon: 'e.g. Deth Machine Rifle' };

export default function CompanionEquipmentSection({
  equipmentType,
  displayName,
  meta,
  slotsByPosition,
  ownedMods,
  postureMods,
  ownedByModId,
  modsById,
  onSetMeta,
  onSetSlot,
  onSetRank,
  accent,
  frame,
  identityOptions,
  onSaved,
}) {
  const [picker, setPicker] = useState(null); // { slotPosition, slot }

  const isWeaponPiece = equipmentType === 'CompanionWeapon';
  const identityColumn = IDENTITY_FIELD[equipmentType];

  // Same auto-save-on-change convention as every other frame field --
  // Companion has no Armory-equivalent drag-drop entry point, so this is
  // the only place identity ever gets set.
  async function saveFrameField(patch) {
    const { error } = await wfUser.from('my_frames').update(patch).eq('my_frame_id', frame.my_frame_id);
    if (error) { console.error('Failed to save Companion field:', error); return; }
    onSaved();
  }

  const [identityValue, setIdentityValue] = useDebouncedField(
    frame[identityColumn] ?? '',
    v => saveFrameField({ [identityColumn]: cleanValue(v) })
  );

  function resolveSlotItem(slot) {
    return slot?.mod_id ? modsById.get(slot.mod_id) : null;
  }

  function rankForMod(mod) {
    return mod ? (ownedByModId.get(mod.mod_id)?.owned_rank ?? 0) : 0;
  }

  const capacity = pieceCapacity({ hasCatalyst: meta.has_catalyst });

  // Posture is Companion Weapon-only, mechanically identical to a
  // Warframe's Aura slot (free capacity, isAuraSlot=true doubles the
  // discount on a matched polarity) -- confirmed against Patrick's live
  // 60->70 capacity jump. See CompanionTab.jsx header comment.
  const postureSlot = slotsByPosition.get('posture') ?? { mod_id: null, riven_id: null, polarity: null };
  const postureMod = postureSlot.mod_id ? modsById.get(postureSlot.mod_id) : null;
  const postureRank = rankForMod(postureMod);
  const postureDrain = postureMod ? effectiveDrain(postureMod, postureRank, postureSlot.polarity, true) : 0;

  const { used, netCapacity } = useMemo(() => {
    let total = 0;
    NUMBERED_SLOTS.forEach(pos => {
      const slot = slotsByPosition.get(pos);
      const item = resolveSlotItem(slot);
      if (!item) return;
      total += effectiveDrain(item, rankForMod(item), slot.polarity);
    });
    return { used: total, netCapacity: isWeaponPiece ? capacity - postureDrain : capacity };
  }, [slotsByPosition, modsById, ownedByModId, capacity, isWeaponPiece, postureDrain]);

  const overBudget = used > netCapacity;

  const numberedBoxes = NUMBERED_SLOTS.map(pos => {
    const slot = slotsByPosition.get(pos) ?? { mod_id: null, riven_id: null, polarity: null };
    const item = resolveSlotItem(slot);
    const rank = rankForMod(item);
    const cost = item ? effectiveDrain(item, rank, slot.polarity) : 0;

    return (
      <SlotBox
        key={pos}
        label={`Slot ${pos}`}
        slot={slot}
        mod={item}
        rank={rank}
        cost={cost}
        discounted={isDiscounted(item, slot.polarity)}
        description={item ? effectTextAtRank(item, rank) : null}
        accent={accent}
        onOpenPicker={() => setPicker({ slotPosition: pos, slot })}
        onSetPolarity={polarity => onSetSlot(pos, { mod_id: slot.mod_id, riven_id: null, polarity })}
        onSetRank={nextRank => onSetRank(item.mod_id, nextRank)}
      />
    );
  });

  const postureBox = (
    <SlotBox
      label="Posture"
      slot={postureSlot}
      mod={postureMod}
      rank={postureRank}
      cost={postureDrain}
      discounted={isDiscounted(postureMod, postureSlot.polarity, true)}
      description={postureMod ? effectTextAtRank(postureMod, postureRank) : null}
      accent={accent}
      onOpenPicker={() => setPicker({ slotPosition: 'posture', slot: postureSlot })}
      onSetPolarity={polarity => onSetSlot('posture', { mod_id: postureSlot.mod_id, riven_id: null, polarity })}
      onSetRank={nextRank => onSetRank(postureMod.mod_id, nextRank)}
    />
  );

  return (
    <Panel accent={accent} className="mb-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: accent }}>{displayName ?? LABEL[equipmentType]}</h3>

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
            Catalyst {meta.has_catalyst ? 'Installed' : 'Not Installed'}
          </button>

          <span className="font-bold" style={{ color: overBudget ? COLOR.danger : COLOR.ink }}>
            {used} / {netCapacity} Capacity
          </span>
        </div>
      </div>

      <div className="mb-4 max-w-sm">
        <WeaponInput
          label={LABEL[equipmentType]}
          value={identityValue}
          onChange={setIdentityValue}
          weapons={identityOptions}
          slot={equipmentType}
          placeholder={PLACEHOLDER[equipmentType]}
        />
      </div>

      {isWeaponPiece ? (
        <div className="mb-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <div className="hidden sm:block" />
            {postureBox}
            <div className="hidden sm:block" />
            <div className="hidden sm:block" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {numberedBoxes}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          {numberedBoxes}
        </div>
      )}

      {picker && (
        <LoadoutSlotPickerModal
          mods={picker.slotPosition === 'posture' ? postureMods : ownedMods}
          category={equipmentType}
          ownedByModId={ownedByModId}
          slotPolarity={picker.slot.polarity}
          onSelect={item => {
            onSetSlot(picker.slotPosition, { mod_id: item.mod_id, riven_id: null, polarity: picker.slot.polarity });
            setPicker(null);
          }}
          onClear={() => {
            onSetSlot(picker.slotPosition, { mod_id: null, riven_id: null, polarity: picker.slot.polarity });
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
        />
      )}
    </Panel>
  );
}
