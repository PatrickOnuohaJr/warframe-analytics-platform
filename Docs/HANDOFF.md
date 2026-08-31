# Handoff — Cephalon Gu

*Written 2026-08-31, end of Session 016 (amended). Read this first in a fresh session, then discard/overwrite it next handoff — it's a pick-up-here note, not a historical record. The historical record is `Docs/Session Logs/Warframe_Jarvis_Session_Log.md`.*

## Where things stand

**Live Modded Stats Panels — fully shipped, both Warframe and weapons.** Real stats move live on the modding screen as mods/shards/arcanes go on, same as the real game's Arsenal. `computeModdedWarframeStats()` in `utils/survivability.js`, `computeModdedWeaponStats()` in `utils/weaponStats.js`. Verified against multiple real builds (Okina Prime, Vectis Prime w/ Riven, Frost Prime).

**Canonical Ability Data Pipeline — shipped, full catalog.** This was the big lift after Live Modded Stats: `wf_base.warframe_abilities` only ever stored ability *names*, so ability tooltips showed nothing real. Built a full ingestion pipeline instead of hand-authoring:
- **Sources**: DE's own Public Export (`calamity-inc/warframe-public-export-plus`) for Energy cost — the only numeric field it has; Warframe Wiki raw wikitext (`?action=raw`, no HTML scraping) for Duration/Range/Strength.
- **Schema** (`DB/Migrations/20260831_add_ability_parameters.sql`): `wf_base.ability_catalog` + `wf_base.ability_parameters`, keyed by ability *name* (not per-frame — dedupes 468 slot-rows down to 266 real abilities, and gives a Helminth-only ability like Nourish a real home). Per-parameter provenance (`source`/`source_ref`/`verified_note`), a `formula_key` registry-slug for irregular math, a `context` (`base`/`subsumed`) for Helminth-cast differences.
- **Two hand-verified irregularities** encoded as named overrides in `utils/abilityFormulas.js`: Snow Globe's compound Armor-dependent health formula, Nourish's subsumed-cast values (zero healing, 1 Viral stack not 10, different energy-multiplier formula) — both cited against real wiki worked examples, never guessed.
- **Compute layer**: `utils/abilityStats.js`, consumes `computeModdedWarframeStats`'s existing Duration/Efficiency/Range/Strength/Armor output rather than recomputing. `AbilitiesEditor.jsx` now shows real live stats per ability instead of a bare name.
- **Result**: 255/266 abilities (95.9%) ingested with real computed stats. 11 fail wiki-title resolution (naming mismatches this app's naive `name→title` convention can't derive — logged as failures, not guessed). 161 abilities have at least one field still surfaced as "—" pending a human read of the actual wiki prose (expected, not a shortfall).
- **4 real bugs found scaling from a 5-ability pilot to the full 266-ability catalog** (documented in the Session 016 log entry): a regex bleeding an empty field's capture into the next line, a Windows console Unicode crash on ∞/≤/≥, duplicate parameter-key collisions on shared wiki labels, and "N/A"/infinity values rendering as broken pseudo-stat tiles instead of being dropped.

