-- Fix ability rank values stored at rank 0, and add Helminth (subsumed) variants.
--
-- Part 1: seed_ability_data.py stored rank 0 instead of the maxed rank 3 value
-- whenever a wiki field was a bare rank list (e.g. Eclipse duration
-- '10 / 15 / 20 / 25 s' was stored as 10, should be 25). 159 base rows.
-- Gloom's range ('1 - 5 / ... 4 - 16 m') is a min-max range and is left alone.
-- Part 2: context='subsumed' rows for the numbers the wiki's Helminth prose changes.
-- Safe to re-run: part 1 sets absolute values; part 2 upserts.

begin;

-- Part 1
update wf_base.ability_parameters set base_value = 25 -- was 10
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Eclipse');
update wf_base.ability_parameters set base_value = 40 -- was 25
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Ravenous');
update wf_base.ability_parameters set base_value = 15 -- was 10
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Blazing Chakram');
update wf_base.ability_parameters set base_value = 2 -- was 1.25
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Warding Halo');
update wf_base.ability_parameters set base_value = 15 -- was 10
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Desiccation');
update wf_base.ability_parameters set base_value = 8 -- was 3
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Desiccation');
update wf_base.ability_parameters set base_value = 1250 -- was 500
  where context = 'base' and parameter_key = 'strength'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Dark Verse');
update wf_base.ability_parameters set base_value = 20 -- was 15
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Dark Verse');
update wf_base.ability_parameters set base_value = 400 -- was 250
  where context = 'base' and parameter_key = 'strength'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Neote');
update wf_base.ability_parameters set base_value = 12 -- was 9
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Neote');
update wf_base.ability_parameters set base_value = 12 -- was 9
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Speed');
update wf_base.ability_parameters set base_value = 25 -- was 10
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Electric Shield');
update wf_base.ability_parameters set base_value = 20 -- was 10
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Blood Altar');
update wf_base.ability_parameters set base_value = 16 -- was 10
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Virulence');
update wf_base.ability_parameters set base_value = 7 -- was 4
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Larva');
update wf_base.ability_parameters set base_value = 60 -- was 30
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Parasitic Link');
update wf_base.ability_parameters set base_value = 50 -- was 10
  where context = 'base' and parameter_key = 'strength'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Roar');
update wf_base.ability_parameters set base_value = 25 -- was 15
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Roar');
update wf_base.ability_parameters set base_value = 25 -- was 15
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Rhino Stomp');
update wf_base.ability_parameters set base_value = 8 -- was 3
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Rhino Stomp');
update wf_base.ability_parameters set base_value = 25 -- was 10
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Elemental Ward');
update wf_base.ability_parameters set base_value = 18 -- was 8
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Vex Armor');
update wf_base.ability_parameters set base_value = 25 -- was 10
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Vex Armor');
update wf_base.ability_parameters set base_value = 25 -- was 8
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Radial Blind');
update wf_base.ability_parameters set base_value = 15 -- was 7
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Radial Blind');
update wf_base.ability_parameters set base_value = 25 -- was 15
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Radial Javelin');
update wf_base.ability_parameters set base_value = 20 -- was 10
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Hallowed Ground');
update wf_base.ability_parameters set base_value = 25 -- was 10
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Hall of Mirrors');
update wf_base.ability_parameters set base_value = 20 -- was 10
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Warcry');
update wf_base.ability_parameters set base_value = 10 -- was 5
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Paralysis');
update wf_base.ability_parameters set base_value = 6 -- was 3
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Pyrotechnics');
update wf_base.ability_parameters set base_value = 10 -- was 5
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Molt');
update wf_base.ability_parameters set base_value = 45 -- was 20
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Toxic Lash');
update wf_base.ability_parameters set base_value = 20 -- was 10
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Miasma');
update wf_base.ability_parameters set base_value = 500 -- was 200
  where context = 'base' and parameter_key = 'strength'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Radial Disarm');
