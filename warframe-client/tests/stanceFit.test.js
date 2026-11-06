import test from 'node:test';
import assert from 'node:assert/strict';
import { stanceFamiliesFor, stancesForWeapon } from '../src/utils/stanceFit.js';
import { MELEE_STANCE_CLASS } from '../src/constants/meleeStanceClass.js';

const stance = (name, compatName) => ({ name, raw_json: { compatName } });
const stances = [
  stance('Bleeding Willow', 'Polearms'),
  stance('Gleaming Talon', 'Dual Daggers'),
  stance('Crushing Ruin', 'Hammers'),
  { name: 'No Family', raw_json: {} },
];

test('Dual Daggers weapon sees only Dual Daggers stances (plus unknown-family ones)', () => {
  const names = stancesForWeapon(stances, 'Okina Prime').map(m => m.name);
  assert.deepEqual(names, ['Gleaming Talon', 'No Family']);
});

test('a Hammer weapon does not see Dual Daggers stances', () => {
  const names = stancesForWeapon(stances, 'Fragor').map(m => m.name);
  assert.ok(names.includes('Crushing Ruin'));
  assert.ok(!names.includes('Gleaming Talon'));
});

test('unknown or empty weapon fails open and shows every stance', () => {
  assert.equal(stancesForWeapon(stances, 'Some Brand New Weapon').length, stances.length);
  assert.equal(stancesForWeapon(stances, '').length, stances.length);
  assert.equal(stanceFamiliesFor(null), null);
});

test('a weapon usable in two families sees both', () => {
  assert.deepEqual(stanceFamiliesFor('Dark Split-Sword'), ['Dual Swords', 'Heavy Blade']);
});

test('every family in the table is one a stance mod can actually have', () => {
  const known = new Set([
    'Assault Saw', 'Bayonet', 'Blade And Whip', 'Claws', 'Daggers', 'Dual Daggers', 'Dual Nikanas',
    'Dual Swords', 'Fists', 'Glaives', 'Gunblade', 'Hammers', 'Heavy Blade', 'Heavy Scythe',
    'Machetes', 'Nikanas', 'Nunchaku', 'Polearms', 'Rapiers', 'Scythes', 'Sparring', 'Staves',
    'Sword And Shield', 'Swords', 'Tonfas', 'Two-Handed Nikana', 'Warfans', 'Whips',
  ]);
  for (const [weapon, value] of Object.entries(MELEE_STANCE_CLASS)) {
    for (const family of [].concat(value)) {
      assert.ok(known.has(family), `${weapon} -> unknown stance family "${family}"`);
    }
  }
});
