import { useMemo, useState } from 'react'
import { wfUser } from '../lib/supabase'
import { SHARD_COLORS, SHARD_NAMES } from '../constants/shards'
import { SHARD_BONUSES, getTauBonusText } from '../constants/shardBonuses'
import useArcanes from '../hooks/useArcanes';

function getInitialShards(slots) {
  return [1, 2, 3, 4, 5].map(i => ({
    color: slots?.[`shard_${i}_color`] ?? null,
    tauforged: slots?.[`shard_${i}_tauforged`] ?? false,
    bonus: slots?.[`shard_${i}_bonus`] ?? '',
  }))
}

function buildShardPayload(shards) {
  const payload = {}

  shards.forEach((s, i) => {
    payload[`shard_${i + 1}_color`] = s.color
    payload[`shard_${i + 1}_tauforged`] = s.tauforged
    payload[`shard_${i + 1}_tier`] = null
    payload[`shard_${i + 1}_bonus`] = s.bonus || null
  })

  return payload
}

function cleanValue(value) {
  if (!value) return null
  if (value.trim().toLowerCase() === 'nan') return null
  return value.trim()
}

function getColorKey(color) {
  return color ? String(color).toLowerCase() : ''
}

function TabButton({ active, color, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="py-2 rounded-lg text-sm font-semibold transition-colors"
      style={{
        background: active ? `${color}18` : 'rgba(255,255,255,0.04)',
        border: active
          ? `1px solid ${color}55`
          : '1px solid rgba(255,255,255,0.08)',
        color: active ? color : 'rgba(255,255,255,0.4)',
      }}
    >
      {children}
    </button>
  )
}

