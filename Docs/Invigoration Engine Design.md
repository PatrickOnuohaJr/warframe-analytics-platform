# Invigoration Intelligence Engine — design (not built)

Status: design only, written Nov 3, 2026. Nothing here is populated or migrated. Patrick's rule: **do not generate personalized recommendations until the primary builds are imported and verified.**

## Mechanics (wiki.warframe.com/w/Helminth, Invigoration section, read Nov 3, 2026)

- Every week, from **Monday 00:00 UTC**, three random Warframes are offered an Invigoration: one random offense buff and one random utility buff each. Buffs last 7 days.
- The four candidates Patrick cares about: **Ability Strength +200%**, **Ability Duration +100%**, **Ability Range +100%** (offense), **Energy Max +200%** (utility; not eligible for Hildryn or Lavos). All of them add to the same stat pool as mods (additive). Efficiency +75% is ignored on purpose.
- A Warframe cannot take a second Invigoration while one is active.
- **Override:** the counter goes up by one for each Invigoration *applied* (not offered). At 10 the "Override Warframe" button appears; it lets the currently equipped Warframe replace one of the random options, even one that already has an Invigoration that week. Using it resets the counter to 0. Up to four Warframes per week.
- Patrick's "every month" is an approximation: if all three weekly offers are applied, 10 takes 3.33 weeks. The counter is what matters, not the calendar.

## What Gu already has (audit, read-only, Nov 3, 2026)

| Input | State |
|---|---|
| Builds | 61, exactly one per Warframe (61 distinct `warframe_id`). So "the primary build" is simply the build today. Several builds per Warframe is not built yet; when it is, a `is_primary` flag is needed. |
| Warframe mods entered | Only **4 of 61** builds. Stats for the rest cannot be computed yet. This is the main blocker. |
| Intent signals | 57 of 61 have Cultivation doctrine and identity, 36 have a survivability archetype. These are the closest thing to "what the build is for". |
| Ability data | 259 abilities, 2,247 parameters: 344 scale with Strength, 196 with Duration, 254 with Range, 259 are Energy cost (Efficiency). **622 parameters have no scaling assigned yet** and 572 are fixed. 270 distinct ability names appear in kits, so about 11 have no data. |
| Energy Max | **No ability parameter depends on Energy Max.** Its benefit needs a sustain model (pool vs cost per cast, energy-conversion arcanes); this does not exist and is the weakest part. |
| Stat engine | `computeModdedWarframeStats` (mods, Tauforged/regular Crimson shards, arcanes incl. Umbral, Arcane Battery), `computeAbilityStats`, `forecastAbility` (shows exactly what +200% Strength etc. does to each ability number, with caps and the Efficiency floor). |
| Augments | 3 of about 210 ability augments are modelled (parked until builds are entered). |
| Helminth | The subsumed ability is stored per build and resolved with its own context. |

## Recommendation model: transparent score, not machine learning

One build, one ordered ranking of the four candidates: Ideal, Secondary, Tertiary, Least beneficial.

For each candidate stat S and build B, a **benefit score** is the sum over the build's abilities of:

`weight(ability) x marginal_gain(ability, S)`

- `marginal_gain` comes straight from `forecastAbility` with the candidate applied (the real function, so caps, Efficiency floors and formulas are respected). A capped number contributes 0 and the reason is kept ("Eclipse damage reduction is already at its 90% cap").
- Only **meaningful** numbers count: damage, healing, Overguard, duration of buffs/CC, radius, number of enemies hit. Each parameter gets a kind (damage, defence, utility, cost) so a cosmetic number (angle) never scores.
- `weight(ability)` encodes intent, not capability. It rises when: the ability is on the primary build's bar and not Helminth filler; mods, shards, arcanes and augments invest in it (investment is **evidence**, not proof: a stat already past a breakpoint or cap earns weight 0 for more of it); the doctrine/identity/archetype fits it. A Warframe merely *having* crowd control does not give CC weight.
- Breakpoints and uptime are modelled where the data allows (duration vs recast time gives an uptime fraction; range vs a fixed target radius; Strength vs a damage-reduction or heal cap). Where it cannot be modelled, the rank carries a **confidence** (high/medium/low) and says what is missing, rather than guessing.
- Energy Max score: until a sustain model exists, it is ranked from an explicit, visible rule (does the build run Arcane Battery/Energy Conversion-style energy dependence, is Efficiency below 100%, do costs per cast exceed pool/N) and always shown with low confidence.
- The output explains itself: "Ideal: Strength. Eclipse +2,000-point damage bonus, Mirage's other abilities scale too. Range wins nothing: no ability has a range number you invest in."

