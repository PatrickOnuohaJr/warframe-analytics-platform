import { COLOR } from '../../constants/theme'

// Shared surface primitive: the bordered/rounded/shadowed container used
// for cards, section panels, and modal bodies. `accent` tints the border
// and adds a matching hover-lift glow when `interactive`; omit it for a
// neutral panel.
export default function Panel({
  children,
  accent,
  interactive = false,
  onClick,
  className = '',
  style = {},
}) {
  const borderColor = accent ? `${accent}55` : COLOR.border
  const hoverBorder = accent ? `${accent}88` : '#8C8880'

  return (
    <div
      onClick={onClick}
      onMouseEnter={interactive ? e => (e.currentTarget.style.borderColor = hoverBorder) : undefined}
      onMouseLeave={interactive ? e => (e.currentTarget.style.borderColor = borderColor) : undefined}
      className={[
        'rounded-2xl border p-5 transition-all duration-200',
        interactive ? 'cursor-pointer active:scale-[0.99]' : '',
        className,
      ].join(' ')}
      style={{
        background: COLOR.surface1,
        borderColor,
        boxShadow: 'var(--shadow-resting)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
