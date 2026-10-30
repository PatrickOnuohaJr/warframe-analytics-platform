// Requiem Solver -- evidence engine (pure: no React, no database).
//
// A Kuva Lich / Sister of Parvos has a secret sequence of THREE DISTINCT
// Requiem mods, in order. Revealing a Requiem tells you it is in the sequence,
// not where. A "stab" equips three Parazon mods; the game checks them left to
// right and stops at the first wrong one. Oull is a wildcard that matches
// whatever the required mod is at its position, without revealing it.
//
// This file turns revealed mods + stab history into the list of secret
// sequences that are still possible. Nothing here ever treats "unknown" as a
// real mod: unrevealed slots are enumerated over every remaining Requiem.
//
// Slots are 0-based here (0, 1, 2). The database stores them 1-based; the
// conversion lives in lib/requiemStore.js.

export const REQUIEMS = ['Lohk', 'Xata', 'Jahu', 'Vome', 'Ris', 'Fass', 'Netra', 'Khra'];
export const OULL = 'Oull';
export const SLOT_COUNT = 3;
export const ADVERSARY_TYPES = ['kuva_lich', 'sister'];

const REQUIEM_SET = new Set(REQUIEMS);

// --- Attempts --------------------------------------------------------------
//
// An attempt is plain factual data:
//   { id, equipped: [m0, m1, m2], failedSlot: null | 0 | 1 | 2, usedUltimatum }
// failedSlot null means the whole sequence passed. Everything else (which
// slots passed, whether it succeeded) is derived, never stored separately in
// state, so it cannot disagree with itself.

export const succeeded = attempt => attempt.failedSlot === null || attempt.failedSlot === undefined;

// Slots that were actually checked and passed. Slots after the failure were
// never tested and tell us nothing.
export function passedSlots(attempt) {
  const upTo = succeeded(attempt) ? SLOT_COUNT : attempt.failedSlot;
  return Array.from({ length: upTo }, (_, i) => i);
}

// Returns a list of human-readable problems; empty means the attempt is valid.
export function validateAttempt(attempt) {
  const errors = [];
  const eq = attempt?.equipped;
  if (!Array.isArray(eq) || eq.length !== SLOT_COUNT) {
    return ['An attempt needs exactly three equipped mods.'];
  }
  for (const m of eq) {
    if (m !== OULL && !REQUIEM_SET.has(m)) errors.push(`"${m}" is not a Requiem mod or Oull.`);
  }
  if (new Set(eq).size !== eq.length) errors.push('The same mod cannot be equipped twice.');
  const f = attempt.failedSlot;
  if (f !== null && f !== undefined) {
    if (!Number.isInteger(f) || f < 0 || f >= SLOT_COUNT) errors.push('The failed position must be 1, 2 or 3.');
    else if (eq[f] === OULL) errors.push('Oull matches any mod, so it cannot be the position that failed.');
  }
  return errors;
}

export function validateKnown(known) {
  const errors = [];
  if (!Array.isArray(known)) return ['Known Requiems must be a list.'];
  if (known.length > SLOT_COUNT) errors.push('At most three Requiems can be revealed.');
  if (new Set(known).size !== known.length) errors.push('A Requiem can only be revealed once.');
  known.forEach(m => { if (!REQUIEM_SET.has(m)) errors.push(`"${m}" is not a Requiem mod.`); });
  return errors;
}

// --- Simulation ------------------------------------------------------------

// What the game does with `equipped` against the real `sequence`: the index
// of the first wrong position, or null if all three pass. Oull always passes.
export function simulate(sequence, equipped) {
  for (let i = 0; i < SLOT_COUNT; i++) {
    if (equipped[i] !== OULL && equipped[i] !== sequence[i]) return i;
  }
  return null;
}

// Would this recorded attempt have happened if `sequence` were the real one?
export const isConsistent = (sequence, attempt) =>
  simulate(sequence, attempt.equipped) === (attempt.failedSlot ?? null);

// --- Candidates ------------------------------------------------------------

// Every ordered set of three distinct Requiems that contains all of `known`.
export function enumerateCandidates(known = []) {
  const out = [];
  for (const a of REQUIEMS) {
    for (const b of REQUIEMS) {
      if (b === a) continue;
      for (const c of REQUIEMS) {
        if (c === a || c === b) continue;
        if (known.every(k => k === a || k === b || k === c)) out.push([a, b, c]);
      }
    }
  }
  return out;
}

// The secret sequences still possible after the revealed mods and every
// recorded attempt.
export function filterCandidates(known, attempts) {
  return enumerateCandidates(known).filter(seq => attempts.every(a => isConsistent(seq, a)));
}

// --- What the remaining candidates say about each mod / position ----------

// possible[slot] = mods that could still be at that slot.
// status(mod, slot): 'confirmed' (every candidate has it there), 'ruledOut'
// (no candidate does) or 'possible'. With no candidates everything is
// 'ruledOut', which the caller reports as an evidence conflict.
export function positionBoard(candidates) {
  const possible = Array.from({ length: SLOT_COUNT }, () => new Set());
  candidates.forEach(seq => seq.forEach((m, i) => possible[i].add(m)));
  const status = (mod, slot) => {
    if (!possible[slot].has(mod)) return 'ruledOut';
    return candidates.every(seq => seq[slot] === mod) ? 'confirmed' : 'possible';
  };
  return { possible, status };
}

// --- Redundancy ------------------------------------------------------------

// A test teaches nothing when every remaining candidate would give the same
// failing answer (and a guaranteed pass ends the hunt, so that is not
// redundant either).
export function isRedundantTest(candidates, equipped) {
  if (candidates.length === 0) return false;
  const first = simulate(candidates[0], equipped);
  if (first === null) return false;
  return candidates.every(seq => simulate(seq, equipped) === first);
}

// Earlier attempts that used exactly this sequence of mods.
export function repeatsOf(attempts, equipped) {
  return attempts.filter(a => a.equipped.every((m, i) => m === equipped[i]));
}

// --- Conflicts -------------------------------------------------------------

// When nothing is consistent, find the smallest sets of attempts whose removal
// would make the evidence consistent again (those are the likely typos).
// Returns { culprits: [[attemptId, ...], ...] } for the smallest size that
// works, or { culprits: [] } when even dropping every attempt leaves nothing
// (the revealed Requiems themselves are impossible).
export function findConflict(known, attempts) {
  if (filterCandidates(known, attempts).length > 0) return { culprits: [] };
  const n = attempts.length;
  const maxDrop = Math.min(n, 3);
  for (let size = 1; size <= maxDrop; size++) {
    const found = [];
    const pick = (start, chosen) => {
      if (chosen.length === size) {
        const kept = attempts.filter((_, i) => !chosen.includes(i));
        if (filterCandidates(known, kept).length > 0) found.push(chosen.map(i => attempts[i].id));
        return;
      }
      for (let i = start; i < n; i++) pick(i + 1, [...chosen, i]);
    };
    pick(0, []);
    if (found.length > 0) return { culprits: found };
  }
  return { culprits: [] };
}
