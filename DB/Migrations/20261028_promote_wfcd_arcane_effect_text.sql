-- Replaces 153 stale Arcane effect descriptions in wf_base.arcanes with the
-- upstream (WFCD warframe-items) max-rank text.
--
-- WHY: an audit on 2026-10-24 compared all 161 seeded descriptions against WFCD;
-- none matched and 150 differed in substance (e.g. Arcane Battery said "abilities
-- cost 0 Energy" -- the real effect is +0.30 max Energy per Armor point, up to
-- 1000). Full comparison: Docs/Static Data/Arcane SoT Audit 2026-10-24.csv.
-- Per Patrick, the wiki/upstream is trusted unless an in-game discrepancy shows up.
--
-- WHAT IT CHANGES: effect_r5 and trigger (and the matching raw_json keys, so they
-- cannot disagree). Matched by exact name. It does NOT rename arcanes, add the 12
-- arcanes Gu is missing, or touch Arcane Steadfast (flagged for manual review:
-- five upstream records map to it). Arcane names are untouched, so builds that
-- reference an arcane by name keep working.
--
-- A trigger is only overwritten when upstream states one; otherwise it is kept.
-- Not a Static Data pipeline promotion -- canonical promotion there stays
-- review-gated; this is a one-pass text correction Patrick reviewed and ran.
--
-- UNDO: this script first copies the affected columns to
-- wf_base.arcanes_effect_backup_20261028. To roll back, run:
--   update wf_base.arcanes a
--      set effect_r5 = b.effect_r5, trigger = b.trigger, raw_json = b.raw_json
--     from wf_base.arcanes_effect_backup_20261028 b
--    where b.arcane_id = a.arcane_id;

begin;

create table if not exists wf_base.arcanes_effect_backup_20261028 as
  select arcane_id, name, effect_r5, trigger, raw_json from wf_base.arcanes;

-- The backup is private: same lockdown posture as the rest of wf_base.
alter table wf_base.arcanes_effect_backup_20261028 enable row level security;
revoke all on wf_base.arcanes_effect_backup_20261028 from anon, authenticated, public;

