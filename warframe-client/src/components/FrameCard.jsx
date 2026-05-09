import ShardChip from './ShardChip'

function getShards(slots) {
  return [1, 2, 3, 4, 5].map(i => ({
    color: slots?.[`shard_${i}_color`] ?? null,
    tauforged: slots?.[`shard_${i}_tauforged`] ?? false,
  }))
}

function ShardRow({ label, shards, variant = 'current' }) {
  const hasShards = shards.some(s => s.color)
  const isGoal = variant === 'goal'

  return (
    <div
      className={
        isGoal
          ? 'flex items-center justify-between gap-3 opacity-55'
          : 'flex items-center justify-between gap-3'
      }
    >
      <span
        className={
          isGoal
            ? 'text-[8px] text-amber-300/45 uppercase tracking-widest w-12'
            : 'text-[9px] text-white/25 uppercase tracking-widest w-12'
        }
      >
        {label}
      </span>

      <div
        className={
          isGoal
            ? 'flex gap-2 items-center flex-1 border-l border-amber-400/20 pl-3'
            : 'flex gap-3 items-center flex-1 pl-1'
        }
        style={{ height: isGoal ? '20px' : '24px' }}
      >
        {hasShards ? (
          shards.map((s, i) => (
            <ShardChip
              key={i}
              color={s.color}
              tauforged={s.tauforged}
              size={isGoal ? 'xs' : 'sm'}
            />
          ))
        ) : (
          <p className="text-[9px] text-white/15 uppercase tracking-widest">None</p>
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

  return (
    <div
      className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4 hover:border-amber-400/40 transition-colors flex flex-col gap-3 cursor-pointer"
      onClick={onEdit}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] text-white/30 uppercase tracking-widest mb-0.5">
            {frame.build_title ?? '—'}
          </p>
          <h2 className="text-white font-semibold text-sm">{frame.warframe_name}</h2>
        </div>

        {frame.tier && (
          <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20">
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
        {hasTarget && <ShardRow label="Goal" shards={targetShards} variant="goal" />}
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