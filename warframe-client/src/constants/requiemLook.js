import { OULL } from '../utils/requiemEngine';
import { COLOR } from './theme';

// Each Requiem gets its own colour and a distinct glyph so mods are told apart
// at a glance (the game's own icons are not bundled). The name always sits
// beside or under it, so colour is never the only cue.
export const LOOK = {
  Lohk:  { color: '#4A90D9', glyph: 'M12 3 L21 12 L12 21 L3 12 Z' },
  Xata:  { color: '#E08A3C', glyph: 'M4 4 H20 V20 H4 Z M9 9 H15 V15 H9 Z' },
  Jahu:  { color: '#4CAF50', glyph: 'M12 3 L21 19 H3 Z' },
  Vome:  { color: '#9B59B6', glyph: 'M3 7 H21 L12 21 Z' },
  Ris:   { color: '#D63A3A', glyph: 'M12 3 L14.5 9.5 L21 12 L14.5 14.5 L12 21 L9.5 14.5 L3 12 L9.5 9.5 Z' },
  Fass:  { color: '#E8B84B', glyph: 'M12 3 A9 9 0 1 0 12 21 A9 9 0 1 0 12 3 M12 8 A4 4 0 1 1 12 16 A4 4 0 1 1 12 8' },
  Netra: { color: '#2EC4B6', glyph: 'M4 12 L12 4 L20 12 L12 20 Z M12 8 L16 12 L12 16 L8 12 Z' },
  Khra:  { color: '#F472B6', glyph: 'M6 3 H18 L21 12 L18 21 H6 L3 12 Z' },
  [OULL]: { color: COLOR.gold, glyph: 'M12 2 L14.5 9 L22 9.5 L16 14 L18 21.5 L12 17.5 L6 21.5 L8 14 L2 9.5 L9.5 9 Z' },
};

export const requiemColor = mod => LOOK[mod]?.color ?? COLOR.mutedInk;
