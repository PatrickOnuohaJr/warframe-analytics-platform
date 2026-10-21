-- Read-only. Run in the Supabase SQL editor with administrator access.
-- This inspects access definitions; it does not alter permissions or data.
select n.nspname as schema_name, c.relname as object_name,
       c.relkind, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('wf_user', 'wf_base') and c.relkind in ('r', 'p', 'v', 'm')
order by 1, 2;

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies where schemaname in ('wf_user', 'wf_base')
order by schemaname, tablename, policyname;

select table_schema, table_name, grantee, privilege_type
from information_schema.table_privileges
where table_schema in ('wf_user', 'wf_base')
  and grantee in ('anon', 'authenticated', 'PUBLIC')
order by 1, 2, 3, 4;

select table_schema, table_name, column_name, data_type
from information_schema.columns
where table_schema = 'wf_user'
  and (column_name in ('user_id', 'owner_id', 'account_id') or column_name like '%user%')
order by 1, 2, ordinal_position;

select n.nspname as schema_name, c.relname as view_name, c.reloptions,
       pg_get_viewdef(c.oid, true) as definition
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('wf_user', 'wf_base') and c.relkind = 'v'
order by 1, 2;
