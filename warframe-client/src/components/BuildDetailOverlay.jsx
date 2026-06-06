import { useState } from 'react'
import ShardChip from './ShardChip'
import { getTauBonusText } from '../constants/shardBonuses'

function getShards(slots) {
  return [1, 2, 3, 4, 5].map(i => ({
    color: slots?.[`shard_${i}_color`] ?? null,
    tauforged: slots?.[`shard_${i}_tauforged`] ?? false,
    bonus: slots?.[`shard_${i}_bonus`] ?? '',
  }))
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

  const fusionCount = fusionShards.length

  if (fusionCount < 2) return null

  const counts = fusionShards.reduce((acc, shard) => {
    const color = shard.color.toLowerCase()
    acc[color] = (acc[color] || 0) + 1
    return acc
  }, {})

  if (counts.emerald === 5) return 'UNDYING PLAGUE PHYSIQUE'
  if (counts.topaz === 5) return 'HIGH NOON SOLAR PHYSIQUE'
  if (counts.violet === 5) return 'STORM VOID PHYSIQUE'

  if (fusionCount >= 5) return 'APEX VARIANT CONSTITUTION'

  return 'VARIANT CONSTITUTION'
}

function WeaponValue({ name, incarnon }) {
  if (!name) {
    return <p className="text-[#E8E4DC]">—</p>
  }

  return (
    <p className="text-[#E8E4DC] flex items-center gap-2 flex-wrap">
      <span>{name}</span>

      {incarnon && (
        <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded border text-amber-700 border-amber-700/35 bg-amber-600/10">
          Incarnon
        </span>
      )}
    </p>
  )
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
  onClose,
  onEditArsenal,
  onEditAbilities,
  onEditShards,
}) {
  const color = frame.cultivation_color ?? '#FBBF24'
  const school = frame.cultivation_school ?? 'Unknown School'
  const art = frame.cultivation_art ?? 'Cultivation identity pending'
  const doctrine = frame.cultivation_doctrine ?? null
  const icon = getSchoolIcon(school)
  const currentShards = getShards(frame.shard_slots)
  const targetShards = getShards(frame.target_shards)
  const currentConstitution = getConstitutionLabel(currentShards)
  const targetConstitution = getConstitutionLabel(targetShards)
  const [activeAbilityConfig, setActiveAbilityConfig] = useState('A')

  const selectedConfig =
  frame?.ability_configs?.find(
    c => c.config_slot === activeAbilityConfig
  ) ?? null

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section
            onClick={onEditArsenal}
            className="bg-[#3A342C] border border-[#6F6A62] rounded-2xl p-6 cursor-pointer transition-all hover:border-[#8C8880] hover:bg-[#443D34]"
          >
            <div className="flex items-center justify-between mb-5">
              <h2
                className="text-sm font-bold uppercase tracking-widest"
                style={{ color }}
              >
                Arsenal
              </h2>

              <span className="text-[10px] text-[#B8B3AC] uppercase tracking-widest">
                Click to Edit
              </span>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <p className="text-[#B8B3AC] uppercase tracking-widest text-[10px]">
                  Primary
                </p>
                <WeaponValue
                  name={frame.primary_weapon}
                  incarnon={frame.primary_is_incarnon}
                />
              </div>

              <div>
                <p className="text-[#B8B3AC] uppercase tracking-widest text-[10px]">
                  Secondary
                </p>
                <WeaponValue
                  name={frame.secondary_weapon}
                  incarnon={frame.secondary_is_incarnon}
                />
              </div>

              <div>
                <p className="text-[#B8B3AC] uppercase tracking-widest text-[10px]">
                  Melee
                </p>
                <WeaponValue
                  name={frame.melee_weapon}
                  incarnon={frame.melee_is_incarnon}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <p className="text-[#B8B3AC] uppercase tracking-widest text-[10px]">
                    Arcane 1
                  </p>
                  <p className="text-[#E8E4DC]">{frame.arcane_1 ?? '—'}</p>
                </div>

                <div>
                  <p className="text-[#B8B3AC] uppercase tracking-widest text-[10px]">
                    Arcane 2
                  </p>
                  <p className="text-[#E8E4DC]">{frame.arcane_2 ?? '—'}</p>
                </div>
              </div>

              <div>
                <p className="text-[#B8B3AC] uppercase tracking-widest text-[10px]">
                  Melee Arcane
                </p>
                <p className="text-[#E8E4DC]">
                  {frame.melee_arcane ?? '—'}
                </p>
              </div>
            </div>
          </section>

          <section
            onClick={onEditShards}
            className="bg-[#3A342C] border border-[#6F6A62] rounded-2xl p-6 cursor-pointer transition-all hover:border-[#8C8880] hover:bg-[#443D34]"
          >
            <div className="flex items-center justify-between mb-5">
              <h2
                className="text-sm font-bold uppercase tracking-widest"
                style={{ color }}
              >
                Archon Shards
              </h2>

              <span className="text-[10px] text-[#B8B3AC] uppercase tracking-widest">
                Click to Edit
              </span>
            </div>

            <div className="space-y-8">
              <div>
                <ShardLine label="Now" shards={currentShards} />

                {currentConstitution && (
                  <p
                    className="mt-3 text-xs uppercase tracking-widest"
                    style={{ color }}
                  >
                    Constitution: {currentConstitution}
                  </p>
                )}
              </div>

              <div>
                <ShardLine label="Goal" shards={targetShards} muted />

                {targetConstitution && (
                  <p
                    className="mt-3 text-xs uppercase tracking-widest"
                    style={{ color }}
                  >
                    Goal Constitution: {targetConstitution}
                  </p>
                )}
              </div>
            </div>
          </section>

          <section
            onClick={onEditAbilities}
            className="bg-[#3A342C] border border-[#6F6A62] rounded-2xl p-6 cursor-pointer transition-all hover:border-[#8C8880] hover:bg-[#443D34]"
          >
            <div className="flex items-center justify-between mb-5">
              <h2
                className="text-sm font-bold uppercase tracking-widest"
                style={{ color }}
              >
                Abilities
              </h2>

              <span className="text-[10px] text-[#B8B3AC] uppercase tracking-widest">
                Click to View
              </span>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-[#B8B3AC] uppercase tracking-widest text-[10px]">
                  Base Kit
                </p>
                <div className="space-y-1 font-semibold">
                  {frame.abilities?.length > 0 ? (
                    frame.abilities.map(ability => (
                      <p key={ability.ability_slot}>
                        {ability.ability_slot}. {ability.ability_name}
                      </p>
                    ))
                  ) : (
                    <p className="text-[#B8B3AC]">No ability data yet</p>
                  )}
                </div>
              </div>

              <div>
                <p className="text-[#B8B3AC] uppercase tracking-widest text-[10px]">
                  Helminth
                </p>
                <p className="mt-2 font-semibold">
                  {selectedConfig?.subsumed_ability || 'No subsume'}
                </p>

                <p className="text-sm opacity-70">
                  {selectedConfig?.subsumed_slot
                    ? `Replaced Slot ${selectedConfig.subsumed_slot}`
                    : ''}
                </p>
              </div>
            </div>
          </section>


          <section className="lg:col-span-2 bg-[#3A342C] border border-[#6F6A62] rounded-2xl p-6">
            <h2
              className="text-sm font-bold uppercase tracking-widest mb-3"
              style={{ color }}
            >
              Cultivation Doctrine
            </h2>

            <p className="text-[#B8B3AC] leading-relaxed">
              {doctrine
                ? doctrine
                : `${art}. This build belongs to the ${school}, using its loadout, shard path, and combat identity as a specialized doctrine within Warframe Jarvis.`
              }
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}