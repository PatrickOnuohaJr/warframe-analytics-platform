import { wfUser } from './lib/supabase'
import { useEffect, useState } from 'react'
import FrameCard from './components/FrameCard'
import ShardEditModal from './components/ShardEditModal'
import BuildDetailOverlay from './components/BuildDetailOverlay'
import useFrames from './hooks/useFrames'
import useWeapons from './hooks/useWeapons'
import ArcanesPage from './pages/ArcanesPage'
import ArchonShardsPage from './pages/ArchonShardsPage'


const PAGE_BG = '#2F2A23'
const PANEL_BG = '#4A443B'
const BORDER = '#6F6A62'
const INK = '#E8E4DC'
const MUTED = '#B8B3AC'
const AGED_INK = '#9C9890'
const GOLD = '#FBBF24'

function getSchools(frames) {
  return [
    'All Schools',
    ...new Set(
      frames
        .map(frame => frame.cultivation_school)
        .filter(Boolean)
        .sort()
    ),
  ]
}

function getSchoolColor(frames, selectedSchool) {
  if (selectedSchool === 'All Schools') return GOLD

  const schoolFrame = frames.find(
    frame =>
      frame.cultivation_school === selectedSchool &&
      frame.cultivation_color
  )

  return schoolFrame?.cultivation_color ?? GOLD
}

function getShards(slots) {
  return [1, 2, 3, 4, 5].map(i => ({
    color: slots?.[`shard_${i}_color`] ?? null,
    tauforged: slots?.[`shard_${i}_tauforged`] ?? false,
  }))
}

function getShardBucket(frame) {
  const current = getShards(frame.shard_slots)
  const target = getShards(frame.target_shards)

  const hasNow = current.some(s => s.color)
  const hasGoal = target.some(s => s.color)

  if (hasGoal && hasNow) return 'confirmed'
  if (hasGoal && !hasNow) return 'pending'
  return 'untouched'
}

