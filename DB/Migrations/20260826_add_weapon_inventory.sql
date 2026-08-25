-- D.1 Armory foundation: real weapon-ownership tracking, separate from
-- what's currently equipped on a build. A row existing = you own that
-- weapon. No quantity/copies concept, unlike archon shards -- Warframe
-- weapons aren't stackable, you either have the blueprint built or you don't.
create table if not exists wf_user.weapon_inventory (
  inventory_id serial primary key,
  weapon_id integer not null references wf_base.weapons(weapon_id),
  acquired_at timestamptz not null default now(),
  unique (weapon_id)
);

alter table wf_user.weapon_inventory enable row level security;

create policy "Allow all access to weapon_inventory"
  on wf_user.weapon_inventory
  for all
  using (true)
  with check (true);

grant select, insert, update, delete on wf_user.weapon_inventory to anon, authenticated;
grant usage, select on sequence wf_user.weapon_inventory_inventory_id_seq to anon, authenticated;
