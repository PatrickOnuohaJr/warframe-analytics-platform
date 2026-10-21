# Cephalon Gu — Arcane Static Data Pipeline Implementation

Implemented 2026-08-31 as the deliberately non-destructive follow-up to the
read-only Arcane reconciliation pilot.

## Outcome

The repository now contains an additive Supabase migration for immutable source
snapshots, generic raw entities, versioned Arcane normalization, reconciliation
runs/items, append-only human reviews, nullable canonical Arcane identity and
provenance columns, and rank-by-rank Arcane storage.

Patrick applied the migration in the Supabase SQL Editor on 2026-08-31 after
reviewing the live catalog audit. The transactional pre-promotion acceptance
suite then completed successfully and rolled back its fixtures. The migration
contains no canonical Arcane data promotion: no existing `wf_base.arcanes` row
was inserted, updated, or deleted; no `unique_name` was backfilled; and no
`wf_base.arcane_ranks` row was inserted.

Patrick subsequently applied the service-only ingestion RPC migration and ran
its transactional SQL acceptance suite successfully. The exact WFCD bundle was
then committed to staging as snapshot
`278b814e-b64d-4bc9-bf09-77847c7f898e` and reconciliation run
`f40d0d19-c224-47f8-9ef2-c225f42e91d0`. An identical replay reused both IDs,
confirming idempotence.

## Verified starting state

The following was verified read-only against the configured live Supabase
PostgREST endpoint on 2026-08-31:

