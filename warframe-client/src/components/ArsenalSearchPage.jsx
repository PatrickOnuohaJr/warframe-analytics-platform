import { useState, useEffect, useMemo } from 'react';
import { wfUser } from '../lib/supabase';
import Panel from './ui/Panel';
import WeaponStatSearchTab from './WeaponStatSearchTab';

// ============================================================================
// ArsenalSearchPage.jsx
// ============================================================================
// WHAT THIS IS (Shipment A, item A1 — Global Arsenal Search):
// A single search bar that answers questions like "where is Arcane X used"
// or "who's running this weapon" across your ENTIRE arsenal — every build,
// every slot — not just the one you happen to have open. This is why it's
// its own page rather than a BuildDetailOverlay tab: BuildDetailOverlay is
// scoped to ONE frame, this is deliberately scoped to ALL of them.
//
// HOW IT WORKS:
// my_frames already stores weapon/arcane names as plain text columns
// (primary_weapon, secondary_weapon, melee_weapon, arcane_1, arcane_2,
// primary_arcane, secondary_arcane, melee_arcane) — there's no separate
// junction/lookup table for "what's equipped where." So this page just
// fetches every row of my_frames once, and does the matching client-side
// as you type. At ~57 frames this is trivially fast and avoids a network
// round-trip per keystroke. If your frame count ever grows dramatically
// (unlikely for a personal build tracker), revisit this and move the
// filtering server-side — but for now, client-side is the right call.
//
// SCOPE NOTE:
// Frames + Weapons + Arcanes only, per Aug 2026 scoping decision.
// Companions (pets/sentinels) aren't tracked in Cephalon Gu at all yet —
// when that system gets built, companion arcanes/mods would extend this
// search, but there's nothing to search today.
//
// arcane_1 / arcane_2 = Warframe arcanes (Core Four Arcane Filtering).
// primary_arcane / secondary_arcane / melee_arcane = weapon arcanes.
// Both sets are actively used (not legacy) — confirmed Aug 2026.
// ============================================================================

const GOLD = '#FBBF24';
const PANEL_BG = '#4A443B';
const BORDER = '#6F6A62';
const MUTED = '#B8B3AC';

// Maps each searchable column to a human-readable slot label, used when
// rendering "matched in: X" under each result. Keeping this as a single
// source of truth means adding a new searchable column later (e.g. once
// Companions ship) is a one-line addition here, not a scattered change.
const SEARCHABLE_FIELDS = [
  { column: 'build_title', label: 'Build Title' },
  { column: 'display_name', label: 'Warframe' },
  { column: 'primary_weapon', label: 'Primary Weapon' },
  { column: 'secondary_weapon', label: 'Secondary Weapon' },
  { column: 'melee_weapon', label: 'Melee Weapon' },
  { column: 'arcane_1', label: 'Warframe Arcane 1' },
  { column: 'arcane_2', label: 'Warframe Arcane 2' },
  { column: 'primary_arcane', label: 'Primary Arcane' },
  { column: 'secondary_arcane', label: 'Secondary Arcane' },
  { column: 'melee_arcane', label: 'Melee Arcane' },
];

