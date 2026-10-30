import { useState } from 'react';
import { COLOR } from '../../constants/theme';
import { LOOK } from '../../constants/requiemLook';

// Large, recognisable tile for one Requiem (or Oull). `size` is the tile width in px.
// Uses the game's own white symbol (public/requiem/<Name>.png) on a tile tinted
// with the mod's colour; if the picture is missing it falls back to a drawn shape.
export default function RequiemIcon({ mod, size = 44 }) {
  const [broken, setBroken] = useState(false);
  const look = LOOK[mod];
  if (!look) {
    return (
      <span
        aria-hidden="true"
        className="inline-flex items-center justify-center rounded-lg font-bold"
        style={{ width: size, height: size, border: `1px dashed ${COLOR.border}`, color: COLOR.agedInk }}
      >
        ?
      </span>
    );
  }
  const tile = { width: size, height: size, background: `${look.color}33`, border: `1px solid ${look.color}88` };
  if (!broken) {
    return (
      <img
        src={`${import.meta.env.BASE_URL}requiem/${mod}.png`}
        alt={mod}
        width={size}
        height={size}
        loading="lazy"
        onError={() => setBroken(true)}
        className="shrink-0 rounded-lg object-contain p-0.5"
        style={tile}
      />
    );
  }
  return (
    <svg role="img" aria-label={mod} viewBox="0 0 24 24" width={size} height={size} className="shrink-0 rounded-lg" style={tile}>
      <path d={look.glyph} fill={look.color} fillRule="evenodd" opacity="0.9" transform="translate(3 3) scale(0.75)" />
    </svg>
  );
}
