import { colors, fonts, shadow } from '../../theme'

const NAV_ITEMS = [
  { key: 'home', label: 'Home', icon: '🏠' },
  { key: 'videos', label: 'Video Library', icon: '▶' },
  { key: 'calendar', label: 'Practice Calendar', icon: '📅' },
  { key: 'expenses', label: 'Expenses', icon: '💰' },
  { key: 'settings', label: 'Settings', icon: '⚙' },
]

export default function Sidebar({ activePage, onNavigate }) {
  return (
    <aside style={{
      width: '220px',
      minWidth: '220px',
      background: colors.bgDeep,
      borderRight: `1px solid ${colors.border}`,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      boxShadow: shadow.card,
    }}>
      {/* Logo */}
      <div style={{
        padding: '28px 20px 24px',
        borderBottom: `1px solid ${colors.border}`,
      }}>
        <div style={{
          fontFamily: fonts.heading,
          fontSize: '1.4rem',
          color: colors.gold,
          lineHeight: 1.2,
        }}>
          DCMPA
        </div>
        <div style={{
          fontFamily: fonts.mono,
          fontSize: '0.7rem',
          color: colors.orange,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          marginTop: '2px',
        }}>
          GHG
        </div>
      </div>

      {/* Nav Items */}
      <nav style={{ flex: 1, padding: '12px 0' }}>
        {NAV_ITEMS.map(item => {
          const isActive = activePage === item.key
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 20px',
                background: isActive ? `${colors.gold}10` : 'transparent',
                border: 'none',
                borderLeft: isActive ? `3px solid ${colors.gold}` : '3px solid transparent',
                color: isActive ? colors.gold : colors.creamDim,
                fontSize: '0.9rem',
                fontFamily: fonts.body,
                cursor: 'pointer',
                transition: 'all 0.15s',
                textAlign: 'left',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.background = `${colors.gold}08`
                  e.currentTarget.style.color = colors.cream
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = colors.creamDim
                }
              }}
            >
              <span style={{ fontSize: '1rem', width: '20px', textAlign: 'center' }}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{
        padding: '16px 20px',
        borderTop: `1px solid ${colors.border}`,
        fontFamily: fonts.mono,
        fontSize: '0.65rem',
        color: colors.textMuted,
        letterSpacing: '0.05em',
      }}>
        TEAM PORTAL · 12 MEMBERS
      </div>
    </aside>
  )
}
