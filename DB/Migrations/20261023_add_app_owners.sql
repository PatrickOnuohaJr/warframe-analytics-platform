-- Step 1 of owner-only login. Safe to run at any time: it only ADDS things and
-- does not change anyone's access (that is 20261023_lock_down_to_owner.sql).
--
-- wf_user.app_owners lists which Supabase Auth accounts may use Cephalon Gu.
-- It is filled by hand (below), never through the app, and the owner's id is
-- deliberately NOT committed to this repo.
--
-- HOW TO ADD YOURSELF (after your first Google sign-in):
--   1. Supabase dashboard > Authentication > Users > copy your "User UID".
--   2. SQL editor:
--        insert into wf_user.app_owners (user_id) values ('PASTE-YOUR-UID-HERE');
--
-- Do this BEFORE running 20261023_lock_down_to_owner.sql, or the lockdown
-- will lock everyone out (rollback: 20261023_rollback_lock_down.sql).

create table if not exists wf_user.app_owners (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table wf_user.app_owners enable row level security;

-- A signed-in user may see only their own row -- that is how the app learns
-- whether the current account is an owner. No insert/update/delete policy
-- exists, so the app (and anyone holding the public key) can never grant
-- themselves ownership; only the SQL editor / service role can.
drop policy if exists "read own owner row" on wf_user.app_owners;
create policy "read own owner row" on wf_user.app_owners
  for select to authenticated
  using (user_id = auth.uid());

revoke all on wf_user.app_owners from anon;
grant select on wf_user.app_owners to authenticated;

-- True when the calling account is listed in app_owners. SECURITY DEFINER so
-- the policies on every other table can call it without needing direct read
-- access to app_owners; search_path is pinned so it cannot be hijacked.
create or replace function wf_user.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from wf_user.app_owners where user_id = auth.uid()
  );
$$;

revoke all on function wf_user.is_owner() from public, anon;
grant execute on function wf_user.is_owner() to authenticated;
