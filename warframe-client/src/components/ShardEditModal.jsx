import ShardsTab from './ShardsTab'
import { getReadableColor } from '../utils/color'
import ModalShell from './ui/ModalShell'

// Archon Shards editor only -- Arsenal (weapon/Arcane) editing moved into
// the Loadout tab's per-equipment panels (see LoadoutEquipmentSection.jsx),
// so this modal no longer needs its own tab bar.
export default function ShardEditModal({
  frame,
  frames,
  onClose,
  onSaved,
}) {
  const color = getReadableColor(frame.cultivation_color ?? '#FBBF24')

  return (
    <ModalShell onClose={onClose} accent={color}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p
              className="text-[10px] uppercase tracking-widest mb-0.5 font-bold"
              style={{ color }}
            >
              Editing Archon Shards
            </p>

            <h2 className="text-[#E8E4DC] font-semibold text-lg">
              {frame.display_name || frame.warframe_name}
            </h2>

            {frame.cultivation_school && (
              <p className="text-[10px] text-[#9C9890] uppercase tracking-widest mt-1">
                {frame.cultivation_school}
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            className="text-[#9C9890] hover:text-[#E8E4DC] text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <ShardsTab
          frame={frame}
          frames={frames}
          color={color}
          onSaved={onSaved}
        />
    </ModalShell>
  )
}
