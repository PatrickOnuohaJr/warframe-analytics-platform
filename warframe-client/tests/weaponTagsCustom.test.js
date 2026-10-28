import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCustomTags } from '../src/utils/weaponTags.js';

const auto = [
  { tag: 'Rifle', group: 'Type' },
  { tag: 'High Fire Rate', group: 'Stats' },
];

test('no saved rows leaves the automatic tags alone', () => {
  assert.deepEqual(applyCustomTags(auto, []), auto);
});

test('a hidden row switches an automatic tag off', () => {
  const out = applyCustomTags(auto, [{ tag: 'High Fire Rate', hidden: true }]);
  assert.deepEqual(out.map(e => e.tag), ['Rifle']);
});

test('a custom row adds a Custom-group tag, without duplicating an automatic one', () => {
  const out = applyCustomTags(auto, [
    { tag: 'Punch Through', hidden: false },
    { tag: 'Rifle', hidden: false },
  ]);
  assert.deepEqual(out.map(e => e.tag), ['Rifle', 'High Fire Rate', 'Punch Through']);
  assert.equal(out.at(-1).group, 'Custom');
});
