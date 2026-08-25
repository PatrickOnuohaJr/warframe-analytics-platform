import { useState } from 'react'
import { wfUser } from '../lib/supabase'
import { getReadableColor } from '../utils/color'
import ModalShell from './ui/ModalShell'
import Button from './ui/Button'

// Maps a weapon slot to its two my_frames columns (weapon name + Incarnon toggle).
const SLOT_FIELDS = {
  primary: { weapon: 'primary_weapon', incarnon: 'primary_is_incarnon', label: 'Primary' },
  secondary: { weapon: 'secondary_weapon', incarnon: 'secondary_is_incarnon', label: 'Secondary' },
  melee: { weapon: 'melee_weapon', incarnon: 'melee_is_incarnon', label: 'Melee' },
}

export default function CopyWeaponModal({
  frame,
  frames,
  sourceWeapons,
  onClose,
  onCopied,
}) {
  const color = getReadableColor(frame.cultivation_color ?? '#FBBF24')

  const [weaponSlot, setWeaponSlot] = useState('primary')
  const [includeIncarnon, setIncludeIncarnon] = useState(true)
  const [selectedSchool, setSelectedSchool] = useState('All Schools')
  const [selectEntireSchool, setSelectEntireSchool] = useState(false)
  const [selectedTargets, setSelectedTargets] = useState(new Set())
  const [saving, setSaving] = useState(false)

  const schools = [
    'All Schools',
    ...new Set(frames.map(f => f.cultivation_school).filter(Boolean).sort()),
  ]

  const filteredFrames = frames
    .filter(f => f.my_frame_id !== frame.my_frame_id)
    .filter(f =>
      selectedSchool === 'All Schools' ? true : f.cultivation_school === selectedSchool
    )

  const activeWeapon = sourceWeapons[weaponSlot]

  const targetIds = selectEntireSchool
    ? filteredFrames.map(f => f.my_frame_id)
    : [...selectedTargets]

  function toggleTarget(id) {
    setSelectedTargets(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function changeSchool(school) {
    setSelectedSchool(school)
    setSelectEntireSchool(false)
    setSelectedTargets(new Set())
  }

  async function copyWeapon() {
    if (!activeWeapon?.name) {
      alert(`This frame has no ${SLOT_FIELDS[weaponSlot].label} weapon to copy.`)
      return
    }

    if (targetIds.length === 0) {
      alert('Select at least one target frame, or check "Entire school".')
      return
    }

    setSaving(true)

    const fields = SLOT_FIELDS[weaponSlot]
    const payload = { [fields.weapon]: activeWeapon.name }
    if (includeIncarnon) payload[fields.incarnon] = activeWeapon.incarnon ?? false

    const { error } = await wfUser
      .from('my_frames')
      .update(payload)
      .in('my_frame_id', targetIds)

    setSaving(false)

    if (error) {
      console.error('Failed to copy weapon:', error)
      alert('Failed to copy weapon.')
      return
    }

    onCopied()
  }

  return (
    <ModalShell onClose={onClose} accent={color} zIndex={70}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest mb-0.5 font-bold" style={{ color }}>
              Copy Weapon
            </p>
            <h2 className="text-[#E8E4DC] font-semibold text-lg">
              {frame.display_name || frame.warframe_name}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="text-[#9C9890] hover:text-[#E8E4DC] text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <label className="block text-[9px] text-[#E8E4DC]/25 uppercase tracking-widest mb-1">
          Weapon Slot
        </label>
        <select
          value={weaponSlot}
          onChange={e => setWeaponSlot(e.target.value)}
          className="w-full mb-3 bg-[#4A443B] text-[#E8E4DC] text-sm rounded-lg px-3 py-2 border border-white/10"
        >
          <option value="primary">Primary — {sourceWeapons.primary.name || 'empty'}</option>
          <option value="secondary">Secondary — {sourceWeapons.secondary.name || 'empty'}</option>
          <option value="melee">Melee — {sourceWeapons.melee.name || 'empty'}</option>
        </select>

        <label className="flex items-center gap-2 mb-4 text-sm text-[#B8B3AC]">
          <input
            type="checkbox"
            checked={includeIncarnon}
            onChange={e => setIncludeIncarnon(e.target.checked)}
          />
          Also copy Incarnon Adapter state
          {activeWeapon?.incarnon && (
            <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded border text-amber-700 border-amber-700/35 bg-amber-600/10">
              Installed
            </span>
          )}
        </label>

        <p className="text-[10px] text-[#9C9890] uppercase tracking-widest mb-3">
          Note: arcane is not copied — stays independent per build.
        </p>

        <label className="block text-[9px] text-[#E8E4DC]/25 uppercase tracking-widest mb-1">
          School
        </label>
        <select
          value={selectedSchool}
          onChange={e => changeSchool(e.target.value)}
          className="w-full mb-3 bg-[#4A443B] text-[#E8E4DC] text-sm rounded-lg px-3 py-2 border border-white/10"
        >
          {schools.map(school => (
            <option key={school} value={school}>{school}</option>
          ))}
        </select>

        <label className="flex items-center gap-2 mb-3 text-sm text-[#B8B3AC]">
          <input
            type="checkbox"
            checked={selectEntireSchool}
            onChange={e => {
              setSelectEntireSchool(e.target.checked)
              setSelectedTargets(new Set())
            }}
          />
          Entire school ({filteredFrames.length} frame{filteredFrames.length === 1 ? '' : 's'})
        </label>

        {!selectEntireSchool && (
          <div
            className="rounded-xl p-3 mb-4 max-h-56 overflow-y-auto"
            style={{ background: '#3A342C', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {filteredFrames.length === 0 && (
              <p className="text-xs text-[#9C9890]">No other frames in this school.</p>
            )}

            {filteredFrames.map(f => (
              <label key={f.my_frame_id} className="flex items-center gap-2 py-1 text-sm text-[#E8E4DC]">
                <input
                  type="checkbox"
                  checked={selectedTargets.has(f.my_frame_id)}
                  onChange={() => toggleTarget(f.my_frame_id)}
                />
                {f.display_name || f.warframe_name}
              </label>
            ))}
          </div>
        )}

        <p className="text-xs text-[#B8B3AC] mb-3">
          Copy <span style={{ color }}>{activeWeapon?.name || `(no ${SLOT_FIELDS[weaponSlot].label.toLowerCase()} weapon)`}</span> to {targetIds.length} frame{targetIds.length === 1 ? '' : 's'}.
        </p>

        <div className="flex gap-2">
          <Button variant="ghost" fullWidth onClick={onClose}>
            Cancel
          </Button>

          <Button
            variant="primary"
            color={color}
            fullWidth
            onClick={copyWeapon}
            disabled={saving || targetIds.length === 0}
          >
            {saving ? 'Copying...' : 'Confirm Copy'}
          </Button>
        </div>
    </ModalShell>
  )
}
