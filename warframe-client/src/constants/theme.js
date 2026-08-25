// Shared surface/text tokens. Two-tier surface system already existed
// ad-hoc across the app (darker cards vs lighter inputs/nav) — this just
// names it so components stop redeclaring the same hex values.
export const COLOR = {
  page: '#2F2A23',
  surface1: '#3A342C', // cards, panels, modal bodies
  surface2: '#4A443B', // inputs, nav chrome, selects
  border: '#6F6A62',
  ink: '#E8E4DC',
  mutedInk: '#B8B3AC',
  agedInk: '#9C9890',
  gold: '#FBBF24',
  danger: '#E63946',
  success: '#4CAF50',
  info: '#60A5FA',
}
