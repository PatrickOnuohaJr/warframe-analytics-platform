export const SHARD_BONUSES = {
  crimson: [
    { base: '+25% Melee Critical Damage', tau: '+37.5% Melee Critical Damage' },
    { base: '+25% Primary Status Chance', tau: '+37.5% Primary Status Chance' },
    { base: '+25% Secondary Critical Chance', tau: '+37.5% Secondary Critical Chance' },
    { base: '+10% Ability Strength', tau: '+15% Ability Strength' },
    { base: '+10% Ability Duration', tau: '+15% Ability Duration' },
  ],

  amber: [
    { base: '+30% Maximum Energy is filled on Spawn', tau: '+45% Maximum Energy is filled on Spawn' },
    { base: '+100% Effectiveness on Health Orbs', tau: '+150% Effectiveness on Health Orbs' },
    { base: '+50% Effectiveness on Energy Orbs', tau: '+75% Effectiveness on Energy Orbs' },
    { base: '+25% Casting Speed', tau: '+37.5% Casting Speed' },
    { base: '+15% Parkour Velocity', tau: '+22.5% Parkour Velocity' },
  ],

  azure: [
    { base: '+150 Health', tau: '+225 Health' },
    { base: '+150 Shield Capacity', tau: '+225 Shield Capacity' },
    { base: '+50 Energy Max', tau: '+75 Energy Max' },
    { base: '+150 Armor', tau: '+225 Armor' },
    { base: '+5 Health/s Regenerated', tau: '+7.5 Health/s Regenerated' },
  ],

  emerald: [
    { base: '+30% Toxin Status Damage', tau: '+45% Toxin Status Damage' },
    { base: '+2 Health on Toxin Status Damage', tau: '+3 Health on Toxin Status Damage' },
    { base: '+10% Ability Damage on Corroded Enemies', tau: '+15% Ability Damage on Corroded Enemies' },
    { base: '+2 Max Corrosion Status Stacks', tau: '+3 Max Corrosion Status Stacks' },
  ],

  topaz: [
    { base: '+1% Secondary Critical Chance on Heat Kill', tau: '+1.5% Secondary Critical Chance on Heat Kill' },
    { base: '+10% Ability Damage on Radiation Status', tau: '+15% Ability Damage on Radiation Status' },
    { base: '+1 Health per Enemy Killed with Blast Damage, Max 300 Health', tau: '+2 Health per Enemy Killed with Blast Damage, Max 450 Health' },
    { base: '+5 Shields when Killing Enemy with Blast Damage', tau: '+7.5 Shields when Killing Enemy with Blast Damage' },
  ],

  violet: [
    { base: '+30% Primary Electricity Damage', tau: '+45% Primary Electricity Damage' },
    { base: '+25% Melee Critical Damage over 500 Energy', tau: '+37.5% Melee Critical Damage over 500 Energy' },
    { base: '+20% Health/Energy Pickup Conversion', tau: '+30% Health/Energy Pickup Conversion' },
    { base: '+10% Ability Damage on Electricity Status', tau: '+15% Ability Damage on Electricity Status' },
  ],
}

export function getTauBonusText(bonusText) {
  for (const bonuses of Object.values(SHARD_BONUSES)) {
    const match = bonuses.find(bonus => bonus.base === bonusText)
    if (match) return match.tau
  }

  return bonusText
}