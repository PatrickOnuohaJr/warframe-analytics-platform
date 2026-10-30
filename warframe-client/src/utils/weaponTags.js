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

export const TAG_GROUPS = ['Type', 'Stats', 'Element', 'Special', 'Custom'];

// Starting ideas offered when adding a custom tag; anything typed is allowed.
export const SUGGESTED_CUSTOM_TAGS = [
  'Punch Through', 'Hip-Fire', 'Crowd Control', 'Boss Killer', 'Setup Weapon',
  'Ammo Hungry', 'Sniper Play', 'Close Range', 'Mid Range', 'Long Range Play',
];

// Layers the user's saved changes (wf_user.weapon_tags rows: { tag, hidden })
// over the automatic entries: hidden rows switch an automatic tag off, the
// rest are added as Custom tags.
export function applyCustomTags(entries, rows = []) {
  const hidden = new Set(rows.filter(r => r.hidden).map(r => r.tag));
  const kept = entries.filter(e => !hidden.has(e.tag));
  const have = new Set(kept.map(e => e.tag));
  const custom = rows
    .filter(r => !r.hidden && !have.has(r.tag))
    .map(r => ({ tag: r.tag, group: 'Custom' }));
  return [...kept, ...custom];
}

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

// Weapon families identified by name prefix.
const ORIGIN_TAGS = [
  { tag: 'Kuva', test: /^Kuva /i },
  { tag: 'Tenet', test: /^Tenet /i },
  { tag: 'Coda', test: /(^|\s)Coda(\s|$)/i },
];

// Weapons that have an Incarnon Genesis adapter, read from the catalog's own
// "<name> Incarnon Genesis" rows. The weapon's raw data only lists Incarnon
// forms for guns (no melee ever does), so this list is what lets melees and
// the odd missed variant be recognised.
const INCARNON_BASES = [
  'Boar', 'Boltor', 'Braton', 'Burston', 'Dera', 'Dread', 'Gorgon', 'Latron', 'Miter', 'Paris',
  'Soma', 'Strun', 'Sybaris', 'Torid', 'Angstrum', 'Atomos', 'Bronco', 'Cestra', 'Despair',
  'Dual Toxocyst', 'Furis', 'Gammacor', 'Kunai', 'Lato', 'Lex', 'Sicarus', 'Vasto', 'Zylok',
  'Ack & Brunt', 'Anku', 'Bo', 'Ceramic Dagger', 'Dual Ichor', 'Furax', 'Hate', 'Magistar',
  'Nami Solo', 'Okina', 'Sibear', 'Skana',
];
// The base weapon plus its Prime / Vandal / Wraith / faction / Mk1 / Prisma
// variants. None of the base names contain a regex metacharacter except the
// "&" in "Ack & Brunt", which is literal in a regex anyway.
const INCARNON_NAME_RE = new RegExp(
  '^(Prisma |Mk1-|Dex |Synoid |Telos |Rakta |Vaykor |Sancti |Secura )?(' +
  INCARNON_BASES.join('|') +
  ')( Prime| Vandal| Wraith)?$'
);

// A weapon is Incarnon-capable if the catalog flags it natively (Praedos,
// Laetum...), any of its listed attacks is an Incarnon Form, or it has a
// Genesis adapter (INCARNON_BASES above).
export function isIncarnon(weapon) {
  const rj = weapon?.raw_json;
  if (!rj) return false;
  if (INCARNON_NAME_RE.test(weapon.name ?? '')) return true;
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

  // Lich / Sister / Infested-Coda origin, read off the name ("Kuva Karak",
  // "Tenet Envoy", "Coda Hirudo", "Dual Coda Torxica").
  const origin = ORIGIN_TAGS.find(o => o.test.test(weapon.name ?? ''));
  if (origin) entries.push({ tag: origin.tag, group: 'Special' });

  return entries;
}

export function getWeaponTags(weapon) {
  return getWeaponTagEntries(weapon).map(e => e.tag);
}
