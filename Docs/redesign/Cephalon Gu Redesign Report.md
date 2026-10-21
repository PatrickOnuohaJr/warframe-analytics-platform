# Cephalon Gu Redesign Report

**Campaign:** The Cultivated Arsenal  
**Status:** Discovery and design direction complete; implementation not started  
**Date:** 2026-08-27  
**Design sentence:** Keep the cultivation. Sharpen the instrument.

## Executive summary

Cephalon Gu already has a specific identity: a warm, lore-rich cultivation-school build planner with accurate Warframe terminology and unusually dense nested data. Its redesign should not turn it into a generic dashboard or merely reskin its cards. The central opportunity is to make hierarchy, navigation, and high-density inventory work feel deliberate while preserving the product's personality and game-accurate mechanics.

The proposed direction, **The Cultivated Arsenal**, treats the interface as a ritual instrument: dark matte metal, warm parchment, engraved dividers, antique-gold controls, and local school-color accents. A persistent command rail establishes a single navigation model. Content is organized as artifact plates and ruled data surfaces rather than stacks of interchangeable rounded cards.

This report covers the product as it exists today. It does not introduce screens for companion tracking or the survivability suite. Six representative concepts were produced: Home, Codex, Build Detail, Loadout, Mods, and Add/Edit Riven. Armory remains in the implementation scope and dependency map, but is not a separate high-fidelity concept.

## Preservation contract

These are constraints, not optional references:

- Keep the name **Cephalon Gu**, the cultivation-school lore, warm dark palette, Cinzel typography, school colors, build-card anatomy, and Warframe terminology.
- Preserve the current dropdown-based school filter and collapsed navigation pattern. Do not restore the old 14-button school row.
- Preserve Arsenal-accurate mod slot arrangements:
  - Weapons: 4 by 2 main grid plus a separate Exilus slot.
  - Warframes and melee: 2-4-4 main arrangement plus the appropriate Aura or Stance slot.
- Represent shipped functionality only: Home, Codex, build detail, Loadout, Mods, Armory, and the current Riven workflow.
- Treat mobile as graceful compatibility, not a bespoke mobile product. Confirm scope before investing in a separate mobile information architecture.
- Do not require live database writes for design validation. Use representative data and clearly label inferred states.
- Preserve canonical Warframe and weapon identity in all illustrations. Silhouette, quantity, proportions, faction anatomy, weapon class, and defining functional features remain fixed; Gu's design language applies to presentation and surface treatment.

## Visual history protocol

`Docs/redesign/catalog` is the campaign's before/after source of truth. Every visually changed route, tab, modal, picker, responsive layout, and meaningful state must have a paired capture using the same viewport, representative data, interaction state, and scroll position. Required comparison viewports are desktop `1440 × 900` and phone compatibility `390 × 844`.

The baseline catalog includes every shipped top-level destination and the nested build, Loadout, Riven, Arcane, Armory, Mod, shard, search, and Helminth workflows observed during discovery. Empty, request-error, permission-failure, destructive-confirmation, and save-result states remain fixture-dependent and must be captured without live writes when implemented.

## Current product and frontend structure

The application is a React 19 and Vite 8 single-page frontend using Tailwind CSS v4 and a direct Supabase client. Navigation is held in component state in `App.jsx`; there is no URL router. The current top-level product areas are Home, Codex, Search, Arcanes, Archon Shards, Armory, and Mods. Build detail is presented as a full-screen overlay with Identity, Loadout, Shards, and Testing Log sections. Riven selection and editing are integrated into the loadout slot workflow.

The frontend is compact enough to iterate quickly, but the single-file application shell and state-driven navigation make hierarchy, deep-linking, focus restoration, and responsive behavior harder to evolve safely. These are implementation concerns for a later phase, not reasons to rewrite the product before the visual system is approved.

### Baseline verification

- Production build: passes.
- Bundle: approximately 567 KB of JavaScript and currently produces a chunk-size warning.
- Lint: 19 errors and 3 warnings in the inspected baseline.
- Automated tests: no test script is defined.
- Data loading: populated screens were observed, but several secondary datasets took roughly 25-30 seconds to become visible in the local audit.
- Mobile viewport: at 390 px, the page measured approximately 677 px wide and produced horizontal overflow.
- Database safety: the audit did not write to Supabase. Riven pickers and editors were closed without saving.

