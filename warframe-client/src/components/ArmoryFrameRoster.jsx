import { COLOR } from '../constants/theme';
import { getReadableColor } from '../utils/color';

const SLOTS = [
  { key: 'primary', column: 'primary_weapon', label: 'P' },
  { key: 'secondary', column: 'secondary_weapon', label: 'S' },
  { key: 'melee', column: 'melee_weapon', label: 'M' },
];

// Drop-target roster for Armory's drag/drop reassignment. Kept separate
// from ArmoryPage since it's a distinct concern (rendering + drop-zone
// logic for 60 frames) with its own visual language (compact rows, not
// the card grid the rest of the app uses).
export default function ArmoryFrameRoster({ frames, draggedWeapon, onDropWeapon }) {
  return (
    <div className="space-y-1.5">
      {frames.map(frame => {
        const color = getReadableColor(frame.cultivation_color ?? COLOR.gold);

        return (
          <div
            key={frame.my_frame_id}
            className="flex items-center gap-3 rounded-lg px-3 py-2"
            style={{ background: COLOR.surface1, border: `1px solid ${COLOR.border}` }}
          >
            <span className="text-sm flex-1 truncate" style={{ color }}>
              {frame.display_name || frame.warframe_name}
            </span>

            {SLOTS.map(slot => {
              const isCompatible = draggedWeapon && draggedWeapon.category.toLowerCase() === slot.key;
              const current = frame[slot.column];

              return (
                <div
                  key={slot.key}
                  onDragOver={e => { if (isCompatible) e.preventDefault(); }}
                  onDrop={e => {
                    e.preventDefault();
                    if (!isCompatible) return;
                    onDropWeapon(frame.my_frame_id, slot.column, draggedWeapon.name);
                  }}
                  title={current || 'Empty'}
                  className="w-24 shrink-0 rounded-md px-2 py-1 text-[10px] truncate text-center transition-colors"
                  style={{
                    background: isCompatible ? `${COLOR.gold}18` : COLOR.surface2,
                    border: `1px dashed ${isCompatible ? COLOR.gold : COLOR.border}`,
                    color: current ? COLOR.ink : COLOR.agedInk,
                  }}
                >
                  {current || `${slot.label} —`}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
