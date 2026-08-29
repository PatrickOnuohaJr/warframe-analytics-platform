import { useMemo } from 'react';
import Panel from './ui/Panel';
import { computeModdedWarframeStats } from '../utils/survivability';
import { COLOR } from '../constants/theme';

const NUMBERED_SLOTS = ['1', '2', '3', '4', '5', '6', '7', '8'];
const SPECIAL_SLOTS = ['aura', 'exilus'];

// Warframe slots never hold Rivens (weapon-only, see
// LoadoutEquipmentSection.jsx), so a plain mod_id lookup is always enough.
function resolveEquippedMods(slotsByPosition, modsById, ownedByModId) {
  const equipped = [];
  [...NUMBERED_SLOTS, ...SPECIAL_SLOTS].forEach(pos => {
    const slot = slotsByPosition?.get(pos);
    if (!slot?.mod_id) return;
    const mod = modsById.get(slot.mod_id);
    if (!mod) return;
    equipped.push({ mod, rank: ownedByModId.get(mod.mod_id)?.owned_rank ?? 0 });
  });
  return equipped;
}

const TILES = [
  { key: 'health', label: 'Health', format: v => v },
  { key: 'shield', label: 'Shield', format: v => v },
  { key: 'armor', label: 'Armor', format: v => v },
  { key: 'energy', label: 'Energy', format: v => v },
  { key: 'sprintSpeed', label: 'Sprint Speed', format: v => `${v}x` },
  { key: 'abilityDuration', label: 'Ability Duration', format: v => `${v}%` },
  { key: 'abilityEfficiency', label: 'Ability Efficiency', format: v => `${v}%` },
  { key: 'abilityRange', label: 'Ability Range', format: v => `${v}%` },
  { key: 'abilityStrength', label: 'Ability Strength', format: v => `${v}%` },
];

// Live "modded stats" panel for the Warframe Loadout tab -- shows this
// build's current stat totals right where mods get slotted (Patrick's
// explicit ask: see a stat move the moment a mod goes on, same as the
// real game's Arsenal, not on a separate tab). See
// utils/survivability.js's computeModdedWarframeStats header comment for
// exactly which mod/shard text is counted and why.
export default function WarframeModdedStatsPanel({
  baseStats,
  slotsByPosition,
  modsById,
  ownedByModId,
  shardBonusTexts,
  accent,
}) {
  const equippedMods = useMemo(
    () => resolveEquippedMods(slotsByPosition, modsById, ownedByModId),
    [slotsByPosition, modsById, ownedByModId]
  );

  const result = useMemo(() => {
    if (!baseStats) return null;
    return computeModdedWarframeStats({ baseStats, equippedMods, shardBonusTexts });
  }, [baseStats, equippedMods, shardBonusTexts]);

  if (!result) {
    return (
      <Panel accent={accent} className="mb-6">
        <p className="text-sm" style={{ color: COLOR.mutedInk }}>No base stats on file for this Warframe yet.</p>
      </Panel>
    );
  }

  return (
    <Panel accent={accent} className="mb-6">
      <h3 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: accent }}>Modded Stats</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {TILES.map(tile => (
          <div
            key={tile.key}
            className="rounded-xl p-3"
            style={{ background: COLOR.surface2, border: `1px solid ${COLOR.border}` }}
          >
            <p className="text-[9px] uppercase tracking-widest mb-1" style={{ color: COLOR.mutedInk }}>{tile.label}</p>
            <p className="text-lg font-black" style={{ color: COLOR.ink }}>{tile.format(result[tile.key])}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}
