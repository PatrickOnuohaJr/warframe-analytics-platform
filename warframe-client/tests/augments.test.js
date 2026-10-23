import test from 'node:test';
import assert from 'node:assert/strict';
import { augmentsForWarframe } from '../src/utils/modMeta.js';

const aug = (name, compatName, category = 'Warframe') => ({ name, category, raw_json: { isAugment: true, compatName } });
const catalog = [
  aug('Dread Ward', 'Garuda'),
  aug('Blood Forge', 'Garuda'),
  aug('Pool of Life', 'Nidus'),
  aug('Augur Secrets', 'WARFRAME'), // generic set bucket, not a real augment
  aug('Some Melee Aug', 'Garuda', 'Melee'), // wrong category
  { name: 'Vitality', category: 'Warframe', raw_json: { isAugment: false } },
];

test('returns the frame\'s augments, owned or not, sorted by name', () => {
  assert.deepEqual(augmentsForWarframe(catalog, 'Garuda').map(m => m.name), ['Blood Forge', 'Dread Ward']);
});

test('Prime and Umbra variants match on their base frame name', () => {
  assert.equal(augmentsForWarframe(catalog, 'Garuda Prime').length, 2);
  assert.deepEqual(augmentsForWarframe(catalog, 'Nidus Prime').map(m => m.name), ['Pool of Life']);
});

test('generic buckets, other categories, and a missing name never match', () => {
  assert.equal(augmentsForWarframe(catalog, 'Excalibur').length, 0);
  assert.deepEqual(augmentsForWarframe(catalog, null), []);
});
