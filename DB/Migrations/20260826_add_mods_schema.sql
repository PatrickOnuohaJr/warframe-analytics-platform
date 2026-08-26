-- Mods Inventory & DB foundation (locked queue item, scoped Session 010).
-- Scope: Warframe + Primary/Secondary/Melee mods only, matching every
-- other scope boundary already in this app (no Companion/Archwing/
-- Necramech/Railjack). Loadout tracking is informational, not
-- validating -- capacity/drain math gets computed and shown, nothing
-- blocks an over-budget loadout from being entered, since the goal is
-- reflecting what you actually have in-game, not gatekeeping it.
create table if not exists wf_base.mods (
  mod_id serial primary key,
  name text not null unique,
  category text not null,       -- Warframe | Primary | Secondary | Melee
  polarity text,                 -- madurai | vazarin | naramon | zenurik | unairu | null
  base_drain integer,
  max_rank integer,
  rarity text,
  is_aura boolean not null default false,
  is_exilus boolean not null default false,
  raw_json jsonb
);

-- Mods rank up (fuse duplicates into a single card), unlike weapon
-- ownership which is binary -- owned_rank mirrors how arcanes track rank.
create table if not exists wf_user.mod_inventory (
  inventory_id serial primary key,
  mod_id integer not null references wf_base.mods(mod_id),
  owned_rank integer not null default 0,
  unique (mod_id)
);

-- A build is really 4 separate loadouts (the warframe + 3 weapons), each
-- with its own slots. slot_position covers '1'..'8' plus the two special
-- slots ('aura', 'exilus') that don't consume normal capacity.
create table if not exists wf_user.loadout_slots (
  slot_id serial primary key,
  my_frame_id integer not null references wf_user.my_frames(my_frame_id) on delete cascade,
  equipment_type text not null,   -- warframe | primary | secondary | melee
  slot_position text not null,
  polarity text,                  -- current slot polarity, changes via forma
  mod_id integer references wf_base.mods(mod_id),
  unique (my_frame_id, equipment_type, slot_position)
);

-- Forma count + catalyst/reactor per equipment piece per build.
create table if not exists wf_user.loadout_meta (
  meta_id serial primary key,
  my_frame_id integer not null references wf_user.my_frames(my_frame_id) on delete cascade,
  equipment_type text not null,
  forma_count integer not null default 0,
  has_catalyst boolean not null default false,
  unique (my_frame_id, equipment_type)
);

alter table wf_base.mods enable row level security;
alter table wf_user.mod_inventory enable row level security;
alter table wf_user.loadout_slots enable row level security;
alter table wf_user.loadout_meta enable row level security;

create policy "Allow all access to mods" on wf_base.mods for all using (true) with check (true);
create policy "Allow all access to mod_inventory" on wf_user.mod_inventory for all using (true) with check (true);
create policy "Allow all access to loadout_slots" on wf_user.loadout_slots for all using (true) with check (true);
create policy "Allow all access to loadout_meta" on wf_user.loadout_meta for all using (true) with check (true);

grant select, insert, update, delete on wf_base.mods to anon, authenticated;
grant select, insert, update, delete on wf_user.mod_inventory to anon, authenticated;
grant select, insert, update, delete on wf_user.loadout_slots to anon, authenticated;
grant select, insert, update, delete on wf_user.loadout_meta to anon, authenticated;

grant usage, select on sequence wf_base.mods_mod_id_seq to anon, authenticated;
grant usage, select on sequence wf_user.mod_inventory_inventory_id_seq to anon, authenticated;
grant usage, select on sequence wf_user.loadout_slots_slot_id_seq to anon, authenticated;
grant usage, select on sequence wf_user.loadout_meta_meta_id_seq to anon, authenticated;
