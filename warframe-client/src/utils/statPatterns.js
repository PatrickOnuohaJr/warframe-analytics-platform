// Generic "does this effect-text line match one of these known stat
// labels" matcher -- shared by survivability.js (Warframe stats) and
// weaponStats.js (weapon stats) so both regex-matching loops stay in sync
// instead of two copies slowly drifting apart.
export function parseStat(text, patterns) {
  for (const { key, re } of patterns) {
    const match = re.exec(text);
    if (match) return { key, value: Number(match[1]) };
  }
  return null;
}
