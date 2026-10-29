// Valence Fusion maths for Kuva / Tenet / Coda weapons (wiki.warframe.com
// /w/Valence_Fusion). Fusing two copies of the same weapon gives
//   result = 1.1 x the HIGHER of the two bonuses, floored to 0.1%,
// with anything >= 58% rounded up to 60% and 60% as the hard cap. The donor's
// own roll only matters when it is higher than the weapon being fused into,
// so a poor donor still triggers the full +10%.
//
// Percentages are handled as integer tenths (56.4% = 564) so repeated
// multiplication never drifts through floating point.

export const MAX_TENTHS = 600;
const ROUND_UP_FROM = 580;

export const toTenths = pct => Math.round(Number(pct) * 10);
export const fromTenths = t => t / 10;

// One fusion of a base (tenths) with a donor (tenths) -> new bonus (tenths).
// Pass donor = 0 for "any donor weaker than the base".
export function fuse(base, donor = 0) {
  const best = Math.max(base, donor);
  const raised = Math.floor((best * 11) / 10);
  if (raised >= ROUND_UP_FROM) return MAX_TENTHS;
  return Math.min(raised, MAX_TENTHS);
}

// The bonus after each successive fusion with weak donors, ending at 60%.
// Returns [{ step, tenths }] excluding the starting value; [] when already
// at the cap or the start isn't a usable positive number.
export function fusionPath(start) {
  const path = [];
  if (!(start > 0)) return path;
  let current = start;
  while (current < MAX_TENTHS && path.length < 60) {
    const next = fuse(current);
    if (next <= current) break; // cannot progress (guard, shouldn't happen for start >= 1)
    current = next;
    path.push({ step: path.length + 1, tenths: current });
  }
  return path;
}

export function fusionsNeeded(start) {
  if (start >= MAX_TENTHS) return 0;
  const path = fusionPath(start);
  return path.length && path[path.length - 1].tenths >= MAX_TENTHS ? path.length : null;
}

// Lowest starting bonus (tenths) that reaches 60% in at most n fusions.
export function minStartFor(n) {
  for (let t = 1; t <= MAX_TENTHS; t++) {
    const needed = fusionsNeeded(t);
    if (needed !== null && needed <= n) return t;
  }
  return MAX_TENTHS;
}
