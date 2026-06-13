# Warframe Jarvis — Master Session Log

> **Living document.** Append only — never rewrite history.
> At the start of each session: paste this document. At the end: update it.
> Maintained by Claude (project manager) and ChatGPT (active dev partner).

---

## Project Overview

Warframe Jarvis is a cinematic personal Warframe build intelligence platform combining:

- React + Vite frontend
- Supabase Postgres backend
- Python ETL pipelines
- Custom cultivation/codex identity system
- Archon shard progression tracking (NOW vs GOAL)
- Full loadout management with weapon autocomplete
- Cinematic frame detail pages
- Normalized weapon database (634 weapons + Incarnon architecture)
- Long-term analytics and AI advisor goals

The platform functions as a **tactical doctrine OS** — not a build tracker, not a CRUD app.
Core identity pillars: immersion, identity, tactical readability, cinematic presentation, progression tracking, doctrine intelligence.

---

## Current Architecture Snapshot

### Frontend
- React + Vite + Tailwind
- Dynamic cultivation theming throughout
- Modular hooks architecture
- Contextual modal editing (detail page only)
- Component architecture:
  - `FrameCard.jsx` — catalog card with school identity rendering
  - `ShardChip.jsx` — shard chip (current + goal sizes)
  - `ShardEditModal.jsx` — Edit Archon Shards (Now/Goal sub-tabs)
  - `BuildDetailOverlay.jsx` — cinematic frame detail page (primary editing entry point)
  - `WeaponInput.jsx` — reusable weapon autocomplete component
  - `useFrames.js` — central frame data hook
  - `useWeapons.js` — centralized weapon fetching and state
  - `shards.js` — shard color/shape constants
  - `SCHOOL_ICONS` — centralized school → symbol → color → doctrine mapping

### Navigation Architecture (IMPORTANT)
> Home (catalog) → Cinematic Detail Page → Edit Arsenal / Edit Archon Shards

- Homepage = command center (browsing only)
- Frame detail page = operational workspace (all editing)
- Editing no longer happens from homepage cards

### Backend
- Supabase Postgres (us-west-1)
- Dual-schema architecture: `wf_base` (reference data) | `wf_user` (personal builds)

### Active Tables
| Table | Purpose |
|---|---|
| `wf_base.warframes` | Canonical frame list |
| `wf_base.archon_shard_effects` | Shard effect reference |
| `wf_base.weapons` | 634 weapons — normalized with Incarnon flags |
| `wf_user.my_frames` | Personal builds + cultivation identity |
| `wf_user.archon_shard_slots` | Current shard loadout |
| `wf_user.archon_shard_slots_target` | Goal shard loadout |
| `wf_user.build_status` | Build readiness flags |
| `wf_user.kpm_sessions` | Kill performance data |

### `wf_base.weapons` Schema
| Column | Purpose |
|---|---|
| weapon_id | PK |
| name | Weapon name |
| category | Primary / Secondary / Melee |
| weapon_type | Rifle, Shotgun, Pistol, etc. |
| mastery_rank | MR requirement |
| slot | primary / secondary / melee |
| tradable | Boolean |
| vaulted | Boolean |
| raw_json | Full WFCD payload |
| is_incarnon | Native Incarnon flag |
| base_weapon_name | Parent weapon for Incarnon Genesis tracking |

### `wf_user.my_frames` Key Columns
- `cultivation_color` — hex color per frame
- `cultivation_school` — school name
- `cultivation_art` — wuxia dao name

### ETL Scripts
| Script | Purpose |
|---|---|
| `ETL/migrate_to_supabase.py` | Initial Excel → Supabase migration |
| `ETL/seed_cultivation_colors.py` | Seeds cultivation identity for all frames |
| `ETL/seed_weapons.py` | Seeds 634 weapons into wf_base.weapons |

---

## Feature Status Tracker

