// Pure logic for copying a Companion / Companion Weapon loadout onto another
// config or build. Kept out of the component so the "which mods may the
// target take" rules are unit-testable.
//
// wf_base.mods.compat_name (WFCD's compatName) is either a universal bucket
// or a named exclusive:
//   COMPANION            any companion
//   ROBOTIC, Sentinel    sentinels, Moas and Hounds (all robotic)
//   BEAST                every beast (Kubrow/Kavat/Predasite/Vulpaphyla/Charger)
//   Kubrow, Kavat, PREDASITE, VULPAPHYLA   one beast breed
//   Moa, Hound           that robotic type's own precepts
//   <name>               one companion ("Wyrm", "Smeeta Kavat", ...)
// and, for Companion Weapons only (all Claws-family):
//   Claws                any beast claws
//   Kubrow Claws / Kavat Claws / Helminth Claws   that breed's claws only
// Sentinel weapons have no mods in the catalog, so they take nothing.

export const CONFIG_SLOTS = ['A', 'B', 'C'];

// companion_class -> the breed bucket name WFCD uses for it.
const BREED_BUCKET = {
  kubrow: 'kubrow',
  kavat: 'kavat',
  predasite: 'predasite',
  vulpaphyla: 'vulpaphyla',
  helminth_charger: 'helminth charger',
};

const ROBOTIC_CLASSES = new Set(['sentinel', 'moa', 'hound']);

// "Wyrm Prime" / "Prisma Shade" -> "wyrm" / "shade": mods name the base
// sentinel, and the Prime/Prisma variants take the same ones.
function baseName(name) {
  return String(name ?? '').replace(/^Prisma /i, '').replace(/ Prime$/i, '').trim().toLowerCase();
}

// target = { name, kind: 'class' value from wf_base.companions /
// companion_weapons }. Returns true/false, or null when the target's class
// is unknown (caller should refuse rather than guess).
export function isModCompatible(mod, equipmentType, target) {
  if (!mod || !target?.name || !target?.cls) return null;
  const compat = String(mod.compat_name ?? '').trim().toLowerCase();

  if (equipmentType === 'CompanionWeapon') {
    if (target.cls !== 'claws') return false; // sentinel weapons take no catalog mods
    if (!compat || compat === 'claws') return true;
    // Breed-exclusive claws: "kubrow claws" must match the weapon "Kubrow Claws".
    return compat === String(target.name).trim().toLowerCase();
  }

  // Companion body.
  if (!compat || compat === 'companion') return true;
  // Robotic companions: Sentinels, Moas and Hounds share the ROBOTIC and
  // Sentinel pools; each adds its own exclusives (a Sentinel by name, a Moa or
  // Hound by type).
  if (ROBOTIC_CLASSES.has(target.cls)) {
    return compat === 'robotic' || compat === 'sentinel' || compat === target.cls || compat === baseName(target.name);
  }
  const bucket = BREED_BUCKET[target.cls];
  if (!bucket) return null;
  return compat === 'beast' || compat === bucket || compat === String(target.name).trim().toLowerCase();
}

// Numbered slots a target has: any companion (Sentinel or beast) 10, any
// Companion Weapon 8 plus Posture.
export function numberedSlotCount(equipmentType) {
  return equipmentType === 'Companion' ? 10 : 8;
}

// source: [{ slot_position, mod_id, polarity }] rows of one config.
// Returns { copy: rows to write, skipped: [{ slot_position, mod_id, name }] }.
// A slot with no mod still copies (polarity from forma is part of the build);
// a slot whose mod the target can't take is skipped entirely and left empty
// but keeps its polarity.
export function planCopy(source, modsById, equipmentType, target) {
  const copy = [];
  const skipped = [];

  const slotCount = numberedSlotCount(equipmentType);

  for (const row of source) {
    // A numbered slot the target doesn't have (a companion's 9/10 onto a Companion Weapon -- never happens in practice).
    const n = Number(row.slot_position);
    if (Number.isInteger(n) && n > slotCount) {
      const lost = row.mod_id ? modsById.get(row.mod_id) : null;
      if (lost) skipped.push({ slot_position: row.slot_position, mod_id: row.mod_id, name: `${lost.name} (no slot ${n})` });
      continue;
    }
    const mod = row.mod_id ? modsById.get(row.mod_id) : null;
    if (mod && isModCompatible(mod, equipmentType, target) !== true) {
      skipped.push({ slot_position: row.slot_position, mod_id: row.mod_id, name: mod.name });
      copy.push({ slot_position: row.slot_position, mod_id: null, polarity: row.polarity ?? null });
      continue;
    }
    copy.push({ slot_position: row.slot_position, mod_id: row.mod_id ?? null, polarity: row.polarity ?? null });
  }

  return { copy, skipped };
}
