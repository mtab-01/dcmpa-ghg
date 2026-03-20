import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { colors, fonts, radius, shadow } from '../theme'
import { useIsMobile } from '../hooks/useWindowWidth'
import CalendarGrid from '../components/calendar/CalendarGrid'
import EventList from '../components/calendar/EventList'
import AddEventModal from '../components/calendar/AddEventModal'
import Button from '../components/ui/Button'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default function PracticeCalendar() {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [events, setEvents] = useState([])
  const [selectedDate, setSelectedDate] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(true)
  const isMobile = useIsMobile()

  useEffect(() => {
    loadEvents()
  }, [currentMonth])

  async function loadEvents() {
    setLoading(true)
    const { year, month } = currentMonth
    const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const lastDay = `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .gte('date', firstDay)
      .lte('date', lastDay)
      .order('date', { ascending: true })
      .order('time', { ascending: true })

    if (!error) setEvents(data || [])
    setLoading(false)
  }

  function handleAdded(event) {
    setEvents(prev => [...prev, event].sort((a, b) => a.date.localeCompare(b.date)))
    setSelectedDate(event.date)
  }

  function handleEdited(updated) {
    setEvents(prev => prev.map(e => e.id === updated.id ? updated : e).sort((a, b) => a.date.localeCompare(b.date)))
    setSelectedDate(updated.date)
  }

  function prevMonth() {
    setCurrentMonth(({ year, month }) => {
      if (month === 0) return { year: year - 1, month: 11 }
      return { year, month: month - 1 }
    })
    setSelectedDate(null)
  }

  function nextMonth() {
    setCurrentMonth(({ year, month }) => {
      if (month === 11) return { year: year + 1, month: 0 }
      return { year, month: month + 1 }
    })
    setSelectedDate(null)
  }

  const selectedEvents = selectedDate
    ? events.filter(e => e.date === selectedDate)
    : []

  return (
    <div style={{ padding: isMobile ? '16px' : '28px', maxWidth: '900px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{
          fontFamily: fonts.heading,
          fontSize: isMobile ? '1.6rem' : '2rem',
          color: colors.gold,
          marginBottom: '4px',
        }}>
          Practice Calendar
        </h1>
        <p style={{ color: colors.textMuted, fontSize: '0.85rem' }}>
          {events.length} practice{events.length !== 1 ? 's' : ''} this month
        </p>
      </div>

      {/* Calendar card */}
      <div style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: '12px',
        boxShadow: shadow.card,
        overflow: 'hidden',
        marginBottom: '24px',
      }}>
        {/* Month navigation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: `1px solid ${colors.border}`,
        }}>
          <button
            onClick={prevMonth}
            style={{
              background: 'none', border: `1px solid ${colors.border}`,
              color: colors.cream, cursor: 'pointer',
              padding: '6px 14px', borderRadius: radius.md,
              fontSize: '1rem', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = colors.gold; e.currentTarget.style.color = colors.gold }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.color = colors.cream }}
          >
            ‹
          </button>

          <div style={{ textAlign: 'center' }}>
            <h2 style={{
              fontFamily: fonts.heading,
              fontSize: '1.2rem',
              color: colors.cream,
            }}>
              {MONTH_NAMES[currentMonth.month]} {currentMonth.year}
            </h2>
          </div>

          <button
            onClick={nextMonth}
            style={{
              background: 'none', border: `1px solid ${colors.border}`,
              color: colors.cream, cursor: 'pointer',
              padding: '6px 14px', borderRadius: radius.md,
              fontSize: '1rem', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = colors.gold; e.currentTarget.style.color = colors.gold }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.color = colors.cream }}
          >
            ›
          </button>
        </div>

        {/* Grid */}
        <div style={{ padding: '16px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: colors.textMuted }}>
              Loading…
            </div>
          ) : (
            <CalendarGrid
              year={currentMonth.year}
              month={currentMonth.month}
              events={events}
              selectedDate={selectedDate}
              onSelectDay={(date) => {
                setSelectedDate(date)
              }}
            />
          )}
        </div>
      </div>

      {/* Event panel for selected date */}
      {selectedDate && (
        <div style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: '12px',
          boxShadow: shadow.card,
          overflow: 'hidden',
          marginBottom: '16px',
        }}>
          <EventList
            events={selectedEvents}
            selectedDate={selectedDate}
            onAddEvent={() => setShowAdd(true)}
            onEdited={handleEdited}
          />
        </div>
      )}

      {/* Add Practice button (always visible) */}
      {!selectedDate && (
        <Button variant="primary" onClick={() => setShowAdd(true)}>
          + Add Practice
        </Button>
      )}

      {showAdd && (
        <AddEventModal
          onClose={() => setShowAdd(false)}
          onAdded={handleAdded}
          defaultDate={selectedDate}
        />
      )}
    </div>
  )
}
