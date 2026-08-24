import { useState, useEffect, useRef } from 'react';
import { wfUser } from '../lib/supabase';

const GOLD = '#FBBF24';
const PANEL_BG = '#4A443B';
const BORDER = '#6F6A62';
const MUTED = '#B8B3AC';

/**
 * WarframeSelector
 *
 * Click-to-edit searchable typeahead for selecting a Warframe identity
 * (base or Prime/variant). Displays as static text until clicked, then
 * becomes a search input with a live-filtered dropdown. Collapses back
 * to display mode after a selection or a click outside.
 *
 * Sources options live from wf_base.warframes — never cached/hardcoded, so
 * new Primes (like Styanax Prime, Voruna Prime) show up automatically once
 * seeded.
 *
 * On selection, calls onSelect({ warframe_id, name }) — the parent is
 * responsible for writing BOTH warframe_id and display_name together, so
 * the two fields can never drift apart again.
 *
 * Props:
 *   currentWarframeId - the my_frames.warframe_id currently set (for pre-fill)
 *   currentDisplayName - the my_frames.display_name currently set (for pre-fill)
 *   onSelect(fn) - called with { warframe_id, name } when user picks a frame
 */
export default function WarframeSelector({ currentWarframeId, currentDisplayName, onSelect }) {
  const [query, setQuery] = useState(currentDisplayName || '');
  const [allFrames, setAllFrames] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Load all 117 frames once on mount — live from wf_base, not cached
  useEffect(() => {
    let cancelled = false;

    async function loadFrames() {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await wfUser
        .schema('wf_base')
        .from('warframes')
        .select('warframe_id, name, is_prime')
        .order('name', { ascending: true });

      if (cancelled) return;

      if (fetchError) {
        console.error('Failed to load warframes:', fetchError);
        setError('Could not load Warframe list.');
        setLoading(false);
        return;
      }

      setAllFrames(data || []);
      setLoading(false);
    }

    loadFrames();
    return () => { cancelled = true; };
  }, []);

  // Filter as the user types
  useEffect(() => {
    if (!query.trim()) {
      setFiltered(allFrames.slice(0, 20)); // cap initial list, no need to render all 117
      return;
    }
    const q = query.toLowerCase();
    setFiltered(
      allFrames.filter((f) => f.name.toLowerCase().includes(q)).slice(0, 20)
    );
  }, [query, allFrames]);

  // Keep the field in sync if the selected frame changes from outside
  // (e.g. after a save round-trips through the parent)
  useEffect(() => {
    setQuery(currentDisplayName || '');
  }, [currentDisplayName]);

  // Close dropdown AND collapse back to display mode on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setIsEditing(false);
        setQuery(currentDisplayName || ''); // discard any unselected typed text
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [currentDisplayName]);

  function handlePick(frame) {
    setQuery(frame.name);
    setIsOpen(false);
    setIsEditing(false);
    onSelect({ warframe_id: frame.warframe_id, name: frame.name });
  }

  function handleEnterEditMode() {
    setIsEditing(true);
    setIsOpen(true);
    // Focus the input on the next tick, after it renders
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <label
        className="block text-xs uppercase tracking-wider mb-1"
        style={{ color: MUTED }}
      >
        Warframe
      </label>
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          placeholder="Search Warframe name..."
          className="w-full px-3 py-2 rounded outline-none"
          style={{
            backgroundColor: PANEL_BG,
            border: `1px solid ${GOLD}`,
            color: '#F5F0E8',
          }}
        />
      ) : (
        <div
          onClick={handleEnterEditMode}
          className="w-full px-3 py-2 rounded cursor-pointer"
          style={{
            backgroundColor: PANEL_BG,
            border: `1px solid ${BORDER}`,
            color: currentDisplayName ? '#F5F0E8' : MUTED,
          }}
        >
          {currentDisplayName || 'Click to set Warframe...'}
        </div>
      )}

      {isOpen && isEditing && (
        <div
          className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded shadow-lg"
          style={{ backgroundColor: PANEL_BG, border: `1px solid ${BORDER}` }}
        >
          {loading && (
            <div className="px-3 py-2 text-sm" style={{ color: MUTED }}>
              Loading Warframes...
            </div>
          )}

          {error && (
            <div className="px-3 py-2 text-sm text-red-400">{error}</div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="px-3 py-2 text-sm" style={{ color: MUTED }}>
              No matches.
            </div>
          )}

          {!loading &&
            !error &&
            filtered.map((frame) => (
              <div
                key={frame.warframe_id}
                onClick={() => handlePick(frame)}
                className="px-3 py-2 cursor-pointer hover:bg-black/20 flex items-center justify-between"
                style={{
                  color: frame.warframe_id === currentWarframeId ? GOLD : '#F5F0E8',
                }}
              >
                <span>{frame.name}</span>
                {frame.is_prime && (
                  <span className="text-xs" style={{ color: MUTED }}>
                    Prime
                  </span>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}