import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveCounter, offerStatus, validateEvent, buildEvent, offerChanged, utcWeekStart, describeEvent, liveEvents, timeLeftInWeek,
} from '../src/utils/invigorationLedger.js';

let id = 0;
const ev = (event_type, extra = {}) => ({ event_id: ++id, occurred_at: '2026-11-03T00:00:00Z', event_type, voided_at: null, ...extra });
const applied = (offer_id, role = 'original') => ev('applied', { offer_id, recipient_role: role, recipient_frame_name: 'X' });
const OFFER = { id: 1, slot: 'A', week_start: '2026-11-02', frame_name: 'Mirage', offense_buff: 'Ability Strength +200%', utility_buff: 'Energy Max +200%' };

test('only applied events raise the counter; offers, skips and nothing else do not', () => {
  assert.equal(deriveCounter([]).progress, 0);
  assert.equal(deriveCounter([ev('skipped', { offer_id: 1, recipient_role: 'original' })]).progress, 0);
  assert.equal(deriveCounter([applied(1), applied(2), applied(3)]).progress, 3);
});

test('calibration sets the starting value and applications count on top of it', () => {
  const events = [ev('counter_set', { counter_value: 7 }), applied(1), applied(2)];
  assert.equal(deriveCounter(events).progress, 9);
});

test('10/10 is a cap with no hidden progress, and Ready stays until an Override is selected', () => {
  const events = [ev('counter_set', { counter_value: 9 }), applied(1), applied(2), applied(3)];
  const c = deriveCounter(events);
  assert.deepEqual([c.progress, c.ready], [10, true]);
  // Voiding one of the extra applications still leaves it at 10: no surplus was kept.
  events[2].voided_at = 'x';
  assert.equal(deriveCounter(events).progress, 10);
  events[1].voided_at = 'x';
  events[3].voided_at = 'x';
  assert.equal(deriveCounter(events).progress, 9);
});

test('an Override selection resets to zero and is not itself an application', () => {
  const events = [ev('counter_set', { counter_value: 10 }), ev('override_selected', { offer_id: 1, recipient_role: 'override', recipient_frame_name: 'Frost' })];
  assert.deepEqual([deriveCounter(events).progress, deriveCounter(events).ready], [0, false]);
});

test('the Override recipient application counts only if the one configurable rule says so', () => {
  const events = [ev('counter_set', { counter_value: 10 }), ev('override_selected', { offer_id: 1, recipient_role: 'override', recipient_frame_name: 'Frost' }), applied(1, 'override')];
  // Default (unverified): it does not count. The rule is one exported constant and function in the ledger.
  assert.equal(deriveCounter(events).progress, 0);
});

test('original and override recipients of the same slot are recorded separately', () => {
  const base = [ev('counter_set', { counter_value: 10 })];
  const events = [...base, applied(1), ev('override_selected', { offer_id: 1, recipient_role: 'override', recipient_frame_name: 'Frost' }), applied(1, 'override')];
  assert.equal(validateEvent(events, { type: 'applied', role: 'override' }, OFFER), 'The Override recipient already has a recorded application for this offer.');
  assert.equal(offerStatus(events, 1), 'applied');
});

test('status is Pending by default and never inferred as Skipped', () => {
  assert.equal(offerStatus([], 1), 'pending');
  assert.equal(offerStatus([applied(2)], 1), 'pending');
  assert.equal(offerStatus([ev('skipped', { offer_id: 1, recipient_role: 'original' })], 1), 'skipped');
});

test('duplicate applications and conflicting outcomes are rejected', () => {
  const events = [applied(1)];
  assert.match(validateEvent(events, { type: 'applied' }, OFFER), /already has a recorded outcome/);
  assert.match(validateEvent(events, { type: 'skipped' }, OFFER), /already has a recorded outcome/);
  assert.equal(validateEvent([], { type: 'applied' }, OFFER), null);
});

test('voiding a mistake recalculates the counter and frees the offer', () => {
  const events = [ev('counter_set', { counter_value: 4 }), applied(1)];
  const a = events[1];
  assert.equal(deriveCounter(events).progress, 5);
  a.voided_at = 'now';
  assert.equal(deriveCounter(events).progress, 4);
  assert.equal(validateEvent(events, { type: 'applied' }, OFFER), null);
});

