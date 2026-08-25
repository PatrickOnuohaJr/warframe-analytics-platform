import { useState } from 'react'
import TabButton from './TabButton'
import LoadoutTab from './LoadoutTab'
import ShardsTab from './ShardsTab'
import { getReadableColor } from '../utils/color'
import ModalShell from './ui/ModalShell'

export default function ShardEditModal({
  frame,
  frames,
  weapons = [],
  initialTab = 'loadout',
  onClose,
  onSaved,
}) {
  const color = getReadableColor(frame.cultivation_color ?? '#FBBF24')
  const [activeEditorTab, setActiveEditorTab] = useState(initialTab)

  return (
    <ModalShell onClose={onClose} accent={color}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p
              className="text-[10px] uppercase tracking-widest mb-0.5 font-bold"
              style={{ color }}
            >
              {activeEditorTab === 'loadout'
                ? 'Editing Arsenal'
                : 'Editing Archon Shards'}
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

        <div className="grid grid-cols-2 gap-2 mb-5">
          <TabButton
            active={activeEditorTab === 'loadout'}
            color={color}
            onClick={() => setActiveEditorTab('loadout')}
          >
            Arsenal
          </TabButton>

          <TabButton
            active={activeEditorTab === 'shards'}
            color={color}
            onClick={() => setActiveEditorTab('shards')}
          >
            Archon Shards
          </TabButton>
        </div>

        {activeEditorTab === 'loadout' && (
          <LoadoutTab
            frame={frame}
            frames={frames}
            weapons={weapons}
            color={color}
            onSaved={onSaved}
          />
        )}

        {activeEditorTab === 'shards' && (
          <ShardsTab
            frame={frame}
            frames={frames}
            color={color}
            onSaved={onSaved}
          />
        )}
    </ModalShell>
  )
}
