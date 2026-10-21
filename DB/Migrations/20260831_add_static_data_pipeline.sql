-- Static game-data source-of-truth foundation (Arcane pilot).
--
-- This migration is deliberately additive. It creates immutable upstream
-- artifacts and a reviewable reconciliation layer, but it does not insert,
-- update, or delete any canonical wf_base.arcanes row. In particular, it does
-- not backfill unique_name, create Arcane rank rows, or replace existing views.

-- Abort before any DDL if the live Arcane key shape differs from the shape
-- verified through PostgREST on 2026-08-31. Exact policy/view/FK definitions
-- can be inspected with DB/Diagnostics/20260831_arcane_static_data_preflight.sql.
do $$
declare
  arcane_id_attnum smallint;
  arcane_id_type text;
  ownership_arcane_id_type text;
begin
  if to_regclass('wf_base.arcanes') is null then
    raise exception 'Preflight failed: wf_base.arcanes does not exist';
  end if;

  select a.attnum, pg_catalog.format_type(a.atttypid, a.atttypmod)
    into arcane_id_attnum, arcane_id_type
  from pg_catalog.pg_attribute a
  where a.attrelid = 'wf_base.arcanes'::regclass
    and a.attname = 'arcane_id'
    and a.attnum > 0
    and not a.attisdropped;

  if arcane_id_type is distinct from 'bigint' then
    raise exception
      'Preflight failed: wf_base.arcanes.arcane_id is %, expected bigint',
      coalesce(arcane_id_type, '<missing>');
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint c
    where c.conrelid = 'wf_base.arcanes'::regclass
      and c.contype = 'p'
      and c.conkey = array[arcane_id_attnum]::smallint[]
  ) then
    raise exception
      'Preflight failed: wf_base.arcanes.arcane_id is not the sole primary key';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_attribute a
    where a.attrelid = 'wf_base.arcanes'::regclass
      and a.attname = 'name'
      and a.attnotnull
      and not a.attisdropped
  ) then
    raise exception 'Preflight failed: wf_base.arcanes.name is missing or nullable';
  end if;

  if to_regclass('wf_user.my_arcanes') is null then
    raise exception 'Preflight failed: wf_user.my_arcanes does not exist';
  end if;

  select pg_catalog.format_type(a.atttypid, a.atttypmod)
    into ownership_arcane_id_type
  from pg_catalog.pg_attribute a
  where a.attrelid = 'wf_user.my_arcanes'::regclass
    and a.attname = 'arcane_id'
    and a.attnum > 0
    and not a.attisdropped;

  if ownership_arcane_id_type is distinct from arcane_id_type then
    raise exception
      'Preflight failed: wf_user.my_arcanes.arcane_id is %, expected %',
      coalesce(ownership_arcane_id_type, '<missing>'),
      arcane_id_type;
  end if;

  if to_regclass('wf_user.arcane_collection_summary') is null
     or to_regclass('wf_user.arcane_collection_by_type') is null
     or to_regclass('wf_user.arcane_collection_detail') is null then
    raise exception 'Preflight failed: one or more Arcane collection views are missing';
  end if;
end
$$;

create schema if not exists wf_ingest;
create schema if not exists wf_meta;

comment on schema wf_ingest is
  'Immutable external source snapshots, raw records, and normalized staging artifacts.';
comment on schema wf_meta is
  'Static-data reconciliation runs, discrepancies, and append-only human review decisions.';

revoke all on schema wf_ingest from public, anon, authenticated;
revoke all on schema wf_meta from public, anon, authenticated;
grant usage on schema wf_ingest, wf_meta to service_role;

