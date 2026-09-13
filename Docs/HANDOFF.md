# Handoff — Cephalon Gu

*Written 2026-09-13, end of Session 017. Read this first in a fresh session, then discard/overwrite it next handoff — it's a pick-up-here note, not a historical record. The historical record is `Docs/Session Logs/Warframe_Jarvis_Session_Log.md`.*

## Where things stand

**Full Claude Design pass across the whole UI — shipped, verified live.** This was the session's real arc: a small trial-run handoff (B1 nav cleanup + a CopyWeaponModal audit) turned into "let's do the rest of the pages" once Patrick liked the first result.
- **B1 turned out to already be shipped** (Session 013, commit `6e3bc11`) — the handoff document that kicked off this session was stale. Caught it by checking `App.jsx` and git history before starting, rather than redoing the work.
- **CopyWeaponModal** — audited fully wired (real write to `wf_user.my_frames`, real refresh). One real gap: no success confirmation on copy — fixed with a one-line alert matching the file's existing error-alert pattern.
- **Nav shell redesign** — explored 3 real directions as a Claude Design canvas (Ledger Spine sidebar, Manuscript Masthead, Sealed Compass), Patrick picked the standalone **Manuscript Masthead**: centered editorial title plate with a flourish rule, replacing the 7-tab pill row with a tracked-underline index (interpunct-separated, gold underline on the active tab). Wired into `App.jsx`, `activePage` routing unchanged.
- **Arcanes/Armory/Mods/Archon Shards/Search** — each page's real source read first, real live data pulled before mocking anything (161/117/67% Arcane stats, real weapon/mod names, etc. — nothing invented). Arcanes was the visual outlier (plain Tailwind grays, no tracked labels) and got a fuller rebuild; the other four were already close to the design system and only needed the standardized masthead-style page header.
- **Build Detail Overlay** — audited first, found the hero card and every tab's *content* already matched the design system (this surface was built later, already consistent). Only the 6-tab bar itself (boxed pills) was inconsistent — restyled to the same tracked-underline index, tinted per-build instead of global gold.
- Every piece was verified live in the browser (not just "should work") before being called done, and each was its own commit+push.

**D.7 (Doctrine Adjacency / Flow) — still untouched.** No movement this session. Scoping from Session 016 stands as-is: 5 relationship types settled (Sibling/Differentiation, Sister Art, Cross-School Bridge, Dual Citizenship, Inverse/Shadow), Art/School confirmed as canonical `wf_base` reference data separate from a build's current Art assignment (multi-build-per-Warframe is a real future requirement). Schema and Flow's output shape are still not designed.

## Site redesign — separate workstream, not mine

Unchanged: Patrick's site-redesign campaign ("The Cultivated Arsenal") is Codex's workstream (`AGENTS.md`, `CHANGELOG.md`, `REDESIGN_CAMPAIGN_PLAYBOOK.md`, `Docs/redesign/`), independent of these Claude Code sessions and untouched this session. This session's Claude Design work is a *different* thing — polishing the existing React app's own UI, not the separate redesign campaign — per the distinction Patrick drew when this whole arc started.

Patrick's own parallel "Static Data" ingestion pipeline for Arcanes (`DB/Diagnostics/`, `DB/StaticData/`, `DB/Tests/`, `Docs/Static Data/`) is also still untouched by these sessions — unchanged from prior handoffs.

## Next up

**D.7 resumes** — exactly where Session 016 left it: design the Doctrine Adjacency schema (Art/School canonical tables + typed relationship table with citation-as-provenance), then settle Flow's output shape with Patrick (component tiles vs. a combined score — still explicitly open).

If Patrick wants to keep going on visual polish instead: modals (`AddWeaponToInventoryModal`, `AddModToInventoryModal`, `RivenEditorModal`, `ShardEditModal`, `AddFrameModal`) and `WeaponStatSearchTab` were never audited this session. They likely already read fine (they share `ModalShell`/`Panel`), but that's an assumption, not a verified finding the way everything else in this handoff is — check before assuming.