## Screen audit

### Home

**What works:** The page communicates Gu's school taxonomy and build-card anatomy. Warm surfaces and school accents already differentiate it from a neutral tool.

**What breaks down:** The school filter, content summary, section heading, and card grid compete at similar visual weight. Cards carry many small metadata elements without a strong reading order. The page feels like a collection of panels instead of a guided entry point.

**Redesign response:** Establish a clear seasonal header, compact school selector, recent-cultivation focus, and disciplined card rhythm. Keep school color as a local signal rather than tinting every container.

### Codex

**What works:** The catalog model is understandable and the content is recognizably Warframe-specific.

**What breaks down:** Search, filtering, category context, and result cards do not form one clear task sequence. The user must visually rescan the page to understand what is active.

**Redesign response:** Use a stable left command rail, a single catalog command band, count and filter feedback, and denser artifact rows/cards with consistent metadata placement.

### Build detail

**What works:** Identity, Loadout, Shards, and Testing Log map to meaningful build-planning tasks.

**What breaks down:** The full-screen overlay behaves like a page but lacks page-level navigation semantics. Important identity information, tabs, actions, and equipment compete at the same depth. Closing the overlay is the main way to restore context.

**Redesign response:** Treat build detail as a routable workspace with a stable identity masthead, local section navigation, explicit edit actions, and an equipment summary that leads naturally into Loadout.

### Loadout

**What works:** The accurate Arsenal slot layouts and Riven integration are the strongest product-specific interaction assets. The nested loadout-to-slot workflow is meaningful and worth protecting.

**What breaks down:** Equipment switching, capacity, polarities, installed mods, slot actions, and detail inspection are crowded into a hierarchy that is difficult to scan. Generic card treatments understate the importance of the grid.

**Redesign response:** Make the Arsenal grid the primary instrument. Keep exact slot geometry, isolate Aura/Stance/Exilus slots, expose capacity and polarity consistently, and reserve the side inspector for the selected slot or mod.

### Mods

**What works:** Ranking controls and ownership information support a real inventory-management task.

**What breaks down:** Large three-column cards consume space without improving comparison. Slider treatment, rank state, ownership, and actions are visually fragmented. Slow loads provide limited expectation-setting.

**Redesign response:** Use a dense ledger with stable columns, inline rank controls, visible ownership state, and a focused detail panel. Preserve visual recognition of mod cards without making every row a large framed card.

### Armory

**What works:** Armory is a useful dependency for understanding available weapons and equipment in build workflows.

**What breaks down:** It inherits the same hierarchy, loading, and comparison issues as the Codex and Mods areas.

**Redesign response:** Reuse the catalog command band and dense artifact-row grammar. Armory should share components with Codex and Mods rather than becoming a third unrelated inventory pattern.

### Add/Edit Riven

**What works:** Structured stat dropdowns and sign-toggle rules make this workflow specific and valuable. It is not a generic text-entry modal.

**What breaks down:** The current modal compresses weapon context, stat structure, polarity, rank, and save/cancel actions into one undifferentiated stack. Modal semantics and keyboard focus handling need strengthening.

**Redesign response:** Keep the structured rules, but divide the editor into weapon context, inscription lines, polarity/rank, and outcome summary. Use an explicit dialog title, field labels, error placement, focus trap, escape handling, and focus restoration.

## Cross-product findings

### Information architecture

The interface currently uses more than one navigation grammar: top-level page state, collapsible school controls, full-screen build overlays, and tab-like subsections. The redesign should define two levels only:

1. A canonical product navigation for Home, Codex, Armory, and Mods, with current supplemental areas retained according to shipped scope.
2. Local workspace navigation inside build detail for Identity, Loadout, Shards, and Testing Log.

Search is a capability, not a competing destination, unless product requirements establish a distinct global-search workflow. URL-backed state is recommended so builds, tabs, filters, and selected items can be linked and restored.

### Visual hierarchy

