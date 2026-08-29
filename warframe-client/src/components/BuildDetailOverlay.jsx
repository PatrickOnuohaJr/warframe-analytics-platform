import { useState } from 'react'
import ShardChip from './ShardChip'
import { getTauBonusText } from '../constants/shardBonuses'
import { wfUser } from '../lib/supabase'
import TestingLogTab from './TestingLogTab'
import IdentityTab from './IdentityTab'
import ModsLoadoutTab from './ModsLoadoutTab'
import CompanionTab from './CompanionTab'
import SurvivabilityTab from './SurvivabilityTab'
import { getReadableColor } from '../utils/color'
import Panel from './ui/Panel'

function getShards(slots) {
  return [1, 2, 3, 4, 5].map(i => ({
    color: slots?.[`shard_${i}_color`] ?? null,
    tauforged: slots?.[`shard_${i}_tauforged`] ?? false,
    bonus: slots?.[`shard_${i}_bonus`] ?? '',
  }))
}


function TabButton({ active, color, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="py-2 px-4 rounded-lg text-sm font-semibold transition-colors"
      style={{
        background: active ? `${color}18` : '#3A342C',
        border: active ? `1px solid ${color}55` : '1px solid #6F6A62',
        color: active ? color : 'rgba(255,255,255,0.4)',
      }}
    >
      {children}
    </button>
  )
}


function getSchoolIcon(schoolLabel = '') {
  const s = schoolLabel.toLowerCase()

  if (s.includes('sanguinary')) return '✣'
  if (s.includes('pyric')) return '✹'
  if (s.includes('hallowed')) return '✥'
  if (s.includes('heavenly mandate')) return '☯'
  if (s.includes('storm heaven')) return '⚡'
  if (s.includes('moonless veil')) return '◐'
  if (s.includes('necropolis')) return '☠'
  if (s.includes('plague garden')) return '✤'
  if (s.includes('tidal abyss')) return '≋'
  if (s.includes('cosmic antimatter')) return '✧'
  if (s.includes('desert crown')) return '𓂀'
  if (s.includes('ironclad mountain')) return '⬢'
  if (s.includes('phantom theater')) return '♪'
  if (s.includes('chronos engineering')) return '⌬'

  return '✦'
}

function formatShardLabel(shard) {
  if (!shard.color) return null

  const shardColor =
    shard.color.charAt(0).toUpperCase() +
    shard.color.slice(1)

  const bonus = shard.tauforged
    ? getTauBonusText(shard.bonus)
    : shard.bonus

  return `${shard.tauforged ? 'Tauforged ' : ''}${shardColor}${bonus ? ` — ${bonus}` : ''}`
}

