import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveCatalogWeapon } from '../src/utils/weaponAssign.js';

const weapons = [
  { name: 'Lex', category: 'Secondary' },
  { name: 'Lex Prime', category: 'Secondary' },
  { name: 'Torid', category: 'Primary' },
  { name: 'Praedos', category: 'Melee' },
  { name: 'Lex Incarnon Genesis', category: 'Secondary', weapon_type: 'Incarnon Genesis' },
];

test('an empty or blank box never resolves, so it can never clear a weapon', () => {
  assert.equal(resolveCatalogWeapon(weapons, '', 'Secondary'), null);
  assert.equal(resolveCatalogWeapon(weapons, '   ', 'Secondary'), null);
  assert.equal(resolveCatalogWeapon(weapons, null, 'Secondary'), null);
});

test('half-typed or unknown text does not resolve', () => {
  assert.equal(resolveCatalogWeapon(weapons, 'Le', 'Secondary'), null);
  assert.equal(resolveCatalogWeapon(weapons, 'Lex Pri', 'Secondary'), null);
  assert.equal(resolveCatalogWeapon(weapons, 'Not A Weapon', 'Secondary'), null);
});

test('an exact name resolves to the catalog spelling, case-insensitively', () => {
  assert.equal(resolveCatalogWeapon(weapons, 'lex prime', 'Secondary'), 'Lex Prime');
  assert.equal(resolveCatalogWeapon(weapons, '  LEX  ', 'Secondary'), 'Lex');
});

test('a weapon only resolves for its own slot, and Incarnon Genesis items never do', () => {
  assert.equal(resolveCatalogWeapon(weapons, 'Torid', 'Secondary'), null);
  assert.equal(resolveCatalogWeapon(weapons, 'Torid', 'Primary'), 'Torid');
  assert.equal(resolveCatalogWeapon(weapons, 'Lex Incarnon Genesis', 'Secondary'), null);
});
