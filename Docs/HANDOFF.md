# Handoff — Cephalon Gu

*Written 2026-08-29, end of Session 016. Read this first in a fresh session, then discard/overwrite it next handoff — it's a pick-up-here note, not a historical record. The historical record is `Docs/Session Logs/Warframe_Jarvis_Session_Log.md`.*

## Where things stand

**Live Modded Stats Panels — fully shipped, both Warframe and weapons.** Patrick's ask: see a stat actually move the moment a mod goes on, right on the modding screen, same as the real game's Arsenal — not buried in a separate tab.

- **Warframe piece**: new "Modded Stats" panel on the Warframe Loadout tab showing Health/Shield/Armor/Energy/Sprint Speed/Ability Duration/Efficiency/Range/Strength, computed live from equipped mods + Archon Shards. New `computeModdedWarframeStats()` in `utils/survivability.js`, sign-aware (unlike the original Health/Shield/Armor-only regex) since real dual-effect mods grant one stat and take another away — verified against Fleeting Expertise, Overextended, Blind Rage, Transient Fortitude, Narrow Minded. Ability Duration/Efficiency/Range/Strength have no per-Warframe base column (universal 100% baseline, mods stack additively) — verified against a maxed Primed Continuity hitting exactly 155%, Patrick's own example number.
- **Weapon pieces (Primary/Secondary/Melee)**: same idea via new `utils/weaponStats.js` — base stats pulled from `wf_base.weapons.raw_json` (field audit this session confirmed consistent top-level fields across a hitscan rifle, pistol, AoE launcher, bow, and melee weapon, no `attacks[]` fallback needed), combined with catalog-mod and Riven bonuses. Handles real-card trailing qualifiers mod text carries that the Warframe side never had (Speed Trigger/Shred's "(x2 for Bows)", True Steel's "(x2 for Heavy Attacks)") — the always-active base % is counted, the conditional multiplier isn't. Reload Speed correctly combines as a reduction, not a multiply.
- Verified live two ways: Okina Prime (melee, unmodded) matches its raw catalog stats exactly; Vectis Prime (heavily modded, includes a Riven) matches hand-calculated totals exactly across Fire Rate/Magazine/Reload/Crit Chance/Status/Punch Through/Multishot, with Crit Damage's remainder fully explained by its equipped Riven.
- Survivability's old static "Base Stats" block is gone — folded into the Loadout tab instead. Resilience/profile-comparison/goals stay on their own Survivability tab, per Patrick's explicit call to keep that separate.
- **Explicitly not built, needs new data first**: ability tooltip numbers (e.g. "what does Nourish do", scaled by Power Strength). `wf_base.warframe_abilities` stores ability names only — no effect text, no scaling formula, nothing to compute from anywhere in this DB. Don't attempt this without a real new data source.

**Companion mod picker filter chips — shipped.** `utils/modMeta.js` had no `Companion`/`CompanionWeapon` entries in `STAT_GROUP_KEYWORDS`, so the picker showed no chips for either Companion sub-tab. Added both (Health/Shield/Armor for the body; Crit Chance/Crit Damage/Status/Damage/Range/IPS for Claws), verified against real mod text. Fixed a real bug this surfaced in the process: `statGroups()` keyed off `mod.category`, which reads `'Companion'` for both body and Claws mods — a Claws mod would've silently matched the wrong group set. Resolved via `compat_name`; `CLAWS_COMPAT_NAMES` now lives in `modMeta.js` as the single source of truth instead of being duplicated in `CompanionTab.jsx`.

**Service-role grant gap — fixed and run.** Migration `20260829_grant_service_role_wf_user.sql` grants `service_role` read access on `rivens`/`weapon_inventory`/`build_tests`/`survivability_goals`. Patrick ran it this session — closed.

**Loose ends closed per Patrick's direction this session:**
- Dread's 4-primaries 3-Weapon Rule violation — Patrick fixed directly in-app, confirmed.
- Revenant's shard goal (2 Crimson, energy-on-spawn) — done, per Patrick.
- Cyte-09/Harrow Archon Shard swaps — dropped from tracking, Patrick handling those directly.

**Session log + roadmap backfilled/regenerated.** `Docs/Session Logs/Warframe_Jarvis_Session_Log.md` was missing Sessions 013-015 entirely (their "docs: log" commits only ever touched this HANDOFF file, never the master log) — reconstructed all three from preserved HANDOFF.md snapshots and git history, then appended today as Session 016. `Docs/Cephalon_Gu_Master_Roadmap.md` hadn't been regenerated since Session 013 and still listed D.2-D.5 and Companion tracking as upcoming — fully regenerated to reflect both as shipped and **D.7 as the real #1 locked-queue item**.