export default function App() {
  const { frames, loading, refetchFrames } = useFrames()
  const { weapons, loadingWeapons } = useWeapons()
  const [abilitiesFrame, setAbilitiesFrame] = useState(null)
  const [editingFrame, setEditingFrame] = useState(null)
  const [editingInitialTab, setEditingInitialTab] = useState('loadout')
  const [detailFrame, setDetailFrame] = useState(null)
  const [selectedSchool, setSelectedSchool] = useState('All Schools')
  const [activePage, setActivePage] = useState('loadouts')
  const [subsumedAbility, setSubsumedAbility] = useState('')
  const [subsumedSlot, setSubsumedSlot] = useState('')
  const [activeAbilityConfig, setActiveAbilityConfig] = useState('A')
  const [selectedAbilitySlot, setSelectedAbilitySlot] = useState(null)
  const [showHelminthPicker, setShowHelminthPicker] = useState(false)
  const [helminthSearch, setHelminthSearch] = useState('')
  const [shardFilter, setShardFilter] = useState('all')



    async function saveHelminthConfig(helminthName) {
    if (!abilitiesFrame || !selectedAbilitySlot) return

    const { error } = await wfUser
      .from('ability_configs')
      .update({
        subsumed_ability: helminthName,
        subsumed_slot: selectedAbilitySlot,
      })
      .eq('my_frame_id', abilitiesFrame.my_frame_id)
      .eq('config_slot', activeAbilityConfig)

    console.log('SUPABASE ERROR:', error)

    if (error) {
      console.error('Failed to save Helminth config:', error)
      return
    }

    const updatedConfigs = abilitiesFrame.ability_configs.map(config =>
      config.config_slot === activeAbilityConfig
        ? {
            ...config,
            subsumed_ability: helminthName,
            subsumed_slot: selectedAbilitySlot,
          }
        : config
    )

    setAbilitiesFrame(prev => ({
      ...prev,
      ability_configs: updatedConfigs,
    }))

    setDetailFrame(prev => ({
      ...prev,
      ability_configs: updatedConfigs,
    }))

    setShowHelminthPicker(false)
  }

  async function revertHelminthConfig() {
  if (!abilitiesFrame || !selectedAbilitySlot) return

  const { error } = await wfUser
    .from('ability_configs')
    .update({
      subsumed_ability: null,
      subsumed_slot: null,
    })
    .eq('my_frame_id', abilitiesFrame.my_frame_id)
    .eq('config_slot', activeAbilityConfig)

  if (error) {
    console.error('Failed to revert Helminth config:', error)
    return
  }

  const updatedConfigs = abilitiesFrame.ability_configs.map(config =>
    config.config_slot === activeAbilityConfig
      ? {
          ...config,
          subsumed_ability: null,
          subsumed_slot: null,
        }
      : config
  )

  setAbilitiesFrame(prev => ({
    ...prev,
    ability_configs: updatedConfigs,
  }))

  setDetailFrame(prev => ({
    ...prev,
    ability_configs: updatedConfigs,
  }))

  setSelectedAbilitySlot(null)
}


  useEffect(() => {
    if (!detailFrame) return

    const updated = frames.find(
      f => f.my_frame_id === detailFrame.my_frame_id
    )

    if (updated) {
      setDetailFrame(updated)
    }
  }, [frames])

  const schools = getSchools(frames)
  const schoolColor = getSchoolColor(frames, selectedSchool)

  const schoolFiltered =
    selectedSchool === 'All Schools'
      ? frames
      : frames.filter(
          f => f.cultivation_school === selectedSchool
        )

  const filteredFrames =
    shardFilter === 'all'
      ? schoolFiltered
      : schoolFiltered.filter(f => getShardBucket(f) === shardFilter)
  

  const selectedAbilityConfig =
  abilitiesFrame?.ability_configs?.find(
    config => config.config_slot === activeAbilityConfig
  ) ?? null


  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: PAGE_BG,
          color: GOLD,
        }}
      >
        <p className="text-lg font-bold uppercase tracking-[0.3em]">
          Loading Codex...
        </p>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen p-8 transition-all"
      style={{
        color: INK,
        background:
          selectedSchool === 'All Schools'
            ? PAGE_BG
            : `
              radial-gradient(
                circle at top left,
                ${schoolColor}22,
                ${PAGE_BG} 35%,
                ${PAGE_BG}
              )
            `,
      }}
    >
      <div className="mb-8">

        <h1
          className="text-3xl font-bold tracking-[0.35em] uppercase mb-2"
          style={{
            color:
              selectedSchool === 'All Schools'
                ? GOLD
                : schoolColor,
          }}
        >
          Warframe Jarvis
        </h1>

        <p
          className="text-sm mb-6"
          style={{ color: MUTED }}
        >
          {filteredFrames.length} / {frames.length} builds

          {loadingWeapons && (
            <span className="ml-2 opacity-70">
              — loading weapons
            </span>
          )}

          {selectedSchool !== 'All Schools' && (
            <span style={{ color: schoolColor }}>
              {' '}— {selectedSchool}
            </span>
          )}
        </p>


          <div className="flex gap-2 mb-6">

            <button
              onClick={() => setActivePage('loadouts')}
              className="rounded-xl px-4 py-2 border text-[10px] uppercase font-bold tracking-[0.25em]"
              style={{
                background:
                  activePage === 'loadouts'
                    ? `${GOLD}22`
                    : PANEL_BG,
                color:
                  activePage === 'loadouts'
                    ? GOLD
                    : MUTED,
                borderColor:
                  activePage === 'loadouts'
                    ? `${GOLD}88`
                    : BORDER,
              }}
            >
              Loadouts
            </button>

            <button
              onClick={() => setActivePage('arcanes')}
              className="rounded-xl px-4 py-2 border text-[10px] uppercase font-bold tracking-[0.25em]"
              style={{
                background:
                  activePage === 'arcanes'
                    ? `${GOLD}22`
                    : PANEL_BG,
                color:
                  activePage === 'arcanes'
                    ? GOLD
                    : MUTED,
                borderColor:
                  activePage === 'arcanes'
                    ? `${GOLD}88`
                    : BORDER,
              }}
            >
              Arcanes
            </button>

            <button
              onClick={() => setActivePage('archon-shards')}
              className="rounded-xl px-4 py-2 border text-[10px] uppercase font-bold tracking-[0.25em]"
              style={{
                background:
                  activePage === 'archon-shards'
                    ? `${GOLD}22`
                    : PANEL_BG,
                color:
                  activePage === 'archon-shards'
                    ? GOLD
                    : MUTED,
                borderColor:
                  activePage === 'archon-shards'
                    ? `${GOLD}88`
                    : BORDER,
              }}
            >
              Archon Shards
            </button>
            </div>
          {activePage === 'loadouts' && (
            <div className="mb-4">
              <select
                value={shardFilter}
                onChange={(e) => setShardFilter(e.target.value)}
                className="rounded-xl px-4 py-2 border text-[10px] uppercase font-bold tracking-[0.25em] outline-none"
                style={{
                  background: PANEL_BG,
                  color: shardFilter === 'all' ? MUTED : GOLD,
                  borderColor: shardFilter === 'all' ? BORDER : `${GOLD}88`,
                }}
              >
                <option value="all">All Shards</option>
                <option value="confirmed">Goal Complete</option>
                <option value="pending">Goal Pending</option>
                <option value="untouched">No Goal Set</option>
              </select>
            </div>
          )}
          

      {activePage === 'loadouts' && (      
        <div className="flex flex-wrap gap-2">

          {schools.map(school => {
            const active =
              selectedSchool === school

            const frame =
              frames.find(
                f =>
                  f.cultivation_school === school &&
                  f.cultivation_color
              )

            const color =
              school === 'All Schools'
                ? GOLD
                : frame?.cultivation_color ?? MUTED

            const count =
              school === 'All Schools'
                ? frames.length
                : frames.filter(
                    f =>
                      f.cultivation_school === school
                  ).length

            return (
              <button
                key={school}
                onClick={() =>
                  setSelectedSchool(school)
                }
                className="rounded-xl px-4 py-2 border text-[10px] uppercase font-bold tracking-[0.25em] transition-all"
                style={{
                  background:
                    active
                      ? `${color}22`
                      : PANEL_BG,

                  color:
                    active
                      ? color
                      : MUTED,

                  borderColor:
                    active
                      ? `${color}88`
                      : BORDER,

                  boxShadow:
                    active
                      ? `0 0 18px ${color}18`
                      : 'none',
                }}
              >
                {school}

                <span
                  className="ml-2"
                  style={{
                    color:
                      active
                        ? color
                        : AGED_INK,
                  }}
                >
                  {count}
                </span>
              </button>
            )
          })}

      </div>
    )}
      </div>

      {activePage === 'loadouts' ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredFrames.map(frame => (
          <FrameCard
            key={frame.my_frame_id}
            frame={frame}
            onEdit={() => setDetailFrame(frame)}
          />
        ))}
      </div>
    ) : activePage === 'arcanes' ? (
      <ArcanesPage />
    ) : (
      <ArchonShardsPage />
)}

      {detailFrame && (
        <BuildDetailOverlay
          frame={detailFrame}
          onClose={() =>
            setDetailFrame(null)
          }
          onEditArsenal={() => {
            setEditingInitialTab(
              'loadout'
            )
            setEditingFrame(
              detailFrame
            )
          }}

          onEditAbilities={() => {
            console.log('ABILITY CONFIGS:', detailFrame.ability_configs)

            const configStillExists =
              detailFrame.ability_configs?.some(
                config => config.config_slot === activeAbilityConfig
              )

            if (!configStillExists) {
              setActiveAbilityConfig(
                detailFrame.ability_configs
                  ?.slice()
                  .sort((a, b) => a.config_slot.localeCompare(b.config_slot))[0]
                  ?.config_slot || 'A'
              )
            }

            setAbilitiesFrame(detailFrame)
            setSubsumedAbility(detailFrame.subsumed_ability || '')
            setSubsumedSlot(detailFrame.subsumed_slot || '')
          }}
          onEditShards={() => {
            setEditingInitialTab(
              'shards'
            )
            setEditingFrame(
              detailFrame
            )
          }}
        />
      )}

    {abilitiesFrame && (
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-6"
        onClick={() => setAbilitiesFrame(null)}
>
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-3xl rounded-2xl border border-[#FBBF24] bg-[#2F2A23] p-6"
        >
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold">
                {abilitiesFrame.warframe_name} Abilities
              </h2>
              <p className="text-sm opacity-70">
                Base kit and Helminth configuration
              </p>

              <div className="flex gap-2 mb-4">
                {abilitiesFrame.ability_configs
                  ?.slice()
                  .sort((a, b) => a.config_slot.localeCompare(b.config_slot))
                  .map(config => (
                  <button
                    key={config.config_id}
                    onClick={() => {
                      console.log('CONFIG CLICKED:', config.config_slot)
                      setActiveAbilityConfig(config.config_slot)
                    }}
                    className={`rounded-lg border px-4 py-2 text-sm ${
                      activeAbilityConfig === config.config_slot
                        ? 'border-[#FBBF24] bg-[#443D34]'
                        : ''
                    }`}
                  >
                    {config.config_slot}
                  </button>
                ))}
              </div>

            </div>

            <button
              onClick={() => setAbilitiesFrame(null)}
              className="rounded-lg border px-3 py-1 text-sm"
            >
              Close
            </button>
          </div>

          <div className="space-y-2">
              {abilitiesFrame.abilities?.map(ability => (
                <div
                  key={ability.ability_slot}
                  onClick={() => {
                    console.log('ABILITY SLOT CLICKED:', ability.ability_slot)
                    setSelectedAbilitySlot(ability.ability_slot)
                  }}
                  className={`rounded-lg border p-3 cursor-pointer transition-all hover:border-[#FBBF24] hover:bg-[#443D34] ${
                    selectedAbilitySlot === ability.ability_slot
                      ? 'border-[#FBBF24] bg-[#443D34]'
                      : ''
                  }`}
                >
                  {ability.ability_slot}. {
                    selectedAbilityConfig?.subsumed_slot === ability.ability_slot
                      ? selectedAbilityConfig.subsumed_ability
                      : ability.ability_name
                  }

                  {selectedAbilityConfig?.subsumed_slot === ability.ability_slot && (
                    <span className="ml-2 text-xs uppercase tracking-widest text-[#FBBF24]">
                      Helminth
                    </span>
                  )}
                </div>
              ))}

            {selectedAbilitySlot && (
              <div className="mt-4 rounded-lg border border-[#FBBF24] p-4">
                <p className="text-xs uppercase tracking-widest opacity-70">
                  Selected Ability
                </p>

                <p className="mt-2 text-lg font-semibold">
                  Slot {selectedAbilitySlot}
                </p>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => {
                      setShowHelminthPicker(true)
                    }}
                    className="rounded-lg border px-3 py-2 text-sm hover:border-[#FBBF24] hover:bg-[#443D34]"
                  >
                    Replace with Helminth
                  </button>

                  <button
                    onClick={() => {
                      console.log('REVERT SLOT:', selectedAbilitySlot)
                      revertHelminthConfig()
                    }}
                    className="rounded-lg border px-3 py-2 text-sm opacity-70 hover:opacity-100"
                  >
                    Revert to Base Kit
                  </button>
                </div>
                
              {showHelminthPicker && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-6">
                  <div className="w-full max-w-3xl rounded-2xl border border-[#FBBF24] bg-[#2F2A23] p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h2 className="text-2xl font-bold">Select Helminth Ability</h2>
                        <p className="text-sm opacity-70">
                          Replacing Slot {selectedAbilitySlot}
                        </p>
                      </div>

                      <button
                        onClick={() => setShowHelminthPicker(false)}
                        className="rounded-lg border px-3 py-1 text-sm"
                      >
                        Close
                      </button>
                    </div>

                    <input
                      value={helminthSearch}
                      onChange={(e) => setHelminthSearch(e.target.value)}
                      placeholder="Search Helminth abilities..."
                      className="mb-4 w-full rounded-lg border bg-transparent px-4 py-3 outline-none"
                    />

                    <div className="max-h-[45vh] overflow-y-auto space-y-2">
                      {[
                        'Airburst',
                        'Aquablades',
                        'Banish',
                        'Blood Altar',
                        'Breach Surge',
                        'Condemn',
                        'Dark Verse',
                        'Defy',
                        'Dispensary',
                        'Eclipse',
                        'Ensnare',
                        'Fire Blast',
                        'Gloom',
                        'Larva',
                        'Nourish',
                        'Pillage',
                        'Resonator',
                        'Roar',
                        'Silence',
                        'Thermal Sunder',
                        'Warcry',
                        'Wrathful Advance'
                      ]
                        .filter(name =>
                          name.toLowerCase().includes(helminthSearch.toLowerCase())
                        )
                        .map(name => (
                          <button
                            key={name}
                            onClick={() => {
                              console.log('SELECTED HELMINTH:', name)
                              saveHelminthConfig(name)
                              setShowHelminthPicker(false)

                              
                            }}
                            className="block w-full rounded-lg border p-3 text-left hover:border-[#FBBF24] hover:bg-[#443D34]"
                          >
                            {name}
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              )}
              
              </div>
            )}  


              <div className="mt-6 rounded-lg border p-4">
                <p className="text-xs uppercase tracking-widest opacity-70">
                  Helminth
                </p>

                <p className="mt-2 font-semibold">
                  {abilitiesFrame?.subsumed_ability || 'No subsume'}
                </p>

                <p className="text-sm opacity-70">
                  {abilitiesFrame?.subsumed_slot
                    ? `Replaced Slot ${abilitiesFrame.subsumed_slot}`
                    : ''}
                </p>
              </div>
            </div>
        </div>
      </div>
    )}

    
      {editingFrame && (
        <ShardEditModal
          frame={editingFrame}
          frames={frames}
          weapons={weapons}
          initialTab={
            editingInitialTab
          }
          onClose={() =>
            setEditingFrame(null)
          }
          onSaved={() => {
            setEditingFrame(null)
            refetchFrames()
          }}
        />
      )}
    </div>
  )
}