-- ROLLBACK for 20261023_lock_down_to_owner.sql: puts Cephalon Gu back to the
-- old open-access state so the app works again even if login is misconfigured.
--
-- It restores what the app needs, not every historical grant:
--   wf_user -> anon + signed-in users can read and write (the old behavior)
--   wf_base -> anon + signed-in users can read (the app never wrote to it)
-- Run this only as an emergency exit; it re-opens the database to anyone with
-- the public key. Re-run the lockdown once login works.

do $$
declare
  rel record;
  pol record;
  seq record;
begin
  grant usage on schema wf_user, wf_base to anon, authenticated;

  for rel in
    select n.nspname as schema_name, c.relname
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('wf_user', 'wf_base') and c.relkind in ('r', 'p') and c.relname <> 'app_owners'
  loop
    for pol in select policyname from pg_policies where schemaname = rel.schema_name and tablename = rel.relname loop
      execute format('drop policy %I on %I.%I', pol.policyname, rel.schema_name, rel.relname);
    end loop;

    if rel.schema_name = 'wf_user' then
      execute format('grant select, insert, update, delete on %I.%I to anon, authenticated', rel.schema_name, rel.relname);
      execute format('create policy "open (rollback)" on %I.%I for all using (true) with check (true)', rel.schema_name, rel.relname);
    else
      execute format('grant select on %I.%I to anon, authenticated', rel.schema_name, rel.relname);
      execute format('create policy "open read (rollback)" on %I.%I for select using (true)', rel.schema_name, rel.relname);
    end if;
  end loop;

  for rel in
    select n.nspname as schema_name, c.relname
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('wf_user', 'wf_base') and c.relkind in ('v', 'm')
  loop
    execute format('grant select on %I.%I to anon, authenticated', rel.schema_name, rel.relname);
  end loop;

  for seq in
    select n.nspname as schema_name, c.relname
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'wf_user' and c.relkind = 'S'
  loop
    execute format('grant usage, select on sequence %I.%I to anon, authenticated', seq.schema_name, seq.relname);
  end loop;
end
$$;
