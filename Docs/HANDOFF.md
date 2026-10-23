# Handoff — Cephalon Gu

## Current pickup — October 23, 2026

Pushed `main` is at `2665133`; remote CI is green on every push (runs #11-#14). No deployment. Lint, 49 Node tests, and 12 vitest UI tests pass locally; `npm audit` is clean. Everything from the October 21 pickup (Jade Light survivability, archetype filter, Umbral + rank-30 math) is below and still current.

**THE DATABASE IS NOW LOCKED TO ONE SIGNED-IN OWNER. This changes how everything is accessed.**
- The app sits behind **Google sign-in** (Supabase Auth, PKCE) with a "Not authorized" screen for any non-owner and a Sign out link in the masthead. Code: `AuthGate.jsx`, `LoginPage.jsx`, `SignOutButton.jsx`, `useSession.js`, `utils/ownerCheck.js`.
- Enforcement is in Postgres, not just the UI: `wf_user.app_owners` (filled by hand with Patrick's auth UID, never committed) + `wf_user.is_owner()`; the lockdown (`DB/Migrations/20261023_lock_down_to_owner.sql`, run by Patrick) made **every** `wf_user` table owner-only read/write, `wf_base` owner read-only (nobody can write it through the API), views `security_invoker`, and anonymous access refused everywhere. Verified: anon reads of `my_frames`, `mod_inventory`, `jade_light_tests`, `rivens`, `player_profile`, `app_owners`, `wf_base.warframes/mods/arcanes` all return 401, and an anon write is refused (42501). Emergency exit: `DB/Migrations/20261023_rollback_lock_down.sql`. Setup/runbook: `Docs/Login Setup.md`.
- **Claude's database access is gone.** The `.env` public key no longer proves identity, so read-only diagnostics, "check the live row", and backfill scripts using it now fail. Seed scripts that use the service-role key are unaffected. To verify DB state from now on, ask Patrick to run a query in the Supabase SQL editor and paste the result; do **not** ask for keys. The earlier "data-plane-only DB access" gotcha is superseded: there is no anon data access at all.
- Google setup done by Patrick: Google Cloud project "Cephalon Gu" (External, Testing, his account as a test user), Web OAuth client, Supabase Google provider enabled, Supabase Site URL `http://localhost:5173`, Redirect URLs `http://localhost:5173/**` and `http://localhost:5174/**`. **Any new address Gu is opened from (tablet/phone) must be added to Supabase > Authentication > URL Configuration > Redirect URLs.** Still to do: turn off "Allow new users to sign up" (extra layer; DB already ignores non-owners). Security-checklist note: this is the owner-only phase of Shipment E; per-user isolation (owner column + `auth.uid()` policies) is still needed before any clanmate beta.

Also shipped October 23 (all pushed): capacity now shows **remaining / total** (e.g. 4 / 78) on Loadout and Companion; mod picker has an **Augments** chip listing every augment for the frame (owned selectable, unowned dimmed, with effect text; `augmentsForWarframe` in `utils/modMeta.js`); Arcane Blessing text corrected via `20261023_fix_arcane_blessing_text.sql` (one-row manual correction, run by Patrick; the Static Data pipeline should reconcile it later); **Helminth subsume list updated to 66 abilities** from the wiki in `constants/helminthAbilities.js` (65/66 cross-checked against `warframe_abilities`; Sirius & Orion's is stored as "Jade Stars / Astral Shell", only "Jade Stars" listed; "Rest & Rage" and "Jade Stars" have no `ability_catalog` stat data); Archon Shards editor has **Copy Goal -> Now and Copy Now -> Goal** half-width buttons on both tabs.

**Next: run Gu on Patrick's tablet.** He is fine leaving his PC on. Plan: Tailscale (free private network between his devices; no public URL) or the home network, with the dev server listening on the network (`vite --host`), and add the tablet-facing address (e.g. `http://<pc-tailscale-ip>:5173/**`) to Supabase Redirect URLs. Do **not** host publicly yet. Gu's layout was built for a wide desktop; a phone will likely need responsive fixes (tablet should be fine) — test at phone width. A PWA/home-screen install is a later step.

Other open items: Patrick entering the four reference builds' Warframe mods (calibration blocked); roadmap A3 `benchmark_tiers` gate is obsolete (not yet edited); remaining DB access-audit result sets are now largely moot after the lockdown.

## Previous pickup — October 21, 2026 (still current except where the above supersedes it)

Pushed `main` is at `54d6b24` (plus a docs-only wrap-up commit); remote CI is green on every push this session (runs #2-#8). No deployment. Lint, 39 Node tests, 6 vitest UI tests, and build pass locally; `npm audit` reports 0 vulnerabilities. Dependency advisories were fixed (`6b47334`) and the Static Data / housekeeping work was published earlier in `9dc7b3d`.

**Survivability is now a verified-vs-predicted system, not an EHP score.** Patrick's standard is the Jade Light test: stand under a full Jade Light (~8s) while mobbed, no evading. **Tier 0** ("Bathroom Big") = survived with no intervention; **Tier 1** = survived but needed active upkeep; **Did not survive** ("Back to the drawing board" in the UI). **Tier 2 and below are undefined - do not invent them.** Default test setting: Steel Path 1999 Scaldre/Techrot survival; Void Steel Path occasionally; Archimedea-without-modifiers is a newer option; Icebind locked. Numeric EHP thresholds are **not** the grading mechanism - Gu's calculations are *predictions*, Jade Light results are *verification*, and an untested build must never be shown as verified Tier 0.

What shipped (all live, migrations run by Patrick):
- `wf_user.jade_light_tests` + a Jade Light section at the top of each build's Testing Log tab (result, environment, optional date, notes; each entry freezes a loadout snapshot).
- Four Tier 0 results backfilled (Oberon Prime, Inaros Prime, Valkyr Prime, Kullervo): Steel Path 1999, **date unknown** (tested within ~4 months before 2026-10-21), snapshots have **no Warframe mods** because none were entered.
- `my_frames.survivability_claim` (Tier 0 / Tier 1 *candidate*, set via modal-header buttons) replaced the S/A/B/C grade dropdown; old grades were wiped (the `tier` column remains, unused). Cards show solid chip = tested, dashed `?` = candidate, red = drawing board, nothing = untested; a logged result always overrides the claim.
- `my_frames.survivability_archetype` (Health Tank / Shield Tank / Hybrid, manual tag) + three toggle filter buttons on the Codex page. One build is tagged so far.
- Tests: new regression suites for weapon search/Riven stats, status/archetype logic, and vitest UI tests for WarframeSelector and RivenEditorModal (`npm run test:ui`, also in CI). Weapon-search filter logic was extracted to `utils/weaponSearch.js`.

**Modded-stat math fixed (verified against Patrick's in-game Arsenal):**
- **Umbral set bonus now scales by piece count** (rank 10 only): Vitality/Fiber +100% solo, +130% with 2, +180% with 3; Intensify +44% solo, +55% with 2, +77% with 3. The old "2-of-3 equals the full set" assumption was wrong. The Survivability tab (`computeResilience`) now applies it too (it previously ignored set bonuses). Tau Resistance scaling is not tracked.
- **Everything is modeled at rank 30, never rank 0.** `wf_base.warframes` stores rank-0 stats, so `src/utils/rankGains.js` adds the wiki's rank-30 gains (general rule +100 Health / +100 Shield / +50 Energy / +0 Armor, plus the ~30-frame exceptions table, plus Nidus +15% Ability Strength; Nidus health regen not modeled). Loaders must select `name` with the stat columns or the gains are skipped. **Policy (Patrick): trust the wiki unless he sees an in-game discrepancy.** Result: Garuda Prime matches the game exactly (Health 1,036 / Shield 0 / Armor 1,626 / Energy 808 / Strength 276%). Every Health/Shield/Energy number in Gu rose accordingly, so earlier hand-checked values (e.g. Frost Prime 1,674 effective health) are stale rank-0 figures.
- Valkyr Prime, Inaros Prime and Kullervo (three of the four Tier 0 references) are on the wiki's exceptions list; not yet spot-checked in game.

**Blocker for calibration:** none of the four reference builds has Warframe mods entered in the Loadout tab (only 2 of 61 builds have any), so Gu's computed numbers for them are base stats + shards only (e.g. Oberon computes 913 effective health while being a confirmed Tier 0). Patrick offered to enter the mods; once they are in, re-run the numbers and compare the four. Gu stores ability *names* only - invulnerability, heals, damage reduction, Overguard are not computable. Proposed methodology (not implemented): per-build defensive *layer inventory* (pool / mitigation / sustain / control / upkeep) judged by archetype, calibrated against the four references; no numeric thresholds.

**Roadmap drift:** the master roadmap still says A3 is gated on numeric `benchmark_tiers` thresholds. That framing is obsolete (see above). Not edited - no lettered shipment closed - but raise it with Patrick before A3 scoping.

Still open: read-only DB policy/grant results (only the three Arcane view definitions have been supplied; run `DB/Diagnostics/20260917_product_access_audit.sql` and share all five result sets); Gu is single-user dev, auth/isolation belongs to shared-beta prep; selector/modal interaction gaps are now covered, remaining regression is broader page-level.

## Historical Session 017 pickup (superseded where it conflicts above)

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
