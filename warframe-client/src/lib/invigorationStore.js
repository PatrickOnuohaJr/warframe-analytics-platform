import { wfUser } from './supabase';
import { fetchAll } from './fetchAll';
import { buildEvent } from '../utils/invigorationLedger';

// Reads and writes wf_user.invigoration_events (the append-only Invigoration
// log). Events are only ever inserted or voided, never deleted or edited in
// place. All rules live in utils/invigorationLedger.js.

// Table or column not created yet: the UI then tells the user to run
// DB/Migrations/20261103_add_invigoration_events.sql.
const MISSING_CODES = new Set(['42P01', 'PGRST205', 'PGRST106', '42703', 'PGRST204']);
export const isMissingMigration = error => Boolean(error && MISSING_CODES.has(error.code));

// All events, oldest first. Returns { events, error }.
export async function loadEvents() {
  const { data, error } = await fetchAll(() =>
    wfUser.from('invigoration_events').select('*').order('event_id', { ascending: true })
  );
  if (error) return { events: [], error };
  return { events: data ?? [], error: null };
}

// Inserts one event built from the draft and the offer's current values.
// Returns the saved row or throws-free { error }.
export async function addEvent(draft, offer) {
  const { data, error } = await wfUser
    .from('invigoration_events')
    .insert(buildEvent(draft, offer))
    .select()
    .single();
  return { event: data ?? null, error };
}

// Corrects a mistake without deleting it: the event stays in history, struck
// through with the reason, and the counter recalculates without it.
export async function voidEvent(eventId, reason) {
  const { error } = await wfUser
    .from('invigoration_events')
    .update({ voided_at: new Date().toISOString(), void_reason: reason || null })
    .eq('event_id', eventId)
    .is('voided_at', null);
  return error;
}
