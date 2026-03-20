import { colors, radius, fonts } from '../../theme'
import { CATEGORY_COLORS } from '../../constants'

export default function Badge({ children, color, variant = 'default' }) {
  // Auto-color for expense categories
  const bg = color || CATEGORY_COLORS[children] || colors.border
  const isLight = variant === 'light'

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 8px',
      borderRadius: radius.sm,
      fontSize: '0.72rem',
      fontFamily: fonts.mono,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      background: isLight ? `${bg}22` : bg,
      color: isLight ? bg : colors.cream,
      border: isLight ? `1px solid ${bg}44` : 'none',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  )
}
