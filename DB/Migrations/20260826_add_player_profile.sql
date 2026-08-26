-- Single-row player profile. Needed for the loadout builder's capacity
-- math: Warframe grants +1 mod capacity per Mastery Rank (up to +30),
-- and that number isn't derivable from anything already in this schema.
-- Same RLS/grants pattern as the mods migration fix -- applied directly
-- this time instead of needing a follow-up.
create table if not exists wf_user.player_profile (
  profile_id serial primary key,
  mastery_rank integer not null default 0
);

insert into wf_user.player_profile (profile_id, mastery_rank)
values (1, 0)
on conflict (profile_id) do nothing;

alter table wf_user.player_profile enable row level security;

drop policy if exists "Allow all access to player_profile" on wf_user.player_profile;
create policy "Allow all access to player_profile" on wf_user.player_profile for all using (true) with check (true);

grant select, insert, update, delete on wf_user.player_profile to anon, authenticated, service_role;
grant usage, select on sequence wf_user.player_profile_profile_id_seq to anon, authenticated, service_role;