The current design repeats similar rounded cards, borders, labels, and muted text at many levels. Nested containers reduce clarity because every boundary looks equally important. The redesign should use fewer containers, stronger section rules, consistent alignment, and scale contrast. A surface should exist because it groups an interaction or protects a data object, not because every block needs a card.

### Responsive behavior

The current page overflows substantially at phone width. The goal is compatibility, not a separate mobile product:

- **1440 px and above:** persistent command rail, two- or three-zone workspaces, full density.
- **1024-1439 px:** compact rail, reduced side inspector width, preserved main grid geometry.
- **Below 900 px:** compact top bar and a simple navigation sheet; single-column reading order for ordinary content.
- **Arsenal grids:** preserve slot order and geometry as an atomic canvas. At narrow widths, scale to a safe minimum and allow clearly indicated horizontal panning rather than rearranging slots into an inaccurate order.
- **Tables and ledgers:** keep primary identity and action columns visible; move secondary metadata into a disclosure row.
- **Touch:** minimum 44 by 44 px interactive targets where controls are intended for touch.

A dedicated mobile IA, mobile-only navigation, or separate mobile interaction model should require a new scope decision.

### Accessibility

The inspected UI needs a semantic and keyboard pass. Priority acceptance criteria:

- Use real links and buttons for navigation and card actions; avoid clickable `div` elements.
- Provide visible focus indication that meets contrast requirements.
- Give icon-only controls accessible names and tooltips where meaning is not obvious.
- Associate every form control with a persistent label; placeholders are not labels.
- Implement dialogs with a labeled dialog role, initial focus, focus trap, Escape behavior, and focus restoration.
- Announce loading, error, and save outcomes without stealing focus.
- Respect reduced-motion preferences and avoid broad `transition-all` declarations.
- Ensure text and meaningful non-text UI meet contrast targets in every school-color variant.

### Performance and frontend maintainability

- Split the top-level application shell and major page workspaces before large visual implementation work.
- Introduce route-backed navigation and lazy-load major workspaces.
- Investigate slow secondary data fetches and render useful loading structure immediately.
- Reduce the main bundle with route or feature boundaries and avoid importing infrequently used editor code into the initial path.
- Create shared primitives for command rails, command bands, artifact plates, metadata rows, dialogs, and loadout slots.
- Add lint cleanup, component tests for stateful workflows, and visual regression coverage before migration reaches dense loadout interactions.

## Design direction: The Cultivated Arsenal

The interface should feel like a Cephalon-built cultivation instrument: precise enough for loadout engineering, warm enough to carry the schools' lore, and restrained enough that data remains primary.

### Visual system

| Role | Direction |
| --- | --- |
| Page | Deep warm charcoal, `#171512` |
| Base surface | Charred umber, `#211E1A` |
| Raised surface | Warm graphite, `#2B2721` |
| Primary text | Parchment, `#EEE7D8` |
| Secondary text | Ash, `#A79F91` |
| Primary accent | Antique gold, `#C79A48` |
| Destructive | Ember red, `#D05B56` |
| Focus | Cool luminous blue, `#90C9D8` |

School colors remain semantic local accents for badges, selection rules, and small identity fields. They should not replace the global interaction accent or lower text contrast.

Use Cinzel for short display headings and engraved identity moments. Use the current readable sans family, or a metrically compatible refinement, for navigation, controls, dense metadata, and long text. Use tabular numerals for capacity, ranks, counts, and stat comparisons.

### Component grammar

- **Command rail:** stable global orientation with icon, label, active rule, and optional compact mode.
- **Command band:** one horizontal zone for title, search/filter state, count, and primary action.
- **Artifact plate:** low-radius or square-edged content surface with etched rules and selective corner detail.
- **Build card:** preserve identity anatomy but strengthen title, school, equipment, and status order.
- **Inventory ledger:** dense comparative rows for Mods and Armory.
- **Arsenal grid:** the hero interaction on Loadout; all decorative treatment yields to exact slot geometry.
- **Inspector:** one selected object, one action hierarchy, and a clear path back to the grid.
- **Dialog:** labeled, bounded task with persistent field labels and explicit completion state.

### Motion

