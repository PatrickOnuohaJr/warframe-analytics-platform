// Pure rules for the Invigoration activity log and Override counter.
//
// Weekly OFFERS live in wf_user.helminth_invigorations. What actually happened
// is an append-only list of EVENTS (wf_user.invigoration_events):
//   applied            an Invigoration was applied to a Warframe
//   skipped            an offer's original recipient was not Invigorated
//   override_selected  the Override was used on an offer (new recipient chosen)
//   counter_set        the player calibrated the counter by hand (0-10)
// Nothing is stored for status or progress: both are derived here from the
// live (not voided) events, so a correction recalculates everything and the
// two can never disagree.
//
// Timeline order is `eventId` (the database's identity column), never the
// time a user typed, so replaying the same events always gives the same result.

export const COUNTER_CAP = 10;

// ---- The one place the unverified counting rules live ------------------------
// Does an Invigoration applied to the Override's recipient count toward the
// NEXT ten? Not verified in game; Patrick has asked for this to be a single
// function so it can be corrected without a migration. Flip the flag below (or
// edit the function) and every counter recalculates from the same events.
export const COUNT_OVERRIDE_RECIPIENT_APPLICATION = false;

// Which events raise the counter by one. Only actual applications can.
// An Override selection is never an application (it resets instead).
export function countsTowardProgress(event) {
  if (event.event_type !== 'applied') return false;
  if (event.recipient_role === 'override') return COUNT_OVERRIDE_RECIPIENT_APPLICATION;
  return true;
}
// -----------------------------------------------------------------------------

// Live events in deterministic order.
export function liveEvents(events = []) {
  return events
    .filter(e => !e.voided_at)
    .slice()
    .sort((a, b) => a.event_id - b.event_id);
}

// Override progress 0-10 from the live events:
//  - counter_set sets it to the entered value (calibration or correction)
//  - override_selected resets it to 0
//  - each counted application adds 1, never past the 10/10 cap (no hidden
//    progress is kept beyond the cap)
// `ready` is true at 10 and stays true until an override_selected event.
export function deriveCounter(events = []) {
  let progress = 0;
  liveEvents(events).forEach(e => {
    if (e.event_type === 'counter_set') progress = clampCounter(e.counter_value);
    else if (e.event_type === 'override_selected') progress = 0;
    else if (countsTowardProgress(e)) progress = Math.min(COUNTER_CAP, progress + 1);
  });
  return { progress, ready: progress >= COUNTER_CAP, cap: COUNTER_CAP };
}

function clampCounter(value) {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.max(0, Math.min(COUNTER_CAP, n)) : 0;
}

// Status of one offer, for its ORIGINAL recipient. Pending is the default:
// no event never means skipped.
export function offerStatus(events = [], offerId) {
  const mine = liveEvents(events).filter(e => e.offer_id === offerId && e.recipient_role === 'original');
  if (mine.some(e => e.event_type === 'applied')) return 'applied';
  if (mine.some(e => e.event_type === 'skipped')) return 'skipped';
  return 'pending';
}

// Live events recorded against one offer (applications for either recipient,
// skip, Override selection), oldest first.
export function offerEvents(events = [], offerId) {
  return liveEvents(events).filter(e => e.offer_id === offerId);
}

// The Override selection for an offer, if one is live.
export function overrideFor(events = [], offerId) {
  return liveEvents(events).find(e => e.offer_id === offerId && e.event_type === 'override_selected') ?? null;
}

// Builds a new event from a draft and the offer it concerns, copying the offer
// as it is NOW into the snap_* fields so later edits cannot rewrite history.
// draft: { type, role, recipient, counterValue, note, occurredAt }
export function buildEvent(draft, offer) {
  if (draft.type === 'counter_set') {
    return {
      event_type: 'counter_set',
      counter_value: clampCounter(draft.counterValue),
      note: draft.note || null,
      ...(draft.occurredAt ? { occurred_at: draft.occurredAt } : {}),
    };
  }
  return {
    event_type: draft.type,
    offer_id: offer.id,
    recipient_role: draft.role ?? (draft.type === 'override_selected' ? 'override' : 'original'),
    recipient_frame_name: draft.recipient ?? offer.frame_name,
    snap_week_start: offer.week_start,
    snap_slot: offer.slot,
    snap_frame_name: offer.frame_name,
    snap_offense_buff: offer.offense_buff,
    snap_utility_buff: offer.utility_buff,
    note: draft.note || null,
    ...(draft.occurredAt ? { occurred_at: draft.occurredAt } : {}),
  };
}

