-- ============================================================
-- wf_base.arcanes  —  Full Arcane Seed Script
-- Covers: Warframe, Primary, Secondary, Melee, Zaw (Exodia),
--         Kitgun (Pax), Amp (Virtuos / Eternal), Operator,
--         Tektolyst (Update 41 / The Old Peace)
-- Last updated: Update 41.0 (2025-12-10)
-- ============================================================

USE warframe_jarvis;  -- swap to your DB name
GO

-- Drop and recreate for clean seed
IF OBJECT_ID('wf_base.arcanes', 'U') IS NOT NULL
    DROP TABLE wf_base.arcanes;

CREATE TABLE wf_base.arcanes (
    arcane_id       INT IDENTITY(1,1) PRIMARY KEY,
    arcane_name     NVARCHAR(100)   NOT NULL,
    category        NVARCHAR(50)    NOT NULL,   -- Warframe / Primary / Secondary / Melee / Zaw / Kitgun / Amp / Operator / Tektolyst
    subcategory     NVARCHAR(50)    NULL,        -- e.g. Eidolon, Zariman, Netracell, Cascadia, Conjunction, Virtuos, Eternal, Akimbo
    rarity          NVARCHAR(20)    NOT NULL,   -- Common / Uncommon / Rare / Legendary
    max_rank        TINYINT         NOT NULL,   -- 3 or 5
    trigger         NVARCHAR(200)   NULL,
    effect_r5       NVARCHAR(500)   NULL,
    source          NVARCHAR(200)   NULL,
    wfm_slug        NVARCHAR(100)   NULL,       -- Warframe Market URL slug
    is_tradeable    BIT             NOT NULL DEFAULT 1,
    added_update    NVARCHAR(20)    NULL
);
GO

-- ============================================================
-- WARFRAME ARCANES  (equip on Warframe, 2 slots)
-- ============================================================
INSERT INTO wf_base.arcanes
    (arcane_name, category, subcategory, rarity, max_rank, trigger, effect_r5, source, wfm_slug, added_update)
