// Real Riven stat pools, pulled directly from WFCD's warframe-items source
// (data/json/{Rifle,Shotgun,Pistol,Melee}RivenMod.json `upgradeEntries`)
// rather than guessed -- each entry's `tag` is the game's own internal
// identifier, `label` is the cleaned display text (WFCD's locTag stripped
// of `<DT_*_COLOR>` markup and the `|val|` placeholder), `unit` is what to
// print after the number when composing a stat line.
//
// Primary and Secondary share effectively the same pool in-game (Rifle,
// Shotgun, Pistol, and Kitgun Riven templates differ only by Zoom being
// absent from Shotgun) -- rather than track that one exception, both use
// the same superset here, since offering an extra option a given weapon
// subtype can't actually roll is harmless, unlike missing a real one.
const WEAPON_STATS = [
  { tag: 'WeaponDamageAmountMod', label: 'Damage', unit: '%' },
  { tag: 'WeaponCritChanceMod', label: 'Critical Chance', unit: '%' },
  { tag: 'WeaponCritDamageMod', label: 'Critical Damage', unit: '%' },
  { tag: 'WeaponStunChanceMod', label: 'Status Chance', unit: '%' },
  { tag: 'WeaponProcTimeMod', label: 'Status Duration', unit: '%' },
  { tag: 'WeaponFireIterationsMod', label: 'Multishot', unit: '%' },
  { tag: 'WeaponFireRateMod', label: 'Fire Rate', unit: '%' },
  { tag: 'WeaponClipMaxMod', label: 'Magazine Capacity', unit: '%' },
  { tag: 'WeaponAmmoMaxMod', label: 'Ammo Maximum', unit: '%' },
  { tag: 'WeaponReloadSpeedMod', label: 'Reload Speed', unit: '%' },
  { tag: 'WeaponRecoilReductionMod', label: 'Weapon Recoil', unit: '%' },
  { tag: 'WeaponZoomFovMod', label: 'Zoom', unit: '%' },
  { tag: 'WeaponProjectileSpeedMod', label: 'Projectile Speed', unit: '%' },
  { tag: 'WeaponPunctureDepthMod', label: 'Punch Through', unit: '' },
  { tag: 'WeaponImpactDamageMod', label: 'Impact', unit: '%' },
  { tag: 'WeaponArmorPiercingDamageMod', label: 'Puncture', unit: '%' },
  { tag: 'WeaponSlashDamageMod', label: 'Slash', unit: '%' },
  { tag: 'WeaponFireDamageMod', label: 'Heat', unit: '%' },
  { tag: 'WeaponFreezeDamageMod', label: 'Cold', unit: '%' },
  { tag: 'WeaponElectricityDamageMod', label: 'Electricity', unit: '%' },
  { tag: 'WeaponToxinDamageMod', label: 'Toxin', unit: '%' },
  { tag: 'WeaponFactionDamageCorpus', label: 'Damage to Corpus', unit: '%' },
  { tag: 'WeaponFactionDamageGrineer', label: 'Damage to Grineer', unit: '%' },
  { tag: 'WeaponFactionDamageInfested', label: 'Damage to Infested', unit: '%' },
];

