import test from 'node:test';
import assert from 'node:assert/strict';
import { KUVA_WEAPON_NAMES } from '../src/constants/kuvaWeapons.js';
import {
  emptyCycle, rejectWeapon, unrejectWeapon, takeWeapon, finishLich, setTarget, poolOf, huntOdds, validateCycle,
} from '../src/utils/kuvaCycle.js';

test('the weapon list is 21 distinct Kuva weapons', () => {
  assert.equal(KUVA_WEAPON_NAMES.length, 21);
  assert.equal(new Set(KUVA_WEAPON_NAMES).size, 21);
  assert.ok(KUVA_WEAPON_NAMES.every(n => n.startsWith('Kuva ')));
});

test('finishing a mission cycles the weapon; doing it twice changes nothing', () => {
  const a = rejectWeapon(emptyCycle(), 'Kuva Tonkor');
  assert.deepEqual(a.state.rejected, ['Kuva Tonkor']);
  const b = rejectWeapon(a.state, 'Kuva Tonkor');
  assert.deepEqual(b.state.rejected, ['Kuva Tonkor']);
  assert.equal(poolOf(a.state).includes('Kuva Tonkor'), false);
  assert.equal(poolOf(a.state).length, 20);
});

test('unknown weapons are ignored', () => {
  assert.deepEqual(rejectWeapon(emptyCycle(), 'Kuva Tomcore').state.rejected, []);
});

test('taking a weapon clears the reject list, sets the current Lich, keeps another target', () => {
  let s = setTarget(emptyCycle(), 'Kuva Karak');
  s = rejectWeapon(s, 'Kuva Tonkor').state;
  s = rejectWeapon(s, 'Kuva Grattler').state;
  const after = takeWeapon(s, 'Kuva Quartakk');
  assert.deepEqual(after.rejected, []);
  assert.equal(after.target, 'Kuva Karak');
  assert.equal(after.currentLich, 'Kuva Quartakk');
});

test('taking the hunted weapon ends the hunt', () => {
  const s = takeWeapon(setTarget(emptyCycle(), 'Kuva Karak'), 'Kuva Karak');
  assert.equal(s.target, null);
  assert.equal(s.currentLich, 'Kuva Karak');
});

test('taking an unknown weapon changes nothing', () => {
  const s = setTarget(emptyCycle(), 'Kuva Karak');
  assert.equal(takeWeapon(s, 'Kuva Tomcore'), s);
});

test('finishing the Lich frees the slot, resets the list and keeps the target', () => {
  let s = takeWeapon(setTarget(emptyCycle(), 'Kuva Karak'), 'Kuva Quartakk');
  s = rejectWeapon(s, 'Kuva Seer').state;
  const done = finishLich(s);
  assert.equal(done.currentLich, null);
  assert.deepEqual(done.rejected, []);
  assert.equal(done.target, 'Kuva Karak');
});

test('cycling every weapon resets the list', () => {
  let s = emptyCycle();
  for (const w of KUVA_WEAPON_NAMES.slice(0, 20)) s = rejectWeapon(s, w).state;
  assert.equal(s.rejected.length, 20);
  const last = rejectWeapon(s, KUVA_WEAPON_NAMES[20]);
  assert.equal(last.reset, true);
  assert.deepEqual(last.state.rejected, []);
});

test('undoing a tap puts the weapon back in the pool', () => {
  const s = rejectWeapon(emptyCycle(), 'Kuva Seer').state;
  assert.deepEqual(unrejectWeapon(s, 'Kuva Seer').rejected, []);
  assert.equal(unrejectWeapon(s, 'Kuva Hek'), s);
});

test('hunt odds: still possible, already cycled, and none', () => {
  assert.equal(huntOdds(emptyCycle()).status, 'none');

  let s = setTarget(emptyCycle(), 'Kuva Hind');
  assert.deepEqual(huntOdds(s), { status: 'possible', remaining: 21, chance: 1 / 21, worstCase: 21 });
  s = rejectWeapon(s, 'Kuva Tonkor').state;
  s = rejectWeapon(s, 'Kuva Grattler').state;
  const o = huntOdds(s);
  assert.equal(o.remaining, 19);
  assert.equal(o.worstCase, 19);

  // Target cycled: others still in the pool is how many more missions until the reset.
  const t = rejectWeapon(s, 'Kuva Hind').state;
  assert.deepEqual(huntOdds(t), { status: 'cycled', missionsUntilReset: 18 });
});

test('with one weapon left the hunted weapon is certain next', () => {
  let s = setTarget(emptyCycle(), 'Kuva Zarr');
  for (const w of KUVA_WEAPON_NAMES.filter(n => n !== 'Kuva Zarr')) s = rejectWeapon(s, w).state;
  assert.deepEqual(huntOdds(s), { status: 'possible', remaining: 1, chance: 1, worstCase: 1 });
});

test('validateCycle flags bad saved data', () => {
  assert.deepEqual(validateCycle(emptyCycle()), []);
  assert.ok(validateCycle({ rejected: ['Kuva Hek', 'Kuva Hek'], target: null }).length > 0);
  assert.ok(validateCycle({ rejected: ['Kuva Tomcore'], target: null }).length > 0);
  assert.ok(validateCycle({ rejected: [], target: 'Soma' }).length > 0);
  assert.ok(validateCycle({ rejected: [], target: null, currentLich: 'Soma' }).length > 0);
  assert.ok(validateCycle({ rejected: [...KUVA_WEAPON_NAMES], target: null }).length > 0);
});
