-- Step 2 of owner-only login: LOCK THE DATABASE DOWN.
--
-- After this runs, only a signed-in account listed in wf_user.app_owners can
-- touch Cephalon Gu data. Anonymous requests (anyone holding the public
-- Supabase key) get nothing, on every table and view in both schemas.
--
--   wf_user (your builds, inventory, tests)   -> owner: read + write
--   wf_base (game catalog, read-only to app)  -> owner: read only; nobody can
--                                                write through the API (the app
--                                                never writes to wf_base; seed
--                                                scripts use the service role,
--                                                which bypasses all of this)
--
-- RUN ORDER (see Docs/Login Setup.md):
--   1. 20261023_add_app_owners.sql
--   2. Sign in with Google once, copy your User UID, insert it into app_owners
--   3. THIS FILE
-- If anything goes wrong: 20261023_rollback_lock_down.sql restores open access.
--
-- Heads-up: after this runs, scripts that talk to the database with only the
-- public key (including Claude's read-only diagnostics) stop working, because
-- the public key alone no longer proves who you are.

do $$
declare
  rel record;
  pol record;
  seq record;
begin
  -- Safety net: refuse to lock everyone out.
  if not exists (select 1 from wf_user.app_owners) then
    raise exception 'wf_user.app_owners is empty. Insert your auth user id first (see 20261023_add_app_owners.sql); locking down now would lock you out.';
  end if;

  -- Schema access: signed-in users only.
  revoke usage on schema wf_user, wf_base from anon;
  grant usage on schema wf_user, wf_base to authenticated;

  -- ---------- wf_user tables: owner read + write ----------
  for rel in
    select c.relname
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'wf_user' and c.relkind in ('r', 'p') and c.relname <> 'app_owners'
  loop
    execute format('alter table wf_user.%I enable row level security', rel.relname);

    for pol in select policyname from pg_policies where schemaname = 'wf_user' and tablename = rel.relname loop
      execute format('drop policy %I on wf_user.%I', pol.policyname, rel.relname);
    end loop;

    execute format('revoke all on wf_user.%I from anon, public', rel.relname);
    execute format('grant select, insert, update, delete on wf_user.%I to authenticated', rel.relname);
    execute format(
      'create policy "owner only" on wf_user.%I for all to authenticated using (wf_user.is_owner()) with check (wf_user.is_owner())',
      rel.relname
    );
  end loop;

  -- ---------- wf_base tables: owner read only ----------
  for rel in
    select c.relname
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'wf_base' and c.relkind in ('r', 'p')
  loop
    execute format('alter table wf_base.%I enable row level security', rel.relname);

    for pol in select policyname from pg_policies where schemaname = 'wf_base' and tablename = rel.relname loop
      execute format('drop policy %I on wf_base.%I', pol.policyname, rel.relname);
    end loop;

    execute format('revoke all on wf_base.%I from anon, authenticated, public', rel.relname);
    execute format('grant select on wf_base.%I to authenticated', rel.relname);
    execute format(
      'create policy "owner read" on wf_base.%I for select to authenticated using (wf_user.is_owner())',
      rel.relname
    );
  end loop;

  -- ---------- views (both schemas): signed-in only, evaluated as the caller ----------
  -- security_invoker makes a view obey the caller's row-level security on the
  -- tables underneath it, so a view can never be a back door around the policies.
  for rel in
    select n.nspname as schema_name, c.relname, c.relkind
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('wf_user', 'wf_base') and c.relkind in ('v', 'm')
  loop
    if rel.relkind = 'v' then
      execute format('alter view %I.%I set (security_invoker = true)', rel.schema_name, rel.relname);
    end if;
    execute format('revoke all on %I.%I from anon, public', rel.schema_name, rel.relname);
    execute format('grant select on %I.%I to authenticated', rel.schema_name, rel.relname);
  end loop;

  -- ---------- sequences: needed for serial-id inserts from the app ----------
  for seq in
    select n.nspname as schema_name, c.relname
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('wf_user', 'wf_base') and c.relkind = 'S'
  loop
    execute format('revoke all on sequence %I.%I from anon, public', seq.schema_name, seq.relname);
    if seq.schema_name = 'wf_user' then
      execute format('grant usage, select on sequence %I.%I to authenticated', seq.schema_name, seq.relname);
    end if;
  end loop;
end
$$;
