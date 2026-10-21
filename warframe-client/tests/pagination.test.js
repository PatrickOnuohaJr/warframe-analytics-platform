import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchAll } from '../src/lib/fetchAll.js';

test('retrieves all 2206 rows across the API cap without duplication', async () => {
  const rows = Array.from({ length: 2206 }, (_, id) => ({ id }));
  const ranges = [];
  const result = await fetchAll(() => ({ range(start, end) {
    ranges.push([start, end]);
    return Promise.resolve({ data: rows.slice(start, end + 1), error: null });
  } }));
  assert.deepEqual(result.data, rows);
  assert.deepEqual(ranges, [[0, 999], [1000, 1999], [2000, 2999]]);
});

test('exact page multiples require a final empty page', async () => {
  let calls = 0;
  const result = await fetchAll(() => ({ range(start) {
    calls++;
    return Promise.resolve({ data: start === 0 ? Array(1000).fill(1) : [], error: null });
  } }));
  assert.equal(result.data.length, 1000);
  assert.equal(calls, 2);
});

test('a later-page failure returns an error rather than partial catalog success', async () => {
  const error = { message: 'Fixture failure' };
  const result = await fetchAll(() => ({ range(start) {
    return Promise.resolve(start === 0 ? { data: Array(1000).fill(1), error: null } : { data: null, error });
  } }));
  assert.deepEqual(result, { data: null, error });
});
