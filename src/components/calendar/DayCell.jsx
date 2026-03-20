import { colors, fonts, radius } from '../../theme'

export default function DayCell({ day, date, events = [], isToday, isSelected, onClick }) {
  if (!day) {
    return <div />
  }

  const dots = events.slice(0, 3)
  const extra = events.length > 3 ? events.length - 3 : 0

  return (
    <div
      onClick={onClick}
      style={{
        minHeight: '52px',
        padding: '6px 4px 4px',
        borderRadius: radius.sm,
        cursor: 'pointer',
        background: isSelected
          ? `${colors.gold}18`
          : isToday
            ? `${colors.bgDeep}`
            : 'transparent',
        border: isSelected
          ? `1px solid ${colors.gold}`
          : isToday
            ? `1px solid ${colors.borderLight}`
            : '1px solid transparent',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        transition: 'all 0.12s',
        userSelect: 'none',
      }}
      onMouseEnter={e => {
        if (!isSelected) e.currentTarget.style.background = `${colors.gold}10`
      }}
      onMouseLeave={e => {
        if (!isSelected) e.currentTarget.style.background = isToday ? colors.bgDeep : 'transparent'
      }}
    >
      <span style={{
        fontFamily: fonts.mono,
        fontSize: '0.82rem',
        color: isSelected ? colors.gold : isToday ? colors.orange : colors.cream,
        fontWeight: isToday ? '700' : '400',
        lineHeight: 1,
      }}>
        {day}
      </span>

      {/* Event dots */}
      {events.length > 0 && (
        <div style={{ display: 'flex', gap: '2px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          {dots.map((_, i) => (
            <span key={i} style={{
              width: '5px', height: '5px',
              borderRadius: '50%',
              background: colors.gold,
              display: 'block',
              flexShrink: 0,
            }} />
          ))}
          {extra > 0 && (
            <span style={{
              fontSize: '0.55rem',
              color: colors.orange,
              fontFamily: fonts.mono,
              lineHeight: 1,
            }}>
              +{extra}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
