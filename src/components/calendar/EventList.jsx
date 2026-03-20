import { colors, fonts, radius, shadow } from '../../theme'
import { buildGCalUrl } from '../../utils/calendarUrl'
import Button from '../ui/Button'

function formatTime(timeStr) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

export default function EventList({ events, selectedDate, onAddEvent }) {
  if (!selectedDate) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: colors.textMuted,
        fontSize: '0.85rem',
      }}>
        Click a day to view or add events
      </div>
    )
  }

  return (
    <div style={{ padding: '0' }}>
      {/* Date header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: `1px solid ${colors.border}`,
      }}>
        <div>
          <h3 style={{
            fontFamily: fonts.heading,
            color: colors.cream,
            fontSize: '1rem',
          }}>
            {formatDisplayDate(selectedDate)}
          </h3>
          <p style={{ color: colors.textMuted, fontSize: '0.78rem', marginTop: '2px' }}>
            {events.length} event{events.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={onAddEvent}>
          + Add
        </Button>
      </div>

      {events.length === 0 ? (
        <div style={{ padding: '24px 20px', color: colors.textMuted, fontSize: '0.85rem', textAlign: 'center' }}>
          No practices scheduled.{' '}
          <button
            onClick={onAddEvent}
            style={{ background: 'none', border: 'none', color: colors.gold, cursor: 'pointer', fontSize: 'inherit', textDecoration: 'underline' }}
          >
            Add one?
          </button>
        </div>
      ) : (
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {events.map(event => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}

function EventCard({ event }) {
  const gcalUrl = buildGCalUrl({
    title: event.title,
    date: event.date,
    startTime: event.time,
    location: event.location,
    notes: event.notes,
  })

  return (
    <div style={{
      background: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: radius.md,
      padding: '14px 16px',
      boxShadow: shadow.card,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <h4 style={{
          fontFamily: fonts.heading,
          color: colors.cream,
          fontSize: '0.95rem',
          lineHeight: 1.3,
        }}>
          {event.title}
        </h4>
      </div>

      <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {event.time && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ color: colors.textMuted, fontSize: '0.75rem' }}>🕐</span>
            <span style={{ color: colors.creamDim, fontSize: '0.82rem', fontFamily: fonts.mono }}>
              {formatTime(event.time)}
            </span>
          </div>
        )}
        {event.location && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ color: colors.textMuted, fontSize: '0.75rem' }}>📍</span>
            <span style={{ color: colors.creamDim, fontSize: '0.82rem' }}>{event.location}</span>
          </div>
        )}
        {event.notes && (
          <p style={{ color: colors.textMuted, fontSize: '0.8rem', marginTop: '4px', lineHeight: 1.5 }}>
            {event.notes}
          </p>
        )}
      </div>

      <div style={{ marginTop: '12px' }}>
        <a href={gcalUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="ghost" size="sm">
            📅 Add to Google Calendar
          </Button>
        </a>
      </div>
    </div>
  )
}