update wf_base.ability_parameters set base_value = 20 -- was 10
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Radial Disarm');
update wf_base.ability_parameters set base_value = 14 -- was 10
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Naraemagi');
update wf_base.ability_parameters set base_value = 60 -- was 20
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Teleport');
update wf_base.ability_parameters set base_value = 10 -- was 7
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Hakchum');
update wf_base.ability_parameters set base_value = 25 -- was 10
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Desecrate');
update wf_base.ability_parameters set base_value = 15 -- was 10
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Wyrd Scythes');
update wf_base.ability_parameters set base_value = 5 -- was 2
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Wyrd Scythes');
update wf_base.ability_parameters set base_value = 15 -- was 10
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Doom');
update wf_base.ability_parameters set base_value = 15 -- was 7
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Doom');
update wf_base.ability_parameters set base_value = 10 -- was 7
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Grave Spirit');
update wf_base.ability_parameters set base_value = 3 -- was 2
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Rakhali''s Cavalry');
update wf_base.ability_parameters set base_value = 25 -- was 7
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Decoy');
update wf_base.ability_parameters set base_value = 12 -- was 5
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Invisibility');
update wf_base.ability_parameters set base_value = 22 -- was 10
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Splinter Storm');
update wf_base.ability_parameters set base_value = 22 -- was 10
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Spectrorage');
update wf_base.ability_parameters set base_value = 20 -- was 5
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Petrify');
update wf_base.ability_parameters set base_value = 75 -- was 25
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Switch Teleport');
update wf_base.ability_parameters set base_value = 6 -- was 3
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Condemn');
update wf_base.ability_parameters set base_value = 20 -- was 13
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Thurible');
update wf_base.ability_parameters set base_value = 35 -- was 20
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Thurible');
update wf_base.ability_parameters set base_value = 150 -- was 100
  where context = 'base' and parameter_key = 'strength'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Whipclaw');
update wf_base.ability_parameters set base_value = 250 -- was 100
  where context = 'base' and parameter_key = 'strength'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Strangledome');
update wf_base.ability_parameters set base_value = 20 -- was 5
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Strangledome');
update wf_base.ability_parameters set base_value = 15 -- was 10
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Magnetize');
update wf_base.ability_parameters set base_value = 250 -- was 175
  where context = 'base' and parameter_key = 'strength'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Stinkbrain');
update wf_base.ability_parameters set base_value = 25 -- was 10
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Stinkbrain');
update wf_base.ability_parameters set base_value = 10 -- was 7
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Reroot');
update wf_base.ability_parameters set base_value = 2500 -- was 1750
  where context = 'base' and parameter_key = 'strength'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Sporespring');
update wf_base.ability_parameters set base_value = 10 -- was 4
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Tempest Barrage');
update wf_base.ability_parameters set base_value = 300 -- was 100
  where context = 'base' and parameter_key = 'strength'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Tidal Surge');
update wf_base.ability_parameters set base_value = 6 -- was 3
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Tidal Surge');
update wf_base.ability_parameters set base_value = 20 -- was 10
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Tentacle Swarm');
update wf_base.ability_parameters set base_value = 30 -- was 15
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Final Verse');
update wf_base.ability_parameters set base_value = 45 -- was 30
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Final Verse');
update wf_base.ability_parameters set base_value = 45 -- was 30
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Lethal Progeny');
update wf_base.ability_parameters set base_value = 10 -- was 7
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Arcsphere');
update wf_base.ability_parameters set base_value = 22 -- was 10
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Rotorswell');
update wf_base.ability_parameters set base_value = 25 -- was 20
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Wrathful Advance');
update wf_base.ability_parameters set base_value = 10 -- was 7
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Wrathful Advance');
update wf_base.ability_parameters set base_value = 8 -- was 5
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Recompense');
update wf_base.ability_parameters set base_value = 50 -- was 20
  where context = 'base' and parameter_key = 'strength'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Collective Curse');
