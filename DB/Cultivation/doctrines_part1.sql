-- ============================================================
-- WARFRAME JARVIS -- Full Cultivation Doctrine Seed
-- All 57 Daos of the Tenno
-- Dollar-quoted strings to avoid apostrophe/em-dash issues
-- Run each UPDATE individually in Supabase SQL editor
-- ============================================================


-- ============================================================
-- I. CRIMSON SANGUINARY SCHOOL (血殿)
-- ============================================================

update wf_user.my_frames
set
    cultivation_color    = '#A8002A',
    cultivation_school   = 'Crimson Sanguinary School',
    cultivation_identity = 'Blood Angel',
    cultivation_art      = 'Crimson Maiden Dao of the Severing Heart',
    cultivation_doctrine = $doc$The Crimson Sanguinary School does not ask its disciples to find power. It asks them to bleed for it. Garuda Prime is the School's apex predator -- not because she is the most dangerous thing in the room, but because she has already decided the cost is worth paying. Her Dread Mirror does not conjure a shield. It tears the still-beating heart from a living body and suspends it between her and death. Her Bloodletting does not cast. It opens her own veins and converts the flow into energy, because in the Sanguinary School, the cultivator IS the resource. Seeking Talons do not hunt. They execute coordinates her blood has already chosen. The Crimson Maiden Dao of the Severing Heart teaches one truth above all others: that the most abundant energy source in any combat encounter is the suffering you are willing to endure. Garuda Prime has no limit on that willingness. That is why she is the Blood Angel.$doc$
where build_title = 'Blood Angel';

update wf_user.my_frames
set
    cultivation_color    = '#C92E1F',
    cultivation_school   = 'Crimson Sanguinary School',
    cultivation_identity = 'War Cry Saint',
    cultivation_art      = 'Berserker Scripture of the Flayed Valkyrja',
    cultivation_doctrine = $doc$Valkyr Prime did not choose the Crimson Sanguinary School. Alad V chose it for her. The Corpus stripped her to the neural and rebuilt her as a specimen, and in doing so they created the most dangerous thing the School has ever produced: a cultivator whose rage has no ideological ceiling. War Cry does not buff. It broadcasts the frequency of something that has decided it cannot be killed. Ripline does not reposition. It closes distance with the arithmetic certainty of something that has been hunting you since the moment you appeared. Hysteria does not activate. It surfaces -- the Flayed Valkyrja that lives underneath the golden armor, the one that Alad V made and could not unmake. The Berserker Scripture teaches that suffering transmutes. That what enters as pain exits as killing-force. Valkyr Prime is the purest proof the School has ever produced that this equation is not metaphor. It is physics.$doc$
where build_title = 'War Cry Saint';

update wf_user.my_frames
set
    cultivation_color    = '#B8362E',
    cultivation_school   = 'Crimson Sanguinary School',
    cultivation_identity = 'The Blade Demon',
    cultivation_art      = 'Cursed Blade Heresy of Seven Sins',
    cultivation_doctrine = $doc$Kullervo does not cultivate. He atones. The seven crimes branded into his cells are not a history -- they are a load-bearing structure. His Wrathful Advance does not charge. It closes distance the way guilt closes distance: inevitably, without warning, already inside your guard before you recognized the movement. Recompense does not reflect damage. It conducts a transaction the School has always understood: that every wound you inflict on the already-wounded returns with interest. Collective Curse does not mark enemies. It distributes the weight of his sin across every target in range, because Kullervo has learned that shared suffering is the only form of communion available to someone carrying what he carries. He has no shields. The Sanguinary School does not offer shelter. It offers transformation -- the promise that if you burn through enough of yourself, what remains will be worth the cost. Kullervo is still burning. He has not yet decided if he believes the promise.$doc$
where build_title = 'The Blade Demon';


-- ============================================================
-- II. ADOLLA PYRIC SCHOOL (烈焰宗)
-- ============================================================

