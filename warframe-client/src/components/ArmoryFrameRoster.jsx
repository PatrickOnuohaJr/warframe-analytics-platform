import { useMemo, useState } from 'react';
import { COLOR } from '../constants/theme';
import { getReadableColor } from '../utils/color';

const SLOTS = [
  { key: 'primary', column: 'primary_weapon', label: 'Primary' },
  { key: 'secondary', column: 'secondary_weapon', label: 'Secondary' },
  { key: 'melee', column: 'melee_weapon', label: 'Melee' },
];

// Everything a search can match on one build, lowercased once per render.
function searchText(frame) {
  return [
    frame.display_name,
    frame.warframe_name,
    frame.build_title,
    frame.cultivation_school,
    frame.primary_weapon,
    frame.secondary_weapon,
    frame.melee_weapon,
  ].filter(Boolean).join(' ').toLowerCase();
}

// Drop-target roster for Armory's drag/drop reassignment. Each build is a
// full card (frame name, build title, school) with three full-width weapon
// slots, so you can tell which build is which and read the whole weapon name
// without hovering. A search box narrows by frame, build title, school or
// weapon -- typing "ignis" lists every build carrying one.
export default function ArmoryFrameRoster({ frames, draggedWeapon, onDropWeapon, onPickSlot }) {
  const [query, setQuery] = useState('');

  const visibleFrames = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return frames;
    return frames.filter(f => searchText(f).includes(q));
  }, [frames, query]);

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search builds by frame, title, school or weapon..."
        className="w-full rounded-lg px-3 py-2 text-sm mb-3 outline-none"
        style={{ background: COLOR.surface1, border: `1px solid ${COLOR.border}`, color: COLOR.ink }}
      />
      <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: COLOR.agedInk }}>
        {visibleFrames.length} of {frames.length} builds
      </p>

      {visibleFrames.length === 0 && (
        <p className="text-sm" style={{ color: COLOR.mutedInk }}>No builds match "{query}".</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-3 items-start">
        {visibleFrames.map(frame => {
          const color = getReadableColor(frame.cultivation_color ?? COLOR.gold);

          return (
            <div
              key={frame.my_frame_id}
              className="rounded-xl p-3"
              style={{
                background: COLOR.surface1,
                border: `1px solid ${COLOR.border}`,
                borderLeft: `4px solid ${color}`,
              }}
            >
              <div className="mb-2">
                <p className="text-base font-bold leading-tight" style={{ color }}>
                  {frame.display_name || frame.warframe_name}
                </p>
                <p className="text-xs" style={{ color: COLOR.mutedInk }}>
                  {[frame.build_title, frame.cultivation_school].filter(Boolean).join(' · ') || 'Untitled build'}
                </p>
              </div>

              <div className="space-y-1.5">
                {SLOTS.map(slot => {
                  const isCompatible = draggedWeapon && draggedWeapon.category.toLowerCase() === slot.key;
                  const current = frame[slot.column];

                  return (
                    <div
                      key={slot.key}
                      role="button"
                      tabIndex={0}
                      onClick={() => onPickSlot(frame, slot)}
                      onKeyDown={e => { if (e.key === 'Enter') onPickSlot(frame, slot); }}
                      onDragOver={e => { if (isCompatible) e.preventDefault(); }}
                      onDrop={e => {
                        e.preventDefault();
                        if (!isCompatible) return;
                        onDropWeapon(frame.my_frame_id, slot.column, draggedWeapon.name);
                      }}
                      className="flex items-baseline gap-3 rounded-md px-3 py-2 transition-colors cursor-pointer"
                      style={{
                        background: isCompatible ? `${COLOR.gold}18` : COLOR.surface2,
                        border: `1px dashed ${isCompatible ? COLOR.gold : COLOR.border}`,
                      }}
                    >
                      <span
                        className="text-[10px] uppercase tracking-widest w-16 shrink-0"
                        style={{ color: COLOR.agedInk }}
                      >
                        {slot.label}
                      </span>
                      <span className="text-sm break-words" style={{ color: current ? COLOR.ink : COLOR.agedInk }}>
                        {current || 'Empty'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
