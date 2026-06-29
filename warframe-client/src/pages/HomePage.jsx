import { useState, useEffect } from 'react'
import { wfUser } from '../lib/supabase'
import FrameCard from '../components/FrameCard'

const PAGE_BG = '#2F2A23'
const PANEL_BG = '#4A443B'
const BORDER = '#6F6A62'
const GOLD = '#FBBF24'
const MUTED = '#B8B3AC'

const SHARD_CONFIG = [
  { type: 'crimson', label: 'Crimson', color: '#D63A3A' },
  { type: 'amber',   label: 'Amber',   color: '#E8B84B' },
  { type: 'azure',   label: 'Azure',   color: '#4A90D9' },
  { type: 'emerald', label: 'Emerald', color: '#4CAF50' },
  { type: 'topaz',   label: 'Topaz',   color: '#E08A3C' },
  { type: 'violet',  label: 'Violet',  color: '#9B59B6' },
]

function getCurrentMonday() {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff)).toISOString().split('T')[0]
}

export default function HomePage({ frames, onOpenFrame, onOpenTracker, onOpenCodex }) {
  const [invigorations, setInvigorations] = useState([])
  const [shardInventory, setShardInventory] = useState({})
  const [showInvigForm, setShowInvigForm] = useState(false)
  const [invigInputs, setInvigInputs] = useState([
    { frame_name: '', offense_buff: '', utility_buff: '' },
    { frame_name: '', offense_buff: '', utility_buff: '' },
    { frame_name: '', offense_buff: '', utility_buff: '' },
  ])
  const [editingInvig, setEditingInvig] = useState(null) // { index, inv }
  const [editInvigInput, setEditInvigInput] = useState({ frame_name: '', offense_buff: '', utility_buff: '' })

  const recentFrames = [...frames]
    .filter(f => f.updated_at)
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, 5)

  const attentionFrames = frames
    .filter(f => f.needs_attention)
    .slice(0, 5)

  useEffect(() => {
    fetchInvigorations()
    fetchShardInventory()
  }, [])

  async function fetchInvigorations() {
    const monday = getCurrentMonday()
    const { data, error } = await wfUser
      .from('helminth_invigorations')
      .select('*')
      .eq('week_start', monday)

    if (error) {
      console.error('Failed to fetch invigorations:', error)
      return
    }
    setInvigorations(data ?? [])
  }

  async function fetchShardInventory() {
    const { data, error } = await wfUser
      .from('archon_shard_inventory')
      .select('*')

    if (error) {
      console.error('Failed to fetch shard inventory:', error)
      return
    }

    const grouped = {}
    SHARD_CONFIG.forEach(({ type }) => {
      grouped[type] = { base: 0, tau: 0 }
    })
    data?.forEach(row => {
      if (!grouped[row.shard_type]) return
      grouped[row.shard_type][row.is_tauforged ? 'tau' : 'base'] = row.quantity
    })
    setShardInventory(grouped)
  }

  async function saveEditedInvig() {
    const monday = getCurrentMonday()

    const { error: deleteError } = await wfUser
      .from('helminth_invigorations')
      .delete()
      .eq('week_start', monday)
      .eq('frame_name', editingInvig.inv.frame_name)

    if (deleteError) {
      console.error('Failed to delete old invigoration:', deleteError)
      return
    }

    const { error: insertError } = await wfUser
      .from('helminth_invigorations')
      .insert([{ ...editInvigInput, week_start: monday }])

    if (insertError) {
      console.error('Failed to save invigoration:', insertError)
      return
    }

    setEditingInvig(null)
    fetchInvigorations()
  }

  const totalShards = Object.values(shardInventory)
    .reduce((sum, { base, tau }) => sum + base + tau, 0)

  return (
    <div className="space-y-8">

      {/* Recently Edited */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[9px] uppercase tracking-[0.25em]" style={{ color: MUTED }}>
            Recently Edited
          </p>
          <p className="text-[9px] uppercase tracking-[0.1em]" style={{ color: '#6F6A62' }}>
            Last {recentFrames.length} touched
          </p>
        </div>
        {recentFrames.length === 0 ? (
          <p className="text-sm" style={{ color: '#6F6A62' }}>No recently edited frames yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {recentFrames.map(frame => (
              <FrameCard
                key={frame.my_frame_id}
                frame={frame}
                onEdit={() => onOpenFrame(frame)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Needs Attention */}
      {attentionFrames.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[9px] uppercase tracking-[0.25em]" style={{ color: MUTED }}>
              Needs Attention
            </p>
            <p className="text-[9px] uppercase tracking-[0.1em]" style={{ color: '#6F6A62' }}>
              {attentionFrames.length} / 5 flagged
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {attentionFrames.map(frame => (
              <div key={frame.my_frame_id} className="relative">
                <div
                  className="absolute inset-0 rounded-xl pointer-events-none z-10"
                  style={{ border: '1px solid #E63946' }}
                />
                <FrameCard
                  frame={frame}
                  onEdit={() => onOpenFrame(frame)}
                />
                <span
                  className="absolute top-2 right-2 z-20 text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded"
                  style={{
                    background: 'rgba(230,57,70,0.2)',
                    border: '1px solid rgba(230,57,70,0.5)',
                    color: '#E63946',
                  }}
                >
                  Attention
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Helminth Invigorations */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[9px] uppercase tracking-[0.25em]" style={{ color: MUTED }}>
            Helminth Invigorations
          </p>
          <div className="flex items-center gap-2">
            <span
              className="text-[9px] uppercase tracking-[0.15em] px-2 py-0.5 rounded"
              style={{
                background: 'rgba(76,175,80,0.1)',
                border: '1px solid rgba(76,175,80,0.3)',
                color: '#4CAF50',
              }}
            >
              Week of {getCurrentMonday()}
            </span>
            {invigorations.length > 0 && (
              <button
                onClick={() => {
                  setInvigInputs(
                    invigorations.length > 0
                      ? invigorations.map(inv => ({
                          frame_name: inv.frame_name,
                          offense_buff: inv.offense_buff,
                          utility_buff: inv.utility_buff,
                        }))
                      : [
                          { frame_name: '', offense_buff: '', utility_buff: '' },
                          { frame_name: '', offense_buff: '', utility_buff: '' },
                          { frame_name: '', offense_buff: '', utility_buff: '' },
                        ]
                  )
                  setShowInvigForm(true)
                }}
                className="rounded-xl px-3 py-0.5 border text-[9px] uppercase font-bold tracking-[0.25em]"
                style={{ background: 'rgba(76,175,80,0.1)', borderColor: 'rgba(76,175,80,0.5)', color: '#4CAF50' }}
              >
                Edit
              </button>
            )}
          </div>
        </div>

        {invigorations.length === 0 ? (
          <div
            className="rounded-xl border p-4 flex items-center justify-between"
            style={{ background: PANEL_BG, borderColor: BORDER }}
          >
            <p className="text-sm" style={{ color: '#6F6A62' }}>
              No invigorations entered yet — update each Monday.
            </p>
            <button
              onClick={() => setShowInvigForm(true)}
              className="rounded-xl px-4 py-2 border text-[10px] uppercase font-bold tracking-[0.25em]"
              style={{ background: 'rgba(76,175,80,0.1)', borderColor: 'rgba(76,175,80,0.5)', color: '#4CAF50' }}
            >
              Enter This Week's
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {invigorations.map((inv, i) => (
              <div
                key={i}
                className="rounded-xl border p-4 cursor-pointer hover:brightness-110 transition-all"
                style={{ background: '#1E2E1E', borderColor: '#4CAF50' }}
                onClick={() => {
                  setEditingInvig({ index: i, inv })
                  setEditInvigInput({
                    frame_name: inv.frame_name,
                    offense_buff: inv.offense_buff,
                    utility_buff: inv.utility_buff,
                  })
                }}
              >
                <p
                  className="text-[9px] uppercase tracking-widest font-bold mb-1"
                  style={{ color: '#4CAF50' }}
                >
                  Invigorated
                </p>
                <p className="text-sm font-semibold mb-1" style={{ color: '#E8E4DC' }}>
                  {inv.frame_name}
                </p>
                <div className="flex flex-col gap-1 mt-2">
                  <span
                    className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded w-fit"
                    style={{ background: 'rgba(214,58,58,0.1)', border: '1px solid rgba(214,58,58,0.3)', color: '#D63A3A' }}
                  >
                    {inv.offense_buff}
                  </span>
                  <span
                    className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded w-fit"
                    style={{ background: 'rgba(76,175,80,0.1)', border: '1px solid rgba(76,175,80,0.3)', color: '#4CAF50' }}
                  >
                    {inv.utility_buff}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Invigoration entry form */}
        {showInvigForm && (
          <div className="mt-4 rounded-xl border p-4 space-y-4" style={{ background: PANEL_BG, borderColor: BORDER }}>
            {invigInputs.map((row, i) => (
              <div key={i} className="grid grid-cols-3 gap-3">
                <select
                  value={row.frame_name}
                  onChange={e => {
                    const updated = [...invigInputs]
                    updated[i].frame_name = e.target.value
                    setInvigInputs(updated)
                  }}
                  className="rounded-lg border px-3 py-2 text-sm outline-none"
                  style={{ background: PANEL_BG, borderColor: BORDER, color: row.frame_name ? '#E8E4DC' : '#6F6A62' }}
                >
                  <option value="">Select frame</option>
                  {[...frames]
                    .sort((a, b) => a.warframe_name.localeCompare(b.warframe_name))
                    .map(f => (
                      <option key={f.my_frame_id} value={f.warframe_name}>
                        {f.warframe_name}
                      </option>
                    ))
                  }
                </select>
                <select
                    value={row.offense_buff}
                    onChange={e => {
                        const updated = [...invigInputs]
                        updated[i].offense_buff = e.target.value
                        setInvigInputs(updated)
                    }}
                    className="rounded-lg border px-3 py-2 text-sm outline-none"
                    style={{ background: PANEL_BG, borderColor: BORDER, color: row.offense_buff ? '#E8E4DC' : '#6F6A62' }}
                    >
                    <option value="">Offense buff</option>
                    <option value="Ability Duration +100%">Ability Duration +100%</option>
                    <option value="Ability Range +100%">Ability Range +100%</option>
                    <option value="Ability Strength +200%">Ability Strength +200%</option>
                    <option value="Primary Crit Chance +200%">Primary Crit Chance +200%</option>
                    <option value="Primary Damage +250%">Primary Damage +250%</option>
                    <option value="Secondary Crit Chance +200%">Secondary Crit Chance +200%</option>
                    <option value="Secondary Damage +250%">Secondary Damage +250%</option>
                    <option value="Melee Crit Chance +200%">Melee Crit Chance +200%</option>
                    <option value="Melee Damage +250%">Melee Damage +250%</option>
                    </select>
                <select
                    value={row.utility_buff}
                    onChange={e => {
                        const updated = [...invigInputs]
                        updated[i].utility_buff = e.target.value
                        setInvigInputs(updated)
                    }}
                    className="rounded-lg border px-3 py-2 text-sm outline-none"
                    style={{ background: PANEL_BG, borderColor: BORDER, color: row.utility_buff ? '#E8E4DC' : '#6F6A62' }}
                    >
                    <option value="">Utility buff</option>
                    <option value="Armor +1000">Armor +1000</option>
                    <option value="Energy Max +200%">Energy Max +200%</option>
                    <option value="Energy Regen +2/s">Energy Regen +2/s</option>
                    <option value="Health +1000">Health +1000</option>
                    <option value="Health Regen +25/s">Health Regen +25/s</option>
                    <option value="Jump Resets 5">Jump Resets 5</option>
                    <option value="Sprint Speed +75%">Sprint Speed +75%</option>
                    <option value="Parkour Velocity +75%">Parkour Velocity +75%</option>
                    <option value="Ability Efficiency +75%">Ability Efficiency +75%</option>
                    <option value="Reload Speed +75%">Reload Speed +75%</option>
                    <option value="Status Immunity">Status Immunity</option>
                    </select>
              </div>
            ))}
            <div className="flex gap-3">
              <button
                onClick={submitInvigorations}
                className="rounded-xl px-4 py-2 border text-[10px] uppercase font-bold tracking-[0.25em]"
                style={{ background: 'rgba(76,175,80,0.1)', borderColor: 'rgba(76,175,80,0.5)', color: '#4CAF50' }}
              >
                Save Invigorations
              </button>
              <button
                onClick={() => setShowInvigForm(false)}
                className="rounded-xl px-4 py-2 border text-[10px] uppercase font-bold tracking-[0.25em]"
                style={{ background: 'transparent', borderColor: BORDER, color: MUTED }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Archon Shard Peek */}
      <div>
        <div
          className="rounded-xl border p-4 cursor-pointer hover:border-amber-400/40 transition-colors"
          style={{ background: PANEL_BG, borderColor: BORDER }}
          onClick={onOpenTracker}
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-[9px] uppercase tracking-[0.25em]" style={{ color: MUTED }}>
              Archon Shard Inventory — {totalShards} owned
            </p>
            <p className="text-[9px] uppercase tracking-[0.15em]" style={{ color: GOLD, opacity: 0.7 }}>
              Open tracker →
            </p>
          </div>
          <div className="grid grid-cols-6 gap-4">
            {SHARD_CONFIG.map(({ type, label, color }) => (
              <div key={type} className="text-center">
                <div
                  className="w-3 h-3 rounded-full mx-auto mb-1"
                  style={{ background: color }}
                />
                <p className="text-[8px] uppercase tracking-widest mb-1" style={{ color: '#6F6A62' }}>
                  {label}
                </p>
                <p className="text-sm font-medium" style={{ color: '#E8E4DC' }}>
                  {(shardInventory[type]?.base ?? 0) + (shardInventory[type]?.tau ?? 0)}
                </p>
                <p className="text-[9px]" style={{ color: GOLD }}>
                  {shardInventory[type]?.tau ?? 0} tau
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Single Invigoration Edit Modal */}
      {editingInvig && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-6"
          onClick={() => setEditingInvig(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border p-6 space-y-5"
            style={{ background: '#1C1814', borderColor: '#4CAF50' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[9px] uppercase tracking-[0.25em] mb-1" style={{ color: '#4CAF50' }}>
                  Editing Invigoration
                </p>
                <h2 className="text-xl font-bold" style={{ color: '#E8E4DC' }}>
                  {editingInvig.inv.frame_name}
                </h2>
              </div>
              <button
                onClick={() => setEditingInvig(null)}
                className="text-lg leading-none"
                style={{ color: MUTED }}
              >
                ×
              </button>
            </div>

            {/* Frame dropdown */}
            <div>
              <p className="text-[9px] uppercase tracking-[0.2em] mb-1.5" style={{ color: MUTED }}>Frame</p>
              <select
                value={editInvigInput.frame_name}
                onChange={e => setEditInvigInput(prev => ({ ...prev, frame_name: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                style={{ background: PANEL_BG, borderColor: BORDER, color: '#E8E4DC' }}
              >
                <option value="">Select frame</option>
                {[...frames]
                  .sort((a, b) => a.warframe_name.localeCompare(b.warframe_name))
                  .map(f => (
                    <option key={f.my_frame_id} value={f.warframe_name}>
                      {f.warframe_name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Offense buff */}
            <div>
              <p className="text-[9px] uppercase tracking-[0.2em] mb-1.5" style={{ color: MUTED }}>Offense Buff</p>
              <select
                value={editInvigInput.offense_buff}
                onChange={e => setEditInvigInput(prev => ({ ...prev, offense_buff: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                style={{ background: PANEL_BG, borderColor: BORDER, color: '#E8E4DC' }}
              >
                <option value="">Select offense buff</option>
                <option value="Ability Duration +100%">Ability Duration +100%</option>
                <option value="Ability Range +100%">Ability Range +100%</option>
                <option value="Ability Strength +200%">Ability Strength +200%</option>
                <option value="Primary Crit Chance +200%">Primary Crit Chance +200%</option>
                <option value="Primary Damage +250%">Primary Damage +250%</option>
                <option value="Secondary Crit Chance +200%">Secondary Crit Chance +200%</option>
                <option value="Secondary Damage +250%">Secondary Damage +250%</option>
                <option value="Melee Crit Chance +200%">Melee Crit Chance +200%</option>
                <option value="Melee Damage +250%">Melee Damage +250%</option>
              </select>
            </div>

            {/* Utility buff */}
            <div>
              <p className="text-[9px] uppercase tracking-[0.2em] mb-1.5" style={{ color: MUTED }}>Utility Buff</p>
              <select
                value={editInvigInput.utility_buff}
                onChange={e => setEditInvigInput(prev => ({ ...prev, utility_buff: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                style={{ background: PANEL_BG, borderColor: BORDER, color: '#E8E4DC' }}
              >
                <option value="">Select utility buff</option>
                <option value="Armor +1000">Armor +1000</option>
                <option value="Energy Max +200%">Energy Max +200%</option>
                <option value="Energy Regen +2/s">Energy Regen +2/s</option>
                <option value="Health +1000">Health +1000</option>
                <option value="Health Regen +25/s">Health Regen +25/s</option>
                <option value="Jump Resets 5">Jump Resets 5</option>
                <option value="Sprint Speed +75%">Sprint Speed +75%</option>
                <option value="Parkour Velocity +75%">Parkour Velocity +75%</option>
                <option value="Ability Efficiency +75%">Ability Efficiency +75%</option>
                <option value="Reload Speed +75%">Reload Speed +75%</option>
                <option value="Status Immunity">Status Immunity</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={saveEditedInvig}
                className="flex-1 rounded-xl px-4 py-2 border text-[10px] uppercase font-bold tracking-[0.25em]"
                style={{ background: 'rgba(76,175,80,0.1)', borderColor: 'rgba(76,175,80,0.5)', color: '#4CAF50' }}
              >
                Save
              </button>
              <button
                onClick={() => setEditingInvig(null)}
                className="rounded-xl px-4 py-2 border text-[10px] uppercase font-bold tracking-[0.25em]"
                style={{ background: 'transparent', borderColor: BORDER, color: MUTED }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Open Codex CTA */}
      <button
        onClick={onOpenCodex}
        className="rounded-xl border px-5 py-2.5 text-[10px] uppercase font-bold tracking-[0.25em] transition-colors hover:border-amber-400/40"
        style={{ background: 'transparent', borderColor: BORDER, color: MUTED }}
      >
        Open full codex — {frames.length} frames
      </button>

    </div>
  )
}