function getConstitutionLabel(shards) {
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

function ShardLine({ label, shards, muted = false }) {
  return (
    <div>
      <p className="text-[10px] text-[#9C9890] uppercase tracking-widest mb-3">
        {label}
      </p>

      <div className="flex gap-4 items-center mb-3">
        {shards.map((shard, index) => (
          <ShardChip
            key={index}
            color={shard.color}
            tauforged={shard.tauforged}
            size="lg"
            muted={muted}
            tooltip={formatShardLabel(shard)}
          />
        ))}
      </div>

      <div className="space-y-1">
        {shards.map((shard, index) => {
          const label = formatShardLabel(shard)
          if (!label) return null

          return (
            <p
              key={index}
              className="text-[11px] text-[#B8B3AC] leading-relaxed"
            >
              Slot {index + 1}: {label}
            </p>
          )
        })}
      </div>
    </div>
  )
}

export default function BuildDetailOverlay({
  frame,
  frames = [],
  weapons = [],
  onClose,
  onEditShards,
  onSaved,
}) {
  const color = getReadableColor(frame.cultivation_color ?? '#FBBF24')
  const school = frame.cultivation_school ?? 'Unknown School'
  const art = frame.cultivation_art ?? 'Cultivation identity pending'
  const icon = getSchoolIcon(school)
  const currentShards = getShards(frame.shard_slots)
  const targetShards = getShards(frame.target_shards)
  const currentConstitution = getConstitutionLabel(currentShards)
  const targetConstitution = getConstitutionLabel(targetShards)
  const [activeTab, setActiveTab] = useState('identity')

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto text-[#E8E4DC] backdrop-blur-xl"
      style={{
        background: `radial-gradient(circle at top left, ${color}18, #2F2A23 32%, #2F2A23 100%)`,
      }}
    >
      <div className="min-h-screen p-8">
        <div className="flex justify-between items-start mb-10">
          <button
            onClick={onClose}
            className="text-[#9C9890] hover:text-[#E8E4DC] text-sm uppercase tracking-[0.25em] transition-colors"
          >
            ← Return to Codex
          </button>

          <button
            onClick={async () => {
              const newVal = !frame.needs_attention
              const { error } = await wfUser
                .from('my_frames')
                .update({
                  needs_attention: newVal,
                  updated_at: frame.updated_at ?? new Date().toISOString()
                })
                .eq('my_frame_id', frame.my_frame_id)
              if (error) {
                console.error('Failed to update attention flag:', error)
                return
              }
              if (onSaved) onSaved()
            }}
            className="text-[9px] uppercase tracking-[0.25em] font-bold px-3 py-1.5 rounded-lg border transition-colors"
            style={{
              background: frame.needs_attention ? 'rgba(230,57,70,0.15)' : 'transparent',
              borderColor: frame.needs_attention ? '#E63946' : '#6F6A62',
              color: frame.needs_attention ? '#E63946' : '#9C9890',
            }}
          >
            {frame.needs_attention ? '⚑ Attention On' : '⚑ Mark Attention'}
          </button>
        </div>

        <section
          className="rounded-3xl border p-8 mb-6 overflow-hidden relative"
          style={{
            background: `linear-gradient(135deg, ${color}18, #3A342C)`,
            borderColor: `${color}55`,
            boxShadow: `0 0 60px ${color}12`,
          }}
        >
          <div
            className="absolute right-8 top-8 text-8xl opacity-20"
            style={{ color }}
          >
            {icon}
          </div>

          <p
            className="text-[11px] uppercase tracking-[0.35em] font-bold mb-3"
            style={{ color }}
          >
            {school}
          </p>

          <h1 className="text-5xl font-black uppercase tracking-widest mb-3 text-[#E8E4DC]">
            {frame.display_name || frame.warframe_name}
          </h1>

          <p className="text-[#78716C] text-lg mb-6">
            {frame.build_title ?? 'Untitled Build'}
          </p>

          <div className="flex gap-3 items-center flex-wrap">
            {frame.tier && (
              <span
                className="text-sm font-black px-3 py-1 rounded-lg border"
                style={{
                  color,
                  background: `${color}18`,
                  borderColor: `${color}55`,
                }}
              >
                {frame.tier} Tier
              </span>
            )}

            {currentConstitution && (
              <span
                className="text-xs uppercase tracking-widest px-3 py-1 rounded-lg border"
                style={{
                  color,
                  background:
                    currentConstitution === 'APEX VARIANT CONSTITUTION'
                      ? `linear-gradient(135deg, ${color}22, rgba(255,255,255,0.35))`
                      : `${color}14`,
                  borderColor:
                    currentConstitution === 'APEX VARIANT CONSTITUTION'
                      ? `${color}AA`
                      : `${color}55`,
                  boxShadow:
                    currentConstitution === 'APEX VARIANT CONSTITUTION'
                      ? `0 0 20px ${color}33`
                      : 'none',
                }}
              >
                {currentConstitution}
              </span>
            )}

            <span className="text-xs text-[#9C9890] uppercase tracking-widest">
              {art}
            </span>
          </div>
        </section>

        {/* Tab bar */}
        <div className="flex gap-2 mb-6">
          <TabButton active={activeTab === 'identity'} color={color} onClick={() => setActiveTab('identity')}>Identity</TabButton>
          <TabButton active={activeTab === 'loadout'} color={color} onClick={() => setActiveTab('loadout')}>Loadout</TabButton>
          <TabButton active={activeTab === 'companion'} color={color} onClick={() => setActiveTab('companion')}>Companion</TabButton>
          <TabButton active={activeTab === 'survivability'} color={color} onClick={() => setActiveTab('survivability')}>Survivability</TabButton>
          <TabButton active={activeTab === 'shards'} color={color} onClick={() => setActiveTab('shards')}>Archon Shards</TabButton>
          <TabButton active={activeTab === 'testing'} color={color} onClick={() => setActiveTab('testing')}>Testing Log</TabButton>
        </div>

        {/* Identity tab */}
        {activeTab === 'identity' && (
          <IdentityTab frame={frame} color={color} onSaved={onSaved} onClose={onClose} />
        )}

        {/* Testing Log tab */}
        {activeTab === 'testing' && (
          <TestingLogTab frame={frame} />
        )}

        {/* Loadout tab -- Warframe/Primary/Secondary/Melee, each with its
            weapon+Arcane info, mod grid, and (Warframe only) Abilities */}
        {activeTab === 'loadout' && (
          <ModsLoadoutTab frame={frame} frames={frames} weapons={weapons} color={color} onSaved={onSaved} />
        )}

        {/* Companion tab -- identity + mod grid for the Companion piece and
            its Companion Weapon, sibling to Loadout. */}
        {activeTab === 'companion' && (
          <CompanionTab frame={frame} color={color} onSaved={onSaved} />
        )}

        {/* Survivability tab -- D.2-D.5 Report Card: Resilience metric
            (effective Health/Shield) computed from base stats + equipped
            mods + equipped shards. */}
        {activeTab === 'survivability' && (
          <SurvivabilityTab frame={frame} color={color} />
        )}

        {/* Shards tab */}
        {activeTab === 'shards' && (
          <Panel onClick={onEditShards} interactive accent={color} className="max-w-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color }}>Archon Shards</h2>
              <span className="text-[10px] text-[#B8B3AC] uppercase tracking-widest">Click to Edit</span>
            </div>
            <div className="space-y-8">
              <div>
                <ShardLine label="Now" shards={currentShards} />
                {currentConstitution && (
                  <p className="mt-3 text-xs uppercase tracking-widest" style={{ color }}>
                    Constitution: {currentConstitution}
                  </p>
                )}
              </div>
              <div>
                <ShardLine label="Goal" shards={targetShards} muted />
                {targetConstitution && (
                  <p className="mt-3 text-xs uppercase tracking-widest" style={{ color }}>
                    Goal Constitution: {targetConstitution}
                  </p>
                )}
              </div>
            </div>
          </Panel>
        )}
      </div>
    </div>
  )
}
