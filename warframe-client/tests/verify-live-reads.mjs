// Read-only diagnostic. Reports counts and access, never keys or row payloads.
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { fetchAll } from '../src/lib/fetchAll.js';

const config = {};
for (const file of ['.env', '.env.local']) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/);
    if (match) config[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
}
const client = createClient(config.VITE_SUPABASE_URL, config.VITE_SUPABASE_PUBLISHABLE_KEY);
const build = () => client.schema('wf_base').from('ability_parameters')
  .select('ability_parameter_id', { count: 'exact' })
  .order('sort_order').order('ability_parameter_id');
const first = await build();
const all = await fetchAll(build);
console.log(JSON.stringify({ firstPageRows: first.data?.length, totalCount: first.count,
  paginatedRows: all.data?.length, uniqueIds: all.data ? new Set(all.data.map(x => x.ability_parameter_id)).size : null,
  error: first.error?.message || all.error?.message || null }));
for (const table of ['my_frames', 'weapon_inventory', 'mod_inventory', 'player_profile']) {
  const { count, error } = await client.schema('wf_user').from(table).select('*', { count: 'exact', head: true });
  console.log(JSON.stringify({ table, anonymousRead: error ? null : true, rows: count, error: error?.message || null }));
}
