import test from 'node:test';
import assert from 'node:assert/strict';
import { computeAbilityStats, scaleFactor } from '../src/utils/abilityStats.js';
import { forecastAbility, sumChanges, applyChanges } from '../src/utils/abilityForecast.js';

// Mirage's Eclipse exactly as stored in wf_base.ability_parameters
// (live DB 2026-11-03 plus the rank-3 duration fix and Helminth rows from
// migration 20261103; wiki: 50/100/150/200% damage bonus, 25/40/60/75% damage
// reduction capped at 90%, 10/15/20/25 s, 25 energy; Helminth: 30% bonus, 75% cap).
const ECLIPSE = [
  { parameter_key: 'energy_cost', label: 'Energy Cost', base_value: 25, unit: 'flat', scales_with: 'efficiency', context: 'base', sort_order: 0 },
  { parameter_key: 'damage_reduction', label: 'damage reduction', base_value: 75, unit: 'percent', scales_with: 'strength', context: 'base', sort_order: 1 },
  { parameter_key: 'damage_bonus', label: 'damage bonus', base_value: 200, unit: 'percent', scales_with: 'strength', context: 'base', sort_order: 2 },
  { parameter_key: 'duration', label: 'Duration', base_value: 25, unit: 'flat', scales_with: 'duration', context: 'base', sort_order: 3 },
  { parameter_key: 'damage_reduction_cap', label: 'damage reduction cap', base_value: 90, unit: 'percent', scales_with: 'none', context: 'base', sort_order: 4 },
  { parameter_key: 'damage_bonus', label: 'damage bonus', base_value: 30, unit: 'percent', scales_with: 'strength', context: 'subsumed', sort_order: 2 },
  { parameter_key: 'damage_reduction_cap', label: 'damage reduction cap', base_value: 75, unit: 'percent', scales_with: 'none', context: 'subsumed', sort_order: 4 },
];

const row = (rows, key) => rows.find(r => r.parameterKey === key);

test('efficiency lowers energy cost, floored at 25% and ceilinged at 175%', () => {
  assert.equal(scaleFactor('efficiency', 100), 1);
  assert.equal(scaleFactor('efficiency', 130), 0.7); // wiki example: 25 x (200% - 130%) = 17.5
  assert.equal(scaleFactor('efficiency', 300), 0.25);
  assert.equal(scaleFactor('efficiency', 0), 1.75);
  assert.equal(scaleFactor('strength', 243), 2.43);
  assert.equal(scaleFactor('strength', null), null);
});

test('current Eclipse numbers: damage scales with Strength, reduction is capped at 90', () => {
  const rows = computeAbilityStats({ parameters: ECLIPSE, buildStats: { strength: 243, duration: 100, range: 100, efficiency: 130 } });
  assert.equal(row(rows, 'damage_bonus').value, 486);
  assert.equal(row(rows, 'damage_reduction').value, 90);
  assert.equal(row(rows, 'damage_reduction').capped, true);
  assert.equal(row(rows, 'energy_cost').value, 17.5);
});

test('Patrick\'s Mirage example: +60 +75 +60 Strength is additive on the build total', () => {
  const changes = [
    { stat: 'strength', percent: 60 }, // Molt Augmented, maxed
    { stat: 'strength', percent: 75 }, // 5 Tauforged Crimson shards at +15% each
    { stat: 'strength', percent: 60 }, // third +60% source
  ];
  assert.deepEqual(sumChanges(changes), { strength: 195, duration: 0, range: 0, efficiency: 0 });

  const rows = forecastAbility({ parameters: ECLIPSE, buildStats: { strength: 243, duration: 100, range: 100, efficiency: 100 }, changes });
  const bonus = row(rows, 'damage_bonus');
  assert.equal(bonus.current, 486); // 200% x 2.43 (Patrick read 480% in game; see handoff)
  assert.equal(bonus.forecast, 876); // 200% x (2.43 + 1.95) = 200% x 4.38
  assert.equal(bonus.delta, 390);
  assert.deepEqual(bonus.affectedBy, ['strength']);
});

test('a stat that does not drive an ability changes nothing in it', () => {
  const rows = forecastAbility({
    parameters: ECLIPSE,
    buildStats: { strength: 243, duration: 100, range: 100, efficiency: 100 },
    changes: [{ stat: 'range', percent: 50 }],
  });
  rows.forEach(r => assert.equal(r.delta, 0, r.parameterKey));
  assert.deepEqual(row(rows, 'duration').affectedBy, ['duration']);
  assert.deepEqual(row(rows, 'energy_cost').affectedBy, ['efficiency']);
});

test('duration and efficiency changes move only their own numbers', () => {
  const rows = forecastAbility({
    parameters: ECLIPSE,
    buildStats: { strength: 100, duration: 150, range: 100, efficiency: 100 },
    changes: [{ stat: 'duration', percent: 50 }, { stat: 'efficiency', percent: 30 }],
  });
  assert.equal(row(rows, 'duration').current, 37.5); // 25 s x 1.5
  assert.equal(row(rows, 'duration').forecast, 50); // 25 s x 2.0
  assert.equal(row(rows, 'energy_cost').current, 25);
  assert.equal(row(rows, 'energy_cost').forecast, 17.5);
  assert.equal(row(rows, 'damage_bonus').delta, 0);
});

test('a capped value stays attributed to Strength and reports the cap', () => {
  const rows = forecastAbility({
    parameters: ECLIPSE,
    buildStats: { strength: 243, duration: 100, range: 100, efficiency: 100 },
    changes: [{ stat: 'strength', percent: 10 }],
  });
  const dr = row(rows, 'damage_reduction');
  assert.equal(dr.current, 90);
  assert.equal(dr.forecast, 90);
  assert.equal(dr.capped, true);
  assert.equal(dr.cap, 90);
  assert.deepEqual(dr.affectedBy, ['strength']);
});