test('timeline order is event_id, not the entered time or array order', () => {
  const a = { ...ev('counter_set', { counter_value: 2 }), occurred_at: '2030-01-01T00:00:00Z' };
  const b = { ...applied(1), occurred_at: '2020-01-01T00:00:00Z' };
  assert.deepEqual(liveEvents([b, a]).map(e => e.event_id), [a.event_id, b.event_id]);
  assert.equal(deriveCounter([b, a]).progress, 3);
});

test('Override needs a ready counter, a recipient, and only once per offer', () => {
  assert.match(validateEvent([], { type: 'override_selected', recipient: 'Frost' }, OFFER), /not ready/);
  const ready = [ev('counter_set', { counter_value: 10 })];
  assert.match(validateEvent(ready, { type: 'override_selected' }, OFFER), /Pick the Warframe/);
  assert.equal(validateEvent(ready, { type: 'override_selected', recipient: 'Frost' }, OFFER), null);
  const used = [...ready, ev('override_selected', { offer_id: 1, recipient_role: 'override', recipient_frame_name: 'Frost' })];
  assert.match(validateEvent([...used, ev('counter_set', { counter_value: 10 })], { type: 'override_selected', recipient: 'Frost' }, OFFER), /already used/);
  // An override application requires the selection first.
  assert.match(validateEvent([], { type: 'applied', role: 'override' }, OFFER), /Override selection/);
});

test('calibration accepts only whole numbers 0 to 10', () => {
  assert.equal(validateEvent([], { type: 'counter_set', counterValue: 6 }), null);
  assert.ok(validateEvent([], { type: 'counter_set', counterValue: 11 }));
  assert.ok(validateEvent([], { type: 'counter_set', counterValue: 2.5 }));
  assert.ok(validateEvent([], { type: 'counter_set', counterValue: -1 }));
});

test('events snapshot the offer, so a later edit cannot change history', () => {
  const e = buildEvent({ type: 'applied' }, OFFER);
  assert.deepEqual([e.snap_slot, e.snap_frame_name, e.snap_offense_buff, e.snap_utility_buff, e.recipient_frame_name],
    ['A', 'Mirage', 'Ability Strength +200%', 'Energy Max +200%', 'Mirage']);
  const edited = { ...OFFER, frame_name: 'Frost', offense_buff: 'Ability Range +100%' };
  assert.equal(e.snap_frame_name, 'Mirage'); // the saved copy is unaffected by the edit
  assert.deepEqual(offerChanged(OFFER, edited), ['frame_name', 'offense_buff']);
  assert.deepEqual(offerChanged(OFFER, { ...OFFER }), []);
  assert.match(describeEvent(e), /Slot A: applied to Mirage/);
});

test('the weekly boundary is Monday 00:00 UTC and the counter ignores it', () => {
  assert.equal(utcWeekStart(new Date('2026-11-03T12:00:00Z')), '2026-11-02'); // Tuesday
  assert.equal(utcWeekStart(new Date('2026-11-02T00:00:00Z')), '2026-11-02'); // Monday 00:00 UTC
  assert.equal(utcWeekStart(new Date('2026-11-01T23:59:59Z')), '2026-10-26'); // Sunday before
  assert.equal(utcWeekStart(new Date('2026-11-08T23:59:59Z')), '2026-11-02'); // Sunday end
  // The counter is a pure function of events: events in different weeks accumulate.
  const events = [ev('counter_set', { counter_value: 2 }), { ...applied(1), occurred_at: '2026-11-03T00:00:00Z' }, { ...applied(2), occurred_at: '2026-11-10T00:00:00Z' }];
  assert.equal(deriveCounter(events).progress, 4);
});

test('week countdown shows whole days and hours until Monday 00:00 UTC', () => {
  // Patrick's case: Wednesday 09:50 UTC -> 4 days 14 hours (and 10 min) left.
  assert.deepEqual(timeLeftInWeek(new Date('2026-11-04T09:50:00Z')), { days: 4, hours: 14 });
  // The reset instant starts a fresh week with the full 7 days left.
  assert.deepEqual(timeLeftInWeek(new Date('2026-11-02T00:00:00Z')), { days: 7, hours: 0 });
  assert.deepEqual(timeLeftInWeek(new Date('2026-11-08T23:30:00Z')), { days: 0, hours: 0 });
  assert.deepEqual(timeLeftInWeek(new Date('2026-11-08T22:59:00Z')), { days: 0, hours: 1 });
});
