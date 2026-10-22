import test from 'node:test';
import assert from 'node:assert/strict';
import { filterByArchetype, ARCHETYPES } from '../src/utils/survivabilityArchetype.js';

const frames = [
  { id: 1, survivability_archetype: 'Health Tank' },
  { id: 2, survivability_archetype: 'Shield Tank' },
  { id: 3, survivability_archetype: 'Hybrid' },
  { id: 4, survivability_archetype: null },
  { id: 5 },
];

test('all returns every build, including untagged ones', () => {
  assert.equal(filterByArchetype(frames, 'all').length, 5);
});

test('a specific archetype returns only builds tagged with it', () => {
  assert.deepEqual(filterByArchetype(frames, 'Health Tank').map(f => f.id), [1]);
  assert.deepEqual(filterByArchetype(frames, 'Hybrid').map(f => f.id), [3]);
});

test('untagged builds never match a specific archetype', () => {
  for (const type of ARCHETYPES) {
    assert.ok(filterByArchetype(frames, type).every(f => f.survivability_archetype === type));
  }
});
