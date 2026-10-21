-- Transactional acceptance tests for the non-promoting Arcane pipeline slice.
-- Run immediately after DB/Migrations/20260831_add_static_data_pipeline.sql.
-- The final ROLLBACK removes every fixture created by this file.
--
-- This suite intentionally asserts that no canonical Arcane values/ranks have
-- been promoted yet. Retire or revise those specific assertions when the later
-- reviewed-promotion migration is approved.

begin;

do $$
declare
  relation_name text;
  required_relations text[] := array[
    'wf_ingest.source_snapshots',
    'wf_ingest.raw_entities',
    'wf_ingest.normalized_arcanes',
    'wf_meta.reconciliation_runs',
    'wf_meta.reconciliation_items',
    'wf_meta.reconciliation_reviews',
    'wf_meta.reconciliation_current_reviews',
    'wf_base.arcane_ranks'
  ];
begin
  foreach relation_name in array required_relations loop
    if to_regclass(relation_name) is null then
      raise exception 'Missing required relation: %', relation_name;
    end if;
  end loop;

  if not exists (
    select 1
    from pg_catalog.pg_attribute
    where attrelid = 'wf_base.arcanes'::regclass
      and attname = 'unique_name'
      and not attnotnull
      and not attisdropped
  ) then
    raise exception 'wf_base.arcanes.unique_name must exist and remain nullable';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'wf_base.arcane_ranks'::regclass
      and contype = 'f'
      and confrelid = 'wf_base.arcanes'::regclass
  ) then
    raise exception 'wf_base.arcane_ranks must reference wf_base.arcanes';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_indexes
    where schemaname = 'wf_base'
      and tablename = 'arcanes'
      and indexname = 'arcanes_unique_name_uidx'
      and indexdef ilike '%where (unique_name is not null)%'
  ) then
    raise exception 'Missing partial unique index for non-null Arcane unique_name values';
  end if;
end
$$;

-- Existing production view contracts must remain exactly as the frontend saw
-- them before this migration.
do $$
declare
  actual_columns text[];
begin
  select array_agg(a.attname order by a.attnum)
    into actual_columns
  from pg_catalog.pg_attribute a
  where a.attrelid = 'wf_user.arcane_collection_summary'::regclass
    and a.attnum > 0
    and not a.attisdropped;

  if actual_columns <> array[
    'total_arcanes', 'owned_arcanes', 'completed_arcanes', 'missing_arcanes'
  ]::text[] then
    raise exception 'arcane_collection_summary contract changed: %', actual_columns;
  end if;

  select array_agg(a.attname order by a.attnum)
    into actual_columns
  from pg_catalog.pg_attribute a
  where a.attrelid = 'wf_user.arcane_collection_by_type'::regclass
    and a.attnum > 0
    and not a.attisdropped;

  if actual_columns <> array[
    'arcane_type', 'total', 'owned', 'completed', 'missing'
  ]::text[] then
    raise exception 'arcane_collection_by_type contract changed: %', actual_columns;
  end if;

  select array_agg(a.attname order by a.attnum)
    into actual_columns
  from pg_catalog.pg_attribute a
  where a.attrelid = 'wf_user.arcane_collection_detail'::regclass
    and a.attnum > 0
    and not a.attisdropped;

  if actual_columns <> array[
    'arcane_id', 'name', 'arcane_type', 'subcategory', 'rarity', 'max_rank',
    'effect_r5', 'source', 'wfm_slug', 'owned_copies', 'copies_needed_for_max',
    'derived_rank', 'copies_remaining', 'is_completed', 'is_owned'
  ]::text[] then
    raise exception 'arcane_collection_detail contract changed: %', actual_columns;
  end if;
end
$$;

-- This migration must not promote any upstream fact into canonical tables.
do $$
begin
  if exists (
    select 1
    from wf_base.arcanes
    where unique_name is not null
       or equipment_type is not null
       or introduced_update is not null
       or canonical_snapshot_id is not null
       or updated_at is not null
       or not is_active
  ) then
    raise exception 'Canonical Arcane values were unexpectedly promoted or changed';
  end if;

  if exists (select 1 from wf_base.arcane_ranks) then
    raise exception 'wf_base.arcane_ranks must be empty before reviewed promotion';
  end if;
end
$$;

-- Staging/meta schemas are service-only; canonical rank rows are public-read
-- and client-write protected.
do $$
declare
  secured_relation regclass;
