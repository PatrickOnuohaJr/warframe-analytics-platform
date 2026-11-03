import { wfUser } from './supabase';

// Saves the Kuva weapon cycle (which weapons you have cycled past, and the one
// you are hunting) to wf_user.weapon_cycles: one row per pool, owner-only.
// `pool` is 'kuva' today; the column leaves room for a Tenet pool later.

// Table-not-created-yet codes: the tracker then works in memory and says so.
const MISSING_TABLE_CODES = new Set(['42P01', 'PGRST205', 'PGRST106']);
export const isMissingTable = error => Boolean(error && MISSING_TABLE_CODES.has(error.code));

// Returns { state, error }; state is null when nothing has been saved yet.
export async function loadCycle(pool = 'kuva') {
  const { data, error } = await wfUser
    .from('weapon_cycles')
    .select('rejected, target, current_lich')
    .eq('pool', pool)
    .maybeSingle();
  if (error) return { state: null, error };
  if (!data) return { state: null, error: null };
  return {
    state: { rejected: data.rejected ?? [], target: data.target ?? null, currentLich: data.current_lich ?? null },
    error: null,
  };
}

// user_id fills itself from the signed-in user (column default).
export async function saveCycle(state, pool = 'kuva') {
  const { error } = await wfUser.from('weapon_cycles').upsert(
    {
      pool, rejected: state.rejected, target: state.target, current_lich: state.currentLich,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,pool' },
  );
  return error;
}
