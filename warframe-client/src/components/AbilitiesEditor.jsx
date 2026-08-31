import { useState } from 'react'
import { wfUser } from '../lib/supabase'
import { COLOR } from '../constants/theme'
import ModalShell from './ui/ModalShell'
import { computeAbilityStats } from '../utils/abilityStats'

// Base kit + Helminth subsume editor for the Warframe piece of the Loadout
// tab. Extracted from App.jsx's old standalone Abilities modal -- same
// Supabase writes, but instead of manually patching two copies of local
// state (abilitiesFrame + detailFrame) by hand, this just calls onSaved()
// and lets the normal refetchFrames() -> fresh `frame` prop flow update it,
// same as every other edit surface in the Loadout tab already does.
//
// Render this with `key={frame.my_frame_id}` from the caller so switching
// which Warframe is open resets the local config-slot/picker state instead
// of carrying it over from the previous frame.
const HELMINTH_ABILITIES = [
  'Airburst', 'Aquablades', 'Banish', 'Blood Altar', 'Breach Surge', 'Condemn',
  'Dark Verse', 'Defy', 'Dispensary', 'Eclipse', 'Ensnare', 'Fire Blast',
  'Gloom', 'Larva', 'Nourish', 'Pillage', 'Resonator', 'Roar', 'Silence',
  'Thermal Sunder', 'Warcry', 'Wrathful Advance',
]

