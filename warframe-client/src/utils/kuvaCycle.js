import { KUVA_WEAPON_NAMES } from '../constants/kuvaWeapons';

// Kuva Larvling weapon cycle (wiki.warframe.com, Kuva Larvling / Kuva Lich):
//  - If you ignore a Larvling and FINISH the mission, the weapon it showed goes
//    on a reject list and will not show on later Larvlings until every other
//    Kuva weapon has been cycled.
//  - Aborting or extracting early does NOT remove the weapon from the pool.
//  - The list resets when you accept a weapon (take the Lich), when the chosen
//    adversary is converted or vanquished, or when all weapons have cycled.
// State is { rejected: string[], target: string | null, currentLich: string | null }:
// the reject list, the weapon being hunted, and the weapon of the Lich that is
// currently taking your slot. Everything else is derived. Functions return new
// objects and never change their input.

export const emptyCycle = () => ({ rejected: [], target: null, currentLich: null });

// Finished the mission without taking this weapon. Returns { state, reset }:
// reset is true when this was the last one and the list started over.
export function rejectWeapon(state, weapon, weapons = KUVA_WEAPON_NAMES) {
  if (!weapons.includes(weapon) || state.rejected.includes(weapon)) return { state, reset: false };
  const rejected = [...state.rejected, weapon];
  if (rejected.length >= weapons.length) return { state: { ...state, rejected: [] }, reset: true };
  return { state: { ...state, rejected }, reset: false };
}

// Tapped by mistake (or the mission was not actually finished).
export const unrejectWeapon = (state, weapon) => (
  state.rejected.includes(weapon) ? { ...state, rejected: state.rejected.filter(w => w !== weapon) } : state
);

// Took this weapon (accepted the Lich): the reject list resets and that Lich is
// now the current one. If it was the weapon being hunted, the hunt is over.
export const takeWeapon = (state, weapon, weapons = KUVA_WEAPON_NAMES) => (
  weapons.includes(weapon)
    ? { rejected: [], target: state.target === weapon ? null : state.target, currentLich: weapon }
    : state
);

// The current Lich was converted or vanquished: the slot is free again and the
// reject list resets (wiki: the list clears when the adversary is converted or
// vanquished).
export const finishLich = state => ({ ...state, rejected: [], currentLich: null });

export const setTarget = (state, target) => ({ ...state, target: target || null });

export const poolOf = (state, weapons = KUVA_WEAPON_NAMES) => weapons.filter(w => !state.rejected.includes(w));

// What the cycle says about the weapon being hunted.
//   none     no target chosen
//   possible target is still in the pool: `remaining` weapons can show, so it
//            shows within `remaining` finished missions at worst; `chance` is
//            1/remaining ONLY if the game picks evenly (the wiki does not say)
//   cycled   target is on the reject list: `missionsUntilReset` more finished
//            missions (each showing a different weapon) until the list resets
export function huntOdds(state, weapons = KUVA_WEAPON_NAMES) {
  const { target } = state;
  if (!target || !weapons.includes(target)) return { status: 'none' };
  const pool = poolOf(state, weapons);
  if (state.rejected.includes(target)) {
    return { status: 'cycled', missionsUntilReset: pool.length };
  }
  return { status: 'possible', remaining: pool.length, chance: 1 / pool.length, worstCase: pool.length };
}

// Problems with a saved state (empty means fine). Used before saving.
export function validateCycle(state, weapons = KUVA_WEAPON_NAMES) {
  const errors = [];
  if (!Array.isArray(state?.rejected)) return ['The cycled list must be a list.'];
  if (new Set(state.rejected).size !== state.rejected.length) errors.push('A weapon can only be cycled once.');
  state.rejected.forEach(w => { if (!weapons.includes(w)) errors.push(`"${w}" is not a Kuva weapon.`); });
  if (state.rejected.length >= weapons.length) errors.push('Every weapon cycled means the list should have reset.');
  if (state.target && !weapons.includes(state.target)) errors.push(`"${state.target}" is not a Kuva weapon.`);
  if (state.currentLich && !weapons.includes(state.currentLich)) errors.push(`"${state.currentLich}" is not a Kuva weapon.`);
  return errors;
}
