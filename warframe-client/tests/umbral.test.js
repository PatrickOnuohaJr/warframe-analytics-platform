import test from 'node:test';
import assert from 'node:assert/strict';
import { computeModdedWarframeStats, computeResilience, countUmbralSetPieces } from '../src/utils/survivability.js';

// Real solo (rank 10) card text, as stored in wf_base.mods.
const umbral = (name, stat) => ({ name, raw_json: { levelStats: [{ stats: [] }, { stats: [stat, '+11% <DT_SENTIENT>Tau Resistance'] }] } });
const vitality = umbral('Umbral Vitality', '+100% Health');
const fiber = umbral('Umbral Fiber', '+100% Armor');
const intensify = umbral('Umbral Intensify', '+44% Ability Strength');
// rank 10 is index 1 in these fixtures; the enhanced override keys off rank === 10, so use a 11-entry array.
const at10 = mod => ({ ...mod, raw_json: { levelStats: Array.from({ length: 11 }, (_, i) => (i === 10 ? mod.raw_json.levelStats[1] : { stats: [] })) } });
const eq = (...mods) => mods.map(m => ({ mod: at10(m), rank: 10 }));
const base = { health: 100, shield: 0, armor: 100, energy: 0, sprint_speed: 1 };
const stats = (...mods) => computeModdedWarframeStats({ baseStats: base, equippedMods: eq(...mods) });

test('solo Umbral mods use their printed values', () => {
  const s = stats(vitality);
  assert.equal(s.health, 200);
  assert.equal(stats(intensify).abilityStrength, 144);
});

test('two pieces: Vitality/Fiber +130%, Intensify +55%', () => {
  assert.equal(stats(vitality, fiber).health, 230);
  assert.equal(stats(vitality, fiber).armor, 230);
  assert.equal(stats(vitality, intensify).abilityStrength, 155);
});

test('full set: Vitality/Fiber +180%, Intensify +77%', () => {
  const s = stats(vitality, intensify, fiber);
  assert.equal(s.health, 280);
  assert.equal(s.armor, 280);
  assert.equal(s.abilityStrength, 177);
});

test('Garuda Prime full-set screen: armor 1,626 from base 420 + two +225 shards', () => {
  const s = computeModdedWarframeStats({
    baseStats: { health: 370, shield: 0, armor: 420, energy: 0, sprint_speed: 1 },
    equippedMods: eq(vitality, intensify, fiber),
    shardBonusTexts: ['+225 Armor', '+225 Armor'],
  });
  assert.equal(s.armor, 1626);
  assert.equal(s.health, 1036);
});

test('a sub-max Umbral mod falls back to its normal value and a duplicate does not inflate the set', () => {
  const low = [{ mod: at10(vitality), rank: 5 }, { mod: at10(fiber), rank: 10 }];
  assert.equal(computeModdedWarframeStats({ baseStats: base, equippedMods: low }).health, 100);
  assert.equal(countUmbralSetPieces([...eq(vitality), ...eq(vitality)]), 1);
});

test('resilience applies the same set scaling as the modded stats panel', () => {
  const r = computeResilience({ baseStats: { health: 100, shield: 0, armor: 0 }, equippedMods: eq(vitality, intensify, fiber) });
  assert.equal(r.totalHealth, 280);
});
