# Warframe Jarvis — Master Roadmap
*Updated: June 2026 | Stack: Supabase · FastAPI · React · Python ETL*

---

## ✅ Already Built (Architecture Foundation)

- Supabase migration complete (from SQL Server)
- Arcane DB: 129 arcanes seeded via `arcane_seed.sql` + MODERN_ADDENDUM system
- Incarnon Adapter boolean toggle (one weapon row, no duplication)
- Melee arcane slot: DB + frontend + save/load
- Archon Shard system: `ShardEditModal.jsx` refactored (~880 → ~308 lines), all 6 shard types accurate, Tauforged scaling correct
- Variant Constitution system: 2+ fusion shards = Variant, 5 Tau fusion = Apex Variant
- Arsenal modal: tabbed Arsenal / Archon Shards layout, Clear All, unified autocomplete

---

## 🔴 Priority 1 — Build Now (Core Product)

### 1. Warframe Build Editor with Live Stat Calculator
The load-bearing feature. Frame → mod slots → arcanes → shards → helminth → live stats.

- Warframe mod slots with polarity awareness
- Arcane slots (2 per frame) — category-aware filtering by slot type (Warframe / Primary / Secondary / Melee) ← **Next up**
- Archon Shard slots (5 per frame) — already done ✅
- Helminth subsume selector with 25% penalty auto-applied to stat display
- Live ability stat display — Strength, Duration, Range, Efficiency updating dynamically
- Multiple configs per frame (e.g. Dagath Warcry config vs Wrathful Advance config)
- Save, load, name builds
- Import/Export full build database to file

### 2. Stats Calculator
Proportional stat calculator given current mods + shard loadout.

- Input: base stat % + ability base + subsume penalty toggle + arcane bonuses
- Output: ability stat at each shard increment (+1, +2, +3, +4 Tau)
- Identifies which threshold is crossed at each increment

### 3. Weapon Build Editor Linked to Frame
Weapons and frames connected as a unified loadout unit.

- Primary / Secondary / Melee slots per frame
- Weapon mod slots with live stat display
- Incarnon Evolution path selector per weapon — already partially done ✅
- Incarnon visual chip redesign ← **On deck**
- Riven slot per weapon
- Multiple configs per weapon
- Notes/doctrine field per weapon config

---

## 🟠 Priority 2 — Build Soon (Core Intelligence)

### 4. Build Confidence Tagging
Every frame loadout tagged with current status:
- ✅ Confirmed
- 🔬 Stress Test — Build Validation
- 📊 KPM Benchmark Pending
- 🔁 Research and Rebuild
- 🔧 Build Revisit
- ⏳ Waiting Room — Patch Pending

### 5. Subsumed Ability Stat Calculator
- Auto-applies 25% subsume penalty before duration/strength mods calculate
- Flags which ability is subsumed and from which source frame
- Validates ability name against source frame DB

### 6. Weapon Query by Stat
SQL filter returning weapons by any stat combination:
- Attack speed, weapon type, slash weighting, status chance, etc.
- Sorted results with relevant stats displayed

### 7. Build Evolution Log
Full build journey per frame: source → problems → attempts → final config → performance → date confirmed → content cleared
- Oraxia is the seed entry and template

### 8. KPM Session Logger
- Log KPM per session with loadout config snapshot recorded
- Compare KPM across config changes
- Flag school membership per frame
- Identifies operational limit per frame

### 9. Doctrine Tagging / Search ← **On deck**
- Tag weapons with doctrine metadata
- "Works great with Bulwark or Overcharge"
- "Three frame rule — allocated to Garuda, Gauss, Chroma"
- Searchable tags across weapon DB

---

## 🟡 Priority 3 — Intelligence Layer

### 10. Two Elite Schools Classification
Per frame tag:
- 🔴 Red School — KPM Supremacists (offense as defense)
- 🔵 Blue School — 1% Club (defense as immortality)
- 🟣 Hollow Purple — Transcendent (both simultaneously)
- Unlocked after KPM benchmark + stress test both pass

### 11. Build Recommendation Engine — Two Pathways
- Surplus Exploitation — frame has surplus X, find weapons that exploit X
- Kit Dependency — frame needs Y to function, find weapons that provide Y
- Utility Weapon category — weapons serving ability amplification not damage

### 12. Shard Optimization Engine ← **On deck**
- Given a frame's build goals, suggest optimal shard loadout
- Accounts for Tauforged efficiency thresholds
- Variant/Apex Variant Constitution flagging

### 13. Patch Awareness Flagging
- Flag frames as rework pending
- Locks build from recommendation logic until manually cleared
- Waiting Room bucket integration

### 14. Enemy Target Dummy
- Select enemy faction, level, Steel Path toggle
- Actual EHP numbers against real enemy stats
- Connects to original EHP calculator vision

---

## 🟢 Priority 4 — Polish & Portfolio

### 15. Warframe Market API Integration
- Dynamic platinum pricing for tradeable arcanes and weapons
- Feed into build cost calculator

### 16. Portfolio Narrative Documentation
- Engineering decisions log
- Product design insights
- Build philosophy developments
- README, LinkedIn content, interview talking points

---

## 🎨 Parallel Project — The Fifty-Seven Daos Manuscript

*Separate creative track. Does not block Jarvis development.*

- Color codex for all 57 Warframes organized by lore-grounded cultivation schools
- 14 Schools assigned (Crimson Sanguinary, Adolla Pyric, Hallowed Path, Heavenly Mandate, Storm Heaven, Moonless Veil, Necropolis, Plague Garden, Tidal Abyss, Cosmic Antimatter, Desert Crown, Ironclad Mountain, Sound/Scribe schools, Chronos Engineering Bureau)
- Structured output: Frame | Build Title | Cultivation Art | Hex | Color Name | Lore Justification
- Cross-school synthesis notes complete (5 bridge frames documented)
- Active: color conflict resolution sessions as needed

---

## The Isagi Principle

Jarvis devours the best mechanical ideas from every tool in the ecosystem, then combines them with what none of them have: your personal dao constraint system, three frame allocation rule, school classifications, build evolution history, KPM benchmarks, personal roster with specific rivens.

*The chemical reaction between borrowed mechanics and personal intelligence creates something none of them are individually.*