## Feedback workflow

Gu proposes its #1.

- **Yes:** stored as a confirmed ideal; optionally review 2nd to 4th. Confirmed rankings are kept separately from automated ones and never overwritten by a recompute.
- **No:** store "rejected for first place" only (it may still rank 2nd). Re-rank the rest and propose the next. The player can add a reason (free text plus optional tags such as `intent: crowd control not wanted`, `already capped`, `cast too rarely`, `helminth filler`, `other`).
- Feedback is structured and kept as history. It can nudge weights (for example, a repeated "ignore Helminth ability" reason lowers Helminth weight) through plain, visible rules. It is a **feedback history and a rules engine**; it is not described as a trained model.

## Storage (proposed, nothing created)

All in `wf_user`, owner-only like the rest.

- `invigoration_ranking` — `my_frame_id`, `stat` (strength / duration / range / energy_max), `rank` (1-4), `source` (`confirmed` | `automated`), `score`, `confidence`, `explanation` (jsonb), `computed_at`; unique on `(my_frame_id, stat, source)`.
- `invigoration_feedback` — `feedback_id`, `my_frame_id`, `stat`, `verdict` (`yes` | `no` | `reorder`), `position_proposed`, `reason_tags` (text[]), `reason_text`, `build_snapshot` (jsonb: stats and loadout at that time so the feedback keeps its context), `created_at`.
- `invigoration_weeks` — one row per ISO week (Monday UTC): `week_start`, `offers` (jsonb: three entries of warframe, offense buff, utility buff).
- `invigoration_applied` — `week_start`, `my_frame_id`, `buff`, `applied_at`, `via_override` (bool). The Override counter is **derived** from this table (count since the last `via_override`), so it cannot drift.
- Migration file in `DB/Migrations/` for Patrick to run; Claude does not write to the DB.

## UI (proposed)

1. **Invigoration page** (new tab or a section of Codex): one row per Warframe showing its confirmed ideal (or the proposal with Yes / No), the 4-way ranking on expand, confidence and reasons, and a note field.
2. **This week:** enter the three offered Warframes and their buffs (Gu cannot read the game), tick which you applied. Highlights offers that hit a Warframe's #1 or #2.
3. **Override tracker:** "6 of 10 applied". At 10: "Override ready". On that week, for each big-4 buff currently on offer, lists which of your Warframes gains most and the actual before/after numbers from the forecaster, best first.
4. Eligibility: Energy Max never suggested for Hildryn or Lavos.

## Build order

1. Get the primary builds' Warframe mods in (Patrick). Without them scores are meaningless; the engine should refuse and say "no Warframe mods entered" instead of ranking.
2. Finish ability data gaps (622 unscaled parameters, about 11 missing abilities, augments pass).
3. Add the parameter-kind classification and an Energy sustain model.
4. Scoring engine as pure `utils/` code with tests (hand-built Mirage, Frost, Ember examples).
5. Migration, store, page, feedback UI.
6. Weekly log and Override tracker (independent of 1 to 5; can ship first since it needs no build data).

## Open questions

- Is the Override week tracker wanted first, since it needs no scoring? (Recommended: yes.)
- Which builds are "primary" once several builds per Warframe exist: a flag on the build, or the first one?
- Energy Max: acceptable to ship with low-confidence rules until a sustain model exists?
