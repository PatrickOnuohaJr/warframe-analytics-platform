// Interprets the result of "can this signed-in user see their owner row?",
// i.e. `select user_id from wf_user.app_owners` run with the user's session.
//
//   owner         -- a row came back: this account is the app's owner.
//   not-owner     -- the query worked but returned nothing: signed in, but not
//                    the owner, so the database will refuse everything else.
//   not-enforced  -- the app_owners table doesn't exist yet, i.e. the owner-only
//                    lockdown hasn't been run. Let the user through (the
//                    database is still open at that stage).
//   error         -- anything else (network, expired session, ...): fail closed
//                    and let the user retry rather than guessing.
const MISSING_TABLE_CODES = new Set(['42P01', 'PGRST205', 'PGRST106']);

export function classifyOwnerCheck({ data, error }) {
  if (error) {
    return MISSING_TABLE_CODES.has(error.code) ? 'not-enforced' : 'error';
  }
  return data ? 'owner' : 'not-owner';
}