| Feature | Status |
|---|---|
| Basic frame cards | COMPLETE |
| Current + Goal shard editing | COMPLETE |
| Goal persistence | COMPLETE |
| Copy Goal → Current | COMPLETE |
| Copy Goal → Another Frame | COMPLETE |
| School visual system + SCHOOL_ICONS | COMPLETE |
| Cinematic detail overlay | COMPLETE |
| Contextual editing (detail page only) | COMPLETE |
| Edit Arsenal (inside detail page) | COMPLETE |
| Edit Archon Shards (inside detail page) | COMPLETE |
| Immediate tier updates | COMPLETE |
| Cultivation doctrine rendering | COMPLETE |
| School filter bar | COMPLETE |
| Cultivation color ETL (54/57 frames) | COMPLETE |
| Weapon DB — 634 weapons seeded | COMPLETE |
| Weapon autocomplete (WeaponInput component) | COMPLETE |
| useWeapons hook | COMPLETE |
| Keyboard navigation in autocomplete | COMPLETE |
| Incarnon native weapon flagging | COMPLETE |
| Arcane autocomplete | IN PROGRESS |
| Melee arcane integration | IN PROGRESS |
| Incarnon toggle architecture | IN PROGRESS |
| Shard buff metadata system | IN PROGRESS |
| School page navigation | PLANNED |
| Themed school pages | PLANNED |
| Animated elemental school effects | PLANNED |
| Phase 5 — Enhanced Autocomplete | PLANNED |
| Phase 6 — Intelligent Weapon Ranking | PLANNED |
| Phase 7 — Doctrine Intelligence Layer | PLANNED |
| Phase 8 — True Predictive Search | PLANNED |
| KPM dashboard | PLANNED |
| Recommendation engine | PLANNED |
| Analytics layer | PLANNED |
| AI build advisor (Jarvis) | PLANNED |
| Mobile optimization | NOT STARTED |

---

## Full Roadmap

### Phase 1 — Database + ETL ✅
Supabase schema, Python ETL, 57 frames migrated from Excel.

### Phase 2 — Catalog UI ✅
Card grid, shard chips, NOW/GOAL rows, tier badges, school identity, cinematic detail page.

### Phase 3 — KPM Dashboard
Session log table, vs Hayden Tenno baseline, per-frame run history, manual session entry.

### Phase 4 — Weapon DB Integration ✅
634 weapons seeded. Autocomplete complete. Incarnon architecture defined.

### Phase 5 — Enhanced Weapon Autocomplete
Arrow key navigation, tab completion, best-match prioritization, favorite/recent weighting, category grouping, Incarnon prioritization.

### Phase 6 — Intelligent Weapon Ranking
Context-aware recommendation ordering. Frame/doctrine/shard/arcane synergy.
Example: Mesa typing "re" prioritizes Redeemer Prime, Regulators, Rauta — not alphabetical.

### Phase 7 — Doctrine Intelligence Layer
Weak build link detection, replacement recommendations, build optimization, combat role identification, school synergy validation, arcane recommendation engine.
Example outputs:
- "This build lacks viral primer support."
- "Battery/Molt doctrine would scale better with Burston Incarnon."
- "Current shard distribution underutilizes shield gate scaling."

### Phase 8 — True Predictive Search Engine
Fuzzy matching, typo correction, alias recognition, search scoring, intent-aware retrieval.
Libraries considered: Fuse.js, MiniSearch, FlexSearch.
Example: typing "prae" still finds Praedos.

### Long-Term
School navigation pages, animated elemental school environments, doctrine lore expansion, mastery progression, school ranking systems, combat history, frame lineage.

---

## Cultivation School Reference

14 schools. Each frame has `cultivation_color`, `cultivation_school`, `cultivation_art`.

| School | Key Frames | Color Range |
|---|---|---|
| Crimson Sanguinary School | Garuda Prime, Valkyr Prime, Kullervo | Deep reds |
| Adolla Pyric School | Ember Prime, Wisp Prime, Jade | Oranges/golds |
| Hallowed Path of Heaven's Light | Oberon Prime, Trinity Prime, Harrow Prime, Baruuk Prime | Greens/whites/blues |
| Heavenly Mandate Pantheon | Nezha Prime, Wukong Prime, Excalibur Umbra | Vermilion/gold/black |
| Storm Heaven Convocation | Volt Prime, Gyre, Gauss Prime, Zephyr Prime, Styanax, Hildryn Prime, Mag Prime | Blues/golds |
| Moonless Veil Order | Ash Prime, Loki Prime, Ivara Prime, Mirage Prime, Voruna, Banshee Prime | Darks/jades |
| Necropolis Dominion | Nekros Prime, Sevagoth, Dagath | Purples/darks |
| Plague Garden Sect | Saryn Prime, Nidus Prime, Oraxia, Nokko, Qorvex | Greens/maroons |
| Tidal Abyss Confraternity | Hydroid Prime, Frost Prime, Gara Prime, Citrine, Khora Prime | Blues/whites/silvers |
| Cosmic Antimatter Council | Nova Prime, Caliban, Xaku Prime, Nyx Prime | Magentas/purples |
| Desert Crown Reliquary | Inaros Prime | Deshret Gold |
| Ironclad Mountain Hall | Rhino Prime, Atlas Prime, Grendel, Chroma Prime | Bronzes/crimsons |
| Phantom Theater Atelier | Octavia Prime, Dante | Lavender/indigo |
| Chronos Engineering Bureau | Protea Prime, Vauban Prime, Mesa Prime, Cyte-09, Koumei, Uriel | Teals/cobalts/crimsons |