// Returns an error message when the draft should not be recorded, or null.
// The database enforces the same duplicate rules; this gives a clear message
// first and keeps a double click from reaching it.
export function validateEvent(events = [], draft, offer) {
  if (draft.type === 'counter_set') {
    const n = Number(draft.counterValue);
    return Number.isInteger(n) && n >= 0 && n <= COUNTER_CAP ? null : `Counter must be a whole number from 0 to ${COUNTER_CAP}.`;
  }
  if (!offer?.id) return 'Save this offer before recording what happened to it.';
  if (!offer.slot) return 'This offer has no slot yet (run the Invigoration migration).';
  const live = offerEvents(events, offer.id);

  if (draft.type === 'applied' || draft.type === 'skipped') {
    const role = draft.role ?? 'original';
    if (draft.type === 'skipped' && role !== 'original') return 'Only the offer\'s own Warframe can be skipped.';
    if (live.some(e => e.recipient_role === role && (e.event_type === 'applied' || e.event_type === 'skipped'))) {
      return role === 'original'
        ? 'This offer already has a recorded outcome. Void it first to change it.'
        : 'The Override recipient already has a recorded application for this offer.';
    }
    if (role === 'override' && !live.some(e => e.event_type === 'override_selected')) {
      return 'Record the Override selection for this offer first.';
    }
    if (role === 'override' && draft.type !== 'applied') return 'Only an application can be recorded for the Override recipient.';
    return null;
  }

  if (draft.type === 'override_selected') {
    if (live.some(e => e.event_type === 'override_selected')) return 'The Override was already used on this offer.';
    if (!draft.recipient) return 'Pick the Warframe that received the Override.';
    if (!deriveCounter(events).ready) return 'Override is not ready yet (progress is below 10).';
    return null;
  }
  return 'Unknown event type.';
}

// Offer fields a correction can change (the buff pair and the recipient).
// Used to decide whether an edit is "consequential" and needs confirmation.
export function offerChanged(before, after) {
  return ['frame_name', 'offense_buff', 'utility_buff'].filter(k => (before?.[k] ?? '') !== (after?.[k] ?? ''));
}

// Monday 00:00 UTC of the week containing `date`, as YYYY-MM-DD. The game's
// weekly reset is on UTC, not the viewer's local day.
export function utcWeekStart(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const sinceMonday = (d.getUTCDay() + 6) % 7; // Monday=0 ... Sunday=6
  d.setUTCDate(d.getUTCDate() - sinceMonday);
  return d.toISOString().slice(0, 10);
}

// Whole days and hours left until the weekly reset (next Monday 00:00 UTC),
// rounded DOWN, so 4d 14h 10m reads "4 days 14 hours". Exactly at the reset it
// is a fresh week with the full 7 days left.
export function timeLeftInWeek(now = new Date()) {
  const start = Date.parse(`${utcWeekStart(now)}T00:00:00Z`);
  const end = start + 7 * 24 * 3600 * 1000;
  const hoursLeft = Math.floor((end - now.getTime()) / 3600000);
  return { days: Math.floor(hoursLeft / 24), hours: hoursLeft % 24 };
}

// One readable line per event for the history list.
export function describeEvent(e) {
  const slot = e.snap_slot ? `Slot ${e.snap_slot}` : '';
  const buffs = e.snap_offense_buff ? ` (${e.snap_offense_buff} / ${e.snap_utility_buff})` : '';
  switch (e.event_type) {
    case 'applied':
      return `${slot}: applied to ${e.recipient_frame_name}${e.recipient_role === 'override' ? ' (Override recipient)' : ''}${buffs}`;
    case 'skipped':
      return `${slot}: skipped for ${e.recipient_frame_name}${buffs}`;
    case 'override_selected':
      return `${slot}: Override used, ${e.recipient_frame_name} selected (offer was for ${e.snap_frame_name})${buffs}`;
    case 'counter_set':
      return `Counter set to ${e.counter_value} / ${COUNTER_CAP}`;
    default:
      return e.event_type;
  }
}
