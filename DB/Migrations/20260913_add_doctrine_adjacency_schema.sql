-- D.7 -- Doctrine Adjacency canonical schema (Art/School reference data + typed relationships)
-- See Docs/Session Logs/Warframe_Jarvis_Session_Log.md Session 016/017 for the full scoping
-- rationale. Summary: cultivation_school/cultivation_art/cultivation_doctrine/cultivation_color
-- have only ever existed as free text directly on wf_user.my_frames (see DB/Cultivation/*.sql,
-- ~58 hand-authored per-build UPDATE statements) -- there has never been a canonical School or
-- Art row with a stable ID. That makes two things impossible: (1) attaching a typed relationship
-- to "an Art" rather than to a specific build row, and (2) a future build embodying a DIFFERENT
-- Art than another build of the same Warframe (Patrick's confirmed multi-build-per-Warframe
-- requirement) -- today's schema has no row for an Art to exist independent of a my_frames row.
--
-- This migration is additive only: wf_base.cultivation_schools/cultivation_arts become the
-- canonical source, seeded verbatim from DB/Cultivation/*.sql's existing 58 records (same school
-- names, art names, colors, and doctrine text -- nothing rewritten). wf_user.my_frames keeps its
-- existing free-text columns untouched and gains a new cultivation_art_id FK, backfilled by
-- joining on the existing cultivation_art text (exact match against the newly-canonical art_name)
-- -- no guessing, no fuzzy matching. The old free-text columns are left in place rather than
-- dropped; retiring them is a separate decision once the app actually reads cultivation_art_id.

create table if not exists wf_base.cultivation_schools (
  school_id serial primary key,
  name text not null unique,
  -- Migrates the icon glyph currently hardcoded identically in both BuildDetailOverlay.jsx's
  -- and FrameCard.jsx's getSchoolIcon() (verbatim copy-pasted keyword-match functions) --
  -- available for that cleanup later, not rewired by this migration.
  sigil text
);

create table if not exists wf_base.cultivation_arts (
  art_id serial primary key,
  school_id integer not null references wf_base.cultivation_schools(school_id) on delete restrict,
  art_name text not null unique,
  color text,               -- hex, e.g. '#A8002A' -- per-Art, not per-school (verified: siblings
                            -- in the same school never share an identical color in the source data)
  doctrine text not null,   -- the full lore paragraph, canonical -- verbatim from DB/Cultivation/*.sql
  -- Descriptive only, NOT how a build's current Art is determined (see my_frames.cultivation_art_id
  -- below) -- every existing Art's doctrine prose is written about one specific Warframe's real kit,
  -- so this records which one, but a Warframe having a second future build with a wholly different
  -- Art is not blocked by anything here -- this column is not unique and not what a build joins on.
  warframe_id integer references wf_base.warframes(warframe_id)
);

-- A relationship is either a pairwise edge (Art<->Art or Art<->School) or a named same-school
-- cluster of 2-4 Arts (Sibling/Differentiation) -- both shapes verified as real in the doctrine
-- text, neither forceable into the other (see cultivation_relationship_members below for why this
-- needs a member join table instead of two plain FK columns).
create table if not exists wf_base.cultivation_relationships (
  relationship_id serial primary key,
  -- 'sibling_differentiation' | 'sister_art' | 'cross_school_bridge' | 'dual_citizenship' |
  -- 'inverse_shadow' -- Patrick's 5 settled types (Session 016 scoping), kept as free text with
  -- this comment as the registry rather than a Postgres enum, matching this repo's existing
  -- convention for provenance/source-type columns (e.g. ability_parameters.source).
  relationship_type text not null,
  -- Required for 'sibling_differentiation' (a cluster is inherently same-school); null for the
  -- cross-school types, where the two schools involved are implied by the members themselves.
  school_id integer references wf_base.cultivation_schools(school_id),
  description text not null,  -- human-readable summary of this specific relationship's nature
  source_ref text not null,   -- literal doctrine-text quote this claim rests on -- never inferred
  verified_note text          -- optional additional citation/cross-check
);

-- Join table rather than two plain FK columns on cultivation_relationships, because the real
-- evidence is genuinely mixed arity: Sister Art is exactly 2 Arts; Cross-School Bridge and Dual
-- Citizenship are 1 Art + 1 School (the school the Art additionally belongs to/borders); Sibling/
-- Differentiation is 2-4 Arts in the same school. One shape, no forced pairwise edges where the
-- text only supports a cluster claim (this was Patrick's explicit correction during Session 016
-- scoping after an initial pairwise-only draft didn't fit the real evidence).
create table if not exists wf_base.cultivation_relationship_members (
  relationship_id integer not null references wf_base.cultivation_relationships(relationship_id) on delete cascade,
  art_id integer references wf_base.cultivation_arts(art_id) on delete cascade,
  related_school_id integer references wf_base.cultivation_schools(school_id) on delete cascade,
  check ((art_id is not null) <> (related_school_id is not null)),
  unique (relationship_id, art_id, related_school_id)
);

alter table wf_base.cultivation_schools enable row level security;
alter table wf_base.cultivation_arts enable row level security;
alter table wf_base.cultivation_relationships enable row level security;
alter table wf_base.cultivation_relationship_members enable row level security;
create policy "Allow all access to cultivation_schools" on wf_base.cultivation_schools for all using (true) with check (true);
create policy "Allow all access to cultivation_arts" on wf_base.cultivation_arts for all using (true) with check (true);
create policy "Allow all access to cultivation_relationships" on wf_base.cultivation_relationships for all using (true) with check (true);
create policy "Allow all access to cultivation_relationship_members" on wf_base.cultivation_relationship_members for all using (true) with check (true);

grant select, insert, update, delete on wf_base.cultivation_schools to anon, authenticated;
grant select, insert, update, delete on wf_base.cultivation_arts to anon, authenticated;
grant select, insert, update, delete on wf_base.cultivation_relationships to anon, authenticated;
grant select, insert, update, delete on wf_base.cultivation_relationship_members to anon, authenticated;
grant usage, select on sequence wf_base.cultivation_schools_school_id_seq to anon, authenticated;
grant usage, select on sequence wf_base.cultivation_arts_art_id_seq to anon, authenticated;
grant usage, select on sequence wf_base.cultivation_relationships_relationship_id_seq to anon, authenticated;

-- Service-role grant up front this time -- a prior migration found this gap missing after the fact
-- (see 20260829_grant_service_role_wf_user.sql).
grant select, insert, update on wf_base.cultivation_schools to service_role;
grant select, insert, update on wf_base.cultivation_arts to service_role;
grant select, insert, update on wf_base.cultivation_relationships to service_role;
grant select, insert, update on wf_base.cultivation_relationship_members to service_role;
grant usage, select on sequence wf_base.cultivation_schools_school_id_seq to service_role;
grant usage, select on sequence wf_base.cultivation_arts_art_id_seq to service_role;
grant usage, select on sequence wf_base.cultivation_relationships_relationship_id_seq to service_role;

-- ============================================================
-- Seed: 15 canonical Schools (verbatim names from DB/Cultivation/*.sql)
-- ============================================================
insert into wf_base.cultivation_schools (name, sigil) values
  ('Crimson Sanguinary School', '✣'),
  ('Adolla Pyric School', '✹'),
  ('Hallowed Path of Heaven''s Light', '✥'),
  ('Heavenly Mandate Pantheon', '☯'),
  ('Storm Heaven Convocation', '⚡'),
  ('Moonless Veil Order', '◐'),
  ('Necropolis Dominion', '☠'),
  ('Eidolon Bone Sect', '✦'),
  ('Plague Garden Sect', '✤'),
  ('Tidal Abyss Confraternity', '≋'),
  ('Cosmic Antimatter Council', '✧'),
  ('Desert Crown Reliquary', '𓂀'),
  ('Ironclad Mountain Hall', '⬢'),
  ('Phantom Theater Conservatory', '♪'),
  ('Chronos Engineering Bureau', '⌬')
on conflict (name) do nothing;

-- ============================================================
-- Seed: 58 canonical Arts (verbatim art_name/color/doctrine from DB/Cultivation/*.sql)
-- ============================================================
insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Crimson Sanguinary School'),
  'Crimson Maiden Dao of the Severing Heart',
  '#A8002A',
  $doc$The Crimson Sanguinary School does not ask its disciples to find power. It asks them to bleed for it. Garuda Prime is the School's apex predator -- not because she is the most dangerous thing in the room, but because she has already decided the cost is worth paying. Her Dread Mirror does not conjure a shield. It tears the still-beating heart from a living body and suspends it between her and death. Her Bloodletting does not cast. It opens her own veins and converts the flow into energy, because in the Sanguinary School, the cultivator IS the resource. Seeking Talons do not hunt. They execute coordinates her blood has already chosen. The Crimson Maiden Dao of the Severing Heart teaches one truth above all others: that the most abundant energy source in any combat encounter is the suffering you are willing to endure. Garuda Prime has no limit on that willingness. That is why she is the Blood Angel.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Crimson Sanguinary School'),
  'Berserker Scripture of the Flayed Valkyrja',
  '#C92E1F',
  $doc$Valkyr Prime did not choose the Crimson Sanguinary School. Alad V chose it for her. The Corpus stripped her to the neural and rebuilt her as a specimen, and in doing so they created the most dangerous thing the School has ever produced: a cultivator whose rage has no ideological ceiling. War Cry does not buff. It broadcasts the frequency of something that has decided it cannot be killed. Ripline does not reposition. It closes distance with the arithmetic certainty of something that has been hunting you since the moment you appeared. Hysteria does not activate. It surfaces -- the Flayed Valkyrja that lives underneath the golden armor, the one that Alad V made and could not unmake. The Berserker Scripture teaches that suffering transmutes. That what enters as pain exits as killing-force. Valkyr Prime is the purest proof the School has ever produced that this equation is not metaphor. It is physics.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Crimson Sanguinary School'),
  'Cursed Blade Heresy of Seven Sins',
  '#B8362E',
  $doc$Kullervo does not cultivate. He atones. The seven crimes branded into his cells are not a history -- they are a load-bearing structure. His Wrathful Advance does not charge. It closes distance the way guilt closes distance: inevitably, without warning, already inside your guard before you recognized the movement. Recompense does not reflect damage. It conducts a transaction the School has always understood: that every wound you inflict on the already-wounded returns with interest. Collective Curse does not mark enemies. It distributes the weight of his sin across every target in range, because Kullervo has learned that shared suffering is the only form of communion available to someone carrying what he carries. He has no shields. The Sanguinary School does not offer shelter. It offers transformation -- the promise that if you burn through enough of yourself, what remains will be worth the cost. Kullervo is still burning. He has not yet decided if he believes the promise.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Adolla Pyric School'),
  'Phoenix Dao of Meteoric Wrath',
  '#FF4500',
  $doc$The Adolla Pyric School was built around a paradox that Ember Prime has spent her entire existence resolving: that fire is both the most honest and most self-destructive form of power. Fireball does not launch. It declares. Immolation does not build heat -- it manages the cost of being what Ember Prime is, the internal temperature of a cultivator who generates more thermal energy than her body is designed to contain. The Phoenix Dao teaches heat management as spiritual discipline: that the gap between Adolla Burst and self-immolation is not power, it is control. World on Fire does not burn enemies. It saturates the field with the School's fundamental premise -- that everything flammable is already burning, you are simply accelerating the timeline. Ember Prime is the Adolla Burst incarnate: the living proof that the hottest fire does not destroy its host. It refines her.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Adolla Pyric School'),
  'Solar Gate Sutra of the Wandering Lantern',
  '#F4E07A',
  $doc$Wisp Prime does not fight. She lures. The Adolla Pyric School has always acknowledged that fire has two modes -- the consuming flame and the beckoning light -- and Wisp Prime is the only cultivator who has mastered both simultaneously. Her Wisps do not buff allies. They anchor dimensional bleed-points between this plane and the solar substrate, Motes of pure stellar energy wearing the mask of helpful companions. Breach Surge does not deal damage. It opens a temporary Sol Gate in miniature, a window through which the physics of a star briefly apply to the battlefield. Sol Gate itself is not an ability. It is a theological statement: that the sun is not a celestial object but a cultivator's resource, and Wisp Prime has learned to open the door. The Solar Gate Sutra teaches that the most dangerous light is the light that looks like safety. Wisp Prime has always known this. She uses it anyway.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Adolla Pyric School'),
  'Seraphic Choir Sutra of the Ophanim Wheels',
  '#FFFAE6',
  $doc$Jade does not belong to the Adolla Pyric School because she burns things. She belongs because she IS the fire -- the holy fire, the Ophanim-wheel fire that the old texts describe as the light that burns away everything that is not essential. Her abilities cycle like liturgy: Chorus builds, Dirge reveals, Glory On High descends as solar judgment through wells of pure light that open in the battlefield like wounds in heaven. She carries the Stalker's child and still stands in direct solar communion because the Seraphic Choir Sutra teaches that holy flame does not care about the circumstances of the vessel. It cares only about the purity of the transmission. Jade's cultivation is not pyromancy. It is hymnody -- the discipline of becoming a perfect instrument for something larger than yourself, and then letting it sing through you at approximately the temperature of a star.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Hallowed Path of Heaven''s Light'),
  'Verdant Stag Sutra of the Hallowed Grove',
  '#2E7D4F',
  $doc$The Hallowed Path of Heaven's Light does not produce warriors. It produces wardens. Oberon Prime is the School's most complete expression of this principle: a druid-paladin whose cultivation treats the battlefield as a sacred grove requiring stewardship, not conquest. Smite does not attack. It adjudicates -- the white stag passing judgment on something that has disturbed the grove. Hallowed Ground does not buff. It consecrates, laying down a zone of the School's fundamental premise: that sacred space has physics, and those physics favor those who maintain them. Renewal does not heal. It tends, the way a grove tends its wounded -- patiently, continuously, without asking whether the recipient deserved the wound. Reckoning does not detonate. It concludes a liturgical cycle that began the moment Oberon Prime entered the room. The Verdant Stag Sutra teaches one discipline above all others: that power without stewardship is just destruction with better aesthetics.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Hallowed Path of Heaven''s Light'),
  'Triune Lifegiver Scripture of the Holy Bond',
  '#F0F0FF',
  $doc$Trinity Prime is not a support frame. She is a theological architecture made flesh -- the Triune Lifegiver, the living proof that the Hallowed Path's highest teaching is correct: that life, energy, and protection are not three separate gifts but one gift with three faces. Well of Life does not create a healing source. It demonstrates the School's foundational claim that life is already abundant in every environment; the cultivator's job is to make it accessible. Energy Vampire does not drain. It redistributes, conducting a transaction the Scripture calls the Holy Bond: the principle that no resource belongs to any single actor, that energy flows where need is greatest. Link does not protect Trinity Prime. It distributes incoming reality across the squad as equitably as the School distributes all things. Blessing does not save. It reminds. The Triune Lifegiver Scripture teaches that the cultivator who holds the most power is not the one who has accumulated the most -- it is the one who has given the most away.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Hallowed Path of Heaven''s Light'),
  'Inquisitor''s Penance Path of the Crimson Censer',
  '#7E1F2E',
  $doc$Harrow Prime stands at the exact point where the Hallowed Path and the Crimson Sanguinary School intersect, and he has built his entire cultivation practice on that border. His Condemn does not crowd-control. It chains, because the Inquisitor's theology holds that the first step in any redemptive process is immobilization -- you cannot be saved if you keep moving. Penance does not buff fire rate and reload speed. It self-flagellates: Harrow Prime drains his own shields, bleeds his own reserves, and converts that cost into aggression, because the Penance Path teaches that suffering freely chosen is qualitatively different from suffering inflicted. Thurible does not generate energy for allies. It swings the Crimson Censer through the battlefield, and the energy that falls from it is incense-smoke made real: the byproduct of a devotional practice so complete it has physical consequences. Covenant does not make the squad invulnerable. It concludes the liturgical cycle -- the moment when penance becomes covenant, when suffering becomes protection. The Inquisitor's Penance Path teaches that the difference between the flagellant and the saint is that the saint knows why they're bleeding.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Hallowed Path of Heaven''s Light'),
  'Restraint Mandala Sutra of the Pacifist Fist',
  '#1F4FA8',
  $doc$Baruuk Prime is the Hallowed Path's most challenging argument: that the most powerful strike available to a cultivator is the one they choose not to throw. His entire cultivation practice is built around a resource called Restraint -- a gauge that depletes not when he fights but when he exercises patience, when he absorbs damage through Desolate Hands and Lull rather than answering it. Desolate Hands does not disarm enemies. It practices non-intervention with consequences. Lull does not sleep the battlefield. It creates a zone of enforced contemplation, the Mandala Sutra's teaching made environmental. Serene Storm does not activate when Restraint runs out. It surfaces -- the Pacifist Fist that was always there underneath the discipline, the combat doctrine of a cultivator who has spent the entire encounter choosing not to use it. When Baruuk Prime finally moves, it is not because his patience broke. It is because his patience completed. The Restraint Mandala Sutra teaches that the iron monk's strength is not in his fists. It is in the length of time he keeps them open.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Heavenly Mandate Pantheon'),
  'Lotus Prince Dao of Wind-Fire Wheels',
  '#E63946',
  $doc$Nezha Prime is not a Warframe. He is a direct transplant of the Third Lotus Prince from the Fengshen Yanyi into the Warframe cosmos, and his cultivation practice makes no attempt to disguise this lineage. Fire Walker does not leave a burning trail. It traces the path of the Wind-Fire Wheels -- the legendary artifacts of Nezha of the Lotus that allow their wielder to ride fire across the sky. Blazing Chakram is not a thrown weapon. It is the Universe Ring, the chakram that Nezha used to behead the Dragon King's son, here repurposed as a healing and damage amplification tool because the Heavenly Mandate Pantheon has always understood that divine artifacts contain more functions than their legends record. Divine Spears does not crowd control. It concludes the theological argument that began with Fire Walker: that the Third Lotus Prince does not fight enemies so much as he rearranges the spatial geometry of the encounter until they have no favorable position remaining. Warding Halo does not protect. It halos -- the ring of fire and golden light that marks the Lotus Prince as something the battlefield's rules do not entirely apply to.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Heavenly Mandate Pantheon'),
  'Monkey Sage Dao of the Five Immortalities',
  '#FFB300',
  $doc$Wukong Prime requires no introduction to anyone who has read Journey to the West, because he IS Sun Wukong -- the Great Sage Equal to Heaven, the Monkey King who achieved immortality five separate times through five separate methods, the cultivator who fought the entire celestial bureaucracy to a standstill and lost only because the Buddha changed the rules of engagement. His Iron Staff is the Ruyi Jingu Bang, the pillar that once propped up the Dragon King's ocean now miniaturized to fighting weight. Cloud Walker is Jindouyun, the cloud-somersault that covers 108,000 li in a single bound. Celestial Twin is the hair-clone technique from Chapter 3, the mass-duplication that let Wukong fight armies simultaneously. Primal Fury does not activate. It remembers -- the full combat doctrine of the Monkey Sage surfaces, and everything the celestial court spent three hundred chapters trying to suppress comes back online. The Five Immortalities Dao teaches that the cultivator who cannot be permanently killed has already won every fight they will ever have. Wukong Prime achieved this before the Orokin were a civilization.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Heavenly Mandate Pantheon'),
  'Umbral Ronin Dao of the Filial Sword',
  '#1A1A1A',
  $doc$Excalibur Umbra is the Heavenly Mandate Pantheon's most tragic entry and its most necessary one. He was Dax soldier Isaah's father before the Orokin made him something else -- the Helminth stripped his identity and left the ronin who now carries the weight of having been forced to kill his own son. Slash Dash does not close distance. It expresses a sword doctrine so internalized it has become reflexive, the muscle memory of a man who has been a blade longer than he was a person. Radial Blind does not stun. It creates the moment of silence that a ronin needs -- the half-beat between the encounter and the resolution. Radial Howl is not an upgrade on Radial Blind. It is Umbra's voice, the sound of something that remembers it was a father. Exalted Blade is not Excalibur's signature ability. It is Isaah's inheritance, the sword that the son was supposed to receive, now wielded forever by the father who was made to use it against him. The Umbral Ronin Dao teaches that honor and grief are not opposites. Sometimes they are the same posture, held for the rest of your life.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Storm Heaven Convocation'),
  'Heavenly Thunder Path of the Voltaic Sovereign',
  '#FFD700',
  $doc$Volt Prime is the Storm Heaven Convocation's patriarch -- the original lightning cultivator, the Zeus-Lei Gong lineage made Warframe. His cultivation practice is the cleanest expression of the Convocation's founding thesis: that electricity is not a weapon but a medium, and the cultivator who understands this distinction has access to physics that weapon-users do not. Shock does not deal damage. It conducts -- the opening note of a circuit that Volt Prime is constantly completing. Speed does not buff movement. It overclocks the squad's relationship with time, briefly making everyone operate at the frequency Volt Prime considers normal. Electric Shield is not a defensive barrier. It is a voltage differential made architectural: stand behind it and your weapons fire through a field that adds Volt Prime's nature to every projectile. Discharge does not detonate. It broadcasts -- the Voltaic Sovereign asserting that every charged body in range is part of his circuit whether they consented or not. The Heavenly Thunder Path teaches that the cultivator who IS the storm does not need to call lightning. He is already everywhere the lightning goes.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Storm Heaven Convocation'),
  'Tesla Pirouette Dao of the Coil-Born Empress',
  '#9D4EDD',
  $doc$The Storm Heaven Convocation acknowledges natural lightning through Volt Prime and artificial lightning through Gyre Prime, and it treats them as sister arts rather than the same art -- because Pablo and the development team specifically split her from Volt's lineage to make a point. Gyre Prime is not a simplified Volt. She is a ballerina automaton whose body is a Tesla coil, whose every rotation generates the mechanical electricity that the Coil-Born Empress Dao calls the superior form of the art: manufactured, precise, tunable, reproducible. Coil Horizon does not discharge. It broadcasts a specific frequency -- the resonance frequency of the battlefield's ionization state after Gyre Prime has been spinning in it. Cathode Grace does not give her critical chance. It rewards the discipline of maintaining rotational momentum, the pirouette as cultivation practice. Rotorswell does not damage. It accumulates -- the patient buildup of a conductor who understands that the most powerful discharge requires the longest charge. The Tesla Pirouette Dao teaches that the difference between natural and artificial lightning is the same as the difference between a river and an aqueduct: one is more powerful, but only one goes exactly where you need it.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Storm Heaven Convocation'),
  'Kinetic Velocity Scripture of the Redline Saint',
  '#E63946',
  $doc$Gauss Prime is the Storm Heaven Convocation's most extreme position: that speed is not a tactical advantage but a cultivation philosophy, and that the cultivator who has fully committed to velocity has access to a form of physics that stationary fighters cannot reach. Mach Rush does not move Gauss Prime across the battlefield. It conducts a physics experiment -- what happens to kinetic energy when you run it through a body that has been engineered to accumulate rather than dissipate it. Kinetic Plating does not provide damage reduction. It converts incoming kinetic force into battery charge, because the Redline Saint's central teaching is that every hit you take is energy you get to use later. Thermal Sunder does not apply heat and cold. It demonstrates what happens to matter when you run Gauss Prime's accumulated kinetic charge through it in alternating polarity. Redline does not overclock. It completes -- the moment when the battery is full, when all the accumulated velocity and impact and thermal conversion reaches its discharge point, and Gauss Prime briefly operates at the frequency his frame was actually designed for. The Kinetic Velocity Scripture teaches that standing still is always the least efficient thing a cultivator can do.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Storm Heaven Convocation'),
  'Tengu Dao of the Falling Plume',
  '#D4AF37',
  $doc$Zephyr Prime's codename is Tengu -- the Japanese mountain spirit of wind and martial arts -- and her cultivation practice is exactly what that name implies: a sky-bound combat discipline that treats the ground as an optional relationship. Tail Wind does not grant mobility. It establishes the Tengu Dao's fundamental premise: that the cultivator who controls vertical space controls the encounter, because everything dangerous is designed to fight something at ground level. Airburst does not push enemies. It demonstrates aerodynamic authority -- the Falling Plume technique applied to crowd control, wind as architectural force. Turbulence does not reflect projectiles. It wraps Zephyr Prime in a personal weather system that makes the physics of incoming fire disagree with themselves. Tornado does not crowd-control. It concludes the Tengu Dao's argument: that a cultivator who can generate self-sustaining atmospheric vortices does not need to fight the battlefield. She IS the battlefield. The Tengu Dao of the Falling Plume teaches that feathers fall slowly not because they are weak but because they have negotiated a different relationship with gravity than everything else.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Storm Heaven Convocation'),
  'Hoplite Aegis Dao of the Worthy Spear',
  '#B87333',
  $doc$Styanax is the Storm Heaven Convocation's ground-anchor -- the hoplite to Zephyr Prime's Tengu, the cultivator who has decided that the most powerful storm is the one that cannot be moved. His lineage is Astyanax of Troy filtered through the Achaean phalanx tradition: the worthy spear of a civilization that decided the best defensive technology was a wall of men who had decided not to retreat. Axios Javelin does not throw a spear. It adjudicates range -- the hoplite's fundamental tactical calculation: how far can I project force while keeping my formation intact. Final Stand does not rally. It concludes the Hoplite Aegis Dao's central teaching: that the cultivator who calls down javelin storms on their own position has already won the philosophical argument about who owns this piece of ground. Tharros Strike does not debuff enemies. It strips the courage that enemies have borrowed from not yet having met Styanax. Rally Point does not heal or grant energy. It pays dividends on the investment of standing firm -- the phalanx principle that every member who holds makes every other member harder to break.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Storm Heaven Convocation'),
  'Shieldmaiden Aegis Dao of the Balefire Storm',
  '#4A90E2',
  $doc$Hildryn Prime runs on shields the way other cultivators run on energy, and the Storm Heaven Convocation has always understood this as a theological position rather than a mechanical one: that the cultivator who has decided to make protection itself into power has access to an entirely different kind of strength. Haven does not protect allies. It extends Hildryn Prime's shield economy across the squad, making everyone a node in the Aegis network. Pillage does not strip enemy armor and shields. It harvests -- the Shieldmaiden's fundamental transaction: your defenses become my defenses, because in the Aegis Dao, all shields belong to the person who needs them most. Balefire Charger does not deal damage. It converts shield overage into Norse lightning-pistol fire, because Hildryn Prime has Norse Valkyrie lineage (Hildr, the battle-maiden who chose the slain) and her excess protection must go somewhere. Aegis Storm does not create a zone of crowd control and damage. It expresses the Shieldmaiden's complete doctrine: aerial barrage delivered from a position of absolute defensive superiority, the Norse battle-maiden who has decided that the sky belongs to her shields.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Storm Heaven Convocation'),
  'Polar Star Sutra of the Magnetar''s Embrace',
  '#A8DADC',
  $doc$Mag Prime is the Storm Heaven Convocation's cosmologist -- the cultivator whose art operates not at the scale of weather or velocity but at the scale of fundamental forces. Her lineage is the magnetar: the neutron star variant that generates the most powerful magnetic fields in the observable universe, the astronomical object whose influence distorts the physics of everything within its range. Pull does not drag enemies toward Mag Prime. It demonstrates the Polar Star Sutra's opening lesson: that the cultivator who controls magnetic force controls the geometry of every metallic and electrically-charged object in range. Magnetize does not create a singularity. It applies the Magnetar's Embrace to a single target -- a localized demonstration of what happens when you concentrate the Sun's magnetic field into an area the size of a head. Polarize does not strip armor. It conducts a field reversal through the battlefield's magnetic state, and the armor shattering and shield charging are byproducts of the physics, not the intention. Crush does not kill. It concludes -- the Magnetar's Embrace applied at full scale, the moment when Mag Prime stops demonstrating and starts asserting that the magnetic field is, always has been, and will remain hers.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Moonless Veil Order'),
  'Smoke Shadow Dao of the Patron Assassin',
  '#3D3D3D',
  $doc$The Moonless Veil Order begins and ends with Ash Prime. He is not the most dramatic practitioner of the shadow arts - Loki deceives more elegantly, Ivara hunts more patiently, Mirage dazzles more completely. But Ash Prime is the patron saint of the Orokin assassination network, the original smoke and the original silence. Every shinobi-cultivator in the Order traces lineage back to the moment a blade left no witness and a body left no warmth - only ash. His Smoke Screen does not hide him; it erases the evidence that he was ever present. Teleport does not relocate. It conducts a finisher - the Smoke Shadow Dao's fundamental transaction, covering the distance between here and the target's back as a single unbroken motion. Shuriken does not deal damage. It marks - the Patron Assassin's targeting system, designating who has been chosen for the Blade Storm's attention. Blade Storm does not strike. It adjudicates, shadow-clones delivering verdicts across the entire room simultaneously, each clone a copy of the same irrevocable decision. The Ashen Patriarch does not fight. He finalizes.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Moonless Veil Order'),
  'Trickster Mirage Dao of the Hundred Decoys',
  '#2A4A6B',
  $doc$Loki Prime is the Moonless Veil Order's philosopher. Where Ash Prime is the Patron Assassin and Ivara Prime is the Silent Huntress, Loki Prime is the one who has decided that the most efficient combat doctrine is the one that never requires you to be where the enemy is pointing. His Norse lineage is obvious and unashamed: he is Loki, the Trickster God, the cultivator of the Aesir who understood that the gods who won through cunning outlasted the gods who won through strength. Decoy does not create a distraction. It creates a liability -- something the enemy has to address, which means something that is not you. Invisibility does not hide Loki Prime. It removes him from the enemy's threat assessment entirely, which is a different and more powerful thing. Switch Teleport does not reposition. It redistributes -- the Trickster's fundamental technique: making the enemy's position your position and your position the enemy's problem. Radial Disarm does not remove weapons. It concludes the Hundred Decoys argument: the moment when every enemy in range realizes simultaneously that they have been fighting a set of premises Loki Prime never accepted.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Moonless Veil Order'),
  'Midnight Quiver Dao of the Silent Artemis',
  '#7CFFB2',
  $doc$Ivara Prime's ability is literally called Artemis Bow. Her visual design references the poison-dart frog -- a creature whose entire survival strategy is to advertise its lethality while remaining completely unreachable. Her cultivation practice is the most patient in the Moonless Veil Order: Prowl, the signature ability, does not just provide invisibility. It provides invisibility plus pickpocket, the Silent Artemis moving through the battlefield as both predator and scavenger, taking what she needs from enemies who never learned she was there. Quiver does not provide utility arrows. It provides tactical theology -- Dashwire for positioning, Cloak for squad concealment, Noise for misdirection, Sleep for the moment when patience has located the optimal shot. Navigator does not guide projectiles. It rides them -- Ivara Prime becoming the arrow, following it through its arc to ensure it arrives exactly where the Silent Artemis intended. Artemis Bow does not fire. It concludes -- the full weight of the Midnight Quiver Dao expressed in a single volley from a cultivator who has been invisible long enough to make every shot count.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Moonless Veil Order'),
  'Harlequin Eclipse Dao of Mirrored Stagecraft',
  '#FFD23F',
  $doc$Mirage Prime is the Moonless Veil Order's grand illusionist -- the cultivator whose art operates in the space between what the enemy sees and what is actually happening. Her Commedia dell'Arte lineage is precise: she is the Harlequin, the masked performer whose entire theatrical tradition is built around the gap between the character's apparent buffoonery and the performer's absolute technical mastery. Hall of Mirrors does not create clones. It creates a liability calculation that no enemy can correctly complete -- four identical Mirages, each behaving exactly like the real one, and no available method for determining which is which under fire. Eclipse does not toggle between solar damage boost and lunar damage reduction. It conducts the Harlequin Eclipse Dao's central teaching: that the cultivator who has mastered both solar and lunar qi phases has access to a form of adaptability that single-element practitioners never will. Sleight of Hand does not booby-trap pickups. It converts the battlefield's resource economy into an ambush. Prism does not deal damage. It concludes the Mirrored Stagecraft performance -- the moment when the Phantom Queen stops performing and the audience realizes they were never watching a show. They were inside one.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Moonless Veil Order'),
  'Blood-Moon Wolfpack Dao of the Severed Heads',
  '#7B1F3D',
  $doc$Voruna's cultivation lineage is Lithuanian -- the forest goddess Zvorunna, the hunter-deity of the Baltic tradition who ran with wolves and whose worship predates the Indo-European migrations. What makes Voruna unique in the Moonless Veil Order is that she did not join the wolfpack. She BECAME the wolfpack, fusing her four dead wolves into herself through a Continuity ritual that the Blood-Moon Wolfpack Dao treats as the supreme act of shadow cultivation: the complete dissolution of the boundary between hunter and hunted, between predator and pack. Ulfrun's Descent does not charge. It is a wolf hitting its target -- the singular, total commitment of a predator whose entire evolutionary history has been building toward this moment. Fangs of Raksh does not apply status effects. It applies the wolfpack's accumulated knowledge of where bodies break. Shroud of Dynar does not provide invisibility. It conducts the Dao's central teaching: the moment before the wolf strikes is not absence. It is the most complete form of presence. Lycath's Hunt does not restore health and energy on kills. It pays the wolfpack dividend -- the ancient compact between Voruna and her dead wolves, that every kill feeds them all.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Moonless Veil Order'),
  'Wailing Sound Dao of the Sidhe Keening',
  '#B8E1F0',
  $doc$Banshee Prime's Irish bean sidhe lineage is not metaphor. The bean sidhe (anglicized banshee) is the death-herald of Gaelic tradition -- the woman whose keening wail announces that someone in the family is about to die. Banshee Prime does not fight enemies. She announces their deaths with acoustic precision and then makes the announcement true. Sonic Boom does not push enemies. It establishes acoustic authority -- the opening declaration that this space now operates on Banshee Prime's sound frequencies. Sonar does not reveal weak points. It conducts a complete acoustic mapping of every target in range, identifying precisely where the bean sidhe's knowledge of anatomy has located the optimal keening frequency. Silence does not mute abilities. It applies the Moonless Veil Order's deepest discipline: that the cultivator who controls what sounds exist in an environment controls what is real in that environment. Sound Quake does not damage. It concludes the Sidhe Keening -- the full acoustic weight of the death-herald expressed as ground-level subsonic devastation, the wail that was always both announcement and cause.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Necropolis Dominion'),
  'Black Shroud Dao of the Soul Reaper',
  '#5E2D8C',
  $doc$Nekros Prime is the Necropolis Dominion's patriarch -- the cultivator who established the School's foundational premise that death is not an endpoint but a resource, and that the practitioner who has mastered the Black Shroud Dao has access to every death that has occurred in their vicinity. Soul Punch does not kill. It harvests the soul-residue of living enemies while they still occupy their bodies -- a technique that the Dao describes as the most efficient form of cultivation, because it produces the resource without requiring the death. Terrify does not apply a fear status effect. It conducts a revelation: every enemy in range suddenly understands that Nekros Prime can see them at the soul level, and what the soul level reveals about their survivability is, by all accounts, not encouraging. Desecrate does not loot additional resources from corpses. It processes -- the Soul Reaper's fundamental agricultural practice, ensuring that no death in range produces less than its full yield. Shadows of the Dead does not summon minions. It reinstates -- pulling the soul-residue of fallen enemies back into their bodies and drafting them into the Nekros Prime's Black Shroud economy, the proof that in the Necropolis Dominion, dying in the Soul King's presence is simply a change of employment.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Necropolis Dominion'),
  'Tempestarii Reaper Dao of the Twin Forms',
  '#0F1F2E',
  $doc$Sevagoth is the Necropolis Dominion's most structurally complex cultivator because he is, in the most literal sense, two cultivators: the captain who died aboard the ghost-ship Tempestarii, and the Shadow that continued piloting after the captain's death, navigating the dead ship through the void until something brought both of them back into operational status. Grasp of Lohk does not drain. It reaches -- the captain's hand extended from the spectral plane into the material one, pulling energy across the boundary between what is alive and what is not. Gloom does not apply a slow aura. It bleeds reality -- the Tempestarii's influence spreading outward from Sevagoth's position, making the local physics slightly more sympathetic to the dead. His Shadow does not fight separately. It expresses the Twin Forms Dao's central teaching: that the body and the soul are not one thing that separates at death but two things that were always distinct, and the cultivator who has experienced that distinction has access to combat forms that the merely-living cannot reach. Exalted Shadow does not transform. It merges -- the moment when the captain and his Shadow stop operating in parallel and become, briefly, what they were before the Tempestarii went dark.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Necropolis Dominion'),
  'Faceless Cavalry Dao of the Mirror That Accuses',
  '#8B0000',
  $doc$Dagath's cultivation lineage is the Irish Dullahan -- the headless horseman who rides to a name, stops, and calls it out, and whoever owns that name dies. But Dagath adds a dimension the Irish tradition does not contain: the Mirror That Accuses, a reflective surface that does not show you what you look like but what you have done. Her cultivation practice is spectral justice, the Necropolis Dominion's most morally specific art -- not generalized death-cultivation but targeted adjudication. Wyrd Scythes do not orbit. They orbit and record -- phantom weapons that remember every enemy they have passed through. Grave Spirit does not provide a death-cheat mechanic. It conducts a negotiation with the boundary between alive and dead: Dagath agrees to keep fighting in exchange for the right to cross back once when she shouldn't be able to. Doom does not apply a debuff. It reads the judgment from the Mirror -- the moment when a target's accumulated actions have been assessed and the verdict has been delivered. Khra's Reign does not deal damage. It executes the Faceless Cavalry Dao's conclusion: the headless rider arriving at the name she was called to, and everything in range learning that they share it.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Eidolon Bone Sect'),
  'Void Revenant Warden Dao of the Eidolon Bone Sect',
  '#CFC7B5',
  $doc$The Eidolon Bone Sect does not recruit - it devours. Revenant Prime was a Tenno who entered the Plains and did not return as himself. The Eidolon took him apart and rebuilt something older. His Mesmer Skin does not protect; it hypnotizes, because predators do not need armor - they need compliance. His Enthrall does not ally; it owns, because a being remade by a Sentient apex does not ask for loyalty. Reave does not dash; it harvests the soul-residue that living things shed when they run. Danse Macabre does not channel. It expresses - the full Eidolon nature that Revenant Prime carries surfacing as a spinning death-broadcast, the proof that the Tenno who entered the Plains was a raw material and what emerged was something the Eidolons consider complete. The Consumed King is the proof that transcendence and violation are the same event seen from different sides. He did not choose the Eidolon Bone Sect. The sect chose what was left of him.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Plague Garden Sect'),
  'Tang Sect Spore Dao of the Serpent Contagion',
  '#7FB800',
  $doc$Saryn Prime's name derives from Sarin -- the nerve agent -- and her cultivation practice makes no attempt to soften this lineage. She is the Tang Sect's most complete expression: the cultivator whose art is not fighting but infection, not combat but cascade. Spores do not deal damage. They establish a network -- the Serpent Contagion's opening move, seeding the battlefield with biological infrastructure that will do the work while Saryn Prime attends to other matters. Molt does not provide a decoy. It sheds -- the serpent skin-shedding technique that refreshes the Spore network's physical anchor while leaving enemies confused about which body to target. Toxic Lash does not add a damage type to melee. It converts Saryn Prime's physical contact into a vector, because in the Tang Sect tradition, every surface the practitioner touches is a potential transmission point. Miasma does not deal damage across the field. It concludes the Serpent Contagion argument: the moment when the Spore network reaches critical density and the Tang Sect's fundamental premise becomes undeniable -- that you were already infected before you realized the fight had started. Saryn Prime does not clear rooms. She cultivates them.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Plague Garden Sect'),
  'Infested Cordyceps Dao of the Mutating Host',
  '#7A1A2C',
  $doc$Nidus Prime's Latin name means nest, and the Infested Cordyceps Dao treats this etymology as a complete mission statement. He is not a Warframe who uses Infested abilities. He is a Warframe who has decided to become the Helminth's most cooperative host -- the cultivator who understood that the Infested are not a disease to be resisted but a cultivation partner to be negotiated with. Virulence does not deal damage. It propagates -- the opening note of the Mutation Stack economy that is Nidus Prime's entire cultivation practice. Larva does not crowd-control. It centralizes, pulling the available biomass into a configuration that serves the nest's needs. Parasitic Link does not buff an ally or drain an enemy. It conducts the Helminth compact: a temporary merger between Nidus Prime's Mutation Stack economy and another body's biology, the Infested Monarch demonstrating that the nest boundary is negotiable. Ravenous does not heal or generate maggots. It cultivates -- the Cordyceps network spreading outward from Nidus Prime's position, converting the local terrain into something that prefers his presence. The Infested Monarch does not grow stronger by fighting. He grows stronger by remaining in the nest long enough for the nest to grow around him.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Plague Garden Sect'),
  'Jorogumo Silk Dao of the Venomed Gown',
  '#1A0F1F',
  $doc$Oraxia's cultivation lineage is the Jorogumo -- the Japanese spider-woman demon of Edo-period folklore, a creature that appears as a beautiful woman to lure victims before revealing its true form. The qipao gown, the web-cocoon architecture, the Toxin progenitor role in the Plague Garden Sect: all of these point to a cultivation practice whose central technique is the gap between appearance and reality. The Venomed Gown Dao does not teach straightforward toxin cultivation. It teaches the ambush -- the principle that the most efficient poison delivery system is the one the target helps you deploy because they do not recognize it as a threat until it has already worked. Oraxia's silk does not restrain. It invites -- targets walking into the web because the Jorogumo has made the web look like the safest place in the room. Her toxin does not attack. It concludes a hospitality that was always hostile. In the Plague Garden Sect, Saryn Prime is the open war and Oraxia is the closed door that you walked through because it was open when you arrived.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Plague Garden Sect'),
  'Mycelium Sprout Dao of the False Morel',
  '#FF6B6B',
  $doc$Nokko's name derives from kinoko (Japanese: mushroom) and Nukkulaelae Atoll -- a Pacific island ecosystem whose coral network functions like a mycelium web, connecting disparate surface features through an invisible underground intelligence. She is the Plague Garden Sect's youngest disciple and its most ecologically precise one: where Saryn Prime cultivates plague and Nidus Prime cultivates nest, Nokko cultivates network. Her mushrooms are named after real toxic fungi -- False Morels, Stinkhorns, Death Caps -- and her cultivation practice is the mycelium network's fundamental principle: that the most powerful defense is one that the attacker cannot see because it lives underground. The False Morel Dao teaches that toxin does not need to be dramatic. It needs to be pervasive. The mushroom does not fight the forest. It IS the forest's communication network, its immune system, its memory -- and everything that walks through the forest walks through the mushroom whether it knows it or not. Nokko is the Sect's proof that ecological integration is the ultimate form of toxin cultivation.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Plague Garden Sect'),
  'Atomic Brutalist Dao of the Crucible Core',
  '#D4D700',
  $doc$The Plague Garden Sect cultivates toxin through living vectors - spores, mycelium, venom. Qorvex is the sect''s only inorganic disciple, and its most dangerous. Albrecht Entrati did not build him to poison; he built him to contain. The Chyrinka Pillars are dosimetry made architectural - radiation measured, concentrated, and discharged as structural theology. Disometric Guard does not defend; it converts incoming damage into outgoing Radiation, because a reactor does not absorb energy, it processes it. Fused Reservoir does not debuff enemies. It saturates -- the Atomic Brutalist Dao's central technique: creating zones of concentrated radioactive presence that alter the physics of everything inside them. The Crucible at his core is not a weapon. It is a power plant that has decided the most efficient energy output is enemy dissolution. Qorvex is the proof that toxin does not require biology to reach its highest expression -- it requires only a source, a medium, and a cultivator willing to become the reactor. The Reactor Apostle does not irradiate his enemies. He irradiates his environment, and his enemies happen to be standing in it.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Plague Garden Sect'),
  'Elemental Transmutation Dao of the Void Alchemist',
  '#4A3728',
  $doc$Lavos Prime is the Plague Garden Sect's alchemist -- the cultivator whose art is not poison as a fixed state but poison as a transmutation process, the medieval-alchemical tradition of elemental conversion applied to Warframe combat. His passive does not charge abilities. It charges elements -- Lavos Prime cycling through the four classical elements continuously, every melee hit loading the next ability with whatever the alchemical cycle has currently produced. Vial Rush does not deal damage. It seeds -- leaving elemental residue across the terrain that subsequent abilities will interact with. Ophidian Bite does not transmute enemies. It applies the Void Alchemist's fundamental operation: the forced elemental conversion of a living body, demonstrating that the alchemical tradition's promise of lead-into-gold applies equally to flesh-into-something-more-useful. Transmutation Probe does not combine elements. It conducts the Dao's central teaching -- that no element in the Plague Garden Sect's toolkit is the final form, that every toxic state is a precursor to a more refined toxic state. Metamorphosis does not buff. It completes the alchemical cycle, the Void Alchemist momentarily embodying the Great Work -- the philosopher's stone of combat cultivation, the brief instant when every element is simultaneously available and the transmutation is total.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Tidal Abyss Confraternity'),
  'Kraken Pirate Dao of the Davy Tempest',
  '#1B6E8C',
  $doc$Hydroid Prime's cultivation lineage runs through Davy Jones, the Kraken, and every sea-pirate tradition that understood the ocean not as an obstacle but as a dominion. The Tidal Abyss Confraternity was founded on this understanding: that water is not a medium but a sovereign territory, and the cultivator who has claimed it has access to a form of authority that land-based practitioners cannot contest. Tempest Barrage does not bombard from above. It calls -- the pirate king signaling his fleet, except the fleet is made of water and it comes from underneath. Tidal Surge does not provide mobility. It conducts the Kraken Pirate Dao's central movement principle: that the cultivator who is made of water cannot be stopped by obstacles, only redirected. Undertow does not create a puddle. It opens a portal to the Tidal Abyss -- the deep-water dominion that Hydroid Prime rules, into which enemies disappear and from which they do not return in their original form. Tentacle Swarm does not spawn crowd control. It calls the Kraken -- the apex predator of the Tidal Abyss Confraternity's cosmology, the thing that waits at the bottom of every ocean for a pirate king worthy of summoning it.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Tidal Abyss Confraternity'),
  'Eternal Winter Dao of the Snow Globe Sovereign',
  '#A8E6FF',
  $doc$Frost Prime is the Tidal Abyss Confraternity's emperor of stillness -- the Jack-Frost/Jotunn elemental cultivator who has understood that the most powerful defensive technique in the Confraternity is not water's fluidity but water's terminal state: the ice that does not move, the snow that does not yield, the glacier that defeats mountains not through force but through patience measured in geological time. Freeze does not immobilize. It concludes a thermal argument -- the Snow Monarch establishing that his temperature is the local temperature. Snow Globe does not create a defensive dome. It creates a sovereign territory -- an enclosed space where Frost Prime's physics apply, where the Eternal Winter Dao's central teaching is environmental law: nothing moves faster than the Snow Globe Sovereign permits. Avalanche does not deal damage. It expresses the Confraternity's most complete defensive offense: stripping armor with the casualness of something that has never needed armor because it IS the cold, and dealing damage as the byproduct of a temperature assertion. The Snow Monarch does not fight enemies. He creates conditions where they cannot fight him.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Tidal Abyss Confraternity'),
  'Shattered Glass Dao of the Vitrified Martyr',
  '#F5F5F0',
  $doc$Gara Prime did not choose the Tidal Abyss Confraternity's crystalline branch. She became it -- a warrior who shattered herself against a Sentient to stop the invasion, whose sacrifice created the Eidolons as the crystallized echo of her final act. The Shattered Glass Dao does not pretend this history is comfortable. It treats it as the cultivation practice's load-bearing structure: that the most powerful glass was once whole, and broke for a reason that mattered more than staying whole. Shattered Lash does not deal damage. It extends Gara Prime's shattered self as a weapon, the Vitrified Martyr making her own fragmentation into an attack vector. Splinter Storm does not provide a damage buff. It conducts the Dao's central teaching: that breaking is a condition, not an ending, and the cultivator who has already broken can make breaking work for her. Spectrorage does not crowd control. It creates a mirror maze -- the Shattered Glass Dao's hall of reflections, where every enemy sees itself at the moment of maximum vulnerability. Mass Vitrify does not crystallize terrain. It remembers -- the moment of Gara Prime's original sacrifice, the wall of glass she became to stop what was coming, here reconstructed around whatever needs stopping now.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Tidal Abyss Confraternity'),
  'Geode Aurora Dao of the Prismatic Vow',
  '#FFB000',
  $doc$Citrine's cultivation lineage is the merchant's stone -- the yellow quartz that commercial tradition associates with abundance, clarity, and the transformation of raw material into refined value. She is the Tidal Abyss Confraternity's crystallographer: where Gara Prime works with shattered glass and Frost Prime works with ice, Citrine works with the crystal in its most precise form -- the geological structure that took millennia to achieve its lattice and now refracts everything that passes through it into its component frequencies. Her lore establishes that she fossilized her lovers Belric and Rania in crystal during the Old War, the Prismatic Vow being the cultivation technique she used to preserve what she could not save. Crystallize does not crowd control. It preserves -- the Geode Aurora Dao's foundational operation, applying the same technique to enemies that Citrine once applied to love. Fractured Blast does not detonate crystals. It harvests -- the prismatic conversion of crystalline structure into applicable force. Preserving Shell does not provide damage reduction. It vows -- the Prismatic Vow renewed, the crystal lattice extended outward to include whoever Citrine has decided deserves preservation this encounter. Dazzling Vow does not debuff enemies. It refracts them -- the four-element prism expressing the Geode Aurora Dao's highest teaching: that the cultivator who can split any force into its components can also reconstruct any force from its components.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Tidal Abyss Confraternity'),
  'Silver Chain Huntress Dao of the Mistress and Beast',
  '#C0C0C0',
  $doc$Khora Prime's cultivation lineage runs through Diana the huntress and the dominatrix archetype simultaneously -- a combination that the Silver Chain Huntress Dao treats not as a contradiction but as a unity, because both traditions are ultimately about the same thing: the precise control of power through the management of tension. Her companion Venari is not a pet. She is the soul of Ballas's lover, housed in a kavat's body by Orokin technology, which makes Khora Prime's relationship with Venari simultaneously a hunting partnership and a haunted vigil. Whipclaw does not deal damage. It conducts -- the crack of the silver chain across the battlefield, the sound that both the Diana and dominatrix traditions recognize as the declaration of authority. Ensnare does not crowd control. It applies the Chain Empress's fundamental technique: the whip that does not hurt but cannot be ignored, the restraint that is more complete than any barrier. Venari does not fight alongside Khora Prime. She completes her -- the Beast to the Mistress, the kavat soul to the chain-wielding hunter, the two halves of a cultivation practice that has always understood that the most sophisticated combat doctrine is the one conducted between two entities who have learned to operate as one.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Cosmic Antimatter Council'),
  'Black Hole Antimatter Dao of the Molecular Empress',
  '#FF1493',
  $doc$Nova Prime is named after the stellar event that occurs when a white dwarf accumulates enough mass to trigger runaway nuclear fusion -- a star that becomes temporarily brighter than its entire galaxy before collapsing into something denser and stranger than it was. The Black Hole Antimatter Dao takes this etymology as a mission statement. Null Star does not orbit. It accumulates -- Nova Prime gathering the antimatter that her Cosmic Antimatter Council cultivation produces as a byproduct of existing, storing it as orbiting damage reduction that also happens to deal molecular deconstruction on contact. Wormhole does not provide mobility. It conducts Einstein-Rosen bridge engineering on a tactical scale -- the Molecular Empress creating stable spacetime shortcuts that the Antimatter Dao recognizes as one of the Cosmic Antimatter Council's signature techniques. Antimatter Drop does not launch a projectile. It deploys -- an antimatter singularity that accumulates kinetic energy from everything that strikes it, the physics of annihilation applied to the principle that the most efficient weapon is one the enemy helps you build. Molecular Prime does not debuff. It rewrites -- the fundamental molecular structure of every entity in range altered to be significantly more reactive to force, the moment when the Ton-618 Dao reveals that the Molecular Empress was never fighting the enemy. She was preparing the medium.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Cosmic Antimatter Council'),
  'Rift Hybrid Dao of the Twin-Born Heir',
  '#E8E4D0',
  $doc$Caliban is the only Warframe in the Cosmic Antimatter Council who holds simultaneous citizenship in the Ironclad Mountain Hall, because his cultivation practice is the meeting point of two traditions that should be mutually exclusive: Sentient adaptive resistance and Warframe combat capability. He is Erra's creation, the heir of twin kingdoms -- Sol and Tau, the Tenno civilization and the Sentient civilization -- and his Adaptive Armor is the architectural proof that the Rift Hybrid Dao's central teaching is correct: that the cultivator who can learn from incoming damage and restructure their defenses in real time has access to a form of durability that static armor values cannot reach. Fusion does not summon Conculysts and Battalysts. It calls family -- the Sentient kindred who recognize Caliban as the Twin-Born Heir, the half-Sentient who carries both bloodlines without being fully claimed by either. Razor Gyre does not deal damage. It expresses the hybrid nature -- Sentient energy and Warframe mechanics combining into a combat form that neither tradition could produce independently. The Rift Hybrid Dao teaches that the cultivator born between two worlds does not have to choose. The space between worlds is itself a cultivation ground.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Cosmic Antimatter Council'),
  'Void-Shattered Dao of the Three Voices',
  '#9ACD32',
  $doc$Xaku Prime is three Warframes who failed separately and succeeded together -- Xata, Lohk, and Fass/Ris, their fragments fused through Void exposure into something none of them was individually. The Void-Shattered Dao does not treat this as a tragedy. It treats it as the Cosmic Antimatter Council's most complete proof that the Void does not destroy; it recombines. Xata's Whisper does not add Void damage. It speaks -- the first of the Three Voices adding its frequency to the weapons of anyone in range, the Voidtongue language that Xaku Prime inherited from three different incomplete Warframes finding its first expression through projectiles. Grasp of Lohk does not steal weapons. It extends Lohk's reach across the Void boundary -- the second Voice manifesting as the capacity to unmake an enemy's offensive capability through dimensional contact. The Lost does not offer three separate abilities. It offers three perspectives -- Deny, Accuse, Gaze -- each one a different Void-sovereign technique from a different one of Xaku Prime's component sources. Xata's Whisper does not complete them. The Void completes them. The Son of the Void is the proof that the most powerful cultivator is not the one who is whole but the one who has learned what the fracture reveals.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Cosmic Antimatter Council'),
  'Mind Veil Dao of the Primordial Night',
  '#6A0DAD',
  $doc$Nyx Prime's Greek lineage is Nyx, the primordial goddess of Night who was old before the Olympians were gods -- one of the first-generation cosmological forces whose presence even Zeus was reluctant to contest. The Cosmic Antimatter Council places her here because the Mind Veil Dao operates at the same scale: not tactical psychic manipulation but cosmological psychic saturation, the Primordial Night's influence spreading until it is the local reality rather than an effect applied to it. Mind Control does not dominate an enemy. It recruits from the Primordial Night's perspective -- the goddess who is old enough that every mind she enters was always, on some level, hers to enter. Psychic Bolts does not deal damage. It conducts a mass revelation: every target struck suddenly understands their own vulnerability at the deepest possible level, the Mind Veil pulling back to show them what they look like from the outside of their own skull. Chaos does not confuse enemies. It releases -- the Primordial Night's fundamental state, the condition that existed before order was imposed on the cosmos, briefly reinstalled in every mind in range. Absorb does not provide damage immunity. It completes the Psychic Empress's cultivation cycle: every attempt to damage her becomes part of her, the Primordial Night absorbing what is thrown against it and returning it as the darkness it always was.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Desert Crown Reliquary'),
  'Pharaoh Sand Dao of the Deshret Crown',
  '#D4A017',
  $doc$Inaros Prime's name is shared by two historical pharaohs of the 26th and 27th Dynasties -- rulers whose reign defined the late period of Egyptian royal authority, the kings who held the Deshret Crown when the old world was ending and kept it held. The Desert Crown Reliquary is built entirely around this lineage: the cultivation practice of the god-king, the pharaoh whose authority is not granted by armies but by the desert itself. Desiccation does not blind. It commands the sand -- the Deshret Crown's first assertion of territorial authority, the desert answering its king. Devour does not incapacitate. It entombs -- the sarcophagus function that Egyptian royal theology treated as transformation rather than death, the cultivator demonstrating that Inaros Prime's domain includes the boundary between living and preserved. Sandstorm does not deal damage. It expresses sovereignty -- the pharaoh making the claim that this airspace is the desert's airspace, and the desert belongs to Inaros Prime. Scarab Swarm does not apply a debuff. It consecrates -- the sacred scarab of Egyptian tradition employed as both biological weapon and cultural statement, the god-king whose cultivation is inseparable from his theology. With 2,415 base health and no shields, Inaros Prime does not survive because he is defended. He survives because the desert does not kill its pharaoh.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Ironclad Mountain Hall'),
  'Iron Hide Dao of the Charging Titan',
  '#B89F50',
  $doc$Rhino Prime is the Ironclad Mountain Hall's founding argument: that the simplest cultivation doctrine, executed without compromise, produces power that more sophisticated practitioners spend their entire careers trying to surpass. He does not have a complex lore lineage. He has Iron Skin -- the Overguard of a cultivator who decided that the most efficient defensive technology is not adaptability or avoidance but the willingness to simply absorb more than the enemy can produce. Rhino Charge does not provide mobility. It is a weapon with a movement mechanic attached: the Charging Titan's fundamental combat statement, that a 200-kilogram mass moving at speed is a force multiplier that no ability description fully captures. Roar does not buff damage. It broadcasts -- the sound of the Ironclad Mountain Hall's founding principle, a noise that functions as a tactical asset because everything in range that hears it recalibrates its threat assessment. Rhino Stomp does not apply a time slow. It concludes the Iron Hide Dao's argument: the Charging Titan arriving at his destination, the ground registering that something has landed, time having opinions about the force involved. The Ironclad Mountain Hall was built for Rhino Prime, and Rhino Prime was built for the Mountain Hall, and neither of them is apologizing for it.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Ironclad Mountain Hall'),
  'Earthbound Titan Dao of the Petrified Gaze',
  '#6B4423',
  $doc$Atlas Prime's cultivation lineage runs through two mythological traditions simultaneously: the Greek Titan Atlas who holds the world on his shoulders, and the Medusa-adjacent Petrified Gaze that transforms contact into stone. The Earthbound Titan Dao treats both as expressions of the same principle -- that the cultivator who is most completely connected to the earth beneath them has access to a form of power that the sky-bound and water-bound and fire-bound traditions cannot reach, because the earth does not move and the cultivator who IS the earth shares that permanence. Landslide does not charge. It conducts geological time at combat speed -- the mountain expressing its mass as a fist, the Earthbound Titan demonstrating that stone does not need momentum because it has weight. Tectonics does not summon a boulder. It remembers -- Atlas Prime's Greek lineage reasserting that walls of stone are the original defensive architecture. Petrify does not crowd control. It extends the Gaze -- the Mountain King looking at something and finding that the earth agrees it should stop. Rumblers does not summon golems. It delegates -- the Earthbound Titan calling the stone itself to serve, the mountain sending pieces of itself because the king does not walk everywhere himself.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Ironclad Mountain Hall'),
  'Devouring Oni Dao of the Insatiable Belly',
  '#5A3A1B',
  $doc$Grendel Prime's cultivation lineage is the Beowulf poem's cannibal giant filtered through the Japanese Oni -- the mountain demon who feasts because feasting is the Ironclad Mountain Hall's most direct form of cultivation. His codename is Oni, and the Devouring Oni Dao makes no attempt to refine this into something more palatable: Grendel Prime eats enemies, and eating enemies is his cultivation practice. Feast does not crowd control. It feeds -- Grendel Prime consuming enemies and adding their mass to his own, the +250 armor per devoured enemy in his gut representing the most literal interpretation of the Ironclad Mountain Hall's core principle that the strongest cultivator is the one who has absorbed the most. Nourish does not apply an energy buff. It metabolizes -- the Devouring Oni converting what he has eaten into applicable force, the cultivator as digestive system. Regurgitate does not deal damage. It conducts a culinary critique -- Grendel Prime returning undigested enemies as projectiles, the Insatiable Belly rendering its verdict on what it has consumed. Pulverize does not roll. It feasts in motion -- the Gourmand Titan as a rolling biomass event, collecting and converting at speed, the Oni demon's fundamental truth: that everything Grendel Prime touches is potential food, and potential food is potential strength.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Ironclad Mountain Hall'),
  'Chromatic Dragon Dao of the Vex Pelt',
  '#8B0000',
  $doc$Chroma Prime's cultivation lineage is the Dungeons and Dragons Chromatic Dragon -- the apex predator of the Ironclad Mountain Hall, the elemental-master cultivator who has claimed the right to every element simultaneously by mastering each one individually. His spectral energy color determines his element: red for Fire, blue for Cold, yellow for Electricity, white for Toxin. The Chromatic Dragon Dao treats this as the Hall's highest teaching: that the cultivator who can access all four elements without committing to one has achieved a form of tactical flexibility that the mono-element traditions cannot match. Spectral Scream does not deal damage. It breathes -- the dragon's breath weapon, here tuned to whatever element Chroma Prime is currently expressing. Elemental Ward does not buff the squad. It radiates -- the Dragon Pelt expressing its element outward, the Chromatic Dragon making its nature into an environmental condition. Vex Armor does not grant stacking damage and armor bonuses. It stacks fury -- the moment when Chroma Prime takes damage, the Dragon responds by becoming angrier and harder, the Vex Pelt's fundamental property being that it improves under assault. Effigy does not summon a decoy. It sheds the Dragon Pelt entirely -- leaving it to fight independently while Chroma Prime operates in his debuffed but liberated state, the E.N.D demonstrating that even without his pelt, the Chromatic Dragon is not finished.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Phantom Theater Conservatory'),
  'Mandachord Resonance Dao of the Pentatonic Bard',
  '#E5B8E5',
  $doc$Octavia Prime is the Phantom Theater Conservatory's empress -- the cultivator who established the School's foundational premise that music is not an accompaniment to combat but its own form of force, and that the practitioner who has mastered the Mandachord has access to a form of battlefield control that weapon-users cannot conceptualize because it operates at the frequency level rather than the kinetic level. The Mandachord is a step-sequencer tuned to the Pentatonic-D-minor scale, and Octavia Prime's four abilities are instruments: Mallet is the percussion section, a damage-dealing resonator that grows stronger the more the enemy attacks it, converting hostility into amplitude. Resonator is the bass line, a rolling sphere that attracts enemies with its frequency before Mallet concludes the arrangement. Metronome is the tempo track, rewarding allies who move in rhythm with the Mandachord's beat with buffs that the Pentatonic Bard Dao describes as the natural result of existing in correct relationship with the music. Amp is the master volume, and when Octavia Prime turns it up, the Resonance Dao's central teaching becomes environmental law: in the Sound Sovereign's concert hall, the music is not background. The music IS the outcome.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Phantom Theater Conservatory'),
  'Tomeweaver Dao of the Inferno-Paradiso Verses',
  '#003366',
  $doc$Dante is named after Dante Alighieri, the author of the Divine Comedy -- the Inferno, Purgatorio, and Paradiso -- and his cultivation practice is a direct translation of the poem's structure into Warframe mechanics. His abilities alternate between Light Verse and Dark Verse, Heaven and Hell, the Tomeweaver cycling through the Divine Comedy's three canticles as combat resources. Noctua does not deal damage. It writes -- the poet's pen, the Tomeweaver recording the battlefield's state before the verses begin. Pageflight does not provide utility. It conducts the Inferno's opening movement: the descent into the selva oscura, the dark wood, where Dante lost his way and found his guide. Tragedy does not apply a debuff. It concludes the Dark Verse -- the Inferno canticle completing, the weight of every accumulated dark effect converted into a single devastating reckoning. Triumph does not heal or generate Overguard. It concludes the Light Verse -- the Paradiso canticle completing, the Divine Comedy's promise that suffering has a terminal point and that point is transcendence. The Tomeweaver Dao teaches that the scribe-mage does not fight with spells. He fights with narrative -- and the cultivator who controls the story controls how it ends.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Chronos Engineering Bureau'),
  'Protean Chrono Dao of the Anchored Rewind',
  '#2EBFA5',
  $doc$Protea Prime's Greek lineage is Proteus -- the shapeshifter, the old man of the sea who changes form continuously to avoid being held to a single answer. The Chronos Engineering Bureau takes this shapeshifting and applies it to the dimension of time rather than form, producing the Protean Chrono Dao: the cultivation practice of a cultivator who has learned that the most powerful engineering is not building forward but anchoring backward. Grenade Fan does not throw grenades. It deploys gadgets -- Protea Prime's shapeshifting expressed as tactical versatility, the Protean principle that the cultivator who can produce multiple tool types simultaneously is not committing to a single solution. Blaze Artillery does not deal sustained damage. It engineers a turret -- the Chronos Bureau's fixed-point combat doctrine, power that does not require the cultivator's continuous attention because it has been correctly built. Dispensary does not generate resources. It manufactures -- the Protean Chrono Dao's fundamental technique, producing what the squad needs rather than finding it. Temporal Anchor is not an ultimate ability. It is a temporal engineering operation: Protea Prime placing a save-point in time, fighting forward for fifteen seconds, and then rewinding to the anchor while retaining all the energy she generated in the interval. The Protean Chrono Dao teaches that the engineer's advantage over the warrior is that the engineer can undo mistakes. Protea Prime has made this into a combat art.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Chronos Engineering Bureau'),
  'Bastille Siegecraft Dao of the Star-Fort Marshal',
  '#1F3A93',
  $doc$Vauban Prime is named after Sebastien Le Prestre de Vauban, the 17th-century Marshal of France who revolutionized military fortification and invented the star-fort design -- the geometric defensive architecture that dominated European warfare for two centuries. The Bastille Siegecraft Dao takes Vauban's engineering genius and applies it to mobile combat, producing the Chronos Engineering Bureau's most militarily precise practitioner: the cultivator who does not fight the enemy so much as he engineers the conditions under which the enemy cannot effectively fight back. Tesla Nervos does not deal damage. It engineers a persistent area-denial system -- the star-fort's outer perimeter, mines that follow and stun. Minelayer does not provide utility. It deploys the Bureau's tactical architecture: Nail Grenades for armor strip, Bouncing Bastille for crowd control deployment, Overdriver for ally enhancement, Flechette Orb for sustained area denial. Bastille does not suspend enemies. It constructs -- the star-fort made real, the Vauban design's fundamental promise that the enclosed space belongs to the engineer and not the army outside it. Photon Strike does not deal orbital damage. It calls the Marshal's reserve -- the equivalent of Vauban's artillery support, the Bureau's answer to the question of what happens when the star-fort's walls are insufficient: you call the orbital cannon.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Chronos Engineering Bureau'),
  'Peacemaker Gunslinger Dao of the High Noon Topaz',
  '#FFC107',
  $doc$Mesa Prime's cultivation lineage runs through the Colt Peacemaker, the Old West gunslinger tradition, and the specific mythological figure of the lawman who stands in the street at high noon and does not draw first but draws fastest. The Peacemaker Gunslinger Dao treats this as a complete cultivation philosophy: the gunfighter's art is not aggression but precision, not speed but the specific speed that matters -- the moment between the enemy's intention and Mesas's response. Ballistic Battery does not charge damage. It loads -- the gunslinger ensuring that when the draw comes, the first shot carries the full weight of what came before it. Shooting Gallery does not buff allies and confuse enemies. It manages the saloon -- the Lone Star maintaining situational control of everyone in range, ensuring that the Chronos Engineering Bureau's most offensive practitioner is never fighting a fair fight because fair fights are for people who cannot engineer their circumstances. Shatter Shield does not provide damage reduction. It prepares the draw -- the gunslinger putting on the vest, the Lone Star ensuring she will still be standing when Peacemaker completes. Peacemaker does not channel. It draws -- the Colt Peacemaker brought to bear at High Noon speed, the Regulators spinning into existence as the extensions of a combat doctrine so complete that Mesa Prime's hands are no longer the limiting factor. Only her aim is.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Chronos Engineering Bureau'),
  'Frumentarius Sniper Dao of the Practiced Eye',
  '#4A6FA5',
  $doc$Cyte-09's cultivation lineage is the Roman frumentarii -- the imperial intelligence service, the spy-soldiers who operated behind enemy lines collecting grain (frumentum) as cover while conducting espionage and assassination. The Frumentarius Sniper Dao takes this lineage and refines it through the Chronos Engineering Bureau's precision ethos: the cultivator who has decided that every engagement should be resolved from a position of complete informational superiority before the enemy knows the engagement has begun. Neutralizer is not a sniper's exalted weapon. It is the frumentarius's terminal instrument -- the shot that ends the intelligence operation, delivered from the position that perfect reconnaissance has identified as optimal. Evade does not grant invisibility. It grants invisibility on weak-point kills specifically -- the Practiced Eye rewarding precision with the ability to vanish, the spy-assassin completing an operation and stepping back into the information layer. The Frumentarius Sniper Dao's relationship to Mesa Prime's Peacemaker Dao is precisely the relationship of the sniper to the gunfighter: same tradition of marksman cultivation, different ranges, different operational philosophies. Mesa Prime fights at High Noon. Cyte-09 was never in the street.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Chronos Engineering Bureau'),
  'Five-Fates Dice Dao of the Plum-Blossom Oracle',
  '#D62828',
  $doc$Koumei's cultivation lineage is the Shinto miko -- the shrine maiden who interprets omens, conducts ritual, and serves as the intermediary between the mortal world and the divine one. But Koumei's miko practice is conducted through dice, and her dice produce Omikuji -- the paper fortune strips drawn at Japanese shrines that assign each supplicant a fate category from Great Blessing to Great Curse. The Five-Fates Dice Dao treats this as the Chronos Engineering Bureau's most unconventional but most complete engineering practice: the cultivator who has learned to engineer probability rather than outcomes. Seijundo does not apply effects. It reads the Omikuji -- the dice falling, the fate strips unfurling, the Plum-Blossom Oracle determining what this moment's probability field looks like. Kazegiri does not deal damage. It conducts a Bunraku performance -- the traditional Japanese puppet theater in which the puppeteers are visible but the audience agrees to see the puppet as real, here inverted: the enemy is real but Koumei makes them see something else. Shadow's Trinity is the jackpot state -- triple six on the dice, the Great Blessing fate strip, the moment when the Endurant Saintess's probability engineering completes and the field collapses into the outcome she has been cultivating across the entire encounter.$doc$
) on conflict (art_name) do nothing;

insert into wf_base.cultivation_arts (school_id, art_name, color, doctrine) values (
  (select school_id from wf_base.cultivation_schools where name = 'Chronos Engineering Bureau'),
  'Brimstone Lucifer Dao of the Triadic Legion',
  '#DC143C',
  $doc$Uriel is the Chronos Engineering Bureau's moral inversion -- the devil in the engineering school, the infernal summoner whose cultivation practice is the structural inverse of the Hallowed Path of Heaven's Light. Where Harrow Prime bleeds for devotion and Baruuk Prime restrains for discipline, Uriel burns for dominion. His name is the Vice Regent Roathe's designation, and his demonic legion -- Catenach, Gulphagor, Vythelas -- are not summoned allies but drafted lieutenants, the Triadic Legion that the Brimstone Lucifer Dao calls the minimum viable infernal hierarchy. The Bureau includes Uriel not despite this inversion but because of it: the Chronos Engineering Bureau has always understood that engineering is morally neutral, that the same organizational genius that builds star-forts can build hellfire rings, that management of a demonic legion requires the same systematic precision as management of a satellite cannon. Uriel does not summon. He administers -- the devil's real power being not the fire but the bureaucracy, the infernal hierarchy that ensures the fire goes exactly where the Triadic Legion's logistics have determined it should go. The Brimstone Lucifer Dao is the Hallowed Path's shadow curriculum, and Uriel is its valedictorian.$doc$
) on conflict (art_name) do nothing;


-- ============================================================
-- Seed: relationships -- every row below cites the literal doctrine-text
-- claim it rests on (source_ref). Nothing here is inferred or extrapolated
-- beyond what a doctrine paragraph explicitly says about another Art/School.
-- Re-verified directly against DB/Cultivation/*.sql this session (Session 017),
-- not carried over blind from Session 016's summary.
-- ============================================================

-- 1. Cross-School Bridge -- Harrow Prime sits at the border of two schools.
insert into wf_base.cultivation_relationships (relationship_type, school_id, description, source_ref) values (
  'cross_school_bridge',
  null,
  'Harrow Prime''s devotional-suffering practice is framed as the literal intersection of two schools -- Hallowed Path discipline expressed through Crimson Sanguinary self-cost.',
  '"Harrow Prime stands at the exact point where the Hallowed Path and the Crimson Sanguinary School intersect, and he has built his entire cultivation practice on that border." (Penance Saint doctrine)'
);
insert into wf_base.cultivation_relationship_members (relationship_id, art_id) values (
  (select relationship_id from wf_base.cultivation_relationships where source_ref like 'Harrow Prime stands%' or source_ref like '%exact point where the Hallowed Path%' limit 1),
  (select art_id from wf_base.cultivation_arts where art_name = 'Inquisitor''s Penance Path of the Crimson Censer')
);
insert into wf_base.cultivation_relationship_members (relationship_id, related_school_id) values (
  (select relationship_id from wf_base.cultivation_relationships where source_ref like '%exact point where the Hallowed Path%' limit 1),
  (select school_id from wf_base.cultivation_schools where name = 'Crimson Sanguinary School')
);

-- 2. Dual Citizenship -- Caliban explicitly holds membership in a second school.
insert into wf_base.cultivation_relationships (relationship_type, school_id, description, source_ref) values (
  'dual_citizenship',
  null,
  'Caliban''s Sentient/Tenno hybrid nature is framed as literal dual membership, not a border case -- full citizenship in both schools at once.',
  '"Caliban is the only Warframe in the Cosmic Antimatter Council who holds simultaneous citizenship in the Ironclad Mountain Hall, because his cultivation practice is the meeting point of two traditions that should be mutually exclusive." (Rift Sovereign doctrine)'
);
insert into wf_base.cultivation_relationship_members (relationship_id, art_id) values (
  (select relationship_id from wf_base.cultivation_relationships where source_ref like '%simultaneous citizenship in the Ironclad Mountain Hall%' limit 1),
  (select art_id from wf_base.cultivation_arts where art_name = 'Rift Hybrid Dao of the Twin-Born Heir')
);
insert into wf_base.cultivation_relationship_members (relationship_id, related_school_id) values (
  (select relationship_id from wf_base.cultivation_relationships where source_ref like '%simultaneous citizenship in the Ironclad Mountain Hall%' limit 1),
  (select school_id from wf_base.cultivation_schools where name = 'Ironclad Mountain Hall')
);

-- 3. Inverse/Shadow -- Uriel explicitly named as the moral/structural inverse
-- of the Hallowed Path, citing two specific sibling Arts (Harrow, Baruuk) as
-- the counter-examples -- kept as an Art<->School edge since the text frames
-- the inversion as being against the SCHOOL's curriculum as a whole, with
-- Harrow/Baruuk cited as evidence rather than as the two things being
-- individually inverted.
insert into wf_base.cultivation_relationships (relationship_type, school_id, description, source_ref) values (
  'inverse_shadow',
  null,
  'Uriel''s infernal-summoner practice is the explicit moral/structural inverse of Hallowed Path devotion -- cites Harrow Prime (devotion) and Baruuk Prime (restraint) by name as the specific counter-examples being inverted.',
  '"Uriel is the Chronos Engineering Bureau''s moral inversion -- the devil in the engineering school, the infernal summoner whose cultivation practice is the structural inverse of the Hallowed Path of Heaven''s Light. Where Harrow Prime bleeds for devotion and Baruuk Prime restrains for discipline, Uriel burns for dominion... The Brimstone Lucifer Dao is the Hallowed Path''s shadow curriculum, and Uriel is its valedictorian." (Devil doctrine)'
);
insert into wf_base.cultivation_relationship_members (relationship_id, art_id) values (
  (select relationship_id from wf_base.cultivation_relationships where source_ref like '%moral inversion%' limit 1),
  (select art_id from wf_base.cultivation_arts where art_name = 'Brimstone Lucifer Dao of the Triadic Legion')
);
insert into wf_base.cultivation_relationship_members (relationship_id, related_school_id) values (
  (select relationship_id from wf_base.cultivation_relationships where source_ref like '%moral inversion%' limit 1),
  (select school_id from wf_base.cultivation_schools where name = 'Hallowed Path of Heaven''s Light')
);

-- 4. Sister Art -- Volt/Gyre, explicit "sister arts" phrase, deliberate dev-team split.
insert into wf_base.cultivation_relationships (relationship_type, school_id, description, source_ref) values (
  'sister_art',
  (select school_id from wf_base.cultivation_schools where name = 'Storm Heaven Convocation'),
  'Natural lightning (Volt) vs. artificial/mechanical lightning (Gyre) -- explicitly named sister arts rather than the same art, since the dev team deliberately split Gyre from Volt''s lineage.',
  '"The Storm Heaven Convocation acknowledges natural lightning through Volt Prime and artificial lightning through Gyre Prime, and it treats them as sister arts rather than the same art -- because Pablo and the development team specifically split her from Volt''s lineage to make a point." (Lightning Dancer doctrine)'
);
insert into wf_base.cultivation_relationship_members (relationship_id, art_id) values
  ((select relationship_id from wf_base.cultivation_relationships where source_ref like '%Pablo and the development team%' limit 1), (select art_id from wf_base.cultivation_arts where art_name = 'Heavenly Thunder Path of the Voltaic Sovereign')),
  ((select relationship_id from wf_base.cultivation_relationships where source_ref like '%Pablo and the development team%' limit 1), (select art_id from wf_base.cultivation_arts where art_name = 'Tesla Pirouette Dao of the Coil-Born Empress'));

-- 5. Sister Art -- Mesa/Cyte-09, explicit shared marksman lineage, different range/philosophy.
insert into wf_base.cultivation_relationships (relationship_type, school_id, description, source_ref) values (
  'sister_art',
  (select school_id from wf_base.cultivation_schools where name = 'Chronos Engineering Bureau'),
  'Same marksman-cultivation tradition split by range and operational philosophy -- the gunfighter (Mesa, close/mid) and the sniper (Cyte-09, ranged/covert).',
  '"The Frumentarius Sniper Dao''s relationship to Mesa Prime''s Peacemaker Dao is precisely the relationship of the sniper to the gunfighter: same tradition of marksman cultivation, different ranges, different operational philosophies. Mesa Prime fights at High Noon. Cyte-09 was never in the street." (Best Unseen Shooter doctrine)'
);
insert into wf_base.cultivation_relationship_members (relationship_id, art_id) values
  ((select relationship_id from wf_base.cultivation_relationships where source_ref like '%Mesa Prime fights at High Noon%' limit 1), (select art_id from wf_base.cultivation_arts where art_name = 'Peacemaker Gunslinger Dao of the High Noon Topaz')),
  ((select relationship_id from wf_base.cultivation_relationships where source_ref like '%Mesa Prime fights at High Noon%' limit 1), (select art_id from wf_base.cultivation_arts where art_name = 'Frumentarius Sniper Dao of the Practiced Eye'));

-- 6. Sibling/Differentiation cluster -- Moonless Veil Order shadow-arts quartet.
insert into wf_base.cultivation_relationships (relationship_type, school_id, description, source_ref) values (
  'sibling_differentiation',
  (select school_id from wf_base.cultivation_schools where name = 'Moonless Veil Order'),
  'The Order''s four shadow-art siblings, each doctrine explicitly contrasting itself against the others: Ash (assassination/patron), Loki (deception/premise-denial), Ivara (patience/theft), Mirage (illusion/stagecraft).',
  '"He is not the most dramatic practitioner of the shadow arts - Loki deceives more elegantly, Ivara hunts more patiently, Mirage dazzles more completely." (Shadow Monarch doctrine); reinforced in Trickster Lord''s own doctrine: "Where Ash Prime is the Patron Assassin and Ivara Prime is the Silent Huntress, Loki Prime is the one who has decided..."'
);
insert into wf_base.cultivation_relationship_members (relationship_id, art_id) values
  ((select relationship_id from wf_base.cultivation_relationships where source_ref like '%Loki deceives more elegantly%' limit 1), (select art_id from wf_base.cultivation_arts where art_name = 'Smoke Shadow Dao of the Patron Assassin')),
  ((select relationship_id from wf_base.cultivation_relationships where source_ref like '%Loki deceives more elegantly%' limit 1), (select art_id from wf_base.cultivation_arts where art_name = 'Trickster Mirage Dao of the Hundred Decoys')),
  ((select relationship_id from wf_base.cultivation_relationships where source_ref like '%Loki deceives more elegantly%' limit 1), (select art_id from wf_base.cultivation_arts where art_name = 'Midnight Quiver Dao of the Silent Artemis')),
  ((select relationship_id from wf_base.cultivation_relationships where source_ref like '%Loki deceives more elegantly%' limit 1), (select art_id from wf_base.cultivation_arts where art_name = 'Harlequin Eclipse Dao of Mirrored Stagecraft'));

-- 7. Sibling/Differentiation cluster -- Tidal Abyss's three crystalline/frozen-water Arts.
insert into wf_base.cultivation_relationships (relationship_type, school_id, description, source_ref) values (
  'sibling_differentiation',
  (select school_id from wf_base.cultivation_schools where name = 'Tidal Abyss Confraternity'),
  'Three water-adjacent siblings differentiated by the state/form water takes: Frost (ice, stillness), Gara (shattered glass), Citrine (precise crystal lattice).',
  '"where Gara Prime works with shattered glass and Frost Prime works with ice, Citrine works with the crystal in its most precise form -- the geological structure that took millennia to achieve its lattice" (Geode doctrine)'
);
insert into wf_base.cultivation_relationship_members (relationship_id, art_id) values
  ((select relationship_id from wf_base.cultivation_relationships where source_ref like '%Gara Prime works with shattered glass%' limit 1), (select art_id from wf_base.cultivation_arts where art_name = 'Eternal Winter Dao of the Snow Globe Sovereign')),
  ((select relationship_id from wf_base.cultivation_relationships where source_ref like '%Gara Prime works with shattered glass%' limit 1), (select art_id from wf_base.cultivation_arts where art_name = 'Shattered Glass Dao of the Vitrified Martyr')),
  ((select relationship_id from wf_base.cultivation_relationships where source_ref like '%Gara Prime works with shattered glass%' limit 1), (select art_id from wf_base.cultivation_arts where art_name = 'Geode Aurora Dao of the Prismatic Vow'));

-- 8. Sibling/Differentiation cluster -- Plague Garden's four toxin/infestation Arts.
insert into wf_base.cultivation_relationships (relationship_type, school_id, description, source_ref) values (
  'sibling_differentiation',
  (select school_id from wf_base.cultivation_schools where name = 'Plague Garden Sect'),
  'Four toxin-cultivation siblings differentiated by mechanism: Saryn (open plague/war), Nidus (nest), Nokko (network), Oraxia (ambush/closed door).',
  '"where Saryn Prime cultivates plague and Nidus Prime cultivates nest, Nokko cultivates network" (Nukkulaelae doctrine); "In the Plague Garden Sect, Saryn Prime is the open war and Oraxia is the closed door that you walked through because it was open when you arrived." (Spiderwoman doctrine)'
);
insert into wf_base.cultivation_relationship_members (relationship_id, art_id) values
  ((select relationship_id from wf_base.cultivation_relationships where source_ref like '%Nokko cultivates network%' limit 1), (select art_id from wf_base.cultivation_arts where art_name = 'Tang Sect Spore Dao of the Serpent Contagion')),
  ((select relationship_id from wf_base.cultivation_relationships where source_ref like '%Nokko cultivates network%' limit 1), (select art_id from wf_base.cultivation_arts where art_name = 'Infested Cordyceps Dao of the Mutating Host')),
  ((select relationship_id from wf_base.cultivation_relationships where source_ref like '%Nokko cultivates network%' limit 1), (select art_id from wf_base.cultivation_arts where art_name = 'Mycelium Sprout Dao of the False Morel')),
  ((select relationship_id from wf_base.cultivation_relationships where source_ref like '%Nokko cultivates network%' limit 1), (select art_id from wf_base.cultivation_arts where art_name = 'Jorogumo Silk Dao of the Venomed Gown'));

-- 9. Sibling/Differentiation cluster -- Storm Heaven's ground/sky counterpart pairing.
insert into wf_base.cultivation_relationships (relationship_type, school_id, description, source_ref) values (
  'sibling_differentiation',
  (select school_id from wf_base.cultivation_schools where name = 'Storm Heaven Convocation'),
  'Explicit counterpart pairing: Zephyr (sky-bound, vertical control) and Styanax (ground-anchor, refuses to be moved) as the Convocation''s two opposed answers to "where does a storm cultivator stand."',
  '"Styanax is the Storm Heaven Convocation''s ground-anchor -- the hoplite to Zephyr Prime''s Tengu, the cultivator who has decided that the most powerful storm is the one that cannot be moved." (Spear Master doctrine)'
);
insert into wf_base.cultivation_relationship_members (relationship_id, art_id) values
  ((select relationship_id from wf_base.cultivation_relationships where source_ref like '%the hoplite to Zephyr Prime%' limit 1), (select art_id from wf_base.cultivation_arts where art_name = 'Tengu Dao of the Falling Plume')),
  ((select relationship_id from wf_base.cultivation_relationships where source_ref like '%the hoplite to Zephyr Prime%' limit 1), (select art_id from wf_base.cultivation_arts where art_name = 'Hoplite Aegis Dao of the Worthy Spear'));

-- ============================================================
-- Backfill: wf_user.my_frames gets a new cultivation_art_id FK, joined purely
-- on the existing cultivation_art free-text column against the newly-seeded
-- canonical art_name (exact match, both are the same literal strings from
-- DB/Cultivation/*.sql) -- no guessing. Existing free-text columns are left
-- in place untouched; this is additive.
-- ============================================================
alter table wf_user.my_frames add column if not exists cultivation_art_id integer references wf_base.cultivation_arts(art_id);

update wf_user.my_frames mf
set cultivation_art_id = a.art_id
from wf_base.cultivation_arts a
where mf.cultivation_art = a.art_name
  and mf.cultivation_art_id is null;

-- Backfill cultivation_arts.warframe_id from the same join, in the other
-- direction -- descriptive metadata only (see the column's own comment above),
-- populated from real relational data rather than guessed from doctrine prose.
update wf_base.cultivation_arts a
set warframe_id = mf.warframe_id
from wf_user.my_frames mf
where mf.cultivation_art = a.art_name
  and mf.warframe_id is not null
  and a.warframe_id is null;