create table wf_ingest.source_snapshots (
  snapshot_id uuid primary key default gen_random_uuid(),
  dataset text not null,
  source_name text not null,
  source_url text not null,
  source_revision text not null,
  source_release text,
  game_version text,
  retrieved_at timestamptz not null,
  payload_sha256 text not null unique,
  raw_payload jsonb not null,
  record_count integer not null,
  ingest_status text not null default 'RECEIVED',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint source_snapshots_dataset_format
    check (dataset = lower(dataset) and dataset ~ '^[a-z][a-z0-9_]*$'),
  constraint source_snapshots_source_name_nonempty
    check (btrim(source_name) <> ''),
  constraint source_snapshots_source_url_nonempty
    check (btrim(source_url) <> ''),
  constraint source_snapshots_revision_nonempty
    check (btrim(source_revision) <> ''),
  constraint source_snapshots_sha256_format
    check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  constraint source_snapshots_record_count_nonnegative
    check (record_count >= 0),
  constraint source_snapshots_status_allowed
    check (ingest_status in ('RECEIVED', 'VALIDATED', 'REJECTED')),
  constraint source_snapshots_payload_shape
    check (jsonb_typeof(raw_payload) in ('array', 'object')),
  constraint source_snapshots_metadata_shape
    check (jsonb_typeof(metadata) = 'object')
);

comment on table wf_ingest.source_snapshots is
  'One immutable source payload. payload_sha256 hashes the exact retrieved bytes before JSON parsing.';
comment on column wf_ingest.source_snapshots.source_revision is
  'Immutable upstream revision, such as a Git commit or blob SHA; never retrieval time alone.';

create table wf_ingest.raw_entities (
  snapshot_id uuid not null
    references wf_ingest.source_snapshots(snapshot_id) on delete restrict,
  entity_type text not null,
  source_entity_id text not null,
  source_name text,
  source_ordinal integer,
  source_payload jsonb not null,
  source_payload_sha256 text,
  created_at timestamptz not null default now(),
  primary key (snapshot_id, entity_type, source_entity_id),
  constraint raw_entities_entity_type_format
    check (entity_type = lower(entity_type) and entity_type ~ '^[a-z][a-z0-9_]*$'),
  constraint raw_entities_source_entity_id_nonempty
    check (btrim(source_entity_id) <> ''),
  constraint raw_entities_source_ordinal_nonnegative
    check (source_ordinal is null or source_ordinal >= 0),
  constraint raw_entities_payload_shape
    check (jsonb_typeof(source_payload) = 'object'),
  constraint raw_entities_sha256_format
    check (
      source_payload_sha256 is null
      or source_payload_sha256 ~ '^[0-9a-f]{64}$'
    )
);

create unique index raw_entities_snapshot_type_ordinal_uidx
  on wf_ingest.raw_entities(snapshot_id, entity_type, source_ordinal)
  where source_ordinal is not null;

comment on table wf_ingest.raw_entities is
  'Generic lossless record layer shared by Arcanes, Mods, Weapons, and future datasets.';

create table wf_ingest.normalized_arcanes (
  snapshot_id uuid not null,
  raw_entity_type text not null default 'arcane',
  source_entity_id text not null,
  unique_name text not null,
  name text not null,
  equipment_type text,
  rarity text,
  max_rank integer not null,
  introduced_update text,
  tradable boolean,
  rank_payload jsonb not null default '[]'::jsonb,
  normalization_version text not null,
  normalized_payload_sha256 text,
  validation_status text not null,
  validation_errors jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  primary key (snapshot_id, unique_name, normalization_version),
  foreign key (snapshot_id, raw_entity_type, source_entity_id)
    references wf_ingest.raw_entities(snapshot_id, entity_type, source_entity_id)
    on delete restrict,
  constraint normalized_arcanes_entity_type
    check (raw_entity_type = 'arcane'),
  constraint normalized_arcanes_source_entity_id_nonempty
    check (btrim(source_entity_id) <> ''),
  constraint normalized_arcanes_unique_name_nonempty
    check (btrim(unique_name) <> ''),
  constraint normalized_arcanes_name_nonempty
    check (btrim(name) <> ''),
  constraint normalized_arcanes_max_rank_nonnegative
    check (max_rank >= 0),
  constraint normalized_arcanes_version_nonempty
    check (btrim(normalization_version) <> ''),
  constraint normalized_arcanes_sha256_format
    check (
      normalized_payload_sha256 is null
      or normalized_payload_sha256 ~ '^[0-9a-f]{64}$'
    ),
  constraint normalized_arcanes_validation_status
    check (validation_status in ('VALID', 'WARNING', 'INVALID')),
  constraint normalized_arcanes_rank_payload_shape
    check (jsonb_typeof(rank_payload) = 'array'),
  constraint normalized_arcanes_validation_errors_shape
    check (jsonb_typeof(validation_errors) = 'array')
);

