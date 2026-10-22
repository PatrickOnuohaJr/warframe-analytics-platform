// A build's survivability standing, shown on the codex card and the build modal.
//
// Two inputs, deliberately separate:
//   claim      -- Patrick's own call ('Tier 0' | 'Tier 1' | null): "I think this
//                 build is a Tier 0 / Tier 1 contender". Stored on my_frames.
//   latestTest -- the newest logged Jade Light result for the build, if any.
// A logged test always wins over the claim: reality beats a guess. A tier can
// only be "tested" through a Jade Light result, never by setting the claim.

export const SURVIVABILITY_CLAIMS = ['Tier 0', 'Tier 1'];

export const FAILED_LABEL = 'Back to the drawing board';

// Returns { state, tier, label, short }:
//   tested    -- latest Jade Light result is Tier 0 / Tier 1
//   failed    -- latest result is 'Did not survive'
//   candidate -- no decisive test, but Patrick claimed a tier
//   untested  -- neither (the default for every build)
export function deriveSurvivabilityStatus(claim, latestTest) {
  const result = latestTest?.result;

  if (result === 'Tier 0' || result === 'Tier 1') {
    return { state: 'tested', tier: result, label: `${result} · tested`, short: result.toUpperCase() };
  }
  if (result === 'Did not survive') {
    return { state: 'failed', tier: null, label: FAILED_LABEL, short: 'DRAWING BOARD' };
  }
  if (SURVIVABILITY_CLAIMS.includes(claim)) {
    return { state: 'candidate', tier: claim, label: `${claim} candidate`, short: `${claim.toUpperCase()} ?` };
  }
  return { state: 'untested', tier: null, label: 'Untested', short: '' };
}

// Picks the newest result: dated tests first (latest date wins), then by
// when it was logged. Undated rows (e.g. backfilled results) sort after dated.
export function latestJadeLightTest(tests = []) {
  return [...tests].sort((a, b) => {
    const ad = a.tested_on ?? '';
    const bd = b.tested_on ?? '';
    if (ad !== bd) return ad < bd ? 1 : -1;
    return (b.created_at ?? '') < (a.created_at ?? '') ? -1 : 1;
  })[0] ?? null;
}