---

## Key Design Decisions (permanent record)

| Decision | Reasoning | Session |
|---|---|---|
| Supabase over SQL Server | Cloud-hosted, auto API, edge functions for AI later | 000 |
| React + Vite + Tailwind | Same stack as Scent Cloud, familiar pattern | 000 |
| Wide shard slots (1 row/frame) | Matches how builds are thought about | 000 |
| Two shard tables (current + target) | Clean separation of NOW vs GOAL states | 001 |
| Cultivation color system | Wuxia-inspired identity — each frame has a dao and color | 002 |
| Volt color: `#5A6472` | Original `#161D23` too dark on black UI | 002 |
| Nidus color: `#4A0E0E` | Deep contained crimson — mastery over infestation | 002 |
| Cinematic UI over dashboard | Platform identity: codex OS not spreadsheet | 002 |
| SCHOOL_ICONS centralized | Schools/symbols/colors/doctrine all synchronized | 002 |
| Home → Detail → Edit flow | All editing contextual inside detail page | 003 |
| Edit Arsenal + Edit Shards separated | Maintains immersion, contextual editing | 003 |
| Incarnon toggle not variant spam | One weapon + toggle state vs separate dropdown entries | 003 |
| Genesis records in DB, hidden from UI | Needed for intelligence layer, not for user selection | 003 |
| JSX wholesale replacement | Partial patching causes parse failures | 003 |
| Cultivation colors must be visible on dark theme | Identity + readability both required | 003 |
| wf_base = reference, wf_user = personal | Clean normalized dual-schema architecture | 003 |

---

## Open Issues / Parked Items

| Item | Notes | Session Raised |
|---|---|---|
| Qorvex — no build data | No weapons, title, or shards. Use detail page to populate | 002 |
| 3 frames missing cultivation_color | Qorvex + 2 name mismatches in seed script | 002 |
| cultivation_school + cultivation_art | Verify columns exist and are populated in Supabase | 002 |
| Remove top-right edit buttons from cinematic pages | Replace with click-panel-to-edit UX | 003 |
| Click Arsenal panel to edit arsenal | Queued UX change | 003 |
| Click Archon Shards panel to edit shards | Queued UX change | 003 |
| Add melee arcane field | Currently in progress | 003 |
| Arcane autocomplete | In progress | 003 |
| Incarnon toggle system | Architecture defined, not built | 003 |
| Hide Genesis records from dropdowns | DB keeps them for intelligence, UI hides them | 003 |
| Shard buff-purpose metadata | Final architecture for color + tau + specific buff | 003 |
| School page architecture | How thematic? Animated effects? Not decided | planned |
| Doctrine lore expansion | Mastery progression, school rankings | parked |

---

## Important Design Philosophy

> Warframe Jarvis is not a CRUD app. It is a **tactical doctrine OS**.

Core pillars: Immersion · Identity · Tactical readability · Cinematic presentation · Progression tracking · Doctrine intelligence

---

## Session Log

---

### Session 000 — Initial Foundation
**Date:** 2026-05-10

**Accomplished:**
- Established full project vision and stack
- Migrated from SSMS/FastAPI to Supabase
- Deployed 7-table Postgres schema
- ETL migrated 57 frames + 10 KPM sessions from Excel
- Built React + Vite frontend, card grid, shard editing, useFrames hook

**Bugs Fixed:**
- Supabase permission denied → GRANT statements
- on_conflict missing unique constraint → ALTER TABLE
- Python venv not activated at root
- Supabase anon key truncated in .env

---

### Session 001 — Goal Tracking & Workflow Systems
**Date:** 2026-05-10

**Accomplished:**
- Refactored monolithic App.jsx into component architecture
- Built NOW vs GOAL shard system with separate Supabase persistence
- Added Copy Goal → Current and Copy Goal → Another Frame
- Added school-sorted frame copy modal
- Added clear slot / clear all current shards

**Bugs Fixed:**
- JSX bracket mismatches
- Goal rows mirroring current rows
- Incorrect state propagation

---

### Session 002 — Cultivation Color System + Cinematic UI
**Date:** 2026-05-11

