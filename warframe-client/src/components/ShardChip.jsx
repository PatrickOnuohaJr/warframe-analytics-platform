import { SHARD_COLORS } from '../constants/shards'

export default function ShardChip({ color, tauforged, size = 'sm' }) {
  const w = size === 'lg' ? '24px' : size === 'xs' ? '14px' : '18px'
  const h = size === 'lg' ? '14px' : size === 'xs' ? '8px' : '10px'

  if (!color) {
    return (
      <div
        style={{
          width: w,
          height: h,
          borderRadius: '3px',
          transform: 'rotate(-35deg)',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
        }}
      />
    )
  }

  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: '3px',
        transform: 'rotate(-35deg)',
        background: SHARD_COLORS[color] ?? '#ffffff22',
        flexShrink: 0,
      }}
      title={`${tauforged ? 'Tauforged ' : ''}${color}`}
    />
  )
}