VALUES
-- === Eidolon (Plains of Eidolon — Teralyst / Gantulyst / Hydrolyst) ===
('Arcane Acceleration',   'Warframe', 'Eidolon', 'Rare',      5, 'Headshot',           '+60% Fire Rate for Primary Rifles for 9s',                                  'Eidolon capture',         'arcane_acceleration',   '22.14'),
('Arcane Aegis',          'Warframe', 'Eidolon', 'Legendary', 5, 'Shield damage',      '90% chance on Shield damage: Restore all Shields, then regen at 20/s for 4s','Eidolon capture',         'arcane_aegis',          '22.14'),
('Arcane Agility',        'Warframe', 'Eidolon', 'Common',    3, 'Bullet jump',        '+30% Parkour Velocity for 12s',                                             'Eidolon kill/capture',    'arcane_agility',        '22.14'),
('Arcane Avenger',        'Warframe', 'Eidolon', 'Rare',      5, 'Damage taken',       '+45% Critical Chance (additive) for 12s',                                   'Eidolon capture',         'arcane_avenger',        '22.14'),
('Arcane Barrier',        'Warframe', 'Eidolon', 'Legendary', 5, 'Shield depleted',    '60% chance: Instantly restore all Shields',                                  'Eidolon capture',         'arcane_barrier',        '22.14'),
('Arcane Blade Charger',  'Warframe', 'Eidolon', 'Uncommon',  5, 'Melee kill',         '+100% Melee Damage for 24s',                                                'Eidolon kill/capture',    'arcane_blade_charger',  '25.7.6'),
('Arcane Blessing',       'Warframe', 'Eidolon', 'Rare',      5, 'Health Orb pickup',  '+900 Max Health for 30s (stackable)',                                       'Eidolon capture',         'arcane_blessing',       '22.14'),
('Arcane Bodyguard',      'Warframe', 'Eidolon', 'Common',    3, 'Companion kill',     'Companion gains 750 HP regen/s for 10s',                                    'Eidolon kill/capture',    'arcane_bodyguard',      '25.7.6'),
('Arcane Consequence',    'Warframe', 'Eidolon', 'Uncommon',  5, 'Headshot',           '+60% Parkour Velocity for 6s',                                              'Eidolon kill/capture',    'arcane_consequence',    '22.14'),
('Arcane Deflection',     'Warframe', 'Eidolon', 'Common',    3, 'Shield damage',      '+60% chance to negate a Slash Status on Shields',                           'Eidolon kill/capture',    'arcane_deflection',     '22.14'),
('Arcane Energize',       'Warframe', 'Eidolon', 'Legendary', 5, 'Energy Orb pickup',  '60% chance: +150 Energy to self & allies in range',                         'Eidolon capture',         'arcane_energize',       '22.14'),
('Arcane Eruption',       'Warframe', 'Eidolon', 'Uncommon',  5, 'Energy Orb pickup',  '60% chance: Knock down enemies within 15m',                                 'Eidolon kill/capture',    'arcane_eruption',       '22.14'),
('Arcane Fury',           'Warframe', 'Eidolon', 'Rare',      5, 'Melee Crit hit',     '+120% Melee Damage for 12s',                                                'Eidolon capture',         'arcane_fury',           '22.14'),
('Arcane Grace',          'Warframe', 'Eidolon', 'Legendary', 5, 'Health damage',      '60% chance: +6% HP regen/s for 9s',                                         'Eidolon capture',         'arcane_grace',          '22.14'),
('Arcane Guardian',       'Warframe', 'Eidolon', 'Rare',      5, 'Health damage',      '+900 Armor for 20s',                                                        'Eidolon capture',         'arcane_guardian',       '22.14'),
('Arcane Healing',        'Warframe', 'Eidolon', 'Common',    3, 'Health Orb pickup',  '+60% HP regen from Health Orbs for 10s',                                    'Eidolon kill/capture',    'arcane_healing',        '22.14'),
('Arcane Intention',      'Warframe', 'Eidolon', 'Uncommon',  5, 'Aim glide',          '+60% Crit Chance while aim-gliding',                                        'Eidolon kill/capture',    'arcane_intention',      '22.14'),
('Arcane Momentum',       'Warframe', 'Eidolon', 'Rare',      5, 'Sniper Crit hit',    '+90% Reload Speed for Sniper Rifles for 12s',                               'Eidolon capture',         'arcane_momentum',       '22.14'),
('Arcane Nullifier',      'Warframe', 'Eidolon', 'Uncommon',  5, 'Magnetic proc',      '60% chance to negate a Magnetic Status proc',                               'Eidolon kill/capture',    'arcane_nullifier',      '22.14'),
('Arcane Phantasm',       'Warframe', 'Eidolon', 'Uncommon',  5, 'Slide',              '+60% Sprint Speed for 4s',                                                  'Eidolon kill/capture',    'arcane_phantasm',       '22.14'),
('Arcane Pistoleer',      'Warframe', 'Eidolon', 'Uncommon',  5, 'Secondary headshot', 'Infinite Secondary Ammo for 12s',                                           'Eidolon kill/capture',    'arcane_pistoleer',      '25.7.6'),
('Arcane Precision',      'Warframe', 'Eidolon', 'Rare',      5, 'Secondary headshot', '+300% Secondary Damage for 12s',                                            'Eidolon capture',         'arcane_precision',      '22.14'),
('Arcane Primary Charger','Warframe', 'Eidolon', 'Uncommon',  5, 'Primary kill',       '+100% Primary Damage for 24s',                                              'Eidolon kill/capture',    'arcane_primary_charger','25.7.6'),
('Arcane Pulse',          'Warframe', 'Eidolon', 'Common',    3, 'Health Orb pickup',  'Restore 150 HP to allies within 25m',                                       'Eidolon kill/capture',    'arcane_pulse',          '22.14'),
('Arcane Rage',           'Warframe', 'Eidolon', 'Rare',      5, 'Primary headshot',   '+120% Primary Damage for 12s',                                              'Eidolon capture',         'arcane_rage',           '22.14'),
('Arcane Resistance',     'Warframe', 'Eidolon', 'Common',    3, 'Poison proc',        '60% chance to negate a Poison Status proc',                                 'Eidolon kill/capture',    'arcane_resistance',     '22.14'),
('Arcane Rise',           'Warframe', 'Eidolon', 'Uncommon',  5, 'Pet/Companion kill', '+75% Primary Damage for 12s',                                               'Eidolon kill/capture',    'arcane_rise',           '22.14'),
('Arcane Steadfast',      'Warframe', 'Eidolon', 'Common',    3, 'Ability cast',       '30% chance to not consume Energy on cast',                                  'Eidolon kill/capture',    'arcane_steadfast',      '22.14'),
('Arcane Strike',         'Warframe', 'Eidolon', 'Rare',      5, 'Melee Crit hit',     '+60% Attack Speed for 6s',                                                  'Eidolon capture',         'arcane_strike',         '22.14'),
('Arcane Tanker',         'Warframe', 'Eidolon', 'Common',    3, 'Void Mode / Operator','Warframe +300 Armor for 30s',                                              'Eidolon kill/capture',    'arcane_tanker',         '22.14'),
('Arcane Tempo',          'Warframe', 'Eidolon', 'Rare',      5, 'Primary headshot',   '+60% Fire Rate for Primary Shotguns for 12s',                               'Eidolon capture',         'arcane_tempo',          '22.14'),
('Arcane Trickery',       'Warframe', 'Eidolon', 'Uncommon',  5, 'Finisher kill',      'Chance to become invisible for 15s',                                        'Eidolon kill/capture',    'arcane_trickery',       '22.14'),
('Arcane Ultimatum',      'Warframe', 'Eidolon', 'Rare',      5, 'Finisher kill',      '+900 Armor for 30s',                                                        'Eidolon capture',         'arcane_ultimatum',      '22.14'),
('Arcane Velocity',       'Warframe', 'Eidolon', 'Rare',      5, 'Secondary Crit hit', '+60% Fire Rate for Secondaries for 6s',                                     'Eidolon capture',         'arcane_velocity',       '22.14'),
('Arcane Warmth',         'Warframe', 'Eidolon', 'Common',    3, 'Cold proc',          '60% chance to negate a Cold Status proc',                                   'Eidolon kill/capture',    'arcane_warmth',         '22.14'),
('Arcane Awakening',      'Warframe', 'Eidolon', 'Uncommon',  5, 'Reload',             '+60% Secondary Damage for 12s',                                             'Eidolon kill/capture',    'arcane_awakening',      '22.14'),