**Accomplished:**
- Generated full cultivation codex: 57 frames × 14 schools
- Added cultivation_color, cultivation_school, cultivation_art to DB
- ETL seed script — 54/57 frames seeded
- Wired cultivation colors into card title styling (S/A/B tier rules)
- Built school filter bar and cinematic BuildDetailOverlay
- Built full loadout editor (Loadout tab + Shards tab)
- Platform transitioned: build tracker → cinematic cultivation codex OS

**Color Decisions:**
- Volt: `#161D23` → `#5A6472` | Nidus: `#4A0E0E` | Loki: `#2A4A6B` | Nekros: `#5E2D8C`

**Session length:** ~7–9 hours

---

### Session 003 — Cinematic Architecture + Weapon Intelligence Foundation
**Date:** 2026-05-11 → 2026-05-12
**Timing:** ~5:15 PM CST → 5:25 AM CST
**Duration:** ~12 hours 10 minutes — longest and most architecturally significant session to date

**Session Intensity:**
This session transitioned the project from UI prototype experimentation into scalable application architecture — normalized database design, modular frontend systems, ETL-driven intelligence infrastructure, and contextual cinematic UX. Major foundational systems established in a single session.

**Accomplished:**

1. **Cinematic Build Detail Page**
   - Full-screen frame page: hero banner, doctrine display, arsenal panel, archon shard panel, cultivation doctrine section
   - Dynamic school color theming + atmospheric background gradients
   - Navigation flow from homepage cards

2. **Contextual Editing System**
   - Homepage = command center (browse only)
   - Frame detail page = operational workspace (all editing)
   - Arsenal and shard editing tied directly to selected frame page

3. **School System Expansion**
   - School names, doctrine names, symbols/icons
   - School-based visual identity throughout
   - SCHOOL_ICONS centralized mapping fixed earlier inconsistencies

4. **Copy Goal → Current**
   - One-click synchronization of goal shard setup to current
   - Use case: partial shard progression, maintaining parity after slotting

5. **Weapon Database Foundation**
   - Created `wf_base.weapons` with normalized schema
   - Fields: weapon_id, name, category, weapon_type, mastery_rank, slot, tradable, vaulted, raw_json, is_incarnon, base_weapon_name
   - Built `ETL/seed_weapons.py` — fetches, normalizes, seeds, handles upserts
   - 634 weapons seeded successfully

6. **Weapon Autocomplete System**
   - Live search with dropdown suggestions
   - Keyboard navigation (arrow keys + enter)
   - MR display, weapon type display
   - Filtering by slot
   - Prioritized matching
   - Reusable `WeaponInput` component

7. **useWeapons Hook**
   - Centralized weapon fetching and frontend state
   - Scalable foundation for future filtering and intelligence

8. **Incarnon Architecture**
   - Old: weapon + incarnon variants as separate selectable entries
   - New: base weapon selected + incarnon toggle state
   - Avoids dropdown clutter, matches actual ownership logic
   - Native Incarnons flagged: Laetum, Phenmor, Praedos, Felarx, Innodem, Onos, Ruvox, Thalys
   - Incarnon Genesis records kept in DB for intelligence layer, hidden from UI dropdowns

**Bugs Fixed:**
- Cinematic page transparency → refactored backdrop layering, opacity, z-index
- Supabase permission denied on weapons → GRANT SELECT/INSERT/UPDATE to service_role
- Frontend autocomplete returning no results → added grant usage on wf_base + public read policy
- Fake Incarnon generation (Coda Bubonico Incarnon) → replaced loose substring logic with canonical dataset
- Volt school color invisible → updated seeded hex to brighter gray-blue `#5A6472`

**Queued Changes (carry forward to next session):**
1. Remove top-right edit buttons from cinematic pages
2. Click Arsenal panel to edit arsenal
3. Click Archon Shards panel to edit shards
4. Add melee arcane field
5. Add arcane autocomplete
6. Add Incarnon toggle system
7. Hide Genesis records from user-facing dropdowns
8. Add shard buff-purpose metadata
9. Redesign shard visuals to resemble actual Archon shards
10. Add weapon recommendation intelligence
11. Add doctrine-aware advisory system

**State at end of session:**
Platform now contains: identity systems, doctrine systems, normalized weapon infrastructure, cinematic navigation, progression systems, autocomplete UX, scalable modular architecture.

**Next Priority Queue:**
1. Queued UX changes (click-to-edit panels, remove top-right buttons)
2. Arcane autocomplete + melee arcane field
3. Incarnon toggle system
4. Shard buff metadata architecture decision
5. School navigation pages
6. KPM dashboard
7. Doctrine intelligence / recommendation engine
8. Analytics layer
9. AI build advisor (Jarvis layer)
10. Mobile optimization
