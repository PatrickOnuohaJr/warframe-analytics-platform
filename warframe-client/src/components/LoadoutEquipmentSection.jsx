import { useState, useMemo } from 'react';
import Panel from './ui/Panel';
import Button from './ui/Button';
import LoadoutSlotPickerModal from './LoadoutSlotPickerModal';
import SlotBox from './SlotBox';
import WeaponInput from './WeaponInput';
import IncarnonToggle from './IncarnonToggle';
import CopyWeaponModal from './CopyWeaponModal';
import AbilitiesEditor from './AbilitiesEditor';
import RivenEditorModal from './RivenEditorModal';
import WarframeModdedStatsPanel from './WarframeModdedStatsPanel';
import WeaponModdedStatsPanel from './WeaponModdedStatsPanel';
import { COLOR } from '../constants/theme';
import { effectiveDrain, pieceCapacity, isDiscounted, RIVEN_BASE_DRAIN, RIVEN_MAX_RANK } from '../utils/modCapacity';
import { weaponTrait } from '../utils/weaponMeta';
import { arcaneEffectText } from '../utils/arcaneMeta';
import { getShardBonusTexts } from '../utils/survivability';
import { effectTextAtRank } from '../utils/modMeta';
import { cleanValue } from '../utils/shardHelpers';
import { wfUser } from '../lib/supabase';
import useDebouncedField from '../hooks/useDebouncedField';

const NUMBERED_SLOTS = ['1', '2', '3', '4', '5', '6', '7', '8'];

// Maps each weapon equipment type to its three my_frames columns.
const WEAPON_FIELDS = {
  Primary: { weapon: 'primary_weapon', incarnon: 'primary_is_incarnon', arcane: 'primary_arcane', copySlot: 'primary' },
  Secondary: { weapon: 'secondary_weapon', incarnon: 'secondary_is_incarnon', arcane: 'secondary_arcane', copySlot: 'secondary' },
  Melee: { weapon: 'melee_weapon', incarnon: 'melee_is_incarnon', arcane: 'melee_arcane', copySlot: 'melee' },
};

// Turns a raw wf_user.rivens row into a pool-item shape compatible with
// the mod picker/SlotBox/modCapacity math -- riven_id where a real mod
// would carry mod_id, base_drain/max_rank as the fixed Riven constants
// (every real Riven uses the same curve), owned_rank inline instead of a
// separate mod_inventory lookup.
function toRivenPoolItem(riven) {
  return {
    riven_id: riven.riven_id,
    mod_id: null,
    name: riven.riven_name || `${riven.weapon_name} Riven`,
    polarity: riven.polarity,
    base_drain: RIVEN_BASE_DRAIN,
    max_rank: RIVEN_MAX_RANK,
    owned_rank: riven.owned_rank,
    isRiven: true,
    stats: [riven.stat_1, riven.stat_2, riven.stat_3, riven.stat_4].filter(Boolean),
  };
}

// A Riven's stats are already hand-typed display text (see RivenEditorModal),
// a real mod's comes from its own effect-text-at-rank -- same "no blank
// cards" goal, different source shape.
function modDescription(item, rank) {
  if (!item) return null;
  if (item.isRiven) return item.stats.join(' · ');
  return effectTextAtRank(item, rank);
}

