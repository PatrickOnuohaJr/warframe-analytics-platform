import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { abilityParameters } from '../src/utils/abilityCardData.js';
import { computeAbilityStats } from '../src/utils/abilityStats.js';

const catalog = JSON.parse(readFileSync(new URL('../../DB/StaticData/equinox_20261121.json', import.meta.url)));
const stats = { strength: 200, duration: 150, efficiency: 130, range: 190 };
function values(name, equipped = [], buildStats = stats, context = 'base') {
  return Object.fromEntries(computeAbilityStats({
    parameters: abilityParameters(name, catalog.find(a => a.ability_name === name).parameters, equipped),
    buildStats, context,
  }).map(r => [r.parameterKey, r.value]));
}
const augment = name => [{ name, rank: 3, maxRank: 3 }];

test('Equinox has four complete dual-form ability parameter sets', () => {
  assert.equal(catalog.length, 4);
  for (const ability of catalog) {
    const rows = values(ability.ability_name);
    assert.ok(Object.values(rows).every(v => Number.isFinite(v)));
    assert.equal(new Set(ability.parameters.map(p => p.parameter_key)).size, ability.parameters.length);
  }
  const meta = values('Metamorphosis');
  assert.equal(meta.armor_bonus, 500);
  assert.equal(meta.day_damage_bonus, 50);
  assert.equal(meta.day_speed_bonus, 30);
  assert.equal(meta.duration, 37.5);
});

test('Rest and Rage scale independently and retain Helminth values', () => {
  const rest = values('Rest & Rage');
  assert.equal(rest.duration, 33);
  assert.equal(rest.area_radius, 9.5);
  assert.equal(rest.wakeup_threshold, 50);
  assert.equal(rest.rage_vulnerability, 100);
  assert.deepEqual(values('Rest & Rage', [], stats, 'subsumed'), rest);
});

test('Pacify inverse Strength and Provoke cap; per-enemy cost ignores Duration', () => {
  assert.equal(values('Pacify & Provoke').pacify_multiplier, .25);
  assert.equal(values('Pacify & Provoke').pacify_drain, .35);
  assert.equal(values('Pacify & Provoke', [], { ...stats, duration: 25, strength: 400 }).provoke_strength, 50);
});

test('Mend/Maim conversion stays fixed; channel drain uses Efficiency and Duration', () => {
  const mend = values('Mend & Maim');
  assert.equal(mend.channel_drain, 1.63);
  assert.equal(mend.charge_conversion, 75);
  assert.equal(mend.maim_damage, 300);
  assert.equal(values('Mend & Maim', [], { ...stats, efficiency: 175, duration: 50 }).channel_drain, 1.75);
  assert.equal(values('Mend & Maim', [], { ...stats, efficiency: 190, duration: 50 }).channel_drain, .88);
});

test('all four max-rank augments apply only to their ability and respect fixed values/caps', () => {
  const duality = values('Metamorphosis', augment('Duality'));
  assert.equal(duality.duality_duration, 15);
  assert.equal(duality.duality_damage, 300);
  const calm = values('Rest & Rage', augment('Calm & Frenzy'));
  assert.equal(calm.calm_frenzy_radius, 9.5);
  assert.equal(calm.calm_frenzy_retention, 100);
  const peaceful = values('Pacify & Provoke', augment('Peaceful Provocation'), { ...stats, strength: 400 });
  assert.equal(peaceful.peaceful_slow, 80);
  assert.equal(peaceful.peaceful_strength, 30);
  assert.equal(peaceful.provoke_strength, 50);
  assert.equal(values('Mend & Maim', augment('Energy Transfer')).energy_transfer_retention, 100);
  assert.equal(values('Mend & Maim', augment('Duality')).duality_damage, undefined);
  assert.equal(values('Metamorphosis', [{ name: 'Duality', rank: 2, maxRank: 3 }]).duality_damage, undefined);
});
