import { colors, fonts } from '../../theme'
import DayCell from './DayCell'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function CalendarGrid({ year, month, events, selectedDate, onSelectDay }) {
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  // Build cells array
  const firstDay = new Date(year, month, 1).getDay() // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  // Pad to multiple of 7
  while (cells.length % 7 !== 0) cells.push(null)

  const getDateStr = (day) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  const eventsForDay = (day) => {
    if (!day) return []
    const dateStr = getDateStr(day)
    return events.filter(e => e.date === dateStr)
  }

  return (
    <div>
      {/* Day name headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '2px',
        marginBottom: '4px',
      }}>
        {DAY_NAMES.map(d => (
          <div key={d} style={{
            textAlign: 'center',
            fontFamily: fonts.mono,
            fontSize: '0.68rem',
            color: colors.textMuted,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            padding: '4px 0',
          }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar cells */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '2px',
      }}>
        {cells.map((day, idx) => {
          const dateStr = day ? getDateStr(day) : null
          return (
            <DayCell
              key={idx}
              day={day}
              date={dateStr}
              events={eventsForDay(day)}
              isToday={dateStr === todayStr}
              isSelected={dateStr === selectedDate}
              onClick={() => day && onSelectDay(dateStr)}
            />
          )
        })}
      </div>
    </div>
  )
}
