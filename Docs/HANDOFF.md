# Handoff — Cephalon Gu

*Written 2026-08-26, end of Session 012. Read this first in a fresh session, then discard/overwrite it next handoff — it's a pick-up-here note, not a historical record. The historical record is `Docs/Session Logs/Warframe_Jarvis_Session_Log.md`.*

## Where things stand

**Loadout tab merge — fully shipped this session.** Arsenal (weapon+Arcane), Abilities (base kit + Helminth), and Mods dissolved into one **Loadout** tab with **Warframe/Primary/Secondary/Melee** sub-tabs — click a piece, edit its weapon, Arcane, mods, and (Warframe only) Abilities all in one place, everything auto-saving. `BuildDetailOverlay` tabs are now Identity | Loadout | Archon Shards | Testing Log. Verified live against Frost Prime (fully equipped) and Limbo Prime (no weapons — only the Warframe sub-tab renders).

Also shipped: category-aware stat-group filtering across the Mods page, Add Mods modal, and Loadout mod picker (weapon categories no longer show Warframe-only filters like Aura/Health/Shield, and vice versa); real weapon names now shown instead of generic "Primary/Secondary/Melee" labels; unique weapon trait lines (Dual Coda Torxica's spore mechanic, etc.) surfaced from `wf_base.weapons.raw_json.description`.

**Next up:** Riven mod support — fully scoped with Patrick, not yet built. See below.

## Riven mod support — scoped, ready to build

- New `wf_user` table: a shared Riven inventory (weapon name, capacity/polarity, up to 4 stat lines Patrick types in himself — values are player-rolled, not catalog data). Needs a migration file for Patrick to run manually (data-plane-only key, see below).
- Equip like any regular mod, into any of the 8 numbered slots, on any build for that weapon — same picker/slot flow that already exists, reusable across that weapon's other builds once created.
- Capacity math needs **no new formula** — confirmed with Patrick: real Rivens drain 10 at rank 0, +1 per rank, up to 18 at rank 8 (`base_drain: 10, max_rank: 8`). That's the exact same curve `drainAtRank` in `utils/modCapacity.js` already uses for every other positive-drain mod. A Riven just needs a synthetic catalog-shaped row (or equivalent) with those two numbers — the existing `effectiveDrain`/polarity-discount code applies unchanged.
- Start there: design the table, write the migration, build a Riven-creation UI (name/weapon/stats), wire it into the existing `LoadoutSlotPickerModal.jsx` pool alongside real mods.

## Things a fresh session should know without digging

- **DB writes**: the Supabase key in `.env` is data-plane only — no DDL. New tables/columns need a migration file in `DB/Migrations/`, handed to Patrick to run manually in the Supabase SQL Editor. Regular INSERT/UPDATE/DELETE on existing tables works fine directly.
- **PostgREST caps every query at 1000 rows silently** (no error, just a short page). Always use `warframe-client/src/lib/fetchAll.js` for any query that could return >1000 rows.
- **WFCD data quality is not fully trustworthy** — verify against Patrick's live game before trusting a wiki/API claim as fact. This project's history is full of real examples (fake mods, duplicate-name overwrites, sign errors) — when in doubt, cross-check or ask, don't assume.
- **Stat groups are category-scoped** (`utils/modMeta.js`'s `statGroupsFor(category)`) — Warframe gets Health/Shield/Armor/etc, Primary/Secondary get Fire Rate/Multishot/Crit Chance/etc, Melee gets Attack Speed/Range/Chance/Damage/IPS. If you add a new stat group, verify the exact keyword phrasing against a real mod's effect text first (WFCD has no flat stat-category field — this scans levelStats text for exact in-game wording).
- **Weapon names have zero duplicates** in `wf_base.weapons` (confirmed this session, 665 rows) — safe to name-key lookups against it, unlike the mod catalog which had a real duplicate-name bug.
- **`useFrames.js`'s `refetchFrames()` is silent now** (doesn't toggle the app-wide `loading` flag) — this was a real bug fixed this session (every refetch was unmounting/remounting the entire app, since `App.jsx` shows a full-page spinner whenever `loading` is true). Don't reintroduce a non-silent refetch path without checking this.
- **3-Weapon Rule** and other project-specific game rules are in the auto-memory system (`C:\Users\jideo\.claude\projects\...\memory\`), not the codebase.

## Open threads (not blocking, just not forgotten)

- Fall Off (damage falloff) stat group — dropped this session, no verified real mod text yet to confirm keyword phrasing
- Open Granola audit decisions: Dagath/Gara primary weapons, Wukong/Voruna/Ash slot swaps, Revenant's melee replacement, Khora's three empty slots, Atlas's utility primary
- Companion tracking — still untracked, still unscoped
- Two pending shard swaps + Revenant's shard goal — Patrick does these directly in-app, not a code task
- Aura/Exilus **mismatch**-polarity math (80% aura shrink, regular-mod mismatch) — only the matched case is live-verified; mismatch case is coded but unconfirmed against real gameplay
- Forma counter on each loadout piece — confirmed decorative (nothing reads it back), tabled rather than wired up or removed, per Patrick's call
- Dread's 4-primaries 3-Weapon Rule violation — Patrick fixing directly in-app, not a code task
- Koumei dropdown bug — confirmed fixed by Patrick this session, fully closed

## Session cadence

Patrick wants sessions forked at natural checkpoints (right after something ships) rather than one marathon session. He's planning to build his own handoff skill to automate a doc like this one; until that exists, write one manually when a session is winding down.
