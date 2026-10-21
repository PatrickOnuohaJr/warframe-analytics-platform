import test from 'node:test';
import assert from 'node:assert/strict';
import { effectiveDrain, pieceCapacity, isDiscounted } from '../src/utils/modCapacity.js';
import { computeAbilityStats } from '../src/utils/abilityStats.js';
import { computeModdedWeaponStats } from '../src/utils/weaponStats.js';
import { computeResilience } from '../src/utils/survivability.js';

test('matched Steel Charge adds 18 capacity to a reactor-equipped frame', () => {
  const aura = { base_drain: -4, polarity: 'madurai' };
  assert.equal(pieceCapacity({ hasCatalyst: true }) - effectiveDrain(aura, 5, 'madurai', true), 78);
  assert.equal(effectiveDrain(aura, 5, 'vazarin', true), -7);
});

test('regular costs round up and Omni does not discount Umbra', () => {
  const mod = { base_drain: 4, polarity: 'madurai' };
  assert.equal(effectiveDrain(mod, 5, 'madurai'), 5);
  assert.equal(effectiveDrain(mod, 5, null), 9);
  assert.equal(isDiscounted({ polarity: 'umbra' }, 'omni'), false);
  assert.equal(isDiscounted(mod, 'omni'), true);
});

test('ability context overrides one parameter and falls back for others', () => {
  const rows = [
    { parameter_key: 'damage', context: 'base', base_value: 100, scales_with: 'strength' },
    { parameter_key: 'damage', context: 'subsumed', base_value: 50, scales_with: 'strength' },
    { parameter_key: 'duration', context: 'base', base_value: 10, scales_with: 'duration' },
    { parameter_key: 'unknown', context: 'base', base_value: null },
  ];
  const result = computeAbilityStats({ parameters: rows, context: 'subsumed', buildStats: { strength: 200, duration: 150 } });
  assert.deepEqual(result.map(r => r.value), [100, 15, null]);
});

test('Snow Globe applies armor before strength and does not scale the input twice', () => {
  const parameters = [
    { parameter_key: 'base_health', context: 'base', base_value: 5000 },
    { parameter_key: 'armor_multiplier', context: 'base', base_value: 5, formula_key: 'raw_passthrough' },
    { parameter_key: 'health', context: 'base', formula_key: 'snow_globe_health' },
  ];
  const result = computeAbilityStats({ parameters, buildStats: { armor: 300, strength: 200 } });
  assert.equal(result.find(r => r.parameterKey === 'health').value, 13000);
  assert.equal(result.find(r => r.parameterKey === 'armor_multiplier').value, 5);
});

test('reload speed reduces reload time while conditional crit stacks are excluded', () => {
  const mod = { raw_json: { levelStats: [{ stats: ['+50% Reload Speed', '+100% Critical Chance', '+40% Critical Chance stacks with Combo Multiplier'] }] } };
  const result = computeModdedWeaponStats({ baseStats: { reloadTime: 3, criticalChance: 0.25 }, equippedMods: [{ mod, rank: 0 }], category: 'Primary' });
  assert.equal(result.reloadTime, 2);
  assert.equal(result.criticalChance, 0.5);
  assert.equal(result.fireRate, null);
});

test('resilience combines percent mods with flat shards and leaves shields unmitigated', () => {
  const mod = { name: 'Fixture', raw_json: { levelStats: [{ stats: ['+100% Health', '+100% Armor'] }] } };
  const result = computeResilience({ baseStats: { health: 100, armor: 150, shield: 50 }, equippedMods: [{ mod, rank: 0 }], shardBonusTexts: ['+100 Health'] });
  assert.equal(result.totalHealth, 300);
  assert.equal(result.effectiveHealth, 600);
  assert.equal(result.totalEffectivePool, 650);
});
