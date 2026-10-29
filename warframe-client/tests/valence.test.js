import test from 'node:test';
import assert from 'node:assert/strict';
import { fuse, fusionPath, fusionsNeeded, minStartFor, toTenths } from '../src/utils/valence.js';

test('wiki worked examples', () => {
  assert.equal(fuse(520, 400), 572); // 52% + 40% -> 57.2%
  assert.equal(fuse(528, 100), 600); // 52.8% -> 58.08 -> rounds up to 60
  assert.equal(fuse(630, 100), 600); // capped
});

test('a weaker donor changes nothing; a stronger one raises the base', () => {
  assert.equal(fuse(513, 50), fuse(513, 250));
  assert.equal(fuse(250, 350), 385); // 35% donor onto 25%: 38.5%
});

test('Coda at 51.3% reaches 60% on the next fusion', () => {
  assert.equal(fuse(toTenths(51.3)), 564);
  assert.equal(fusionsNeeded(564), 1);
});

test('fusion counts and thresholds', () => {
  assert.equal(fusionsNeeded(253), 9);
  assert.equal(fusionsNeeded(600), 0);
  assert.equal(minStartFor(1) <= 528 && minStartFor(1) > 520, true);
  assert.equal(fusionPath(253).at(-1).tenths, 600);
  assert.ok(minStartFor(2) < minStartFor(1));
});
