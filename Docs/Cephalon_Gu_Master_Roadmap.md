# Cephalon Gu — Master Roadmap
*As of August 25, 2026 — Claude Code context sync (Session 009, in progress)*

> **Note on this file:** This is a context-bridge update for Claude Code, not a formal
> `reconcile`-triggered regeneration (no full lettered shipment has closed since the
> Aug 19 version). It reflects everything shipped in Session 008 plus open threads
> carried into Session 009, so Claude Code isn't working from an 6-day-stale picture.

---

## ✅ SHIPPED

- **Build card grid** — S/A manual tier grading, shard chips, NOW vs GOAL shard tracking
- **Physique/Constitution Badge System** — filterable dropdown, 7 named physiques, per-physique counts
- **Archon Shard Tracker** — ShardEditModal refactor (~880 → ~308 lines), all 6 shard types + Tau-forged scaling, Variant/Apex Variant Constitution badges
- **Arsenal modal redesign** — tabbed Arsenal / Archon Shards, unified autocomplete
- **Arcane DB** — 129 arcanes seeded (`arcane_seed.sql` + MODERN_ADDENDUM), full metadata columns
- **Incarnon system** — boolean adapter toggle, no DB duplication; melee arcane slot fully wired
- **Core Four Arcane Filtering** — all four slot pickers (Warframe/Primary/Secondary/Melee) filter by type, Owned/All toggle, rank display
- **`wf_base.warframes`** — 117 rows, fully seeded, matches live roster
- **A2 — Ability Tracking** ✅ *(complete)* — `wf_base.warframe_abilities`, 468 rows. Batch 3 gap (Wisp Prime, Xaku Prime, Zephyr Prime) confirmed already seeded 2026-08-08, verified correct against live kits — roadmap had gone stale, no code/data work was actually needed.
- **Helminth Invigoration tracking** — per-card modal, delete-then-insert pattern
- **Security hardening** — RLS across both schemas, Security Definer → invoker views, locked search paths
- **Shipment B — Cultivation System** *(largely shipped)* — schools, daos, colors, identity tab, doctrine display
- **`WarframeSelector.jsx`** — click-to-edit searchable typeahead sourced live from `wf_base.warframes`; `prime_variant_id` self-referencing column with 50 base↔Prime pairs; "Prime This Warframe" one-click button *(Session 008)*
- **D.6 — Testing Methodology Log** ✅ *(Session 008)* — `wf_user.build_tests` table (Pass/Fail/Inconclusive verdicts, benchmark archetypes matching A3 vocabulary); `TestingLogTab.jsx` as fifth tab in `BuildDetailOverlay`
- **A1 — Global Arsenal Search** ✅ *(Session 008)* — `ArsenalSearchPage.jsx`, standalone page, client-side plain-text search across weapon and arcane columns on `my_frames`
- **`session-checkin` skill** ✅ *(Session 008)* — packaged recon/reconcile discipline as a persistent Claude Skill
- **`CopyWeaponModal.jsx`** ✅ *(Session 010)* — rebuilt from scratch (original was never committed, lost to history), wired into `ShardEditModal.jsx` Arsenal tab, confirmed working live (Chroma → Frost secondary weapon copy test)
- **Design system pass** ✅ *(Session 010)* — Cinzel/Outfit fonts, custom favicon, app renamed to Cephalon Gu, shared `ui/Panel` / `ui/Button` / `ui/ModalShell` primitives + `constants/theme.js` rolled out across every page and modal, cultivation-color contrast fix (`utils/color.js` lifts unreadable dark identity colors to a legible floor without touching stored data), ArchonShardsPage's off-palette colors fixed
- **Arsenal Search Suite — COMPLETE** ✅ *(Session 010)* — Weapon Stat Threshold Search shipped as a second tab on `ArsenalSearchPage.jsx` (`WeaponStatSearchTab.jsx`). Turned out **no new table was needed** — `wf_base.weapons.raw_json` already carries every stat (crit chance/multiplier, status chance, fire rate, multishot, magazine size for guns; range, combo duration, heavy attack damage, attack speed for melee) from the existing WFCD seed. Client-side threshold filtering across all 665 weapons, category-aware stat sets, slider + type-in per stat with live-computed min/max bounds.
- **D.1 — Armory** ✅ *(Session 010)* — new `wf_user.weapon_inventory` table (real ownership tracking, independent of what's equipped), `ArmoryPage.jsx` with category + auto-derived personality-tag filters (`utils/weaponTags.js`, rules-based off `raw_json` stats), live 3-Weapon Rule validation (a primary/melee weapon on more than 3 warframes gets flagged — secondary exempt, see project memory for the rule's definition), and native drag/drop reassignment onto `ArmoryFrameRoster.jsx`'s per-frame slot targets. Verified live end-to-end including a real DB write via actual drag/drop.

