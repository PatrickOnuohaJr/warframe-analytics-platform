import { wfUser } from './supabase';
import {
  ADVERSARY_TYPES, validateAttempt, validateKnown, passedSlots, succeeded,
} from '../utils/requiemEngine';

// Saves the Requiem Solver's session + stab history to Supabase. Only facts are
// stored (what was equipped, which position failed); the recommendation is
// recomputed from them every time. Positions are 1-3 in the database and
// 0-2 everywhere else in the app.

// Table-not-created-yet codes: the page then works in memory and says so.
const MISSING_TABLE_CODES = new Set(['42P01', 'PGRST205', 'PGRST106']);
export const isMissingTable = error => Boolean(error && MISSING_TABLE_CODES.has(error.code));

const newId = () => (globalThis.crypto?.randomUUID?.()
  ?? `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`);

export function validateSessionFields({ adversaryType, adversaryName, known, ultimatumCount }) {
  const errors = [...validateKnown(known)];
  if (!ADVERSARY_TYPES.includes(adversaryType)) errors.push('Pick Kuva Lich or Sister of Parvos.');
  if (adversaryName && adversaryName.trim().length > 60) errors.push('The name is too long (60 characters max).');
  if (!Number.isInteger(ultimatumCount) || ultimatumCount < 0 || ultimatumCount > 99) errors.push('Ultimatums must be 0-99.');
  return errors;
}

const rowToSession = r => ({
  id: r.id,
  adversaryType: r.adversary_type,
  adversaryName: r.adversary_name ?? '',
  known: r.known_requiems ?? [],
  hasOull: r.has_oull,
  ultimatumCount: r.ultimatum_count,
  status: r.status,
});

const rowToAttempt = r => ({
  id: r.id,
  number: r.attempt_number,
  equipped: r.equipped_sequence,
  failedSlot: r.failed_slot === null ? null : r.failed_slot - 1,
  usedUltimatum: r.used_ultimatum,
});

const attemptToRow = (sessionId, a) => ({
  id: a.id,
  session_id: sessionId,
  attempt_number: a.number,
  equipped_sequence: a.equipped,
  passed_slots: passedSlots(a).map(s => s + 1),
  failed_slot: succeeded(a) ? null : a.failedSlot + 1,
  succeeded: succeeded(a),
  used_ultimatum: Boolean(a.usedUltimatum),
});

export const sessionToRow = s => ({
  adversary_type: s.adversaryType,
  adversary_name: s.adversaryName?.trim() ? s.adversaryName.trim() : null,
  known_requiems: s.known,
  has_oull: s.hasOull,
  ultimatum_count: s.ultimatumCount,
  status: s.status ?? 'active',
});

// The most recent adversary still being hunted, with its stabs.
// Returns { session, attempts, error }.
export async function loadActive() {
  const { data, error } = await wfUser
    .from('adversary_sessions')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) return { session: null, attempts: [], error };
  if (!data || data.length === 0) return { session: null, attempts: [], error: null };
  const session = rowToSession(data[0]);
  const { data: rows, error: aErr } = await wfUser
    .from('requiem_attempts')
    .select('*')
    .eq('session_id', session.id)
    .order('attempt_number', { ascending: true });
  if (aErr) return { session, attempts: [], error: aErr };
  return { session, attempts: rows.map(rowToAttempt), error: null };
}

export async function createSession(fields) {
  const id = newId();
  const { error } = await wfUser.from('adversary_sessions').insert({ id, ...sessionToRow(fields) });
  return { id, error };
}

export async function updateSession(id, fields) {
  const patch = { ...sessionToRow(fields), updated_at: new Date().toISOString() };
  if (fields.status === 'completed') patch.completed_at = new Date().toISOString();
  const { error } = await wfUser.from('adversary_sessions').update(patch).eq('id', id);
  return error;
}

// Makes the saved stabs equal `next`: removes ones that are gone, upserts the
// rest. Used for add, edit, delete and undo alike. Attempt numbers are never
// reused or shuffled, so no uniqueness clash can happen mid-update.
export async function syncAttempts(sessionId, previous, next) {
  for (const a of next) {
    const problems = validateAttempt(a);
    if (problems.length > 0) return new Error(problems.join(' '));
  }
  const keep = new Set(next.map(a => a.id));
  const gone = previous.filter(a => !keep.has(a.id)).map(a => a.id);
  if (gone.length > 0) {
    const { error } = await wfUser.from('requiem_attempts').delete().in('id', gone);
    if (error) return error;
  }
  if (next.length > 0) {
    const { error } = await wfUser.from('requiem_attempts').upsert(next.map(a => attemptToRow(sessionId, a)));
    if (error) return error;
  }
  return null;
}

export const nextAttemptNumber = attempts => attempts.reduce((m, a) => Math.max(m, a.number ?? 0), 0) + 1;
export { newId };
