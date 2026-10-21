-- Read-only live catalog audit for the Arcane static-data migration.
-- Run this in the Supabase SQL Editor before
-- DB/Migrations/20260831_add_static_data_pipeline.sql.
-- Every statement is SELECT-only.

-- 1. Existing canonical and ownership counts. These were 161 and 123 through
-- PostgREST on 2026-08-31, but drift is reported rather than treated as an error.
select 'wf_base.arcanes' as relation, count(*) as row_count
from wf_base.arcanes
union all
select 'wf_user.my_arcanes', count(*)
from wf_user.my_arcanes;

-- 2. Exact live column types, nullability, defaults, and identity behavior.
select
  n.nspname as schema_name,
  c.relname as relation_name,
  a.attnum as ordinal_position,
  a.attname as column_name,
  pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type,
  a.attnotnull as not_null,
  pg_catalog.pg_get_expr(d.adbin, d.adrelid) as column_default,
  a.attidentity as identity_kind
from pg_catalog.pg_attribute a
join pg_catalog.pg_class c on c.oid = a.attrelid
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
left join pg_catalog.pg_attrdef d
  on d.adrelid = a.attrelid
 and d.adnum = a.attnum
where (n.nspname, c.relname) in (
  ('wf_base', 'arcanes'),
  ('wf_user', 'my_arcanes')
)
  and a.attnum > 0
  and not a.attisdropped
order by n.nspname, c.relname, a.attnum;

-- 3. Primary keys, unique constraints, checks, and all foreign-key actions.
select
  n.nspname as schema_name,
  c.relname as relation_name,
  con.conname as constraint_name,
  case con.contype
    when 'p' then 'PRIMARY KEY'
    when 'u' then 'UNIQUE'
    when 'f' then 'FOREIGN KEY'
    when 'c' then 'CHECK'
    else con.contype::text
  end as constraint_type,
  pg_catalog.pg_get_constraintdef(con.oid, true) as definition
from pg_catalog.pg_constraint con
join pg_catalog.pg_class c on c.oid = con.conrelid
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where (n.nspname, c.relname) in (
  ('wf_base', 'arcanes'),
  ('wf_user', 'my_arcanes')
)
order by n.nspname, c.relname, constraint_type, con.conname;

-- 4. The three production view definitions and their security options.
select
  n.nspname as schema_name,
  c.relname as view_name,
  c.reloptions as view_options,
  pg_catalog.pg_get_viewdef(c.oid, true) as view_definition
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'wf_user'
  and c.relkind = 'v'
  and c.relname in (
    'arcane_collection_summary',
    'arcane_collection_by_type',
    'arcane_collection_detail'
  )
order by c.relname;

-- 5. RLS flags and exact policy definitions for the current Arcane objects.
select
  n.nspname as schema_name,
  c.relname as relation_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where (n.nspname, c.relname) in (
  ('wf_base', 'arcanes'),
  ('wf_user', 'my_arcanes')
)
order by n.nspname, c.relname;

select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_catalog.pg_policies
where (schemaname, tablename) in (
  ('wf_base', 'arcanes'),
  ('wf_user', 'my_arcanes')
)
order by schemaname, tablename, policyname;

-- 6. Effective grants used by the browser client and service ingestion role.
select
  grantee,
  table_schema,
  table_name,
  string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where (table_schema, table_name) in (
  ('wf_base', 'arcanes'),
  ('wf_user', 'my_arcanes'),
  ('wf_user', 'arcane_collection_summary'),
  ('wf_user', 'arcane_collection_by_type'),
  ('wf_user', 'arcane_collection_detail')
)
  and grantee in ('anon', 'authenticated', 'service_role')
group by grantee, table_schema, table_name
order by table_schema, table_name, grantee;

-- 7. Ownership-orphan check. Zero is expected whether the relationship is
-- enforced by a foreign key or only maintained by application behavior.
select count(*) as orphaned_my_arcanes
from wf_user.my_arcanes ma
left join wf_base.arcanes a on a.arcane_id = ma.arcane_id
where a.arcane_id is null;