export default function AbilitiesEditor({ frame, onSaved, color = COLOR.gold, abilityCanonicalByName = {}, buildStats }) {
  const configs = frame.ability_configs ?? []
  const sortedConfigs = configs.slice().sort((a, b) => a.config_slot.localeCompare(b.config_slot))

  const [activeConfigSlot, setActiveConfigSlot] = useState(sortedConfigs[0]?.config_slot ?? 'A')
  const [selectedAbilitySlot, setSelectedAbilitySlot] = useState(null)
  const [showHelminthPicker, setShowHelminthPicker] = useState(false)
  const [helminthSearch, setHelminthSearch] = useState('')

  const activeConfig = configs.find(c => c.config_slot === activeConfigSlot) ?? null

  async function saveHelminthConfig(helminthName) {
    if (!selectedAbilitySlot) return

    const { error } = await wfUser
      .from('ability_configs')
      .update({ subsumed_ability: helminthName, subsumed_slot: selectedAbilitySlot })
      .eq('my_frame_id', frame.my_frame_id)
      .eq('config_slot', activeConfigSlot)

    if (error) {
      console.error('Failed to save Helminth config:', error)
      return
    }

    setShowHelminthPicker(false)
    onSaved()
  }

  async function revertHelminthConfig() {
    if (!selectedAbilitySlot) return

    const { error } = await wfUser
      .from('ability_configs')
      .update({ subsumed_ability: null, subsumed_slot: null })
      .eq('my_frame_id', frame.my_frame_id)
      .eq('config_slot', activeConfigSlot)

    if (error) {
      console.error('Failed to revert Helminth config:', error)
      return
    }

    setSelectedAbilitySlot(null)
    onSaved()
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color }}>Abilities</h3>

        {sortedConfigs.length > 1 && (
          <div className="flex gap-2">
            {sortedConfigs.map(config => (
              <button
                key={config.config_id}
                onClick={() => { setActiveConfigSlot(config.config_slot); setSelectedAbilitySlot(null) }}
                className={`rounded-lg border px-3 py-1 text-xs ${
                  activeConfigSlot === config.config_slot ? 'border-current' : ''
                }`}
                style={{
                  color: activeConfigSlot === config.config_slot ? color : COLOR.mutedInk,
                  borderColor: activeConfigSlot === config.config_slot ? color : COLOR.border,
                  background: activeConfigSlot === config.config_slot ? `${color}18` : 'transparent',
                }}
              >
                {config.config_slot}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        {frame.abilities?.length > 0 ? (
          frame.abilities.map(ability => {
            const isSubsumed = activeConfig?.subsumed_slot === ability.ability_slot
            const displayedName = isSubsumed ? activeConfig.subsumed_ability : ability.ability_name
            const castContext = isSubsumed ? 'subsumed' : 'base'
            const canonical = abilityCanonicalByName?.[displayedName]

            // computeAbilityStats reuses computeModdedWarframeStats's own
            // field names (abilityDuration/abilityEfficiency/etc, already
            // 100-baseline percentages) -- no restatement needed beyond
            // this rename, see utils/survivability.js.
            const moddedStats = canonical && buildStats
              ? computeAbilityStats({
                  parameters: canonical.parameters,
                  buildStats: {
                    duration: buildStats.abilityDuration,
                    efficiency: buildStats.abilityEfficiency,
                    range: buildStats.abilityRange,
                    strength: buildStats.abilityStrength,
                    armor: buildStats.armor,
                  },
                  context: castContext,
                })
              : null

            return (
              <div
                key={ability.ability_slot}
                onClick={() => setSelectedAbilitySlot(ability.ability_slot)}
                className="rounded-lg border p-3 cursor-pointer transition-colors"
                style={{
                  borderColor: selectedAbilitySlot === ability.ability_slot ? color : COLOR.border,
                  background: selectedAbilitySlot === ability.ability_slot ? `${color}18` : COLOR.surface2,
                  color: COLOR.ink,
                }}
              >
                <div>
                  {ability.ability_slot}. {displayedName}

                  {isSubsumed && (
                    <span className="ml-2 text-xs uppercase tracking-widest" style={{ color }}>
                      Helminth
                    </span>
                  )}
                </div>

                {!canonical && (
                  <p className="mt-1 text-xs italic" style={{ color: COLOR.mutedInk }}>Not on file yet</p>
                )}

                {canonical && !moddedStats && (
                  <p className="mt-1 text-xs italic" style={{ color: COLOR.mutedInk }}>Waiting on build stats...</p>
                )}

                {moddedStats && moddedStats.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1" onClick={e => e.stopPropagation()}>
                    {moddedStats.map(stat => (
                      <span key={stat.parameterKey} className="text-xs" style={{ color: COLOR.mutedInk }}>
                        <span style={{ color: COLOR.ink }}>{stat.value === null ? '—' : stat.value}</span>
                        {stat.unit === 'percent' && stat.value !== null ? '%' : ''} {stat.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        ) : (
          <p style={{ color: COLOR.mutedInk }}>No ability data yet</p>
        )}
      </div>

      {selectedAbilitySlot && (
        <div className="mt-4 rounded-lg border p-4" style={{ borderColor: color }}>
          <p className="text-xs uppercase tracking-widest" style={{ color: COLOR.mutedInk }}>
            Selected Ability
          </p>
          <p className="mt-2 text-lg font-semibold" style={{ color: COLOR.ink }}>
            Slot {selectedAbilitySlot}
          </p>

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setShowHelminthPicker(true)}
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: COLOR.border, color: COLOR.ink }}
            >
              Replace with Helminth
            </button>
            <button
              onClick={revertHelminthConfig}
              className="rounded-lg border px-3 py-2 text-sm opacity-70 hover:opacity-100"
              style={{ borderColor: COLOR.border, color: COLOR.ink }}
            >
              Revert to Base Kit
            </button>
          </div>
        </div>
      )}

      {showHelminthPicker && (
        <ModalShell onClose={() => setShowHelminthPicker(false)} accent={color} zIndex={70} maxWidth="max-w-lg">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold" style={{ color: COLOR.ink }}>Select Helminth Ability</h2>
              <p className="text-sm" style={{ color: COLOR.mutedInk }}>Replacing Slot {selectedAbilitySlot}</p>
            </div>
            <button onClick={() => setShowHelminthPicker(false)} className="text-xl leading-none" style={{ color: COLOR.mutedInk }}>×</button>
          </div>

          <input
            value={helminthSearch}
            onChange={e => setHelminthSearch(e.target.value)}
            placeholder="Search Helminth abilities..."
            className="mb-4 w-full rounded-lg border px-4 py-3 outline-none"
            style={{ background: COLOR.surface2, border: `1px solid ${COLOR.border}`, color: COLOR.ink }}
          />

          <div className="max-h-[45vh] overflow-y-auto space-y-2">
            {HELMINTH_ABILITIES
              .filter(name => name.toLowerCase().includes(helminthSearch.toLowerCase()))
              .map(name => (
                <button
                  key={name}
                  onClick={() => saveHelminthConfig(name)}
                  className="block w-full rounded-lg border p-3 text-left"
                  style={{ borderColor: COLOR.border, color: COLOR.ink }}
                >
                  {name}
                </button>
              ))}
          </div>
        </ModalShell>
      )}
    </div>
  )
}
