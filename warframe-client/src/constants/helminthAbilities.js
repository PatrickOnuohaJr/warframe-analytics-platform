// Every ability that can be subsumed into the Helminth, with the Warframe it
// comes from.
//
// Source: wiki.warframe.com "Helminth" page, Subsumable Ability Checklist,
// read 2026-10-23 (66 abilities). Per Patrick, the wiki is trusted unless an
// in-game discrepancy shows up. Cross-checked against wf_base.warframe_abilities:
// 65 of the 66 match an ability stored on that frame; Sirius & Orion's is
// stored there as "Jade Stars / Astral Shell" (the wiki lists "Jade Stars" and
// notes Astral Shell as the second form -- unverified whether both subsume).
//
// Helminth's own unique abilities (Empower, Infested Mobility, Master's
// Summons, Rebuild Shields) are not subsumed from frames and are not listed.
//
// Not every name here has stat data in wf_base.ability_catalog yet (e.g. "Rest
// & Rage", "Jade Stars"), so the picker offers them but ability math for those
// stays empty until the ability seed covers them.

const h = (frame, name) => ({ frame, name });

export const HELMINTH_ABILITIES = [
  h('Ash', 'Shuriken'), h('Atlas', 'Petrify'), h('Banshee', 'Silence'), h('Baruuk', 'Lull'),
  h('Caliban', 'Sentient Wrath'), h('Chroma', 'Elemental Ward'), h('Citrine', 'Fractured Blast'),
  h('Cyte-09', 'Evade'), h('Dagath', 'Wyrd Scythes'), h('Dante', 'Dark Verse'), h('Ember', 'Fire Blast'),
  h('Equinox', 'Rest & Rage'), h('Excalibur', 'Radial Blind'), h('Follie', 'Self Portrait'),
  h('Frost', 'Ice Wave'), h('Gara', 'Spectrorage'), h('Garuda', 'Blood Altar'), h('Gauss', 'Thermal Sunder'),
  h('Grendel', 'Nourish'), h('Gyre', 'Coil Horizon'), h('Harrow', 'Condemn'), h('Hildryn', 'Pillage'),
  h('Hydroid', 'Tempest Barrage'), h('Inaros', 'Desiccation'), h('Ivara', 'Quiver'), h('Jade', 'Ophanim Eyes'),
  h('Khora', 'Ensnare'), h('Koumei', 'Omamori'), h('Kullervo', 'Wrathful Advance'), h('Lavos', 'Vial Rush'),
  h('Limbo', 'Banish'), h('Loki', 'Decoy'), h('Mag', 'Pull'), h('Mesa', 'Shooting Gallery'),
  h('Mirage', 'Eclipse'), h('Narin', 'Neote'), h('Nekros', 'Terrify'), h('Nezha', 'Fire Walker'),
  h('Nidus', 'Larva'), h('Nokko', 'Brightbonnet'), h('Nova', 'Null Star'), h('Nyx', 'Mind Control'),
  h('Oberon', 'Smite'), h('Octavia', 'Resonator'), h('Oraxia', 'Webbed Embrace'), h('Protea', 'Dispensary'),
  h('Qorvex', 'Chyrinka Pillar'), h('Revenant', 'Reave'), h('Rhino', 'Roar'), h('Saryn', 'Molt'),
  h('Sevagoth', 'Gloom'), h('Sirius & Orion', 'Jade Stars'), h('Styanax', 'Tharros Strike'),
  h('Temple', 'Pyrotechnics'), h('Titania', 'Spellbind'), h('Trinity', 'Well of Life'), h('Uriel', 'Remedium'),
  h('Valkyr', 'Warcry'), h('Vauban', 'Tesla Nervos'), h('Volt', 'Shock'), h('Voruna', "Lycath's Hunt"),
  h('Wisp', 'Breach Surge'), h('Wukong', 'Defy'), h('Xaku', "Xata's Whisper"), h('Yareli', 'Aquablades'),
  h('Zephyr', 'Airburst'),
].sort((a, b) => a.name.localeCompare(b.name));