export default function ArsenalSearchPage({ onBack, onOpenFrame }) {
  const [mode, setMode] = useState('builds'); // 'builds' | 'stats'
  const [query, setQuery] = useState('');
  const [frames, setFrames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch every build once on mount. Self-contained rather than requiring
  // the parent to pass frames down — same pattern as WarframeSelector and
  // TestingLogTab, keeps this page droppable anywhere in the nav without
  // needing App.jsx to thread frames through as a prop.
  useEffect(() => {
    let cancelled = false;

    async function loadFrames() {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await wfUser
        .from('my_frames')
        .select('my_frame_id, build_title, display_name, primary_weapon, secondary_weapon, melee_weapon, arcane_1, arcane_2, primary_arcane, secondary_arcane, melee_arcane')
        .order('display_name', { ascending: true });

      if (cancelled) return;

      if (fetchError) {
        console.error('Failed to load frames for arsenal search:', fetchError);
        setError('Could not load your arsenal.');
        setLoading(false);
        return;
      }

      setFrames(data || []);
      setLoading(false);
    }

    loadFrames();
    return () => { cancelled = true; };
  }, []);

  // The actual search. useMemo so this only recomputes when query or
  // frames change, not on every render.
  //
  // For each frame, checks every searchable column for a case-insensitive
  // substring match. A frame can match on MULTIPLE fields at once (e.g.
  // searching "Prime" will match tons of things) — each match is recorded
  // separately so the UI can show exactly which slot(s) matched, not just
  // "this frame matched somewhere."
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const matches = [];

    for (const frame of frames) {
      const matchedFields = [];

      for (const { column, label } of SEARCHABLE_FIELDS) {
        const value = frame[column];
        if (value && value.toLowerCase().includes(q)) {
          matchedFields.push({ label, value });
        }
      }

      if (matchedFields.length > 0) {
        matches.push({ frame, matchedFields });
      }
    }

    return matches;
  }, [query, frames]);

  return (
    <div>
      <div className={mode === 'stats' ? 'max-w-6xl mx-auto' : 'max-w-3xl mx-auto'}>
        <button
          onClick={onBack}
          className="text-xs uppercase tracking-widest mb-6"
          style={{ color: MUTED }}
        >
          ← Return to Codex
        </button>

        <h1 className="text-2xl font-bold uppercase tracking-wide mb-2" style={{ color: GOLD }}>
          {mode === 'builds' ? 'Global Arsenal Search' : 'Weapon Stat Threshold Search'}
        </h1>
        <p className="text-sm mb-6" style={{ color: MUTED }}>
          {mode === 'builds'
            ? 'Search across every build\'s weapons and arcanes. "Where is X used?" answered instantly.'
            : 'Filter the full weapon catalog by minimum stat thresholds — riven-shopping precision, before it\'s even in a loadout.'}
        </p>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMode('builds')}
            className="rounded-xl px-4 py-2 text-[10px] uppercase font-bold tracking-[0.25em] transition-colors"
            style={{
              background: mode === 'builds' ? `${GOLD}18` : PANEL_BG,
              border: `1px solid ${mode === 'builds' ? `${GOLD}55` : BORDER}`,
              color: mode === 'builds' ? GOLD : MUTED,
            }}
          >
            Find In My Builds
          </button>
          <button
            onClick={() => setMode('stats')}
            className="rounded-xl px-4 py-2 text-[10px] uppercase font-bold tracking-[0.25em] transition-colors"
            style={{
              background: mode === 'stats' ? `${GOLD}18` : PANEL_BG,
              border: `1px solid ${mode === 'stats' ? `${GOLD}55` : BORDER}`,
              color: mode === 'stats' ? GOLD : MUTED,
            }}
          >
            Weapon Stats
          </button>
        </div>

        {mode === 'stats' ? (
          <WeaponStatSearchTab />
        ) : (
          <>
            <input
              type="text"
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="e.g. Molt Augmented, Vadarya Prime, Caliban..."
              className="w-full rounded-lg border px-4 py-3 text-base outline-none mb-6"
              style={{ backgroundColor: PANEL_BG, border: `1px solid ${BORDER}`, color: '#F5F0E8' }}
            />

            {loading && <p style={{ color: MUTED }}>Loading arsenal...</p>}
            {error && <p className="text-red-400">{error}</p>}

            {!loading && !error && query.trim() && (
              <p className="text-xs uppercase tracking-widest mb-4" style={{ color: MUTED }}>
                {results.length} {results.length === 1 ? 'match' : 'matches'}
              </p>
            )}

            {!loading && !error && query.trim() && results.length === 0 && (
              <p style={{ color: MUTED }}>No matches found.</p>
            )}

            <div className="space-y-3">
              {results.map(({ frame, matchedFields }) => (
                <Panel
                  key={frame.my_frame_id}
                  interactive
                  accent={GOLD}
                  onClick={() => onOpenFrame?.(frame.my_frame_id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold" style={{ color: GOLD }}>
                      {frame.display_name || '(Unnamed Warframe)'}
                    </span>
                    <span className="text-xs" style={{ color: MUTED }}>
                      {frame.build_title}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {matchedFields.map(({ label, value }) => (
                      <span
                        key={label}
                        className="text-xs px-2 py-1 rounded"
                        style={{ backgroundColor: `${GOLD}22`, color: GOLD }}
                      >
                        {label}: {value}
                      </span>
                    ))}
                  </div>
                </Panel>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}