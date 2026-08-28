-- Companion tracking foundation (scoped end of Session 013, built Session
-- 014). Two catalog tables, mirroring wf_base.weapons' pattern of one
-- table + a discriminator column rather than splitting by sub-type:
--
--   wf_base.companions        -- Sentinels + beasts (Kubrow/Kavat/
--                                 Predasite/Vulpaphyla/Helminth Charger)
--   wf_base.companion_weapons -- Sentinel Weapons + beast Claws
--
-- companion_class/weapon_class are seed-time discriminators for UI
-- grouping. Companion-mod compatibility filtering (Companion category on
-- wf_base.mods, added below) matches against the real WFCD compatName
-- value instead -- universal buckets (ROBOTIC, BEAST, Claws, Sentinel) or
-- a named exclusive (Carrier, Smeeta Kavat) -- so it doesn't depend on
-- these class columns.
create table if not exists wf_base.companions (
  companion_id serial primary key,
  name text not null unique,
  companion_class text not null,   -- sentinel | kubrow | kavat | predasite | vulpaphyla | helminth_charger
  raw_json jsonb
);

create table if not exists wf_base.companion_weapons (
  companion_weapon_id serial primary key,
  name text not null unique,
  weapon_class text not null,   -- sentinel_weapon | claws
  raw_json jsonb
);

-- Companion identity per build, same free-text convention as
-- my_frames.primary_weapon/secondary_weapon/melee_weapon -- what's
-- currently equipped on this build, not an ownership record.
alter table wf_user.my_frames add column if not exists companion text;
alter table wf_user.my_frames add column if not exists companion_weapon text;

-- Companion mods reuse wf_base.mods/wf_user.mod_inventory with a new
-- 'Companion' category value (no schema change needed for that -- category
-- is unconstrained text). compat_name carries the real WFCD compatName
-- field for the ROBOTIC/BEAST/Claws/Sentinel/named-exclusive filtering
-- described above. Precept (companion) and Posture (companion weapon)
-- mods are flagged with the existing is_aura boolean -- confirmed
-- mechanically identical to a Warframe's Aura slot (dedicated slot, adds
-- capacity instead of consuming it), so effectiveDrain()'s isAuraSlot
-- generalization in utils/modCapacity.js needs zero changes, just new
-- slot_position values ('precept', 'posture') wired up in the frontend.
alter table wf_base.mods add column if not exists compat_name text;

-- No DDL needed on wf_user.loadout_slots/loadout_meta: equipment_type and
-- slot_position are already unconstrained text (see
-- 20260826_add_mods_schema.sql), so the Companion tab reuses them as-is
-- with equipment_type = 'companion' | 'companion_weapon' and
-- slot_position = '1'..'8' plus 'precept' / 'posture'.

alter table wf_base.companions enable row level security;
alter table wf_base.companion_weapons enable row level security;

create policy "Allow all access to companions" on wf_base.companions for all using (true) with check (true);
create policy "Allow all access to companion_weapons" on wf_base.companion_weapons for all using (true) with check (true);

grant select, insert, update, delete on wf_base.companions to anon, authenticated;
grant select, insert, update, delete on wf_base.companion_weapons to anon, authenticated;

grant usage, select on sequence wf_base.companions_companion_id_seq to anon, authenticated;
grant usage, select on sequence wf_base.companion_weapons_companion_weapon_id_seq to anon, authenticated;