-- === Zariman (Angels of the Zariman) ===
('Molt Augmented',     'Warframe', 'Zariman', 'Legendary', 5, 'Kill (stacking)',    '+0.2% Ability Strength per kill; caps at +60%',                             'Vome/Fass cycles, Zariman','molt_augmented',        '31.5'),
('Molt Efficiency',    'Warframe', 'Zariman', 'Rare',      5, 'Ability active',     'While an Ability is active: +18% Damage Reduction; stacks to +54%',         'Zariman missions',        'molt_efficiency',       '31.5'),
('Molt Reconstruct',   'Warframe', 'Zariman', 'Uncommon',  5, 'Ability cast',       '+25 Health restored per Ability cast',                                      'Zariman missions',        'molt_reconstruct',      '31.5'),
('Molt Vigor',         'Warframe', 'Zariman', 'Rare',      5, 'On spawn / revive',  '+300 Max Shields; +600 Shields on spawn',                                   'Zariman missions',        'molt_vigor',            '31.5'),

-- === Netracell / Deep Archimedea ===
('Arcane Arachne',     'Warframe', 'Netracell', 'Rare',    5, 'Wall latch',         '+150% Weapon Damage while wall-latched; lingers 6s',                        'Netracell / Deep Archimedea', 'arcane_arachne',    '35.0'),
('Arcane Crepuscular', 'Warframe', 'Netracell', 'Legendary',5,'Ability kill',       '+30% Ability Damage per Ability kill; max +150% for 30s',                  'Netracell / Deep Archimedea', 'arcane_crepuscular','35.0'),
('Arcane Bellicose',   'Warframe', 'Netracell', 'Rare',    5, 'Ability kill',       '+45% Ability Strength for 20s per kill (stacking)',                         'Netracell / Deep Archimedea', 'arcane_bellicose',  '35.0'),
('Arcane Battery',     'Warframe', 'Netracell', 'Rare',    5, 'Overshields',        'When Overshields are active: abilities cost 0 Energy',                      'Netracell / Deep Archimedea', 'arcane_battery',    '35.0'),
('Arcane Double Back',  'Warframe', 'Netracell', 'Uncommon',5,'Roll / Dodge',       '60% chance to negate a Knockdown per roll',                                 'Netracell / Deep Archimedea', 'arcane_double_back','35.0'),
('Arcane Camisado',    'Warframe', 'Netracell', 'Uncommon',5, 'Finisher',           '+150% Melee Damage for 20s after finisher',                                 'Netracell / Deep Archimedea', 'arcane_camisado',   '35.0'),

