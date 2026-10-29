import test from 'node:test';
import assert from 'node:assert/strict';
import { isModCompatible, planCopy } from '../src/utils/companionCopy.js';

const mod = (compat_name, name = 'M') => ({ compat_name, name });
const nautilus = { name: 'Nautilus Prime', cls: 'sentinel' };
const wyrm = { name: 'Wyrm Prime', cls: 'sentinel' };
const huras = { name: 'Huras Kubrow', cls: 'kubrow' };
const smeeta = { name: 'Smeeta Kavat', cls: 'kavat' };

test('universal buckets fit the right companions', () => {
  assert.equal(isModCompatible(mod('COMPANION'), 'Companion', huras), true);
  assert.equal(isModCompatible(mod('ROBOTIC'), 'Companion', nautilus), true);
  assert.equal(isModCompatible(mod('ROBOTIC'), 'Companion', huras), false);
  assert.equal(isModCompatible(mod('BEAST'), 'Companion', huras), true);
  assert.equal(isModCompatible(mod('BEAST'), 'Companion', nautilus), false);
  assert.equal(isModCompatible(mod('Sentinel'), 'Companion', smeeta), false);
});

test('named exclusives match the base name, Prime included', () => {
  assert.equal(isModCompatible(mod('Wyrm'), 'Companion', wyrm), true);
  assert.equal(isModCompatible(mod('Wyrm'), 'Companion', nautilus), false);
  assert.equal(isModCompatible(mod('Nautilus'), 'Companion', nautilus), true);
  assert.equal(isModCompatible(mod('Smeeta Kavat'), 'Companion', smeeta), true);
  assert.equal(isModCompatible(mod('Kubrow'), 'Companion', huras), true);
  assert.equal(isModCompatible(mod('Kavat'), 'Companion', huras), false);
});

test('claws mods: universal vs breed-exclusive, sentinel weapons take none', () => {
  const kubrowClaws = { name: 'Kubrow Claws', cls: 'claws' };
  const kavatClaws = { name: 'Kavat Claws', cls: 'claws' };
  const sweeper = { name: 'Sweeper Prime', cls: 'sentinel_weapon' };
  assert.equal(isModCompatible(mod('Claws'), 'CompanionWeapon', kubrowClaws), true);
  assert.equal(isModCompatible(mod('Kubrow Claws'), 'CompanionWeapon', kubrowClaws), true);
  assert.equal(isModCompatible(mod('Kubrow Claws'), 'CompanionWeapon', kavatClaws), false);
  assert.equal(isModCompatible(mod('Claws'), 'CompanionWeapon', sweeper), false);
});

test('unknown target class is null, never a guess', () => {
  assert.equal(isModCompatible(mod('BEAST'), 'Companion', { name: 'X', cls: undefined }), null);
});

test('planCopy copies fits, empties and reports skips, keeps polarity', () => {
  const modsById = new Map([
    [1, mod('ROBOTIC', 'Vacuum')],
    [2, mod('Wyrm', 'Wyrm Only')],
    [3, mod('BEAST', 'Maul')],
  ]);
  const source = [
    { slot_position: '1', mod_id: 1, polarity: 'madurai' },
    { slot_position: '2', mod_id: 2, polarity: 'naramon' },
    { slot_position: '3', mod_id: 3, polarity: null },
    { slot_position: '4', mod_id: null, polarity: 'vazarin' },
  ];
  const { copy, skipped } = planCopy(source, modsById, 'Companion', nautilus);
  assert.deepEqual(copy.map(r => r.mod_id), [1, null, null, null]);
  assert.deepEqual(copy.map(r => r.polarity), ['madurai', 'naramon', null, 'vazarin']);
  assert.deepEqual(skipped.map(s => s.name), ['Wyrm Only', 'Maul']);
});
