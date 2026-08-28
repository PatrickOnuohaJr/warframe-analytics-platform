# Handoff — Cephalon Gu

*Written 2026-08-28, end of Session 014. Read this first in a fresh session, then discard/overwrite it next handoff — it's a pick-up-here note, not a historical record. The historical record is `Docs/Session Logs/Warframe_Jarvis_Session_Log.md`.*

## Where things stand

**Companion tracking — DB foundation and catalog fully shipped, UI not started.** This was the scoped next-up item from Session 013's handoff; this session built everything up to (not including) the actual tab.

- **Migration**: `DB/Migrations/20260828_add_companion_schema.sql`, run by Patrick. Added `wf_base.companions` (Sentinels + beasts, one table with a `companion_class` discriminator, mirroring `wf_base.weapons`' pattern) and `wf_base.companion_weapons` (Sentinel Weapons + Claws, same pattern). Added `my_frames.companion`/`my_frames.companion_weapon` free-text identity columns (same convention as `primary_weapon`/etc). Added `wf_base.mods.compat_name` for Companion-mod slot filtering. **No changes needed** to `loadout_slots`/`loadout_meta` — both already use unconstrained text for `equipment_type`/`slot_position`, so the future tab just uses `equipment_type = 'companion' | 'companion_weapon'` and `slot_position = '1'..'8' | 'posture'` with zero DDL.
- **Catalog seeded**: `DB/Seeds/seed_companions.py` (17 Sentinels + 15 real beast breeds, filtered from Pets.json's 66 raw rows by `productCategory == 'KubrowPets'` — cleanly drops DNA-stabilizer crafting components and Khora's Venari/Venari Prime in one pass) and `DB/Seeds/seed_companion_weapons.py` (24 Sentinel Weapons imported from WFCD + 5 hand-authored Claws rows, since no WFCD catalog file for Claws exists at all — verified against the repo's full file listing).
- **Companion mods seeded**: extended `DB/Seeds/seed_mods.py` with two new WFCD types. `"Companion Mod"` (158 entries) → `category: "Companion"`, `compat_name` = WFCD's `compatName` (ROBOTIC/BEAST/Sentinel/breed-name/Claws/breed-Claws). `"Posture Mod"` (6 entries: Assassin/Balanced/Elusive/Frenzied/Persistent/Protector Posture) → also `category: "Companion"`, flagged `is_aura: true`. 164 Companion-category mods total.

**Real research finding this session — corrects a claim in the previous handoff.** Last session's handoff described the companion's own Precept slot as "works exactly like Aura, its own dedicated slot type." That's wrong: the wiki confirms Sentinels have **no dedicated Precept slot** — Precept mods (Vacuum, Guardian, Sacrifice, etc.) just occupy whichever of the companion's regular numbered slots you put them in, same as any other mod. Every real Precept-type mod's `uniqueName` contains `"Precept"` (`SentinelPrecepts/`, `CreaturePetPrecepts/`, etc. — checked all 105 of them), which is useful for an optional UI badge later, but it is **not** a capacity-math flag, and `is_aura`/`is_exilus` are correctly left `false` on all of them.

**Posture is real and confirmed, separate from Precept.** Patrick supplied a wiki screenshot: Posture Mods are their own type, exclusive to Beast Claws (Kubrow/Kavat/Predasite/Vulpaphyla), slot into a dedicated Posture slot, and their capacity bonus doubles on a polarity match. Verified against the actual data: `base_drain: -2`, `max_rank: 3`, `polarity: penjaga` (the companion-specific polarity) — at max rank with matched polarity, `effectiveDrain(mod, 3, 'penjaga', isAuraSlot=true)` computes `-5 × 2 = -10`, exactly the 60→70 capacity jump Patrick saw live on both a Panzer Vulpaphyla and a Raksa Kubrow. **Zero changes needed to `utils/modCapacity.js`** — Posture reuses the existing Aura-slot math exactly, just needs `slot_position = 'posture'` wired to `isAuraSlot = true` in the frontend (same as `'aura'` today) when the Companion tab gets built.

**Scope note, not yet resolved:** the beast-breed filter (`productCategory == 'KubrowPets'`) also excludes Moa and Hound companions (Lambeo/Nychus/Oloro/Para Moa, Bhaira/Dorma/Hec Hound) — they're real, ownable, robotic companions, just mistagged `productCategory: "Pistols"` in WFCD's data, same bucket as the junk. Left out because last session's scoping only researched Kubrow/Kavat/Predasite/Vulpaphyla/Helminth Charger as "beasts," but flagged to Patrick and not yet confirmed either way.

**Real bug found, not fixed yet (spawned as a background task, in progress).** `DB/Seeds/seed_mods.py`'s genuinely-split name-collision handling (Flawed/non-Flawed pairs, Bane of X duplicates) is not idempotent — running the script twice in a row throws ~40 harmless-but-noisy `duplicate key` errors, because `existing_by_name` is keyed by each row's *current* name and can only ever resolve one half of a split pair back to its own existing row. No data was corrupted (the pre-existing row is untouched), but split-pair mods silently stop getting WFCD refreshes after their first seed. Patrick started the suggested fix (`task_6e01ca99`, "Fix seed_mods.py non-idempotent split-collision inserts") in a separate session — **check whether that landed before touching `seed_mods.py` again.**

## Site redesign — separate workstream, not mine

Patrick assigned a full site-redesign campaign ("The Cultivated Arsenal") to **Codex**, running independently of these Claude Code sessions. It produced `AGENTS.md` (Codex's own instructions file, parallel to `CLAUDE.md`), `CHANGELOG.md`, `REDESIGN_CAMPAIGN_PLAYBOOK.md`, and `Docs/redesign/` (before-screenshots, six concept images, a written report, a scope deck) on 2026-08-27. It's discovery/concept phase only — **not approved for implementation**. `AGENTS.md` sets real preservation rules (Cinzel typography, dark palette, dropdown school filter, exact Arsenal slot geometry, no Companion/Survivability screens in the redesign) that still apply to any product code regardless of which agent is acting — but the redesign *direction* work itself is Codex's lane, not something to touch unless Patrick redirects. (Also saved as project memory: `project_codex_handles_redesign`.)

## Next up: Companion tab UI

Everything needed to build it now exists in the DB. Scope, per Session 013's original research plus this session's corrections:

- New tab, sibling to `Loadout` in `BuildDetailOverlay`, matching the real Arsenal's layout — not folded into Loadout.
- **Companion piece** (Sentinel or beast): identity picker against `wf_base.companions`, writes to `my_frames.companion`. Regular numbered slots via `loadout_slots`/`loadout_meta` with `equipment_type = 'companion'`. Capacity is the plain `pieceCapacity({hasCatalyst})` formula — no Precept-specific math. Open question for this build: Session 013 observed Nautilus Prime showing 10 total slots (vs. a baseline of 8) — confirm with Patrick whether that's a Prime-only bonus-slot perk before deciding how many slot boxes to render per companion.
- **Companion weapon piece** (Sentinel Weapon or Claws): identity picker against `wf_base.companion_weapons`, writes to `my_frames.companion_weapon`. Regular numbered slots plus a **Posture slot** at `slot_position = 'posture'`, wired to `isAuraSlot = true` — confirmed zero new math needed, reuse the exact same code path as the Warframe Aura slot.
- **Mod picker**: filter `wf_base.mods` by `category = 'Companion'`, then split by `compat_name` — Claws-family values (`Claws`, `Kubrow Claws`, `Kavat Claws`, `Helminth Claws`) belong to the weapon piece, everything else (`ROBOTIC`, `BEAST`, `Sentinel`, breed names) belongs to the companion piece. Posture mods (`is_aura = true`, `compat_name: 'Claws'`) are the weapon piece's dedicated-slot pool, same pattern as filtering Aura mods for a Warframe's Aura slot today.

## Things a fresh session should know without digging

- **DB writes**: the Supabase key in `.env` is data-plane only — no DDL. New tables/columns need a migration file in `DB/Migrations/`, handed to Patrick to run manually in the Supabase SQL Editor. Regular INSERT/UPDATE/DELETE on existing tables works fine directly. Row *deletes* specifically get blocked by this environment's auto-mode classifier even with explicit user confirmation — hand Patrick a one-shot script to run himself rather than fighting it.
- **PostgREST caps every query at 1000 rows silently** (no error, just a short page). Always use `warframe-client/src/lib/fetchAll.js` for any query that could return >1000 rows.
- **WFCD data quality is not fully trustworthy, and the wiki isn't automatically either** — a WebFetch against the Sentinel wiki page this session returned a wrong slot count ("four polarity slots"), while a Patrick-supplied screenshot of the actual Posture Mods wiki page was accurate and directly confirmed the capacity math. Cross-check against Patrick's live game or a screenshot he supplies before trusting either source as fact for anything capacity/drain-related.
- **`seed_mods.py` is not currently idempotent for split name-collision groups** — see the bug note above. A fix may already be in flight in a separate session.
- **`utils/rivenStats.js` and `utils/modCapacity.js`'s Riven/Aura constants** are the source of truth for Riven stat pools/rules and the drain curve, respectively — both grounded in real WFCD source data and Patrick's live-game confirmation, not guessed. Posture now reuses the same Aura-slot code path with zero additions.
- **3-Weapon Rule** and other project-specific game rules are in the auto-memory system (`C:\Users\jideo\.claude\projects\...\memory\`), not the codebase.
- **The redesign campaign (`AGENTS.md`, `Docs/redesign/`) is Codex's workstream, not Claude Code's** — see the section above. Don't treat it as stray/injected content, and don't touch its direction without Patrick's say-so.

## Open threads (not blocking, just not forgotten)

- Moa/Hound companion scope decision — real companions, currently excluded from the beast catalog filter, not yet confirmed with Patrick either way.
- `seed_mods.py` split-collision idempotency bug — fix in progress in a separate session (`task_6e01ca99`), check status before re-touching that file.
- Nautilus Prime's "10 total slots" vs. a Sentinel's baseline slot count — needs confirming before the Companion tab decides how many slot boxes to render per companion.
- Open Granola audit decisions: Dagath/Gara primary weapons, Wukong/Voruna/Ash slot swaps, Revenant's melee replacement, Khora's three empty slots, Atlas's utility primary — Patrick working through these himself.
- Two pending shard swaps + Revenant's shard goal — Patrick does these directly in-app, not a code task.
- Dread's 4-primaries 3-Weapon Rule violation — Patrick fixing directly in-app, not a code task.
- Forma counter on each loadout piece — confirmed decorative (nothing reads it back), tabled rather than wired up or removed, per Patrick's call.
- Fall Off (damage falloff) stat group — cut in Session 013, unessential.

## Session cadence

Patrick wants sessions forked at natural checkpoints (right after something ships) rather than one marathon session. He's planning to build his own handoff skill to automate a doc like this one; until that exists, write one manually when a session is winding down.
