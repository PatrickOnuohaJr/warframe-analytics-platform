import { useState } from 'react'
import { wfUser } from '../lib/supabase'
import useArcanes from '../hooks/useArcanes'
import { cleanValue } from '../utils/shardHelpers'
import WeaponInput from './WeaponInput'
import IncarnonToggle from './IncarnonToggle'
import CopyWeaponModal from './CopyWeaponModal'
import Button from './ui/Button'

// Arsenal tab of ShardEditModal: build title/tier, the three weapon slots
// (with Incarnon toggles + per-weapon arcanes), the two Warframe arcane
// slots, and the copy-to-other-builds tools for arcanes and weapons.
export default function LoadoutTab({ frame, frames, weapons, color, onSaved }) {
  const { arcanes } = useArcanes()

  const [saving, setSaving] = useState(false)
  const [arcaneCopyTarget, setArcaneCopyTarget] = useState('')
  const [showCopyWeapon, setShowCopyWeapon] = useState(false)

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

  const [primaryArcane, setPrimaryArcane] = useState(frame.primary_arcane ?? '')
  const [secondaryArcane, setSecondaryArcane] = useState(frame.secondary_arcane ?? '')
  const [meleeArcane, setMeleeArcane] = useState(frame.melee_arcane ?? '')

  const otherFrames = frames.filter(f => f.my_frame_id !== frame.my_frame_id)

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

      primary_arcane: cleanValue(primaryArcane),
      secondary_arcane: cleanValue(secondaryArcane),
      melee_arcane: cleanValue(meleeArcane),
    }

    await wfUser
      .from('my_frames')
      .update(payload)
      .eq('my_frame_id', frame.my_frame_id)

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
    <div className="space-y-4">
      <div>
        <label className="block text-[10px] text-[#9C9890] uppercase tracking-widest mb-1">
          Build Title
        </label>
        <input
          value={buildTitle}
          onChange={e => setBuildTitle(e.target.value)}
          className="w-full bg-[#4A443B] text-[#E8E4DC] text-sm rounded-lg px-3 py-2 border border-white/10"
          placeholder="Blood Angel"
        />
      </div>

      <div>
        <label className="block text-[10px] text-[#9C9890] uppercase tracking-widest mb-1">
          Tier
        </label>
        <select
          value={tier}
          onChange={e => setTier(e.target.value)}
          className="w-full bg-[#4A443B] text-[#E8E4DC] text-sm rounded-lg px-3 py-2 border border-white/10"
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

      <IncarnonToggle
        checked={primaryIsIncarnon}
        onChange={setPrimaryIsIncarnon}
        color={color}
      />

      <WeaponInput
        label="Primary Arcane"
        value={primaryArcane}
        onChange={setPrimaryArcane}
        weapons={arcanes}
        slot="Primary"
        placeholder="Primary Merciless"
      />

      <WeaponInput
        label="Secondary Weapon"
        value={secondaryWeapon}
        onChange={setSecondaryWeapon}
        weapons={weapons}
        slot="Secondary"
        placeholder="Laetum"
      />

      <IncarnonToggle
        checked={secondaryIsIncarnon}
        onChange={setSecondaryIsIncarnon}
        color={color}
      />

      <WeaponInput
        label="Secondary Arcane"
        value={secondaryArcane}
        onChange={setSecondaryArcane}
        weapons={arcanes}
        slot="Secondary"
        placeholder="Secondary Merciless"
      />

      <WeaponInput
        label="Melee Weapon"
        value={meleeWeapon}
        onChange={setMeleeWeapon}
        weapons={weapons}
        slot="Melee"
        placeholder="Praedos"
      />

      <IncarnonToggle
        checked={meleeIsIncarnon}
        onChange={setMeleeIsIncarnon}
        color={color}
      />

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
          background: '#3A342C',
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
          className="w-full bg-[#4A443B] text-[#E8E4DC] text-sm rounded-lg px-3 py-2 border border-white/10 mb-3"
        >
          <option value="">Select target Warframe...</option>

          {otherFrames.map(f => (
            <option key={f.my_frame_id} value={f.my_frame_id}>
              {f.warframe_name}
            </option>
          ))}
        </select>

        <Button
          variant="primary"
          color={color}
          fullWidth
          onClick={copyArcaneSetup}
          disabled={!arcaneCopyTarget || saving}
        >
          Copy Arcane 1 + Arcane 2
        </Button>
      </div>

      <Button variant="info" fullWidth onClick={() => setShowCopyWeapon(true)}>
        Copy Weapon To Other Builds
      </Button>

      <WeaponInput
        label="Melee Arcane"
        value={meleeArcane}
        onChange={setMeleeArcane}
        weapons={arcanes}
        slot="Melee"
        placeholder="Melee Influence"
      />

      <Button variant="primary" color={color} fullWidth onClick={saveLoadout} disabled={saving}>
        {saving ? 'Saving...' : 'Save Arsenal'}
      </Button>

      {showCopyWeapon && (
        <div onClick={e => e.stopPropagation()}>
          <CopyWeaponModal
            frame={frame}
            frames={frames}
            sourceWeapons={{
              primary: { name: primaryWeapon, incarnon: primaryIsIncarnon },
              secondary: { name: secondaryWeapon, incarnon: secondaryIsIncarnon },
              melee: { name: meleeWeapon, incarnon: meleeIsIncarnon },
            }}
            onClose={() => setShowCopyWeapon(false)}
            onCopied={() => {
              setShowCopyWeapon(false)
              onSaved()
            }}
          />
        </div>
      )}
    </div>
  )
}
