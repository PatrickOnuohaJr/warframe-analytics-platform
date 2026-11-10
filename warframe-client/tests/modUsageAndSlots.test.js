import test from 'node:test';
import assert from 'node:assert/strict';
import { countModUsage, sortByUsage } from '../src/utils/modUsage.js';
import { canPlace, planSlotMove, planPickerDrop, planUmbralFill, describeUmbralFill } from '../src/utils/slotMoves.js';

test('countModUsage counts per mod and ignores rivens / empty rows', () => {
  const usage = countModUsage([{ mod_id: 1 }, { mod_id: 1 }, { mod_id: 2 }, { mod_id: null }, null]);
  assert.equal(usage.get(1), 2);
  assert.equal(usage.get(2), 1);
  assert.equal(usage.size, 2);
});

test('sortByUsage puts most-used first and keeps order for ties and unused', () => {
  const mods = [
    { mod_id: 1, name: 'Archon Continuity' },
    { mod_id: 2, name: 'Constitution' },
    { mod_id: 3, name: 'Primed Continuity' },
    { mod_id: 4, name: 'Zeta' },
  ];
  const usage = new Map([[3, 9], [1, 1]]);
  assert.deepEqual(sortByUsage(mods, usage).map(m => m.name), ['Primed Continuity', 'Archon Continuity', 'Constitution', 'Zeta']);
  // no usage data at all: unchanged order
  assert.deepEqual(sortByUsage(mods, new Map()).map(m => m.name), mods.map(m => m.name));
});

const aura = { mod_id: 10, name: 'Growing Power', is_aura: true };
const exil = { mod_id: 11, name: 'Primed Sure Footed', is_exilus: true };
const plain = { mod_id: 12, name: 'Blind Rage' };
const riven = { riven_id: 5, name: 'Riven', isRiven: true };

test('canPlace enforces aura / stance / exilus rules', () => {
  assert.equal(canPlace('aura', aura), true);
  assert.equal(canPlace('1', aura), false);
  assert.equal(canPlace('aura', plain), false);
  assert.equal(canPlace('exilus', exil), true);
  assert.equal(canPlace('exilus', plain), false);
  assert.equal(canPlace('exilus', riven), false);
  assert.equal(canPlace('3', riven), true);
  assert.equal(canPlace('stance', { is_stance: true }), true);
});

const items = { 1: plain, 2: exil, 3: aura };
const resolveItem = slot => (slot.mod_id ? Object.values(items).find(i => i.mod_id === slot.mod_id) : null);
const slot = mod_id => ({ mod_id, riven_id: null, polarity: null });

test('planSlotMove moves into an empty slot and clears the source', () => {
  const slots = new Map([['1', slot(12)]]);
  const { changes } = planSlotMove({ from: '1', to: '4', slotsByPosition: slots, resolveItem });
  assert.deepEqual(changes, [
    { position: '4', mod_id: 12, riven_id: null },
    { position: '1', mod_id: null, riven_id: null },
  ]);
});

test('planSlotMove swaps when both fit and refuses when the swap is illegal', () => {
  const slots = new Map([['1', slot(12)], ['exilus', slot(11)], ['2', slot(11)]]);
  // plain -> exilus slot is illegal
  assert.ok(planSlotMove({ from: '1', to: 'exilus', slotsByPosition: slots, resolveItem }).error);
  // exilus mod from slot 2 swaps with plain in slot 1: both legal
  const swap = planSlotMove({ from: '2', to: '1', slotsByPosition: slots, resolveItem });
  assert.deepEqual(swap.changes.map(c => [c.position, c.mod_id]), [['1', 11], ['2', 12]]);
  // exilus slot (mod 11) onto slot 1 (plain 12): plain can't swap into exilus
  assert.ok(planSlotMove({ from: 'exilus', to: '1', slotsByPosition: slots, resolveItem }).error);
});

test('planPickerDrop validates and replaces', () => {
  assert.ok(planPickerDrop({ to: '1', item: aura }).error);
  assert.deepEqual(planPickerDrop({ to: '1', item: plain }).changes, [{ position: '1', mod_id: 12, riven_id: null }]);
  assert.deepEqual(planPickerDrop({ to: '2', item: riven }).changes, [{ position: '2', mod_id: null, riven_id: 5 }]);
});

const umbral = (id, name, polarity) => ({ mod_id: id, name, polarity });
const catalog = [umbral(21, 'Umbral Intensify', 'madurai'), umbral(22, 'Umbral Fiber', 'naramon'), umbral(23, 'Umbral Vitality', 'vazarin')];

test('planUmbralFill fills free slots, prefers matching polarity, never overwrites', () => {
  const slots = new Map([
    ['1', slot(99)], // filled, must stay
    ['2', { mod_id: null, riven_id: null, polarity: 'naramon' }],
  ]);
  const owned = new Map([[21, {}], [22, {}], [23, {}]]);
  const plan = planUmbralFill({ catalog, ownedByModId: owned, slotsByPosition: slots });
  assert.equal(plan.placements.length, 3);
  assert.equal(plan.placements.find(p => p.name === 'Umbral Fiber').position, '2'); // polarity match
  assert.ok(plan.placements.every(p => p.position !== '1'));
  assert.equal(new Set(plan.placements.map(p => p.position)).size, 3);
});

test('planUmbralFill reports unowned, already equipped and no-slot mods', () => {
  const slots = new Map([['1', slot(21)], ['2', slot(1)], ['3', slot(1)], ['4', slot(1)], ['5', slot(1)], ['6', slot(1)], ['7', slot(1)]]);
  // slot 8 free; Intensify equipped, Fiber unowned, Vitality gets slot 8
  const plan = planUmbralFill({ catalog, ownedByModId: new Map([[21, {}], [23, {}]]), slotsByPosition: slots });
  assert.deepEqual(plan.alreadyEquipped, ['Umbral Intensify']);
  assert.deepEqual(plan.notOwned, ['Umbral Fiber']);
  assert.deepEqual(plan.placements.map(p => p.position), ['8']);
  assert.match(describeUmbralFill(plan), /Not owned, skipped: Umbral Fiber/);

  // all slots full -> noSlot
  slots.set('8', slot(2));
  const full = planUmbralFill({ catalog, ownedByModId: new Map([[23, {}]]), slotsByPosition: slots });
  assert.deepEqual(full.noSlot, ['Umbral Vitality']);
});
