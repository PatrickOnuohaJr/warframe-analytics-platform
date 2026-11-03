// The 21 weapons a Kuva Larvling can show. Copied from wf_base.weapons
// (name like 'Kuva %') on 2026-11-02; tests/kuvaCycle.test.js checks the list
// is still 21 distinct Kuva names. If the game adds a Kuva weapon, add it here
// and in the catalog.
export const KUVA_WEAPONS = [
  { name: 'Kuva Ayanga', category: 'Arch-Gun' },
  { name: 'Kuva Brakk', category: 'Secondary' },
  { name: 'Kuva Bramma', category: 'Primary' },
  { name: 'Kuva Chakkhurr', category: 'Primary' },
  { name: 'Kuva Drakgoon', category: 'Primary' },
  { name: 'Kuva Ghoulsaw', category: 'Melee' },
  { name: 'Kuva Grattler', category: 'Arch-Gun' },
  { name: 'Kuva Hek', category: 'Primary' },
  { name: 'Kuva Hind', category: 'Primary' },
  { name: 'Kuva Karak', category: 'Primary' },
  { name: 'Kuva Kohm', category: 'Primary' },
  { name: 'Kuva Kraken', category: 'Secondary' },
  { name: 'Kuva Nukor', category: 'Secondary' },
  { name: 'Kuva Ogris', category: 'Primary' },
  { name: 'Kuva Quartakk', category: 'Primary' },
  { name: 'Kuva Seer', category: 'Secondary' },
  { name: 'Kuva Shildeg', category: 'Melee' },
  { name: 'Kuva Sobek', category: 'Primary' },
  { name: 'Kuva Tonkor', category: 'Primary' },
  { name: 'Kuva Twin Stubbas', category: 'Secondary' },
  { name: 'Kuva Zarr', category: 'Primary' },
];

export const KUVA_WEAPON_NAMES = KUVA_WEAPONS.map(w => w.name);
