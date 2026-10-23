import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyOwnerCheck } from '../src/utils/ownerCheck.js';

test('a returned owner row means owner', () => {
  assert.equal(classifyOwnerCheck({ data: { user_id: 'abc' }, error: null }), 'owner');
});

test('a successful query with no row means signed in but not the owner', () => {
  assert.equal(classifyOwnerCheck({ data: null, error: null }), 'not-owner');
});

test('a missing app_owners table means the lockdown has not been run yet', () => {
  for (const code of ['42P01', 'PGRST205', 'PGRST106']) {
    assert.equal(classifyOwnerCheck({ data: null, error: { code } }), 'not-enforced');
  }
});

test('any other error fails closed instead of letting the user in', () => {
  assert.equal(classifyOwnerCheck({ data: null, error: { code: 'PGRST301', message: 'JWT expired' } }), 'error');
  assert.equal(classifyOwnerCheck({ data: null, error: { message: 'network down' } }), 'error');
});
