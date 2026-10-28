// Auto-derived tags for the Armory, computed from wf_base.weapons.raw_json.
// Thresholds are judgment calls set near the top quartile (or bottom, for
// "Slow"/"Low") of the live weapon data, not official game tiers -- adjust
// here if a threshold reads wrong in practice. A weapon carries many tags;
// they are not mutually exclusive.
//
// Each tag belongs to a group so the Armory can show the filter chips under
// headings (Type / Stats / Element / Special).
//
// raw_json units: criticalChance and procChance are fractions (0.25 = 25%),
// criticalMultiplier is a plain multiplier, reloadTime is seconds, and for
// melee fireRate is the attack speed.

export const TAG_GROUPS = ['Type', 'Stats', 'Element', 'Special'];

const ELEMENT_KEYS = {
  heat: 'Heat', cold: 'Cold', electricity: 'Electricity', toxin: 'Toxin',
  blast: 'Blast', radiation: 'Radiation', gas: 'Gas', magnetic: 'Magnetic',
  viral: 'Viral', corrosive: 'Corrosive', void: 'Void',
};

const GUN_STAT_RULES = [
  { tag: 'High Fire Rate', test: rj => rj.fireRate >= 8 },
  { tag: 'Low Fire Rate', test: rj => rj.fireRate > 0 && rj.fireRate <= 2 },
  { tag: 'Fast Reload', test: rj => rj.reloadTime > 0 && rj.reloadTime <= 1.5 },
  { tag: 'Slow Reload', test: rj => rj.reloadTime >= 2.5 },
  { tag: 'High Crit Chance', test: rj => rj.criticalChance >= 0.25 },
  { tag: 'High Crit Damage', test: rj => rj.criticalMultiplier >= 2.5 },
  { tag: 'High Status Chance', test: rj => rj.procChance >= 0.25 },
];

const MELEE_STAT_RULES = [
  { tag: 'Fast Attack Speed', test: rj => rj.fireRate >= 1.1 },
  { tag: 'Slow Attack Speed', test: rj => rj.fireRate > 0 && rj.fireRate <= 0.8 },
  { tag: 'Long Range', test: rj => rj.range >= 2.7 },
  { tag: 'High Crit Chance', test: rj => rj.criticalChance >= 0.25 },
  { tag: 'High Crit Damage', test: rj => rj.criticalMultiplier >= 2.5 },
  { tag: 'High Status Chance', test: rj => rj.procChance >= 0.25 },
];

// A weapon is Incarnon-capable if the catalog flags it natively (Praedos,
// Laetum...) or any of its listed attacks is an Incarnon Form.
export function isIncarnon(weapon) {
  const rj = weapon?.raw_json;
  if (!rj) return false;
  if (rj.native_incarnon) return true;
  return (rj.attacks || []).some(a => /incarnon/i.test(a?.name ?? ''));
}

function safe(test, rj) {
  try {
    return Boolean(test(rj));
  } catch {
    return false;
  }
}

// [{ tag, group }] for one weapon, in display order.
export function getWeaponTagEntries(weapon) {
  const rj = weapon?.raw_json;
  if (!rj) return [];

  const isMelee = weapon.category === 'Melee';
  const entries = [];

  // Type: the weapon class, plus Beam (held-trigger) and Charge for guns.
  const type = rj.type ?? weapon.weapon_type;
  if (type) entries.push({ tag: type, group: 'Type' });
  if (!isMelee && rj.trigger === 'Held') entries.push({ tag: 'Beam', group: 'Type' });
  if (!isMelee && (rj.trigger === 'Charge' || (rj.attacks || []).some(a => a?.charge_time > 0))) {
    entries.push({ tag: 'Charge', group: 'Type' });
  }

  const rules = isMelee ? MELEE_STAT_RULES : GUN_STAT_RULES;
  rules.filter(r => safe(r.test, rj)).forEach(r => entries.push({ tag: r.tag, group: 'Stats' }));

  // Innate elements: any non-physical damage type in the base damage.
  const dmg = rj.damage || {};
  const elements = Object.entries(ELEMENT_KEYS).filter(([k]) => dmg[k] > 0).map(([, label]) => label);
  if (elements.length > 0) {
    entries.push({ tag: 'Innate Element', group: 'Element' });
    elements.forEach(label => entries.push({ tag: label, group: 'Element' }));
  }

  if (isIncarnon(weapon)) entries.push({ tag: 'Incarnon', group: 'Special' });

  return entries;
}

export function getWeaponTags(weapon) {
  return getWeaponTagEntries(weapon).map(e => e.tag);
}