test('negative changes and junk rows are handled', () => {
  assert.deepEqual(applyChanges({ strength: 200 }, [{ stat: 'strength', percent: -30 }, { stat: 'bogus', percent: 5 }, { stat: 'strength', percent: 'abc' }]), { strength: 170 });
  assert.deepEqual(forecastAbility({ parameters: ECLIPSE, buildStats: null }), []);
});

test('formula-driven numbers follow their formula (Snow Globe health uses Strength)', () => {
  const parameters = [
    { parameter_key: 'base_health', context: 'base', base_value: 3500, formula_key: 'raw_passthrough', label: 'Base', sort_order: 0 },
    { parameter_key: 'armor_multiplier', context: 'base', base_value: 5, formula_key: 'raw_passthrough', label: 'Mult', sort_order: 1 },
    { parameter_key: 'health', context: 'base', formula_key: 'snow_globe_health', label: 'Health', unit: 'flat', sort_order: 2 },
  ];
  const rows = forecastAbility({ parameters, buildStats: { armor: 300, strength: 200, duration: 100, range: 100, efficiency: 100 }, changes: [{ stat: 'strength', percent: 100 }] });
  assert.equal(row(rows, 'health').current, 10000);
  assert.equal(row(rows, 'health').forecast, 15000);
  assert.deepEqual(row(rows, 'health').affectedBy, ['strength']);
});

test('Helminth Eclipse: damage bonus is 30% base (not 200%) and reduction caps at 75', () => {
  const stats = { strength: 243, duration: 100, range: 100, efficiency: 100 };
  const home = computeAbilityStats({ parameters: ECLIPSE, buildStats: stats, context: 'base' });
  const helminth = computeAbilityStats({ parameters: ECLIPSE, buildStats: stats, context: 'subsumed' });
  assert.equal(row(home, 'damage_bonus').value, 486);
  assert.equal(row(helminth, 'damage_bonus').value, 72.9); // 30% x 2.43
  assert.equal(row(helminth, 'damage_reduction').value, 75);
  assert.equal(row(helminth, 'damage_reduction').capped, true);
  assert.equal(row(helminth, 'damage_reduction').cap, 75);
  // Numbers Helminth does not change fall back to the home values.
  assert.equal(row(helminth, 'duration').value, 25);
  assert.equal(row(helminth, 'energy_cost').value, 25);
});

test('forecasting a Helminth Eclipse uses the subsumed numbers', () => {
  const rows = forecastAbility({
    parameters: ECLIPSE,
    context: 'subsumed',
    buildStats: { strength: 243, duration: 100, range: 100, efficiency: 100 },
    changes: [{ stat: 'strength', percent: 60 }],
  });
  assert.equal(row(rows, 'damage_bonus').current, 72.9);
  assert.equal(row(rows, 'damage_bonus').forecast, 90.9); // 30% x 3.03
  assert.deepEqual(row(rows, 'damage_bonus').affectedBy, ['strength']);
});

// Healing Flame (Ember's Fire Blast augment), checked against Patrick's in-game
// tooltip at 199% Strength: heal 25-50 -> 49.75-99.5, Overguard cap 10,000 -> 19,900.
test('Healing Flame adds heal and Overguard cap to Fire Blast, scaled by Strength', async () => {
  const { augmentParameters } = await import('../src/utils/augmentAbilityStats.js');
  const equipped = [{ name: 'Healing Flame', rank: 3, maxRank: 3 }];
  const rows = augmentParameters('Fire Blast', equipped);
  const stats = computeAbilityStats({ parameters: rows, buildStats: { strength: 199 } });
  const get = k => stats.find(s => s.parameterKey === k).value;
  assert.equal(get('healing_flame_heal_min'), 49.75);
  assert.equal(get('healing_flame_heal_max'), 99.5);
  assert.equal(get('healing_flame_overguard_cap'), 19900);

  // Forecast: +60% Strength -> 259% -> cap 25,900.
  const f = forecastAbility({ parameters: rows, buildStats: { strength: 199, duration: 100, range: 100, efficiency: 100 }, changes: [{ stat: 'strength', percent: 60 }] });
  assert.equal(f.find(r => r.parameterKey === 'healing_flame_overguard_cap').forecast, 25900);

  // Not on another ability, not below max rank, not when subsumed.
  assert.deepEqual(augmentParameters('Eclipse', equipped), []);
  assert.deepEqual(augmentParameters('Fire Blast', [{ name: 'Healing Flame', rank: 2, maxRank: 3 }]), []);
  assert.deepEqual(augmentParameters('Fire Blast', equipped, 'subsumed'), []);
});

// Icy Avalanche (Frost), checked against Patrick's in-game tooltip at 276% Strength.
test('Icy Avalanche adds Overguard, cap and Armor conversion to Avalanche', async () => {
  const { augmentParameters } = await import('../src/utils/augmentAbilityStats.js');
  const rows = augmentParameters('Avalanche', [{ name: 'Icy Avalanche', rank: 3, maxRank: 3 }]);
  const stats = computeAbilityStats({ parameters: rows, buildStats: { strength: 276 } });
  const get = k => stats.find(s => s.parameterKey === k).value;
  assert.equal(get('icy_avalanche_overguard'), 165.6);
  assert.equal(get('icy_avalanche_overguard_cap'), 41400);
  assert.equal(get('icy_avalanche_armor_conversion'), 55.2); // game shows 55%
});
