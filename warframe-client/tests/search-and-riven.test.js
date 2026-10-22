import test from 'node:test';
import assert from 'node:assert/strict';
import { computeStatBounds, filterByThresholds } from '../src/utils/weaponSearch.js';
import { formatRivenStat, parseRivenStat, isPositiveOnly, statsForCategory } from '../src/utils/rivenStats.js';

const CRIT = { key: 'criticalChance', scale: 100 };
const RANGE = { key: 'range', scale: 1 };
const weapons = [
  { name: 'Low', raw_json: { criticalChance: 0.1, range: 2 } },
  { name: 'High', raw_json: { criticalChance: 0.3, range: 4 } },
  { name: 'NoRange', raw_json: { criticalChance: 0.2 } },
  { name: 'NoJson', raw_json: null },
];

test('stat bounds scale raw values and ignore weapons missing the stat', () => {
  const b = computeStatBounds(weapons, [CRIT, RANGE]);
  assert.equal(b.criticalChance.min, 10);
  assert.ok(Math.abs(b.criticalChance.max - 30) < 1e-9);
  assert.deepEqual(b.range, { min: 2, max: 4 });
  assert.deepEqual(computeStatBounds([], [CRIT]).criticalChance, { min: 0, max: 0 });
});

test('a threshold at the floor or unset excludes nothing, even weapons missing the stat', () => {
  const b = computeStatBounds(weapons, [CRIT, RANGE]);
  assert.equal(filterByThresholds(weapons, [CRIT, RANGE], {}, b).length, 4);
  assert.equal(filterByThresholds(weapons, [CRIT, RANGE], { range: 2 }, b).length, 4);
});

test('a raised threshold is a minimum and excludes weapons lacking the stat', () => {
  const b = computeStatBounds(weapons, [CRIT, RANGE]);
  const names = t => filterByThresholds(weapons, [CRIT, RANGE], t, b).map(w => w.name);
  assert.deepEqual(names({ criticalChance: 20 }), ['High', 'NoRange']);
  assert.deepEqual(names({ range: 3 }), ['High']);
  assert.deepEqual(names({ criticalChance: 20, range: 3 }), ['High']);
});

test('riven stat lines round-trip through format and parse', () => {
  const line = formatRivenStat('WeaponFireDamageMod', '+', '90', 'Primary');
  assert.match(line, /^\+90% /);
  const parsed = parseRivenStat(line, 'Primary');
  assert.deepEqual(parsed, { tag: 'WeaponFireDamageMod', sign: '+', value: '90' });
});

test('riven parsing defaults a missing sign to positive and rejects unknown labels', () => {
  const stat = statsForCategory('Primary')[0];
  assert.equal(parseRivenStat(`170.3% ${stat.label}`, 'Primary').sign, '+');
  assert.equal(parseRivenStat('+5% Not A Real Stat', 'Primary'), null);
  assert.equal(parseRivenStat('', 'Primary'), null);
  assert.equal(formatRivenStat(stat.tag, '+', '', 'Primary'), null);
});

test('positive-only riven tags and unknown categories behave', () => {
  assert.equal(isPositiveOnly('WeaponFireDamageMod'), true);
  assert.equal(isPositiveOnly('WeaponDamageAmountMod'), false);
  assert.deepEqual(statsForCategory('Nonsense'), []);
});
