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

function countFusionShards(shards) {
  const fusion = ['emerald', 'topaz', 'violet']

  return shards.filter(
    s => s.color && fusion.includes(s.color.toLowerCase())
  ).length
}

function getConstitutionLabel(shards) {
  const fusionCount = countFusionShards(shards)

  if (fusionCount >= 5) return 'Apex Variant Constitution'
  if (fusionCount >= 2) return 'Variant Constitution'

  return null
}

function WeaponValue({ name, incarnon }) {
  if (!name) {
    return <p className="text-white/75">—</p>
  }

  return (
    <p className="text-white/75 flex items-center gap-2 flex-wrap">
      <span>{name}</span>

      {incarnon && (
        <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded border text-amber-300 border-amber-300/35 bg-amber-300/10">
          Incarnon
        </span>
      )}
    </p>
  )
}

function ShardLine({ label, shards, muted = false }) {
  return (
    <div>
      <p className="text-[10px] text-white/30 uppercase tracking-widest mb-3">
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
              className="text-[11px] text-white/40 leading-relaxed"
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
  onEditShards,
}) {
  const color = frame.cultivation_color ?? '#FBBF24'
  const school = frame.cultivation_school ?? 'Unknown School'
  const art = frame.cultivation_art ?? 'Cultivation identity pending'
  const icon = getSchoolIcon(school)

  const currentShards = getShards(frame.shard_slots)
  const targetShards = getShards(frame.target_shards)

  const currentConstitution = getConstitutionLabel(currentShards)
  const targetConstitution = getConstitutionLabel(targetShards)

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto text-white backdrop-blur-xl"
      style={{
        background: `radial-gradient(circle at top left, ${color}26, rgba(0,0,0,0.98) 30%, rgba(0,0,0,1) 100%)`,
      }}
    >
      <div className="min-h-screen p-8">
        <div className="flex justify-between items-start mb-10">
          <button
            onClick={onClose}
            className="text-white/35 hover:text-white text-sm uppercase tracking-[0.25em] transition-colors"
          >
            ← Return to Codex
          </button>
        </div>

        <section
          className="rounded-3xl border p-8 mb-6 overflow-hidden relative"
          style={{
            background: `linear-gradient(135deg, ${color}18, rgba(10,10,10,0.92))`,
            borderColor: `${color}44`,
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

          <h1 className="text-5xl font-black uppercase tracking-widest mb-3">
            {frame.warframe_name}
          </h1>

          <p className="text-white/50 text-lg mb-6">
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
                    currentConstitution === 'Apex Variant Constitution'
                      ? `linear-gradient(135deg, ${color}22, rgba(255,255,255,0.08))`
                      : `${color}14`,
                  borderColor:
                    currentConstitution === 'Apex Variant Constitution'
                      ? `${color}AA`
                      : `${color}55`,
                  boxShadow:
                    currentConstitution === 'Apex Variant Constitution'
                      ? `0 0 20px ${color}33`
                      : 'none',
                }}
              >
                {currentConstitution}
              </span>
            )}

            <span className="text-xs text-white/35 uppercase tracking-widest">
              {art}
            </span>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section
            onClick={onEditArsenal}
            className="bg-black/70 border border-white/10 rounded-2xl p-6 cursor-pointer transition-all hover:border-white/20 hover:bg-black/80"
          >
            <div className="flex items-center justify-between mb-5">
              <h2
                className="text-sm font-bold uppercase tracking-widest"
                style={{ color }}
              >
                Arsenal
              </h2>

              <span className="text-[10px] text-white/25 uppercase tracking-widest">
                Click to Edit
              </span>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <p className="text-white/25 uppercase tracking-widest text-[10px]">
                  Primary
                </p>
                <WeaponValue
                  name={frame.primary_weapon}
                  incarnon={frame.primary_is_incarnon}
                />
              </div>

              <div>
                <p className="text-white/25 uppercase tracking-widest text-[10px]">
                  Secondary
                </p>
                <WeaponValue
                  name={frame.secondary_weapon}
                  incarnon={frame.secondary_is_incarnon}
                />
              </div>

              <div>
                <p className="text-white/25 uppercase tracking-widest text-[10px]">
                  Melee
                </p>
                <WeaponValue
                  name={frame.melee_weapon}
                  incarnon={frame.melee_is_incarnon}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <p className="text-white/25 uppercase tracking-widest text-[10px]">
                    Arcane 1
                  </p>
                  <p className="text-white/75">{frame.arcane_1 ?? '—'}</p>
                </div>

                <div>
                  <p className="text-white/25 uppercase tracking-widest text-[10px]">
                    Arcane 2
                  </p>
                  <p className="text-white/75">{frame.arcane_2 ?? '—'}</p>
                </div>
              </div>

              <div>
                <p className="text-white/25 uppercase tracking-widest text-[10px]">
                  Melee Arcane
                </p>
                <p className="text-white/75">
                  {frame.melee_arcane ?? '—'}
                </p>
              </div>
            </div>
          </section>

          <section
            onClick={onEditShards}
            className="bg-black/70 border border-white/10 rounded-2xl p-6 cursor-pointer transition-all hover:border-white/20 hover:bg-black/80"
          >
            <div className="flex items-center justify-between mb-5">
              <h2
                className="text-sm font-bold uppercase tracking-widest"
                style={{ color }}
              >
                Archon Shards
              </h2>

              <span className="text-[10px] text-white/25 uppercase tracking-widest">
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

          <section className="lg:col-span-2 bg-black/70 border border-white/10 rounded-2xl p-6">
            <h2
              className="text-sm font-bold uppercase tracking-widest mb-3"
              style={{ color }}
            >
              Cultivation Doctrine
            </h2>

            <p className="text-white/55 leading-relaxed">
              {art}. This build belongs to the {school}, using its loadout,
              shard path, and combat identity as a specialized doctrine within
              Warframe Jarvis.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}