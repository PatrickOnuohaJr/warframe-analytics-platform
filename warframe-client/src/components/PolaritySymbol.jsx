import madurai from '../assets/polarities/madurai.svg?raw';
import vazarin from '../assets/polarities/vazarin.svg?raw';
import naramon from '../assets/polarities/naramon.svg?raw';
import zenurik from '../assets/polarities/zenurik.svg?raw';
import unairu from '../assets/polarities/unairu.svg?raw';
import penjaga from '../assets/polarities/penjaga.svg?raw';
import umbra from '../assets/polarities/umbra.svg?raw';

// Official polarity icons pulled directly from the Warframe wiki (each
// mod's polarity is a specific glyph in-game, not a color -- text names
// like "madurai" don't mean anything to someone who hasn't memorized
// them). Downloaded locally rather than hotlinked so the app doesn't
// depend on the wiki staying up.
//
// Each source SVG hardcodes fill:#000000 (meant for a light background);
// recolorToCurrentColor swaps that for currentColor so it can be themed
// via CSS `color`, and also sets fill="currentColor" on the root <svg> as
// a fallback for paths with no explicit fill (umbra.svg has none).
function recolorToCurrentColor(svgText) {
  return svgText
    .replace(/<svg /, '<svg fill="currentColor" ')
    .replace(/fill:#000000/g, 'fill:currentColor')
    .replace(/stroke:#000000/g, 'stroke:currentColor');
}

const ICONS = {
  madurai: recolorToCurrentColor(madurai),
  vazarin: recolorToCurrentColor(vazarin),
  naramon: recolorToCurrentColor(naramon),
  zenurik: recolorToCurrentColor(zenurik),
  unairu: recolorToCurrentColor(unairu),
  penjaga: recolorToCurrentColor(penjaga),
  umbra: recolorToCurrentColor(umbra),
};

export const POLARITIES = ['madurai', 'vazarin', 'naramon', 'zenurik', 'unairu', 'umbra', 'penjaga'];

// size in px, color as any CSS color (defaults to inheriting text color)
export default function PolaritySymbol({ polarity, size = 16, color, className = '' }) {
  const icon = polarity && ICONS[polarity];

  if (!icon) {
    return (
      <span
        className={className}
        style={{ display: 'inline-block', width: size, height: size, color: color ?? 'currentColor', opacity: 0.35 }}
        aria-label="No polarity"
      >
        —
      </span>
    );
  }

  return (
    <span
      className={className}
      style={{ display: 'inline-block', width: size, height: size, color: color ?? 'currentColor', lineHeight: 0 }}
      dangerouslySetInnerHTML={{ __html: icon }}
      aria-label={polarity}
      title={polarity}
    />
  );
}
