-- Moa and Hound companions. WFCD has no record of them (they are built from
-- parts in game), so they are added by hand rather than by seed_companions.py.
-- Class values 'moa' / 'hound' drive mod compatibility in the app
-- (utils/companionCopy.js): both take ROBOTIC and Sentinel mods plus their own
-- 'Moa' / 'Hound' exclusive precepts. Moa models and Hound models are the
-- in-game model names; the free-text companion field accepts any of them.
-- Hounds carry their own weapon (Lacerten / Batoten / Akaten, already in
-- wf_base.companion_weapons); Moas use shared Robotic weapons.
-- Run in the Supabase SQL editor. Safe to re-run.

insert into wf_base.companions (name, companion_class) values
  ('Para Moa', 'moa'),
  ('Lambeo Moa', 'moa'),
  ('Oloro Moa', 'moa'),
  ('Nychus Moa', 'moa'),
  ('Bhaira Hound', 'hound'),
  ('Dorma Hound', 'hound'),
  ('Hec Hound', 'hound')
on conflict (name) do nothing;

-- Check: should list the seven rows.
--   select name, companion_class from wf_base.companions where companion_class in ('moa', 'hound');
