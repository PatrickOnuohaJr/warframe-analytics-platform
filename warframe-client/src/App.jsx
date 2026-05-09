import { useState } from 'react'
import FrameCard from './components/FrameCard'
import ShardEditModal from './components/ShardEditModal'
import useFrames from './hooks/useFrames'

export default function App() {
  const { frames, loading, refetchFrames } = useFrames()
  const [editingFrame, setEditingFrame] = useState(null)

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
    <div className="min-h-screen bg-[#0f0f0f] text-white p-8">
      <h1 className="text-3xl font-bold text-amber-400 tracking-widest uppercase mb-2">
        Warframe Jarvis
      </h1>

      <p className="text-white/30 text-sm mb-8">{frames.length} builds</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {frames.map(frame => (
          <FrameCard
            key={frame.my_frame_id}
            frame={frame}
            onEdit={() => setEditingFrame(frame)}
          />
        ))}
      </div>

      {editingFrame && (
        <ShardEditModal
          frame={editingFrame}
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