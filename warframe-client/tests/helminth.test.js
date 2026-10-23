import test from 'node:test';
import assert from 'node:assert/strict';
import { HELMINTH_ABILITIES } from '../src/constants/helminthAbilities.js';

test('every ability name is unique and each has a source frame', () => {
  const names = HELMINTH_ABILITIES.map(a => a.name);
  assert.equal(new Set(names).size, names.length);
  assert.ok(HELMINTH_ABILITIES.every(a => a.frame && a.name));
});

test('keeps the abilities Gu already offered and adds the newer ones', () => {
  const names = new Set(HELMINTH_ABILITIES.map(a => a.name));
  ['Airburst', 'Blood Altar', 'Wrathful Advance', 'Nourish', 'Warcry'].forEach(n => assert.ok(names.has(n), n));
  ['Vial Rush', 'Chyrinka Pillar', 'Remedium', 'Brightbonnet'].forEach(n => assert.ok(names.has(n), n));
  assert.equal(HELMINTH_ABILITIES.length, 66);
});

test('list is sorted by ability name', () => {
  const names = HELMINTH_ABILITIES.map(a => a.name);
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)));
});
