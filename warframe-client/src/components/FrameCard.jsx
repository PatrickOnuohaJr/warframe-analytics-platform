import ShardChip from './ShardChip'

function getShards(slots) {
  return [1, 2, 3, 4, 5].map(i => ({
    color: slots?.[`shard_${i}_color`] ?? null,
    tauforged: slots?.[`shard_${i}_tauforged`] ?? false,
  }))
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
            ? 'text-[9px] text-amber-300/45 uppercase tracking-widest w-11 font-semibold'
            : 'text-[9px] text-white/35 uppercase tracking-widest w-11'
        }
      >
        {label}
      </span>

      <div
        className={
          isGoal
            ? 'flex gap-2 items-center flex-1 border-l border-amber-400/15 pl-3'
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
          <p className="text-[9px] text-white/15 uppercase tracking-widest">
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
  const hasTarget = targetShards.some(s => s.color)

  const cultivationColor = frame.cultivation_color ?? '#FBBF24'
  const hasCultivationColor = Boolean(frame.cultivation_color)

  const schoolLabel = getSchool(frame)
  const cultivationArt = getCultivationArt(frame)
  const schoolIcon = getSchoolIcon(schoolLabel)

  return (
    <div
      className="group relative overflow-hidden bg-[#151818] border border-white/10 rounded-xl p-4 pl-16 hover:border-white/20 transition-colors flex flex-col gap-3 cursor-pointer"
      style={{
        borderLeft: hasCultivationColor
          ? `3px solid ${cultivationColor}`
          : '1px solid rgba(255,255,255,0.1)',
        boxShadow: hasCultivationColor
          ? `inset 46px 0 0 ${cultivationColor}18`
          : 'none',
      }}
      onClick={onEdit}
    >
      {hasCultivationColor && (
        <div
          className="absolute left-0 top-0 bottom-0 w-12 flex flex-col items-center"
          style={{ color: cultivationColor }}
        >
          <div
            className="mt-4 mb-3 w-6 h-6 rounded-full flex items-center justify-center text-lg font-bold"
            style={{
              background: `${cultivationColor}1F`,
              border: `1px solid ${cultivationColor}55`,
              textShadow: `0 0 8px ${cultivationColor}66`,
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
              color: hasCultivationColor
                ? cultivationColor
                : 'rgba(255,255,255,0.3)',
            }}
          >
            {frame.build_title ?? '—'}
          </p>

          <h2 className="text-white font-semibold text-sm">
            {frame.warframe_name}
          </h2>
        </div>

        {frame.tier && (
          <span
            className="text-xs font-bold px-2 py-0.5 rounded border"
            style={{
              background: hasCultivationColor
                ? `${cultivationColor}18`
                : 'rgba(251,191,36,0.1)',
              color: hasCultivationColor ? cultivationColor : '#FBBF24',
              borderColor: hasCultivationColor
                ? `${cultivationColor}55`
                : 'rgba(251,191,36,0.2)',
            }}
          >
            {frame.tier}
          </span>
        )}
      </div>

      <div className="text-xs text-white/40 space-y-0.5">
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

      {fullTau && (
        <div>
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-widest"
            style={{
              background: 'rgba(251,191,36,0.1)',
              color: '#FBBF24',
              borderColor: 'rgba(251,191,36,0.3)',
            }}
          >
            Full Tau
          </span>
        </div>
      )}

      <div
        className="rounded-lg px-3 py-2 border mt-auto"
        style={{
          background: hasCultivationColor
            ? `${cultivationColor}0F`
            : 'rgba(255,255,255,0.03)',
          borderColor: hasCultivationColor
            ? `${cultivationColor}30`
            : 'rgba(255,255,255,0.08)',
        }}
      >
        <p
          className="text-[9px] font-bold uppercase tracking-widest"
          style={{
            color: hasCultivationColor
              ? cultivationColor
              : 'rgba(255,255,255,0.35)',
          }}
        >
          {schoolLabel}
        </p>

        <p className="text-[10px] text-white/40 mt-1">
          {cultivationArt}
        </p>
      </div>

      {(frame.arcane_1 || frame.arcane_2) && (
        <div className="flex gap-2 text-[10px] text-white/40 uppercase tracking-wide">
          {frame.arcane_1 && <span>{frame.arcane_1}</span>}
          {frame.arcane_2 && <span>/ {frame.arcane_2}</span>}
        </div>
      )}

      {(frame.kpm_85_100 || frame.kpm_120_cap) && (
        <div className="flex gap-1.5">
          {frame.kpm_85_100 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20 uppercase tracking-wide">
              85-100 KPM
            </span>
          )}

          {frame.kpm_120_cap && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wide">
              120 Cap
            </span>
          )}
        </div>
      )}
    </div>
  )
}