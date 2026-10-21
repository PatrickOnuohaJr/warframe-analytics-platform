# Cephalon Gu Project Instructions

Read `Docs/HANDOFF.md` before changing the application. Use `Docs/Cephalon_Gu_Master_Roadmap.md` for product history and shipped scope.

## Current redesign status

The discovery and concept phase for **The Cultivated Arsenal** is complete. Application implementation is not approved yet. The current report is `Docs/redesign/Cephalon Gu Redesign Report.md`; the scope deck is `Docs/redesign/Cephalon Gu Redesign Scope.pptx`.

Do not redesign or refactor product code until the user approves the direction and implementation phase.

## Preservation rules

- Keep Cephalon Gu's name, cultivation-school lore, warm dark palette, Cinzel typography, school colors, build-card anatomy, and Warframe terminology.
- Keep the dropdown-based school filter and collapsed navigation pattern. Do not reintroduce the old 14-button school row.
- Preserve exact Arsenal slot geometry:
  - Weapons: 4 by 2 plus a separate Exilus slot.
  - Warframes and melee: 2-4-4 plus Aura or Stance as appropriate.
- Scope concepts and implementation to shipped product areas. Companion tracking and the survivability suite are not built and must not receive screens in this campaign.
- Treat mobile as graceful compatibility. Ask before creating a bespoke mobile information architecture.
- Do not write to the live database for design or state testing. Use representative fixtures and label inferred states.

## Canonical visual references

- Treat Warframe and weapon identity as canonical. Preserve silhouette, proportions, quantity/configuration, faction construction, weapon class, and defining functional features.
- Gu's visual language may change presentation, material treatment, illumination, framing, and ornamentation. It must not turn a canonical object into a different object.
- Example: Dual Coda Torxica must remain recognizable as twin Infested high-fire-rate pistols.
- Verify illustrations against reliable in-game or official references. If references are insufficient, use a labeled neutral placeholder or omit the illustration instead of inventing one.

## Visual history requirement

- Read `Docs/redesign/catalog/README.md` before any visual implementation.
- Every changed route, tab, modal, picker, responsive layout, and meaningful state requires paired before/after screenshots at the same viewport, state, and scroll position.
- Required historical viewports are desktop `1440 × 900` and phone compatibility `390 × 844`.
- A visual sprint is not complete until its after captures and catalog index are updated.

## Frontend baseline

- React 19, Vite 8, Tailwind CSS v4, direct Supabase client.
- Navigation currently lives in `App.jsx` state; there is no router.
- Production build passes with a chunk-size warning.
- Historical discovery baseline: 19 lint errors and 3 warnings; September 17 pre-cleanup inspection: 22 errors and 4 warnings.
- September 17 housekeeping baseline: lint passes with zero errors/warnings; `npm test` runs nine calculation/pagination tests using Node 24. Build still has the chunk-size warning. Full UI regression is not established. See `Docs/Housekeeping 2026-09-17.md`.

Preserve unrelated user changes. Before implementation, re-run build and lint and report any drift from this baseline.
