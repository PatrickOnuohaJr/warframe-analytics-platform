import { wfUser } from './lib/supabase'
import { useEffect, useState } from 'react'
import FrameCard from './components/FrameCard'
import ShardEditModal from './components/ShardEditModal'
import BuildDetailOverlay from './components/BuildDetailOverlay'
import useFrames from './hooks/useFrames'
import useWeapons from './hooks/useWeapons'
import ArcanesPage from './pages/ArcanesPage'
import ArchonShardsPage from './pages/ArchonShardsPage'
import HomePage from './pages/HomePage'
import AddFrameModal from './components/AddFrameModal'
import ArsenalSearchPage from './components/ArsenalSearchPage';
import ArmoryPage from './pages/ArmoryPage'
import ModsPage from './pages/ModsPage'
import { getReadableColor } from './utils/color'
import Button from './components/ui/Button'



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

  return getReadableColor(schoolFrame?.cultivation_color ?? GOLD)
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

  const hasGoal = target.some(s => s.color)
  if (!hasGoal) return 'conceptual'

  const fullySlotted = target.every((goalShard, i) => {
    if (!goalShard.color) return true
    return (
      current[i]?.color?.toLowerCase() === goalShard.color?.toLowerCase() &&
      current[i]?.tauforged === true
    )
  })

  return fullySlotted ? 'slotted' : 'planned'
}

function getFramePhysique(slots) {
  const shards = getShards(slots)
  const fusionColors = ['emerald', 'topaz', 'violet']

  const fusionShards = shards.filter(
    s => s.color && fusionColors.includes(s.color.toLowerCase())
  )
  const crimsonCount = shards.filter(s => s.color?.toLowerCase() === 'crimson').length
  const azureCount = shards.filter(s => s.color?.toLowerCase() === 'azure').length
  const fusionCount = fusionShards.length

  const counts = fusionShards.reduce((acc, shard) => {
    const color = shard.color.toLowerCase()
    acc[color] = (acc[color] || 0) + 1
    return acc
  }, {})

  if (counts.emerald === 5) return 'UNDYING PLAGUE PHYSIQUE'
  if (counts.topaz === 5) return 'SOLAR CROWN PHYSIQUE'
  if (counts.violet === 5) return 'IMMORTAL THUNDER PHYSIQUE'
  if (fusionCount >= 5) return 'APEX VARIANT CONSTITUTION'
  if (fusionCount >= 2) return 'VARIANT CONSTITUTION'
  if (crimsonCount >= 3) return 'SOVEREIGN FORCE PHYSIQUE'
  if (azureCount >= 3) return 'UNYIELDING HEAVEN PHYSIQUE'

  return null
}