const MELEE_STATS = [
  { tag: 'WeaponMeleeDamageMod', label: 'Melee Damage', unit: '%' },
  { tag: 'WeaponCritChanceMod', label: 'Critical Chance', unit: '%' },
  { tag: 'WeaponCritDamageMod', label: 'Critical Damage', unit: '%' },
  { tag: 'WeaponStunChanceMod', label: 'Status Chance', unit: '%' },
  { tag: 'WeaponProcTimeMod', label: 'Status Duration', unit: '%' },
  { tag: 'WeaponFireRateMod', label: 'Attack Speed', unit: '%' },
  { tag: 'WeaponMeleeRangeIncMod', label: 'Range', unit: '' },
  { tag: 'WeaponMeleeComboEfficiencyMod', label: 'Heavy Attack Efficiency', unit: '%' },
  { tag: 'WeaponMeleeFinisherDamageMod', label: 'Finisher Damage', unit: '%' },
  { tag: 'ComboDurationMod', label: 'Combo Duration', unit: 's' },
  { tag: 'WeaponMeleeComboInitialBonusMod', label: 'Initial Combo', unit: '' },
  { tag: 'WeaponMeleeComboBonusOnHitMod', label: 'Additional Combo Count Chance', unit: '%' },
  { tag: 'WeaponMeleeComboPointsOnHitMod', label: 'Chance to Gain Combo Count', unit: '%' },
  { tag: 'SlideAttackCritChanceMod', label: 'Critical Chance for Slide Attack', unit: '%' },
  { tag: 'WeaponImpactDamageMod', label: 'Impact', unit: '%' },
  { tag: 'WeaponArmorPiercingDamageMod', label: 'Puncture', unit: '%' },
  { tag: 'WeaponSlashDamageMod', label: 'Slash', unit: '%' },
  { tag: 'WeaponFireDamageMod', label: 'Heat', unit: '%' },
  { tag: 'WeaponFreezeDamageMod', label: 'Cold', unit: '%' },
  { tag: 'WeaponElectricityDamageMod', label: 'Electricity', unit: '%' },
  { tag: 'WeaponToxinDamageMod', label: 'Toxin', unit: '%' },
  { tag: 'WeaponMeleeFactionDamageCorpus', label: 'Damage to Corpus', unit: '%' },
  { tag: 'WeaponMeleeFactionDamageGrineer', label: 'Damage to Grineer', unit: '%' },
  { tag: 'WeaponMeleeFactionDamageInfested', label: 'Damage to Infested', unit: '%' },
];

export const RIVEN_STATS_BY_CATEGORY = {
  Primary: WEAPON_STATS,
  Secondary: WEAPON_STATS,
  Melee: MELEE_STATS,
};

// Confirmed against wiki.warframe.com/w/Riven_Mods 2026-08-27: these can
// only ever roll as a positive trait -- everything else can go either way.
export const POSITIVE_ONLY_TAGS = new Set([
  'WeaponFireDamageMod', // Heat
  'WeaponFreezeDamageMod', // Cold
  'WeaponElectricityDamageMod', // Electricity
  'WeaponToxinDamageMod', // Toxin
  'WeaponPunctureDepthMod', // Punch Through
  'WeaponProjectileSpeedMod', // Projectile Speed
  'WeaponMeleeRangeIncMod', // Range
  'ComboDurationMod', // Combo Duration
  'WeaponMeleeComboInitialBonusMod', // Initial Combo
  'WeaponMeleeComboBonusOnHitMod', // Additional Combo Count Chance
  'SlideAttackCritChanceMod', // Critical Chance for Slide Attack
  'WeaponMeleeFinisherDamageMod', // Finisher Damage
]);

export function statsForCategory(category) {
  return RIVEN_STATS_BY_CATEGORY[category] ?? [];
}

export function isPositiveOnly(tag) {
  return POSITIVE_ONLY_TAGS.has(tag);
}

// Composes a stat line the same way it's stored/displayed elsewhere in the
// app (e.g. "+180% Multishot", "-25% Weapon Recoil") from structured input.
export function formatRivenStat(tag, sign, value, category) {
  const stat = statsForCategory(category).find(s => s.tag === tag);
  if (!stat || value === '' || value == null) return null;
  return `${sign}${value}${stat.unit} ${stat.label}`;
}

// Reverses formatRivenStat for editing an existing Riven -- best-effort
// match against the known stat labels for that category, since these are
// plain text columns (no structured storage, see RivenEditorModal). The
// sign is optional in the text (older/hand-typed entries from before this
// dropdown UI existed have no leading +/-, e.g. "170.3% Damage") --
// defaults to positive rather than failing to parse, since a failed parse
// here means the edit form silently blanks a real stat on save.
export function parseRivenStat(text, category) {
  if (!text) return null;
  const match = text.match(/^([+-])?([\d.]+)(%|s|m)?\s+(.+)$/);
  if (!match) return null;
  const [, sign, value, , label] = match;
  const stat = statsForCategory(category).find(s => s.label === label);
  if (!stat) return null;
  return { tag: stat.tag, sign: sign ?? '+', value };
}
