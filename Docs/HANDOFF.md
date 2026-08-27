# Handoff — Cephalon Gu

*Written 2026-08-27, end of Session 013. Read this first in a fresh session, then discard/overwrite it next handoff — it's a pick-up-here note, not a historical record. The historical record is `Docs/Session Logs/Warframe_Jarvis_Session_Log.md`.*

## Where things stand

**Riven mod support — fully shipped this session.** New `wf_user.rivens` table (weapon-bound, hand-typed stats, own independent rank — no separate catalog/inventory split needed since a Riven is already a unique owned item). Create/edit lives inside the numbered-slot picker itself ("+ Create New Riven" + a pencil-edit icon per Riven row), not a separate page. Stats are now structured dropdowns (real per-category stat pools pulled from WFCD's own `upgradeEntries` data, not guessed) with sign toggles that enforce the real Riven rules (2-4 stats, negative only possible as the 3rd/4th, only one negative ever, positive-only stats like elemental damage/Punch Through/Range locked to `+`). Verified live end-to-end against Patrick's real Vectis Prime Riven.

**Mod-catalog audit — fully shipped.** Found and fixed: `is_exilus` was `false` for every single non-Warframe mod (root cause: WFCD only sets `isExilus` on Warframe mods, weapon Exilus mods use `isUtility` instead); 6 confirmed never-shipped ghost catalog rows removed (3 "Bane Of X" capital-O duplicates, Augmented Sonar, Harrowed Hook, Air Martial); all 131 Conclave-origin mods tagged (`is_conclave`, real wiki sigil badge, bulk-exclude workflow in the Mods page).

**Two real capacity-math bugs found and fixed via live-game verification with Patrick:**
1. **Exilus was excluded from `used` capacity entirely** — wrong. Confirmed on the wiki: Exilus is just a 9th slot restricted to Exilus-tagged mods, its cost comes out of the same pool as the other 8, same as any regular slot. Fixed in `LoadoutEquipmentSection.jsx`.
2. **Stabilizer's `max_rank` was 5 (WFCD's `fusionLimit`), real max is 3** — confirmed on the wiki and against Patrick's real mod (unranked 6, maxed at 9 after exactly 3 infusions). Added a `MAX_RANK_OVERRIDES` dict to `seed_mods.py` for this class of WFCD data error (same pattern as the existing `EXCLUDED_UNIQUE_NAMES`/`EXILUS_OVERRIDE_UNIQUE_NAMES`).

Both confirmed together against Patrick's real Vectis Prime: Gu was showing 55/60, real game showed 0/60 (fully used) — now matches exactly.

**Aura/Exilus mismatch-polarity math — confirmed correct, no code change needed.** Patrick's real Steel Charge (matched, 78 capacity) and Sprint Boost (mismatched, 65 capacity) numbers both landed exactly on the existing formula using the real stored `base_drain`/`max_rank` values. This open thread from the last handoff is closed.

**Real Arsenal mod-grid layout — shipped.** Confirmed with Patrick and pixel-verified in the browser:
- **Primary/Secondary**: 4x2 grid for the 8 numbered slots, Exilus as its own slot to the right, vertically centered at the seam between rows.
- **Warframe**: a "2-4-4" formation — Aura + Exilus centered in the middle two columns of a 4-wide top row, then the 8 numbered slots as a 4x2 grid below.
- **Melee**: same 2-4-4 formation as Warframe, but with a real **Stance slot** in place of Aura — this is new: Stance mods (WFCD `type: "Stance Mod"`) previously had no dedicated slot in Gu at all, just folded into the regular Melee mod pool. Added `is_stance` to `wf_base.mods` (own migration + `seed_mods.py` change), excluded Stance mods from the regular 8-slot Melee pool (a Stance mod can only go in the Stance slot, same as Aura for Warframe), and Stance costs capacity like Exilus (not free like Aura).

**B1 — School Navigation Cleanup — shipped.** The 14-button school-filter row in `App.jsx`'s Codex header collapsed into a single `<select>` with build counts per option, matching the dropdown pattern already used in `ShardsTab.jsx`/`CopyWeaponModal.jsx`.

**Roadmap doc refreshed** (`Docs/Cephalon_Gu_Master_Roadmap.md`) — it was stale, still listing the entire Mods DB arc as "not started." Now reflects Mods DB as fully shipped, unblocking **D.2-D.5 Survivability Suite** as the real next locked-queue item.

## Next up: Companion tracking — scoped, ready to build