export default function LoadoutEquipmentSection({
  equipmentType,
  displayName,
  meta,
  slotsByPosition,
  ownedMods,
  auraMods,
  stanceMods,
  ownedByModId,
  modsById,
  rivens,
  rivensById,
  warframeStats,
  onSetMeta,
  onSetSlot,
  onSetRank,
  onSetRivenRank,
  onSaveRiven,
  onDeleteRiven,
  accent,
  frame,
  frames,
  weapons,
  arcanes,
  abilityCanonicalByName,
  onSaved,
}) {
  const [picker, setPicker] = useState(null); // { slotPosition, pool, slot }
  const [rivenEditor, setRivenEditor] = useState(null); // { riven, autoEquipSlot } | null
  const [showCopyWeapon, setShowCopyWeapon] = useState(false);
  const [arcaneCopyTarget, setArcaneCopyTarget] = useState('');
  const [copyingArcanes, setCopyingArcanes] = useState(false);
  // Lifted out of WarframeModdedStatsPanel so AbilitiesEditor can reuse
  // the same already-computed Duration/Efficiency/Range/Strength/Armor
  // instead of recomputing them a second time.
  const [warframeStatsResult, setWarframeStatsResult] = useState(null);

  const isWarframe = equipmentType === 'Warframe';
  const isMelee = equipmentType === 'Melee';
  const weaponFields = WEAPON_FIELDS[equipmentType];

  const shardBonusTexts = useMemo(() => getShardBonusTexts(frame), [frame]);

  // Rivens are weapon-specific, never Warframe/Exilus/Aura -- only the
  // numbered-slot pool for a weapon type ever includes them, filtered to
  // the exact weapon name currently equipped in this piece.
  const equippedWeaponName = weaponFields ? frame[weaponFields.weapon] : null;
  const weaponRivens = useMemo(
    () => (equippedWeaponName ? rivens.filter(r => r.weapon_name === equippedWeaponName) : []),
    [rivens, equippedWeaponName]
  );
  const numberedPool = useMemo(
    () => [...ownedMods, ...weaponRivens.map(toRivenPoolItem)],
    [ownedMods, weaponRivens]
  );

  function resolveSlotItem(slot) {
    if (!slot) return null;
    if (slot.riven_id) {
      const riven = rivensById.get(slot.riven_id);
      return riven ? toRivenPoolItem(riven) : null;
    }
    return slot.mod_id ? modsById.get(slot.mod_id) : null;
  }

  function rankForItem(item) {
    if (!item) return 0;
    return item.isRiven ? item.owned_rank : (ownedByModId.get(item.mod_id)?.owned_rank ?? 0);
  }

  function setRankForItem(item, nextRank) {
    if (item.isRiven) onSetRivenRank(item.riven_id, nextRank);
    else onSetRank(item.mod_id, nextRank);
  }

  // Every write here goes straight to my_frames/ability_configs (not the
  // mod tables ModsLoadoutTab already manages locally), so it reports up
  // through onSaved instead -- same refetch-and-flow-back-down path every
  // other frame edit in the app already uses.
  async function saveFrameField(patch) {
    const { error } = await wfUser.from('my_frames').update(patch).eq('my_frame_id', frame.my_frame_id);
    if (error) { console.error('Failed to save loadout field:', error); return; }
    onSaved();
  }

  const [weaponName, setWeaponName] = useDebouncedField(
    weaponFields ? (frame[weaponFields.weapon] ?? '') : '',
    v => saveFrameField({ [weaponFields.weapon]: cleanValue(v) })
  );
  const [weaponArcaneValue, setWeaponArcaneValue] = useDebouncedField(
    weaponFields ? (frame[weaponFields.arcane] ?? '') : '',
    v => saveFrameField({ [weaponFields.arcane]: cleanValue(v) })
  );
  const [arcane1, setArcane1] = useDebouncedField(
    frame.arcane_1 ?? '', v => saveFrameField({ arcane_1: cleanValue(v) })
  );
  const [arcane2, setArcane2] = useDebouncedField(
    frame.arcane_2 ?? '', v => saveFrameField({ arcane_2: cleanValue(v) })
  );
  // Referentially stable across renders unless the arcanes actually
  // change -- required now that WarframeModdedStatsPanel lifts its result
  // up via onResult -> setState; a fresh array literal every render would
  // recompute that result every render, which would re-fire the lift's
  // useEffect every render, which triggers this render again (infinite loop).
  const equippedArcaneNames = useMemo(() => [arcane1, arcane2], [arcane1, arcane2]);

  const otherFrames = frames.filter(f => f.my_frame_id !== frame.my_frame_id);

  async function copyArcaneSetup() {
    if (!arcaneCopyTarget) return;
    setCopyingArcanes(true);

    const { error } = await wfUser
      .from('my_frames')
      .update({ arcane_1: cleanValue(arcane1), arcane_2: cleanValue(arcane2) })
      .eq('my_frame_id', arcaneCopyTarget);

    setCopyingArcanes(false);

    if (error) {
      console.error('Failed to copy arcane setup:', error);
      return;
    }

    onSaved();
  }

  const capacity = pieceCapacity({ hasCatalyst: meta.has_catalyst });

  // Aura/Exilus never hold Rivens (real Rivens only fit the 8 numbered
  // slots), so these stay mod-only.
  const auraSlot = slotsByPosition.get('aura') ?? { mod_id: null, riven_id: null, polarity: null };
  const auraMod = auraSlot.mod_id ? modsById.get(auraSlot.mod_id) : null;
  const auraRank = auraMod ? (ownedByModId.get(auraMod.mod_id)?.owned_rank ?? 0) : 0;
  const auraDrain = auraMod ? effectiveDrain(auraMod, auraRank, auraSlot.polarity, true) : 0;

  const exilusSlot = slotsByPosition.get('exilus') ?? { mod_id: null, riven_id: null, polarity: null };
  const exilusMod = exilusSlot.mod_id ? modsById.get(exilusSlot.mod_id) : null;
  const exilusRank = exilusMod ? (ownedByModId.get(exilusMod.mod_id)?.owned_rank ?? 0) : 0;
  const exilusDrain = exilusMod ? effectiveDrain(exilusMod, exilusRank, exilusSlot.polarity) : 0;

  // Stance is Melee-only, and -- unlike Aura -- costs capacity from the
  // same pool as everything else, same as Exilus.
  const stanceSlot = slotsByPosition.get('stance') ?? { mod_id: null, riven_id: null, polarity: null };
  const stanceMod = stanceSlot.mod_id ? modsById.get(stanceSlot.mod_id) : null;
  const stanceRank = stanceMod ? (ownedByModId.get(stanceMod.mod_id)?.owned_rank ?? 0) : 0;
  const stanceDrain = stanceMod ? effectiveDrain(stanceMod, stanceRank, stanceSlot.polarity) : 0;

  const { used, netCapacity } = useMemo(() => {
    let total = exilusDrain + stanceDrain;
    NUMBERED_SLOTS.forEach(pos => {
      const slot = slotsByPosition.get(pos);
      const item = resolveSlotItem(slot);
      if (!item) return;
      total += effectiveDrain(item, rankForItem(item), slot.polarity);
    });
    // Aura's drain is negative on real aura mods, so subtracting it adds
    // capacity back. Exilus is a real bug fix (2026-08-27): unlike Aura,
    // Exilus does NOT grant free capacity -- confirmed on the wiki and
    // against Patrick's real Vectis Prime (in-game 0/60, Gu was showing
    // 55/60 because Exilus's cost was being excluded from `used`
    // entirely). It's just a 9th slot restricted to Exilus-tagged mods,
    // its cost comes out of the same pool as the other 8.
    return { used: total, netCapacity: capacity - auraDrain };
  }, [slotsByPosition, modsById, rivensById, ownedByModId, capacity, auraDrain, exilusDrain, stanceDrain]);

  const overBudget = used > netCapacity;

  return (
    <Panel accent={accent} className="mb-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: accent }}>{displayName ?? equipmentType}</h3>

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

      {isWarframe && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <WeaponInput
              label="Arcane 1"
              value={arcane1}
              onChange={setArcane1}
              weapons={arcanes}
              slot="Warframe"
              placeholder="Arcane Reaper"
            />
            {arcaneEffectText(arcanes, arcane1) && (
              <p className="text-xs mt-1 leading-snug" style={{ color: COLOR.mutedInk }}>{arcaneEffectText(arcanes, arcane1)}</p>
            )}
          </div>
          <div>
            <WeaponInput
              label="Arcane 2"
              value={arcane2}
              onChange={setArcane2}
              weapons={arcanes}
              slot="Warframe"
              placeholder="Molt Augmented"
            />
            {arcaneEffectText(arcanes, arcane2) && (
              <p className="text-xs mt-1 leading-snug" style={{ color: COLOR.mutedInk }}>{arcaneEffectText(arcanes, arcane2)}</p>
            )}
          </div>

          <div className="sm:col-span-2 rounded-xl p-3" style={{ background: COLOR.surface2, border: `1px solid ${accent}30` }}>
            <p className="text-[10px] uppercase tracking-widest mb-2 font-bold" style={{ color: accent }}>
              Copy Arcane Setup
            </p>
            <div className="flex gap-2">
              <select
                value={arcaneCopyTarget}
                onChange={e => setArcaneCopyTarget(e.target.value)}
                className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
                style={{ background: COLOR.surface1, border: `1px solid ${COLOR.border}`, color: COLOR.ink }}
              >
                <option value="">Select target Warframe...</option>
                {otherFrames.map(f => (
                  <option key={f.my_frame_id} value={f.my_frame_id}>{f.warframe_name}</option>
                ))}
              </select>
              <Button
                variant="primary"
                color={accent}
                onClick={copyArcaneSetup}
                disabled={!arcaneCopyTarget || copyingArcanes}
              >
                Copy
              </Button>
            </div>
          </div>
        </div>
      )}

      {!isWarframe && weaponFields && (
        <div className="space-y-3 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <WeaponInput
                label={`${equipmentType} Weapon`}
                value={weaponName}
                onChange={setWeaponName}
                weapons={weapons}
                slot={equipmentType}
                placeholder={`e.g. ${equipmentType === 'Melee' ? 'Praedos' : 'Torid'}`}
              />
              <IncarnonToggle
                checked={frame[weaponFields.incarnon] ?? false}
                onChange={checked => saveFrameField({ [weaponFields.incarnon]: checked })}
                color={accent}
              />
            </div>

            <div>
              <WeaponInput
                label={`${equipmentType} Arcane`}
                value={weaponArcaneValue}
                onChange={setWeaponArcaneValue}
                weapons={arcanes}
                slot={equipmentType}
                placeholder="e.g. Primary Merciless"
              />
              {arcaneEffectText(arcanes, weaponArcaneValue) && (
                <p className="text-xs mt-1 leading-snug" style={{ color: COLOR.mutedInk }}>{arcaneEffectText(arcanes, weaponArcaneValue)}</p>
              )}
            </div>
          </div>

          {weaponTrait(weapons, frame[weaponFields.weapon]) && (
            <p className="text-xs italic" style={{ color: COLOR.mutedInk }}>
              {weaponTrait(weapons, frame[weaponFields.weapon])}
            </p>
          )}

          <Button variant="info" size="sm" onClick={() => setShowCopyWeapon(true)}>
            Copy Weapon To Other Builds
          </Button>
        </div>
      )}

      {(() => {
        const auraBox = (
          <SlotBox
            label="Aura"
            slot={auraSlot}
            mod={auraMod}
            rank={auraRank}
            cost={auraDrain}
            discounted={isDiscounted(auraMod, auraSlot.polarity, true)}
            description={modDescription(auraMod, auraRank)}
            accent={accent}
            onOpenPicker={() => setPicker({ slotPosition: 'aura', slot: auraSlot })}
            onSetPolarity={polarity => onSetSlot('aura', { mod_id: auraSlot.mod_id, riven_id: null, polarity })}
            onSetRank={nextRank => onSetRank(auraMod.mod_id, nextRank)}
          />
        );

        const stanceBox = (
          <SlotBox
            label="Stance"
            slot={stanceSlot}
            mod={stanceMod}
            rank={stanceRank}
            cost={stanceDrain}
            discounted={isDiscounted(stanceMod, stanceSlot.polarity)}
            description={modDescription(stanceMod, stanceRank)}
            accent={accent}
            onOpenPicker={() => setPicker({ slotPosition: 'stance', slot: stanceSlot })}
            onSetPolarity={polarity => onSetSlot('stance', { mod_id: stanceSlot.mod_id, riven_id: null, polarity })}
            onSetRank={nextRank => onSetRank(stanceMod.mod_id, nextRank)}
          />
        );

        const exilusBox = (
          <SlotBox
            label="Exilus"
            slot={exilusSlot}
            mod={exilusMod}
            rank={exilusRank}
            cost={exilusDrain}
            discounted={isDiscounted(exilusMod, exilusSlot.polarity)}
            description={modDescription(exilusMod, exilusRank)}
            accent={accent}
            onOpenPicker={() => setPicker({ slotPosition: 'exilus', slot: exilusSlot })}
            onSetPolarity={polarity => onSetSlot('exilus', { mod_id: exilusSlot.mod_id, riven_id: null, polarity })}
            onSetRank={nextRank => onSetRank(exilusMod.mod_id, nextRank)}
          />
        );

        const numberedBoxes = NUMBERED_SLOTS.map(pos => {
          const slot = slotsByPosition.get(pos) ?? { mod_id: null, riven_id: null, polarity: null };
          const item = resolveSlotItem(slot);
          const rank = rankForItem(item);
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
              description={modDescription(item, rank)}
              accent={accent}
              onOpenPicker={() => setPicker({ slotPosition: pos, slot, allowRiven: true })}
              onSetPolarity={polarity => onSetSlot(pos, { mod_id: slot.mod_id, riven_id: slot.riven_id, polarity })}
              onSetRank={nextRank => setRankForItem(item, nextRank)}
            />
          );
        });

        // Warframe/Melee: real Arsenal layout -- a top row with the
        // special slot (Aura or Stance) + Exilus centered in the middle
        // two of four columns, then the 8 numbered slots as a 4x2 grid
        // below (Patrick's "2-4-4 formation", confirmed 2026-08-27).
        if (isWarframe || isMelee) {
          return (
            <div className="mb-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                <div className="hidden sm:block" />
                {isWarframe ? auraBox : stanceBox}
                {exilusBox}
                <div className="hidden sm:block" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {numberedBoxes}
              </div>
            </div>
          );
        }

        // Primary/Secondary: real Arsenal layout -- the 8 numbered slots
        // as a 4x2 grid, with Exilus as its own slot to the right,
        // vertically centered against that grid (confirmed 2026-08-27).
        return (
          <div className="flex flex-col sm:flex-row gap-3 mb-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
              {numberedBoxes}
            </div>
            <div className="sm:w-40 sm:flex sm:items-center">
              {exilusBox}
            </div>
          </div>
        );
      })()}

      {isWarframe && (
        <WarframeModdedStatsPanel
          baseStats={warframeStats}
          slotsByPosition={slotsByPosition}
          modsById={modsById}
          ownedByModId={ownedByModId}
          shardBonusTexts={shardBonusTexts}
          equippedArcaneNames={equippedArcaneNames}
          accent={accent}
          onResult={setWarframeStatsResult}
        />
      )}

      {!isWarframe && weaponFields && (
        <WeaponModdedStatsPanel
          weapons={weapons}
          weaponName={equippedWeaponName}
          category={equipmentType}
          slotsByPosition={slotsByPosition}
          modsById={modsById}
          ownedByModId={ownedByModId}
          rivensById={rivensById}
          accent={accent}
        />
      )}

      {picker && (
        <LoadoutSlotPickerModal
          mods={
            picker.slotPosition === 'aura' ? auraMods
              : picker.slotPosition === 'stance' ? stanceMods
              : picker.allowRiven ? numberedPool
              : ownedMods
          }
          category={equipmentType}
          ownedByModId={ownedByModId}
          slotPolarity={picker.slot.polarity}
          onSelect={item => {
            onSetSlot(picker.slotPosition, {
              mod_id: item.riven_id ? null : item.mod_id,
              riven_id: item.riven_id ?? null,
              polarity: picker.slot.polarity,
            });
            setPicker(null);
          }}
          onClear={() => {
            onSetSlot(picker.slotPosition, { mod_id: null, riven_id: null, polarity: picker.slot.polarity });
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
          onCreateRiven={
            picker.allowRiven
              ? () => setRivenEditor({ riven: null, autoEquip: { slotPosition: picker.slotPosition, polarity: picker.slot.polarity } })
              : undefined
          }
          onEditRiven={
            picker.allowRiven
              ? item => setRivenEditor({ riven: rivensById.get(item.riven_id), autoEquip: null })
              : undefined
          }
        />
      )}

      {rivenEditor && (
        <RivenEditorModal
          weaponName={equippedWeaponName}
          category={equipmentType}
          riven={rivenEditor.riven}
          accent={accent}
          onSave={onSaveRiven}
          onDelete={onDeleteRiven}
          onClose={saved => {
            if (saved && rivenEditor.autoEquip) {
              onSetSlot(rivenEditor.autoEquip.slotPosition, {
                mod_id: null,
                riven_id: saved.riven_id,
                polarity: rivenEditor.autoEquip.polarity,
              });
              setPicker(null);
            }
            setRivenEditor(null);
          }}
        />
      )}

      {isWarframe && (
        <AbilitiesEditor
          frame={frame}
          onSaved={onSaved}
          color={accent}
          abilityCanonicalByName={abilityCanonicalByName}
          buildStats={warframeStatsResult}
          key={frame.my_frame_id}
        />
      )}

      {showCopyWeapon && weaponFields && (
        <CopyWeaponModal
          frame={frame}
          frames={frames}
          sourceWeapons={{
            primary: { name: frame.primary_weapon, incarnon: frame.primary_is_incarnon },
            secondary: { name: frame.secondary_weapon, incarnon: frame.secondary_is_incarnon },
            melee: { name: frame.melee_weapon, incarnon: frame.melee_is_incarnon },
          }}
          onClose={() => setShowCopyWeapon(false)}
          onCopied={() => {
            setShowCopyWeapon(false);
            onSaved();
          }}
        />
      )}
    </Panel>
  );
}
