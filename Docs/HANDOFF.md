# Handoff — Cephalon Gu

*Written 2026-08-29, end of Session 015. Read this first in a fresh session, then discard/overwrite it next handoff — it's a pick-up-here note, not a historical record. The historical record is `Docs/Session Logs/Warframe_Jarvis_Session_Log.md`.*

## Where things stand

**Companion tab UI — shipped and verified live in the browser.** This was the scoped next-up item from Session 014's handoff, and it's done: a new "Companion" tab, sibling to Loadout in `BuildDetailOverlay`, with two sub-tabs (Companion, Companion Weapon), each with an identity picker, an 8-slot mod grid, and (Companion Weapon only) a Posture special slot. Verified end-to-end against the real dev server — typed a companion/weapon name into the autocomplete, confirmed it round-tripped through `my_frames` and persisted across a reload, opened the mod picker on both a numbered slot and the Posture slot.

- **New files**: `warframe-client/src/components/CompanionTab.jsx` (data owner, mirrors `ModsLoadoutTab.jsx`), `CompanionEquipmentSection.jsx` (per-piece UI, mirrors `LoadoutEquipmentSection.jsx` but stripped of Riven/Arcane/Incarnon/Abilities — none of that applies to Companions), `SlotBox.jsx` (the mod-slot tile, extracted out of `LoadoutEquipmentSection.jsx` so both tabs share it instead of duplicating ~80 lines), `hooks/useCompanions.js` + `hooks/useCompanionWeapons.js` (mirror `useWeapons.js`).
- **Identity**: free-text into `my_frames.companion`/`companion_weapon`, same convention as `primary_weapon` etc., via the existing `WeaponInput` autocomplete component (unmodified, reused as-is — mapped the fetched `wf_base.companions`/`companion_weapons` rows with a synthetic `category` field so `WeaponInput`'s slot-matching filter works against data that has no native `slot` column). Unlike the weapon pieces in the Loadout tab (whose sub-tabs are gated behind an existing Armory drag-drop assignment), Companion has no other UI surface that sets these two columns yet, so both sub-tabs are **always visible** — a deliberate deviation from the Loadout tab's gating pattern, not an oversight.
- **Mod split**: `wf_base.mods` rows with `category = 'Companion'` cover both pieces (WFCD's "Companion Mod" and "Posture Mod" types both land there) — `compat_name` is what actually separates them. Claws-family compat names (`Claws`, `Kubrow Claws`, `Kavat Claws`, `Helminth Claws`) go to the Companion Weapon; everything else (`ROBOTIC`, `BEAST`, `Sentinel`, breed-name exclusives) goes to the Companion body. This exact split was already scoped in Session 014's own handoff note — implemented as a hardcoded `CLAWS_COMPAT_NAMES` set at the top of `CompanionTab.jsx`.
- **Posture slot**: Companion Weapon-only, reuses `effectiveDrain()`/`isDiscounted()`'s existing `isAuraSlot=true` code path verbatim — zero changes to `utils/modCapacity.js`, exactly as scoped. Posture mods are identified as the subset of Claws-family mods with `is_aura = true`.
- **Companion body has no special slot** — confirmed in Session 014's research that Sentinels have no dedicated Precept slot (Precept mods just occupy the regular numbered slots), so it's a plain 8-slot grid, same capacity formula as Primary/Secondary.
- **Real bug caught during verification, fixed same session**: `WeaponInput`'s dropdown row key falls back to `weapon.weapon_id ?? weapon.arcane_id`, both of which are `undefined` for a companion/companion-weapon row — caused a duplicate/undefined-key React warning. Fixed by aliasing `weapon_id: c.companion_id` / `weapon_id: w.companion_weapon_id` onto the mapped identity-option rows in `CompanionTab.jsx`, rather than touching the shared `WeaponInput` component itself.
- **Also fixed, unrelated but hit while testing**: the dev server's default port 5173 was being silently squatted by an unrelated app already running on this machine ("Scent Cloud") — `preview_start` connected to *that* app instead of ours with no obvious error beyond a wrong page title. Added `server: { port: Number(process.env.PORT) || 5173 }` to `warframe-client/vite.config.js` and `"autoPort": true` to `.claude/launch.json` so the harness's preview tooling falls back to a free port automatically; `npm run dev` run normally by Patrick still defaults to 5173 same as before.
- Committed as `3377860` (`feat(companion): Companion tab UI -- identity, mod grid, Posture slot`), pushed to `origin/main`.

**`seed_mods.py` idempotency bug — fixed and merged this session.** A parallel fork (`task_6e01ca99`, flagged in Session 014's handoff) had already written and tested the fix but left it uncommitted in a worktree. Verified the fork's own second-run test output (1082 rows updated, 0 inserts, 0 duplicate-key errors) before merging: committed as `0c42a7f` in the fork branch, merged into `main` as `5e0e09b`, pushed, worktree/branch cleaned up. The fix matches each split-collision target (e.g. "Ammo Drum" / "Flawed Ammo Drum") to its own pre-existing DB row by `uniqueName` instead of a single shared lookup by the pre-split WFCD name — the old code could only ever resolve one half of a split pair, so every other member got re-inserted (and failed the unique constraint) on every re-run.

## Site redesign — separate workstream, not mine

Unchanged from Session 014's handoff: Patrick assigned a full site-redesign campaign ("The Cultivated Arsenal") to **Codex**, running independently of these Claude Code sessions. `AGENTS.md`, `CHANGELOG.md`, `REDESIGN_CAMPAIGN_PLAYBOOK.md`, and `Docs/redesign/` are Codex's workstream — discovery/concept phase only, not approved for implementation, and not touched this session. `AGENTS.md` sets real preservation rules (Cinzel typography, dark palette, dropdown school filter, exact Arsenal slot geometry, no Companion/Survivability screens in the redesign) that still apply to any product code regardless of which agent is acting. (Also saved as project memory: `project_codex_handles_redesign`.)

## Next up

No single obvious next feature was locked in this session — the Companion tab UI was the scoped item and it's done. Candidates, none started:

- **Mark Companion/Posture mods as owned.** Tested the picker live and it correctly shows "No owned mods match this slot" for every Companion/Companion Weapon slot right now, because nothing in `wf_user.mod_inventory` is flagged owned for any `category = 'Companion'` mod yet — this is expected (Patrick hasn't gone through the Mods page for this category), not a bug, but it means the Companion tab will look empty/unusable in practice until he does that pass.
- **Moa/Hound companion scope decision** (carried from Session 014) — real, ownable, robotic companions currently excluded from `wf_base.companions` because they're mistagged `productCategory: "Pistols"` in WFCD's source data, same bucket as junk. Not yet confirmed with Patrick either way.
- **Nautilus Prime's "10 total slots"** (carried from Session 014) — Session 013 observed this live vs. a baseline of 8; the Companion tab currently renders 8 numbered slots for every companion uniformly. Needs confirming before deciding whether to special-case it.
- **Stat-group filter chips for Companion mods** — `utils/modMeta.js`'s `STAT_GROUP_KEYWORDS` has no `Companion`/`CompanionWeapon` entry, so the mod picker's filter-chip row is just empty for this category (graceful fallback, not broken — search still works). Low priority, cosmetic.
- Whatever's next on the roadmap after Companion tracking — check `Docs/Cephalon_Gu_Master_Roadmap.md`.

## Things a fresh session should know without digging

- **DB writes**: the Supabase key in `.env` is data-plane only — no DDL. New tables/columns need a migration file in `DB/Migrations/`, handed to Patrick to run manually in the Supabase SQL Editor. Regular INSERT/UPDATE/DELETE on existing tables works fine directly. Row *deletes* specifically get blocked by this environment's auto-mode classifier even with explicit user confirmation — hand Patrick a one-shot script to run himself rather than fighting it.
- **PostgREST caps every query at 1000 rows silently** (no error, just a short page). Always use `warframe-client/src/lib/fetchAll.js` for any query that could return >1000 rows.
- **Port 5173 may already be occupied by an unrelated app on this machine** — `warframe-client/vite.config.js` now reads `PORT` from env (falls back to 5173), and `.claude/launch.json` has `"autoPort": true`, so `preview_start` should pick a free port automatically. If a preview ever looks like the wrong app entirely, check `get_page_text`/title before assuming the dev server is broken.
- **`SlotBox` now lives in its own file** (`warframe-client/src/components/SlotBox.jsx`), imported by both `LoadoutEquipmentSection.jsx` and `CompanionEquipmentSection.jsx`. Any future equipment-piece UI (if one gets added) should reuse it the same way rather than re-copying the slot-tile markup a third time.
- **`utils/rivenStats.js` and `utils/modCapacity.js`'s Riven/Aura constants** are the source of truth for Riven stat pools/rules and the drain curve, respectively — both grounded in real WFCD source data and Patrick's live-game confirmation, not guessed. Posture and the Companion piece both reuse this unchanged.
- **3-Weapon Rule** and other project-specific game rules are in the auto-memory system (`C:\Users\jideo\.claude\projects\...\memory\`), not the codebase.
- **The redesign campaign (`AGENTS.md`, `Docs/redesign/`) is Codex's workstream, not Claude Code's** — see the section above. Don't treat it as stray/injected content, and don't touch its direction without Patrick's say-so.

## Open threads (not blocking, just not forgotten)

- Moa/Hound companion scope decision — real companions, currently excluded from the beast catalog filter, not yet confirmed with Patrick either way.
- Nautilus Prime's "10 total slots" vs. a Sentinel's baseline slot count — needs confirming; Companion tab currently renders 8 uniformly.
- Companion/Posture mod ownership hasn't been marked in `mod_inventory` yet — the tab works but will look empty until Patrick does that pass on the Mods page.
- Open Granola audit decisions: Dagath/Gara primary weapons, Wukong/Voruna/Ash slot swaps, Revenant's melee replacement, Khora's three empty slots, Atlas's utility primary — Patrick working through these himself.
- Two pending shard swaps + Revenant's shard goal — Patrick does these directly in-app, not a code task.
- Dread's 4-primaries 3-Weapon Rule violation — Patrick fixing directly in-app, not a code task.
- Forma counter on each loadout piece — confirmed decorative (nothing reads it back), tabled rather than wired up or removed, per Patrick's call.
- Fall Off (damage falloff) stat group — cut in Session 013, unessential.

## Session cadence

Patrick wants sessions forked at natural checkpoints (right after something ships) rather than one marathon session. He's planning to build his own handoff skill to automate a doc like this one; until that exists, write one manually when a session is winding down.