comment on table wf_ingest.normalized_arcanes is
  'Typed, versioned Arcane normalization output. Repeated display names remain separate by unique_name.';

create table wf_meta.reconciliation_runs (
  reconciliation_run_id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  snapshot_id uuid not null
    references wf_ingest.source_snapshots(snapshot_id) on delete restrict,
  canonical_relation text not null,
  canonical_row_count integer,
  normalization_version text not null,
  algorithm_version text not null,
  run_status text not null default 'RUNNING',
  summary_counts jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_by text,
  constraint reconciliation_runs_entity_type_format
    check (entity_type = lower(entity_type) and entity_type ~ '^[a-z][a-z0-9_]*$'),
  constraint reconciliation_runs_relation_nonempty
    check (btrim(canonical_relation) <> ''),
  constraint reconciliation_runs_row_count_nonnegative
    check (canonical_row_count is null or canonical_row_count >= 0),
  constraint reconciliation_runs_normalization_version_nonempty
    check (btrim(normalization_version) <> ''),
  constraint reconciliation_runs_algorithm_version_nonempty
    check (btrim(algorithm_version) <> ''),
  constraint reconciliation_runs_status_allowed
    check (run_status in ('RUNNING', 'COMPLETED', 'FAILED')),
  constraint reconciliation_runs_summary_shape
    check (jsonb_typeof(summary_counts) = 'object'),
  constraint reconciliation_runs_completed_state
    check (
      (run_status = 'RUNNING' and completed_at is null)
      or (run_status in ('COMPLETED', 'FAILED') and completed_at is not null)
    )
);

create table wf_meta.reconciliation_items (
  reconciliation_item_id bigint generated always as identity primary key,
  reconciliation_run_id uuid not null
    references wf_meta.reconciliation_runs(reconciliation_run_id) on delete restrict,
  entity_type text not null,
  upstream_source_entity_id text,
  upstream_unique_name text,
  upstream_name text,
  canonical_entity_id text,
  canonical_name text,
  bucket text not null,
  field_diffs jsonb not null default '[]'::jsonb,
  match_method text not null,
  match_confidence numeric(5,4),
  created_at timestamptz not null default now(),
  constraint reconciliation_items_entity_type_format
    check (entity_type = lower(entity_type) and entity_type ~ '^[a-z][a-z0-9_]*$'),
  constraint reconciliation_items_bucket_allowed
    check (bucket in ('MATCH', 'GU_MISSING', 'GU_EXTRA', 'VALUE_MISMATCH', 'MANUAL_REVIEW')),
  constraint reconciliation_items_diffs_shape
    check (jsonb_typeof(field_diffs) = 'array'),
  constraint reconciliation_items_match_method_allowed
    check (match_method in ('UNIQUE_NAME', 'EXACT_NORMALIZED_NAME', 'KNOWN_ALIAS', 'UNMATCHED', 'MANUAL_REVIEW')),
  constraint reconciliation_items_confidence_range
    check (match_confidence is null or match_confidence between 0 and 1),
  constraint reconciliation_items_has_a_side
    check (
      upstream_source_entity_id is not null
      or upstream_unique_name is not null
      or upstream_name is not null
      or canonical_entity_id is not null
      or canonical_name is not null
    )
);

