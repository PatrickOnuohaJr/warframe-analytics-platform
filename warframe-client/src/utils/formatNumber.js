// Number text with thousands commas (1,500 / 41,400 / 1,000,000), keeping any
// decimals as given (up to 2). Returns "—" for null/undefined/NaN so callers
// need no separate empty check. Used wherever the loadout screen shows a stat.
export function formatNumber(value) {
  const n = Number(value);
  if (value == null || value === '' || !Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}
