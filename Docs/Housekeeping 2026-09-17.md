# Resume-readiness housekeeping — September 17, 2026

This is a bounded correctness/verification pass, not implementation of The Cultivated Arsenal redesign or planned intelligence features.

## Completed and verified

- Lint: zero errors and zero warnings, down from 22 errors and four warnings at inspection.
- Production build passes. The existing approximately 603 kB JavaScript chunk warning remains.
- Nine dependency-free Node tests pass: pagination including later-page failure and exact page boundaries; capacity and polarity cases; context fallback and unknown ability values; Snow Globe formula inputs; reload-speed and conditional-effect handling; basic resilience arithmetic.
- Eleven offline Python ingestion tests pass. These are ingestion tests, not full frontend coverage.
- The ability-parameter query uses fetchAll with a unique ID tie-breaker for deterministic ordering and rejects a failed parameter fetch instead of publishing a partial catalog.
- A read-only live check returned 1,000 rows without pagination versus all 2,206 rows and 2,206 unique IDs with pagination.
- Detail selection derives the current record from refreshed frames. Form/selector/search state resets no longer require synchronous effects. Autosave callback refs update in an effect; external value changes cancel pending stale edits.
- Shared polarity constants have their own module. Eight-slot totals use direct calculation; category menu dependencies are stable. Dead code and the Node process import were cleaned up.
- Frontend README now documents actual setup and checks.

Some database-fetch mount calls still have narrowly scoped react-hooks/set-state-in-effect exceptions: they synchronize external data and update state after awaited responses. The rule remains enabled everywhere else. No blanket lint rule relaxation was made.

## Security finding and remaining gate

Owner clarification: Gu is a single-user development tool, not yet alpha. Profiles/OAuth are planned for later; clanmates are the intended beta testers. Access hardening is a prerequisite for shared beta use, not a requirement to finish this housekeeping pass or describe the current personal project on a resume. Do not expand this cleanup into authentication implementation.

The supplied administrative output contains the view-definition result set: three Arcane collection views use security_invoker=true. This establishes that these views use caller permissions; it does not establish restrictive table policies or user isolation. The other audit result sets were not supplied.

Using the frontend publishable key without login, read-only HEAD queries succeeded for my_frames (60 rows), weapon_inventory (285), mod_inventory (557), and player_profile (one). No anonymous write test was performed. Migration source contains permissive CRUD policies; exact live policy expressions are not established by these reads.

Run DB/Diagnostics/20260917_product_access_audit.sql in the administrative SQL editor and retain the results before preparing a migration. The file only reads system catalogs. The current product has no login flow; revoking anonymous access alone would break the existing workspace. Harden access together with a defined owner-access path. Do not claim account isolation or secure multi-user SaaS until verified with separate identities.

## Repository and release boundaries

The checkout already contained a modified roadmap and survivability utility, plus untracked ingestion, diagnostic, test, migration, and redesign artifacts. Preserve that work. Do not publish the entire checkout without reviewing the intended artifact set and checking for credentials/generated outputs. This housekeeping does not apply migrations, promote canonical Arcane data, deploy, or implement OAuth.

Resume claims should distinguish stored parameter counts from complete supported calculations, AI-assisted development from runtime AI, and local implementation from committed/released artifacts.

## Remaining validation

The live-backed Home page rendered 60 builds in a read-only browser check. Full live catalog/editor regression was not completed: browser reads were slow/intermittent and no live autosave or ownership-write test was performed under AGENTS.md.

The local-only autosave fixture passed manual browser checks in React StrictMode: an external value refresh canceled a pending edit and reset the field; a pending edit committed once with the latest callback revision; unmounting canceled a pending edit. These are fixture checks of the hook, not a full application or authenticated workflow suite. No product styling or slot geometry was changed.

A GitHub Actions workflow now defines Node 24 installation, npm tests, lint with zero allowed warnings, and build. The workflow has not yet run remotely. All existing locally untracked ingestion/redesign artifacts still require review before publication.

## Commands

From warframe-client: npm test (Node 24), npm run lint, npm run build.
From the repository root: python -m unittest discover -s DB/Tests -p test_static_data_pipeline.py.
Read-only live diagnostic, from warframe-client: node tests/verify-live-reads.mjs. It prints counts/access only, not credentials or row payloads.
