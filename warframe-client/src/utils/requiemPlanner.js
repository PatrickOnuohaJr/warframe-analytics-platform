// Requiem Solver -- next-stab planner (pure).
//
// Given the secret sequences still possible, pick the Parazon setup that
// solves the Lich in the fewest stabs. This is an exact decision-tree search:
// for every legal setup, split the remaining sequences by what the game would
// report (fails at slot 1 / 2 / 3, or wins), then recurse on each group.
//
//   expected mode: minimise the average number of stabs still needed
//                  (this one includes the winning stab).
//   worst mode:    minimise the number of stabs in the unluckiest case.
//
// It is NOT "highest chance to win right now": a setup that wins less often
// but splits the field cleanly can finish sooner overall, and this search
// finds that. Results are memoised by candidate group, so asking again after
// each stab is cheap.
//
// Internally mods are small integers (0-7 Requiems, 8 Oull) for speed; the
// exported functions take and return mod names.

import { REQUIEMS, OULL, SLOT_COUNT } from './requiemEngine';

const N = REQUIEMS.length;
const OULL_ID = N;
const EPS = 1e-9;
const WIN = SLOT_COUNT; // outcome code for "all three slots passed"

const modId = name => (name === OULL ? OULL_ID : REQUIEMS.indexOf(name));
const modName = id => (id === OULL_ID ? OULL : REQUIEMS[id]);

// --- Static tables ---------------------------------------------------------

// Every possible secret sequence (336 = 8 x 7 x 6), as [a, b, c] ids.
const ALL = [];
for (let a = 0; a < N; a++) {
  for (let b = 0; b < N; b++) {
    if (b === a) continue;
    for (let c = 0; c < N; c++) if (c !== a && c !== b) ALL.push([a, b, c]);
  }
}
const seqKey = (a, b, c) => a * 81 + b * 9 + c;
const INDEX_OF = new Map(ALL.map((s, i) => [seqKey(...s), i]));

// Legal Parazon setups: three distinct Requiems, plus (when Oull is owned)
// setups with Oull in any one slot. One Oull at most.
const tableCache = new Map();
function tablesFor(hasOull) {
  const cached = tableCache.get(hasOull);
  if (cached) return cached;
  const configs = ALL.map(s => s.slice());
  if (hasOull) {
    for (let pos = 0; pos < SLOT_COUNT; pos++) {
      for (let a = 0; a < N; a++) {
        for (let b = 0; b < N; b++) {
          if (a === b) continue;
          const cfg = [a, b];
          cfg.splice(pos, 0, OULL_ID);
          configs.push(cfg);
        }
      }
    }
  }
  // out[c * ALL.length + s]: result of setup c against secret sequence s.
  const out = new Uint8Array(configs.length * ALL.length);
  configs.forEach((cfg, c) => {
    ALL.forEach((seq, s) => {
      let r = WIN;
      for (let i = 0; i < SLOT_COUNT; i++) {
        if (cfg[i] !== OULL_ID && cfg[i] !== seq[i]) { r = i; break; }
      }
      out[c * ALL.length + s] = r;
    });
  });
  const tables = { configs, out };
  tableCache.set(hasOull, tables);
  return tables;
}

// --- Search ----------------------------------------------------------------

// Groups larger than this are valued by a greedy rollout instead of the exact
// search (see rolloutValue). Exact search time grows steeply with group size.
export const EXACT_LIMIT = 24;
let activeLimit = EXACT_LIMIT;

const memo = new Map();
const rolloutMemo = new Map();
const MEMO_LIMIT = 300000;

// Orders two {e, w, p} scores for the chosen mode; negative means `a` is better.
function compareScores(a, b, mode) {
  const first = mode === 'worst' ? ['w', 'e'] : ['e', 'w'];
  for (const k of first) {
    if (Math.abs(a[k] - b[k]) > EPS) return a[k] - b[k];
  }
  if (Math.abs(a.p - b.p) > EPS) return b.p - a.p; // prefer the likelier immediate win
  return 0;
}