-- === Theorem (Isolation Vault / Heart of Deimos) ===
('Theorem Contagion',  'Warframe', 'Theorem', 'Rare', 3, 'Kill with Ability/Necramech', 'Creates a Toxin cloud on kill dealing 750 DPS for 15s',             'Isolation Vault',         'theorem_contagion',     '29.0'),
('Theorem Demulcent',  'Warframe', 'Theorem', 'Rare', 3, 'Kill with Ability/Necramech', '+12% Ability Damage per kill (up to 3 stacks) for 20s',              'Isolation Vault',         'theorem_demulcent',     '29.0'),
('Theorem Infection',  'Warframe', 'Theorem', 'Rare', 3, 'Kill with Ability/Necramech', 'Spawn an Energy Orb per kill',                                       'Isolation Vault',         'theorem_infection',     '29.0'),

-- === The Old Peace — Update 38 / 39 / 40 / 41 Warframe Arcanes ===
('Arcane Persistence', 'Warframe', 'Descendia', 'Legendary', 5, 'Passive',           'When Armor > 700: incoming damage capped at 500 DPS',                       'Descendia floors / Roathe','arcane_persistence', '41.0'),
('Arcane Circumvent',  'Warframe', 'Descendia', 'Rare',      5, 'Roll through enemy','Steal 50% of enemy defenses (Armor/Shields) for yourself for 20s',          'Descendia floors / Roathe','arcane_circumvent',  '41.0'),
('Arcane Impetus',     'Warframe', 'Descendia', 'Rare',      5, 'Ability cast',      '+15% Ability Strength per cast for 10s; max +75%',                          'Descendia floors / Roathe','arcane_impetus',    '41.0');

-- ============================================================
-- PRIMARY ARCANES
-- ============================================================
INSERT INTO wf_base.arcanes
    (arcane_name, category, subcategory, rarity, max_rank, trigger, effect_r5, source, wfm_slug, added_update)
VALUES
-- Steel Path / Teshin
('Primary Plated Round',   'Primary', 'Steel Path', 'Rare',      5, 'Primary headshot',     '+300% Primary Damage for 6s',                                    'Teshin / Steel Path',    'primary_plated_round',    '30.5'),
('Primary Dexterity',      'Primary', 'Steel Path', 'Uncommon',  5, 'Melee kill',           '+60% Primary Damage for 12s',                                    'Teshin / Steel Path',    'primary_dexterity',       '30.5'),
('Primary Exhilaration',   'Primary', 'Steel Path', 'Rare',      5, 'Primary kill',         'Primary grants Energy; chance for extra',                         'Teshin / Steel Path',    'primary_exhilaration',    '30.5'),
('Primary Frostbite',      'Primary', 'Steel Path', 'Rare',      5, 'Cold proc',            '+60% Primary Crit Chance for 12s',                               'Teshin / Steel Path',    'primary_frostbite',       '30.5'),
('Primary Merciless',      'Primary', 'Steel Path', 'Legendary', 5, 'Primary kill',         'Stacking +30% Primary Damage; max +150% for 20s',                'Teshin / Steel Path',    'primary_merciless',       '30.5'),
('Primary Obstruct',       'Primary', 'Steel Path', 'Uncommon',  5, 'Reload',               '60% chance to create a Null-Star on reload',                     'Teshin / Steel Path',    'primary_obstruct',        '30.5'),
('Primary Deadhead',       'Primary', 'Steel Path', 'Legendary', 5, 'Primary headshot',     'Stacking +10% Primary Damage & +10% Headshot Dmg; max +60%',     'Teshin / Steel Path',    'primary_deadhead',        '30.5'),
('Primary Blight',         'Primary', 'Steel Path', 'Rare',      5, 'Viral proc',           '+60% Reload Speed for 12s',                                      'Teshin / Steel Path',    'primary_blight',          '30.5'),
('Primary Crux',           'Primary', 'Steel Path', 'Uncommon',  5, 'Ability cast',         '+60% Primary Critical Damage for 20s',                           'Teshin / Steel Path',    'primary_crux',            '30.5'),

-- Cascadia (Zariman) Secondaries — but some are Primary
('Cascadia Accuracy',      'Primary', 'Cascadia',   'Rare',      5, 'Primary kill',         '+60% Primary Status Chance for 12s',                             'Zariman / Cavalero',     'cascadia_accuracy',       '31.5'),
('Cascadia Flare',         'Primary', 'Cascadia',   'Rare',      5, 'Heat proc on primary', '+60% Primary Heat Damage for 12s',                               'Zariman / Cavalero',     'cascadia_flare',          '31.5'),
('Cascadia Overcharge',    'Primary', 'Cascadia',   'Legendary', 5, 'Overshields active',   '+120% Primary Damage while Overshields are active',              'Zariman / Cavalero',     'cascadia_overcharge',     '31.5'),
('Cascadia Empowered',     'Primary', 'Cascadia',   'Legendary', 5, 'Kills with Overguard', '+150% Primary Damage for 20s after Overguard kill',              'Zariman / Cavalero',     'cascadia_empowered',      '31.5'),

