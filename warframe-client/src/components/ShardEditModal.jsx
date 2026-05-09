import { useState } from 'react'
import { wfUser } from '../lib/supabase'
import { SHARD_COLORS, SHARD_NAMES } from '../constants/shards'

export default function ShardEditModal({ frame, onClose, onSaved }) {
  const slots = frame.shard_slots
  const [activeSlot, setActiveSlot] = useState(0)
  const [saving, setSaving] = useState(false)

  const [shards, setShards] = useState(
    [1, 2, 3, 4, 5].map(i => ({
      color: slots?.[`shard_${i}_color`] ?? null,
      tauforged: slots?.[`shard_${i}_tauforged`] ?? false,
    }))
  )

  function setColor(color) {
    setShards(prev =>
      prev.map((s, i) => (i === activeSlot ? { ...s, color } : s))
    )
  }

  function toggleTau() {
    setShards(prev =>
      prev.map((s, i) =>
        i === activeSlot ? { ...s, tauforged: !s.tauforged } : s
      )
    )
  }

  function clearSlot() {
    setShards(prev =>
      prev.map((s, i) =>
        i === activeSlot ? { color: null, tauforged: false } : s
      )
    )
  }

  async function save() {
    setSaving(true)

    const payload = {}

    shards.forEach((s, i) => {
      payload[`shard_${i + 1}_color`] = s.color
      payload[`shard_${i + 1}_tauforged`] = s.tauforged
      payload[`shard_${i + 1}_tier`] = null
    })

    if (slots) {
      await wfUser
        .from('archon_shard_slots')
        .update(payload)
        .eq('my_frame_id', frame.my_frame_id)
    } else {
      await wfUser
        .from('archon_shard_slots')
        .insert({ my_frame_id: frame.my_frame_id, ...payload })
    }

    setSaving(false)
    onSaved()
  }

  const current = shards[activeSlot]

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-widest mb-0.5">
              Editing shards
            </p>
            <h2 className="text-white font-semibold text-lg">{frame.warframe_name}</h2>
          </div>

          <button
            onClick={onClose}
            className="text-white/30 hover:text-white text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <p className="text-[10px] text-white/30 uppercase tracking-widest mb-3">
          Select slot
        </p>

        <div
          className="flex gap-4 mb-6 justify-center"
          style={{ height: '44px', alignItems: 'flex-end' }}
        >
          {shards.map((s, i) => (
            <div
              key={i}
              onClick={() => setActiveSlot(i)}
              className="flex flex-col items-center gap-2 cursor-pointer"
              style={{ paddingBottom: '4px' }}
            >
              <div
                style={{
                  width: '14px',
                  height: '24px',
                  borderRadius: '4px',
                  transform: 'rotate(-35deg)',
                  background: s.color
                    ? SHARD_COLORS[s.color]
                    : 'rgba(255,255,255,0.08)',
                  border:
                    i === activeSlot
                      ? '2px solid white'
                      : '1px solid rgba(255,255,255,0.1)',
                  flexShrink: 0,
                  outline:
                    i === activeSlot ? '2px solid rgba(255,255,255,0.3)' : 'none',
                  outlineOffset: '3px',
                }}
              />

              <span
                className="text-[9px]"
                style={{
                  color:
                    i === activeSlot
                      ? 'rgba(255,255,255,0.6)'
                      : 'rgba(255,255,255,0.2)',
                }}
              >
                {i + 1}
              </span>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-white/30 uppercase tracking-widest mb-3">
          Color — slot {activeSlot + 1}
        </p>

        <div className="grid grid-cols-6 gap-2 mb-4">
          {SHARD_NAMES.map(name => (
            <div
              key={name}
              onClick={() => setColor(name)}
              className="flex flex-col items-center gap-1.5 cursor-pointer p-2 rounded-lg transition-colors"
              style={{
                background:
                  current.color === name ? 'rgba(255,255,255,0.08)' : 'transparent',
                border:
                  current.color === name
                    ? '1px solid rgba(255,255,255,0.2)'
                    : '1px solid transparent',
              }}
            >
              <div
                style={{
                  width: '14px',
                  height: '24px',
                  borderRadius: '4px',
                  transform: 'rotate(-35deg)',
                  background: SHARD_COLORS[name],
                }}
              />

              <span
                className="text-[8px] uppercase tracking-wide"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              >
                {name}
              </span>
            </div>
          ))}
        </div>

        <div
          className="flex items-center justify-between p-3 rounded-lg mb-4 cursor-pointer"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '0.5px solid rgba(255,255,255,0.08)',
          }}
          onClick={toggleTau}
        >
          <span className="text-sm text-white/60">Tauforged</span>

          <div
            className="rounded-full transition-colors"
            style={{
              width: '32px',
              height: '18px',
              background: current.tauforged
                ? '#FBBF24'
                : 'rgba(255,255,255,0.15)',
              position: 'relative',
            }}
          >
            <div
              style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: 'white',
                position: 'absolute',
                top: '2px',
                left: current.tauforged ? '16px' : '2px',
                transition: 'left 0.15s',
              }}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={clearSlot}
            className="flex-1 py-2 rounded-lg text-sm text-white/40 hover:text-white/60 transition-colors"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.08)',
            }}
          >
            Clear slot
          </button>

          <button
            onClick={save}
            disabled={saving}
            className="flex-1 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{
              background: 'rgba(251,191,36,0.15)',
              border: '0.5px solid rgba(251,191,36,0.4)',
              color: '#FBBF24',
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}