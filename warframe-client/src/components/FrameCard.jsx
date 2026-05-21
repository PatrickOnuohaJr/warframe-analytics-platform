import ShardChip from './ShardChip'

function getShards(slots) {
  return [1, 2, 3, 4, 5].map(i => ({
    color: slots?.[`shard_${i}_color`] ?? null,
    tauforged: slots?.[`shard_${i}_tauforged`] ?? false,
  }))
}

function getConstitutionBadge(slots) {
  const shards = getShards(slots)
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

function getSchool(frame) {
  return frame.cultivation_school ?? 'Unknown School'
}

function getCultivationArt(frame) {
  return frame.cultivation_art ?? 'Cultivation identity pending'
}

function getSchoolIcon(schoolLabel) {
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

function ShardRow({ label, shards, variant = 'current' }) {
  const hasShards = shards.some(s => s.color)
  const isGoal = variant === 'goal'

  return (
    <div className="flex items-center gap-3">
      <span
        className={
          isGoal
            ? 'text-[9px] text-[#A08840] uppercase tracking-widest w-11 font-semibold'
            : 'text-[9px] text-[#9C9890] uppercase tracking-widest w-11'
        }
      >
        {label}
      </span>

      <div
        className={
          isGoal
            ? 'flex gap-2 items-center flex-1 border-l border-[#6F6A62] pl-3'
            : 'flex gap-3 items-center flex-1 pl-1'
        }
        style={{ height: isGoal ? '18px' : '24px' }}
      >
        {hasShards ? (
          shards.map((s, i) => (
            <ShardChip
              key={i}
              color={s.color}
              tauforged={s.tauforged}
              size={isGoal ? 'xs' : 'sm'}
              muted={isGoal}
            />
          ))
        ) : (
          <p className="text-[9px] text-[#6F6A62] uppercase tracking-widest">
            None
          </p>
        )}
      </div>
    </div>
  )
}

export default function FrameCard({ frame, onEdit }) {
  const currentShards = getShards(frame.shard_slots)
  const targetShards = getShards(frame.target_shards)

  const fullTau = currentShards.every(s => s.color && s.tauforged)
  const constitutionBadge = getConstitutionBadge(frame.shard_slots)
  const hasTarget = targetShards.some(s => s.color)

  const cultivationColor = frame.cultivation_color ?? '#FBBF24'
  const hasCultivationColor = Boolean(frame.cultivation_color)

  const schoolLabel = getSchool(frame)
  const cultivationArt = getCultivationArt(frame)
  const schoolIcon = getSchoolIcon(schoolLabel)

  return (
    <div
      className="group relative overflow-hidden bg-[#3A342C] border border-[#6F6A62] rounded-xl p-4 pl-16 hover:border-amber-400/40 transition-colors flex flex-col gap-3 cursor-pointer text-[#E8E4DC]"
      style={{
        borderLeft: hasCultivationColor
          ? `3px solid ${cultivationColor}`
          : '1px solid #6F6A62',
        boxShadow: hasCultivationColor
          ? `inset 46px 0 0 ${cultivationColor}18`
          : 'none',
      }}
      onClick={onEdit}
    >
      {hasCultivationColor && (
        <div
          className="absolute left-0 top-0 bottom-0 w-12 flex flex-col items-center"
          style={{
            background: `${cultivationColor}26`,
            color: '#E8E4DC',
          }}
        >
          <div
            className="mt-4 mb-3 w-6 h-6 rounded-full flex items-center justify-center text-lg font-bold"
            style={{
              background: `${cultivationColor}33`,
              border: `1px solid ${cultivationColor}88`,
            }}
          >
            {schoolIcon}
          </div>

          <div className="flex-1 flex items-center justify-center">
            <span
              className="text-[10px] font-bold uppercase tracking-[0.18em] whitespace-nowrap"
              style={{
                writingMode: 'vertical-rl',
                transform: 'rotate(180deg)',
              }}
            >
              {schoolLabel}
            </span>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div>
          <p
            className="text-[10px] uppercase tracking-widest mb-0.5 font-semibold"
            style={{
              color: hasCultivationColor ? cultivationColor : '#9C9890',
            }}
          >
            {frame.build_title ?? '—'}
          </p>

          <h2 className="text-[#E8E4DC] font-semibold text-sm">
            {frame.warframe_name}
          </h2>
        </div>

        {frame.tier && (
          <span
            className="text-xs font-bold px-2 py-0.5 rounded border"
            style={{
              background: hasCultivationColor
                ? `${cultivationColor}18`
                : 'rgba(251,191,36,0.18)',
              color: hasCultivationColor ? cultivationColor : '#B45309',
              borderColor: hasCultivationColor
                ? `${cultivationColor}66`
                : 'rgba(180,83,9,0.35)',
            }}
          >
            {frame.tier}
          </span>
        )}
      </div>

      <div className="text-xs text-[#B8B3AC] space-y-0.5">
        {frame.primary_weapon && <p>{frame.primary_weapon}</p>}
        {frame.secondary_weapon && <p>{frame.secondary_weapon}</p>}
        {frame.melee_weapon && <p>{frame.melee_weapon}</p>}
      </div>

      <div className="space-y-2">
        <ShardRow label="Now" shards={currentShards} />
        {hasTarget && (
          <ShardRow label="Goal" shards={targetShards} variant="goal" />
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {fullTau && (
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-widest"
            style={{
              background: 'rgba(251,191,36,0.18)',
              color: '#B45309',
              borderColor: 'rgba(180,83,9,0.35)',
            }}
          >
            Full Tau
          </span>
        )}

        {constitutionBadge && (
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-widest"
            style={{
              background: `${cultivationColor}18`,
              color: cultivationColor,
              borderColor: `${cultivationColor}66`,
            }}
          >
            {constitutionBadge}
          </span>
        )}
      </div>

      <div
        className="rounded-lg px-3 py-2 border mt-auto"
        style={{
          background: hasCultivationColor
            ? `${cultivationColor}10`
            : '#4A443B',
          borderColor: hasCultivationColor
            ? `${cultivationColor}40`
            : '#6F6A62',
        }}
      >
        <p
          className="text-[9px] font-bold uppercase tracking-widest"
          style={{
            color: hasCultivationColor ? cultivationColor : '#9C9890',
          }}
        >
          {schoolLabel}
        </p>

        <p className="text-[10px] text-[#B8B3AC] mt-1">
          {cultivationArt}
        </p>
      </div>

      {(frame.arcane_1 || frame.arcane_2) && (
        <div className="flex gap-2 text-[10px] text-[#B8B3AC] uppercase tracking-wide">
          {frame.arcane_1 && <span>{frame.arcane_1}</span>}
          {frame.arcane_2 && <span>/ {frame.arcane_2}</span>}
        </div>
      )}

      {(frame.kpm_85_100 || frame.kpm_120_cap) && (
        <div className="flex gap-1.5">
          {frame.kpm_85_100 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-700/10 text-green-800 border border-green-700/20 uppercase tracking-wide">
              85-100 KPM
            </span>
          )}

          {frame.kpm_120_cap && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-700/10 text-blue-800 border border-blue-700/20 uppercase tracking-wide">
              120 Cap
            </span>
          )}
        </div>
      )}
    </div>
  )
}