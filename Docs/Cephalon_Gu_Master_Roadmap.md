# Cephalon Gu — Master Roadmap
*As of August 29, 2026 — full regeneration during Session 016's reconcile.*

> **Note on this file:** Last regenerated at Session 013 and had gone stale since —
> D.2-D.5 (Survivability Suite) and Companion tracking both shipped in the sessions
> since, but this file still listed them as upcoming. Refreshed in full so a fresh
> session starting **D.7** (the real #1 locked-queue item now) reads accurate
> priorities instead of stale ones.

---

## ✅ SHIPPED

- **Build card grid** — S/A manual tier grading, shard chips, NOW vs GOAL shard tracking
- **Physique/Constitution Badge System** — filterable dropdown, 7 named physiques, per-physique counts
- **Archon Shard Tracker** — ShardEditModal refactor (~880 → ~308 lines), all 6 shard types + Tau-forged scaling, Variant/Apex Variant Constitution badges
- **Arsenal modal redesign** — tabbed Arsenal / Archon Shards, unified autocomplete
- **Arcane DB** — 129 arcanes seeded (`arcane_seed.sql` + MODERN_ADDENDUM), full metadata columns
- **Incarnon system** — boolean adapter toggle, no DB duplication; melee arcane slot fully wired
- **Core Four Arcane Filtering** — all four slot pickers (Warframe/Primary/Secondary/Melee) filter by type, Owned/All toggle, rank display
- **`wf_base.warframes`** — 117 rows, fully seeded, matches live roster; Health/Shield/Armor/Energy/Sprint Speed columns backfilled *(Session 015)*
- **A2 — Ability Tracking** ✅ *(complete)* — `wf_base.warframe_abilities`, 468 rows. Batch 3 gap (Wisp Prime, Xaku Prime, Zephyr Prime) confirmed already seeded 2026-08-08, verified correct against live kits.
- **Helminth Invigoration tracking** — per-card modal, delete-then-insert pattern
- **Security hardening** — RLS across both schemas, Security Definer → invoker views, locked search paths
- **Shipment B — Cultivation System** *(largely shipped)* — schools, daos, colors, identity tab, doctrine display
- **`WarframeSelector.jsx`** — click-to-edit searchable typeahead sourced live from `wf_base.warframes`; `prime_variant_id` self-referencing column with 50 base↔Prime pairs; "Prime This Warframe" one-click button *(Session 008)*
- **D.6 — Testing Methodology Log** ✅ *(Session 008)* — `wf_user.build_tests` table (Pass/Fail/Inconclusive verdicts, benchmark archetypes matching A3 vocabulary); `TestingLogTab.jsx` as fifth tab in `BuildDetailOverlay`
- **A1 — Global Arsenal Search** ✅ *(Session 008)* — `ArsenalSearchPage.jsx`, standalone page, client-side plain-text search across weapon and arcane columns on `my_frames`
- **`session-checkin` skill** ✅ *(Session 008)* — packaged recon/reconcile discipline as a persistent Claude Skill
- **`CopyWeaponModal.jsx`** ✅ *(Session 010)* — rebuilt from scratch, wired into `ShardEditModal.jsx` Arsenal tab, confirmed working live
- **Design system pass** ✅ *(Session 010)* — Cinzel/Outfit fonts, custom favicon, app renamed to Cephalon Gu, shared `ui/Panel` / `ui/Button` / `ui/ModalShell` primitives + `constants/theme.js` rolled out everywhere
- **Arsenal Search Suite — COMPLETE** ✅ *(Session 010)* — Weapon Stat Threshold Search (`WeaponStatSearchTab.jsx`), client-side threshold filtering across all 665 weapons using `wf_base.weapons.raw_json`, no new table needed
- **D.1 — Armory** ✅ *(Session 010)* — `wf_user.weapon_inventory` (real ownership tracking), `ArmoryPage.jsx` with category + personality-tag filters, live 3-Weapon Rule validation, drag/drop reassignment
- **B1 — School Navigation Cleanup** ✅ *(Session 013)* — 14-button school-filter row collapsed into a single `<select>` with build counts
- **Locked-Queue #1 — Mods Inventory & DB — COMPLETE** ✅ *(Sessions 010-013)* — `wf_base.mods` (1082-row WFCD catalog) + `wf_user.mod_inventory`; the 8-slot Loadout builder merging Arsenal, Abilities, and Mods into one Warframe/Primary/Secondary/Melee tabbed surface with live capacity/drain math; full mod-catalog data-quality audit; **Riven mod support** (`wf_user.rivens`, `RivenEditorModal.jsx`).
- **Companion Tracking — COMPLETE** ✅ *(Sessions 013-015)* — full arc: `wf_base.companions`/`companion_weapons` (17 Sentinels + 15 beast breeds, 24 Sentinel Weapons + 5 hand-authored Claws), 164 Companion-category mods (`compat_name`-based Posture/Claws-family split), and the **Companion tab** (`CompanionTab.jsx`/`CompanionEquipmentSection.jsx`) — identity pickers, 8-slot grids for both pieces, a Posture special slot on the weapon piece reusing the existing Aura-slot capacity math with zero formula changes. Confirmed Sentinels have no dedicated Precept slot (corrected a Session-013 assumption). Stat-group filter chips for the Companion mod picker added *(Session 016)*.
- **Locked-Queue #1 (renumbered) — D.2-D.5 Survivability Suite — COMPLETE** ✅ *(Session 015)* — `wf_base.warframes` base-stat backfill; the **Resilience metric** (`utils/survivability.js`, Effective Health = `Health × (Armor + 300) / 300`, the real in-game armor mitigation curve); a new **Survivability tab** (Report Card) computing live from base stats + equipped mods + shards; **Survivability Profiles** (`wf_base.survivability_profiles`, a reusable Health/Shield/Overguard/Hybrid Tank reference catalog, deliberately separate from per-build data, `benchmark_tiers` left NULL pending Patrick's real numeric thresholds). Deliberately archetype-free — archetype inference stays A3's job. Verified live against Frost Prime (1674 effective health, hand-checked). A pre-existing service-role grant gap on several `wf_user` tables surfaced during verification was fixed and run by Patrick *(Session 016)*.
- **Live Modded Stats Panels — COMPLETE** ✅ *(Session 016)* — a live "modded stats" panel directly on the Loadout tab, matching the real game's Arsenal screen: Warframe piece shows Health/Shield/Armor/Energy/Sprint Speed/Ability Duration/Efficiency/Range/Strength updating as mods and shards are equipped (`computeModdedWarframeStats()`, sign-aware for dual-effect mods like Overextended/Blind Rage); weapon pieces (Primary/Secondary/Melee) show Fire Rate/Magazine/Reload/Crit Chance/Crit Damage/Status/Punch Through/Multishot (guns) or Attack Speed/Damage/Crit/Status/Range (melee), combining catalog-mod and Riven bonuses off the weapon catalog's real `raw_json` stats (`weaponStats.js`). Survivability's old static "Base Stats" block folded into this instead of living on its own tab. Verified live: Frost Prime's Ability Duration hits exactly 155% off a maxed Primed Continuity; Vectis Prime's modded stats match hand-calculated totals exactly, including a Riven's contribution. Explicitly does not cover ability tooltip numbers (e.g. Nourish's heal amount) — no effect-text data exists for abilities in this DB at all.

---

## 🔴 THE LOCKED QUEUE (in order)

### ~~1. Mods Inventory & DB~~ ✅ COMPLETE — see SHIPPED above
### ~~2. D.2–D.5 Survivability Suite~~ ✅ COMPLETE — see SHIPPED above

### 1. D.7 — Build Recommendation / Flow / Doctrine Adjacency
Flow metric (how well a build chains movement/combat/buffs), doctrine adjacency modeling (structured sister-art/cross-school relationship data, currently only in codex prose). **The real #1 locked-queue item now that Survivability is shipped.** Not yet scoped in detail — per Patrick, the live modded-stats foundation (Session 016) should put this in better shape to scope than before, since Flow likely wants the same real per-mod/per-stat data the new Loadout panels already compute.

### 2. A3 — Predictive Build Crafting / Build Intelligence Layer
Locked queue position unchanged since Aug 19 scoping. Full Bayesian confidence-scoring mechanism and benchmark-gated intervention logic already finalized (see prior roadmap version / PM Update doc for full spec) — implementation still gated on #1 above. Acceptance test remains the Citrine build (infer Health Tank archetype from observation alone, correctly benchmark against Jade Light).

Also folded in: **Ideal Invigoration Profile** — inferred ideal weekly Helminth Invigoration per loadout based on detected build direction/bottleneck. No new infrastructure; consumes A3's existing Observe→Infer→Model→Detect→Simulate→Intervene pipeline.

### 3. Shipment C — Shareable Build URL
Read-only build link.

### 4. Shipment E — OAuth / User Profiles

### 5. Shipment F — Tools
Proportions calculator, build math utilities.

---

## 🧩 FLEX ITEM (no dependencies, insert whenever convenient)

*(none open)*

---

## 🟡 OPEN THREADS

Not locked-queue shipments, but active loose ends:

- **`benchmark_tiers` content** — the 4 Survivability Profiles have real descriptive text but no numeric thresholds yet. Needs Patrick's own live-game judgment on what counts as "Strong"/"Adequate"/etc. per archetype.
- **Open Granola audit decisions** — in-game vs. Gu arsenal audit surfaced pending review items on: Dagath, Gara, Wukong, Voruna, Ash, Revenant, Khora, Atlas. Patrick working through these himself.
- **Moa/Hound companion scope decision** — real, ownable, robotic companions currently excluded from the beast catalog filter (mistagged `productCategory: "Pistols"` in WFCD's data). Not yet confirmed with Patrick either way.
- **Nautilus Prime's "10 total slots"** — observed vs. the Companion tab's uniform 8-slot render; needs confirming whether that's a Prime-only bonus-slot perk.
- **Mark Companion/Posture mods as owned in `mod_inventory`** — the Companion tab's picker correctly shows "No owned mods match this slot" for everything right now since nothing is flagged owned for `category = 'Companion'` yet. Needs a Mods-page pass from Patrick.

---

## 🗑️ DROPPED / CUT

- **Incarnon visual chip redesign** — reviewed, satisfied with current toggle UI, off the roadmap
- **Standalone doctrine tagging/search UI filter** — repositioned into D.7 Doctrine Adjacency
- **Shipment C4 — Forums** — explicitly cut, build sharing gets ~90% of the value without moderation overhead
- **Fall Off (damage falloff) stat group** — cut, Session 013, no verified real mod text to confirm keyword phrasing, unessential
- **Forma counter on each loadout piece** — confirmed decorative (nothing reads the value back), tabled per Patrick's call rather than wired up or removed

## ❄️ DEFERRED / UNSCHEDULED ORPHANS

- **C2 — Friends System**
- **C3 — Clan System**
- **Arcane Phase 2** (Kitgun, Zaw, Amp, Operator, Tektolyst arcanes) — needs separate schema, modular weapon builds not yet modeled
- **Helminth Invigoration `active_until` date model** — supports overlapping invigorations across weeks
- **Ability tooltip numbers** (e.g. Nourish's heal amount, scaled by Power Strength) — blocked on a real data source; `wf_base.warframe_abilities` stores names only, no effect text or scaling formulas anywhere in this DB

---
