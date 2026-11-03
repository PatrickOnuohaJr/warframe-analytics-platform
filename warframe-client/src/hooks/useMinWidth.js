import { useEffect, useState } from 'react';

// True while the window is at least `px` wide. Used where a page needs a
// different arrangement of the SAME components on big screens (CSS alone can
// only reorder, not regroup, columns). Renders as false where matchMedia does
// not exist (tests), so the narrow layout is the default.
export default function useMinWidth(px) {
  const query = `(min-width: ${px}px)`;
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches,
  );

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const mql = window.matchMedia(query);
    const onChange = e => setMatches(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
