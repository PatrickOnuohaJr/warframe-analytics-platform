// Explicit production content import. Default is read-only; --apply writes only
// four named reference abilities and missing lore on five exact build identities.
// Requires the project's existing ingestion credential; never prints it.
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const require = createRequire(new URL('../../warframe-client/package.json', import.meta.url));
const { createClient } = require('@supabase/supabase-js');
const root = new URL('../../', import.meta.url);
process.loadEnvFile(fileURLToPath(new URL('.env', root)));
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const abilities = JSON.parse(await readFile(new URL('DB/StaticData/equinox_20261121.json', root), 'utf8'));
const doctrines = JSON.parse(await readFile(new URL('DB/Cultivation/missing_doctrines_20261121.json', root), 'utf8'));
const apply = process.argv.includes('--apply');
const empty = v => v == null || ['', 'nan', 'null'].includes(String(v).trim().toLowerCase());
async function checked(query) {
  const { data, error } = await query;
  if (error) throw new Error(JSON.stringify(error));
  return data;
}
const catalog = await checked(client.schema('wf_base').from('ability_catalog').select('*').in('ability_name', abilities.map(a => a.ability_name)));
const parameters = catalog.length ? await checked(client.schema('wf_base').from('ability_parameters').select('*').in('ability_catalog_id', catalog.map(a => a.ability_catalog_id))) : [];
const frames = await checked(client.schema('wf_user').from('my_frames').select('*').in('my_frame_id', doctrines.map(d => d.my_frame_id)));
for (const target of doctrines) {
  const frame = frames.find(f => f.my_frame_id === target.my_frame_id);
  if (!frame || frame.warframe_id !== target.warframe_id || frame.build_title !== target.build_title) throw new Error('Build identity changed: ' + target.build_title);
}
console.log('Preflight:', abilities.length, 'abilities;', frames.filter(f => empty(f.cultivation_doctrine)).length, 'missing doctrines.');
if (!apply) {
  console.log('Read-only. Use --apply to import the reviewed content.');
  process.exit(0);
}
const backup = new URL('tmp/equinox/', root);
await mkdir(backup, { recursive: true });
await writeFile(new URL('before-import-' + Date.now() + '.json', backup), JSON.stringify({ catalog, parameters, frames }, null, 2));
for (const ability of abilities) {
  const { parameters: rows, ...entry } = ability;
  const [saved] = await checked(client.schema('wf_base').from('ability_catalog')
    .upsert({ ...entry, last_ingested_at: new Date().toISOString() }, { onConflict: 'ability_name' }).select('ability_catalog_id'));
  await checked(client.schema('wf_base').from('ability_parameters')
    .upsert(rows.map(row => ({ ...row, ability_catalog_id: saved.ability_catalog_id })), { onConflict: 'ability_catalog_id,parameter_key,context' }));
  const actual = await checked(client.schema('wf_base').from('ability_parameters').select('*').eq('ability_catalog_id', saved.ability_catalog_id));
  for (const expected of rows) {
    const found = actual.find(p => p.parameter_key === expected.parameter_key && p.context === expected.context);
    if (!found || Object.keys(expected).some(k => found[k] !== expected[k])) throw new Error('Readback mismatch: ' + ability.ability_name + '/' + expected.parameter_key);
  }
  console.log('Verified', ability.ability_name, rows.length, 'parameters');
}
for (const target of doctrines) {
  const frame = frames.find(f => f.my_frame_id === target.my_frame_id);
  if (!empty(frame.cultivation_doctrine)) {
    console.log('Preserved existing lore:', target.build_title);
    continue;
  }
  const patch = Object.fromEntries(Object.entries(target).filter(([k]) => k.startsWith('cultivation_') && empty(frame[k])));
  let query = client.schema('wf_user').from('my_frames').update(patch)
    .eq('my_frame_id', target.my_frame_id).eq('warframe_id', target.warframe_id).eq('build_title', target.build_title);
  // Optimistic guards preserve concurrent edits, including identity fields.
  for (const key of Object.keys(patch)) query = frame[key] == null ? query.is(key, null) : query.eq(key, frame[key]);
  const saved = await checked(query.select('*'));
  if (saved.length !== 1 || Object.keys(patch).some(k => saved[0][k] !== patch[k])) throw new Error('Lore changed concurrently: ' + target.build_title);
  console.log('Verified lore:', target.build_title);
}
// Read every Codex row, paginated, to verify the global missing-lore count.
const remaining = [];
let count = 0;
for (let offset = 0;; offset += 1000) {
  const page = await checked(client.schema('wf_user').from('my_frames').select('my_frame_id,build_title,cultivation_doctrine').order('my_frame_id').range(offset, offset + 999));
  count += page.length;
  remaining.push(...page.filter(f => empty(f.cultivation_doctrine)).map(f => f.build_title));
  if (page.length < 1000) break;
}
console.log('Final Codex audit:', count, 'builds;', remaining.length, 'missing lore.', remaining);
