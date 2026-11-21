# Cephalon Gu Visual History Catalog

## November 21, 2026 — imported Codex content (capture pending)

Database content update, no layout redesign: Identity doctrines for Viral Rockstar,
Father Time, The Celestials, Ice Queen, Eternal Sun; Equinox ability cards/forecast
with both forms and each of the four max-rank augments. Paired desktop/phone
fixture screenshots remain required. Pre-import row snapshots are saved locally
in ignored `tmp/equinox/`; reconstruct the exact before state from those snapshots,
not by clearing or changing live rows. No signed-in visual verification claimed.


## November 21, 2026 — polarity mismatch correction (capture pending)

Local regression fixture: `warframe-client/tests/fixtures/polarity.html` (slot),
and `polarity.html?picker` (picker). Uses the real SlotBox/picker with representative
Blind Rage rank 10 in Zenurik; 74 capacity and 53 other drain are inferred test
values, not a verified copy of the saved Equinox Prime build. No database access.
Expected corrected state: red 20 drain, 1 capacity remaining.

Required pairs: slot and picker at 1440 × 900 and 390 × 844, scroll top.
Capture attempts failed: local headless browsers produced no images and the
in-app browser timed out reaching the local Vite server. No before/after images
are claimed; visual verification remains incomplete. The historical pre-fix state
is 16 drain in muted text, with 5 capacity remaining in this representative budget.

This catalog is the visual source of truth for the redesign campaign. Its purpose is to preserve a complete, inspectable record of Gu before and after every visual migration.

## Pairing rule

No visually changed page, tab, modal, picker, responsive layout, or meaningful state is complete until it has a paired screenshot:

```text
before/<viewport>/<capture-name>.png
after/<viewport>/<capture-name>.png
```

The before and after images must use the same:

- viewport dimensions;
- representative dataset and selected build;
- active route, tab, filter, modal, and picker;
- scroll position or full-page capture mode;
- loading, populated, empty, error, or confirmation state where applicable.

If the implementation changes the page height substantially, retain the full-page pair and add labeled viewport segments for details that need a readable comparison.

## Canon-fidelity rule

Warframes, weapons, equipment, and recognizable in-game objects must begin from canonical references. Gu's design language may change presentation, material treatment, framing, illumination, and ornamentation, but it must not replace the object's identity.

Preserve at minimum:

- silhouette and overall proportions;
- quantity and configuration, such as a dual weapon remaining a pair;
- faction construction language and recognizable mechanical or organic anatomy;
- weapon class, handling identity, and defining functional features;
- canonical names and relationships.

Example: Dual Coda Torxica must read as twin Infested high-fire-rate pistols before Gu's visual treatment is applied. If reliable reference material is unavailable, use a clearly labeled neutral placeholder or omit the illustration rather than inventing a different weapon.

## Fixed viewports

- Desktop: `1440 × 900`
- Phone compatibility: `390 × 844`

Additional breakpoints may be added during hardening, but these two remain the required historical comparison points.

## Desktop baseline coverage

### Global destinations

- Home, including the complete page and Helminth Invigoration editor.
- Codex, including the complete catalog and Add Frame modal.
- Search, including Find in My Builds, Weapon Stats loading, and populated Weapon Stats.
- Arcanes, including the collection overview, missing collection, category browser, and Arcane detail editor.
- Archon Shard Inventory.
- Armory, including the complete inventory and Add Weapon modal.
- Mods, including the complete inventory, Add Mod modal, and Mod detail editor.

### Build workspace

- Identity.
- Loadout: Warframe, Primary, Secondary, and Melee panels.
- Standard mod picker.
- Riven picker and Riven editor.
- Copy Weapon modal.
- Helminth ability picker.
- Archon Shards summary and editor.
- Testing Log.

## Phone baseline coverage

- Home.
- Codex.
- Search.
- Arcanes.
- Archon Shard Inventory.
- Armory.
- Mods top and scrolled segments.
- Build Detail Identity.
- Build Detail Loadout top and grid segments.

Phone captures document compatibility problems rather than implying a separate mobile product. If a nested phone workflow changes visually, capture its exact before-state before editing it.

## State coverage

Populated and loading states were observed directly. Empty, request-error, permission-failure, destructive-confirmation, and save-result states were not triggered against live data. Before implementing those states, create deterministic no-write fixtures and capture both sides from the same fixture.

## Sprint exit checklist

For every visual sprint:

1. Identify all changed capture names before editing.
2. Confirm their before images exist.
3. Capture matching after images at the fixed viewports.
4. Add any newly exposed state or workflow to this index.
5. Review pairs side by side for regressions, canonical-object drift, clipped content, overflow, and misleading data.
6. Include the changed pairs in the sprint handoff.

