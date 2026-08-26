# Handoff — Cephalon Gu

*Written 2026-08-26, end of Session 011. Read this first in a fresh session, then discard/overwrite it next handoff — it's a pick-up-here note, not a historical record. The historical record is `Docs/Session Logs/Warframe_Jarvis_Session_Log.md`.*

## Where things stand

**Mods Inventory & DB — fully shipped this session.** DB (1086 real, correctly-named mods), inventory tracking (bulk edit, filters, groups), and the loadout builder (8-slot grid, real capacity/drain math, polarity picker, Omni Forma) are all live and verified against Patrick's real Frost Prime build. This was the hard prerequisite blocking the next item.

**Next up:** D.2–D.5 — Survivability Suite (Survivability Analytics, Report Card, Survivability Profiles, Resilience metric). No scoping done yet — start there, same pattern as every other locked-queue item: ask before assuming schema/UI shape.

Full roadmap: `Docs/Cephalon_Gu_Master_Roadmap.md`. Note it's dated Aug 25/Session 009 in its header — it was NOT regenerated after Session 011 (Patrick's call, since Mods Inventory & DB isn't one of the lettered A–F shipments the reconcile skill auto-regenerates on). Locked Queue item #1 in that file is stale — treat it as done, not pending.

## Things a fresh session should know without digging

- **DB writes**: the Supabase key in `.env` is data-plane only — no DDL. New tables/columns need a migration file in `DB/Migrations/`, handed to Patrick to run manually in the Supabase SQL Editor. Regular INSERT/UPDATE/DELETE on existing tables works fine directly.
- **PostgREST caps every query at 1000 rows silently** (no error, just a short page). `wf_base.mods` is past that line (1086 rows). Always use `warframe-client/src/lib/fetchAll.js` for any query that could return >1000 rows — don't reintroduce a plain `.select()` against `mods` or any other table that grows large.
- **WFCD data quality is not fully trustworthy** — verify against Patrick's live game before trusting a wiki/API claim as fact. This session found: 14 fake/discontinued mods, an 87-mod silent-overwrite bug from duplicate display names, a sign error in the drain formula, and a wrong aura-polarity mechanic — all from trusting an unverified assumption at some point. When in doubt, cross-check the wiki or ask Patrick, don't assume.
- **Mod capacity math** (`warframe-client/src/utils/modCapacity.js`) is now verified correct: drain scales by rank in whichever direction `base_drain`'s sign already points (not `base_drain × rank`), aura polarity match *doubles* the bonus (not half-cost like every other mod), Mastery Rank does NOT add capacity (only a leveling floor, irrelevant at max rank — don't reintroduce that bonus).
- **3-Weapon Rule** and other project-specific game rules are in the auto-memory system (`C:\Users\jideo\.claude\projects\...\memory\`), not the codebase — check there before asking Patrick to re-explain something he's already defined.

## Open threads (not blocking, just not forgotten)

- Real 3-Weapon Rule violation in live data: **Dread is on 4 primaries** — flagged, not fixed, Patrick's call.
- Open Granola audit decisions: Dagath/Gara primary weapons, Wukong/Voruna/Ash slot swaps, Revenant's melee replacement, Khora's three empty slots, Atlas's utility primary.
- Companion tracking — still untracked, still unscoped.
- Custom logo/favicon — still a placeholder, explicitly deferred.
- Koumei dropdown bug — likely resolved since Session 008, never formally confirmed closed.
- Two pending shard swaps + Revenant's shard goal — Patrick does these directly in-app, not a code task.
- Aura/Exilus **mismatch**-polarity math (the 80% aura shrink, the +25% regular-mod mismatch penalty the wiki mentions) — only the *matched* case got live-verified this session. Mismatch-specific numbers haven't been checked against real gameplay yet.

## Session cadence

Patrick wants sessions forked at natural checkpoints (right after something ships) rather than one marathon session — Session 011 ran long enough to hit his usage limit. He's planning to build his own handoff skill to automate a doc like this one; until that exists, write one manually when a session is winding down.
