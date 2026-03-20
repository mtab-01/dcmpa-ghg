import { colors, radius } from '../../theme'

const variants = {
  primary: {
    background: colors.gold,
    color: '#000',
    border: 'none',
    fontWeight: '600',
  },
  secondary: {
    background: 'transparent',
    color: colors.gold,
    border: `1px solid ${colors.gold}`,
    fontWeight: '500',
  },
  danger: {
    background: colors.red,
    color: colors.cream,
    border: 'none',
    fontWeight: '500',
  },
  ghost: {
    background: 'transparent',
    color: colors.creamDim,
    border: `1px solid ${colors.border}`,
    fontWeight: '400',
  },
  orange: {
    background: colors.orange,
    color: '#000',
    border: 'none',
    fontWeight: '600',
  },
}

export default function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  fullWidth = false,
  type = 'button',
  style: extraStyle = {},
}) {
  const v = variants[variant] || variants.primary
  const padding = size === 'sm' ? '6px 14px' : size === 'lg' ? '14px 28px' : '10px 20px'
  const fontSize = size === 'sm' ? '0.8rem' : size === 'lg' ? '1.05rem' : '0.9rem'

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...v,
        padding,
        fontSize,
        borderRadius: radius.md,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'opacity 0.15s, filter 0.15s',
        width: fullWidth ? '100%' : 'auto',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        whiteSpace: 'nowrap',
        ...extraStyle,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.filter = 'brightness(1.1)' }}
      onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)' }}
    >
      {children}
    </button>
  )
}