update wf_base.ability_parameters set base_value = 25 -- was 20
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Collective Curse');
update wf_base.ability_parameters set base_value = 25 -- was 10
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Collective Curse');
update wf_base.ability_parameters set base_value = 2500 -- was 1000
  where context = 'base' and parameter_key = 'strength'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Storm of Ukko');
update wf_base.ability_parameters set base_value = 10 -- was 7
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Storm of Ukko');
update wf_base.ability_parameters set base_value = 15 -- was 10
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Storm of Ukko');
update wf_base.ability_parameters set base_value = 60 -- was 20
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Mind Control');
update wf_base.ability_parameters set base_value = 60 -- was 15
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Mind Control');
update wf_base.ability_parameters set base_value = 25 -- was 15
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Chaos');
update wf_base.ability_parameters set base_value = 25 -- was 10
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Chaos');
update wf_base.ability_parameters set base_value = 15 -- was 10
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Sonic Boom');
update wf_base.ability_parameters set base_value = 5 -- was 2
  where context = 'base' and parameter_key = 'strength'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Sonar');
update wf_base.ability_parameters set base_value = 35 -- was 20
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Sonar');
update wf_base.ability_parameters set base_value = 30 -- was 10
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Sonar');
update wf_base.ability_parameters set base_value = 20 -- was 10
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Silence');
update wf_base.ability_parameters set base_value = 30 -- was 10
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Silence');
update wf_base.ability_parameters set base_value = 20 -- was 12
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Sound Quake');
update wf_base.ability_parameters set base_value = 25 -- was 18
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Preserving Shell');
update wf_base.ability_parameters set base_value = 15 -- was 10
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Prismatic Gem');
update wf_base.ability_parameters set base_value = 500 -- was 250
  where context = 'base' and parameter_key = 'strength'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Crystallize');
update wf_base.ability_parameters set base_value = 8 -- was 5
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Crystallize');
update wf_base.ability_parameters set base_value = 22 -- was 10
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Sentient Wrath');
update wf_base.ability_parameters set base_value = 10 -- was 4
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Sentient Wrath');
update wf_base.ability_parameters set base_value = 25 -- was 10
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Plein Air');
update wf_base.ability_parameters set base_value = 10 -- was 4
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Light''s Judgment');
update wf_base.ability_parameters set base_value = 30 -- was 15
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Ophanim Eyes');
update wf_base.ability_parameters set base_value = 12 -- was 6
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Kumihimo');
update wf_base.ability_parameters set base_value = 1 -- was 0.5
  where context = 'base' and parameter_key = 'strength'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Omamori');
update wf_base.ability_parameters set base_value = 25 -- was 10
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Lull');
update wf_base.ability_parameters set base_value = 25 -- was 10
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Metamorphosis');
update wf_base.ability_parameters set base_value = 15 -- was 8
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Stasis');
update wf_base.ability_parameters set base_value = 6 -- was 3
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Transmutation Probe');
update wf_base.ability_parameters set base_value = 25 -- was 10
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Banish');
update wf_base.ability_parameters set base_value = 30 -- was 15
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Cataclysm');
update wf_base.ability_parameters set base_value = 10 -- was 5
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Mallet');
update wf_base.ability_parameters set base_value = 20 -- was 8
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Mallet');
update wf_base.ability_parameters set base_value = 20 -- was 8
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Resonator');
update wf_base.ability_parameters set base_value = 12 -- was 6
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Metronome');
update wf_base.ability_parameters set base_value = 10 -- was 5
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Webbed Embrace');
update wf_base.ability_parameters set base_value = 25 -- was 10
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Webbed Embrace');
update wf_base.ability_parameters set base_value = 750 -- was 300
  where context = 'base' and parameter_key = 'strength'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Widow''s Brood');
update wf_base.ability_parameters set base_value = 25 -- was 16
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Widow''s Brood');
update wf_base.ability_parameters set base_value = 25 -- was 10
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Dispensary');
update wf_base.ability_parameters set base_value = 1000 -- was 700
  where context = 'base' and parameter_key = 'strength'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Chyrinka Pillar');
