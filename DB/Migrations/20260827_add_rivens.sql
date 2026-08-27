-- Riven mod support (scoped end of Session 012, built Session 013). Unlike
-- every other mod, a Riven has no WFCD catalog row -- it's a physical,
-- player-rolled item: bound to one weapon, a player-chosen polarity, up to
-- 4 hand-typed stat lines, and its own independent rank. Rank lives
-- directly on this table rather than a separate inventory-join table (the
-- wf_base.mods/wf_user.mod_inventory split) since a Riven is already a
-- unique owned item, not a shared catalog entry.
--
-- No base_drain/max_rank columns -- confirmed with Patrick that every real
-- Riven drains 10 at rank 0, +1/rank to 18 at rank 8, same curve
-- drainAtRank() in utils/modCapacity.js already applies to every other
-- mod, so those are just constants in code (RIVEN_BASE_DRAIN/RIVEN_MAX_RANK).
create table if not exists wf_user.rivens (
  riven_id serial primary key,
  weapon_name text not null,   -- free-text, same convention as my_frames.primary_weapon/etc
  riven_name text,             -- optional player label, purely cosmetic
  polarity text,
  owned_rank integer not null default 0,
  stat_1 text,
  stat_2 text,
  stat_3 text,
  stat_4 text,
  created_at timestamptz not null default now()
);

-- riven_id uses on delete set null (unlike mod_id's implicit no-action)
-- since Rivens are user-deletable -- deleting one should just empty
-- whatever slot held it, not block the delete. The check constraint keeps
-- a slot holding one or the other, never both.
alter table wf_user.loadout_slots
  add column if not exists riven_id integer references wf_user.rivens(riven_id) on delete set null;

alter table wf_user.loadout_slots
  add constraint loadout_slots_mod_or_riven_check check (mod_id is null or riven_id is null);

alter table wf_user.rivens enable row level security;
create policy "Allow all access to rivens" on wf_user.rivens for all using (true) with check (true);
grant select, insert, update, delete on wf_user.rivens to anon, authenticated;
grant usage, select on sequence wf_user.rivens_riven_id_seq to anon, authenticated;
