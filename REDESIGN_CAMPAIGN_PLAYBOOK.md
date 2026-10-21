# Redesign Campaign Playbook

This document describes the process used to produce the Scent Cloud redesign report and presentation, and the repeatable workflow to use when launching a redesign campaign for another existing product.

The campaign is intentionally separate from implementation. Its job is to inspect the real product, establish a credible visual direction, show what the redesigned experience could become, and produce an implementation plan that a coding agent can execute without guessing.

## What “launch redesign campaign” means

When the owner says **launch redesign campaign**, the expected outcome is:

1. Read the project’s current context and constraints.
2. Run and inspect the existing product instead of designing from assumptions.
3. Audit the visual system, UX, responsiveness, accessibility, and frontend structure.
4. Research relevant visual references and current best practices where useful.
5. Define one coherent design direction.
6. Produce separate high-fidelity concepts for the product’s important screens.
7. Package the findings, concepts, design system, and implementation order into a written report and presentation.
8. Review the direction with the owner before modifying application code.

This is a **design discovery and direction phase**, not permission to refactor or build features unless implementation is requested separately.

## Hard portability rule

**Reuse the campaign methodology—not Scent Cloud's design conclusions.**

Never carry Scent Cloud's palette, typography, layout, navigation, imagery, "midnight fragrance atelier" aesthetic, or product assumptions into another project by default. Every redesign must derive its own direction from that project's users, purpose, existing brand, content, architecture, constraints, competitive context, and owner feedback.

References from earlier campaigns may demonstrate process or quality level, but they must not become an unexamined template. If a new project independently calls for a similar choice, document why it fits that project on its own merits.

## Inputs needed from the owner

Most existing projects can be audited without a long questionnaire. The minimum useful input is:

- Repository or project path
- How to install and run it locally
- Product purpose and primary user
- Current priority or feature being considered
- Anything that must be preserved, such as dark mode, brand colors, routes, terminology, or core workflows
- Known competitors or references, if any
- Whether the output should be exploratory, implementation-ready, or both

Helpful but optional inputs:

- Brand assets and approved fonts
- Existing design files or screenshots
- Analytics or known user complaints
- Target devices and browsers
- Accessibility or compliance requirements
- Asset licensing constraints
- Desired implementation framework
- Timeline or release milestone

If these are absent, the campaign should proceed using the repository, the running product, and clearly stated assumptions. Questions should be limited to decisions that would materially change the direction.

## Required project discovery

Before visual work begins:

1. Read the repository’s `AGENTS.md`, README, contribution rules, and any project-specific instructions.
2. Inspect the project structure, routes, page components, shared components, styles, assets, and configuration.
3. Read `package.json` and identify the framework, runtime, UI libraries, animation libraries, and build commands.
4. Check Git status and preserve unrelated or pre-existing work.
5. Install dependencies only when needed and authorized.
6. Run the production build and lint/test commands.
7. Start the local development server.
8. Inspect the real interface at desktop and mobile sizes.
9. Capture representative “before” screenshots.
10. Record functional, visual, responsive, accessibility, and technical findings separately.

The audit must distinguish between:

- Existing behavior that should be preserved
- Existing behavior that is broken
- Visual weaknesses
- UX weaknesses
- Technical debt that blocks safe redesign work
- New feature ideas that are outside the redesign scope

## Skills used for the Scent Cloud campaign

The following skills were used as a coordinated stack.

### 1. `redesign-existing-projects`

Purpose: audit an existing interface before changing it and preserve functionality, routes, and established product behavior.

Use it to:

- identify generic or inconsistent interface patterns
- separate redesign work from feature work
- preserve information architecture unless a change is justified
- plan incremental replacement rather than uncontrolled rewriting

### 2. `design-taste-frontend`

Purpose: establish a distinctive, non-templated design direction.

Use it to:

- define the design read and aesthetic dials
- choose typography, hierarchy, density, radius, color, imagery, and motion deliberately
- avoid generic AI-generated interface patterns
- enforce responsive and state completeness

### 3. `high-end-visual-design`

Purpose: raise the visual execution to a premium agency-level standard.

Use it to:

- refine spacing, type scale, materiality, shadows, borders, and card structures
- keep the design expensive-looking without excessive effects
- prevent inconsistent radii, random accents, weak hierarchy, and default styling

### 4. `web-design-guidelines`

Purpose: audit usability and accessibility against current interface guidelines.

Use it to check:

- semantic controls and labels
- keyboard and focus behavior
- reduced motion
- touch targets and safe areas
- responsive behavior
- image sizing and performance
- actionable errors and asynchronous status communication

### 5. `vercel-react-best-practices`

Purpose: ensure the proposed redesign can be implemented efficiently in React.

Use it to identify:

- unnecessary client work
- component and bundle boundaries
- image-loading strategy
- data-fetching and rerender risks
- implementation patterns that should be fixed before or during redesign work

### 6. `imagegen-frontend-web`

Purpose: art-direct coherent, implementation-friendly visual concepts.

Use it to:

- generate one separate image per important screen or section
- preserve a single palette and component language across concepts
- vary composition without losing brand continuity
- avoid generic dashboards, repetitive card grids, and default AI gradients

For an application redesign, interpret its “one image per section” rule as **one image per product screen or clearly bounded experience being presented**.

### 7. `imagegen`

Purpose: generate the actual raster UI concepts and visual assets.

Use it for high-fidelity screen concepts, art-directed product imagery, or mood-setting visual references. Generated text and product labels are conceptual and must be verified or replaced during implementation.

### 8. `presentations`

Purpose: create and verify the final PowerPoint presentation.

Use it to:

- build an audience-facing narrative
- place before and after evidence side by side
- present screen concepts, design principles, and implementation phases
- render every slide and repair overflow, clipping, or inconsistent layout before delivery

## Tools required

### Repository and code inspection

- PowerShell or the project’s shell
- `rg` for fast source and pattern searches
- Git status and diff commands
- Package-manager build, lint, and test commands

### Live product inspection

- Local development server
- In-app browser control for DOM inspection, responsive viewport checks, screenshots, and console inspection
- Existing authenticated browser session when protected screens must be viewed and the user has authorized access

### Research

- Web search for current official guidelines, product references, and source verification
- Image search when real visual references are more useful than generated concepts
- Creator/social-profile review only when the owner supplies relevant creators or asks for it

Creator recommendations are inspiration inputs, not automatic product decisions. Every suggested library or design resource must be checked for fit, maintenance, licensing, accessibility, and redundancy.

### Visual concept production

- Built-in image generation for high-fidelity screen concepts
- Local image viewer for full-resolution inspection
- A consistent prompt matrix covering every screen

### Presentation production

- Workspace presentation runtime
- `@oai/artifact-tool` through JavaScript ES modules
- Slide-rendering helper
- Montage generator
- Overflow/layout validator
- Full-size visual inspection of every final slide

## The Scent Cloud process, step by step

### Step 1 — Establish constraints

The owner confirmed that the existing dark look should remain. That became a hard constraint rather than an optional theme.

The product context established several additional constraints:

- React and Vite implementation
- Supabase authentication and data
- existing routes and workflows should remain intact
- Match My Outfit was the next planned feature
- no new feature code should be written during the scoping pass

### Step 2 — Inspect the real project

The campaign inspected:

- `AGENTS.md`
- `package.json`
- application routing
- global styling
- navigation
- Login, Home, Catalog, Collection, and Match Weather source
- Supabase-facing data and AI invocation patterns
- inline styles, hover handlers, headings, controls, accessibility attributes, transitions, logs, and route navigation

### Step 3 — Verify the baseline

The production build succeeded. Lint reported 8 errors and 4 warnings. These were documented as stabilization work instead of being silently repaired during design scoping.

The local product was opened in a browser and the Login screen was captured as before-state evidence.

### Step 4 — Diagnose the design problem

The current product was judged to be functionally promising but visually prototypical:

- almost all styling was inline
- the dark palette lacked a distinctive material or typographic system
- page hierarchy was weak
- navigation had no mature responsive model
- interface states were incomplete
- bottle imagery and the emotional value of a fragrance collection were underused

### Step 5 — Define one concept spine

The chosen direction was **midnight fragrance atelier**.

Its core ingredients:

- ink-black and graphite surfaces
- warm ivory text
- editorial serif plus precise sans-serif
- mist-blue as the primary interaction accent
- burgundy reserved for Outfit Match
- amber for warnings
- scent-family colors used as small metadata signals
- cinematic bottle photography
- smoky, matte, tactile materiality
- restrained motion and hairline borders

The key design sentence was: **Keep the darkness. Add hierarchy, materiality, and confidence.**

### Step 6 — Plan a coherent screen set

Five concepts were selected:

1. Login
2. Home
3. Catalog
4. My Collection
5. Match My Outfit

Each concept received its own horizontal generation. Prompts repeated the same palette, typography, material, navigation, accessibility, and anti-pattern constraints.

### Step 7 — Generate and inspect concepts

The concepts were generated individually and checked for:

- hierarchy
- brand continuity
- usable composition
- plausible React implementation
- clear primary action
- sufficient imagery
- absence of generic AI visual patterns
- legibility and correct product terminology

The concepts were not treated as exact production specifications. Generated labels, invented navigation destinations, and decorative membership ideas were identified as non-authoritative.

### Step 8 — Build the narrative

The presentation was structured as:

1. Design direction
2. Current-state diagnosis
3. Login before and after
4. Home concept
5. Catalog concept
6. Collection concept
7. Match My Outfit concept and flow
8. Shared design system
9. Implementation plan and approval decision