update wf_base.ability_parameters set base_value = 8 -- was 5
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Chyrinka Pillar');
update wf_base.ability_parameters set base_value = 20 -- was 14
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Containment Wall');
update wf_base.ability_parameters set base_value = 8 -- was 2
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Reap');
update wf_base.ability_parameters set base_value = 16 -- was 10
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Sow');
update wf_base.ability_parameters set base_value = 10 -- was 5
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Sow');
update wf_base.ability_parameters set base_value = 16 -- was 10
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Spellbind');
update wf_base.ability_parameters set base_value = 20 -- was 12
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Link');
update wf_base.ability_parameters set base_value = 20 -- was 14
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Link');
update wf_base.ability_parameters set base_value = 6 -- was 3
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Demonium');
update wf_base.ability_parameters set base_value = 1500 -- was 1200
  where context = 'base' and parameter_key = 'strength'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Brimstone');
update wf_base.ability_parameters set base_value = 15 -- was 10
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Brimstone');
update wf_base.ability_parameters set base_value = 10 -- was 7
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Brimstone');
update wf_base.ability_parameters set base_value = 600 -- was 300
  where context = 'base' and parameter_key = 'strength'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Rip Line');
update wf_base.ability_parameters set base_value = 11 -- was 5
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Shatter Shield');
update wf_base.ability_parameters set base_value = 25 -- was 10
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Shatter Shield');
update wf_base.ability_parameters set base_value = 12 -- was 3
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Smoke Screen');
update wf_base.ability_parameters set base_value = 18 -- was 11
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Breach Surge');
update wf_base.ability_parameters set base_value = 35 -- was 20
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Xata''s Whisper');
update wf_base.ability_parameters set base_value = 11 -- was 5
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'The Lost');
update wf_base.ability_parameters set base_value = 16 -- was 4
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'The Lost');
update wf_base.ability_parameters set base_value = 25 -- was 10
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'The Vast Untime');
update wf_base.ability_parameters set base_value = 25 -- was 10
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'The Vast Untime');
update wf_base.ability_parameters set base_value = 7500 -- was 3000
  where context = 'base' and parameter_key = 'strength'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Merulina');
update wf_base.ability_parameters set base_value = 45 -- was 25
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Aquablades');
update wf_base.ability_parameters set base_value = 6 -- was 3
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Turbulence');
update wf_base.ability_parameters set base_value = 20 -- was 10
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Turbulence');
update wf_base.ability_parameters set base_value = 20 -- was 10
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Tornado');
update wf_base.ability_parameters set base_value = 26 -- was 20
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Celestial Clash');
update wf_base.ability_parameters set base_value = 19 -- was 10
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Divine Spears');
update wf_base.ability_parameters set base_value = 12 -- was 6
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Divine Spears');
update wf_base.ability_parameters set base_value = 15 -- was 5
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Terrify');
update wf_base.ability_parameters set base_value = 25 -- was 10
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Terrify');
update wf_base.ability_parameters set base_value = 750 -- was 300
  where context = 'base' and parameter_key = 'strength'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Forced Perspective');
update wf_base.ability_parameters set base_value = 5 -- was 3
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Forced Perspective');
update wf_base.ability_parameters set base_value = 500 -- was 200
  where context = 'base' and parameter_key = 'strength'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Bunraku');
update wf_base.ability_parameters set base_value = 30 -- was 15
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Bunraku');
update wf_base.ability_parameters set base_value = 20 -- was 5
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Bunraku');
update wf_base.ability_parameters set base_value = 4 -- was 2.5
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Wil-O-Wisp');
update wf_base.ability_parameters set base_value = 20 -- was 14
  where context = 'base' and parameter_key = 'range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Overdrive');
update wf_base.ability_parameters set base_value = 30 -- was 15
  where context = 'base' and parameter_key = 'duration'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Ripper''s Wail');

