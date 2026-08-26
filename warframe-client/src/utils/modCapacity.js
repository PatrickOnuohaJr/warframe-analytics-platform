// Warframe's real mod-capacity/drain rules, applied to our data.
// Informational only (per the loadout schema's own scope note) -- these
// numbers are computed and shown, nothing here blocks an over-budget
// loadout from being entered.

// Drain magnitude grows by 1 per rank, in whichever direction baseDrain
// already points: a positive (cost) mod gets MORE expensive (Serration
// 4,5,6...14), a negative (aura refund) mod gets MORE negative (Steel
// Charge -4,-5,-6...-9; Corrosive Projection -2,-3,-4...-7). Confirmed
// against the wiki for both. A prior version of this file used
// `baseDrain + rank` unconditionally, which is right for positive
// mods but silently flips negative ones toward zero instead of away
// from it (Steel Charge at rank 5 came out to +1 instead of -9).
export function drainAtRank(baseDrain, rank) {
  const base = baseDrain ?? 0;
  const r = rank ?? 0;
  return base >= 0 ? base + r : base - r;
}

// True when a slot's polarity earns the discount for this mod -- shared
// so the UI's "discounted" styling can't drift from the math.
//
// Aura mods work backwards from every other mod: matching polarity
// DOUBLES their capacity bonus instead of halving cost (confirmed on
// the wiki's Aura page: "an Aura with a drain of 5 in a matching
// polarity slot generates an additional mod capacity of 10").
//
// 'omni' is the universal polarity from Omni Forma (Update 38.5, the
// reworked Aura Forma). It matches every polarity EXCEPT Umbra: Umbral
// mods still need a real Umbra slot (Umbra Forma) to get their discount.
// Confirmed by Patrick against the live game -- a wiki summary claimed
// Umbral mods in an Omni slot avoid the mismatch penalty, which is wrong.
export function isDiscounted(mod, slotPolarity, isAuraSlot = false) {
  if (!slotPolarity || !mod?.polarity) return false;
  if (isAuraSlot) return mod.polarity === slotPolarity || slotPolarity === 'omni';
  if (slotPolarity === 'omni') return mod.polarity !== 'umbra';
  return mod.polarity === slotPolarity;
}

// Regular mods: polarity match halves the cost (rounded up).
// Aura mods: no polarity set keeps the listed bonus; a match doubles it;
// a mismatch shrinks it to 80% (wiki's Aura page) -- opposite direction
// from regular mods, since aura "cost" is already negative (a refund).
export function effectiveDrain(mod, rank, slotPolarity, isAuraSlot = false) {
  const cost = drainAtRank(mod?.base_drain, rank);

  if (isAuraSlot) {
    if (!slotPolarity) return cost;
    if (mod?.polarity === slotPolarity || slotPolarity === 'omni') return cost * 2;
    return Math.trunc(cost * 0.8);
  }

  return isDiscounted(mod, slotPolarity) ? Math.ceil(cost / 2) : cost;
}

// Base capacity is 30 at rank 30, 60 with an Orokin Catalyst/Reactor
// installed (Reactor doubles it). Mastery Rank does NOT add capacity on
// top of that -- its only mod-capacity effect is a MINIMUM floor while
// an item is still leveling up from rank 0, so a low-MR player isn't
// stuck with near-zero capacity on a freshly-formaed piece. It has no
// effect once a piece is already at max rank, which every build tracked
// here is. Verified against Patrick's real Frost Prime: MR 30 + Reactor
// + maxed matched Steel Charge (drain -9, doubled to -18) = 60 - (-18)
// = 78, exactly his reported real-game ceiling for a single-aura frame.
export function pieceCapacity({ hasCatalyst }) {
  return hasCatalyst ? 60 : 30;
}