-- Conjunction (Conjunction Survival — Lua)
('Conjunction Voltage',    'Primary', 'Conjunction','Rare',      5, 'Primary kill chain',   'Chaining Primary kills grants escalating Electricity proc bonus', 'Conjunction Survival',   'conjunction_voltage',     '32.2'),

-- Netracell
('Primary Blight',         'Primary', 'Netracell',  'Rare',      5, NULL, NULL, NULL, NULL, NULL); -- duplicate handled; skip

-- ============================================================
-- SECONDARY ARCANES
-- ============================================================
INSERT INTO wf_base.arcanes
    (arcane_name, category, subcategory, rarity, max_rank, trigger, effect_r5, source, wfm_slug, added_update)
VALUES
('Secondary Dexterity',    'Secondary','Steel Path', 'Uncommon',  5, 'Melee kill',           '+60% Secondary Damage for 12s',                                  'Teshin / Steel Path',    'secondary_dexterity',     '30.5'),
('Secondary Encumber',     'Secondary','Steel Path', 'Uncommon',  5, 'Secondary kill',       '60% chance: proc Magnetic on enemies nearby',                    'Teshin / Steel Path',    'secondary_encumber',      '30.5'),
('Secondary Kinship',      'Secondary','Steel Path', 'Rare',      5, 'Companion kill',       '+90% Secondary Damage for 12s',                                  'Teshin / Steel Path',    'secondary_kinship',       '30.5'),
('Secondary Merciless',    'Secondary','Steel Path', 'Legendary', 5, 'Secondary kill',       'Stacking +30% Secondary Damage; max +150% for 20s',              'Teshin / Steel Path',    'secondary_merciless',     '30.5'),
('Secondary Outburst',     'Secondary','Steel Path', 'Rare',      5, 'Secondary headshot',   '+60% Secondary Damage for 12s',                                  'Teshin / Steel Path',    'secondary_outburst',      '30.5'),
('Secondary Deadhead',     'Secondary','Steel Path', 'Legendary', 5, 'Secondary headshot',   'Stacking +10% Secondary Damage & Headshot; max +60%',            'Teshin / Steel Path',    'secondary_deadhead',      '30.5'),
('Secondary Wind Up',      'Secondary','Steel Path', 'Uncommon',  5, 'Aim',                  '+60% Secondary Damage while aiming for 12s',                     'Teshin / Steel Path',    'secondary_wind_up',       '30.5'),
('Secondary Blight',       'Secondary','Steel Path', 'Rare',      5, 'Viral proc',           '+60% Reload Speed for 12s',                                      'Teshin / Steel Path',    'secondary_blight',        '30.5'),
('Secondary Frostbite',    'Secondary','Steel Path', 'Rare',      5, 'Cold proc',            '+60% Secondary Crit Chance for 12s',                             'Teshin / Steel Path',    'secondary_frostbite',     '30.5'),

-- Cascadia (Zariman)
('Cascadia Accuracy',      'Secondary','Cascadia',   'Rare',      5, 'Secondary kill',       '+60% Secondary Status Chance for 12s',                           'Zariman / Cavalero',     'cascadia_accuracy',       '31.5'),
('Cascadia Flare',         'Secondary','Cascadia',   'Rare',      5, 'Heat proc on secondary','+60% Secondary Heat Damage for 12s',                            'Zariman / Cavalero',     'cascadia_flare',          '31.5'),
('Cascadia Overcharge',    'Secondary','Cascadia',   'Legendary', 5, 'Overshields active',   '+120% Secondary Damage while Overshields are active',            'Zariman / Cavalero',     'cascadia_overcharge',     '31.5'),
('Cascadia Empowered',     'Secondary','Cascadia',   'Legendary', 5, 'Kills with Overguard', '+150% Secondary Damage for 20s after Overguard kill',            'Zariman / Cavalero',     'cascadia_empowered',      '31.5'),

-- Conjunction
('Conjunction Voltage',    'Secondary','Conjunction','Rare',      5, 'Secondary kill chain', 'Chaining Secondary kills grants escalating Electricity bonus',   'Conjunction Survival',   'conjunction_voltage',     '32.2'),

