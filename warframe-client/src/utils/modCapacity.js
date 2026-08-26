// Warframe's real mod-capacity/drain rules, applied to our data.
// Informational only (per the loadout schema's own scope note) -- these
// numbers are computed and shown, nothing here blocks an over-budget
// loadout from being entered.

const MAX_MASTERY_BONUS = 30;

// Drain cost scales linearly with rank: baseDrain at rank 0, +baseDrain
// per rank after that. Matches every community reference for how mod
// costs scale (e.g. Corrosive Projection: -2, -4, -6, -8, -10, -12).
export function drainAtRank(baseDrain, rank) {
  return (baseDrain ?? 0) * ((rank ?? 0) + 1);
}

// Polarity match halves the cost (rounded up), same as in-game.
export function effectiveDrain(mod, rank, slotPolarity) {
  const cost = drainAtRank(mod?.base_drain, rank);
  if (slotPolarity && mod?.polarity === slotPolarity) {
    return Math.ceil(cost / 2);
  }
  return cost;
}

// Base capacity is 30 at rank 30, 60 with an Orokin Catalyst/Reactor
// installed, plus up to +30 more from Mastery Rank (capped at MR 30).
export function pieceCapacity({ hasCatalyst, masteryRank }) {
  const base = hasCatalyst ? 60 : 30;
  const bonus = Math.min(masteryRank ?? 0, MAX_MASTERY_BONUS);
  return base + bonus;
}