-- Part 2
insert into wf_base.ability_parameters (ability_catalog_id, parameter_key, label, sort_order, base_value, unit, scales_with, formula_key, context, source, source_ref, verified_note)
select ability_catalog_id, parameter_key, label, sort_order, 30, unit, scales_with, null, 'subsumed', 'manual', source_ref, 'Subsumed damage bonus is 2/9/15/30% (200% at home).'
  from wf_base.ability_parameters
  where context = 'base' and parameter_key = 'damage_bonus'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Eclipse')
on conflict (ability_catalog_id, parameter_key, context) do update
  set base_value = excluded.base_value, formula_key = excluded.formula_key, verified_note = excluded.verified_note;
insert into wf_base.ability_parameters (ability_catalog_id, parameter_key, label, sort_order, base_value, unit, scales_with, formula_key, context, source, source_ref, verified_note)
select ability_catalog_id, parameter_key, label, sort_order, 75, unit, scales_with, null, 'subsumed', 'manual', source_ref, 'Subsumed damage reduction caps at 75% (90% at home).'
  from wf_base.ability_parameters
  where context = 'base' and parameter_key = 'damage_reduction_cap'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Eclipse')
on conflict (ability_catalog_id, parameter_key, context) do update
  set base_value = excluded.base_value, formula_key = excluded.formula_key, verified_note = excluded.verified_note;
insert into wf_base.ability_parameters (ability_catalog_id, parameter_key, label, sort_order, base_value, unit, scales_with, formula_key, context, source, source_ref, verified_note)
select ability_catalog_id, parameter_key, label, sort_order, 45, unit, scales_with, null, 'subsumed', 'manual', source_ref, 'Wiki Helminth prose: Viral weapon bonus damage is +24/30/36/45% when subsumed (75% at home).'
  from wf_base.ability_parameters
  where context = 'base' and parameter_key = 'viral_damage_buff'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Nourish')
on conflict (ability_catalog_id, parameter_key, context) do update
  set base_value = excluded.base_value, formula_key = excluded.formula_key, verified_note = excluded.verified_note;
insert into wf_base.ability_parameters (ability_catalog_id, parameter_key, label, sort_order, base_value, unit, scales_with, formula_key, context, source, source_ref, verified_note)
select ability_catalog_id, parameter_key, label, sort_order, 8, unit, scales_with, null, 'subsumed', 'manual', source_ref, 'Subsumed grab radius is 5.33/6/6.67/8 m (12 m at home).'
  from wf_base.ability_parameters
  where context = 'base' and parameter_key = 'grab_radius'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Larva')
on conflict (ability_catalog_id, parameter_key, context) do update
  set base_value = excluded.base_value, formula_key = excluded.formula_key, verified_note = excluded.verified_note;
insert into wf_base.ability_parameters (ability_catalog_id, parameter_key, label, sort_order, base_value, unit, scales_with, formula_key, context, source, source_ref, verified_note)
select ability_catalog_id, parameter_key, label, sort_order, 30, unit, scales_with, null, 'subsumed', 'manual', source_ref, 'Subsumed damage bonus is 2/9/15/30% (50% at home).'
  from wf_base.ability_parameters
  where context = 'base' and parameter_key = 'strength'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Roar')
on conflict (ability_catalog_id, parameter_key, context) do update
  set base_value = excluded.base_value, formula_key = excluded.formula_key, verified_note = excluded.verified_note;
insert into wf_base.ability_parameters (ability_catalog_id, parameter_key, label, sort_order, base_value, unit, scales_with, formula_key, context, source, source_ref, verified_note)
select ability_catalog_id, parameter_key, label, sort_order, 50, unit, scales_with, null, 'subsumed', 'manual', source_ref, 'Subsumed percentage damage cap is 50% (75% at home).'
  from wf_base.ability_parameters
  where context = 'base' and parameter_key = 'percentage_damage_cap'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Smite')
on conflict (ability_catalog_id, parameter_key, context) do update
  set base_value = excluded.base_value, formula_key = excluded.formula_key, verified_note = excluded.verified_note;