-- Akimbo (Duviri / Acrithis) — Dual Pistols only
('Akimbo Slip Shot',       'Secondary','Akimbo',     'Rare',      5, 'Slide + secondary fire','Bonus accuracy & damage on slide-fire',                         'Duviri / Acrithis',      'akimbo_slip_shot',        '33.5'),
('Akimbo Frenzy',          'Secondary','Akimbo',     'Legendary', 5, 'Dual pistol kill',     'Stacking fire rate bonus on consecutive kills',                  'Duviri / Acrithis',      'akimbo_frenzy',           '33.5'),

-- Update 41 new Secondary
('Secondary Irradiate',    'Secondary','Descendia',  'Rare',      5, 'Secondary hit',        'Chance to proc Radiation on enemies hit',                        'Descendia / Roathe',     'secondary_irradiate',     '41.0');

-- ============================================================
-- MELEE ARCANES
-- ============================================================
INSERT INTO wf_base.arcanes
    (arcane_name, category, subcategory, rarity, max_rank, trigger, effect_r5, source, wfm_slug, added_update)
VALUES
('Melee Animosity',        'Melee', 'Netracell', 'Rare',      5, 'Melee kill while at full HP','Stacking +10% Melee Damage; max +120%',                        'Netracell / Bird 3',     'melee_animosity',         '35.0'),
('Melee Bodycount',        'Melee', 'Netracell', 'Legendary', 5, 'Melee kills (stacking)',    'Extends Body Count / combo timer by up to 6s per kill',         'Netracell / Bird 3',     'melee_bodycount',         '35.0'),
('Melee Crescendo',        'Melee', 'Netracell', 'Rare',      5, 'Melee combo at x12+',       '+60% Melee Damage while at max combo',                          'Netracell / Bird 3',     'melee_crescendo',         '35.0'),
('Melee Duplicate',        'Melee', 'Netracell', 'Uncommon',  5, 'Finisher kill',             '30% chance to duplicate finisher damage as an explosion',        'Netracell / Bird 3',     'melee_duplicate',         '35.0'),
('Melee Exposure',         'Melee', 'Netracell', 'Uncommon',  5, 'Melee status proc',         '+30% Ability Damage for 10s',                                   'Netracell / Bird 3',     'melee_exposure',          '35.0'),
('Melee Fortune',          'Melee', 'Netracell', 'Rare',      5, 'Melee kill',                '+30% chance to spawn additional resource drops',                 'Netracell / Bird 3',     'melee_fortune',           '35.0'),
('Melee Retaliation',      'Melee', 'Netracell', 'Rare',      5, 'Damage taken',              '+60% Melee Crit Chance for 10s',                                 'Netracell / Bird 3',     'melee_retaliation',       '35.0'),
('Melee Vortex',           'Melee', 'Netracell', 'Legendary', 5, 'Heavy Attack',              'Heavy attacks pull enemies in before impact',                    'Netracell / Bird 3',     'melee_vortex',            '35.0'),
('Melee Afflictions',      'Melee', 'Ascension', 'Rare',      5, 'Melee status proc',         'Melee status procs also strip Armor',                            'Ascension event',        'melee_afflictions',       '36.0'),
('Melee Doughty',          'Melee', 'Höllvania',  'Rare',      5, 'Melee kill while sliding', '+90% Melee Damage for 8s after slide kills',                    'Höllvania / The Hex',    'melee_doughty',           '38.0');

-- ============================================================
-- ZAW ARCANES (Exodia)  — Zaw-only melee slot
-- ============================================================
INSERT INTO wf_base.arcanes
    (arcane_name, category, subcategory, rarity, max_rank, trigger, effect_r5, source, wfm_slug, added_update)
VALUES
('Exodia Brave',           'Zaw', 'Exodia', 'Rare',      5, 'Heavy Attack',         'Restore +12 Energy per Heavy Attack hit',                               'Hok (Ostron) / Cetus',   'exodia_brave',            '22.0'),
('Exodia Contagion',       'Zaw', 'Exodia', 'Rare',      5, 'Aerial melee',         'Launch a Viral/Toxin projectile on aerial melee attacks',               'Hok / Rude Zuud',        'exodia_contagion',        '22.0'),
('Exodia Epidemic',        'Zaw', 'Exodia', 'Uncommon',  5, 'Melee kill on status', 'Spread active status procs to nearby enemies',                          'Hok / Rude Zuud',        'exodia_epidemic',         '22.0'),
('Exodia Force',           'Zaw', 'Exodia', 'Common',    3, 'Melee hit',             'Chance to proc random elemental damage',                                'Hok / Rude Zuud',        'exodia_force',            '22.0'),
('Exodia Hunt',            'Zaw', 'Exodia', 'Uncommon',  5, 'Slam attack',           'Chance to Magnetize targeted enemy',                                   'Hok / Rude Zuud',        'exodia_hunt',             '22.0'),
('Exodia Might',           'Zaw', 'Exodia', 'Common',    3, 'Melee Crit hit',        'Chance to proc Hemorrhage bleed on Crit',                              'Hok / Rude Zuud',        'exodia_might',            '22.0'),
('Exodia Precision',       'Zaw', 'Exodia', 'Common',    3, 'Melee hit',             'Chance to restore 25 HP',                                               'Hok / Rude Zuud',        'exodia_precision',        '22.0'),
('Exodia Triumph',         'Zaw', 'Exodia', 'Rare',      5, 'Finisher kill',         'Chance to make the Warframe Invulnerable for 6s',                       'Hok / Rude Zuud',        'exodia_triumph',          '22.0'),
('Exodia Valor',           'Zaw', 'Exodia', 'Common',    3, 'Melee Crit hit',        'Chance to deal bonus Slash damage',                                     'Hok / Rude Zuud',        'exodia_valor',            '22.0');

