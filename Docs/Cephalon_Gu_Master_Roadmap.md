# Cephalon Gu — Master Roadmap
*As of August 27, 2026 — Claude Code context sync (Session 013)*

> **Note on this file:** This is a context-bridge update for Claude Code, not a formal
> `reconcile`-triggered regeneration. It reflects the Mods Inventory & DB arc (locked-queue
> #1) shipping to completion across Sessions 010-013 -- mods, the Loadout builder,
> capacity/drain math, and Riven support are all live -- so Claude Code isn't working
> from a stale picture of that arc as "not yet started."

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
- **B1 — School Navigation Cleanup** ✅ *(Session 013)* — the 14-button school-filter row in `App.jsx`'s Codex header collapsed into a single `<select>` (schools + build counts as options), matching the dropdown pattern already used in `ShardsTab.jsx`/`CopyWeaponModal.jsx`. Verified live: filtering, build count, and header re-title all still work correctly.
- **Locked-Queue #1 — Mods Inventory & DB — COMPLETE** ✅ *(Sessions 010-013)* — the full arc: `wf_base.mods` (1082-row WFCD-seeded catalog) + `wf_user.mod_inventory` ownership/rank tracking (`ModsPage.jsx`, bulk rank editing, stat-group/Aura/Exilus/Augment/Conclave filters); the 8-slot Loadout builder (`ModsLoadoutTab.jsx`/`LoadoutEquipmentSection.jsx`/`LoadoutSlotPickerModal.jsx`) merging Arsenal, Abilities, and Mods into one Warframe/Primary/Secondary/Melee tabbed surface with live capacity/drain math (`utils/modCapacity.js`, matched-vs-mismatched polarity discount, Omni Forma universal polarity); a full mod-catalog data-quality audit (fixed a bug where `is_exilus` was `false` for every non-Warframe mod, removed 6 confirmed never-shipped ghost catalog rows, tagged all 131 Conclave-origin mods with a bulk-exclude workflow); and **Riven mod support** (`wf_user.rivens`, `RivenEditorModal.jsx`) — user-created, weapon-bound mods with hand-typed stats that slot into the same picker/capacity pipeline as real mods with zero formula changes. This was the hard prerequisite for D.2-D.5 below, which is now unblocked.

---

## 🔴 THE LOCKED QUEUE (in order)

### ~~1. Mods Inventory & DB~~ ✅ COMPLETE — see SHIPPED above

### 1. D.2–D.5 — Survivability Suite
Survivability Analytics, Report Card, Survivability Profiles, Resilience metric. Was **blocked until Mods DB exists** — that block is cleared. **Next up.**

### 2. D.7 — Build Recommendation / Flow / Doctrine Adjacency
Flow metric (how well a build chains movement/combat/buffs), doctrine adjacency modeling (structured sister-art/cross-school relationship data, currently only in codex prose).

### 3. A3 — Predictive Build Crafting / Build Intelligence Layer
Locked queue position unchanged since Aug 19 scoping. Full Bayesian confidence-scoring mechanism and benchmark-gated intervention logic already finalized (see prior roadmap version / PM Update doc for full spec) — implementation still gated on #1 and #2 above. Acceptance test remains the Citrine build (infer Health Tank archetype from observation alone, correctly benchmark against Jade Light).

Also folded in: **Ideal Invigoration Profile** — inferred ideal weekly Helminth Invigoration per loadout based on detected build direction/bottleneck. No new infrastructure; consumes A3's existing Observe→Infer→Model→Detect→Simulate→Intervene pipeline.

### 4. Shipment C — Shareable Build URL
Read-only build link.

### 5. Shipment E — OAuth / User Profiles

### 6. Shipment F — Tools
Proportions calculator, build math utilities.

---

## 🧩 FLEX ITEM (no dependencies, insert whenever convenient)

*(none open — B1 shipped, see SHIPPED above)*

---

## 🟡 OPEN THREADS

Not locked-queue shipments, but active loose ends:

- **Open Granola audit decisions** — in-game vs. Gu arsenal audit surfaced pending review items on: Dagath, Gara, Wukong, Voruna, Ash, Revenant, Khora, Atlas. Patrick working through these himself.
- **Companion tracking scoping** — pets/sentinels currently untracked in Gu at all; needs a scoping pass before it can even join the queue. *(Scoping planned for end of Session 013.)*
- **Koumei dropdown bug** — confirmed fixed by Patrick, Session 012. Closed.
- **Revenant's shard goal (2 Crimson, energy-on-spawn)** — done, per Patrick, 2026-08-29. Closed.
- **Dread's 4-primaries 3-Weapon Rule violation** — confirmed fixed by Patrick, 2026-08-29. Closed.
- ~~**Fall Off (damage falloff) stat group**~~ — cut, Session 013. Unessential.

*(Cyte-09/Harrow Archon Shard swaps, previously tracked here, dropped from tracking 2026-08-29 per Patrick — he's handling those directly, no longer needs Gu to carry them as an open thread.)*

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
