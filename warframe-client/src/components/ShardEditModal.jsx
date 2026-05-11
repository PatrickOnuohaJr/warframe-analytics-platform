import { useState } from 'react'
import { wfUser } from '../lib/supabase'
import { SHARD_COLORS, SHARD_NAMES } from '../constants/shards'

function getInitialShards(slots) {
  return [1, 2, 3, 4, 5].map(i => ({
    color: slots?.[`shard_${i}_color`] ?? null,
    tauforged: slots?.[`shard_${i}_tauforged`] ?? false,
  }))
}

function buildShardPayload(shards) {
  const payload = {}

  shards.forEach((s, i) => {
    payload[`shard_${i + 1}_color`] = s.color
    payload[`shard_${i + 1}_tauforged`] = s.tauforged
    payload[`shard_${i + 1}_tier`] = null
  })

  return payload
}

function cleanValue(value) {
  if (!value) return null
  if (value.trim().toLowerCase() === 'nan') return null
  return value.trim()
}

export default function ShardEditModal({
  frame,
  frames,
  onClose,
  onSaved,
}) {
  const [activeEditorTab, setActiveEditorTab] = useState('loadout')
  const [mode, setMode] = useState('current')
  const [activeSlot, setActiveSlot] = useState(0)
  const [saving, setSaving] = useState(false)

  const [showCopyMenu, setShowCopyMenu] = useState(false)
  const [selectedSchool, setSelectedSchool] = useState('All Schools')
  const [selectedTargetFrame, setSelectedTargetFrame] = useState('')

  const [buildTitle, setBuildTitle] = useState(frame.build_title ?? '')
  const [tier, setTier] = useState(frame.tier ?? '')
  const [primaryWeapon, setPrimaryWeapon] = useState(frame.primary_weapon ?? '')
  const [secondaryWeapon, setSecondaryWeapon] = useState(frame.secondary_weapon ?? '')
  const [meleeWeapon, setMeleeWeapon] = useState(frame.melee_weapon ?? '')
  const [arcane1, setArcane1] = useState(frame.arcane_1 ?? '')
  const [arcane2, setArcane2] = useState(frame.arcane_2 ?? '')

  const [currentShards, setCurrentShards] = useState(
    getInitialShards(frame.shard_slots)
  )

  const [targetShards, setTargetShards] = useState(
    getInitialShards(frame.target_shards)
  )

  const shards = mode === 'current' ? currentShards : targetShards
  const setShards = mode === 'current' ? setCurrentShards : setTargetShards
  const current = shards[activeSlot]

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

  function setColor(color) {
    setShards(prev =>
      prev.map((s, i) => (i === activeSlot ? { ...s, color } : s))
    )
  }

  function toggleTau() {
    setShards(prev =>
      prev.map((s, i) =>
        i === activeSlot ? { ...s, tauforged: !s.tauforged } : s
      )
    )
  }

  function clearSlot() {
    setShards(prev =>
      prev.map((s, i) =>
        i === activeSlot ? { color: null, tauforged: false } : s
      )
    )
  }

  function clearAllCurrent() {
    setCurrentShards(
      [1, 2, 3, 4, 5].map(() => ({
        color: null,
        tauforged: false,
      }))
    )
  }

  async function saveLoadout() {
    setSaving(true)

    const payload = {
      build_title: cleanValue(buildTitle),
      tier: cleanValue(tier),
      primary_weapon: cleanValue(primaryWeapon),
      secondary_weapon: cleanValue(secondaryWeapon),
      melee_weapon: cleanValue(meleeWeapon),
      arcane_1: cleanValue(arcane1),
      arcane_2: cleanValue(arcane2),
    }

    await wfUser
      .from('my_frames')
      .update(payload)
      .eq('my_frame_id', frame.my_frame_id)

    setSaving(false)
    onSaved()
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
      `Copy ${frame.warframe_name}'s Goal shard setup to Now?`
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
      `Copy ${frame.warframe_name}'s Goal shard setup to ${targetFrameObject.warframe_name}?`
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
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-widest mb-0.5">
              Editing loadout
            </p>

            <h2 className="text-white font-semibold text-lg">
              {frame.warframe_name}
            </h2>

            {frame.cultivation_school && (
              <p
                className="text-[10px] uppercase tracking-widest mt-1"
                style={{ color: frame.cultivation_color ?? '#FBBF24' }}
              >
                {frame.cultivation_school}
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            className="text-white/30 hover:text-white text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-5">
          <button
            onClick={() => setActiveEditorTab('loadout')}
            className="py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{
              background:
                activeEditorTab === 'loadout'
                  ? 'rgba(251,191,36,0.15)'
                  : 'rgba(255,255,255,0.04)',
              border:
                activeEditorTab === 'loadout'
                  ? '1px solid rgba(251,191,36,0.4)'
                  : '1px solid rgba(255,255,255,0.08)',
              color:
                activeEditorTab === 'loadout'
                  ? '#FBBF24'
                  : 'rgba(255,255,255,0.4)',
            }}
          >
            Loadout
          </button>

          <button
            onClick={() => setActiveEditorTab('shards')}
            className="py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{
              background:
                activeEditorTab === 'shards'
                  ? 'rgba(251,191,36,0.15)'
                  : 'rgba(255,255,255,0.04)',
              border:
                activeEditorTab === 'shards'
                  ? '1px solid rgba(251,191,36,0.4)'
                  : '1px solid rgba(255,255,255,0.08)',
              color:
                activeEditorTab === 'shards'
                  ? '#FBBF24'
                  : 'rgba(255,255,255,0.4)',
            }}
          >
            Shards
          </button>
        </div>

        {activeEditorTab === 'loadout' && (
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] text-white/30 uppercase tracking-widest mb-1">
                Build Title
              </label>
              <input
                value={buildTitle}
                onChange={e => setBuildTitle(e.target.value)}
                className="w-full bg-[#111] text-white/80 text-sm rounded-lg px-3 py-2 border border-white/10"
                placeholder="Blood Angel"
              />
            </div>

            <div>
              <label className="block text-[10px] text-white/30 uppercase tracking-widest mb-1">
                Tier
              </label>
              <select
                value={tier}
                onChange={e => setTier(e.target.value)}
                className="w-full bg-[#111] text-white/80 text-sm rounded-lg px-3 py-2 border border-white/10"
              >
                <option value="">No tier</option>
                <option value="S">S</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
              </select>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-[10px] text-white/30 uppercase tracking-widest mb-1">
                  Primary Weapon
                </label>
                <input
                  value={primaryWeapon}
                  onChange={e => setPrimaryWeapon(e.target.value)}
                  className="w-full bg-[#111] text-white/80 text-sm rounded-lg px-3 py-2 border border-white/10"
                  placeholder="Torid Incarnon"
                />
              </div>

              <div>
                <label className="block text-[10px] text-white/30 uppercase tracking-widest mb-1">
                  Secondary Weapon
                </label>
                <input
                  value={secondaryWeapon}
                  onChange={e => setSecondaryWeapon(e.target.value)}
                  className="w-full bg-[#111] text-white/80 text-sm rounded-lg px-3 py-2 border border-white/10"
                  placeholder="Laetum"
                />
              </div>

              <div>
                <label className="block text-[10px] text-white/30 uppercase tracking-widest mb-1">
                  Melee Weapon
                </label>
                <input
                  value={meleeWeapon}
                  onChange={e => setMeleeWeapon(e.target.value)}
                  className="w-full bg-[#111] text-white/80 text-sm rounded-lg px-3 py-2 border border-white/10"
                  placeholder="Praedos"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-[10px] text-white/30 uppercase tracking-widest mb-1">
                  Arcane 1
                </label>
                <input
                  value={arcane1}
                  onChange={e => setArcane1(e.target.value)}
                  className="w-full bg-[#111] text-white/80 text-sm rounded-lg px-3 py-2 border border-white/10"
                  placeholder="Arcane Reaper"
                />
              </div>

              <div>
                <label className="block text-[10px] text-white/30 uppercase tracking-widest mb-1">
                  Arcane 2
                </label>
                <input
                  value={arcane2}
                  onChange={e => setArcane2(e.target.value)}
                  className="w-full bg-[#111] text-white/80 text-sm rounded-lg px-3 py-2 border border-white/10"
                  placeholder="Molt Augmented"
                />
              </div>
            </div>

            <button
              onClick={saveLoadout}
              disabled={saving}
              className="w-full py-2 rounded-lg text-sm font-semibold transition-colors"
              style={{
                background: 'rgba(251,191,36,0.15)',
                border: '0.5px solid rgba(251,191,36,0.4)',
                color: '#FBBF24',
              }}
            >
              {saving ? 'Saving...' : 'Save Loadout'}
            </button>
          </div>
        )}

        {activeEditorTab === 'shards' && (
          <>
            <div className="grid grid-cols-2 gap-2 mb-5">
              <button
                onClick={() => setMode('current')}
                className="py-2 rounded-lg text-sm font-semibold transition-colors"
                style={{
                  background:
                    mode === 'current'
                      ? 'rgba(251,191,36,0.15)'
                      : 'rgba(255,255,255,0.04)',
                  border:
                    mode === 'current'
                      ? '1px solid rgba(251,191,36,0.4)'
                      : '1px solid rgba(255,255,255,0.08)',
                  color:
                    mode === 'current'
                      ? '#FBBF24'
                      : 'rgba(255,255,255,0.4)',
                }}
              >
                Now
              </button>

              <button
                onClick={() => setMode('target')}
                className="py-2 rounded-lg text-sm font-semibold transition-colors"
                style={{
                  background:
                    mode === 'target'
                      ? 'rgba(251,191,36,0.15)'
                      : 'rgba(255,255,255,0.04)',
                  border:
                    mode === 'target'
                      ? '1px solid rgba(251,191,36,0.4)'
                      : '1px solid rgba(255,255,255,0.08)',
                  color:
                    mode === 'target'
                      ? '#FBBF24'
                      : 'rgba(255,255,255,0.4)',
                }}
              >
                Goal
              </button>
            </div>

            <p className="text-[10px] text-white/30 uppercase tracking-widest mb-3">
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
                >
                  <div
                    style={{
                      width: '14px',
                      height: '24px',
                      borderRadius: '4px',
                      transform: 'rotate(-35deg)',
                      background: s.color
                        ? SHARD_COLORS[s.color]
                        : 'rgba(255,255,255,0.08)',
                      border:
                        i === activeSlot
                          ? '2px solid white'
                          : '1px solid rgba(255,255,255,0.1)',
                      outline:
                        i === activeSlot
                          ? '2px solid rgba(255,255,255,0.3)'
                          : 'none',
                      outlineOffset: '3px',
                    }}
                  />

                  <span
                    className="text-[9px]"
                    style={{
                      color:
                        i === activeSlot
                          ? 'rgba(255,255,255,0.6)'
                          : 'rgba(255,255,255,0.2)',
                    }}
                  >
                    {i + 1}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-white/30 uppercase tracking-widest mb-3">
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
                        ? 'rgba(255,255,255,0.08)'
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

                  <span
                    className="text-[8px] uppercase tracking-wide"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                  >
                    {name}
                  </span>
                </div>
              ))}
            </div>

            <div
              className="flex items-center justify-between p-3 rounded-lg mb-4 cursor-pointer"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '0.5px solid rgba(255,255,255,0.08)',
              }}
              onClick={toggleTau}
            >
              <span className="text-sm text-white/60">
                Tauforged
              </span>

              <div
                className="rounded-full transition-colors"
                style={{
                  width: '32px',
                  height: '18px',
                  background: current.tauforged
                    ? '#FBBF24'
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
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <p className="text-[10px] text-white/30 uppercase tracking-widest mb-3">
                  Copy Goal To Another Frame
                </p>

                <label className="block text-[9px] text-white/25 uppercase tracking-widest mb-1">
                  School
                </label>

                <select
                  value={selectedSchool}
                  onChange={e => {
                    setSelectedSchool(e.target.value)
                    setSelectedTargetFrame('')
                  }}
                  className="w-full mb-3 bg-[#111] text-white/70 text-sm rounded-lg px-3 py-2 border border-white/10"
                >
                  {schools.map(school => (
                    <option key={school} value={school}>
                      {school}
                    </option>
                  ))}
                </select>

                <label className="block text-[9px] text-white/25 uppercase tracking-widest mb-1">
                  Target Frame
                </label>

                <select
                  value={selectedTargetFrame}
                  onChange={e => setSelectedTargetFrame(e.target.value)}
                  className="w-full mb-3 bg-[#111] text-white/70 text-sm rounded-lg px-3 py-2 border border-white/10"
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
                  <p className="text-xs text-white/40 mb-3">
                    Copy <span className="text-amber-300">{frame.warframe_name}</span>
                    {"'s"} Goal setup to{' '}
                    <span className="text-amber-300">
                      {targetFrameObject.warframe_name}
                    </span>
                    ?
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCopyMenu(false)}
                    className="flex-1 py-2 rounded-lg text-sm text-white/40 hover:text-white/60 transition-colors"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '0.5px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    onClick={copyGoalToAnotherFrame}
                    disabled={saving || !selectedTargetFrame}
                    className="flex-1 py-2 rounded-lg text-sm font-semibold transition-colors"
                    style={{
                      background: 'rgba(16,185,129,0.08)',
                      border: '0.5px solid rgba(16,185,129,0.25)',
                      color: '#34D399',
                      opacity: selectedTargetFrame ? 1 : 0.4,
                    }}
                  >
                    Confirm Copy
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              {mode === 'current' && (
                <>
                  <button
                    onClick={copyGoalToNow}
                    disabled={saving}
                    className="w-full py-2 rounded-lg text-sm font-semibold transition-colors"
                    style={{
                      background: 'rgba(16,185,129,0.08)',
                      border: '0.5px solid rgba(16,185,129,0.25)',
                      color: '#34D399',
                    }}
                  >
                    Copy Goal → Now
                  </button>

                  <button
                    onClick={clearAllCurrent}
                    className="w-full py-2 rounded-lg text-sm text-red-300/70 hover:text-red-200 transition-colors"
                    style={{
                      background: 'rgba(239,68,68,0.06)',
                      border: '0.5px solid rgba(239,68,68,0.18)',
                    }}
                  >
                    Clear All Now
                  </button>
                </>
              )}

              {mode === 'target' && (
                <button
                  onClick={() => setShowCopyMenu(prev => !prev)}
                  disabled={saving}
                  className="w-full py-2 rounded-lg text-sm font-semibold transition-colors"
                  style={{
                    background: 'rgba(59,130,246,0.08)',
                    border: '0.5px solid rgba(59,130,246,0.25)',
                    color: '#60A5FA',
                  }}
                >
                  Copy Goal To Another Frame
                </button>
              )}

              <div className="flex gap-2">
                <button
                  onClick={clearSlot}
                  className="flex-1 py-2 rounded-lg text-sm text-white/40 hover:text-white/60 transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '0.5px solid rgba(255,255,255,0.08)',
                  }}
                >
                  Clear slot
                </button>

                <button
                  onClick={saveShards}
                  disabled={saving}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold transition-colors"
                  style={{
                    background: 'rgba(251,191,36,0.15)',
                    border: '0.5px solid rgba(251,191,36,0.4)',
                    color: '#FBBF24',
                  }}
                >
                  {saving
                    ? 'Saving...'
                    : `Save ${mode === 'current' ? 'Now' : 'Goal'}`}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}