-- ============================================================
-- KITGUN ARCANES (Pax)  — Kitgun-only secondary slot
-- ============================================================
INSERT INTO wf_base.arcanes
    (arcane_name, category, subcategory, rarity, max_rank, trigger, effect_r5, source, wfm_slug, added_update)
VALUES
('Pax Bolt',               'Kitgun', 'Pax', 'Rare',      5, 'Headshot',             '+60% Secondary Crit Damage for 12s; stacks 3×',                         'Rude Zuud (Fortuna)',    'pax_bolt',                '24.0'),
('Pax Charge',             'Kitgun', 'Pax', 'Rare',      5, 'Kill',                  'Reloads Kitgun fully for free on kill',                                 'Rude Zuud',              'pax_charge',              '24.0'),
('Pax Seeker',             'Kitgun', 'Pax', 'Rare',      5, 'Kill',                  'On kill: fires 3 homing projectiles at nearby enemies',                 'Rude Zuud',              'pax_seeker',              '24.0'),
('Pax Soar',               'Kitgun', 'Pax', 'Uncommon',  5, 'Aim glide',             '+60% Kitgun Damage while aim-gliding',                                  'Rude Zuud',              'pax_soar',                '24.0');

-- ============================================================
-- AMP ARCANES — Virtuos & Eternal
-- ============================================================
INSERT INTO wf_base.arcanes
    (arcane_name, category, subcategory, rarity, max_rank, trigger, effect_r5, source, wfm_slug, added_update)
VALUES
-- Virtuos (The Quills / Vox Solaris)
('Virtuos Forge',          'Amp', 'Virtuos', 'Rare',      3, 'Void Blast',            'Chance to create a Heat explosion on Void Blast',                     'The Quills / Vox Solaris','virtuos_forge',           '22.0'),
('Virtuos Ghost',          'Amp', 'Virtuos', 'Rare',      3, 'Void Blast',            'Operator becomes invisible for 10s on Void Blast',                    'The Quills / Vox Solaris','virtuos_ghost',           '22.0'),
('Virtuos Shadow',         'Amp', 'Virtuos', 'Rare',      3, 'Aim Glide',             '+60% Amp Crit Chance while aim-gliding for 10s',                      'The Quills / Vox Solaris','virtuos_shadow',          '22.0'),
('Virtuos Spike',          'Amp', 'Virtuos', 'Rare',      3, 'Void Blast',            'Chance to proc Radiation on Void Blast',                               'The Quills / Vox Solaris','virtuos_spike',           '22.0'),
('Virtuos Strike',         'Amp', 'Virtuos', 'Rare',      3, 'Headshot',              '+60% Amp Crit Damage for 12s',                                        'The Quills / Vox Solaris','virtuos_strike',          '22.0'),
('Virtuos Tempo',          'Amp', 'Virtuos', 'Uncommon',  3, 'Headshot',              '+30% Amp Fire Rate for 12s',                                          'The Quills / Vox Solaris','virtuos_tempo',           '22.0'),

-- Eternal (Zariman / Angels of the Zariman)
('Eternal Eradicate',      'Amp', 'Eternal', 'Rare',      5, 'Amp kill vs Overguard', '+30% Amp Damage vs Overguard enemies for 20s (stackable)',             'Zariman / Cavalero',     'eternal_eradicate',       '31.5'),
('Eternal Onslaught',      'Amp', 'Eternal', 'Rare',      5, 'Amp hit (any)',          'Stacking +15% Amp Damage per hit; max +90% for 8s',                   'Zariman / Cavalero',     'eternal_onslaught',       '31.5');