begin
  foreach secured_relation in array array[
    'wf_ingest.source_snapshots'::regclass,
    'wf_ingest.raw_entities'::regclass,
    'wf_ingest.normalized_arcanes'::regclass,
    'wf_meta.reconciliation_runs'::regclass,
    'wf_meta.reconciliation_items'::regclass,
    'wf_meta.reconciliation_reviews'::regclass,
    'wf_base.arcane_ranks'::regclass
  ] loop
    if not (select relrowsecurity from pg_catalog.pg_class where oid = secured_relation) then
      raise exception 'RLS is not enabled on %', secured_relation;
    end if;
  end loop;

  if has_schema_privilege('anon', 'wf_ingest', 'USAGE')
     or has_schema_privilege('authenticated', 'wf_ingest', 'USAGE')
     or has_schema_privilege('anon', 'wf_meta', 'USAGE')
     or has_schema_privilege('authenticated', 'wf_meta', 'USAGE') then
    raise exception 'Browser roles must not have staging/meta schema usage';
  end if;

  if has_table_privilege('anon', 'wf_ingest.source_snapshots', 'SELECT')
     or has_table_privilege('authenticated', 'wf_meta.reconciliation_items', 'SELECT') then
    raise exception 'Browser roles must not read ingestion or reconciliation data';
  end if;

  if not has_table_privilege('service_role', 'wf_ingest.source_snapshots', 'SELECT')
     or not has_table_privilege('service_role', 'wf_ingest.source_snapshots', 'INSERT')
     or not has_table_privilege('service_role', 'wf_meta.reconciliation_runs', 'SELECT')
     or not has_table_privilege('service_role', 'wf_meta.reconciliation_runs', 'INSERT')
     or not has_table_privilege('service_role', 'wf_meta.reconciliation_runs', 'UPDATE') then
    raise exception 'service_role is missing required pipeline privileges';
  end if;

  if not has_table_privilege('anon', 'wf_base.arcane_ranks', 'SELECT')
     or has_table_privilege('anon', 'wf_base.arcane_ranks', 'INSERT')
     or has_table_privilege('authenticated', 'wf_base.arcane_ranks', 'UPDATE') then
    raise exception 'wf_base.arcane_ranks grants are not read-only for browser roles';
  end if;
end
$$;

-- Insert a complete miniature pipeline run and prove immutable/auditable
-- behavior. All fixtures disappear at the final ROLLBACK.
do $$
declare
  fixture_snapshot_id uuid;
  fixture_run_id uuid;
  fixture_item_id bigint;
  fixture_review_id bigint;
  immutable_guard_worked boolean;