create index reconciliation_items_run_bucket_idx
  on wf_meta.reconciliation_items(reconciliation_run_id, bucket);

create table wf_meta.reconciliation_reviews (
  reconciliation_review_id bigint generated always as identity primary key,
  reconciliation_item_id bigint not null
    references wf_meta.reconciliation_items(reconciliation_item_id) on delete restrict,
  disposition text not null,
  reviewer text not null,
  rationale text not null,
  evidence_urls text[] not null default '{}'::text[],
  reviewed_at timestamptz not null default now(),
  supersedes_review_id bigint,
  unique (reconciliation_review_id, reconciliation_item_id),
  foreign key (supersedes_review_id, reconciliation_item_id)
    references wf_meta.reconciliation_reviews(
      reconciliation_review_id,
      reconciliation_item_id
    )
    on delete restrict,
  constraint reconciliation_reviews_disposition_allowed
    check (disposition in ('ACCEPT_UPSTREAM', 'KEEP_GU_OVERRIDE', 'DEPRECATED', 'NOT_APPLICABLE', 'MANUAL_REVIEW')),
  constraint reconciliation_reviews_reviewer_nonempty
    check (btrim(reviewer) <> ''),
  constraint reconciliation_reviews_rationale_nonempty
    check (btrim(rationale) <> ''),
  constraint reconciliation_reviews_not_self_superseding
    check (supersedes_review_id is distinct from reconciliation_review_id)
);

create index reconciliation_reviews_item_time_idx
  on wf_meta.reconciliation_reviews(reconciliation_item_id, reviewed_at desc, reconciliation_review_id desc);

create or replace view wf_meta.reconciliation_current_reviews
with (security_invoker = true)
as
select distinct on (r.reconciliation_item_id)
  r.reconciliation_review_id,
  r.reconciliation_item_id,
  r.disposition,
  r.reviewer,
  r.rationale,
  r.evidence_urls,
  r.reviewed_at,
  r.supersedes_review_id
from wf_meta.reconciliation_reviews r
order by
  r.reconciliation_item_id,
  r.reviewed_at desc,
  r.reconciliation_review_id desc;

comment on table wf_meta.reconciliation_items is
  'Immutable machine reconciliation output. Human decisions are append-only reconciliation_reviews.';
comment on table wf_meta.reconciliation_reviews is
  'Append-only review history; corrections supersede prior decisions instead of overwriting them.';

-- Guard retained upstream and review artifacts from UPDATE/DELETE. A new
-- upstream revision, normalizer version, or review decision is always a new row.
create or replace function wf_ingest.reject_immutable_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception
    using
      errcode = '55000',
      message = format(
        '%I.%I is append-only; attempted %s is not allowed',
        tg_table_schema,
        tg_table_name,
        tg_op
      );
end
$$;

revoke all on function wf_ingest.reject_immutable_mutation() from public;

create trigger source_snapshots_immutable
before update or delete on wf_ingest.source_snapshots
for each row execute function wf_ingest.reject_immutable_mutation();

create trigger raw_entities_immutable
before update or delete on wf_ingest.raw_entities
for each row execute function wf_ingest.reject_immutable_mutation();

create trigger normalized_arcanes_immutable
before update or delete on wf_ingest.normalized_arcanes
for each row execute function wf_ingest.reject_immutable_mutation();

create trigger reconciliation_items_immutable
before update or delete on wf_meta.reconciliation_items
for each row execute function wf_ingest.reject_immutable_mutation();

create trigger reconciliation_reviews_immutable
before update or delete on wf_meta.reconciliation_reviews
for each row execute function wf_ingest.reject_immutable_mutation();

