import { useState, useEffect } from 'react'
import { wfUser } from '../lib/supabase'

const PANEL_BG = '#4A443B'
const BORDER = '#6F6A62'
const GOLD = '#FBBF24'
const MUTED = '#B8B3AC'

export default function AddFrameModal({ onClose, onFrameAdded }) {
  const [allFrames, setAllFrames] = useState([])
  const [search, setSearch] = useState('')
  const [selectedFrame, setSelectedFrame] = useState(null)
  const [buildTitle, setBuildTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchFrames() {
      const { data, error } = await wfUser
        .schema('wf_base')
        .from('warframes')
        .select('warframe_id, name')
        .order('name')
      if (error) console.error('Failed to fetch warframes:', error)
      setAllFrames(data ?? [])
    }
    fetchFrames()
  }, [])

  const filtered = allFrames
    .filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 8)

  async function handleCreate() {
  if (!selectedFrame || !buildTitle.trim()) return
  setSaving(true)

  // Check if frame already exists
  const { data: existing } = await wfUser
    .from('my_frames')
    .select('my_frame_id')
    .eq('warframe_id', selectedFrame.warframe_id)
    .single()

  if (existing) {
    setSaving(false)
    setError(`${selectedFrame.name} is already in your Codex.`)
    return
  }

  const { data, error } = await wfUser
    .from('my_frames')
    .insert({
      warframe_id: selectedFrame.warframe_id,
      display_name: selectedFrame.name,
      build_title: buildTitle.trim(),
    })
    .select()
    .single()

  setSaving(false)
  if (error) {
    console.error('Failed to create frame:', error)
    setError('Failed to create frame. Please try again.')
    return
  }
  onFrameAdded(data)
}

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-6"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border p-6 space-y-4"
        style={{ background: '#2F2A23', borderColor: `${GOLD}55` }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold" style={{ color: GOLD }}>Add Frame</h2>
          <button
            onClick={onClose}
            className="rounded-lg border px-3 py-1 text-sm"
            style={{ borderColor: BORDER, color: MUTED }}
          >
            Cancel
          </button>
        </div>

        {/* Frame name autocomplete */}
        <div className="relative">
          <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: '#9C9890' }}>Warframe</p>
          <input
            value={selectedFrame ? selectedFrame.name : search}
            onChange={e => {
              setSearch(e.target.value)
              setSelectedFrame(null)
              setShowDropdown(true)
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search warframes..."
            className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none"
            style={{
              borderColor: selectedFrame ? `${GOLD}88` : BORDER,
              color: '#E8E4DC'
            }}
          />
          {showDropdown && search && !selectedFrame && filtered.length > 0 && (
            <div
              className="absolute z-10 w-full mt-1 rounded-lg border overflow-hidden"
              style={{ background: '#2F2A23', borderColor: BORDER }}
            >
              {filtered.map(f => (
                <button
                  key={f.warframe_id}
                  onClick={() => {
                    setSelectedFrame(f)
                    setSearch(f.name)
                    setShowDropdown(false)
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-[#3A342C] transition-colors"
                  style={{ color: '#E8E4DC' }}
                >
                  {f.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Build title */}
        <div>
          <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: '#9C9890' }}>Build Title</p>
          <input
            value={buildTitle}
            onChange={e => setBuildTitle(e.target.value)}
            placeholder="e.g. Infested Monarch"
            className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none"
            style={{ borderColor: BORDER, color: '#E8E4DC' }}
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          onClick={handleCreate}
          disabled={!selectedFrame || !buildTitle.trim() || saving}
          className="w-full rounded-xl px-4 py-2.5 text-[10px] uppercase font-bold tracking-[0.25em]"
          style={{
            background: selectedFrame && buildTitle.trim() ? `${GOLD}22` : PANEL_BG,
            border: `1px solid ${selectedFrame && buildTitle.trim() ? `${GOLD}88` : BORDER}`,
            color: selectedFrame && buildTitle.trim() ? GOLD : MUTED,
            opacity: saving ? 0.5 : 1,
          }}
        >
          {saving ? 'Creating...' : 'Create Frame'}
        </button>
      </div>
    </div>
  )
}