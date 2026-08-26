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

// True when a slot's polarity earns the half-cost discount for this mod
// -- shared so the UI's "discounted" styling can't drift from the math.
//
// 'omni' is the universal polarity from Omni Forma (Update 38.5, the
// reworked Aura Forma). It matches every polarity EXCEPT Umbra: Umbral
// mods still need a real Umbra slot (Umbra Forma) to get their discount.
// Confirmed by Patrick against the live game -- a wiki summary claimed
// Umbral mods in an Omni slot avoid the mismatch penalty, which is wrong.
export function isDiscounted(mod, slotPolarity) {
  if (!slotPolarity || !mod?.polarity) return false;
  if (slotPolarity === 'omni') return mod.polarity !== 'umbra';
  return mod.polarity === slotPolarity;
}

// Polarity match halves the cost (rounded up), same as in-game.
export function effectiveDrain(mod, rank, slotPolarity) {
  const cost = drainAtRank(mod?.base_drain, rank);
  return isDiscounted(mod, slotPolarity) ? Math.ceil(cost / 2) : cost;
}

// Base capacity is 30 at rank 30, 60 with an Orokin Catalyst/Reactor
// installed, plus up to +30 more from Mastery Rank (capped at MR 30).
export function pieceCapacity({ hasCatalyst, masteryRank }) {
  const base = hasCatalyst ? 60 : 30;
  const bonus = Math.min(masteryRank ?? 0, MAX_MASTERY_BONUS);
  return base + bonus;
}
