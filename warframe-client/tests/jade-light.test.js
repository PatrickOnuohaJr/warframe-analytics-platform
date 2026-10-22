import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLoadoutSnapshot, JADE_LIGHT_RESULTS } from '../src/utils/jadeLightSnapshot.js';

test('snapshot captures arcanes, shards and mods and defaults missing ranks to 0', () => {
  const s = buildLoadoutSnapshot({
    frame: { build_title: 'Malik', display_name: 'Inaros Prime', arcane_1: 'Arcane Grace', arcane_2: null, subsumed_ability: null },
    equippedMods: [{ slot: '1', name: 'Vitality', rank: 10 }, { slot: 'aura', name: 'Steel Fiber' }],
    shardBonusTexts: ['+150 Armor'],
  });
  assert.deepEqual(s.arcanes, ['Arcane Grace']);
  assert.deepEqual(s.shards, ['+150 Armor']);
  assert.equal(s.warframe_mods[1].rank, 0);
  assert.equal(s.mods_recorded, true);
});

test('snapshot flags builds whose mods were never entered', () => {
  const s = buildLoadoutSnapshot({ frame: { display_name: 'Oberon Prime' } });
  assert.equal(s.mods_recorded, false);
  assert.deepEqual(s.warframe_mods, []);
});

test('only the three defined outcomes exist -- no invented lower tiers', () => {
  assert.deepEqual(JADE_LIGHT_RESULTS, ['Tier 0', 'Tier 1', 'Did not survive']);
});
