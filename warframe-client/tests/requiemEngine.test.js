import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OULL, REQUIEMS, simulate, enumerateCandidates, filterCandidates, positionBoard,
  validateAttempt, passedSlots, isRedundantTest, repeatsOf,
} from '../src/utils/requiemEngine.js';
import { analyzeSession, ultimatumAdvice, factsFor } from '../src/utils/requiemAdvice.js';

let nextId = 0;
const stab = (equipped, failedSlot, usedUltimatum = false) => ({ id: `a${nextId++}`, equipped, failedSlot, usedUltimatum });

test('A: Oull passes its slot and reveals nothing', () => {
  const secret = ['Khra', 'Fass', 'Netra'];
  // Oull -> Khra -> Netra: slot 1 passes (Oull), slot 2 fails (Khra is not second).
  assert.equal(simulate(secret, [OULL, 'Khra', 'Netra']), 1);
  const attempt = stab([OULL, 'Khra', 'Netra'], 1);
  assert.deepEqual(passedSlots(attempt), [0]);
  // The Oull pass must not pin slot 1 to anything.
  const c = filterCandidates([], [attempt]);
  assert.ok(new Set(c.map(s => s[0])).size > 1);
  assert.ok(c.some(s => s[0] !== 'Khra'));
});

test('B: a failed position removes that mod from that position only', () => {
  const attempt = stab([OULL, 'Netra', 'Khra'], 1);
  const c = filterCandidates([], [attempt]);
  assert.ok(c.length > 0);
  assert.ok(c.every(s => s[1] !== 'Netra'));
  // Khra in slot 3 was never tested, so it is still possible there.
  assert.ok(c.some(s => s[2] === 'Khra'));
  assert.ok(c.some(s => s[2] === 'Netra'));
});

test('C: historical Khra / Netra reconstruction', () => {
  const known = ['Khra', 'Netra'];
  const attempts = [
    stab([OULL, 'Netra', 'Khra'], 1),
    stab([OULL, 'Khra', 'Netra'], 1),
    stab(['Netra', OULL, 'Khra'], 0),
  ];
  const c = filterCandidates(known, attempts);
  const board = positionBoard(c);
  assert.equal(board.status('Netra', 0), 'ruledOut');
  assert.equal(board.status('Netra', 1), 'ruledOut');
  assert.equal(board.status('Khra', 1), 'ruledOut');
  // Khra first and Netra last are forced; the middle mod is one of six unknowns.
  assert.equal(board.status('Khra', 0), 'confirmed');
  assert.equal(board.status('Netra', 2), 'confirmed');
  assert.equal(c.length, 6);

  const result = analyzeSession({ known, attempts, hasOull: true });
  assert.deepEqual(result.plan.best.config, ['Khra', OULL, 'Netra']);
  assert.equal(result.plan.best.guaranteed, true);
  assert.equal(result.status, 'solved');
  // Six underlying sequences, but exactly one setup beats all of them.
  assert.equal(result.candidateCount, 6);
  assert.equal(result.plan.guaranteedConfigCount, 1);
  // Without Oull the same evidence cannot be guaranteed.
  const noOull = analyzeSession({ known, attempts, hasOull: false });
  assert.equal(noOull.plan.best.guaranteed, false);
});

test('D: repeats and redundant tests are flagged', () => {
  const known = ['Khra', 'Netra'];
  const attempts = [stab([OULL, 'Netra', 'Khra'], 1)];
  assert.equal(repeatsOf(attempts, [OULL, 'Netra', 'Khra']).length, 1);
  assert.equal(repeatsOf(attempts, [OULL, 'Khra', 'Netra']).length, 0);
  const c = filterCandidates(known, attempts);
  // Netra in slot 2 is already ruled out, so trying it again teaches nothing.
  assert.equal(isRedundantTest(c, [OULL, 'Netra', 'Khra']), true);
  assert.equal(isRedundantTest(c, [OULL, 'Khra', 'Netra']), false);
});

test('E: contradictory evidence is reported, not solved', () => {
  const a1 = stab(['Khra', 'Netra', 'Lohk'], 1); // slot 2 is not Netra
  const a2 = stab(['Khra', 'Netra', 'Lohk'], 2); // ...but Netra passed slot 2
  assert.equal(filterCandidates([], [a1, a2]).length, 0);
  const r = analyzeSession({ known: [], attempts: [a1, a2], hasOull: true });
  assert.equal(r.status, 'conflict');
  assert.equal(r.plan, null);
  assert.ok(r.conflict.culprits.length > 0);
  assert.ok(r.conflict.culprits.every(set => set.length === 1));
});

test('an untested mod is never read as a failed mod', () => {
  const attempt = stab(['Lohk', 'Xata', 'Jahu'], 0);
  const c = filterCandidates([], [attempt]);
  // Xata and Jahu were never tested, so they can still be in positions 2 and 3.
  assert.ok(c.some(s => s[1] === 'Xata'));
  assert.ok(c.some(s => s[2] === 'Jahu'));
  assert.ok(c.every(s => s[0] !== 'Lohk'));
  assert.match(factsFor([attempt])[0], /never tested/);
});

test('validation rejects bad attempts', () => {
  assert.ok(validateAttempt({ equipped: ['Khra', 'Khra', 'Netra'], failedSlot: 0 }).length > 0);
  assert.ok(validateAttempt({ equipped: [OULL, 'Khra', 'Netra'], failedSlot: 0 }).length > 0); // Oull cannot fail
  assert.ok(validateAttempt({ equipped: ['Khra', 'Netra'], failedSlot: 0 }).length > 0);
  assert.ok(validateAttempt({ equipped: ['Khra', 'Bogus', 'Netra'], failedSlot: null }).length > 0);
  assert.ok(validateAttempt({ equipped: ['Khra', 'Netra', 'Lohk'], failedSlot: 3 }).length > 0);
  assert.deepEqual(validateAttempt({ equipped: [OULL, 'Khra', 'Netra'], failedSlot: 2 }), []);
  assert.deepEqual(validateAttempt({ equipped: ['Khra', 'Netra', 'Lohk'], failedSlot: null }), []);
});

test('enumeration respects revealed mods', () => {
  assert.equal(enumerateCandidates([]).length, 336);
  assert.equal(enumerateCandidates(['Khra']).length, 126);
  assert.equal(enumerateCandidates(['Khra', 'Netra']).length, 36);
  assert.equal(enumerateCandidates(['Khra', 'Netra', 'Lohk']).length, 6);
  assert.ok(enumerateCandidates(['Khra']).every(s => s.includes('Khra')));
  assert.equal(REQUIEMS.length, 8);
});

test('ultimatum advice: guaranteed is optional, forced is ready, weak exploration saves', () => {
  const guaranteed = { candidateCount: 6, best: { guaranteed: true, successProbability: 1 } };
  const weak = { candidateCount: 100, best: { guaranteed: false, successProbability: 0.02 } };
  assert.equal(ultimatumAdvice(guaranteed, { saver: true, forcing: false }).advice, 'optional');
  assert.equal(ultimatumAdvice(guaranteed, { saver: true, forcing: true }).advice, 'ready');
  assert.equal(ultimatumAdvice(weak, { saver: true, forcing: false }).advice, 'save');
  assert.equal(ultimatumAdvice(weak, { saver: false, forcing: false }).advice, 'optional');
  // Only a mathematically guaranteed setup may promise to finish.
  assert.doesNotMatch(ultimatumAdvice(weak, { saver: true, forcing: true }).message, /guaranteed/);
});
