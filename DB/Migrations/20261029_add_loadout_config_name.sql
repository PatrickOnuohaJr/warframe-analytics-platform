-- Optional name for a loadout config ("Fire rate", "Duplex Bond"), so a build
-- can be recognised and copied by what it is instead of "Config B".
-- Lives on loadout_meta, which is already one row per (build, piece, config).
-- Run after 20261029_add_loadout_config_slot.sql. Safe to re-run.

alter table wf_user.loadout_meta add column if not exists config_name text;
alter table wf_user.loadout_meta drop constraint if exists loadout_meta_config_name_len;
alter table wf_user.loadout_meta
  add constraint loadout_meta_config_name_len check (config_name is null or char_length(config_name) <= 40);