Motion should clarify state rather than create spectacle. Use short opacity and transform transitions for rail selection, inspector changes, dialogs, and save feedback. Avoid global transitions and scroll-driven motion in dense workspaces. Reduced-motion behavior must be first-class.

## State coverage

| State | Audit status | Redesign requirement |
| --- | --- | --- |
| Populated Home, Codex, detail, Loadout, Mods, Armory | Observed directly | Preserve representative data density |
| Riven picker and editor | Observed directly, not saved | Preserve structured rule model |
| Loading | Observed directly on secondary data screens | Use layout-preserving skeletons and clear status |
| Empty collections | Not directly observed | Infer from code, then validate with a controlled fixture |
| Fetch error and retry | Not directly observed | Do not invent final copy; validate against implementation behavior |
| Permission or auth failure | Not directly observed | Confirm whether this is a supported user-facing state |
| Destructive confirmation | Not directly observed | Require explicit object naming and safe default focus |
| Save success/failure | Not triggered to avoid writes | Validate with mocked responses before implementation approval |

## Concept set

The six images in `Docs/redesign/concepts` are high-fidelity direction references, not implementation-ready specifications. Generated labels, counts, mod names, and stat values are illustrative and must be reconciled with canonical product data during implementation.

1. **Home:** establishes the command rail, seasonal masthead, cultivated build cards, and school filter hierarchy.
2. **Codex:** shows catalog navigation, search/filter feedback, and a denser artifact collection.
3. **Build Detail:** turns the current overlay into a stable workspace with identity, local navigation, and equipment summary.
4. **Loadout:** centers the exact 2-4-4 Warframe layout with a separate Aura slot and a selected-slot inspector. Weapon implementation must use 4 by 2 plus separate Exilus.
5. **Mods:** demonstrates a comparative ledger and focused rank/ownership editing.
6. **Add/Edit Riven:** preserves structured stat rules while separating weapon context, inscription construction, and completion actions.

## Implementation plan

No application changes should begin until the direction and scope are approved.

### Phase 0: stabilize the baseline

- Resolve the 19 lint errors and 3 warnings without visual changes.
- Add a small automated smoke suite for top-level navigation, build opening, loadout tabs, and Riven editor open/cancel.
- Add deterministic representative fixtures for loading, empty, error, and save outcomes.
- Capture baseline visual snapshots at desktop, compact desktop, and 390 px.

### Phase 1: shell and design tokens

- Introduce semantic color, spacing, type, border, focus, and motion tokens.
- Extract the application shell and canonical navigation.
- Add route-backed state while preserving existing labels and behavior.
- Build accessible primitives for command bands, plates, dialogs, and controls.

### Phase 2: Home and Codex

- Migrate Home hierarchy and existing build cards.
- Migrate Codex search, filters, result counts, and collection layouts.
- Validate school color contrast and keyboard navigation.

### Phase 3: Build Detail, Loadout, and Riven

- Convert build detail into a stable workspace and local navigation model.
- Implement Arsenal slot primitives with snapshot tests for every equipment type.
- Migrate Riven selection and editing with complete dialog semantics.
- Validate no data mutation behavior changes.

### Phase 4: Mods and Armory

- Share an inventory-ledger pattern across both areas.
- Improve load feedback and defer noncritical detail work.
- Verify bulk and rank actions against current data constraints.

### Phase 5: responsive, accessibility, and performance hardening

- Eliminate viewport overflow and validate keyboard-only workflows.
- Test screen-reader names, focus order, dialogs, and status announcements.
- Verify reduced motion, contrast, target sizes, and zoom behavior.
- Establish bundle budgets and visual-regression gates.

## Approval gates

Before implementation, confirm:

1. The Cultivated Arsenal visual direction and canonical command rail.
2. The six-concept screen scope and Armory's reuse of the inventory-ledger system.
3. URL-backed navigation as an implementation requirement.
4. Graceful mobile compatibility only, with Arsenal grids preserved as atomic canvases.
5. A no-write mocked dataset for destructive, error, empty, and save-result validation.

No additional product access is required to start implementation after those approvals. Helpful but non-blocking inputs would be canonical populated-state screenshots for rare build types, the exact school-color source of truth, and any existing analytics showing the most common build and inventory workflows.