---

## 🔴 THE LOCKED QUEUE (in order)

### 1. Mods Inventory & DB
Own dedicated multi-session arc — hundreds of mods, polarity matching, drain/capacity math, 8-slot loadout schema with forma count. **Hard prerequisite** for everything below it — including giving A3 (#4) complete build-state visibility.

### 2. D.2–D.5 — Survivability Suite
Survivability Analytics, Report Card, Survivability Profiles, Resilience metric. **Blocked until Mods DB exists.**

### 3. D.7 — Build Recommendation / Flow / Doctrine Adjacency
Flow metric (how well a build chains movement/combat/buffs), doctrine adjacency modeling (structured sister-art/cross-school relationship data, currently only in codex prose).

### 4. A3 — Predictive Build Crafting / Build Intelligence Layer
Locked queue position unchanged since Aug 19 scoping. Full Bayesian confidence-scoring mechanism and benchmark-gated intervention logic already finalized (see prior roadmap version / PM Update doc for full spec) — implementation still gated on #1 and #3 above. Acceptance test remains the Citrine build (infer Health Tank archetype from observation alone, correctly benchmark against Jade Light).

Also folded in: **Ideal Invigoration Profile** — inferred ideal weekly Helminth Invigoration per loadout based on detected build direction/bottleneck. No new infrastructure; consumes A3's existing Observe→Infer→Model→Detect→Simulate→Intervene pipeline.

### 5. Shipment C — Shareable Build URL
Read-only build link.

### 6. Shipment E — OAuth / User Profiles

### 7. Shipment F — Tools
Proportions calculator, build math utilities.

---

## 🧩 FLEX ITEM (no dependencies, insert whenever convenient)

- **B1 — School Navigation Cleanup** — top bar crowded with 14 separate school tabs, probably collapses into a dropdown. Zero prerequisites.

---

## 🟡 OPEN THREADS — carried from Session 008 into Session 009

Not locked-queue shipments, but active loose ends:

- **Two pending shard swaps + Revenant's shard goal** — need applying via in-app UI (not a code task, Patrick does this directly).
- **Open Granola audit decisions** — in-game vs. Gu arsenal audit surfaced pending review items on: Dagath, Gara, Wukong, Voruna, Ash, Revenant, Khora, Atlas.
- **Companion tracking scoping** — pets/sentinels currently untracked in Gu at all; needs a scoping pass before it can even join the queue.
- **Koumei dropdown bug** — confirmed **no longer reproducing** as of Session 008. Candidate to close out as resolved, pending one more confirmation.

---

## 🗑️ DROPPED / CUT

- **Incarnon visual chip redesign** — reviewed, satisfied with current toggle UI, off the roadmap
- **Standalone doctrine tagging/search UI filter** — repositioned into D.7 Doctrine Adjacency
- **Shipment C4 — Forums** — explicitly cut, build sharing gets ~90% of the value without moderation overhead

## ❄️ DEFERRED / UNSCHEDULED ORPHANS

- **C2 — Friends System**
- **C3 — Clan System**
- **Arcane Phase 2** (Kitgun, Zaw, Amp, Operator, Tektolyst arcanes) — needs separate schema, modular weapon builds not yet modeled
- **Helminth Invigoration `active_until` date model** — supports overlapping invigorations across weeks

---

## Known open bugs / diagnostics

- **Koumei dropdown** — see Open Threads above (likely resolved, needs final confirmation)
