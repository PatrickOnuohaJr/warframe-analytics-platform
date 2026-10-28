import { useState } from 'react'
import { wfUser } from '../lib/supabase'
import { COLOR } from '../constants/theme'
import Panel from './ui/Panel'
import Button from './ui/Button'
import WeaponInput from './WeaponInput'
import { resolveCatalogWeapon } from '../utils/weaponAssign'

// Shown in place of a weapon piece when the build has no weapon in that slot
// yet (or it was removed). Keeps the slot reachable from the Loadout tab so a
// weapon can be assigned without going to the Armory's drag-and-drop, which
// is awkward on a touch screen. Only a real catalog weapon is ever saved, and
// only when "Assign" is pressed -- never while typing, so "Lex" can't be
// grabbed on the way to "Lex Prime".
export default function AssignWeaponPanel({ frame, equipmentType, column, weapons, accent, onSaved }) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const resolved = resolveCatalogWeapon(weapons, text, equipmentType)

  async function assign() {
    if (!resolved) return
    setSaving(true)
    const { error } = await wfUser.from('my_frames').update({ [column]: resolved }).eq('my_frame_id', frame.my_frame_id)
    setSaving(false)
    if (error) { console.error('Failed to assign weapon:', error); return }
    setText('')
    onSaved()
  }

  return (
    <Panel accent={accent} className="mb-6">
      <h3 className="text-sm font-bold uppercase tracking-widest mb-1" style={{ color: accent }}>
        {equipmentType}: no weapon yet
      </h3>
      <p className="text-xs mb-3" style={{ color: COLOR.mutedInk }}>
        Pick a weapon from the list, then press Assign. Nothing is saved until you do.
      </p>
      <WeaponInput
        label={`${equipmentType} Weapon`}
        value={text}
        onChange={setText}
        weapons={weapons}
        slot={equipmentType}
        placeholder={`e.g. ${equipmentType === 'Melee' ? 'Praedos' : 'Torid'}`}
      />
      <div className="mt-3">
        <Button variant="primary" color={accent} onClick={assign} disabled={!resolved || saving}>
          {saving ? 'Saving...' : resolved ? `Assign ${resolved}` : 'Assign weapon'}
        </Button>
      </div>
    </Panel>
  )
}
