# Handoff — Cephalon Gu

*Written 2026-08-29, end of Session 015. Read this first in a fresh session, then discard/overwrite it next handoff — it's a pick-up-here note, not a historical record. The historical record is `Docs/Session Logs/Warframe_Jarvis_Session_Log.md`.*

## Where things stand

**D.2–D.5 Survivability Suite — fully shipped.** This was the actual #1 locked-queue item on the roadmap (Companion tracking, shipped earlier this session, was a parallel scoped feature, not the queue item itself). All four pieces are live and verified against real data:

- **Base Warframe stats (real prerequisite, wasn't in the roadmap's assumption)**: `wf_base.warframes` never carried Health/Shield/Armor/Energy/Sprint Speed columns — an earlier abandoned SQL Server schema had them, but they never migrated into the live Postgres rebuild. Migration `DB/Migrations/20260829_add_warframe_base_stats.sql` + seed `DB/Seeds/seed_warframe_stats.py` backfilled all 117 existing catalog rows from WFCD by name-match, update-only (zero risk of inserting Necramech/junk rows). Ran clean: 117/117, 0 misses.
- **D.5 Resilience metric** (`warframe-client/src/utils/survivability.js`): Effective Health = `Health × (Armor + 300) / 300` (the real in-game armor mitigation curve), Effective Shield = flat (no armor mitigation on shields in-game). Deliberately narrow v1 scope — only flat (shard) or plain `+N%` (mod) Health/Shield/Armor bonuses are counted. Conditional/proc-based defensive effects (Adaptation, Rolling Guard, Quick Thinking, Brief Respite), Overguard, Energy, and Arcanes are explicitly **not** reflected — none of that has effect-text data anywhere in this DB (abilities and arcanes are stored as names only, no `raw_json`).
- **D.2 Analytics / D.3 Report Card**: new **Survivability** tab, sibling to Companion/Loadout in `BuildDetailOverlay`, computing live from base stats + the Warframe piece's equipped mods (`loadout_slots`/`mod_inventory`) + equipped Archon Shard bonus text (already resolved on `frame.shard_slots`, no extra fetch needed).
- **D.4 Survivability Profiles**: explicitly scoped by Patrick as a **separate schema from per-build data** — `wf_base.survivability_profiles` is a reusable reference catalog (Health Tank, Shield Tank, Overguard Tank, Hybrid Tank), each with authored `defensive_layers`/`relevant_metrics`/`dependencies` text. `benchmark_tiers` is deliberately **NULL on every row** — no fabricated numeric thresholds; real tier cutoffs need Patrick's own live-game judgment before they're authored in (`utils/survivability.js`'s `pickBenchmarkTier()` is a no-op until that happens). Per-build data — which profile a build is compared against, plus an optional manual goal override — lives in the new `wf_user.survivability_goals` table. Field-tested results already had a home before this session (`wf_user.build_tests`, D.6, shipped) and weren't duplicated.
- **Deliberately archetype-free**: Resilience itself never infers or labels a build's archetype — that stays **A3**'s job (its acceptance test is literally inferring "Health Tank" from observation). Comparing a build against a Profile is an explicit user choice (a dropdown pick), not automatic categorization — avoids two systems doing overlapping archetype work.
- Verified live end-to-end: Frost Prime (Umbral Fiber +100% Armor, Umbral Vitality +100% Health) computes to exactly 1674 effective health by hand-checking the formula against its known base stats (270 HP / 315 Armor). Garuda Prime correctly reports "no countable defensive mods/shards" rather than guessing. Profile selection and goal-state inputs both persist correctly across reload via the app's real anon-key path.
- **Real, pre-existing (not introduced this session) gap found while verifying**: several `wf_user` tables — `rivens`, `build_tests`, `weapon_inventory`, and now `survivability_goals` — aren't readable by the service-role key ad-hoc debug/seed scripts use (`permission denied for table X`, `GRANT SELECT ... TO service_role` needed). Doesn't affect the real app at all (confirmed the anon-key path works fine in-browser for all of this session's new tables) — just makes one-off verification scripts against those specific tables fail. Worth a grant cleanup pass sometime, not urgent, not scoped this session.

**Companion tab UI — shipped and verified earlier this session.** New "Companion" tab, sibling to Loadout in `BuildDetailOverlay`, with two sub-tabs (Companion, Companion Weapon), each with an identity picker, an 8-slot mod grid, and (Companion Weapon only) a Posture special slot.

- New files: `CompanionTab.jsx`, `CompanionEquipmentSection.jsx`, `SlotBox.jsx` (extracted out of `LoadoutEquipmentSection.jsx` so both tabs share the mod-slot tile instead of duplicating it), `hooks/useCompanions.js` + `hooks/useCompanionWeapons.js`.
- Identity is free-text into `my_frames.companion`/`companion_weapon` via the existing `WeaponInput` autocomplete (unmodified, reused as-is). Both sub-tabs are **always visible** (unlike weapon pieces' Armory-gated visibility) since Companion has no other UI surface that sets these columns yet.
- Mod split by `compat_name`: Claws-family values (`Claws`, `Kubrow Claws`, `Kavat Claws`, `Helminth Claws`) → Companion Weapon; everything else (`ROBOTIC`, `BEAST`, `Sentinel`, breed-name exclusives) → Companion body. Posture mods (the Claws-family subset with `is_aura = true`) get their own slot, reusing `effectiveDrain()`/`isDiscounted()`'s existing `isAuraSlot=true` path verbatim.
- Companion body has **no special slot** (confirmed Sentinels have no dedicated Precept slot — Precept mods just occupy regular numbered slots), just a plain 8-slot grid.
- Real bug caught and fixed during verification: `WeaponInput`'s dropdown row key falls back to `weapon_id ?? arcane_id`, both undefined for a companion row — fixed by aliasing an id onto the mapped rows in `CompanionTab.jsx`, not by touching the shared component.
- Also fixed, unrelated: dev server port 5173 was being squatted by an unrelated app on this machine ("Scent Cloud"). `vite.config.js` now reads `PORT` from env, `.claude/launch.json` has `"autoPort": true` — `preview_start` picks a free port automatically now.

**`seed_mods.py` idempotency bug — fixed and merged earlier this session.** A parallel fork (`task_6e01ca99`) had already written and tested the fix (verified: second run updates all 1082 rows, 0 duplicate-key errors) but left it uncommitted. Merged into `main`, worktree/branch cleaned up.

## Site redesign — separate workstream, not mine

Unchanged: Patrick assigned a full site-redesign campaign ("The Cultivated Arsenal") to **Codex**, running independently of these Claude Code sessions. `AGENTS.md`, `CHANGELOG.md`, `REDESIGN_CAMPAIGN_PLAYBOOK.md`, `Docs/redesign/` are Codex's workstream — discovery/concept phase only, not touched this session. `AGENTS.md`'s preservation rules (Cinzel typography, dark palette, dropdown school filter, exact Arsenal slot geometry) still apply to any product code regardless of agent. (Also saved as project memory: `project_codex_handles_redesign`.)

## Next up

The locked queue's #1 item is now complete. Per the roadmap, #2 is **D.7 — Build Recommendation / Flow / Doctrine Adjacency** (Flow metric, doctrine adjacency modeling), then #3 is **A3 — Predictive Build Crafting / Build Intelligence Layer** (the Bayesian archetype-detection system Resilience deliberately stayed out of the way of this session). Check `Docs/Cephalon_Gu_Master_Roadmap.md` before starting either — neither has been scoped in detail yet the way Companion tracking or Survivability were.

Loose ends from this session, none blocking:

- **`benchmark_tiers` content** — the 4 Survivability Profiles have real descriptive text but no numeric thresholds yet. Needs Patrick's own live-game judgment on what counts as "Strong"/"Adequate"/etc. for each archetype before the Report Card's benchmark comparison does anything beyond "no tiers authored yet."
- **Service-role grant gap — fixed 2026-08-29, pending Patrick running it**: `DB/Migrations/20260829_grant_service_role_wf_user.sql` grants `service_role` read access on `rivens`, `build_tests`, `weapon_inventory`, `survivability_goals`. Needs Patrick to run it manually in the Supabase SQL Editor (data-plane key can't do grants).
- **Mark Companion/Posture mods as owned** — the Companion tab's picker correctly shows "No owned mods match this slot" for everything right now since nothing in `mod_inventory` is flagged owned for `category = 'Companion'` yet. Expected, not a bug — just needs Patrick to do a Mods-page pass.
- Moa/Hound companion scope decision, Nautilus Prime's possible 10-slot bonus — both carried from Session 014, still unconfirmed.
- ~~Stat-group filter chips for Companion mods in the picker~~ — shipped 2026-08-29 (`Companion`/`CompanionWeapon` entries added to `modMeta.js`, verified live in both sub-tabs' pickers).

## Things a fresh session should know without digging

- **DB writes**: the Supabase key in `.env` is data-plane only — no DDL. New tables/columns need a migration file in `DB/Migrations/`, handed to Patrick to run manually in the Supabase SQL Editor. Row *deletes* get blocked by this environment's auto-mode classifier even with explicit confirmation — hand Patrick a one-shot script instead.
- **PostgREST caps every query at 1000 rows silently.** Always use `warframe-client/src/lib/fetchAll.js` for anything that could return >1000 rows.
- **Port 5173 may be occupied by an unrelated app on this machine.** `vite.config.js` reads `PORT` from env now, `.claude/launch.json` has `"autoPort": true` — `preview_start` should just pick a free port. If a preview ever looks like the wrong app, check the page title before assuming the dev server is broken.
- **`SlotBox` lives in its own file** (`warframe-client/src/components/SlotBox.jsx`), shared by Loadout and Companion. Reuse it for any future equipment-piece UI.
- **`utils/survivability.js` is the source of truth for the Resilience formula** — grounded in the real in-game armor mitigation curve, not guessed. Its header comment lists exactly what is and isn't counted; don't extend its scope (Overguard, Arcanes, conditional mods) without a real new data source to back it, same rigor as everything else in this app.
- **`utils/rivenStats.js` and `utils/modCapacity.js`'s Riven/Aura constants** remain the source of truth for Riven stat pools/rules and the drain curve.
- **3-Weapon Rule** and other project-specific game rules are in the auto-memory system, not the codebase.
- **The redesign campaign is Codex's workstream, not Claude Code's** — don't touch its direction without Patrick's say-so.

## Open threads (not blocking, just not forgotten)

- `benchmark_tiers` for the 4 Survivability Profiles — needs Patrick's real numeric thresholds.
- Service-role grant gap on several `wf_user` tables — migration written 2026-08-29 (`DB/Migrations/20260829_grant_service_role_wf_user.sql`), pending Patrick running it in the Supabase SQL Editor.
- Moa/Hound companion scope decision — still unconfirmed.
- Nautilus Prime's "10 total slots" — still unconfirmed; Companion tab renders 8 uniformly.
- Companion/Posture mod ownership not yet marked in `mod_inventory` — tab works but will look empty until Patrick does that pass.
- Open Granola audit decisions: Dagath/Gara primary weapons, Wukong/Voruna/Ash slot swaps, Revenant's melee replacement, Khora's three empty slots, Atlas's utility primary — Patrick working through these himself.
- Dread's 4-primaries 3-Weapon Rule violation — confirmed fixed by Patrick, 2026-08-29. Closed.
- Revenant's shard goal (2 Crimson, energy-on-spawn) — done, per Patrick, 2026-08-29. Closed.
- Cyte-09/Harrow Archon Shard swaps — dropped from tracking 2026-08-29 per Patrick, he's handling directly.
- Forma counter on each loadout piece — confirmed decorative, tabled per Patrick's call.
- Fall Off (damage falloff) stat group — cut in Session 013, unessential.

## Session cadence

Patrick wants sessions forked at natural checkpoints (right after something ships) rather than one marathon session. He's planning to build his own handoff skill to automate a doc like this one; until that exists, write one manually when a session is winding down.
