// Requiem Solver -- turns engine + planner results into what the screen shows:
// the plain-language reasoning, per-slot status badges, the Ultimatum advice
// and the attempt tally. Pure; the page only renders what this returns.

import {
  OULL, SLOT_COUNT, filterCandidates, findConflict, positionBoard, succeeded,
} from './requiemEngine';
import { planNext } from './requiemPlanner';

const ord = slot => `position ${slot + 1}`;
const list = names => {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
};

// One short sentence per recorded stab saying what it proved. Untested slots
// are never described as failures.
export function factsFor(attempts) {
  return attempts.map((a, i) => {
    const seq = a.equipped.join(' → ');
    const n = `Stab ${i + 1} (${seq})`;
    if (succeeded(a)) return `${n} won.`;
    const parts = [];
    for (let s = 0; s < a.failedSlot; s++) {
      parts.push(a.equipped[s] === OULL
        ? `Oull passed ${ord(s)}`
        : `${a.equipped[s]} is correct in ${ord(s)}`);
    }
    parts.push(`${a.equipped[a.failedSlot]} is not in ${ord(a.failedSlot)}`);
    const untested = [];
    for (let s = a.failedSlot + 1; s < SLOT_COUNT; s++) untested.push(a.equipped[s]);
    if (untested.length > 0) parts.push(`${list(untested)} ${untested.length === 1 ? 'was' : 'were'} never tested`);
    return `${n}: ${parts.join('; ')}.`;
  });
}

// Per-slot badge info for a setup. `board` comes from positionBoard.
//   confirmed -- every remaining sequence has this mod in this position
//   untested  -- possible here, but not proven
//   ruledOut  -- cannot be here (only shows for hand-built setups)
//   oull      -- wildcard; `covers` says what it stands in for
export function slotInfo(config, board) {
  return config.map((mod, slot) => {
    if (mod === OULL) {
      const options = [...board.possible[slot]];
      return {
        mod, slot, status: 'oull',
        covers: options.length === 1 ? options[0] : null,
        coverOptions: options,
      };
    }
    return { mod, slot, status: board.status(mod, slot) === 'possible' ? 'untested' : board.status(mod, slot) };
  });
}

function recommendationReasons(plan, board) {
  const { best } = plan;
  const lines = [];
  for (let s = 0; s < SLOT_COUNT; s++) {
    const options = [...board.possible[s]];
    if (options.length === 1) lines.push(`${options[0]} is the only mod left for ${ord(s)}.`);
    else if (options.length <= 4) lines.push(`${ord(s)[0].toUpperCase()}${ord(s).slice(1)} can still be ${list(options)}.`);
    else lines.push(`${ord(s)[0].toUpperCase()}${ord(s).slice(1)} has ${options.length} possibilities left.`);
  }
  best.config.forEach((mod, s) => {
    if (mod === OULL) {
      const options = [...board.possible[s]];
      lines.push(options.length === 1
        ? `Oull covers ${ord(s)}, which is ${options[0]} (deduced, not confirmed by the game).`
        : `Oull covers ${ord(s)} so you do not need to know which of ${options.length} mods belongs there.`);
    }
  });
  if (best.guaranteed) {
    lines.push('Every sequence still possible is beaten by this setup, so it is guaranteed to win.');
  } else {
    const fail = best.outcomes.filter(o => o.failedSlot !== null && o.count > 0);
    const pct = Math.round(best.successProbability * 100);
    lines.push(`This is a search step, not a sure win: about ${pct}% to finish now. ` +
      fail.map(o => `If it fails in ${ord(o.failedSlot)}, ${o.count} sequence${o.count === 1 ? '' : 's'} remain.`).join(' '));
  }
  return lines;
}

// Ultimatum guidance. Never promises a one-Ultimatum finish unless the setup
// is guaranteed; otherwise it only describes the next stab.
export function ultimatumAdvice(plan, { saver, forcing }) {
  const best = plan.best;
  if (forcing) {
    return {
      advice: 'ready',
      title: 'ULTIMATUM READY',
      message: best.guaranteed
        ? 'You chose to force the next encounter. This setup is guaranteed to finish the adversary.'
        : 'You chose to force the next encounter, and the recommended sequence is ready to test. This stab is exploratory, so it may not finish.',
    };
  }
  if (best.guaranteed || best.successProbability >= 0.5 || plan.candidateCount <= 3) {
    return {
      advice: 'optional',
      title: 'OPTIONAL ULTIMATUM',
      message: best.guaranteed
        ? 'The next test is guaranteed to win. A natural encounter is equally valid; an Ultimatum only gets you there sooner.'
        : 'The next test is informative and has a good chance to finish, but a natural encounter is equally valid.',
    };
  }
  if (saver) {
    return {
      advice: 'save',
      title: 'SAVE ULTIMATUM',
      message: 'More evidence should be gathered first. Test this setup on natural encounters; an Ultimatum buys you no extra information.',
    };
  }
  return {
    advice: 'optional',
    title: 'OPTIONAL ULTIMATUM',
    message: 'The next test is informative, but a natural encounter is equally valid.',
  };
}

export function tally(attempts, ultimatumCount, estimatedRemaining) {
  const consumed = attempts.filter(a => a.usedUltimatum).length;
  return {
    available: Math.max(0, (ultimatumCount ?? 0) - consumed),
    consumed,
    natural: attempts.length - consumed,
    total: attempts.length,
    estimatedRemaining,
  };
}

// Everything the screen needs for the current evidence.
export function analyzeSession({
  known, attempts, hasOull, ultimatumCount = 0, mode = 'expected', saver = true, forcing = false,
}) {
  const candidates = filterCandidates(known, attempts);
  const facts = factsFor(attempts);
  if (candidates.length === 0) {
    return {
      status: 'conflict', candidates, candidateCount: 0, facts,
      conflict: findConflict(known, attempts),
      plan: null, board: null, slots: [], reasons: [], ultimatum: null,
      tally: tally(attempts, ultimatumCount, null),
    };
  }
  const board = positionBoard(candidates);
  const plan = planNext(candidates, { hasOull, mode });
  return {
    status: plan.best.guaranteed ? 'solved' : 'searching',
    candidates, candidateCount: candidates.length, facts, conflict: null,
    plan, board,
    slots: slotInfo(plan.best.config, board),
    reasons: recommendationReasons(plan, board),
    ultimatum: ultimatumAdvice(plan, { saver, forcing }),
    tally: tally(attempts, ultimatumCount, plan.best.expectedAttempts),
  };
}