// Heuristic value of a big group: follow the setup that leaves the smallest
// expected group behind (sum of squared group sizes), all the way down. This is
// always an achievable strategy, so it is an upper bound on the true optimum.
function rolloutValue(S, hasOull) {
  if (S.length === 1) return { e: 1, w: 1, p: 1 };
  const key = (hasOull ? '1' : '0') + S.join(',');
  const hit = rolloutMemo.get(key);
  if (hit) return hit;
  const { configs, out } = tablesFor(hasOull);
  const total = S.length;
  let pick = -1;
  let pickCost = Infinity;
  let pickP = -1;
  for (let c = 0; c < configs.length; c++) {
    const counts = [0, 0, 0, 0];
    const base = c * ALL.length;
    for (let i = 0; i < total; i++) counts[out[base + S[i]]]++;
    if (counts[0] === total || counts[1] === total || counts[2] === total) continue;
    const cost = (counts[0] * counts[0] + counts[1] * counts[1] + counts[2] * counts[2]) / total;
    if (cost < pickCost - EPS || (Math.abs(cost - pickCost) <= EPS && counts[WIN] > pickP)) {
      pick = c; pickCost = cost; pickP = counts[WIN];
    }
  }
  const groups = split(S, pick, out);
  let e = 1;
  let w = 1;
  for (let o = 0; o < WIN; o++) {
    if (groups[o].length === 0) continue;
    const child = rolloutValue(groups[o], hasOull);
    e += (groups[o].length / total) * child.e;
    w = Math.max(w, 1 + child.w);
  }
  const result = { e, w, p: pickP / total };
  if (rolloutMemo.size > MEMO_LIMIT) rolloutMemo.clear();
  rolloutMemo.set(key, result);
  return result;
}

// Value of a group: exact when small, rollout when large.
const valueOf = (S, hasOull, mode) =>
  S.length > activeLimit ? rolloutValue(S, hasOull) : search(S, hasOull, mode, 1);

// Splits candidate group `S` (indices into ALL) by the result of setup `c`.
function split(S, c, out) {
  const groups = [[], [], [], []];
  const base = c * ALL.length;
  for (let i = 0; i < S.length; i++) groups[out[base + S[i]]].push(S[i]);
  return groups;
}

// Best way to finish group S. `keep` > 1 returns the best several setups at
// the top level (for alternatives); recursion always asks for the single best.
function search(S, hasOull, mode, keep) {
  if (S.length === 1 && keep === 1) return { e: 1, w: 1, p: 1, c: S[0] }; // configs[0..335] mirror ALL
  const key = keep === 1 ? `${hasOull ? 1 : 0}${mode[0]}|${S.join(',')}` : null;
  if (key) {
    const hit = memo.get(key);
    if (hit) return hit;
  }
  const { configs, out } = tablesFor(hasOull);
  const total = S.length;

  // Cheap first pass: group sizes per setup, to rule out useless setups
  // (nothing learned) and order the rest by an optimistic bound.
  const options = [];
  const seen = new Set(); // setups that split the group identically are interchangeable
  const row = new Array(total);
  for (let c = 0; c < configs.length; c++) {
    const counts = [0, 0, 0, 0];
    const base = c * ALL.length;
    for (let i = 0; i < total; i++) { row[i] = out[base + S[i]]; counts[row[i]]++; }
    const sig = String.fromCharCode.apply(null, row);
    if (seen.has(sig)) continue;
    seen.add(sig);
    if (counts[0] === total || counts[1] === total || counts[2] === total) continue; // no new information
    const fails = total - counts[WIN];
    // Every failing group needs at least one more stab.
    const lbE = 1 + fails / total;
    const lbW = fails > 0 ? 2 : 1;
    options.push({ c, counts, p: counts[WIN] / total, lbE, lbW, lb: mode === 'worst' ? lbW + lbE * 1e-3 : lbE });
  }
  options.sort((x, y) => x.lb - y.lb || y.p - x.p || x.c - y.c);

  const best = []; // kept sorted best-first, at most `keep` long
  for (const opt of options) {
    if (best.length >= keep) {
      const worstKept = best[best.length - 1];
      // The optimistic bound already loses to everything we are keeping.
      if (mode === 'expected' ? opt.lbE > worstKept.e + EPS : opt.lbW > worstKept.w + EPS) continue;
    }
    const groups = split(S, opt.c, out);
    let e = 1;
    let w = 1;
    const order = [0, 1, 2].filter(o => groups[o].length > 0).sort((x, y) => groups[y].length - groups[x].length);
    let pending = (total - groups[WIN].length) / total; // each unfinished group costs >= 1 more stab
    let pruned = false;
    for (const o of order) {
      if (best.length >= keep && mode === 'expected' && e + pending > best[best.length - 1].e + EPS) { pruned = true; break; }
      const child = valueOf(groups[o], hasOull, mode);
      const share = groups[o].length / total;
      e += share * child.e;
      pending -= share;
      w = Math.max(w, 1 + child.w);
    }
    if (pruned) continue;
    const score = { e, w, p: opt.p, c: opt.c, counts: opt.counts };
    let at = best.findIndex(b => compareScores(score, b, mode) < 0);
    if (at === -1) at = best.length;
    if (at < keep) {
      best.splice(at, 0, score);
      if (best.length > keep) best.pop();
    }
  }

  if (keep === 1) {
    const top = best[0];
    const result = { e: top.e, w: top.w, p: top.p, c: top.c };
    if (memo.size > MEMO_LIMIT) memo.clear();
    memo.set(key, result);
    return result;
  }
  return best;
}

