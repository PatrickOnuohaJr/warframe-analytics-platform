// PostgREST caps every request at 1000 rows by default and does NOT
// error when it truncates -- it just silently returns the first page.
// wf_base.mods crossed that line (1086 rows) when the duplicate-name
// reconciliation recovered 87 previously-overwritten mods, which
// silently dropped 86 mods from the app: Steel Charge vanished from the
// loadout builder's aura picker even though it was owned and maxed.
//
// Any query against a table that can grow past 1000 rows must page
// through explicitly. Takes a builder function so each caller keeps its
// own column list, filters, and ordering.
//
//   const mods = await fetchAll(() =>
//     wfBase.from('mods').select('mod_id, name').order('name')
//   );
const PAGE_SIZE = 1000;

export async function fetchAll(buildQuery) {
  const all = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await buildQuery().range(offset, offset + PAGE_SIZE - 1);

    if (error) return { data: null, error };

    const rows = data || [];
    all.push(...rows);

    if (rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return { data: all, error: null };
}