insert into wf_base.ability_parameters (ability_catalog_id, parameter_key, label, sort_order, base_value, unit, scales_with, formula_key, context, source, source_ref, verified_note)
select ability_catalog_id, parameter_key, label, sort_order, 20, unit, scales_with, null, 'subsumed', 'manual', source_ref, 'Subsumed AoE percentage damage cap is 20% (30% at home).'
  from wf_base.ability_parameters
  where context = 'base' and parameter_key = 'aoe_percentage_damage_cap'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Smite')
on conflict (ability_catalog_id, parameter_key, context) do update
  set base_value = excluded.base_value, formula_key = excluded.formula_key, verified_note = excluded.verified_note;
insert into wf_base.ability_parameters (ability_catalog_id, parameter_key, label, sort_order, base_value, unit, scales_with, formula_key, context, source, source_ref, verified_note)
select ability_catalog_id, parameter_key, label, sort_order, 30, unit, scales_with, null, 'subsumed', 'manual', source_ref, 'Subsumed attack speed bonus is 9/12/15/30% (50% at home).'
  from wf_base.ability_parameters
  where context = 'base' and parameter_key = 'attack_speed_buff'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Warcry')
on conflict (ability_catalog_id, parameter_key, context) do update
  set base_value = excluded.base_value, formula_key = excluded.formula_key, verified_note = excluded.verified_note;
insert into wf_base.ability_parameters (ability_catalog_id, parameter_key, label, sort_order, base_value, unit, scales_with, formula_key, context, source, source_ref, verified_note)
select ability_catalog_id, parameter_key, label, sort_order, 750, unit, scales_with, null, 'subsumed', 'manual', source_ref, 'Subsumed armor bonus is capped at 750 (1,500 at home).'
  from wf_base.ability_parameters
  where context = 'base' and parameter_key = 'armor_bonus_cap'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Defy')
on conflict (ability_catalog_id, parameter_key, context) do update
  set base_value = excluded.base_value, formula_key = excluded.formula_key, verified_note = excluded.verified_note;
insert into wf_base.ability_parameters (ability_catalog_id, parameter_key, label, sort_order, base_value, unit, scales_with, formula_key, context, source, source_ref, verified_note)
select ability_catalog_id, parameter_key, label, sort_order, 50, unit, scales_with, null, 'subsumed', 'manual', source_ref, 'Subsumed Pillage spends 50 Energy instead of shields (0 at home).'
  from wf_base.ability_parameters
  where context = 'base' and parameter_key = 'energy_cost'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Pillage')
on conflict (ability_catalog_id, parameter_key, context) do update
  set base_value = excluded.base_value, formula_key = excluded.formula_key, verified_note = excluded.verified_note;
insert into wf_base.ability_parameters (ability_catalog_id, parameter_key, label, sort_order, base_value, unit, scales_with, formula_key, context, source, source_ref, verified_note)
select ability_catalog_id, parameter_key, label, sort_order, 12.5, unit, scales_with, null, 'subsumed', 'manual', source_ref, 'Subsumed pull range is 7.5/10/11/12.5 m (25 m at home).'
  from wf_base.ability_parameters
  where context = 'base' and parameter_key = 'target_range'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Pull')
on conflict (ability_catalog_id, parameter_key, context) do update
  set base_value = excluded.base_value, formula_key = excluded.formula_key, verified_note = excluded.verified_note;
insert into wf_base.ability_parameters (ability_catalog_id, parameter_key, label, sort_order, base_value, unit, scales_with, formula_key, context, source, source_ref, verified_note)
select ability_catalog_id, parameter_key, label, sort_order, 75, unit, scales_with, null, 'subsumed', 'manual', source_ref, 'Subsumed maximum damage reduction caps at 75% (90% at home).'
  from wf_base.ability_parameters
  where context = 'base' and parameter_key = 'maximum_damage_reduction_cap'
    and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Self Portrait')
on conflict (ability_catalog_id, parameter_key, context) do update
  set base_value = excluded.base_value, formula_key = excluded.formula_key, verified_note = excluded.verified_note;

commit;
