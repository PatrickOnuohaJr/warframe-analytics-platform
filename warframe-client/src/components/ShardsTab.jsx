import { useState } from 'react'
import { wfUser } from '../lib/supabase'
import { SHARD_COLORS, SHARD_NAMES } from '../constants/shards'
import { SHARD_BONUSES, getTauBonusText } from '../constants/shardBonuses'
import { getInitialShards, buildShardPayload, getColorKey } from '../utils/shardHelpers'
import TabButton from './TabButton'
import Button from './ui/Button'

// Archon Shards tab of ShardEditModal: Now/Goal shard editing, color +
// tauforge + bonus picking per slot, and the copy-goal tools.
export default function ShardsTab({ frame, frames, color, onSaved }) {
  const [mode, setMode] = useState('current')
  const [activeSlot, setActiveSlot] = useState(0)
  const [saving, setSaving] = useState(false)

  const [showCopyMenu, setShowCopyMenu] = useState(false)
  const [selectedSchool, setSelectedSchool] = useState('All Schools')
  const [selectedTargetFrame, setSelectedTargetFrame] = useState('')

  const [currentShards, setCurrentShards] = useState(
    getInitialShards(frame.shard_slots)
  )

  const [targetShards, setTargetShards] = useState(
    getInitialShards(frame.target_shards)
  )

  const shards = mode === 'current' ? currentShards : targetShards
  const setShards = mode === 'current' ? setCurrentShards : setTargetShards
  const current = shards[activeSlot]
  const currentColorKey = getColorKey(current.color)
  const currentBonusOptions = SHARD_BONUSES[currentColorKey] ?? []

  const schools = [
    'All Schools',
    ...new Set(
      frames
        .map(f => f.cultivation_school)
        .filter(Boolean)
        .sort()
    ),
  ]

  const filteredFrames =
    selectedSchool === 'All Schools'
      ? frames
      : frames.filter(f => f.cultivation_school === selectedSchool)

  const targetFrameObject = frames.find(
    f => String(f.my_frame_id) === String(selectedTargetFrame)
  )

  function updateActiveShard(field, value) {
    setShards(prev =>
      prev.map((s, i) =>
        i === activeSlot ? { ...s, [field]: value } : s
      )
    )
  }

  function setColor(colorName) {
    setShards(prev =>
      prev.map((s, i) =>
        i === activeSlot ? { ...s, color: colorName, bonus: '' } : s
      )
    )
  }

  function toggleTau() {
    updateActiveShard('tauforged', !current.tauforged)
  }

  function clearSlot() {
    setShards(prev =>
      prev.map((s, i) =>
        i === activeSlot
          ? { color: null, tauforged: false, bonus: '' }
          : s
      )
    )
  }

  function clearAllCurrent() {
    setCurrentShards(
      [1, 2, 3, 4, 5].map(() => ({
        color: null,
        tauforged: false,
        bonus: '',
      }))
    )
  }

  function clearAllTarget() {
    setTargetShards(
      [1, 2, 3, 4, 5].map(() => ({
        color: null,
        tauforged: false,
        bonus: '',
      }))
    )
  }

  async function saveShards() {
    setSaving(true)

    const payload = buildShardPayload(shards)

    const table =
      mode === 'current'
        ? 'archon_shard_slots'
        : 'archon_shard_slots_target'

    const existingSlots =
      mode === 'current'
        ? frame.shard_slots
        : frame.target_shards

    if (existingSlots) {
      await wfUser
        .from(table)
        .update(payload)
        .eq('my_frame_id', frame.my_frame_id)
    } else {
      await wfUser
        .from(table)
        .insert({ my_frame_id: frame.my_frame_id, ...payload })
    }

    setSaving(false)
    onSaved()
  }

  async function copyGoalToNow() {
    const hasGoal = targetShards.some(s => s.color)

    if (!hasGoal) {
      alert('This frame has no Goal shards to copy.')
      return
    }

    const confirmed = window.confirm(
      `Copy ${frame.display_name || frame.warframe_name}'s Goal shard setup to Now?`
    )

    if (!confirmed) return

    setSaving(true)

    const copiedShards = targetShards.map(s => ({ ...s }))
    const payload = buildShardPayload(copiedShards)

    if (frame.shard_slots) {
      await wfUser
        .from('archon_shard_slots')
        .update(payload)
        .eq('my_frame_id', frame.my_frame_id)
    } else {
      await wfUser
        .from('archon_shard_slots')
        .insert({ my_frame_id: frame.my_frame_id, ...payload })
    }

    setCurrentShards(copiedShards)
    setSaving(false)
    onSaved()
  }

  async function copyGoalToAnotherFrame() {
    const hasGoal = targetShards.some(s => s.color)

    if (!hasGoal) {
      alert('This frame has no Goal shards to copy.')
      return
    }

    if (!targetFrameObject) {
      alert('Select a target frame first.')
      return
    }

    const confirmed = window.confirm(
      `Copy ${frame.display_name || frame.warframe_name}'s Goal shard setup to ${targetFrameObject.warframe_name}?`
    )

    if (!confirmed) return

    setSaving(true)

    const copiedShards = targetShards.map(s => ({ ...s }))
    const payload = buildShardPayload(copiedShards)

    if (targetFrameObject.target_shards) {
      await wfUser
        .from('archon_shard_slots_target')
        .update(payload)
        .eq('my_frame_id', targetFrameObject.my_frame_id)
    } else {
      await wfUser
        .from('archon_shard_slots_target')
        .insert({
          my_frame_id: targetFrameObject.my_frame_id,
          ...payload,
        })
    }

    setSaving(false)
    onSaved()
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 mb-5">
        <TabButton
          active={mode === 'current'}
          color={color}
          onClick={() => setMode('current')}
        >
          Now
        </TabButton>

        <TabButton
          active={mode === 'target'}
          color={color}
          onClick={() => setMode('target')}
        >
          Goal
        </TabButton>
      </div>

      <p className="text-[10px] text-[#9C9890] uppercase tracking-widest mb-3">
        Select slot — {mode === 'current' ? 'Now' : 'Goal'}
      </p>

      <div
        className="flex gap-4 mb-6 justify-center"
        style={{ height: '44px', alignItems: 'flex-end' }}
      >
        {shards.map((s, i) => (
          <div
            key={i}
            onClick={() => setActiveSlot(i)}
            className="flex flex-col items-center gap-2 cursor-pointer"
            style={{ paddingBottom: '4px' }}
            title={
              s.color
                ? `${s.tauforged ? 'Tauforged ' : ''}${s.color}${s.bonus ? ` — ${s.tauforged ? getTauBonusText(s.bonus) : s.bonus}` : ''}`
                : 'Empty shard slot'
            }
          >
            <div
              style={{
                width: '14px',
                height: '24px',
                borderRadius: '4px',
                transform: 'rotate(-35deg)',
                background: s.color
                  ? SHARD_COLORS[s.color]
                  : '#6F6A62',
                border:
                  i === activeSlot
                    ? '2px solid white'
                    : '1px solid rgba(255,255,255,0.1)',
                outline:
                  i === activeSlot
                    ? `2px solid ${color}66`
                    : 'none',
                outlineOffset: '3px',
              }}
            />

            <span
              className="text-[9px]"
              style={{
                color:
                  i === activeSlot
                    ? 'rgba(255,255,255,0.65)'
                    : 'rgba(255,255,255,0.2)',
              }}
            >
              {i + 1}
            </span>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-[#9C9890] uppercase tracking-widest mb-3">
        Color — slot {activeSlot + 1}
      </p>

      <div className="grid grid-cols-6 gap-2 mb-4">
        {SHARD_NAMES.map(name => (
          <div
            key={name}
            onClick={() => setColor(name)}
            className="flex flex-col items-center gap-1.5 cursor-pointer p-2 rounded-lg transition-colors"
            style={{
              background:
                current.color === name
                  ? '#6F6A62'
                  : 'transparent',
              border:
                current.color === name
                  ? '1px solid rgba(255,255,255,0.2)'
                  : '1px solid transparent',
            }}
          >
            <div
              style={{
                width: '14px',
                height: '24px',
                borderRadius: '4px',
                transform: 'rotate(-35deg)',
                background: SHARD_COLORS[name],
              }}
            />

            <span className="text-[8px] uppercase tracking-wide text-[#9C9890]">
              {name}
            </span>
          </div>
        ))}
      </div>

      {current.color && (
        <div className="mb-4">
          <label className="block text-[10px] text-[#9C9890] uppercase tracking-widest mb-1">
            Bonus / Purpose
          </label>

          <select
            value={current.bonus ?? ''}
            onChange={e => updateActiveShard('bonus', e.target.value)}
            className="w-full bg-[#4A443B] text-[#E8E4DC] text-sm rounded-lg px-3 py-2 border border-white/10"
          >
            <option value="">Select shard bonus...</option>

            {currentBonusOptions.map(bonus => (
              <option key={bonus.base} value={bonus.base}>
                {current.tauforged ? bonus.tau : bonus.base}
              </option>
            ))}
          </select>
        </div>
      )}

      <div
        className="flex items-center justify-between p-3 rounded-lg mb-4 cursor-pointer"
        style={{
          background: '#3A342C',
          border: '0.5px solid #6F6A62',
        }}
        onClick={toggleTau}
      >
        <span className="text-sm text-[#E8E4DC]/60">Tauforged</span>

        <div
          className="rounded-full transition-colors"
          style={{
            width: '32px',
            height: '18px',
            background: current.tauforged
              ? color
              : 'rgba(255,255,255,0.15)',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: 'white',
              position: 'absolute',
              top: '2px',
              left: current.tauforged ? '16px' : '2px',
              transition: 'left 0.15s',
            }}
          />
        </div>
      </div>

      {showCopyMenu && (
        <div
          className="rounded-xl p-3 mb-4"
          style={{
            background: '#3A342C',
            border: `1px solid ${color}30`,
          }}
        >
          <p
            className="text-[10px] uppercase tracking-widest mb-3 font-bold"
            style={{ color }}
          >
            Copy Goal To Another Frame
          </p>

          <label className="block text-[9px] text-[#E8E4DC]/25 uppercase tracking-widest mb-1">
            School
          </label>

          <select
            value={selectedSchool}
            onChange={e => {
              setSelectedSchool(e.target.value)
              setSelectedTargetFrame('')
            }}
            className="w-full mb-3 bg-[#4A443B] text-[#E8E4DC] text-sm rounded-lg px-3 py-2 border border-white/10"
          >
            {schools.map(school => (
              <option key={school} value={school}>
                {school}
              </option>
            ))}
          </select>

          <label className="block text-[9px] text-[#E8E4DC]/25 uppercase tracking-widest mb-1">
            Target Frame
          </label>

          <select
            value={selectedTargetFrame}
            onChange={e => setSelectedTargetFrame(e.target.value)}
            className="w-full mb-3 bg-[#4A443B] text-[#E8E4DC] text-sm rounded-lg px-3 py-2 border border-white/10"
          >
            <option value="">Select frame...</option>

            {filteredFrames
              .filter(f => f.my_frame_id !== frame.my_frame_id)
              .map(f => (
                <option key={f.my_frame_id} value={f.my_frame_id}>
                  {f.warframe_name}
                </option>
              ))}
          </select>

          {targetFrameObject && (
            <p className="text-xs text-[#B8B3AC] mb-3">
              Copy <span style={{ color }}>{frame.display_name || frame.warframe_name}</span>
              {"'s"} Goal setup to{' '}
              <span style={{ color }}>
                {targetFrameObject.warframe_name}
              </span>
              ?
            </p>
          )}

          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setShowCopyMenu(false)}>
              Cancel
            </Button>

            <Button
              variant="primary"
              color={color}
              className="flex-1"
              onClick={copyGoalToAnotherFrame}
              disabled={saving || !selectedTargetFrame}
            >
              Confirm Copy
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {mode === 'current' && (
          <>
            <Button variant="success" fullWidth onClick={copyGoalToNow} disabled={saving}>
              Copy Goal → Now
            </Button>

            <Button variant="danger" fullWidth onClick={clearAllCurrent}>
              Clear All Now
            </Button>
          </>
        )}

        {mode === 'target' && (
          <>
            <Button
              variant="info"
              fullWidth
              onClick={() => setShowCopyMenu(prev => !prev)}
              disabled={saving}
            >
              Copy Goal To Another Frame
            </Button>

            <Button variant="danger" fullWidth onClick={clearAllTarget}>
              Clear All Goal
            </Button>
          </>
        )}

        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={clearSlot}>
            Clear slot
          </Button>

          <Button variant="primary" color={color} className="flex-1" onClick={saveShards} disabled={saving}>
            {saving
              ? 'Saving...'
              : `Save ${mode === 'current' ? 'Now' : 'Goal'}`}
          </Button>
        </div>
      </div>
    </>
  )
}