export default function App() {
  const { frames, loading, refetchFrames } = useFrames()
  const { weapons, loadingWeapons } = useWeapons()
  const [editingFrame, setEditingFrame] = useState(null)
  const [detailFrame, setDetailFrame] = useState(null)
  const [selectedSchool, setSelectedSchool] = useState('All Schools')
  const [activePage, setActivePage] = useState('home')
  const [shardFilter, setShardFilter] = useState('all')
  const [physiqueFilter, setPhysiqueFilter] = useState('all')
  const [showAddFrame, setShowAddFrame] = useState(false)


    function handleShardFilterChange(value) {
      setShardFilter(value)
      setPhysiqueFilter('all')
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
    : frames.filter(f => f.cultivation_school === selectedSchool)

const bucketFiltered =
  shardFilter === 'all'
    ? schoolFiltered
    : schoolFiltered.filter(f => getShardBucket(f) === shardFilter)

const filteredFrames =
  physiqueFilter === 'all'
    ? bucketFiltered
    : bucketFiltered.filter(f => {
        const slots = shardFilter === 'planned'
          ? f.target_shards
          : f.shard_slots
        return getFramePhysique(slots) === physiqueFilter
      })
  

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
          Cephalon Gu
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
              onClick={() => setActivePage('home')}
              className="rounded-xl px-4 py-2 border text-[10px] uppercase font-bold tracking-[0.25em]"
              style={{
                background: activePage === 'home' ? `${GOLD}22` : PANEL_BG,
                color: activePage === 'home' ? GOLD : MUTED,
                borderColor: activePage === 'home' ? `${GOLD}88` : BORDER,
              }}
            >
              Home
            </button>

            <button
              onClick={() => setActivePage('codex')}
              className="rounded-xl px-4 py-2 border text-[10px] uppercase font-bold tracking-[0.25em]"
              style={{
                background: activePage === 'codex' ? `${GOLD}22` : PANEL_BG,
                color: activePage === 'codex' ? GOLD : MUTED,
                borderColor: activePage === 'codex' ? `${GOLD}88` : BORDER,
              }}
            >
              Codex
            </button>

            <button
              onClick={() => setActivePage('arsenal-search')}
              className="rounded-xl px-4 py-2 border text-[10px] uppercase font-bold tracking-[0.25em]"
              style={{
                background: activePage === 'arsenal-search' ? `${GOLD}22` : PANEL_BG,
                color: activePage === 'arsenal-search' ? GOLD : MUTED,
                borderColor: activePage === 'arsenal-search' ? `${GOLD}88` : BORDER,
              }}
            >
              Search
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

            <button
              onClick={() => setActivePage('armory')}
              className="rounded-xl px-4 py-2 border text-[10px] uppercase font-bold tracking-[0.25em]"
              style={{
                background:
                  activePage === 'armory'
                    ? `${GOLD}22`
                    : PANEL_BG,
                color:
                  activePage === 'armory'
                    ? GOLD
                    : MUTED,
                borderColor:
                  activePage === 'armory'
                    ? `${GOLD}88`
                    : BORDER,
              }}
            >
              Armory
            </button>

            <button
              onClick={() => setActivePage('mods')}
              className="rounded-xl px-4 py-2 border text-[10px] uppercase font-bold tracking-[0.25em]"
              style={{
                background:
                  activePage === 'mods'
                    ? `${GOLD}22`
                    : PANEL_BG,
                color:
                  activePage === 'mods'
                    ? GOLD
                    : MUTED,
                borderColor:
                  activePage === 'mods'
                    ? `${GOLD}88`
                    : BORDER,
              }}
            >
              Mods
            </button>
            </div>
          {activePage === 'codex' && (
            <div className="mb-4">
              <select
                value={shardFilter}
                onChange={(e) => handleShardFilterChange(e.target.value)}
                className="rounded-xl px-4 py-2 border text-[10px] uppercase font-bold tracking-[0.25em] outline-none"
                style={{
                  background: PANEL_BG,
                  color: shardFilter === 'all' ? MUTED : GOLD,
                  borderColor: shardFilter === 'all' ? BORDER : `${GOLD}88`,
                }}
              >    
              <option value="all">All Frames</option>
              <option value="slotted">Fully Slotted</option>
              <option value="planned">Planned</option>
              <option value="conceptual">Conceptual</option>
            </select>
          </div>
        )}
      

              {activePage === 'codex' && (shardFilter === 'slotted' || shardFilter === 'planned') && (
                <div className="mb-4">
                  <select
                    value={physiqueFilter}
                    onChange={(e) => setPhysiqueFilter(e.target.value)}
                    className="rounded-xl px-4 py-2 border text-[10px] uppercase font-bold tracking-[0.25em] outline-none"
                    style={{
                      background: PANEL_BG,
                      color: physiqueFilter === 'all' ? MUTED : GOLD,
                      borderColor: physiqueFilter === 'all' ? BORDER : `${GOLD}88`,
                    }}
                  >
                    <option value="all">All Physiques</option>
                    <option value="SOVEREIGN FORCE PHYSIQUE">Sovereign Force</option>
                    <option value="UNYIELDING HEAVEN PHYSIQUE">Unyielding Heaven</option>
                    <option value="VARIANT CONSTITUTION">Variant Constitution</option>
                    <option value="APEX VARIANT CONSTITUTION">Apex Variant Constitution</option>
                    <option value="UNDYING PLAGUE PHYSIQUE">Undying Plague</option>
                    <option value="SOLAR CROWN PHYSIQUE">Solar Crown</option>
                    <option value="IMMORTAL THUNDER PHYSIQUE">Immortal Thunder</option>
                  </select>
                </div>
              )}
          

      {activePage === 'codex' && (      
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
                : getReadableColor(frame?.cultivation_color ?? MUTED)

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

      {activePage === 'home' ? (
      <HomePage
        frames={frames}
        onOpenFrame={(frame) => setDetailFrame(frame)}
        onOpenTracker={() => setActivePage('archon-shards')}
        onOpenCodex={() => setActivePage('codex')}
      />
    ) : activePage === 'codex' ? (
      <>
        <div className="flex justify-end mb-4">
          <Button variant="primary" color={GOLD} onClick={() => setShowAddFrame(true)}>
            + Add Frame
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredFrames.map(frame => (
            <FrameCard
              key={frame.my_frame_id}
              frame={frame}
              onEdit={() => setDetailFrame(frame)}
            />
          ))}
        </div>
      </>
    ) : activePage === 'arcanes' ? (
      <ArcanesPage />
    ) : activePage === 'arsenal-search' ? (
      <ArsenalSearchPage
        onBack={() => setActivePage('home')}
        onOpenFrame={(myFrameId) => {
          const frame = frames.find(f => f.my_frame_id === myFrameId);
          if (frame) setDetailFrame(frame);
        }}
      />
    ) : activePage === 'armory' ? (
      <ArmoryPage frames={frames} refetchFrames={refetchFrames} />
    ) : activePage === 'mods' ? (
      <ModsPage />
    ) : (
          <ArchonShardsPage />
)}

      {detailFrame && (
        <BuildDetailOverlay
          frame={detailFrame}
          frames={frames}
          weapons={weapons}
          onClose={() =>
            setDetailFrame(null)
          }
          onEditShards={() => {
            setEditingFrame(
              detailFrame
            )
          }}

          onSaved={() => refetchFrames()}
        />
      )}

      {editingFrame && (
        <ShardEditModal
          frame={editingFrame}
          frames={frames}
          onClose={() =>
            setEditingFrame(null)
          }
          onSaved={() => {
            setEditingFrame(null)
            refetchFrames()
          }}
        />
      )}

      {showAddFrame && (
        <AddFrameModal
          onClose={() => setShowAddFrame(false)}
          onFrameAdded={(frame) => {
            setShowAddFrame(false)
            refetchFrames()
            setDetailFrame(frame)
          }}
        />
      )}
    </div>
  )
}