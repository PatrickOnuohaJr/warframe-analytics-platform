import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveSurvivabilityStatus, latestJadeLightTest, FAILED_LABEL } from '../src/utils/survivabilityStatus.js';

test('every build defaults to untested with no claim and no test', () => {
  assert.equal(deriveSurvivabilityStatus(null, null).state, 'untested');
  assert.equal(deriveSurvivabilityStatus(undefined, undefined).short, '');
});

test('a claim alone is only ever a candidate, never tested', () => {
  const s = deriveSurvivabilityStatus('Tier 0', null);
  assert.equal(s.state, 'candidate');
  assert.equal(s.label, 'Tier 0 candidate');
  assert.equal(s.short, 'TIER 0 ?');
});

test('a logged result wins over the claim, in either direction', () => {
  const s = deriveSurvivabilityStatus('Tier 0', { result: 'Tier 1' });
  assert.equal(s.state, 'tested');
  assert.equal(s.tier, 'Tier 1');
  assert.equal(deriveSurvivabilityStatus(null, { result: 'Tier 0' }).label, 'Tier 0 · tested');
});

test('a failed test shows the drawing-board state even if a tier was claimed', () => {
  const s = deriveSurvivabilityStatus('Tier 0', { result: 'Did not survive' });
  assert.equal(s.state, 'failed');
  assert.equal(s.label, FAILED_LABEL);
});

test('a claim for an undefined tier is ignored', () => {
  assert.equal(deriveSurvivabilityStatus('Tier 2', null).state, 'untested');
});

test('newest result wins: later date first, undated after dated, then by log time', () => {
  const tests = [
    { result: 'Tier 1', tested_on: '2026-08-01', created_at: '2026-08-02' },
    { result: 'Tier 0', tested_on: '2026-09-15', created_at: '2026-09-15' },
    { result: 'Did not survive', tested_on: null, created_at: '2026-10-21' },
  ];
  assert.equal(latestJadeLightTest(tests).result, 'Tier 0');
  assert.equal(latestJadeLightTest([]), null);
  assert.equal(latestJadeLightTest([
    { result: 'Tier 1', tested_on: null, created_at: '2026-10-01' },
    { result: 'Tier 0', tested_on: null, created_at: '2026-10-21' },
  ]).result, 'Tier 0');
});
