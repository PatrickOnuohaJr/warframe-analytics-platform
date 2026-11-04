import { augmentParameters } from './augmentAbilityStats';

// Hand-checked max-rank numbers for abilities whose wf_base.ability_parameters
// rows are unusable as-is: they hold the wiki's "50 / 100 / 150 / 200 %" rank
// lists as unparsed text (no number to scale) or have stale base values.
// Each entry here is read straight off Patrick's in-game ability tooltips
// (Kullervo, rank 30, 155% Duration, 45% Efficiency, 190% Range, 216%
// Strength, 2026-11-04) and reproduces them exactly:
//   Wrathful Advance  Range 25 -> 47.5m, Melee Crit 200 -> 431%, Duration 10 -> 15.5s, Drain 25 -> 38.75
//   Recompense        Radius 8 -> 15.2m, Damage 500 -> 1,080, Health 325 -> 702,
//                     Health Drain 35 -> 75.6, Overguard Cap 10,000 -> 21,600, Drain 50 -> 77.5
//   Collective Curse  Range 25 -> 47.5m, Duration 25 -> 38.75s, Redirection 50 -> 100% (cap 100), Drain 75 -> 116.25
//   Warcry (Helminth) Duration 20 -> 31s, Armor 50 -> 108%, Attack Speed 30 -> 64.8%, Drain 75 -> 116.25
// Interim home: the long-term fix is loading these into wf_base through the
// static-data pipeline, at which point this file shrinks to nothing.
//
// `replace: true` swaps the ability's rows wholesale; otherwise rows replace
// the stored row with the same key and context and the rest are kept.
const row = (key, label, base_value, unit, scales_with, context = 'base') => (
  { parameter_key: key, label, base_value, unit, scales_with, context, sort_order: 0 }
);

const CARDS = {
  'Wrathful Advance': {
    replace: true,
    rows: [
      row('energy_cost', 'Energy Cost', 25, 'flat', 'efficiency'),
      row('range', 'Range (m)', 25, 'flat', 'range'),
      row('melee_crit_chance', 'Melee Critical Chance', 200, 'percent', 'strength'),
      row('duration', 'Duration (s)', 10, 'flat', 'duration'),
    ],
  },
  'Recompense': {
    replace: true,
    rows: [
      row('energy_cost', 'Energy Cost', 50, 'flat', 'efficiency'),
      row('range', 'Radius (m)', 8, 'flat', 'range'),
      row('daggers', 'Number of Daggers', 10, 'flat', 'none'),
      row('damage', 'Slash Damage per Dagger', 500, 'flat', 'strength'),
      row('health', 'Health / Overguard per Dagger', 325, 'flat', 'strength'),
      row('health_drain', 'Health / Overguard Drain per Miss', 35, 'flat', 'strength'),
      row('overguard_cap', 'Overguard Cap', 10000, 'flat', 'strength'),
    ],
  },
  'Collective Curse': {
    replace: true,
    rows: [
      row('energy_cost', 'Energy Cost', 75, 'flat', 'efficiency'),
      row('range', 'Range (m)', 25, 'flat', 'range'),
      row('duration', 'Duration (s)', 25, 'flat', 'duration'),
      row('damage_redirection', 'Damage Redirection', 50, 'percent', 'strength'),
      row('damage_redirection_cap', 'Damage Redirection cap', 100, 'percent', 'none'),
      row('angle', 'Angle (degrees)', 65, 'flat', 'none'),
    ],
  },
  // Only the Helminth (subsumed) numbers are checked; Valkyr's own Warcry keeps
  // its stored rows.
  'Warcry': {
    replace: false,
    rows: [
      row('duration', 'Duration (s)', 20, 'flat', 'duration', 'subsumed'),
      row('armor_buff', 'Armor Increase', 50, 'percent', 'strength', 'subsumed'),
      row('attack_speed_buff', 'Attack Speed', 30, 'percent', 'strength', 'subsumed'),
    ],
  },
};

// The parameter rows to compute an ability card or forecast from: stored rows
// with any checked overrides applied, plus rows from equipped augments.
export function abilityParameters(abilityName, canonicalParameters = [], equippedMods = []) {
  const card = CARDS[abilityName];
  let rows = canonicalParameters;
  if (card?.replace) {
    rows = card.rows;
  } else if (card) {
    const replaced = new Set(card.rows.map(r => `${r.parameter_key}|${r.context}`));
    rows = [...canonicalParameters.filter(p => !replaced.has(`${p.parameter_key}|${p.context}`)), ...card.rows];
  }
  return [...rows, ...augmentParameters(abilityName, equippedMods)];
}
