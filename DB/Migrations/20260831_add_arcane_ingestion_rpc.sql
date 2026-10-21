-- Atomic service-only commit boundary for the Arcane ingestion pipeline.
--
-- wf_ingest and wf_meta deliberately remain absent from PostgREST's exposed
-- schema list. This narrowly scoped function lives in the already exposed
-- wf_base schema, accepts one fully validated bundle, and commits staging plus
-- reconciliation rows in a single database transaction. It contains no DML
-- against wf_base.arcanes or wf_base.arcane_ranks.

create unique index if not exists reconciliation_runs_snapshot_versions_uidx
  on wf_meta.reconciliation_runs(
    snapshot_id,
    normalization_version,
    algorithm_version
  );

create or replace function wf_base.commit_arcane_ingestion(bundle jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  snapshot_doc jsonb := bundle -> 'snapshot';
  raw_docs jsonb := bundle -> 'raw_entities';
  normalized_docs jsonb := bundle -> 'normalized_arcanes';
  reconciliation_doc jsonb := bundle -> 'reconciliation';
  item_docs jsonb := bundle #> '{reconciliation,items}';
  snapshot_hash text;
  normalization_version_value text;
  algorithm_version_value text;
  expected_canonical_count integer;
  actual_canonical_count integer;
  snapshot_id_value uuid;
  reconciliation_run_id_value uuid;
  summary_counts_value jsonb;
  snapshot_was_created boolean := false;
begin
  if jsonb_typeof(bundle) is distinct from 'object' then
    raise exception using errcode = '22023', message = 'bundle must be a JSON object';
  end if;

  if jsonb_typeof(snapshot_doc) is distinct from 'object'
     or jsonb_typeof(raw_docs) is distinct from 'array'
     or jsonb_typeof(normalized_docs) is distinct from 'array'
     or jsonb_typeof(reconciliation_doc) is distinct from 'object'
     or jsonb_typeof(item_docs) is distinct from 'array' then
    raise exception using
      errcode = '22023',
      message = 'bundle requires snapshot, raw_entities, normalized_arcanes, and reconciliation.items';
  end if;

  if snapshot_doc ->> 'dataset' is distinct from 'arcanes' then
    raise exception using errcode = '22023', message = 'snapshot dataset must be arcanes';
  end if;

  if (snapshot_doc ->> 'record_count')::integer
     is distinct from jsonb_array_length(raw_docs) then
    raise exception using
      errcode = '22023',
      message = 'snapshot record_count must equal raw_entities length';
  end if;

  if jsonb_typeof(snapshot_doc -> 'raw_payload') is distinct from 'array'
     or jsonb_array_length(snapshot_doc -> 'raw_payload')
        is distinct from jsonb_array_length(raw_docs) then
    raise exception using
      errcode = '22023',
      message = 'snapshot raw_payload must be an array matching raw_entities length';
  end if;

  if jsonb_array_length(normalized_docs) is distinct from jsonb_array_length(raw_docs) then
    raise exception using
      errcode = '22023',
      message = 'every raw Arcane record must have one normalized staging record';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(raw_docs) as raw_row(
      entity_type text,
      source_entity_id text,
      source_name text,
      source_ordinal integer,
      source_payload jsonb,
      source_payload_sha256 text
    )
    where raw_row.entity_type is distinct from 'arcane'
       or nullif(btrim(raw_row.source_entity_id), '') is null
       or raw_row.source_payload is null
       or raw_row.source_payload_sha256 is null
       or raw_row.source_payload_sha256 !~ '^[0-9a-f]{64}$'
  ) then
    raise exception using errcode = '22023', message = 'raw entity validation failed';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(normalized_docs) as normalized_row(
      source_entity_id text,
      unique_name text,
      name text,
      normalization_version text,
      normalized_payload_sha256 text
    )
    where nullif(btrim(normalized_row.source_entity_id), '') is null
       or nullif(btrim(normalized_row.unique_name), '') is null
       or nullif(btrim(normalized_row.name), '') is null
       or nullif(btrim(normalized_row.normalization_version), '') is null
       or normalized_row.normalized_payload_sha256 is null
       or normalized_row.normalized_payload_sha256 !~ '^[0-9a-f]{64}$'
  ) then
    raise exception using errcode = '22023', message = 'normalized Arcane validation failed';
  end if;

  if (
    select count(*)
    from (
      select raw_row.source_entity_id
      from jsonb_to_recordset(raw_docs) as raw_row(source_entity_id text)
      group by raw_row.source_entity_id
    ) distinct_raw
  ) is distinct from jsonb_array_length(raw_docs) then
    raise exception using errcode = '22023', message = 'raw source_entity_id values must be unique';
  end if;

  if (
    select count(*)
    from (
      select normalized_row.unique_name
      from jsonb_to_recordset(normalized_docs) as normalized_row(unique_name text)
      group by normalized_row.unique_name
    ) distinct_normalized
  ) is distinct from jsonb_array_length(normalized_docs) then
    raise exception using errcode = '22023', message = 'normalized unique_name values must be unique';
  end if;

  select min(normalized_row.normalization_version)
    into normalization_version_value
  from jsonb_to_recordset(normalized_docs) as normalized_row(normalization_version text);

  if normalization_version_value is null
     or exists (
       select 1
       from jsonb_to_recordset(normalized_docs) as normalized_row(normalization_version text)
       where normalized_row.normalization_version is distinct from normalization_version_value
     ) then
    raise exception using
      errcode = '22023',
      message = 'all normalized rows must use one normalization_version';
  end if;

  if reconciliation_doc ->> 'normalization_version'
     is distinct from normalization_version_value then
    raise exception using
      errcode = '22023',
      message = 'reconciliation normalization_version does not match normalized rows';
  end if;

  algorithm_version_value := reconciliation_doc ->> 'algorithm_version';
  if nullif(btrim(algorithm_version_value), '') is null then
    raise exception using errcode = '22023', message = 'algorithm_version is required';
  end if;

  expected_canonical_count := (reconciliation_doc ->> 'canonical_row_count')::integer;
  select count(*)::integer into actual_canonical_count from wf_base.arcanes;
  if expected_canonical_count is distinct from actual_canonical_count then
    raise exception using
      errcode = '40001',
      message = format(
        'canonical Arcane count drifted from %s to %s; rebuild reconciliation',
        expected_canonical_count,
        actual_canonical_count
      );
  end if;

  snapshot_hash := snapshot_doc ->> 'payload_sha256';
  if snapshot_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'snapshot payload_sha256 is invalid';
  end if;

  select s.snapshot_id
    into snapshot_id_value
  from wf_ingest.source_snapshots s
  where s.payload_sha256 = snapshot_hash;

  if snapshot_id_value is null then
    insert into wf_ingest.source_snapshots (
      dataset,
      source_name,
      source_url,
      source_revision,
      source_release,
      game_version,
      retrieved_at,
      payload_sha256,
      raw_payload,
      record_count,
      ingest_status,
      metadata
    ) values (
      snapshot_doc ->> 'dataset',
      snapshot_doc ->> 'source_name',
      snapshot_doc ->> 'source_url',
      snapshot_doc ->> 'source_revision',
      snapshot_doc ->> 'source_release',
      snapshot_doc ->> 'game_version',
      (snapshot_doc ->> 'retrieved_at')::timestamptz,
      snapshot_hash,
      snapshot_doc -> 'raw_payload',
      (snapshot_doc ->> 'record_count')::integer,
      snapshot_doc ->> 'ingest_status',
      coalesce(snapshot_doc -> 'metadata', '{}'::jsonb)
    )
    returning snapshot_id into snapshot_id_value;

    snapshot_was_created := true;

    insert into wf_ingest.raw_entities (
      snapshot_id,
      entity_type,
      source_entity_id,
      source_name,
      source_ordinal,
      source_payload,
      source_payload_sha256
    )
    select
      snapshot_id_value,
      raw_row.entity_type,
      raw_row.source_entity_id,
      raw_row.source_name,
      raw_row.source_ordinal,
      raw_row.source_payload,
      raw_row.source_payload_sha256
    from jsonb_to_recordset(raw_docs) as raw_row(
      entity_type text,
      source_entity_id text,
      source_name text,
      source_ordinal integer,
      source_payload jsonb,
      source_payload_sha256 text
    );
  else
    if not exists (
      select 1
      from wf_ingest.source_snapshots s
      where s.snapshot_id = snapshot_id_value
        and s.dataset = snapshot_doc ->> 'dataset'
        and s.source_name = snapshot_doc ->> 'source_name'
        and s.source_url = snapshot_doc ->> 'source_url'
        and s.source_revision = snapshot_doc ->> 'source_revision'
        and s.raw_payload = snapshot_doc -> 'raw_payload'
        and s.record_count = (snapshot_doc ->> 'record_count')::integer
    ) then
      raise exception using
        errcode = '22023',
        message = 'existing snapshot hash has different source metadata or payload';
    end if;

    if (
      select count(*)::integer
      from wf_ingest.raw_entities r
      where r.snapshot_id = snapshot_id_value
        and r.entity_type = 'arcane'
    ) is distinct from jsonb_array_length(raw_docs)
       or exists (
         select 1
         from jsonb_to_recordset(raw_docs) as raw_row(
           entity_type text,
           source_entity_id text,
           source_payload jsonb,
           source_payload_sha256 text
         )
         where not exists (
           select 1
           from wf_ingest.raw_entities stored
           where stored.snapshot_id = snapshot_id_value
             and stored.entity_type = raw_row.entity_type
             and stored.source_entity_id = raw_row.source_entity_id
             and stored.source_payload = raw_row.source_payload
             and stored.source_payload_sha256 = raw_row.source_payload_sha256
         )
       ) then
      raise exception using
        errcode = '22023',
        message = 'existing snapshot raw entities differ from the supplied bundle';
    end if;
  end if;

  select r.reconciliation_run_id
    into reconciliation_run_id_value
  from wf_meta.reconciliation_runs r
  where r.snapshot_id = snapshot_id_value
    and r.normalization_version = normalization_version_value
    and r.algorithm_version = algorithm_version_value
    and r.run_status = 'COMPLETED';

  if reconciliation_run_id_value is not null then
    return (
      select jsonb_build_object(
        'snapshot_id', r.snapshot_id,
        'reconciliation_run_id', r.reconciliation_run_id,
        'reused', true,
        'raw_records', jsonb_array_length(raw_docs),
        'normalized_records', jsonb_array_length(normalized_docs),
        'reconciliation_items', (
          select count(*)
          from wf_meta.reconciliation_items i
          where i.reconciliation_run_id = r.reconciliation_run_id
        ),
        'summary_counts', r.summary_counts
      )
      from wf_meta.reconciliation_runs r
      where r.reconciliation_run_id = reconciliation_run_id_value
    );
  end if;

  insert into wf_ingest.normalized_arcanes (
    snapshot_id,
    raw_entity_type,
    source_entity_id,
    unique_name,
    name,
    equipment_type,
    rarity,
    max_rank,
    introduced_update,
    tradable,
    rank_payload,
    normalization_version,
    normalized_payload_sha256,
    validation_status,
    validation_errors
  )
  select
    snapshot_id_value,
    'arcane',
    normalized_row.source_entity_id,
    normalized_row.unique_name,
    normalized_row.name,
    normalized_row.equipment_type,
    normalized_row.rarity,
    normalized_row.max_rank,
    normalized_row.introduced_update,
    normalized_row.tradable,
    normalized_row.rank_payload,
    normalized_row.normalization_version,
    normalized_row.normalized_payload_sha256,
    normalized_row.validation_status,
    normalized_row.validation_errors
  from jsonb_to_recordset(normalized_docs) as normalized_row(
    source_entity_id text,
    unique_name text,
    name text,
    equipment_type text,
    rarity text,
    max_rank integer,
    introduced_update text,
    tradable boolean,
    rank_payload jsonb,
    normalization_version text,
    normalized_payload_sha256 text,
    validation_status text,
    validation_errors jsonb
  )
  on conflict (snapshot_id, unique_name, normalization_version) do nothing;

  if (
    select count(*)::integer
    from wf_ingest.normalized_arcanes n
    where n.snapshot_id = snapshot_id_value
      and n.normalization_version = normalization_version_value
  ) is distinct from jsonb_array_length(normalized_docs)
     or exists (
       select 1
       from jsonb_to_recordset(normalized_docs) as normalized_row(
         unique_name text,
         normalization_version text,
         normalized_payload_sha256 text
       )
       where not exists (
         select 1
         from wf_ingest.normalized_arcanes stored
         where stored.snapshot_id = snapshot_id_value
           and stored.unique_name = normalized_row.unique_name
           and stored.normalization_version = normalized_row.normalization_version
           and stored.normalized_payload_sha256 = normalized_row.normalized_payload_sha256
       )
     ) then
    raise exception using
      errcode = '22023',
      message = 'stored normalized rows differ from the supplied bundle';
  end if;

  select coalesce(jsonb_object_agg(bucket_counts.bucket, bucket_counts.item_count), '{}'::jsonb)
    into summary_counts_value
  from (
    select item_row.bucket, count(*)::integer as item_count
    from jsonb_to_recordset(item_docs) as item_row(bucket text)
    group by item_row.bucket
  ) bucket_counts;

  summary_counts_value := summary_counts_value || jsonb_build_object(
    'RAW_RECORDS', jsonb_array_length(raw_docs),
    'NORMALIZED_RECORDS', jsonb_array_length(normalized_docs),
    'CANONICAL_ROWS', actual_canonical_count
  );

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
    snapshot_id_value,
    'wf_base.arcanes',
    actual_canonical_count,
    normalization_version_value,
    algorithm_version_value,
    'COMPLETED',
    summary_counts_value,
    now(),
    nullif(reconciliation_doc ->> 'created_by', '')
  )
  returning reconciliation_run_id into reconciliation_run_id_value;

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
  )
  select
    reconciliation_run_id_value,
    'arcane',
    item_row.upstream_source_entity_id,
    item_row.upstream_unique_name,
    item_row.upstream_name,
    item_row.canonical_entity_id,
    item_row.canonical_name,
    item_row.bucket,
    coalesce(item_row.field_diffs, '[]'::jsonb),
    item_row.match_method,
    item_row.match_confidence
  from jsonb_to_recordset(item_docs) as item_row(
    upstream_source_entity_id text,
    upstream_unique_name text,
    upstream_name text,
    canonical_entity_id text,
    canonical_name text,
    bucket text,
    field_diffs jsonb,
    match_method text,
    match_confidence numeric
  );

  return jsonb_build_object(
    'snapshot_id', snapshot_id_value,
    'reconciliation_run_id', reconciliation_run_id_value,
    'reused', not snapshot_was_created,
    'raw_records', jsonb_array_length(raw_docs),
    'normalized_records', jsonb_array_length(normalized_docs),
    'reconciliation_items', jsonb_array_length(item_docs),
    'summary_counts', summary_counts_value
  );
end
$$;

revoke all on function wf_base.commit_arcane_ingestion(jsonb) from public, anon, authenticated;
grant execute on function wf_base.commit_arcane_ingestion(jsonb) to service_role;

comment on function wf_base.commit_arcane_ingestion(jsonb) is
  'Service-only atomic commit of immutable Arcane source, raw, normalized, and reconciliation artifacts. Never promotes canonical values.';

notify pgrst, 'reload schema';
