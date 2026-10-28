// Weapon-name safety for the Loadout tab's weapon box.
//
// The box autosaves, so without a guard a pause in typing used to save
// whatever was in it -- including an EMPTY box (which clears the build's
// weapon and hides its sub-tab) or half a name ("Fu"). A weapon is now saved
// only when the text exactly names a weapon in the catalog for that slot
// (case-insensitive); anything else is ignored and the previous weapon stays.
//
// `weapons` is the catalog list (wf_base.weapons rows with name + category),
// `slot` is 'Primary' | 'Secondary' | 'Melee'. Returns the catalog's own
// spelling of the name, or null when the text isn't a real weapon.
export function resolveCatalogWeapon(weapons, text, slot) {
  const wanted = String(text ?? '').trim().toLowerCase();
  if (!wanted) return null;
  const match = weapons.find(
    w => w.name?.toLowerCase() === wanted
      && String(w.category ?? w.slot ?? '').toLowerCase() === String(slot).toLowerCase()
      && w.weapon_type !== 'Incarnon Genesis'
  );
  return match ? match.name : null;
}
