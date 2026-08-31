import { useMemo } from 'react';
import Panel from './ui/Panel';
import { extractBaseWeaponStats, computeModdedWeaponStats } from '../utils/weaponStats';
import { weaponByName } from '../utils/weaponMeta';
import { COLOR } from '../constants/theme';

const NUMBERED_SLOTS = ['1', '2', '3', '4', '5', '6', '7', '8'];

// Primary/Secondary: numbered slots + Exilus. Melee: same plus Stance --
// included for completeness even though real Stance mods are moveset
// unlocks, not stat bonuses, so they're expected to just never match any
// pattern in weaponStats.js.
function slotPositionsFor(category) {
  return category === 'Melee' ? [...NUMBERED_SLOTS, 'exilus', 'stance'] : [...NUMBERED_SLOTS, 'exilus'];
}

function resolveEquippedWeaponItems(slotsByPosition, modsById, ownedByModId, rivensById, positions) {
  const mods = [];
  const rivens = [];

  positions.forEach(pos => {
    const slot = slotsByPosition?.get(pos);
    if (!slot) return;

    if (slot.riven_id) {
      const riven = rivensById.get(slot.riven_id);
      if (riven) rivens.push(riven);
      return;
    }

    if (slot.mod_id) {
      const mod = modsById.get(slot.mod_id);
      if (mod) mods.push({ mod, rank: ownedByModId.get(mod.mod_id)?.owned_rank ?? 0 });
    }
  });

  return { mods, rivens };
}

const GUN_TILES = [
  { key: 'fireRate', label: 'Fire Rate', format: v => (v == null ? '—' : `${v}/s`) },
  { key: 'magazineSize', label: 'Magazine', format: v => (v == null ? '—' : v) },
  { key: 'reloadTime', label: 'Reload', format: v => (v == null ? '—' : `${v}s`) },
  { key: 'criticalChance', label: 'Crit Chance', format: v => (v == null ? '—' : `${v}%`) },
  { key: 'criticalMultiplier', label: 'Crit Damage', format: v => (v == null ? '—' : `${v}%`) },
  { key: 'procChance', label: 'Status Chance', format: v => (v == null ? '—' : `${v}%`) },
  { key: 'punchThrough', label: 'Punch Through', format: v => (v == null ? '—' : v) },
  { key: 'multishot', label: 'Multishot', format: v => (v == null ? '—' : v) },
];

const MELEE_TILES = [
  { key: 'fireRate', label: 'Attack Speed', format: v => (v == null ? '—' : v) },
  { key: 'damage', label: 'Damage', format: v => (v == null ? '—' : v) },
  { key: 'criticalChance', label: 'Crit Chance', format: v => (v == null ? '—' : `${v}%`) },
  { key: 'criticalMultiplier', label: 'Crit Damage', format: v => (v == null ? '—' : `${v}%`) },
  { key: 'procChance', label: 'Status Chance', format: v => (v == null ? '—' : `${v}%`) },
  { key: 'range', label: 'Range', format: v => (v == null ? '—' : `${v}m`) },
];

// Live "modded stats" panel for a weapon Loadout piece -- same idea as
// WarframeModdedStatsPanel, resolving its own equipped mods/Rivens off the
// slot props every other piece of this tab already receives. See
// utils/weaponStats.js's header comment for exactly which base fields and
// mod/Riven text are counted.
export default function WeaponModdedStatsPanel({
  weapons,
  weaponName,
  category,
  slotsByPosition,
  modsById,
  ownedByModId,
  rivensById,
  accent,
}) {
  const weaponRow = useMemo(() => weaponByName(weapons, weaponName), [weapons, weaponName]);
  const baseStats = useMemo(() => (weaponRow ? extractBaseWeaponStats(weaponRow) : null), [weaponRow]);

  const { mods: equippedMods, rivens: equippedRivens } = useMemo(
    () => resolveEquippedWeaponItems(slotsByPosition, modsById, ownedByModId, rivensById, slotPositionsFor(category)),
    [slotsByPosition, modsById, ownedByModId, rivensById, category]
  );

  const result = useMemo(() => {
    if (!baseStats) return null;
    return computeModdedWeaponStats({ baseStats, equippedMods, equippedRivens, category });
  }, [baseStats, equippedMods, equippedRivens, category]);

  if (!weaponName) return null;

  if (!result) {
    return (
      <Panel accent={accent} className="mb-6">
        <p className="text-sm" style={{ color: COLOR.mutedInk }}>No base stats on file for this weapon.</p>
      </Panel>
    );
  }

  const tiles = category === 'Melee' ? MELEE_TILES : GUN_TILES;

  return (
    <Panel accent={accent} className="mb-6">
      <h3 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: accent }}>Stats</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {tiles.map(tile => (
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
