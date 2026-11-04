import { useMemo, useEffect } from 'react';
import Panel from './ui/Panel';
import { computeModdedWarframeStats } from '../utils/survivability';
import { COLOR } from '../constants/theme';
import { formatNumber } from '../utils/formatNumber';

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

// Two groups, like the game's own upgrade screen: survival numbers first,
// then the four ability stats that drive every ability (and the forecaster).
const STAT_GROUPS = [
  {
    title: 'Survival',
    rows: [
      { key: 'health', label: 'Health', format: formatNumber },
      { key: 'shield', label: 'Shield', format: formatNumber },
      { key: 'armor', label: 'Armor', format: formatNumber },
      { key: 'energy', label: 'Energy', format: formatNumber },
      { key: 'sprintSpeed', label: 'Sprint Speed', format: v => `${formatNumber(v)}x` },
    ],
  },
  {
    title: 'Abilities',
    rows: [
      { key: 'abilityDuration', label: 'Duration', format: v => `${formatNumber(v)}%` },
      { key: 'abilityEfficiency', label: 'Efficiency', format: v => `${formatNumber(v)}%` },
      { key: 'abilityRange', label: 'Range', format: v => `${formatNumber(v)}%` },
      { key: 'abilityStrength', label: 'Strength', format: v => `${formatNumber(v)}%` },
    ],
  },
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
  equippedArcaneNames,
  accent,
  onResult,
}) {
  const equippedMods = useMemo(
    () => resolveEquippedMods(slotsByPosition, modsById, ownedByModId),
    [slotsByPosition, modsById, ownedByModId]
  );

  const result = useMemo(() => {
    if (!baseStats) return null;
    return computeModdedWarframeStats({ baseStats, equippedMods, shardBonusTexts, equippedArcaneNames });
  }, [baseStats, equippedMods, shardBonusTexts, equippedArcaneNames]);

  // Lifts the already-computed result up to the parent (LoadoutEquipmentSection)
  // so AbilitiesEditor can reuse the same Duration/Efficiency/Range/Strength/
  // Armor instead of resolving equipped mods and recomputing a second time.
  useEffect(() => {
    onResult?.(result);
  }, [result, onResult]);

  if (!result) {
    return (
      <Panel accent={accent} className="mb-6">
        <p className="text-sm" style={{ color: COLOR.mutedInk }}>No base stats on file for this Warframe yet.</p>
      </Panel>
    );
  }

  return (
    <Panel accent={accent} className="mb-6">
      <h3 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: accent }}>Stats</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
        {STAT_GROUPS.map(group => (
          <div key={group.title}>
            <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: COLOR.mutedInk }}>{group.title}</p>
            {group.rows.map(row => (
              <div
                key={row.key}
                className="flex items-baseline justify-between py-1.5 border-b"
                style={{ borderColor: COLOR.border }}
              >
                <span className="text-sm" style={{ color: COLOR.mutedInk }}>{row.label}</span>
                <span className="text-base font-bold tabular-nums" style={{ color: COLOR.ink }}>{row.format(result[row.key])}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Panel>
  );
}
