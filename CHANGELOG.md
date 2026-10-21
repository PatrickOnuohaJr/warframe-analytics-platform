# Changelog

## 2026-09-17 - Local resume-readiness housekeeping

- Fixed ability-parameter pagination and deterministic ordering; a live read-only check retrieved all 2,206 rows with unique IDs.
- Cleaned unused code, component constant exports, hook dependencies, and form/selection state synchronization. Lint passes with zero errors/warnings; legitimate asynchronous database effects retain narrowly documented rule exceptions.
- Added nine calculation/pagination regression tests, a local-only autosave fixture, and a frontend CI workflow. Nine Node tests and eleven Python ingestion tests pass; CI has not run remotely.
- Autosave fixture checks passed for external refresh, latest callback, and unmount cancellation. Full live UI regression remains open.
- Reconciled handoff/README/baseline documentation and preserved the later D.7 cut.
- Confirmed anonymous personal-table reads and prepared a read-only administrative access audit. No live permission changes or database writes were made.
- Existing local roadmap/survivability/ingestion/redesign work remains preserved. Changes are local; no commit, push, deployment, or canonical promotion occurred.

## 2026-08-27 - Redesign discovery campaign

- Audited the current Cephalon Gu frontend, shipped screens, navigation, dense inventory workflows, responsive behavior, accessibility, and build health.
- Captured read-only before-state screenshots for Home, Codex, Build Detail, Loadout, Mods, Armory, and Riven workflows.
- Created six high-fidelity direction concepts under `Docs/redesign/concepts`.
- Added the written campaign report and implementation plan under `Docs/redesign`.
- Added project guardrails to `AGENTS.md`.
- No application code or live database data was changed.
- Expanded the baseline into a visual-history catalog covering every top-level destination, nested build tabs, inventory editors, pickers, representative responsive layouts, and observed loading/populated states.
- Added a canon-fidelity rule for Warframe and weapon illustrations: Gu may reinterpret presentation and surface treatment, but not recognizable object identity.