// --- Public API ------------------------------------------------------------

const toIndices = candidates => {
  const idx = candidates.map(seq => INDEX_OF.get(seqKey(...seq.map(modId))));
  idx.sort((a, b) => a - b);
  return idx;
};

// Describes one setup against a group of candidates (names in, names out).
function describe(cfgIds, S, out, configs, hasOull, mode) {
  const c = configs.findIndex(x => x[0] === cfgIds[0] && x[1] === cfgIds[1] && x[2] === cfgIds[2]);
  const groups = split(S, c, out);
  const total = S.length;
  const outcomes = groups.map((g, o) => ({
    outcome: o === WIN ? 'win' : `fail${o + 1}`,
    failedSlot: o === WIN ? null : o,
    count: g.length,
    probability: g.length / total,
    candidates: g.map(i => ALL[i].map(modName)),
  }));
  let e = 1;
  let w = 1;
  for (let o = 0; o < WIN; o++) {
    if (groups[o].length === 0) continue;
    const child = valueOf(groups[o], hasOull, mode);
    e += (groups[o].length / total) * child.e;
    w = Math.max(w, 1 + child.w);
  }
  return {
    config: cfgIds.map(modName),
    successProbability: groups[WIN].length / total,
    guaranteed: groups[WIN].length === total,
    expectedAttempts: e,
    worstCaseAttempts: w,
    outcomes,
    // True when every group after this stab was valued by exact search; false
    // when some were estimated with the greedy rollout (still a real strategy).
    exact: groups.every(g => g.length <= activeLimit),
  };
}

// Recommend the next setup for the remaining `candidates` (arrays of names).
//   options.hasOull   -- may Oull be equipped? (default false)
//   options.mode      -- 'expected' (default) or 'worst'
//   options.alternatives -- how many runners-up to also return (default 4)
// Returns null when there are no candidates (the caller reports a conflict).
export function planNext(candidates, options = {}) {
  const { hasOull = false, mode = 'expected', alternatives = 4, exactLimit = EXACT_LIMIT } = options;
  if (candidates.length === 0) return null;
  if (exactLimit !== activeLimit) { memo.clear(); rolloutMemo.clear(); activeLimit = exactLimit; }
  const S = toIndices(candidates);
  const { configs, out } = tablesFor(hasOull);
  const ranked = search(S, hasOull, mode, 1 + alternatives);
  const list = (Array.isArray(ranked) ? ranked : [ranked]).map(r =>
    describe(configs[r.c], S, out, configs, hasOull, mode));
  const guaranteedConfigs = countGuaranteed(S, hasOull);
  return {
    candidateCount: candidates.length,
    best: list[0],
    alternatives: list.slice(1),
    ...guaranteedConfigs,
  };
}

// How many different setups would win against EVERY remaining candidate, and
// how many could win against at least one. These differ when Oull is in play:
// many underlying sequences can share a single winning setup.
function countGuaranteed(S, hasOull) {
  const { configs, out } = tablesFor(hasOull);
  let guaranteed = 0;
  let possible = 0;
  const winners = [];
  for (let c = 0; c < configs.length; c++) {
    let wins = 0;
    for (let i = 0; i < S.length; i++) if (out[c * ALL.length + S[i]] === WIN) wins++;
    if (wins > 0) possible++;
    if (wins === S.length) { guaranteed++; winners.push(configs[c].map(modName)); }
  }
  return { guaranteedConfigCount: guaranteed, possibleWinningConfigCount: possible, guaranteedConfigs: winners };
}

// Scores one specific setup (e.g. what the player is about to try) against the
// remaining candidates, without searching for a better one.
export function scoreConfig(candidates, equipped, options = {}) {
  const { hasOull = true, mode = 'expected' } = options;
  const S = toIndices(candidates);
  const { configs, out } = tablesFor(true);
  return describe(equipped.map(modId), S, out, configs, hasOull, mode);
}

export function clearPlannerCache() {
  memo.clear();
  rolloutMemo.clear();
}