with fixes (name, effect, trig) as (
values
  ($t$Arcane Guardian$t$, $t$15% chance for +900 Armor for 20s. +1 Arcane Revive.$t$, $t$Damaged$t$),
  ($t$Arcane Blessing$t$, $t$+24 Max Health. Stacks up to 50x. +1 Arcane Revive.$t$, $t$Health pickup$t$),
  ($t$Arcane Persistence$t$, $t$Remove all Shields. If Armor is above 700: Cannot be hit for more than 500 Damage/s. Magnetic Status and Ability Nullifying Effects disable this protection. +1 Arcane Revive.$t$, $t$$t$),
  ($t$Arcane Acceleration$t$, $t$30% chance for +90% Fire Rate to Primary Weapons (Excludes Shotguns) for 9s. +1 Arcane Revive.$t$, $t$Critical hit$t$),
  ($t$Arcane Aegis$t$, $t$3% chance for +30% Shield Recharge for 12s. +1 Arcane Revive.$t$, $t$Shield damaged$t$),
  ($t$Arcane Agility$t$, $t$60% chance for +60% Parkour Velocity for 18s. +1 Arcane Revive.$t$, $t$Damaged$t$),
  ($t$Arcane Arachne$t$, $t$+150% Damage to Primary and Secondary weapons for 30s. +1 Arcane Revive.$t$, $t$Wall latch$t$),
  ($t$Arcane Avenger$t$, $t$21% chance for +45% Critical Chance for 12s. +1 Arcane Revive.$t$, $t$Damaged$t$),
  ($t$Arcane Awakening$t$, $t$60% chance for +150% Damage to Pistols for 24s. +1 Arcane Revive.$t$, $t$Reload$t$),
  ($t$Arcane Barrier$t$, $t$6% chance to instantly restore all Shields. 6s cooldown. +1 Arcane Revive.$t$, $t$Shield damaged$t$),
  ($t$Arcane Consequence$t$, $t$+60% Parkour Velocity for 18s. +1 Arcane Revive.$t$, $t$Headshot$t$),
  ($t$Arcane Deflection$t$, $t$+102% chance to resist a Slash Status effect. +1 Arcane Revive.$t$, $t$$t$),
  ($t$Arcane Energize$t$, $t$60% chance to replenish 150 Energy to self and allies within 15m. 15s cooldown. +1 Arcane Revive.$t$, $t$Energy pickup$t$),
  ($t$Arcane Eruption$t$, $t$100% chance to Knockdown nearby enemies. +1 Arcane Revive.$t$, $t$Energy pickup$t$),
  ($t$Arcane Fury$t$, $t$60% chance for +180% Melee Damage to Melee Weapons for 18s. +1 Arcane Revive.$t$, $t$Critical hit$t$),
  ($t$Arcane Grace$t$, $t$9% chance for +6% Health Regeneration/s for 9s. +1 Arcane Revive.$t$, $t$Health damaged$t$),
  ($t$Arcane Healing$t$, $t$+102% chance to resist a Radiation Status effect. +1 Arcane Revive.$t$, $t$$t$),
  ($t$Arcane Ice$t$, $t$+102% chance to resist a Heat Status effect. +1 Arcane Revive.$t$, $t$$t$),
  ($t$Arcane Momentum$t$, $t$60% chance for +150% Reload Speed to Sniper Rifles for 12s. +1 Arcane Revive.$t$, $t$Critical hit$t$),
  ($t$Arcane Nullifier$t$, $t$+102% chance to resist a Magnetic Status effect. +1 Arcane Revive.$t$, $t$$t$),
  ($t$Arcane Phantasm$t$, $t$45% chance for +60% Speed for 18s. +1 Arcane Revive.$t$, $t$Block$t$),
  ($t$Arcane Precision$t$, $t$+300% Damage for 18s on Secondary Weapon. +1 Arcane Revive.$t$, $t$Weak point hit$t$),
  ($t$Arcane Pulse$t$, $t$60% chance to restore 500 Health to allies within 25m. 15s cooldown. +1 Arcane Revive.$t$, $t$Health pickup$t$),
  ($t$Arcane Rage$t$, $t$15% chance for +180% Damage to Primary Weapons for 24s. +1 Arcane Revive.$t$, $t$Headshot$t$),
  ($t$Arcane Resistance$t$, $t$+102% chance to resist a Toxin Status effect. +1 Arcane Revive.$t$, $t$$t$),
  ($t$Arcane Strike$t$, $t$15% chance for +60% Attack Speed to Melee Weapons for 18s. +1 Arcane Revive.$t$, $t$Hit$t$),
  ($t$Arcane Tempo$t$, $t$15% chance for +90% Fire Rate to Shotguns for 12s. +1 Arcane Revive.$t$, $t$Critical hit$t$),
  ($t$Arcane Trickery$t$, $t$15% chance to become invisible for 30s. +1 Arcane Revive.$t$, $t$Finisher kill$t$),
  ($t$Arcane Ultimatum$t$, $t$+1,200 Armor for 45s. +1 Arcane Revive.$t$, $t$Finisher kill$t$),
  ($t$Arcane Velocity$t$, $t$90% chance for +120% Fire Rate to Pistols for 9s. +1 Arcane Revive.$t$, $t$Critical hit$t$),
  ($t$Arcane Victory$t$, $t$75% chance for +3% Health Regeneration/s for 9s. +1 Arcane Revive.$t$, $t$Headshot kill$t$),
  ($t$Arcane Warmth$t$, $t$+102% chance to resist a Cold Status effect. +1 Arcane Revive.$t$, $t$$t$),
  ($t$Magus Vigor$t$, $t$+600 Health$t$, $t$Transference out$t$),
  ($t$Magus Husk$t$, $t$+300 Armor$t$, $t$Transference out$t$),
  ($t$Magus Cloud$t$, $t$+300% Void Sling Radius for 6s$t$, $t$Void mode$t$),
  ($t$Magus Cadence$t$, $t$+90% Sprint Speed for 12s$t$, $t$Void sling$t$),
  ($t$Magus Replenish$t$, $t$Heal 30% Health$t$, $t$Void sling$t$),
  ($t$Magus Elevate$t$, $t$95% chance to restore 300 Health to Warframe$t$, $t$Transference in$t$),
  ($t$Magus Nourish$t$, $t$Restores 35 Health/s to Warframe$t$, $t$While an operator$t$),
  ($t$Virtuos Null$t$, $t$+20% Amp Energy Regeneration for 4s$t$, $t$Kill$t$),
  ($t$Virtuos Tempo$t$, $t$60% chance for +60% Fire Rate for 8s$t$, $t$Kill$t$),
  ($t$Virtuos Fury$t$, $t$20% chance for +30% Damage for 4s$t$, $t$Status effect$t$),
  ($t$Virtuos Strike$t$, $t$20% chance for +80% Critical Damage for 4s$t$, $t$Critical hit$t$),
  ($t$Virtuos Shadow$t$, $t$40% chance for +60% Critical Chance for 12s$t$, $t$Headshot$t$),
  ($t$Virtuos Ghost$t$, $t$40% chance for +60% Status Chance for 12s$t$, $t$Headshot$t$),
  ($t$Exodia Brave$t$, $t$+5 Energy Rate for 4s. Stacks up to 3x.$t$, $t$Heavy attack kill$t$),
  ($t$Exodia Valor$t$, $t$+200% Additional Combo Count Chance on Lifted enemies$t$, $t$$t$),
  ($t$Exodia Might$t$, $t$50% chance for +30% Life Steal for 8s$t$, $t$Finisher kill$t$),
  ($t$Exodia Triumph$t$, $t$+50% Additional Combo Count Chance$t$, $t$$t$),
  ($t$Exodia Hunt$t$, $t$50% chance to pull enemies within 12m into melee range$t$, $t$Ground slam$t$),
  ($t$Exodia Force$t$, $t$50% chance to deal 200% Weapon Damage to enemies within 6m$t$, $t$Status effect$t$),
  ($t$Exodia Epidemic$t$, $t$Slam emits a shockwave forwards that suspends enemies in the air for a short period$t$, $t$After a bullet jump or double jump$t$),
  ($t$Arcane Blade Charger$t$, $t$30% chance for +300% Melee Damage for 12s. +1 Arcane Revive.$t$, $t$Primary weapon kill$t$),
  ($t$Arcane Bodyguard$t$, $t$Heal Companion for 900. +1 Arcane Revive.$t$, $t$6 melee kills within 30s$t$),
  ($t$Arcane Intention$t$, $t$Gain +250 Max Health per active channeled ability. +1 Arcane Revive.$t$, $t$$t$),
  ($t$Arcane Pistoleer$t$, $t$60% chance for Infinite Ammo for 12s. +1 Arcane Revive.$t$, $t$Pistol weak point kill$t$),
  ($t$Arcane Primary Charger$t$, $t$30% chance for +300% Primary Weapon Damage for 12s. +1 Arcane Revive.$t$, $t$Melee kill$t$),
  ($t$Arcane Rise$t$, $t$60% chance for +150% Damage to Primary Weapons for 24s. +1 Arcane Revive.$t$, $t$Reload$t$),
  ($t$Arcane Tanker$t$, $t$+1,200 Armor for 60s. +1 Arcane Revive.$t$, $t$Archgun equipped$t$),
  ($t$Primary Plated Round$t$, $t$On Reload: Deal increased damage per round loaded based on max magazine size. Lasts for 10s.$t$, $t$$t$),
  ($t$Primary Dexterity$t$, $t$+60% Damage for 20s. Stacks up to 6x. +7.5s Combo Duration.$t$, $t$Melee kill$t$),
  ($t$Secondary Dexterity$t$, $t$+60% Damage for 20s. Stacks up to 6x. +7.5s Combo Duration.$t$, $t$Melee kill$t$),
  ($t$Secondary Encumber$t$, $t$On Status Effect: +24% chance to trigger a second random Status Effect$t$, $t$$t$),
  ($t$Secondary Kinship$t$, $t$While Buffing Ally Warframes: +20% Critical Chance per buff$t$, $t$$t$),
  ($t$Exodia Contagion$t$, $t$Melee while Aim Gliding launches a projectile that explodes on impact$t$, $t$After a bullet jump or double jump$t$),
  ($t$Virtuos Forge$t$, $t$Converts 98% Void Damage to Heat Damage$t$, $t$Hit$t$),
  ($t$Virtuos Spike$t$, $t$Converts 98% Void Damage to Puncture Damage$t$, $t$Hit$t$),
  ($t$Eternal Eradicate$t$, $t$+60% Damage to Amps for 8s$t$, $t$Operator ability$t$),
  ($t$Magus Anomaly$t$, $t$Enemies within 30m are pulled towards Warframe$t$, $t$Transference in$t$),
  ($t$Magus Firewall$t$, $t$Generate Void Particles every 1s up to 6 particles, each granting 12.5% Damage Reduction for 60s. Taking damage consumes a particle.$t$, $t$Void mode$t$),
  ($t$Magus Lockdown$t$, $t$Drop a mine that tethers up to 10 enemies in 15m for 4s$t$, $t$Void sling$t$),
  ($t$Magus Melt$t$, $t$Increase Heat Damage in Operator Mode by 30% for 15s, stacking up to 7x$t$, $t$Void sling$t$),
  ($t$Magus Overload$t$, $t$Stun robotic enemies for 3s, which then discharge Electricity Damage dealing 80% of their Max Health to anyone within 25m$t$, $t$Void sling$t$),
  ($t$Molt Augmented$t$, $t$+0.24% Ability Strength. Stacks up to 250x. +1 Arcane Revive.$t$, $t$Kill$t$),
  ($t$Molt Efficiency$t$, $t$While Shields are Active: Gain 6% Ability Duration per second, up to a maximum of 36%. +1 Arcane Revive.$t$, $t$$t$),
  ($t$Molt Reconstruct$t$, $t$Heal yourself and allies within Affinity Range 6 Health for each Energy point spent on the initial casting cost of abilities. +1 Arcane Revive.$t$, $t$$t$),
  ($t$Molt Vigor$t$, $t$45% Ability Strength on next Warframe Ability Cast. +1 Arcane Revive.$t$, $t$Operator ability$t$),
  ($t$Arcane Crepuscular$t$, $t$While invisible, gain +30% Ability Strength and +3x Final Critical Damage. +1 Arcane Revive.$t$, $t$$t$),
  ($t$Arcane Bellicose$t$, $t$Gain 6% Ability Strength for every 250 Max Health up to 72%. +1 Arcane Revive.$t$, $t$$t$),
  ($t$Arcane Battery$t$, $t$Gain 0.30 maximum Energy per Armor point, up to 1000 Energy. +1 Arcane Revive.$t$, $t$$t$),
  ($t$Arcane Double Back$t$, $t$Gain +25% damage resistance for 4s per Dodge, Double Jump and Bullet Jump. Stacks up to 3x. +1 Arcane Revive.$t$, $t$$t$),
  ($t$Arcane Camisado$t$, $t$Attacks from summoned minions increase Ability Strength by 6% up to 60% on the next Ability Cast. Summons gain 20% Movement Speed. +1 Arcane Revive.$t$, $t$$t$),
  ($t$Theorem Contagion$t$, $t$Standing in a zone created by a Residual Arcane creates a globe that orbits the player every 2s. The globes will strike the nearest enemy within 15m dealing 150 damage increasing their vulnerability to the globe's damage type by 200% for 6s. Globes will persist for 30s upon leaving the zone. +1 Arcane Revive.$t$, $t$$t$),
  ($t$Theorem Demulcent$t$, $t$Standing in a zone created by a Residual Arcane increases weapon damage by 12%/s stacking up to 15x. Effect persists for 20s upon leaving the zone. +1 Arcane Revive.$t$, $t$$t$),
  ($t$Theorem Infection$t$, $t$Standing in a zone created by a Residual Arcane increases damage of companions and summoned allies within 90m by 24%/s stacking up to 15x. Effect persists for 20s upon leaving the zone. +1 Arcane Revive.$t$, $t$$t$),
  ($t$Arcane Circumvent$t$, $t$Roll through enemies to steal 50% of their defenses for yourself. Stolen Armor lasts 15s. +1 Arcane Revive.$t$, $t$$t$),
  ($t$Arcane Impetus$t$, $t$Unique Status Effects from Abilities grant +6% Ability Strength and +3% Ability Efficiency for 20s. +1 Arcane Revive.$t$, $t$$t$),
  ($t$Primary Exhilarate$t$, $t$+1.2 Energy Regen/s for 10s. Stacks up to 3x.$t$, $t$Weapon impact status effect$t$),
  ($t$Primary Frostbite$t$, $t$+3% Critical Damage and +2.25% Multishot for 12s. Stacks up to 40x.$t$, $t$Cold status effect$t$),
  ($t$Primary Merciless$t$, $t$+30% Damage for 4s. Stacks up to 12x. +30% Reload Speed.$t$, $t$Kill$t$),
  ($t$Primary Obstruct$t$, $t$On Weapon Magnetic Status Effect: Enemy weapons jam within 15m of target. Cooldown 10s.$t$, $t$$t$),
  ($t$Primary Deadhead$t$, $t$+120% Damage for 24s. Stacks up to 3x. +30% to Headshot Multiplier. -50% Weapon Recoil.$t$, $t$Weak point kill$t$),
  ($t$Primary Blight$t$, $t$+3.6% Critical Damage and +1.8% Multishot for 12s. Stacks up to 40x.$t$, $t$Toxin status effect$t$),
  ($t$Primary Crux$t$, $t$On Weak Point Hit: Gain +30% Status Chance and +6% Ammo Efficiency for 10s. Stacks up to 10x.$t$, $t$$t$),
  ($t$Cascadia Accuracy$t$, $t$+300% Critical Chance on Weak Point Hits for 4s$t$, $t$Roll$t$),
  ($t$Cascadia Flare$t$, $t$+12% Damage for 10s. Stacks up to 480%.$t$, $t$Heat status effect$t$),
  ($t$Cascadia Overcharge$t$, $t$While Overshields Active: +300% Critical Chance$t$, $t$$t$),
  ($t$Cascadia Empowered$t$, $t$Deals +750 Damage matching the Damage Type of the Status Effect$t$, $t$Status effect$t$),
  ($t$Conjunction Voltage$t$, $t$+1.5% Reload Speed and +3% Multishot for 12s. Stacks up to 40x.$t$, $t$Electricity status effect$t$),
  ($t$Secondary Merciless$t$, $t$+30% Damage for 4s. Stacks up to 12x. +30% Reload Speed.$t$, $t$Kill$t$),
  ($t$Secondary Outburst$t$, $t$On swapping to Secondary Weapon, consume all Combo Multipliers to increase Secondary Weapon Critical Chance and Critical Damage by 20% per Combo consumed for 30s$t$, $t$$t$),
  ($t$Secondary Deadhead$t$, $t$+120% Damage for 24s. Stacks up to 3x. +30% to Headshot Multiplier. -50% Weapon Recoil.$t$, $t$Weak point kill$t$),
  ($t$Akimbo Slip Shot$t$, $t$While sliding or aim gliding: Gain 65% ammo efficiency with Dual Pistols$t$, $t$$t$),
  ($t$Secondary Irradiate$t$, $t$On hitting enemies afflicted by 10 stacks of Radiation: Deal 180% of the hit damage to enemies within 7m$t$, $t$$t$),
  ($t$Melee Animosity$t$, $t$On Melee Hit: Gain 42% Critical Chance on your next Heavy Attack, up to 420%$t$, $t$$t$),
  ($t$Melee Crescendo$t$, $t$On Finisher Kill: Gain 6 Initial Combo for the rest of your mission$t$, $t$$t$),
  ($t$Melee Duplicate$t$, $t$On Base Critical Hits: 100% chance for your attack to strike a second time$t$, $t$$t$),
  ($t$Melee Exposure$t$, $t$On Ability Cast: Gain 60% Corrosive Damage on Melee strikes for 25s. Stacks up to 240%.$t$, $t$$t$),
  ($t$Melee Retaliation$t$, $t$Gain 30% Melee Damage for every 200 current Shields, up to 420%. Bonus halved for Overshields.$t$, $t$$t$),
  ($t$Melee Vortex$t$, $t$Kill an enemy affected by Magnetic Status for a 45% chance to pull in enemies within 18m radius$t$, $t$$t$),
  ($t$Melee Afflictions$t$, $t$Enemies affected by Status Effects gain 6 additional stacks when they're knocked down or flung by melee attacks$t$, $t$$t$),
  ($t$Melee Doughty$t$, $t$Gain 1.0x Critical Damage for every 10% Puncture Status chance on your Melee Weapon.$t$, $t$$t$),
  ($t$Pax Bolt$t$, $t$+30% Ability Efficiency and +30% Ability Strength on the next Ability used within 4s$t$, $t$Headshot kill$t$),
  ($t$Pax Charge$t$, $t$Battery Recharge Delay is reduced by +50%$t$, $t$$t$),
  ($t$Pax Seeker$t$, $t$4 projectiles burst from the target and seek the heads of nearby enemies$t$, $t$Headshot kill$t$),
  ($t$Pax Soar$t$, $t$+50% Accuracy while Airborne. -50% Weapon Recoil while Airborne. +5s Aim Glide/Wall Latch Duration.$t$, $t$$t$),
  ($t$Eternal Onslaught$t$, $t$180% Critical Chance for 8s$t$, $t$Energy depleted$t$),
  ($t$Melee Influence$t$, $t$On Melee Electricity Status: 20% chance for elemental Melee Status Effects to apply to enemies within 20m for 18s. Cannot refresh while active.$t$, $t$$t$),
  ($t$Residual Boils$t$, $t$20% chance to spawn volatile hives for 12s that explode when enemies approach for 80 Heat Damage in 10m. Standing in the area applies Heat Damage type to Theorem Arcanes.$t$, $t$Kitgun kill$t$),
  ($t$Residual Malodor$t$, $t$20% chance to create a frigid mist for 12s, dealing 40 Cold Damage/s. Standing in the area applies Cold Damage to Theorem Arcanes.$t$, $t$Kitgun kill$t$),
  ($t$Residual Shock$t$, $t$20% chance to spawn an electrified spike for 12s, dealing 200 Electricity Damage to enemies within 10m. Standing in the area applies Electricity Damage to Theorem Arcanes.$t$, $t$Kitgun kill$t$),
  ($t$Residual Viremia$t$, $t$20% chance to create pool of toxic blood for 12s, dealing 40 Toxin Damage/s. Standing in the area applies the Toxin Damage to Theorem Arcanes.$t$, $t$Kitgun kill$t$),
  ($t$Longbow Sharpshot$t$, $t$On Weak Point Hit: Gain +300% damage on your next shot$t$, $t$$t$),
  ($t$Primary Bulwark$t$, $t$Gain +1% damage for each unit of armor past 1,000, up to a max of +500%$t$, $t$$t$),
  ($t$Fractalized Reset$t$, $t$+240% Reload Speed for 5s$t$, $t$Ability cast$t$),
  ($t$Shotgun Vendetta$t$, $t$+180% Multishot and +75% Reload Speed for 15s$t$, $t$Shotgun kill within 5m of target$t$),
  ($t$Primary Debilitate$t$, $t$If an enemy has 10 stacks of a combined Status Effect, inflicting the same Status Effect again has a 100% chance to inflict one of the base Status Effects it is composed of$t$, $t$$t$),
  ($t$Primary Overcharge$t$, $t$While at or above 90% Energy: Gain 35% of Max Energy as Multishot, capped at 350%$t$, $t$$t$),
  ($t$Secondary Enervate$t$, $t$On Hit: Increase Critical Chance by 10%. Resets after 6 Big Critical Hit.$t$, $t$$t$),
  ($t$Secondary Fortifier$t$, $t$Gain 1 Overguard for every 100 Damage dealt to an enemy's Overguard. Deals x8 Extra Damage to Overguard.$t$, $t$$t$),
  ($t$Secondary Shiver$t$, $t$Enemies take +45% damage per Cold Status$t$, $t$$t$),
  ($t$Secondary Surge$t$, $t$On Ability Cast: Next shot gains a Damage Multiplier for every 200 current Energy, up to x8$t$, $t$$t$),
  ($t$Melee Careen$t$, $t$x2.50 Melee Damage against Frozen enemies. On Roll: Freeze enemies in a 5.5m radius with a 2s Cooldown.$t$, $t$$t$),
  ($t$Melee Fortification$t$, $t$On Melee Kill: +210 Armor for 10s$t$, $t$$t$),
  ($t$Virtuos Trojan$t$, $t$Converts 98% Void Damage to Viral Damage$t$, $t$Hit$t$),
  ($t$Virtuos Surge$t$, $t$Converts 98% Void Damage to Electricity Damage$t$, $t$Hit$t$),
  ($t$Eternal Logistics$t$, $t$+75% Amp Ammo Efficiency for 8s$t$, $t$Void sling$t$),
  ($t$Emergence Dissipate$t$, $t$WHILE IN VOID SLING: Press to dissipate the endpoint in a 10m radius. Enemies hit create a short lived Void Mote that replenishes 10 Energy on pick up.$t$, $t$$t$),
  ($t$Emergence Renewed$t$, $t$Increase Energy Regeneration by 300% over 5s. Cooldown: 30s.$t$, $t$Energy depleted$t$),
  ($t$Emergence Savior$t$, $t$Become invulnerable for 5s and recover 60% Health. Cooldown: 90s.$t$, $t$Lethal damage$t$),
  ($t$Magus Aggress$t$, $t$On Warframe Melee Transference: Heavy Blades deal +300% Critical Damage for 4 consecutive attacks. Cooldown 20s.$t$, $t$$t$),
  ($t$Magus Repair$t$, $t$Heal Warframes within 30m by 25% Health/s$t$, $t$Void mode$t$),
  ($t$Magus Accelerant$t$, $t$Reduce Enemy Resistance to Heat Damage by 65%$t$, $t$Void sling$t$),
  ($t$Magus Destruct$t$, $t$Reduce Enemy Resistance to Puncture Damage by 65%$t$, $t$Void sling$t$),
  ($t$Magus Drive$t$, $t$Increase K-Drive Speed by 150% for 30s$t$, $t$Transference in$t$),
  ($t$Magus Glitch$t$, $t$102% chance to negate Transference Static$t$, $t$Transference static$t$),
  ($t$Magus Revert$t$, $t$Use again within 3s, to return the Operator to their original position at no energy cost. Restores 60 Health. 3s cooldown.$t$, $t$Void sling$t$),
  ($t$Arcane Concentration$t$, $t$+60% Ability Duration for 3s. +1 Arcane Revive.$t$, $t$Ability cast$t$),
  ($t$Arcane Escapist$t$, $t$On Mercy Kill: Gain a stack of Escapist, up to 9x. On taking fatal damage, consume 3 stacks to avoid death and become invulnerable for 12s. +1 Arcane Revive.$t$, $t$$t$),
  ($t$Arcane Expertise$t$, $t$100% of Ability Strength modifiers are also applied to Max Shields. +1 Arcane Revive.$t$, $t$$t$),
  ($t$Arcane Power Ramp$t$, $t$On Ability Cast: Next Ability cast gains +9% Ability Strength, stacking up to 4x. Resets when the same ability is recast consecutively. +1 Arcane Revive.$t$, $t$$t$),
  ($t$Arcane Reaper$t$, $t$+24 Health Regen/s and +660 Armor for 10s. +1 Arcane Revive.$t$, $t$Melee kill$t$),
  ($t$Arcane Universal Fallout$t$, $t$Each Radiation Status Effect inflicted on enemies by Abilities gives a 6% chance to drop a Universal Orb on enemy death. +1 Arcane Revive.$t$, $t$$t$)
),
applied as (
  update wf_base.arcanes a
     set effect_r5 = f.effect,
         trigger   = coalesce(nullif(f.trig, ''), a.trigger),
         raw_json  = jsonb_set(
                       jsonb_set(coalesce(a.raw_json, '{}'::jsonb), '{effect_r5}', to_jsonb(f.effect::text)),
                       '{trigger}', to_jsonb(coalesce(nullif(f.trig, ''), a.trigger)::text)
                     )
    from fixes f
   where a.name = f.name
  returning a.name
)
select count(*) as rows_updated, 153 as rows_expected from applied;

commit;
