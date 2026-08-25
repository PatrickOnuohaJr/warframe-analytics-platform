import { useState, useEffect } from 'react'
import { wfUser } from '../lib/supabase'
import WarframeSelector from './Warframeselector'
import Button from './ui/Button'

const SCHOOLS = [
  'Adolla Pyric School',
  'Chronos Engineering Bureau',
  'Cosmic Antimatter Council',
  'Crimson Sanguinary School',
  'Desert Crown Reliquary',
  'Eidolon Bone Sect',
  "Hallowed Path of Heaven's Light",
  'Heavenly Mandate Pantheon',
  'Ironclad Mountain Hall',
  'Moonless Veil Order',
  'Necropolis Dominion',
  'Phantom Theater Conservatory',
  'Plague Garden Sect',
  'Storm Heaven Convocation',
  'Tidal Abyss Confraternity',
]

// Identity tab of BuildDetailOverlay: Warframe/Prime selection, build
// title/tier, cultivation identity fields, and frame deletion.
export default function IdentityTab({ frame, color, onSaved, onClose }) {
  const [identityForm, setIdentityForm] = useState({
    warframe_id: frame.warframe_id ?? null,
    display_name: frame.display_name ?? '',
    build_title: frame.build_title ?? '',
    tier: frame.tier ?? '',
    cultivation_school: frame.cultivation_school ?? '',
    cultivation_color: frame.cultivation_color ?? '',
    cultivation_art: frame.cultivation_art ?? '',
    cultivation_doctrine: frame.cultivation_doctrine ?? '',
  })
  const [identitySaving, setIdentitySaving] = useState(false)

  useEffect(() => {
    setIdentityForm({
      warframe_id: frame.warframe_id ?? null,
      display_name: frame.display_name ?? '',
      build_title: frame.build_title ?? '',
      tier: frame.tier ?? '',
      cultivation_school: frame.cultivation_school ?? '',
      cultivation_color: frame.cultivation_color ?? '',
      cultivation_art: frame.cultivation_art ?? '',
      cultivation_doctrine: frame.cultivation_doctrine ?? '',
    })
  }, [frame.my_frame_id, frame.warframe_id, frame.display_name, frame.build_title, frame.cultivation_art, frame.cultivation_school, frame.cultivation_color, frame.cultivation_doctrine, frame.tier])

  const [primeTarget, setPrimeTarget] = useState(null) // { warframe_id, name } | null

  useEffect(() => {
    let cancelled = false

    async function checkForPrime() {
      if (!identityForm.warframe_id) {
        setPrimeTarget(null)
        return
      }

      const { data: baseRow, error: baseError } = await wfUser
        .schema('wf_base')
        .from('warframes')
        .select('prime_variant_id, is_prime')
        .eq('warframe_id', identityForm.warframe_id)
        .single()

      if (cancelled) return

      if (baseError || !baseRow || baseRow.is_prime || !baseRow.prime_variant_id) {
        setPrimeTarget(null)
        return
      }

      const { data: primeRow, error: primeError } = await wfUser
        .schema('wf_base')
        .from('warframes')
        .select('warframe_id, name')
        .eq('warframe_id', baseRow.prime_variant_id)
        .single()

      if (cancelled) return

      setPrimeTarget(primeError || !primeRow ? null : primeRow)
    }

    checkForPrime()
    return () => { cancelled = true }
  }, [identityForm.warframe_id])

  async function saveIdentity() {
    setIdentitySaving(true)
    const { error } = await wfUser
      .from('my_frames')
      .update({
        warframe_id: identityForm.warframe_id || null,
        display_name: identityForm.display_name || null,
        build_title: identityForm.build_title || null,
        tier: identityForm.tier || null,
        cultivation_school: identityForm.cultivation_school || null,
        cultivation_color: identityForm.cultivation_color || null,
        cultivation_art: identityForm.cultivation_art || null,
        cultivation_doctrine: identityForm.cultivation_doctrine || null,
      })
      .eq('my_frame_id', frame.my_frame_id)
    setIdentitySaving(false)
    if (error) { console.error('Failed to save identity:', error); return }
    if (onSaved) onSaved()
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <WarframeSelector
            currentWarframeId={identityForm.warframe_id}
            currentDisplayName={identityForm.display_name}
            onSelect={({ warframe_id, name }) =>
              setIdentityForm(prev => ({ ...prev, warframe_id, display_name: name }))
            }
          />

          {primeTarget && (
            <button
              onClick={() => {
                setIdentityForm(prev => ({
                  ...prev,
                  warframe_id: primeTarget.warframe_id,
                  display_name: primeTarget.name,
                }))
              }}
              className="mt-2 rounded-lg px-4 py-2 text-sm uppercase tracking-widest"
              style={{
                background: '#FBBF2422',
                border: '1px solid #FBBF2488',
                color: '#FBBF24',
              }}
            >
              ✨ Prime to {primeTarget.name}
            </button>
          )}
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: '#9C9890' }}>Build Title</p>
          <input
            value={identityForm.build_title}
            onChange={e => setIdentityForm(prev => ({ ...prev, build_title: e.target.value }))}
            placeholder="e.g. Infested Monarch"
            className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none"
            style={{ borderColor: '#6F6A62', color: '#E8E4DC' }}
          />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: '#9C9890' }}>Tier</p>
          <select
            value={identityForm.tier}
            onChange={e => setIdentityForm(prev => ({ ...prev, tier: e.target.value }))}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ background: '#3A342C', borderColor: '#6F6A62', color: '#E8E4DC' }}
          >
            <option value="">No tier</option>
            <option value="S">S</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>
        </div>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: '#9C9890' }}>Cultivation School</p>
        <select
          value={identityForm.cultivation_school}
          onChange={e => setIdentityForm(prev => ({ ...prev, cultivation_school: e.target.value }))}
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
          style={{ background: '#3A342C', borderColor: '#6F6A62', color: '#E8E4DC' }}
        >
          <option value="">Select school</option>
          {SCHOOLS.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: '#9C9890' }}>Cultivation Art</p>
        <input
          value={identityForm.cultivation_art}
          onChange={e => setIdentityForm(prev => ({ ...prev, cultivation_art: e.target.value }))}
          placeholder="e.g. Infested Cordyceps Dao of the Mutating Host"
          className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none"
          style={{ borderColor: '#6F6A62', color: '#E8E4DC' }}
        />
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: '#9C9890' }}>Cultivation Doctrine</p>
        <p className="text-sm leading-relaxed" style={{ color: '#B8B3AC' }}>
          {frame.cultivation_doctrine ?? 'No doctrine set.'}
        </p>
      </div>
      <div className="flex gap-3 items-center">
        <Button variant="primary" color={color} onClick={saveIdentity} disabled={identitySaving}>
          {identitySaving ? 'Saving...' : 'Save Identity'}
        </Button>

        <Button
          variant="danger"
          onClick={async () => {
            const confirmed = window.confirm(
              `Remove ${frame.display_name} from your Codex? This cannot be undone.`
            )
            if (!confirmed) return
            const { error } = await wfUser
              .from('my_frames')
              .delete()
              .eq('my_frame_id', frame.my_frame_id)
            if (error) { console.error('Failed to delete frame:', error); return }
            if (onSaved) onSaved()
            onClose()
          }}
        >
          Remove from Codex
        </Button>
      </div>
    </div>
  )
}