- `wf_base.arcanes` has 161 rows.
- `arcane_id` is a required `bigint` primary key.
- `name` is required.
- The exposed canonical table still has the pilot's 14-column shape:
  `arcane_id`, `name`, `arcane_type`, `rarity`, `tradable`, `raw_json`,
  `created_at`, `subcategory`, `max_rank`, `trigger`, `effect_r5`, `source`,
  `wfm_slug`, `is_tradeable`, and `added_update` (15 names including the key;
  the pilot report's prose count omitted one duplicated tradeability field).
- `wf_user.my_arcanes` has 123 rows and a required `bigint arcane_id`.
- `wf_user.arcane_collection_summary` returns one row and reports 161 total
  Arcanes.
- `wf_user.arcane_collection_by_type` returns nine category rows.
- `wf_user.arcane_collection_detail` returns 161 rows with the existing
  15-column frontend contract.
- Publishable/anonymous reads of those objects succeed, confirming the current
  production read path remains available.

Repository inspection also confirmed:

- The active repository did not contain the canonical Arcane table, collection
  view, ownership foreign-key, or Arcane RLS definitions.
- `DB/Seeds/seed_arcanes.py` still performs name-keyed direct canonical upserts
  and does not preserve upstream `uniqueName` or rank rows.
- Existing migrations generally enable RLS and grant broad client access to
  their own product tables. This pipeline intentionally uses a narrower model:
  staging/review objects are service-only, while canonical ranks are
  browser-readable but not browser-writable.

PostgREST's OpenAPI describes exposed keys/types but does not expose the exact
cross-schema foreign-key definition, view SQL, or policy expressions. The new
read-only diagnostic reports those `pg_catalog` facts before migration
execution, and the migration itself aborts if the live key/type/view presence
does not match the verified baseline.

## Files added

### `DB/Diagnostics/20260831_arcane_static_data_preflight.sql`

SELECT-only SQL for the Supabase SQL Editor. It reports:

- live Arcane and ownership counts;
- exact columns, types, nullability, defaults, and identity behavior;
- primary/unique/check/foreign-key constraints and FK actions;
- collection view SQL and security options;
- RLS enablement and policy expressions;
- grants for `anon`, `authenticated`, and `service_role`;
- ownership rows whose `arcane_id` has no canonical parent.

### `DB/Migrations/20260831_add_static_data_pipeline.sql`

Creates:

- `wf_ingest.source_snapshots` — immutable whole-source payloads with exact
  upstream revision, byte-level SHA-256 supplied by the ingester, retrieval/game
  metadata, raw JSON, and source record count.
- `wf_ingest.raw_entities` — generic immutable records keyed by snapshot,
  entity type, and upstream identity. Mods and Weapons can use this same table.
- `wf_ingest.normalized_arcanes` — typed, versioned Arcane normalization output
  with rank payloads and explicit validation results. Multiple upstream rows
  sharing a display name remain distinct by `unique_name`.
- `wf_meta.reconciliation_runs` — versioned reconciliation executions and
  deterministic summary counts.
- `wf_meta.reconciliation_items` — immutable `MATCH`, `GU_MISSING`, `GU_EXTRA`,
  `VALUE_MISMATCH`, and `MANUAL_REVIEW` results with field-level diffs.
- `wf_meta.reconciliation_reviews` — append-only dispositions. A correction
  supersedes a prior review for the same item instead of overwriting history.
- `wf_meta.reconciliation_current_reviews` — a security-invoker projection of
  the latest review per item.
- `wf_base.arcane_ranks` — canonical rank text/raw stats tied to both the stable
  existing `arcane_id` and the source snapshot that was promoted.

Adds nullable columns to `wf_base.arcanes`:

- `unique_name`
- `equipment_type`
- `introduced_update`
- `canonical_snapshot_id`
- `updated_at`

It also adds `is_active boolean not null default true`. Existing rows retain
their current active behavior. A partial unique index enforces uniqueness only
after a reviewed non-null `unique_name` is assigned.

### `DB/Tests/20260831_static_data_pipeline_prepromotion_test.sql`

A transactional SQL acceptance suite that rolls back all fixtures. It checks:

- required tables/views/columns/indexes/FKs;
- unchanged collection-view column contracts;
- absence of canonical promotion in this slice;
- RLS and grants for browser/service roles;
- snapshot hash uniqueness;
- UPDATE/DELETE rejection for immutable artifacts;
- generic raw-to-normalized provenance linkage;
- reconciliation and current-review behavior;
- rejection of an Arcane rank whose canonical parent does not exist.

The explicit "no canonical promotion" assertions are pre-promotion checks and
should be retired or revised when the later reviewed promotion migration is
approved.

## Security and production behavior

- `wf_ingest` and `wf_meta` schema usage is revoked from `public`, `anon`, and
  `authenticated`.
- Their tables have RLS enabled and no browser policies.
- `service_role` receives only the operations needed for ingestion and review.
- `wf_base.arcane_ranks` has public read access consistent with reference data,
  but browser roles receive no insert/update/delete grants.
- Existing Arcane collection views are not replaced or edited.
- Existing `arcane_id` values and ownership rows remain untouched.
- Legacy `arcane_type`, `subcategory`, `source`, `effect_r5`, and both current
  tradeability columns remain untouched.

## Manual execution order

Run these in the Supabase SQL Editor, in order:

1. `DB/Diagnostics/20260831_arcane_static_data_preflight.sql`
2. Review and retain the catalog output, especially the ownership FK/delete
   action, view `security_invoker` options, and Arcane policies/grants.
3. `DB/Migrations/20260831_add_static_data_pipeline.sql`
4. `DB/Tests/20260831_static_data_pipeline_prepromotion_test.sql`

The migration is transactional when run as one SQL Editor batch. The test suite
always ends with `ROLLBACK`.

## Repository verification

- Static canonical-DML scan: passed. The migration contains no `INSERT`,
  `UPDATE`, or `DELETE` against `wf_base.arcanes` or `wf_base.arcane_ranks`.
- `npm run build`: passed. Vite retained the existing oversized-chunk warning
  (the current bundle was 601.42 kB before gzip during this run).
- `npm run lint`: failed with 24 errors and 4 warnings in the concurrently
  modified frontend/current baseline. This pipeline changes no frontend file;
  the reported issues include pre-existing React effect/ref rules plus two
  current `LoadoutEquipmentSection.jsx` declaration-order errors. They were not
  changed as part of this database slice.
- `python -m py_compile DB/Seeds/seed_arcanes.py`: passed, confirming the
  existing direct-canonical seed remains syntactically intact (but it remains a
  legacy path and is not the new ingestion pipeline).
- Owner-run Supabase verification: passed. Patrick reviewed the live constraint,
  view, RLS, policy, grant, and orphan-query output; applied the migration
  successfully; then ran the complete transactional pre-promotion suite without
  errors. Its fixtures were removed by the final `ROLLBACK`.
- Owner-run RPC verification: passed. Patrick applied the service-only RPC and
  ran its transactional acceptance suite successfully.
- Live staging ingestion: passed. It retained 172 raw records, 172 normalized
  records, and 174 reconciliation items. A replay returned `reused = true` with
  the same snapshot/run IDs.
- Independent post-ingestion canonical check: 161 Arcane rows, zero populated
  promotion/provenance fields, and zero `wf_base.arcane_ranks` rows.

## Still deliberately blocked

The loader/reconciler, live RPC, and immutable staging commit are complete; see
`Docs/Static Data/Arcane Ingestion Dry Run 2026-08-31.md` for exact source,
snapshot, run, validation, and reconciliation evidence.

Canonical promotion remains a separate approval boundary:

- review the committed unique-name-first reconciliation;
- review Arcane Steadfast's five internal records, the 13 missing candidates,
  the Truculence/Trunculence alias case, the two rank conflicts, and effect/category
  discrepancies;
- record dispositions for every current Gu Arcane;
- only then backfill stable IDs, insert rank rows, or promote upstream values.

Structured `arcane_effects`, field-level provenance beyond the promoted snapshot
link, and manual override layering also remain deferred. Their semantics should
be based on reviewed mechanic grammar rather than inferred from prose during
this infrastructure slice.

## Loader implementation

- `DB/StaticData/static_data_pipeline.py` provides generic snapshot/raw hashing,
  the WFCD Arcane normalizer, stable-ID-first reconciliation, deterministic
  summaries, and a standard-library Supabase REST client.
- `DB/StaticData/ingest_arcanes.py` is dry-run by default and requires an
  explicit `--commit` flag. It accepts an exact local source file plus a full
  40-character Git revision and refuses source-count drift.
- `DB/Migrations/20260831_add_arcane_ingestion_rpc.sql` adds the service-only
  atomic commit boundary. `wf_ingest` and `wf_meta` remain unexposed; the RPC is
  executable by `service_role` only and contains no canonical Arcane DML.
- `DB/Tests/test_static_data_pipeline.py` contains 11 passing offline tests.
- `DB/Tests/20260831_arcane_ingestion_rpc_test.sql` transactionally checks the
  live RPC, role isolation, idempotence, bundle completeness, canonical-table
  preservation, and malformed-count rejection.
