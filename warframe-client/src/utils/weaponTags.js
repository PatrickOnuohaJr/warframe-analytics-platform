// Auto-derived personality tags for Armory. Rules-based, not hand-authored —
// computed from stats already present in wf_base.weapons.raw_json (same
// source WeaponStatSearchTab reads). Thresholds are heuristic judgment
// calls based on the actual spread of live weapon data, not official
// game-defined tiers — adjust here if a threshold reads wrong in practice.
// A weapon can carry multiple tags; they're not mutually exclusive.

const GUN_RULES = [
  { tag: 'Crit-Focused', test: rj => rj.criticalChance >= 0.25 },
  { tag: 'Status-Focused', test: rj => rj.procChance >= 0.25 },
  { tag: 'Multishot', test: rj => rj.multishot >= 2 },
  { tag: 'Rapid-Fire', test: rj => rj.fireRate >= 8 },
  { tag: 'Slow-Firing', test: rj => rj.fireRate > 0 && rj.fireRate <= 2 },
  { tag: 'High-Capacity', test: rj => rj.magazineSize >= 40 },
  { tag: 'Low-Capacity', test: rj => rj.magazineSize > 0 && rj.magazineSize <= 6 },
];

const MELEE_RULES = [
  { tag: 'Crit-Focused', test: rj => rj.criticalChance >= 0.25 },
  { tag: 'Status-Focused', test: rj => rj.procChance >= 0.25 },
  { tag: 'Long Reach', test: rj => rj.range >= 2.5 },
  { tag: 'Fast Attacker', test: rj => rj.fireRate >= 1.0 },
  { tag: 'Heavy Hitter', test: rj => rj.heavyAttackDamage >= 500 },
];

export function getWeaponTags(weapon) {
  const rj = weapon?.raw_json;
  if (!rj) return [];

  const rules = weapon.category === 'Melee' ? MELEE_RULES : GUN_RULES;

  return rules
    .filter(rule => {
      try {
        return rule.test(rj);
      } catch {
        return false;
      }
    })
    .map(rule => rule.tag);
}