begin
  insert into wf_ingest.source_snapshots (
    dataset,
    source_name,
    source_url,
    source_revision,
    retrieved_at,
    payload_sha256,
    raw_payload,
    record_count,
    ingest_status,
    metadata
  ) values (
    'arcanes',
    'test-fixture',
    'https://example.invalid/Arcanes.json',
    'test-revision-1',
    '2026-08-31T00:00:00Z',
    repeat('0', 63) || '1',
    '[{"uniqueName":"/Test/Arcane","name":"Test Arcane"}]'::jsonb,
    1,
    'VALIDATED',
    '{"fixture":true}'::jsonb
  )
  returning snapshot_id into fixture_snapshot_id;

  immutable_guard_worked := false;
  begin
    update wf_ingest.source_snapshots
    set source_revision = 'mutated'
    where snapshot_id = fixture_snapshot_id;
  exception
    when sqlstate '55000' then
      immutable_guard_worked := true;
  end;
  if not immutable_guard_worked then
    raise exception 'source_snapshots UPDATE was not rejected';
  end if;

  begin
    insert into wf_ingest.source_snapshots (
      dataset, source_name, source_url, source_revision, retrieved_at,
      payload_sha256, raw_payload, record_count
    ) values (
      'arcanes', 'duplicate-hash-test', 'https://example.invalid/duplicate',
      'test-revision-2', now(), repeat('0', 63) || '1', '[]'::jsonb, 0
    );
    raise exception 'Duplicate snapshot hash was accepted';
  exception
    when unique_violation then null;
  end;

  insert into wf_ingest.raw_entities (
    snapshot_id,
    entity_type,
    source_entity_id,
    source_name,
    source_ordinal,
    source_payload
  ) values (
    fixture_snapshot_id,
    'arcane',
    '/Test/Arcane',
    'Test Arcane',
    0,
    '{"uniqueName":"/Test/Arcane","name":"Test Arcane"}'::jsonb
  );

  insert into wf_ingest.normalized_arcanes (
    snapshot_id,
    source_entity_id,
    unique_name,
    name,
    equipment_type,
    max_rank,
    rank_payload,
    normalization_version,
    validation_status
  ) values (
    fixture_snapshot_id,
    '/Test/Arcane',
    '/Test/Arcane',
    'Test Arcane',
    'Warframe Arcane',
    5,
    '[{"rank":0,"stats":["Test"]}]'::jsonb,
    'test-normalizer-v1',
    'VALID'
  );

  immutable_guard_worked := false;
  begin
    delete from wf_ingest.normalized_arcanes
    where snapshot_id = fixture_snapshot_id;
  exception
    when sqlstate '55000' then
      immutable_guard_worked := true;
  end;
  if not immutable_guard_worked then
    raise exception 'normalized_arcanes DELETE was not rejected';
  end if;

  insert into wf_meta.reconciliation_runs (
    entity_type,
    snapshot_id,
    canonical_relation,
    canonical_row_count,
    normalization_version,
    algorithm_version,
    run_status,
    summary_counts,
    completed_at,
    created_by
  ) values (
    'arcane',
    fixture_snapshot_id,
    'wf_base.arcanes',
    (select count(*) from wf_base.arcanes),
    'test-normalizer-v1',
    'test-reconciler-v1',
    'COMPLETED',
    '{"MATCH":1}'::jsonb,
    now(),
    'migration-test'
  )
  returning reconciliation_run_id into fixture_run_id;

  insert into wf_meta.reconciliation_items (
    reconciliation_run_id,
    entity_type,
    upstream_source_entity_id,
    upstream_unique_name,
    upstream_name,
    canonical_entity_id,
    canonical_name,
    bucket,
    field_diffs,
    match_method,
    match_confidence
  ) values (
    fixture_run_id,
    'arcane',
    '/Test/Arcane',
    '/Test/Arcane',
    'Test Arcane',
    '1',
    'Arcane Acceleration',
    'MANUAL_REVIEW',
    '[{"field":"name","upstream":"Test Arcane","canonical":"Arcane Acceleration"}]'::jsonb,
    'MANUAL_REVIEW',
    0
  )
  returning reconciliation_item_id into fixture_item_id;

  insert into wf_meta.reconciliation_reviews (
    reconciliation_item_id,
    disposition,
    reviewer,
    rationale
  ) values (
    fixture_item_id,
    'MANUAL_REVIEW',
    'migration-test',
    'Fixture remains deliberately unresolved.'
  )
  returning reconciliation_review_id into fixture_review_id;

  if not exists (
    select 1
    from wf_meta.reconciliation_current_reviews
    where reconciliation_review_id = fixture_review_id
      and reconciliation_item_id = fixture_item_id
      and disposition = 'MANUAL_REVIEW'
  ) then
    raise exception 'Current-review view did not return the latest review';
  end if;

  immutable_guard_worked := false;
  begin
    update wf_meta.reconciliation_items
    set bucket = 'MATCH'
    where reconciliation_item_id = fixture_item_id;
  exception
    when sqlstate '55000' then
      immutable_guard_worked := true;
  end;
  if not immutable_guard_worked then
    raise exception 'reconciliation_items UPDATE was not rejected';
  end if;

  immutable_guard_worked := false;
  begin
    delete from wf_meta.reconciliation_reviews
    where reconciliation_review_id = fixture_review_id;
  exception
    when sqlstate '55000' then
      immutable_guard_worked := true;
  end;
  if not immutable_guard_worked then
    raise exception 'reconciliation_reviews DELETE was not rejected';
  end if;

  begin
    insert into wf_base.arcane_ranks (
      arcane_id,
      rank,
      display_text,
      canonical_snapshot_id
    ) values (
      -9223372036854775808,
      0,
      'Must fail because the Arcane does not exist.',
      fixture_snapshot_id
    );
    raise exception 'arcane_ranks accepted an unknown canonical Arcane ID';
  exception
    when foreign_key_violation then null;
  end;
end
$$;

rollback;