## Site redesign — separate workstream, not mine

Unchanged: Patrick assigned a full site-redesign campaign ("The Cultivated Arsenal") to **Codex**, running independently of these Claude Code sessions. `AGENTS.md`, `CHANGELOG.md`, `REDESIGN_CAMPAIGN_PLAYBOOK.md`, `Docs/redesign/` are Codex's workstream — discovery/concept phase only, not touched this session. `AGENTS.md`'s preservation rules (Cinzel typography, dark palette, dropdown school filter, exact Arsenal slot geometry) still apply to any product code regardless of agent. (Also saved as project memory: `project_codex_handles_redesign`.)

## Next up

Per the freshly-regenerated roadmap, **D.7 — Build Recommendation / Flow / Doctrine Adjacency** is now the real #1 locked-queue item (Flow metric, doctrine adjacency modeling). Per Patrick, the live modded-stats foundation shipped this session should put D.7 in better shape to scope than before it existed — Flow likely wants the same real per-mod/per-stat computation the new Loadout panels already do. Not yet scoped in detail; check `Docs/Cephalon_Gu_Master_Roadmap.md` before starting. After D.7, #2 is **A3 — Predictive Build Crafting / Build Intelligence Layer**.

Loose ends from this session, none blocking:

- **Multishot** — added to the gun stats panel after initial ship (was left off the first tile list even though the data was already there); verified against Vectis Prime.
- No other new loose ends surfaced this session beyond what's already tracked below.

## Things a fresh session should know without digging

- **DB writes**: the Supabase key in `.env` is data-plane only — no DDL. New tables/columns need a migration file in `DB/Migrations/`, handed to Patrick to run manually in the Supabase SQL Editor. Row *deletes* get blocked by this environment's auto-mode classifier even with explicit confirmation — hand Patrick a one-shot script instead.
- **PostgREST caps every query at 1000 rows silently.** Always use `warframe-client/src/lib/fetchAll.js` for anything that could return >1000 rows.
- **Port 5173 may be occupied by an unrelated app on this machine.** `vite.config.js` reads `PORT` from env, `.claude/launch.json` has `"autoPort": true` — `preview_start` should just pick a free port.
- **`utils/survivability.js` and `utils/weaponStats.js` are the source of truth for all modded-stat math** — both grounded in real verified mod/weapon text, not guessed. `parseStat()` (the shared regex-matching helper both use) lives in `utils/statPatterns.js` — extend it there if a third domain ever needs the same pattern, don't duplicate it again.
- **`utils/rivenStats.js` and `utils/modCapacity.js`'s Riven/Aura constants** remain the source of truth for Riven stat pools/rules and the drain curve.
- **`SlotBox` lives in its own file** (`warframe-client/src/components/SlotBox.jsx`), shared by Loadout and Companion. Reuse it for any future equipment-piece UI.
- **3-Weapon Rule** and other project-specific game rules are in the auto-memory system, not the codebase.
- **The redesign campaign is Codex's workstream, not Claude Code's** — don't touch its direction without Patrick's say-so.
- **The master session log had a real backfill gap (Sessions 013-015) that got fixed this session** — the "docs: log Session NNN" commit pattern only updated this HANDOFF file for a while, not the actual log. If a future "reconcile" run ever finds the log's last entry doesn't match what HANDOFF.md/the roadmap claim as the current session number, stop and ask before guessing which number is right — don't silently create another gap or collision.

## Open threads (not blocking, just not forgotten)

- `benchmark_tiers` for the 4 Survivability Profiles — needs Patrick's real numeric thresholds.
- Moa/Hound companion scope decision — still unconfirmed.
- Nautilus Prime's "10 total slots" — still unconfirmed; Companion tab renders 8 uniformly.
- Companion/Posture mod ownership not yet marked in `mod_inventory` — tab works but will look empty until Patrick does that pass.
- Open Granola audit decisions: Dagath/Gara primary weapons, Wukong/Voruna/Ash slot swaps, Revenant's melee replacement, Khora's three empty slots, Atlas's utility primary — Patrick working through these himself.
- Forma counter on each loadout piece — confirmed decorative, tabled per Patrick's call.
- Ability tooltip numbers (e.g. Nourish's heal amount) — blocked on a real data source for ability effect text; not scheduled until one exists.

## Session cadence

Patrick wants sessions forked at natural checkpoints (right after something ships) rather than one marathon session. He's planning to build his own handoff skill to automate a doc like this one; until that exists, write one manually when a session is winding down.