-- Canonical evolution is nullable and additive. There is intentionally no
-- backfill here: every stable ID and source snapshot needs a reviewed
-- reconciliation disposition first.
alter table wf_base.arcanes
  add column if not exists unique_name text,
  add column if not exists equipment_type text,
  add column if not exists introduced_update text,
  add column if not exists is_active boolean not null default true,
  add column if not exists canonical_snapshot_id uuid,
  add column if not exists updated_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'wf_base.arcanes'::regclass
      and conname = 'arcanes_unique_name_nonempty'
  ) then
    alter table wf_base.arcanes
      add constraint arcanes_unique_name_nonempty
      check (unique_name is null or btrim(unique_name) <> '');
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'wf_base.arcanes'::regclass
      and conname = 'arcanes_canonical_snapshot_fk'
  ) then
    alter table wf_base.arcanes
      add constraint arcanes_canonical_snapshot_fk
      foreign key (canonical_snapshot_id)
      references wf_ingest.source_snapshots(snapshot_id)
      on delete restrict;
  end if;
end
$$;

create unique index if not exists arcanes_unique_name_uidx
  on wf_base.arcanes(unique_name)
  where unique_name is not null;

comment on column wf_base.arcanes.unique_name is
  'Reviewed stable upstream identity. Nullable until a reconciliation item is approved.';
comment on column wf_base.arcanes.equipment_type is
  'Equipment compatibility dimension; deliberately separate from legacy acquisition/family subcategory.';
comment on column wf_base.arcanes.canonical_snapshot_id is
  'Source snapshot for the currently promoted canonical values; NULL until promotion.';

create table wf_base.arcane_ranks (
  arcane_id bigint not null
    references wf_base.arcanes(arcane_id) on delete restrict,
  rank integer not null,
  display_text text not null,
  raw_stats jsonb not null default '{}'::jsonb,
  canonical_snapshot_id uuid not null
    references wf_ingest.source_snapshots(snapshot_id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  primary key (arcane_id, rank),
  constraint arcane_ranks_rank_nonnegative check (rank >= 0),
  constraint arcane_ranks_display_text_nonempty check (btrim(display_text) <> ''),
  constraint arcane_ranks_raw_stats_shape
    check (jsonb_typeof(raw_stats) in ('array', 'object'))
);

comment on table wf_base.arcane_ranks is
  'Reviewed canonical rank-by-rank Arcane text and raw stats. Empty until canonical promotion is approved.';

-- Staging and review data are service-only. Canonical ranks are public-read
-- like existing wf_base reference data, but never client-writable.
alter table wf_ingest.source_snapshots enable row level security;
alter table wf_ingest.raw_entities enable row level security;
alter table wf_ingest.normalized_arcanes enable row level security;
alter table wf_meta.reconciliation_runs enable row level security;
alter table wf_meta.reconciliation_items enable row level security;
alter table wf_meta.reconciliation_reviews enable row level security;
alter table wf_base.arcane_ranks enable row level security;

create policy "Public read access to arcane_ranks"
  on wf_base.arcane_ranks
  for select
  to anon, authenticated
  using (true);

revoke all on all tables in schema wf_ingest from public, anon, authenticated;
revoke all on all tables in schema wf_meta from public, anon, authenticated;
revoke all on all sequences in schema wf_meta from public, anon, authenticated;

grant select, insert on wf_ingest.source_snapshots to service_role;
grant select, insert on wf_ingest.raw_entities to service_role;
grant select, insert on wf_ingest.normalized_arcanes to service_role;
grant select, insert, update on wf_meta.reconciliation_runs to service_role;
grant select, insert on wf_meta.reconciliation_items to service_role;
grant select, insert on wf_meta.reconciliation_reviews to service_role;
grant select on wf_meta.reconciliation_current_reviews to service_role;
grant usage, select on all sequences in schema wf_meta to service_role;

grant select on wf_base.arcane_ranks to anon, authenticated;
grant select, insert, update, delete on wf_base.arcane_ranks to service_role;