**Build-accuracy quick fixes — shipped.** "Modded Stats" label → "Stats". Mod/Riven effect-text now shows directly on every slot card (Blind Rage's card shows "+99% Ability Strength -55% Ability Efficiency", not just its name). Arcane effect-text tooltips added. Caught and fixed a real seeded-data bug in the process: `wf_base.arcanes`' Arcane Persistence was missing its shield-removal clause — corrected in the DB against a verified wiki screenshot, and wired into `computeModdedWarframeStats` as an explicit named case (`SHIELD_REMOVING_ARCANES`).

**D.7 (Flow / Doctrine Adjacency) — scoping IN PROGRESS, not shipped.** Real progress made, but no schema or code yet:
- Read all 60 build doctrine texts and found 10 explicit cross-Warframe relationship instances already in Patrick's own lore prose — grounded the taxonomy in real evidence, not invented categories.
- Landed on 5 relationship types: Sibling/Differentiation (modeled as named clusters, not forced pairwise edges), Sister Art, Cross-School Bridge, Dual Citizenship, Inverse/Shadow (kept separate from Bridge per Patrick's call).
- **Real new requirement surfaced and confirmed by Patrick**: Art/School must be canonical `wf_base` reference data with stable IDs, kept separate from which Art a build currently embodies — Patrick wants multiple distinct builds per Warframe eventually, so D.7's schema must NOT assume 1:1 Art↔Warframe forever, even though only one build per Warframe exists today.
- Provenance (which doctrine text asserts a relationship) must be tracked separately from relationship meaning, extensible beyond doctrine prose later.
- **Not yet done**: the actual schema, and Flow's output shape (component tiles vs. a combined score — open question, "let's figure it out together").

**Companion mod picker filter chips + service-role grant gap — shipped** (unchanged from before, see prior session details in the log).

## Site redesign — separate workstream, not mine

Unchanged: Patrick assigned a full site-redesign campaign ("The Cultivated Arsenal") to **Codex**, running independently of these Claude Code sessions. `AGENTS.md`, `CHANGELOG.md`, `REDESIGN_CAMPAIGN_PLAYBOOK.md`, `Docs/redesign/` are Codex's workstream — not touched this session. (Also saved as project memory: `project_codex_handles_redesign`.)

Patrick is also running his own parallel "Static Data" ingestion pipeline for Arcanes (separate migrations/diagnostics/tests/outputs under `DB/Diagnostics/`, `DB/StaticData/`, `DB/Tests/`, `Docs/Static Data/`) — untouched by this session, flagged but not investigated. Worth reconciling provenance/override conventions with the ability-data pipeline once both are further along, since they're solving adjacent problems for different catalogs.

## Next up

**D.7 resumes** — pick up exactly where scoping paused: design the Doctrine Adjacency schema (Art/School canonical tables + typed relationship table with provenance-as-citation), then settle Flow's output shape with Patrick. The live modded-stats + ability-data foundations now exist, so Flow can likely reuse real per-mod/per-ability computation rather than needing new math.

Newly-confirmed real requirements, neither scoped nor started:
- **Multi-build-per-Warframe support** — confirmed as a real future need during D.7 scoping, not to be built now, but D.7's schema must not foreclose it.
- **3→6 Loadout Config expansion** (mods + abilities per config) — flagged during the build-accuracy pass, not started.

## Things a fresh session should know without digging

- **DB writes**: the Supabase key in `.env` is data-plane only — no DDL. New tables/columns need a migration file in `DB/Migrations/`, handed to Patrick to run manually in the Supabase SQL Editor. Row *deletes* get blocked by this environment's auto-mode classifier even with explicit confirmation — hand Patrick a one-shot script instead.
- **PostgREST caps every query at 1000 rows silently.** Always use `warframe-client/src/lib/fetchAll.js` for anything that could return >1000 rows.
- **Port 5173 may be occupied by an unrelated app on this machine.** `vite.config.js` reads `PORT` from env, `.claude/launch.json` has `"autoPort": true` — `preview_start` should just pick a free port.
- **`utils/survivability.js` and `utils/weaponStats.js` are the source of truth for all modded-stat math** — both grounded in real verified mod/weapon text. `parseStat()` (shared regex helper) lives in `utils/statPatterns.js`.
- **`utils/abilityStats.js` + `utils/abilityFormulas.js` are the source of truth for ability math.** `formula_key` is a named-registry slug, never a JSONB DSL — `git grep formula_key` finds every irregular ability. A `formula_key` row with no matching registry entry is treated as a bug (warns, returns null) — never silently approximated.
- **Ability data provenance matters**: every `ability_parameters` row has `source` (`de_public_export`/`wiki`/`manual`) and `source_ref`. A field that failed to parse is `base_value = null`, rendered as `—` — never guessed, never defaulted to 0.
- **`utils/rivenStats.js` and `utils/modCapacity.js`'s Riven/Aura constants** remain the source of truth for Riven stat pools/rules and the drain curve.
- **`SlotBox` lives in its own file** (`warframe-client/src/components/SlotBox.jsx`), shared by Loadout and Companion, now also renders per-mod effect-text descriptions.
- **3-Weapon Rule** and other project-specific game rules are in the auto-memory system, not the codebase.
- **The redesign campaign is Codex's workstream, not Claude Code's** — don't touch its direction without Patrick's say-so.
- **`reconcile` vs `recon`**: `recon` is read-only, chat-only, never touches files. `reconcile` writes the session log entry and only regenerates the roadmap if a full lettered shipment (A-F) closed that session — D.7 shipping partial scoping does NOT count. This session's `reconcile` ran twice (once mid-session, once at close) against the same Session 016 entry rather than creating a new session number, since no real session boundary was crossed — see that entry's own header note if a future session needs to understand why.

## Open threads (not blocking, just not forgotten)

- 11 abilities with failed wiki-title resolution needing hand-curated `wiki_title` overrides (e.g. "Shroud Of Dynar", "Rest & Rage", slash-containing dual-ability names).
- 161 abilities with at least one field still unresolved ("—") — expected to close out gradually as Patrick scrutinizes specific builds, same organic pattern as how Snow Globe/Nourish's overrides were found.
- `benchmark_tiers` for the 4 Survivability Profiles — needs Patrick's real numeric thresholds.
- Moa/Hound companion scope decision — still unconfirmed.
- Nautilus Prime's "10 total slots" — still unconfirmed; Companion tab renders 8 uniformly.
- Companion/Posture mod ownership not yet marked in `mod_inventory` — tab works but will look empty until Patrick does that pass.
- Open Granola audit decisions: Dagath/Gara primary weapons, Wukong/Voruna/Ash slot swaps, Revenant's melee replacement, Khora's three empty slots, Atlas's utility primary — Patrick working through these himself.
- Forma counter on each loadout piece — confirmed decorative, tabled per Patrick's call.

## Session cadence

Patrick wants sessions forked at natural checkpoints (right after something ships) rather than one marathon session. He's planning to build his own handoff skill to automate a doc like this one; until that exists, write one manually when a session is winding down.
