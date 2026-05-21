import { SHARD_COLORS } from '../constants/shards'

export default function ShardChip({
  color,
  tauforged,
  size = 'sm',
  muted = false,
}) {
  const dimensions = {
    xs: { w: '8px', h: '14px' },
    sm: { w: '10px', h: '18px' },
    md: { w: '12px', h: '21px' },
    lg: { w: '14px', h: '24px' },
  }

  const { w, h } =
    dimensions[size] ?? dimensions.sm

  if (!color) {
    return (
      <div
        style={{
          width: w,
          height: h,
          borderRadius: '3px',
          transform: 'rotate(-35deg)',

          // Manuscript empty shard
          background: '#D0CBC3',
          border: '1px solid #6F6A62',

          opacity: muted ? 0.45 : 1,
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

        background:
          SHARD_COLORS[color] ??
          '#ffffff',

        opacity:
          muted
            ? 0.45
            : 1,

        filter:
          tauforged && !muted
            ? 'drop-shadow(0 0 6px rgba(251,191,36,0.55))'
            : 'none',

        boxShadow:
          tauforged
            ? '0 0 10px rgba(251,191,36,0.18)'
            : 'none',

        flexShrink: 0,
      }}
      title={`${tauforged ? 'Tauforged ' : ''}${color}`}
    />
  )
}