This order moves from problem to direction to proof to execution.

### Step 9 — Produce and verify the deck

The deck was authored as an editable PowerPoint using the presentation runtime. It was then:

- exported
- rendered slide by slide
- reviewed as a montage
- inspected individually at full size
- tested for content overflow

A Windows/OneDrive permission issue blocked preview output inside the first scratch directory. The preview destination was moved to a workspace-level directory, after which export and validation succeeded.

### Step 10 — Capture owner feedback

The owner approved the overall direction and identified two concept inconsistencies:

- left-navigation labels and ordering varied between generated screens
- “Atelier Member” was unexplained and implied a feature that does not exist

These are now implementation rules:

- use one canonical navigation shell across every authenticated screen
- show only real product destinations
- do not introduce membership, rewards, or other product concepts without approval

## Required deliverables for future campaigns

A complete redesign campaign should normally produce:

- `docs/redesign/<Project> Redesign Report.md`
- `docs/redesign/<Project> Redesign Scope.pptx`
- before-state screenshots used in the deck
- separate after-state concepts for each important screen
- an updated `AGENTS.md` current-state reference
- a `CHANGELOG.md` session entry

Optional deliverables:

- design-token specification
- component inventory
- mobile-specific concept deck
- implementation tickets
- asset and licensing register
- visual regression baseline

## Quality gates

Do not declare a campaign complete until all applicable checks pass.

### Product fidelity

- Existing routes, terminology, and workflows are accurately represented.
- Concept-only features are clearly labeled and not mistaken for current functionality.
- Navigation is identical across every concept unless a responsive variant is being shown.
- User feedback is incorporated into the canonical direction.

### Visual quality

- One coherent palette and typography system is used throughout.
- Screens differ in composition but clearly belong to the same product.
- The design avoids generic SaaS grids, excessive glow, random gradients, decorative blobs, and unnecessary glassmorphism.
- Product imagery supports the experience instead of acting as filler.
- Each screen has one obvious primary action.

### UX and accessibility

- Desktop and mobile navigation models are defined.
- Keyboard, focus, labels, reduced motion, touch targets, and status communication are addressed.
- Loading, empty, error, permission-denied, destructive, and retry states are included in the implementation scope.
- Color is never the only source of meaning.

### Technical credibility

- Build, lint, and test status are reported honestly.
- Existing technical debt is separated from redesign scope.
- Proposed patterns fit the actual framework and data model.
- Performance implications of images, fonts, motion, and bundles are included.

### Presentation QA

- Every slide is rendered and inspected at full size.
- No unintended overlap, clipping, or wrapping remains.
- The deck passes overflow validation.
- Before/after claims are traceable to the inspected product.
- Generated imagery is labeled as conceptual where appropriate.

## Canonical launch prompt

Use this prompt when assigning a new project:

> Launch a redesign campaign for this project. Read the repository instructions first, then run and inspect the current product before proposing changes. Do not change application code yet. Audit the visual design, UX, responsiveness, accessibility, interface states, and frontend implementation quality. Preserve existing functionality and any constraints I give you. Define one coherent design direction, create separate high-fidelity concepts for the important screens, and produce a written redesign report plus a before/after PowerPoint presentation. Keep navigation, terminology, and product scope consistent across every concept; do not invent features without labeling them and getting approval. Include a design-system direction, mobile behavior, accessibility requirements, technical risks, and a phased implementation plan. Render and visually inspect every presentation slide before delivery. Update the project’s current-state and changelog documentation at the end, but do not commit or implement the redesign until I approve the direction.

## Optional launch brief template

Add these details beneath the canonical prompt when they are known:

```text
Project path:
Product and audience:
Primary user goal:
Current priority:
Must preserve:
Must avoid:
Brand assets or references:
Target devices:
Known UX problems:
Required screens:
Output preference:
Implementation framework:
Deadline or milestone:
```

## Handoff to implementation

After the direction is approved, the design campaign should produce an implementation brief for the coding agent. That brief should identify:

- approved navigation and information architecture
- design tokens
- component inventory
- screen order
- responsive behavior
- full state matrix
- asset requirements
- accessibility acceptance criteria
- performance constraints
- build, lint, test, and visual-regression acceptance criteria

Implementation should begin with stabilization and the shared design system, then redesign existing screens incrementally. New feature work should start only after the shared foundation is stable.

For Scent Cloud, the approved working sequence is:

1. Stabilize build-quality and encoding/casing issues.
2. Build the canonical app shell and shared design primitives.
3. Redesign Login, Home, Catalog, Collection, and Match Weather.
4. Implement Match My Outfit using the structured styling-tool flow.
5. Complete accessibility, responsive, performance, security, and deployment verification.
