import { useEffect, useState } from 'react'
import FrameCard from './components/FrameCard'
import ShardEditModal from './components/ShardEditModal'
import BuildDetailOverlay from './components/BuildDetailOverlay'
import useFrames from './hooks/useFrames'
import useWeapons from './hooks/useWeapons'

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

export default function App() {
  const { frames, loading, refetchFrames } = useFrames()
  const { weapons, loadingWeapons } = useWeapons()

  const [editingFrame, setEditingFrame] = useState(null)
  const [editingInitialTab, setEditingInitialTab] = useState('loadout')
  const [detailFrame, setDetailFrame] = useState(null)
  const [selectedSchool, setSelectedSchool] = useState('All Schools')

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

  const filteredFrames =
    selectedSchool === 'All Schools'
      ? frames
      : frames.filter(
          f => f.cultivation_school === selectedSchool
        )

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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredFrames.map(frame => (
          <FrameCard
            key={frame.my_frame_id}
            frame={frame}
            onEdit={() =>
              setDetailFrame(frame)
            }
          />
        ))}
      </div>

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