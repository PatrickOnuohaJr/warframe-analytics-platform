# Warframe Jarvis — Phase 1 Build Brief
*Hand this to Chat. This is today's scope. Nothing else.*

---

## Context You Need

**Stack**: Supabase (DB) · FastAPI (API) · React/JSX (frontend) · Python ETL
**Dev env**: Windows, VS Code + Antigravity editor, venv at `C:\Users\jideo\Warframe_Project\.venv`
**Role**: Advisory/generative. Patrick implements in Antigravity. You generate code he pastes.

**What's already done:**
- Arcane DB: 129 arcanes seeded. Schema columns: `subcategory`, `max_rank`, `trigger`, `effect_r5`, `source`, `wfm_slug`, `added_update`, `is_tradeable`, `arcane_type` (slot category)
- Archon Shard system: All 6 shard types implemented, Tauforged scaling correct, ShardEditModal.jsx done
- Arsenal modal: Tabbed layout (Arsenal / Archon Shards), unified autocomplete using `item.slot ?? item.arcane_type`
- Incarnon Adapter: Boolean toggle per weapon, no DB duplication

---

## Today's Goal — Category-Aware Arcane Filtering

**The problem:** Arcane autocomplete currently shows all 129 arcanes regardless of which slot you're filling. A Warframe arcane slot should only show Warframe arcanes. A Melee arcane slot should only show Melee arcanes.

**The fix:** Filter arcane suggestions by `arcane_type` matching the slot context.

### Slot → arcane_type mapping:
| Slot | arcane_type filter |
|---|---|
| Warframe arcane slot 1 & 2 | `'Warframe'` |
| Primary weapon arcane slot | `'Primary'` |
| Secondary weapon arcane slot | `'Secondary'` |
| Melee weapon arcane slot | `'Melee'` |

### What to build:

**Step 1 — Confirm the arcane_type values in DB**
Run this query in Supabase to verify what values exist:
```sql
SELECT DISTINCT arcane_type, COUNT(*) 
FROM arcanes 
GROUP BY arcane_type 
ORDER BY arcane_type;
```
Expected: Warframe, Primary, Secondary, Melee (possibly others like Companion, Amp — confirm first)

**Step 2 — Update autocomplete component**
The arcane autocomplete needs a `slotType` prop passed in. When filtering suggestions:
```js
// Filter arcanes by slot type before displaying suggestions
const filteredArcanes = arcanes.filter(a => 
  a.arcane_type === slotType && 
  a.name.toLowerCase().includes(query.toLowerCase())
);
```

**Step 3 — Pass slotType from parent**
Wherever arcane autocomplete is rendered for a frame, pass the slot context:
```jsx
<ArcaneAutocomplete 
  slotType="Warframe"   // or "Primary", "Secondary", "Melee"
  value={arcaneSlot1}
  onChange={setArcaneSlot1}
/>
```
For weapon slots, derive slotType from the weapon's category (melee → "Melee", etc.)

**Step 4 — Verify no regressions**
After filtering, test:
- Warframe arcane slots show only Warframe arcanes
- Melee slots show only Melee arcanes (including Melee Influence from MODERN_ADDENDUM)
- Clearing a slot still works
- Save/load still works

---

## After Category Filtering Is Done

If there's time today, the next item is **Incarnon visual chip redesign**:

The Incarnon Adapter toggle is functional but the UI chip/badge is placeholder. Design goal: a distinctive visual element (chip, badge, or indicator) on the weapon card that clearly communicates "Incarnon Adapter Installed" vs not. Reference: the Archon Shard badge color system already in place for visual language consistency. Should feel like a data chip, not a checkbox.

---

## Rules of Engagement

- Patrick implements, you generate. Produce complete, pasteable code blocks.
- When unsure about a Warframe mechanic, say so — don't invent values.
- Keep suggestions scoped. Don't refactor things that aren't broken.
- The arcane seed file (`arcane_seed.sql`) is canonical. The MODERN_ADDENDUM handles additions. Never modify the seed directly.
- Archon Shard effects are locked to the values in the screenshots Patrick provided. Do not invent shard effects.
