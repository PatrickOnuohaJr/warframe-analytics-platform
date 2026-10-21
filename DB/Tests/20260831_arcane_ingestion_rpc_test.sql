-- Transactional acceptance tests for the service-only atomic ingestion RPC.
-- Run after DB/Migrations/20260831_add_arcane_ingestion_rpc.sql.
-- The final ROLLBACK removes the complete fixture snapshot/run.

begin;

do $$
declare
  canonical_count_before integer;
  canonical_rank_count_before integer;
  bundle jsonb;
  first_result jsonb;
  second_result jsonb;
  snapshot_id_value uuid;
  run_id_value uuid;
begin
  if not has_function_privilege(
    'service_role',
    'wf_base.commit_arcane_ingestion(jsonb)',
    'EXECUTE'
  ) then
    raise exception 'service_role cannot execute commit_arcane_ingestion';
  end if;

  if has_function_privilege(
    'anon',
    'wf_base.commit_arcane_ingestion(jsonb)',
    'EXECUTE'
  ) or has_function_privilege(
    'authenticated',
    'wf_base.commit_arcane_ingestion(jsonb)',
    'EXECUTE'
  ) then
    raise exception 'browser role can execute service-only ingestion RPC';
  end if;

  select count(*)::integer into canonical_count_before from wf_base.arcanes;
  select count(*)::integer into canonical_rank_count_before from wf_base.arcane_ranks;

  bundle := jsonb_build_object(
    'snapshot', jsonb_build_object(
      'dataset', 'arcanes',
      'source_name', 'test-fixture',
      'source_url', 'https://example.invalid/Arcanes.json',
      'source_revision', repeat('1', 40),
      'source_release', null,
      'game_version', null,
      'retrieved_at', '2026-08-31T00:00:00Z',
      'payload_sha256', repeat('2', 64),
      'raw_payload', jsonb_build_array(
        jsonb_build_object(
          'uniqueName', '/Test/AtomicArcane',
          'name', 'Atomic Arcane'
        )
      ),
      'record_count', 1,
      'ingest_status', 'VALIDATED',
      'metadata', jsonb_build_object('fixture', true)
    ),
    'raw_entities', jsonb_build_array(
      jsonb_build_object(
        'entity_type', 'arcane',
        'source_entity_id', '/Test/AtomicArcane',
        'source_name', 'Atomic Arcane',
        'source_ordinal', 0,
        'source_payload', jsonb_build_object(
          'uniqueName', '/Test/AtomicArcane',
          'name', 'Atomic Arcane'
        ),
        'source_payload_sha256', repeat('3', 64)
      )
    ),
    'normalized_arcanes', jsonb_build_array(
      jsonb_build_object(
        'source_entity_id', '/Test/AtomicArcane',
        'unique_name', '/Test/AtomicArcane',
        'name', 'Atomic Arcane',
        'equipment_type', 'Warframe Arcane',
        'rarity', 'Rare',
        'max_rank', 0,
        'introduced_update', null,
        'tradable', true,
        'rank_payload', jsonb_build_array(),
        'normalization_version', 'rpc-test-normalizer-v1',
        'normalized_payload_sha256', repeat('4', 64),
        'validation_status', 'WARNING',
        'validation_errors', jsonb_build_array(
          jsonb_build_object('code', 'MISSING_LEVEL_STATS')
        )
      )
    ),
    'reconciliation', jsonb_build_object(
      'canonical_row_count', canonical_count_before,
      'normalization_version', 'rpc-test-normalizer-v1',
      'algorithm_version', 'rpc-test-reconciler-v1',
      'created_by', 'rpc-acceptance-test',
      'items', jsonb_build_array(
        jsonb_build_object(
          'upstream_source_entity_id', '/Test/AtomicArcane',
          'upstream_unique_name', '/Test/AtomicArcane',
          'upstream_name', 'Atomic Arcane',
          'canonical_entity_id', null,
          'canonical_name', null,
          'bucket', 'GU_MISSING',
          'field_diffs', jsonb_build_array(
            jsonb_build_object(
              'field', 'canonical_entity',
              'canonical', null,
              'upstream', 'Atomic Arcane'
            )
          ),
          'match_method', 'UNMATCHED',
          'match_confidence', 0
        )
      )
    )
  );

  first_result := wf_base.commit_arcane_ingestion(bundle);
  second_result := wf_base.commit_arcane_ingestion(bundle);

  if (first_result ->> 'reused')::boolean then
    raise exception 'first RPC execution unexpectedly reused an existing snapshot';
  end if;
  if not (second_result ->> 'reused')::boolean then
    raise exception 'second identical RPC execution was not idempotent';
  end if;
  if first_result ->> 'snapshot_id' is distinct from second_result ->> 'snapshot_id'
     or first_result ->> 'reconciliation_run_id'
        is distinct from second_result ->> 'reconciliation_run_id' then
    raise exception 'idempotent RPC returned different snapshot/run IDs';
  end if;

  snapshot_id_value := (first_result ->> 'snapshot_id')::uuid;
  run_id_value := (first_result ->> 'reconciliation_run_id')::uuid;

  if (select count(*) from wf_ingest.raw_entities where snapshot_id = snapshot_id_value) <> 1
     or (select count(*) from wf_ingest.normalized_arcanes where snapshot_id = snapshot_id_value) <> 1
     or (select count(*) from wf_meta.reconciliation_items where reconciliation_run_id = run_id_value) <> 1 then
    raise exception 'RPC did not commit the complete fixture bundle';
  end if;

  if (select count(*) from wf_base.arcanes) <> canonical_count_before
     or (select count(*) from wf_base.arcane_ranks) <> canonical_rank_count_before then
    raise exception 'RPC changed a canonical Arcane table';
  end if;

  begin
    perform wf_base.commit_arcane_ingestion(
      jsonb_set(bundle, '{snapshot,record_count}', '2'::jsonb)
    );
    raise exception 'RPC accepted a mismatched source record count';
  exception
    when sqlstate '22023' then null;
  end;
end
$$;

rollback;

