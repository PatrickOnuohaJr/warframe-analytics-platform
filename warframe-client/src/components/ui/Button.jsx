import { COLOR } from '../../constants/theme'

const VARIANTS = {
  primary: color => ({
    background: `${color}18`,
    border: `1px solid ${color}55`,
    color,
  }),
  ghost: () => ({
    background: COLOR.surface1,
    border: `1px solid ${COLOR.border}`,
    color: COLOR.mutedInk,
  }),
  danger: () => ({
    background: 'rgba(230,57,70,0.1)',
    border: '1px solid rgba(230,57,70,0.4)',
    color: COLOR.danger,
  }),
  success: () => ({
    background: 'rgba(76,175,80,0.1)',
    border: '1px solid rgba(76,175,80,0.5)',
    color: COLOR.success,
  }),
  info: () => ({
    background: 'rgba(96,165,250,0.08)',
    border: '1px solid rgba(96,165,250,0.25)',
    color: COLOR.info,
  }),
}

const SIZES = {
  md: 'px-5 py-2.5 text-[10px]',
  sm: 'px-3 py-1.5 text-[9px]',
}

// Shared button primitive. Standardizes on the app's small-caps tracked
// label style everywhere instead of the mix of text-sm/uppercase-label
// treatments that had accumulated per-component.
export default function Button({
  children,
  variant = 'primary',
  color = COLOR.gold,
  size = 'md',
  fullWidth = false,
  disabled = false,
  className = '',
  ...props
}) {
  const style = VARIANTS[variant](color)

  return (
    <button
      disabled={disabled}
      className={[
        'rounded-xl font-bold uppercase tracking-[0.25em] transition-all duration-200',
        SIZES[size],
        fullWidth ? 'w-full' : '',
        disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98]',
        className,
      ].join(' ')}
      style={style}
      {...props}
    >
      {children}
    </button>
  )
}