update wf_user.my_frames
set
    cultivation_color    = '#FF4500',
    cultivation_school   = 'Adolla Pyric School',
    cultivation_identity = 'Adolla Burst',
    cultivation_art      = 'Phoenix Dao of Meteoric Wrath',
    cultivation_doctrine = $doc$The Adolla Pyric School was built around a paradox that Ember Prime has spent her entire existence resolving: that fire is both the most honest and most self-destructive form of power. Fireball does not launch. It declares. Immolation does not build heat -- it manages the cost of being what Ember Prime is, the internal temperature of a cultivator who generates more thermal energy than her body is designed to contain. The Phoenix Dao teaches heat management as spiritual discipline: that the gap between Adolla Burst and self-immolation is not power, it is control. World on Fire does not burn enemies. It saturates the field with the School's fundamental premise -- that everything flammable is already burning, you are simply accelerating the timeline. Ember Prime is the Adolla Burst incarnate: the living proof that the hottest fire does not destroy its host. It refines her.$doc$
where build_title = 'Adolla Burst';

update wf_user.my_frames
set
    cultivation_color    = '#F4E07A',
    cultivation_school   = 'Adolla Pyric School',
    cultivation_identity = 'Portal to the Sun',
    cultivation_art      = 'Solar Gate Sutra of the Wandering Lantern',
    cultivation_doctrine = $doc$Wisp Prime does not fight. She lures. The Adolla Pyric School has always acknowledged that fire has two modes -- the consuming flame and the beckoning light -- and Wisp Prime is the only cultivator who has mastered both simultaneously. Her Wisps do not buff allies. They anchor dimensional bleed-points between this plane and the solar substrate, Motes of pure stellar energy wearing the mask of helpful companions. Breach Surge does not deal damage. It opens a temporary Sol Gate in miniature, a window through which the physics of a star briefly apply to the battlefield. Sol Gate itself is not an ability. It is a theological statement: that the sun is not a celestial object but a cultivator's resource, and Wisp Prime has learned to open the door. The Solar Gate Sutra teaches that the most dangerous light is the light that looks like safety. Wisp Prime has always known this. She uses it anyway.$doc$
where build_title = 'Portal to the Sun';

update wf_user.my_frames
set
    cultivation_color    = '#FFFAE6',
    cultivation_school   = 'Adolla Pyric School',
    cultivation_identity = 'Glory On High',
    cultivation_art      = 'Seraphic Choir Sutra of the Ophanim Wheels',
    cultivation_doctrine = $doc$Jade does not belong to the Adolla Pyric School because she burns things. She belongs because she IS the fire -- the holy fire, the Ophanim-wheel fire that the old texts describe as the light that burns away everything that is not essential. Her abilities cycle like liturgy: Chorus builds, Dirge reveals, Glory On High descends as solar judgment through wells of pure light that open in the battlefield like wounds in heaven. She carries the Stalker's child and still stands in direct solar communion because the Seraphic Choir Sutra teaches that holy flame does not care about the circumstances of the vessel. It cares only about the purity of the transmission. Jade's cultivation is not pyromancy. It is hymnody -- the discipline of becoming a perfect instrument for something larger than yourself, and then letting it sing through you at approximately the temperature of a star.$doc$
where build_title = 'Glory On High';


-- ============================================================
-- III. HALLOWED PATH OF HEAVEN'S LIGHT (圣光道宫)
-- ============================================================

update wf_user.my_frames
set
    cultivation_color    = '#2E7D4F',
    cultivation_school   = 'Hallowed Path of Heaven''s Light',
    cultivation_identity = 'Hallowed Sage',
    cultivation_art      = 'Verdant Stag Sutra of the Hallowed Grove',
    cultivation_doctrine = $doc$The Hallowed Path of Heaven's Light does not produce warriors. It produces wardens. Oberon Prime is the School's most complete expression of this principle: a druid-paladin whose cultivation treats the battlefield as a sacred grove requiring stewardship, not conquest. Smite does not attack. It adjudicates -- the white stag passing judgment on something that has disturbed the grove. Hallowed Ground does not buff. It consecrates, laying down a zone of the School's fundamental premise: that sacred space has physics, and those physics favor those who maintain them. Renewal does not heal. It tends, the way a grove tends its wounded -- patiently, continuously, without asking whether the recipient deserved the wound. Reckoning does not detonate. It concludes a liturgical cycle that began the moment Oberon Prime entered the room. The Verdant Stag Sutra teaches one discipline above all others: that power without stewardship is just destruction with better aesthetics.$doc$