-- ============================================================
-- OPERATOR ARCANES  (Magus set — worn on Operator)
-- ============================================================
INSERT INTO wf_base.arcanes
    (arcane_name, category, subcategory, rarity, max_rank, trigger, effect_r5, source, wfm_slug, added_update)
VALUES
('Magus Anomaly',          'Operator', 'Magus', 'Uncommon',  3, 'Void Blast',           'Summon a vortex that draws enemies in for 6s',                      'The Quills / Vox Solaris','magus_anomaly',           '22.0'),
('Magus Cloud',            'Operator', 'Magus', 'Common',    3, 'Void Dash',             'Leave a Cold cloud at dash origin point',                           'The Quills',              'magus_cloud',             '22.0'),
('Magus Elevate',          'Operator', 'Magus', 'Rare',      3, 'Transference (re-enter Warframe)','Restore 150 HP to Warframe on Transference-in',          'The Quills / Vox Solaris','magus_elevate',           '22.0'),
('Magus Firewall',         'Operator', 'Magus', 'Common',    3, 'Transference',          'Warframe gains 600 HP shield for 10s on Transference',              'The Quills',              'magus_firewall',          '22.0'),
('Magus Husk',             'Operator', 'Magus', 'Common',    3, 'Void Mode',             '+300 Armor to Warframe while in Void Mode',                        'The Quills',              'magus_husk',              '22.0'),
('Magus Lockdown',         'Operator', 'Magus', 'Rare',      3, 'Void Blast',            'Spawn Void Chains that immobilize nearby enemies for 15s',         'The Quills / Vox Solaris','magus_lockdown',          '22.0'),
('Magus Melt',             'Operator', 'Magus', 'Common',    3, 'Void Blast',            'Chance to proc Heat on affected enemies',                           'The Quills',              'magus_melt',              '22.0'),
('Magus Nourish',          'Operator', 'Magus', 'Common',    3, 'Transference-in',       'Restore 150 Energy to Warframe on Transference-in',                 'The Quills',              'magus_nourish',           '22.0'),
('Magus Overload',         'Operator', 'Magus', 'Rare',      3, 'Transference near console','Proc Electricity burst from hacked consoles',                   'The Quills / Vox Solaris','magus_overload',          '22.0'),
('Magus Replenish',        'Operator', 'Magus', 'Uncommon',  3, 'Void Mode exit',        'Restore 150 Shields to Warframe on Void Mode exit',                 'The Quills',              'magus_replenish',         '22.0'),
('Magus Vigor',            'Operator', 'Magus', 'Uncommon',  3, 'Void Mode',             '+300 Max HP to Warframe while Operator is in Void Mode',            'The Quills',              'magus_vigor',             '22.0');

-- ============================================================
-- TEKTOLYST ARCANES (Zid-An set — Update 41 / The Old Peace)
-- equip on Tektolyst Artifact, Operator only
-- ============================================================
INSERT INTO wf_base.arcanes
    (arcane_name, category, subcategory, rarity, max_rank, trigger, effect_r5, source, wfm_slug, added_update)
VALUES
('Zid-An Haras',  'Tektolyst', 'Zid-An', 'Rare', 5, 'Tauron Strike executed', '48% Warframe Ammo Efficiency for 30s; +18% Amp Ammo Efficiency',          'Perita Rebellion (SP) / Marie','zid_an_haras',  '41.0'),
('Zid-An Sek-Eel','Tektolyst', 'Zid-An', 'Rare', 5, 'Tauron Strike activated','Operator becomes Invisible for 30s; +9% Tauron Strike Charge Rate',        'Perita Rebellion (SP) / Marie','zid_an_sek_eel','41.0'),
('Zid-An Uskos',  'Tektolyst', 'Zid-An', 'Rare', 5, 'Operator/Tauron Strike kill','+2.4% Heat Dmg for Primary/mission duration; max +250%',              'Perita Rebellion (SP) / Marie','zid_an_uskos',  '41.0'),
('Zid-An Osbok',  'Tektolyst', 'Zid-An', 'Rare', 5, 'Void Sling',             'Slings strip 30% Overguard; on strip: +3× Amp Crit Dmg for 15s',          'Perita Rebellion (SP) / Marie','zid_an_osbok',  '41.0');

-- ============================================================
-- Verify counts
-- ============================================================
SELECT category, COUNT(*) AS arcane_count
FROM wf_base.arcanes
GROUP BY category
ORDER BY arcane_count DESC;
GO