function WeaponInput({ label, value, onChange, weapons = [], slot, placeholder }) {
  const [focused, setFocused] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  const filteredWeapons = useMemo(() => {
    const query = value.trim().toLowerCase()

    return weapons
      .filter(item => {
  const itemSlot = item.slot ?? item.arcane_type
  return itemSlot === slot
})
      .filter(weapon => weapon.weapon_type !== 'Incarnon Genesis')
      .filter(weapon => {
        if (!query) return true
        return weapon.name.toLowerCase().includes(query)
      })
      .sort((a, b) => {
        const aName = a.name.toLowerCase()
        const bName = b.name.toLowerCase()

        if (query) {
          const aStarts = aName.startsWith(query)
          const bStarts = bName.startsWith(query)

          if (aStarts && !bStarts) return -1
          if (!aStarts && bStarts) return 1
        }

        return a.name.localeCompare(b.name)
      })
      .slice(0, 8)
  }, [weapons, slot, value])

  function selectWeapon(weapon) {
    onChange(weapon.name)
    setFocused(false)
    setHighlightedIndex(0)
  }

  function handleKeyDown(e) {
    if (!focused || filteredWeapons.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex(prev =>
        prev >= filteredWeapons.length - 1 ? 0 : prev + 1
      )
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex(prev =>
        prev <= 0 ? filteredWeapons.length - 1 : prev - 1
      )
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      selectWeapon(filteredWeapons[highlightedIndex])
    }

    if (e.key === 'Escape') {
      setFocused(false)
    }
  }

  return (
    <div className="relative">
      <label className="block text-[10px] text-white/30 uppercase tracking-widest mb-1">
        {label}
      </label>

      <input
        value={value}
        onChange={e => {
          onChange(e.target.value)
          setHighlightedIndex(0)
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setTimeout(() => setFocused(false), 120)
        }}
        onKeyDown={handleKeyDown}
        className="w-full bg-[#111] text-white/80 text-sm rounded-lg px-3 py-2 border border-white/10"
        placeholder={placeholder}
      />

      {focused && filteredWeapons.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-[#0d0d0d] border border-white/10 rounded-lg overflow-hidden z-[80] max-h-56 overflow-y-auto shadow-xl">
          {filteredWeapons.map((weapon, index) => {
            const highlighted = index === highlightedIndex

            return (
              <button
                key={weapon.weapon_id ?? weapon.arcane_id}
                type="button"
                onMouseDown={() => selectWeapon(weapon)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className="w-full text-left px-3 py-2 transition-colors"
                style={{
                  background: highlighted
                    ? 'rgba(255,255,255,0.08)'
                    : 'transparent',
                }}
              >
                <p className="text-sm text-white/80">{weapon.name}</p>
                <p className="text-[10px] text-white/30 uppercase tracking-widest">
                  {weapon.weapon_type ?? weapon.arcane_type ?? weapon.category ?? slot}
                  {weapon.mastery_rank !== null &&
                  weapon.mastery_rank !== undefined
                    ? ` • MR ${weapon.mastery_rank}`
                    : ''}
                </p>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function ShardEditModal({
  frame,
  frames,
  weapons = [],
  initialTab = 'loadout',
  onClose,
  onSaved,
}) {
  const color = frame.cultivation_color ?? '#FBBF24'
  const { arcanes } = useArcanes()

  const [activeEditorTab, setActiveEditorTab] = useState(initialTab)
  const [mode, setMode] = useState('current')
  const [activeSlot, setActiveSlot] = useState(0)
  const [saving, setSaving] = useState(false)

  const [showCopyMenu, setShowCopyMenu] = useState(false)
  const [selectedSchool, setSelectedSchool] = useState('All Schools')
  const [selectedTargetFrame, setSelectedTargetFrame] = useState('')
  const [arcaneCopyTarget, setArcaneCopyTarget] = useState('')

  const [buildTitle, setBuildTitle] = useState(frame.build_title ?? '')
  const [tier, setTier] = useState(frame.tier ?? '')
  const [primaryWeapon, setPrimaryWeapon] = useState(frame.primary_weapon ?? '')
  const [secondaryWeapon, setSecondaryWeapon] = useState(frame.secondary_weapon ?? '')
  const [meleeWeapon, setMeleeWeapon] = useState(frame.melee_weapon ?? '')
  const [arcane1, setArcane1] = useState(frame.arcane_1 ?? '')
  const [arcane2, setArcane2] = useState(frame.arcane_2 ?? '')

  const [primaryIsIncarnon, setPrimaryIsIncarnon] = useState(
    frame.primary_is_incarnon ?? false
  )
  const [secondaryIsIncarnon, setSecondaryIsIncarnon] = useState(
    frame.secondary_is_incarnon ?? false
  )
  const [meleeIsIncarnon, setMeleeIsIncarnon] = useState(
    frame.melee_is_incarnon ?? false
  )
  const [meleeArcane, setMeleeArcane] = useState(frame.melee_arcane ?? '')

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
      primary_is_incarnon: primaryIsIncarnon,
      secondary_is_incarnon: secondaryIsIncarnon,
      melee_is_incarnon: meleeIsIncarnon,
      melee_arcane: cleanValue(meleeArcane),
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
  async function copyArcaneSetup() {
    if (!arcaneCopyTarget) {
      alert('Select a target Warframe first.')
      return
  }

  setSaving(true)

  const payload = {
    arcane_1: cleanValue(arcane1),
    arcane_2: cleanValue(arcane2),
  }

  const { error } = await wfUser
    .from('my_frames')
    .update(payload)
    .eq('my_frame_id', arcaneCopyTarget)

  setSaving(false)

  if (error) {
    console.error(error)
    alert('Failed to copy arcane setup.')
    return
  }

  alert('Arcane setup copied successfully.')
  onSaved()
}
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[60]"
      style={{ background: 'rgba(0,0,0,0.82)' }}
      onClick={onClose}
    >
      <div
        className="border rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
        style={{
          background: `linear-gradient(135deg, ${color}10, #111 22%, #161616 100%)`,
          borderColor: `${color}44`,
          boxShadow: `0 0 40px ${color}16`,
        }}
        onClick={e => e.stopPropagation()}
      >
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

            <h2 className="text-white font-semibold text-lg">
              {frame.warframe_name}
            </h2>

            {frame.cultivation_school && (
              <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">
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

            <WeaponInput
              label="Primary Weapon"
              value={primaryWeapon}
              onChange={setPrimaryWeapon}
              weapons={weapons}
              slot="Primary"
              placeholder="Torid"
            />

            <label className="flex items-center gap-2 mt-2 text-xs text-white/60">
              <input
                type="checkbox"
                checked={primaryIsIncarnon}
                onChange={e => setPrimaryIsIncarnon(e.target.checked)}
              />
              Incarnon Adapter Installed
            </label>

            <WeaponInput
              label="Secondary Weapon"
              value={secondaryWeapon}
              onChange={setSecondaryWeapon}
              weapons={weapons}
              slot="Secondary"
              placeholder="Laetum"
            />

            <label className="flex items-center gap-2 mt-2 text-xs text-white/60">
              <input
                type="checkbox"
                checked={secondaryIsIncarnon}
                onChange={e => setSecondaryIsIncarnon(e.target.checked)}
              />
              Incarnon Adapter Installed
            </label>

            <WeaponInput
              label="Melee Weapon"
              value={meleeWeapon}
              onChange={setMeleeWeapon}
              weapons={weapons}
              slot="Melee"
              placeholder="Praedos"
            />

            <label className="flex items-center gap-2 mt-2 text-xs text-white/60">
              <input
                type="checkbox"
                checked={meleeIsIncarnon}
                onChange={e => setMeleeIsIncarnon(e.target.checked)}
              />
              Incarnon Adapter Installed
            </label>

            <WeaponInput
  label="Arcane 1"
  value={arcane1}
  onChange={setArcane1}
  weapons={arcanes}
  slot="Warframe"
  placeholder="Arcane Reaper"
/>

            <WeaponInput
  label="Arcane 2"
  value={arcane2}
  onChange={setArcane2}
  weapons={arcanes}
  slot="Warframe"
  placeholder="Molt Augmented"
/>
      <div
      className="rounded-xl p-3"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${color}30`,
      }}
    >
      <p
        className="text-[10px] uppercase tracking-widest mb-2 font-bold"
        style={{ color }}
      >
        Copy Arcane Setup
      </p>

      <select
        value={arcaneCopyTarget}
        onChange={e => setArcaneCopyTarget(e.target.value)}
        className="w-full bg-[#111] text-white/70 text-sm rounded-lg px-3 py-2 border border-white/10 mb-3"
      >
        <option value="">Select target Warframe...</option>

        {filteredFrames
          .filter(f => f.my_frame_id !== frame.my_frame_id)
          .map(f => (
            <option key={f.my_frame_id} value={f.my_frame_id}>
              {f.warframe_name}
            </option>
          ))}
      </select>

      <button
        type="button"
        onClick={copyArcaneSetup}
        disabled={!arcaneCopyTarget || saving}
        className="w-full py-2 rounded-lg text-sm font-semibold transition-colors"
        style={{
          background: `${color}14`,
          border: `0.5px solid ${color}55`,
          color,
          opacity: arcaneCopyTarget ? 1 : 0.4,
        }}
      >
        Copy Arcane 1 + Arcane 2
      </button>
    </div>
            <WeaponInput
  label="Melee Arcane"
  value={meleeArcane}
  onChange={setMeleeArcane}
  weapons={arcanes}
  slot="Melee"
  placeholder="Melee Influence"
/>

            <button
              onClick={saveLoadout}
              disabled={saving}
              className="w-full py-2 rounded-lg text-sm font-semibold transition-colors"
              style={{
                background: `${color}18`,
                border: `0.5px solid ${color}55`,
                color,
              }}
            >
              {saving ? 'Saving...' : 'Save Arsenal'}
            </button>
          </div>
        )}

        {activeEditorTab === 'shards' && (
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
                        : 'rgba(255,255,255,0.08)',
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

                  <span className="text-[8px] uppercase tracking-wide text-white/30">
                    {name}
                  </span>
                </div>
              ))}
            </div>

            {current.color && (
              <div className="mb-4">
                <label className="block text-[10px] text-white/30 uppercase tracking-widest mb-1">
                  Bonus / Purpose
                </label>

                <select
                  value={current.bonus ?? ''}
                  onChange={e => updateActiveShard('bonus', e.target.value)}
                  className="w-full bg-[#111] text-white/80 text-sm rounded-lg px-3 py-2 border border-white/10"
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
                background: 'rgba(255,255,255,0.04)',
                border: '0.5px solid rgba(255,255,255,0.08)',
              }}
              onClick={toggleTau}
            >
              <span className="text-sm text-white/60">Tauforged</span>

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
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${color}30`,
                }}
              >
                <p
                  className="text-[10px] uppercase tracking-widest mb-3 font-bold"
                  style={{ color }}
                >
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
                    Copy <span style={{ color }}>{frame.warframe_name}</span>
                    {"'s"} Goal setup to{' '}
                    <span style={{ color }}>
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
                      background: `${color}14`,
                      border: `0.5px solid ${color}55`,
                      color,
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
                <>
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

                  <button
                    onClick={clearAllTarget}
                    className="w-full py-2 rounded-lg text-sm text-red-300/70 hover:text-red-200 transition-colors"
                    style={{
                      background: 'rgba(239,68,68,0.06)',
                      border: '0.5px solid rgba(239,68,68,0.18)',
                    }}
                  >
                    Clear All Goal
                  </button>
                </>
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
                    background: `${color}18`,
                    border: `0.5px solid ${color}55`,
                    color,
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