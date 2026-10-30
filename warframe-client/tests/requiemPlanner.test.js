import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OULL, REQUIEMS, simulate, enumerateCandidates, filterCandidates, validateAttempt,
} from '../src/utils/requiemEngine.js';
import { planNext } from '../src/utils/requiemPlanner.js';

const legal = (config, hasOull) => {
  const oulls = config.filter(m => m === OULL).length;
  return config.length === 3 && new Set(config).size === 3 && oulls <= (hasOull ? 1 : 0) &&
    config.every(m => m === OULL || REQUIEMS.includes(m));
};

// Plays the whole hunt against a known secret, always following the planner.
function playOut(secret, known, hasOull, mode = 'expected') {
  const attempts = [];
  const tried = new Set();
  for (let step = 0; step < 40; step++) {
    const candidates = filterCandidates(known, attempts);
    assert.ok(candidates.some(s => s.join() === secret.join()), 'true sequence was eliminated');
    const plan = planNext(candidates, { hasOull, mode, alternatives: 0 });
    const cfg = plan.best.config;
    assert.ok(legal(cfg, hasOull), `illegal setup ${cfg}`);
    // reported probability matches the candidate distribution
    const wins = candidates.filter(s => simulate(s, cfg) === null).length;
    assert.ok(Math.abs(plan.best.successProbability - wins / candidates.length) < 1e-9);
    assert.equal(plan.best.outcomes.reduce((n, o) => n + o.count, 0), candidates.length);
    if (plan.best.guaranteed) {
      assert.equal(wins, candidates.length, 'guaranteed setup missed a candidate');
      assert.equal(simulate(secret, cfg), null);
    }
    assert.ok(!tried.has(cfg.join()), `repeated test ${cfg}`);
    tried.add(cfg.join());
    const failedSlot = simulate(secret, cfg);
    const attempt = { id: `s${step}`, equipped: cfg, failedSlot, usedUltimatum: false };
    assert.deepEqual(validateAttempt(attempt), []);
    attempts.push(attempt);
    if (failedSlot === null) return attempts.length;
  }
  return assert.fail('did not finish: stuck in a loop');
}

test('F: every sequence is solved, with and without Oull, for 0-3 revealed mods', () => {
  const all = enumerateCandidates([]);
  let longest = 0;
  for (let i = 0; i < all.length; i += 5) {
    const secret = all[i];
    for (const k of [0, 1, 2, 3]) {
      // reveal k of the secret's mods (rotating which ones, to vary the evidence)
      const known = [0, 1, 2].map(j => secret[(j + i) % 3]).slice(0, k);
      for (const hasOull of [false, true]) {
        longest = Math.max(longest, playOut(secret, known, hasOull));
      }
    }
  }
  assert.ok(longest <= 25, `a hunt took ${longest} stabs`);
});

test('worst-case mode also always finishes', () => {
  const all = enumerateCandidates(['Khra', 'Netra']);
  for (let i = 0; i < all.length; i += 4) {
    playOut(all[i], ['Khra', 'Netra'], true, 'worst');
    playOut(all[i], ['Khra', 'Netra'], false, 'worst');
  }
});

test('Oull never makes the plan worse', () => {
  for (const known of [[], ['Khra'], ['Khra', 'Netra']]) {
    const c = enumerateCandidates(known);
    const without = planNext(c, { hasOull: false, alternatives: 0 }).best.expectedAttempts;
    const withOull = planNext(c, { hasOull: true, alternatives: 0 }).best.expectedAttempts;
    assert.ok(withOull <= without + 1e-9, `${known.length} known: ${withOull} > ${without}`);
  }
});

test('two revealed mods plus Oull finishes in at most four stabs', () => {
  const plan = planNext(enumerateCandidates(['Khra', 'Netra']), { hasOull: true, mode: 'worst' });
  assert.ok(plan.best.worstCaseAttempts <= 4);
});

test('the planner searches instead of guessing when the field is wide', () => {
  const plan = planNext(enumerateCandidates([]), { hasOull: true, alternatives: 0 });
  // A one-in-336 blind guess is the "highest chance" answer; the plan must use Oull to search.
  assert.ok(plan.best.config.includes(OULL));
  assert.ok(plan.best.expectedAttempts < 336 / 2);
});

test('a one-candidate game is a guaranteed win', () => {
  const plan = planNext([['Khra', 'Fass', 'Netra']], { hasOull: false });
  assert.deepEqual(plan.best.config, ['Khra', 'Fass', 'Netra']);
  assert.equal(plan.best.guaranteed, true);
  assert.equal(plan.best.expectedAttempts, 1);
});

test('rollout estimate for big groups stays close to the exact search', () => {
  const c = enumerateCandidates(['Khra', 'Netra']); // 36 sequences
  const exact = planNext(c, { hasOull: false, exactLimit: 60, alternatives: 0 }).best.expectedAttempts;
  const estimate = planNext(c, { hasOull: false, exactLimit: 24, alternatives: 0 }).best.expectedAttempts;
  assert.ok(estimate >= exact - 1e-9, 'an estimate cannot beat the true optimum');
  assert.ok(estimate <= exact * 1.1, `estimate ${estimate} too far from exact ${exact}`);
});
