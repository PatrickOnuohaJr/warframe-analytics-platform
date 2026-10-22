import test from 'node:test';
import assert from 'node:assert/strict';
import { applyMaxRankStats, RANK_30_GAIN_EXCEPTIONS } from '../src/utils/rankGains.js';
import { computeModdedWarframeStats, computeResilience } from '../src/utils/survivability.js';

test('Garuda Prime unmodded rank 30 matches the in-game Arsenal (370/370/420/320)', () => {
  const s = computeModdedWarframeStats({ baseStats: { name: 'Garuda Prime', health: 270, shield: 270, armor: 420, energy: 220, sprint_speed: 1 } });
  assert.deepEqual([s.health, s.shield, s.armor, s.energy], [370, 370, 420, 320]);
});

test('general rule: +100 Health, +100 Shield, +50 Energy, no Armor (Excalibur 270/270/240/100 -> 370/370/240/150)', () => {
  const r = applyMaxRankStats({ name: 'Excalibur', health: 270, shield: 270, armor: 240, energy: 100 });
  assert.deepEqual([r.health, r.shield, r.armor, r.energy], [370, 370, 240, 150]);
  const f = applyMaxRankStats({ name: 'Frost', health: 270, shield: 455, armor: 315, energy: 100 });
  assert.deepEqual([f.health, f.shield, f.energy], [370, 555, 150]);
});

test('exceptions override the general rule, including Armor gains', () => {
  const k = applyMaxRankStats({ name: 'Kullervo', health: 1005, shield: 0, armor: 550, energy: 175 });
  assert.deepEqual([k.health, k.shield, k.armor, k.energy], [1205, 0, 650, 225]);
  assert.ok(RANK_30_GAIN_EXCEPTIONS['Inaros Prime'] && RANK_30_GAIN_EXCEPTIONS['Valkyr Prime']);
});

test('without a name the stats are used as given, and missing stats stay missing', () => {
  const raw = { health: 100, shield: 50, armor: 10, energy: 5 };
  assert.deepEqual(applyMaxRankStats(raw), raw);
  assert.equal(applyMaxRankStats({ name: 'Excalibur', health: null, shield: 1, armor: 1, energy: 1 }).health, null);
});

test('resilience also models max rank', () => {
  const r = computeResilience({ baseStats: { name: 'Garuda Prime', health: 270, shield: 270, armor: 420, energy: 220 } });
  assert.equal(r.totalHealth, 370);
  assert.equal(r.totalShield, 370);
});

test('Nidus gains +15% Ability Strength and +100 Armor at rank 30', () => {
  const s = computeModdedWarframeStats({ baseStats: { name: 'Nidus', health: 270, shield: 0, armor: 200, energy: 100 } });
  assert.equal(s.abilityStrength, 115);
  assert.equal(s.armor, 300);
  const plain = computeModdedWarframeStats({ baseStats: { name: 'Excalibur', health: 270, shield: 270, armor: 240, energy: 100 } });
  assert.equal(plain.abilityStrength, 100);
});
