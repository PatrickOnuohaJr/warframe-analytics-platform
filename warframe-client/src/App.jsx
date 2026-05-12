import { useEffect, useState } from 'react'
import FrameCard from './components/FrameCard'
import ShardEditModal from './components/ShardEditModal'
import BuildDetailOverlay from './components/BuildDetailOverlay'
import useFrames from './hooks/useFrames'
import useWeapons from './hooks/useWeapons'

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
  if (selectedSchool === 'All Schools') return '#FBBF24'

  const schoolFrame = frames.find(
    frame => frame.cultivation_school === selectedSchool && frame.cultivation_color
  )

  return schoolFrame?.cultivation_color ?? '#FBBF24'
}

export default function App() {
  const { frames, loading, refetchFrames } = useFrames()
  const { weapons, loadingWeapons } = useWeapons()

  const [editingFrame, setEditingFrame] = useState(null)
  const [editingInitialTab, setEditingInitialTab] = useState('loadout')
  const [detailFrame, setDetailFrame] = useState(null)
  const [selectedSchool, setSelectedSchool] = useState('All Schools')

  useEffect(() => {
    if (!detailFrame) return

    const updatedDetailFrame = frames.find(
      frame => frame.my_frame_id === detailFrame.my_frame_id
    )

    if (updatedDetailFrame) {
      setDetailFrame(updatedDetailFrame)
    }
  }, [frames])

  const schools = getSchools(frames)
  const schoolColor = getSchoolColor(frames, selectedSchool)

  const filteredFrames =
    selectedSchool === 'All Schools'
      ? frames
      : frames.filter(frame => frame.cultivation_school === selectedSchool)

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <p className="text-amber-400 text-lg tracking-widest uppercase">
          Loading...
        </p>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen text-white p-8 transition-colors"
      style={{
        background:
          selectedSchool === 'All Schools'
            ? '#0f0f0f'
            : `radial-gradient(circle at top left, ${schoolColor}22, #0f0f0f 35%, #0f0f0f 100%)`,
      }}
    >
      <div className="mb-8">
        <h1
          className="text-3xl font-bold tracking-widest uppercase mb-2"
          style={{ color: schoolColor }}
        >
          Warframe Jarvis
        </h1>

        <p className="text-white/30 text-sm mb-5">
          {filteredFrames.length} / {frames.length} builds
          {loadingWeapons && (
            <span className="ml-2 text-white/20">
              — loading weapons
            </span>
          )}
          {selectedSchool !== 'All Schools' && (
            <span style={{ color: schoolColor }}>
              {' '}— {selectedSchool}
            </span>
          )}
        </p>

        <div className="flex flex-wrap gap-2">
          {schools.map(school => {
            const isActive = school === selectedSchool
            const frameForSchool = frames.find(
              frame => frame.cultivation_school === school && frame.cultivation_color
            )

            const color =
              school === 'All Schools'
                ? '#FBBF24'
                : frameForSchool?.cultivation_color ?? '#6B7280'

            const schoolCount =
              school === 'All Schools'
                ? frames.length
                : frames.filter(frame => frame.cultivation_school === school).length

            return (
              <button
                key={school}
                onClick={() => setSelectedSchool(school)}
                className="rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-widest border transition-all"
                style={{
                  background: isActive ? `${color}22` : 'rgba(255,255,255,0.03)',
                  borderColor: isActive ? `${color}88` : 'rgba(255,255,255,0.08)',
                  color: isActive ? color : 'rgba(255,255,255,0.35)',
                  boxShadow: isActive ? `0 0 18px ${color}18` : 'none',
                }}
              >
                {school}
                <span className="ml-2 opacity-50">{schoolCount}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredFrames.map(frame => (
          <FrameCard
            key={frame.my_frame_id}
            frame={frame}
            onEdit={() => setDetailFrame(frame)}
          />
        ))}
      </div>

      {detailFrame && (
        <BuildDetailOverlay
          frame={detailFrame}
          onClose={() => setDetailFrame(null)}
          onEditArsenal={() => {
            setEditingInitialTab('loadout')
            setEditingFrame(detailFrame)
          }}
          onEditShards={() => {
            setEditingInitialTab('shards')
            setEditingFrame(detailFrame)
          }}
        />
      )}

      {editingFrame && (
        <ShardEditModal
          frame={editingFrame}
          frames={frames}
          weapons={weapons}
          initialTab={editingInitialTab}
          onClose={() => setEditingFrame(null)}
          onSaved={() => {
            setEditingFrame(null)
            refetchFrames()
          }}
        />
      )}
    </div>
  )
}