where build_title = 'Hallowed Sage';

update wf_user.my_frames
set
    cultivation_color    = '#F0F0FF',
    cultivation_school   = 'Hallowed Path of Heaven''s Light',
    cultivation_identity = 'Divine Trinity',
    cultivation_art      = 'Triune Lifegiver Scripture of the Holy Bond',
    cultivation_doctrine = $doc$Trinity Prime is not a support frame. She is a theological architecture made flesh -- the Triune Lifegiver, the living proof that the Hallowed Path's highest teaching is correct: that life, energy, and protection are not three separate gifts but one gift with three faces. Well of Life does not create a healing source. It demonstrates the School's foundational claim that life is already abundant in every environment; the cultivator's job is to make it accessible. Energy Vampire does not drain. It redistributes, conducting a transaction the Scripture calls the Holy Bond: the principle that no resource belongs to any single actor, that energy flows where need is greatest. Link does not protect Trinity Prime. It distributes incoming reality across the squad as equitably as the School distributes all things. Blessing does not save. It reminds. The Triune Lifegiver Scripture teaches that the cultivator who holds the most power is not the one who has accumulated the most -- it is the one who has given the most away.$doc$
where build_title = 'Divine Trinity';

update wf_user.my_frames
set
    cultivation_color    = '#7E1F2E',
    cultivation_school   = 'Hallowed Path of Heaven''s Light',
    cultivation_identity = 'Penance Saint',
    cultivation_art      = 'Inquisitor''s Penance Path of the Crimson Censer',
    cultivation_doctrine = $doc$Harrow Prime stands at the exact point where the Hallowed Path and the Crimson Sanguinary School intersect, and he has built his entire cultivation practice on that border. His Condemn does not crowd-control. It chains, because the Inquisitor's theology holds that the first step in any redemptive process is immobilization -- you cannot be saved if you keep moving. Penance does not buff fire rate and reload speed. It self-flagellates: Harrow Prime drains his own shields, bleeds his own reserves, and converts that cost into aggression, because the Penance Path teaches that suffering freely chosen is qualitatively different from suffering inflicted. Thurible does not generate energy for allies. It swings the Crimson Censer through the battlefield, and the energy that falls from it is incense-smoke made real: the byproduct of a devotional practice so complete it has physical consequences. Covenant does not make the squad invulnerable. It concludes the liturgical cycle -- the moment when penance becomes covenant, when suffering becomes protection. The Inquisitor's Penance Path teaches that the difference between the flagellant and the saint is that the saint knows why they're bleeding.$doc$
where build_title = 'Penance Saint';

update wf_user.my_frames
set
    cultivation_color    = '#1F4FA8',
    cultivation_school   = 'Hallowed Path of Heaven''s Light',
    cultivation_identity = 'Serene Saint',
    cultivation_art      = 'Restraint Mandala Sutra of the Pacifist Fist',
    cultivation_doctrine = $doc$Baruuk Prime is the Hallowed Path's most challenging argument: that the most powerful strike available to a cultivator is the one they choose not to throw. His entire cultivation practice is built around a resource called Restraint -- a gauge that depletes not when he fights but when he exercises patience, when he absorbs damage through Desolate Hands and Lull rather than answering it. Desolate Hands does not disarm enemies. It practices non-intervention with consequences. Lull does not sleep the battlefield. It creates a zone of enforced contemplation, the Mandala Sutra's teaching made environmental. Serene Storm does not activate when Restraint runs out. It surfaces -- the Pacifist Fist that was always there underneath the discipline, the combat doctrine of a cultivator who has spent the entire encounter choosing not to use it. When Baruuk Prime finally moves, it is not because his patience broke. It is because his patience completed. The Restraint Mandala Sutra teaches that the iron monk's strength is not in his fists. It is in the length of time he keeps them open.$doc$
where build_title = 'Serene Saint';
