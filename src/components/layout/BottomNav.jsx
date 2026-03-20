import { colors, fonts } from '../../theme'

const NAV_ITEMS = [
  { key: 'home', label: 'Home', icon: '🏠' },
  { key: 'videos', label: 'Videos', icon: '▶' },
  { key: 'calendar', label: 'Calendar', icon: '📅' },
  { key: 'expenses', label: 'Expenses', icon: '💰' },
  { key: 'settings', label: 'Settings', icon: '⚙' },
]

export default function BottomNav({ activePage, onNavigate }) {
  return (
    <nav
      className="bottom-nav"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: colors.bgDeep,
        borderTop: `1px solid ${colors.border}`,
        display: 'flex',
        zIndex: 100,
      }}
    >
      {NAV_ITEMS.map(item => {
        const isActive = activePage === item.key
        return (
          <button
            key={item.key}
            onClick={() => onNavigate(item.key)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              padding: '10px 4px',
              background: 'none',
              border: 'none',
              color: isActive ? colors.gold : colors.textMuted,
              cursor: 'pointer',
              transition: 'color 0.15s',
              borderTop: isActive ? `2px solid ${colors.gold}` : '2px solid transparent',
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
            <span style={{
              fontSize: '0.65rem',
              fontFamily: fonts.mono,
              letterSpacing: '0.03em',
              textTransform: 'uppercase',
            }}>
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
