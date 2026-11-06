import { MELEE_STANCE_CLASS } from '../constants/meleeStanceClass';

// Which stance families can this melee weapon use? Returns an array of the
// names stance mods use (e.g. ['Dual Daggers']), or null when we don't know
// the weapon (Zaws, brand-new weapons, nothing equipped).
export function stanceFamiliesFor(weaponName) {
  if (!weaponName) return null;
  const value = MELEE_STANCE_CLASS[weaponName];
  if (!value) return null;
  return Array.isArray(value) ? value : [value];
}

// Narrow a list of stance mods to the ones the equipped weapon can actually
// use. Fails OPEN: if the weapon's family is unknown, or a stance has no
// family on record, it stays in the list -- hiding a usable stance is worse
// than showing a spare one.
export function stancesForWeapon(stanceMods, weaponName) {
  const families = stanceFamiliesFor(weaponName);
  if (!families) return stanceMods;
  return stanceMods.filter(mod => {
    const family = mod.raw_json?.compatName ?? mod.compat_name;
    return !family || families.includes(family);
  });
}