Real research done this session (pulled directly from WFCD's `warframe-items` GitHub source, not guessed), plus concrete real numbers from Patrick's own Sentinel and beast companion:

- **New tab**, sibling to `Loadout` in `BuildDetailOverlay` — NOT folded into Loadout. Matches the real Arsenal's layout.
- **Two independently-capacitied pieces per companion build**, mirroring how a weapon build already has Warframe + 3 weapons each with their own capacity/catalyst state:
  - The companion itself (Sentinel or beast) — has a **Precept slot** (Sentinel) that works exactly like Aura (its own dedicated slot type), Reactor-style capacity. Confirmed live: Nautilus Prime, 10 total slots, 60/60 with Reactor — matches `pieceCapacity({hasCatalyst:true})` exactly, zero new formula.
  - The companion's weapon (Sentinel Weapon, or a beast's Claws) — Catalyst-style capacity, and has a **Posture slot** which is the Aura-equivalent for that weapon (adds capacity instead of consuming it — confirmed live on both a Panzer Vulpaphyla and a Raksa Kubrow: 60/60 base, 70/70 with a Posture mod, i.e. +10). `effectiveDrain(mod, rank, slotPolarity, true)` already generalizes over "is this an aura slot" as a plain boolean, so this needs zero math changes, just new slot wiring (same pattern as Aura today).
- **Catalog data**: `Sentinels.json` (17) + `SentinelWeapons.json` (24, a new weapon-style category) from WFCD's source repo. **Beast catalog needs real filtering, not a straight import** — `Pets.json` (66 raw entries) mixes real companion breeds (Kubrow/Kavat/Predasite/Vulpaphyla, Helminth Charger) with DNA-stabilizer crafting components (Cores/Brackets/Gyros/Mutagens/Antigens/Stabilizers) and Khora's exalted Venari/Venari Prime (not independently ownable) — all need excluding.
- **Mods**: WFCD's `"Companion Mod"` type (158 real entries) reuses `wf_base.mods`/`wf_user.mod_inventory` with a new `Companion` category, filterable by the real `compatName` field (universal `ROBOTIC`/`BEAST`/`Claws`/`Sentinel`, or a named exclusive like `Carrier`/`Smeeta Kavat`).
- **Both Sentinel and beast companion types are in scope** — Patrick uses both regularly. Do the real-mechanics research for beasts before building (DNA/Vitality/stasis concepts this app hasn't modeled before) rather than assuming beast tracking is a smaller version of Sentinel tracking — it isn't, per Pets.json's filtering wrinkle above.

Start there: design the companion/companion-weapon table shape (mirroring `my_frames`/`loadout_slots`/`loadout_meta`'s existing pattern), write the catalog-seeding scripts (with the Pets.json filtering logic), then build the new Companion tab.

## Things a fresh session should know without digging

- **DB writes**: the Supabase key in `.env` is data-plane only — no DDL. New tables/columns need a migration file in `DB/Migrations/`, handed to Patrick to run manually in the Supabase SQL Editor. Regular INSERT/UPDATE/DELETE on existing tables works fine directly. Row *deletes* specifically get blocked by this environment's auto-mode classifier even with explicit user confirmation — hand Patrick a one-shot script to run himself rather than fighting it.
- **PostgREST caps every query at 1000 rows silently** (no error, just a short page). Always use `warframe-client/src/lib/fetchAll.js` for any query that could return >1000 rows.
- **WFCD data quality is not fully trustworthy** — this session alone found: a systemic `is_exilus` field-name bug affecting 670+ mods, 6 fake/never-shipped catalog rows, and one mod (Stabilizer) with a flatly wrong `fusionLimit`. Always cross-check against the wiki and Patrick's live game before trusting a WFCD claim as fact, especially for anything that feeds capacity/drain math — a wrong number there silently corrupts every build's numbers app-wide.
- **`utils/rivenStats.js` and `utils/modCapacity.js`'s Riven constants** are the source of truth for Riven stat pools/rules and the drain curve, respectively — both grounded in real WFCD source data and Patrick's live-game confirmation, not guessed.
- **3-Weapon Rule** and other project-specific game rules are in the auto-memory system (`C:\Users\jideo\.claude\projects\...\memory\`), not the codebase.

## Open threads (not blocking, just not forgotten)

- Open Granola audit decisions: Dagath/Gara primary weapons, Wukong/Voruna/Ash slot swaps, Revenant's melee replacement, Khora's three empty slots, Atlas's utility primary — Patrick working through these himself.
- Two pending shard swaps + Revenant's shard goal — Patrick does these directly in-app, not a code task.
- Dread's 4-primaries 3-Weapon Rule violation — Patrick fixing directly in-app, not a code task.
- Forma counter on each loadout piece — confirmed decorative (nothing reads it back), tabled rather than wired up or removed, per Patrick's call.
- Fall Off (damage falloff) stat group — cut this session, unessential.
- Koumei dropdown bug — confirmed fixed, fully closed.

## Session cadence

Patrick wants sessions forked at natural checkpoints (right after something ships) rather than one marathon session. He's planning to build his own handoff skill to automate a doc like this one; until that exists, write one manually when a session is winding down.