Everything else carried from Session 016's Next Targets is still open, unchanged:
- Ability-data catalog: 11 wiki-title mismatches to hand-curate, a long tail of 161 "needs review" abilities.
- Multi-build-per-Warframe support and the 3→6 Loadout Config expansion — confirmed real requirements, neither started.
- `benchmark_tiers` content for the 4 Survivability Profiles — needs Patrick's real numeric thresholds.
- Companion/Posture mod ownership not yet marked in `mod_inventory`.
- Moa/Hound companion scope decision, Nautilus Prime's slot count — still unconfirmed.
- Forma counter — confirmed decorative, tabled.

## Things a fresh session should know without digging

- **DB writes**: the Supabase key in `.env` is data-plane only — no DDL. New tables/columns need a migration file in `DB/Migrations/`, handed to Patrick to run manually. Row *deletes* get blocked by this environment's auto-mode classifier even with explicit confirmation — hand Patrick a one-shot script instead.
- **PostgREST caps every query at 1000 rows silently.** Always use `warframe-client/src/lib/fetchAll.js` for anything that could return >1000 rows.
- **Port 5173 may be occupied by an unrelated app on this machine.** `.claude/launch.json` has `"autoPort": true` — `preview_start` should just pick a free port. First load after a cold `npm run dev` start can take 10-15s before the app actually paints past "Loading Codex..." — don't assume a hang, wait it out before debugging.
- **Design tokens live in `constants/theme.js`** (`COLOR.page/surface1/surface2/border/ink/mutedInk/agedInk/gold/danger/success/info`) plus `index.css`'s radius scale (`--radius-sm/md/lg/xl` = 8/12/16/24px) and font stack (Cinzel for all `h1-h4` globally via a CSS rule, Outfit for body — both loaded from Google Fonts in `index.html`). The masthead nav's tracked-underline-index pattern (interpunct separators, 2px bottom border on the active item, tinted to a context color rather than always gold) is now the established secondary-nav vocabulary — reach for it before inventing a new nav pattern anywhere else in the app (e.g. `BuildDetailOverlay`'s tab bar reuses it, tinted per-build).
- **`utils/survivability.js` and `utils/weaponStats.js`** are the source of truth for all modded-stat math. **`utils/abilityStats.js` + `abilityFormulas.js`** for ability math (`formula_key` is a named-registry slug — `git grep formula_key` finds every irregular ability).
- **`utils/survivability.js` has uncommitted local changes** (Arcane Battery energy-per-Armor formula, Umbral set-bonus enhancement) — not from these Claude Code sessions, left untouched all session. Worth asking Patrick about before touching that file.
- **3-Weapon Rule** and other project-specific game rules are in the auto-memory system, not the codebase.
- **The redesign campaign is Codex's workstream, not Claude Code's.**
- **`reconcile` vs `recon`**: `recon` is read-only, chat-only, never touches files. `reconcile` writes the session log entry and only regenerates the roadmap if a full lettered shipment (A-F) closed that session — this session's UI polish work does NOT count, so the roadmap was not regenerated. Patrick's shorthand **`cpr` = commit, push, reconcile**, in that order — always commit and push everything before running reconcile.

## Open threads (not blocking, just not forgotten)

- 11 abilities with failed wiki-title resolution needing hand-curated `wiki_title` overrides.
- 161 abilities with at least one field still unresolved ("—") — expected to close out gradually.
- `benchmark_tiers` for the 4 Survivability Profiles — needs Patrick's real numeric thresholds.
- Moa/Hound companion scope decision — still unconfirmed.
- Nautilus Prime's "10 total slots" — still unconfirmed; Companion tab renders 8 uniformly.
- Companion/Posture mod ownership not yet marked in `mod_inventory`.
- Modals and `WeaponStatSearchTab` — not audited for design consistency this session (see "Next up").
- Forma counter — confirmed decorative, tabled.

## Session cadence

Patrick wants sessions forked at natural checkpoints (right after something ships) rather than one marathon session. This session ran long (nav shell → 5 pages → Build Detail Overlay) because each checkpoint's result prompted "keep going" rather than a fork — that's a legitimate call when the momentum is real, but don't assume it by default.
