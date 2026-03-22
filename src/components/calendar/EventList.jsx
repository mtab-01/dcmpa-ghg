import { useState, useEffect, useCallback } from 'react'
import { db } from '../../firebase'
import { collection, getDocs, doc, setDoc, deleteDoc, query, where } from 'firebase/firestore'
import { colors, fonts, radius, shadow } from '../../theme'
import { buildGCalUrl } from '../../utils/calendarUrl'
import { DEFAULT_MEMBERS } from '../../constants'
import Button from '../ui/Button'
import AddEventModal from './AddEventModal'

const MEMBERS_KEY = 'bhangra_members'

function loadMembers() {
  try {
    const stored = localStorage.getItem(MEMBERS_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.length === 12) return parsed
    }
  } catch {}
  return DEFAULT_MEMBERS
}

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

export default function EventList({ events, selectedDate, onAddEvent, onEdited }) {
  if (!selectedDate) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: colors.textMuted, fontSize: '0.85rem' }}>
        Click a day to view or add events
      </div>
    )
  }

  return (
    <div style={{ padding: '0' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', borderBottom: `1px solid ${colors.border}`,
      }}>
        <div>
          <h3 style={{ fontFamily: fonts.heading, color: colors.cream, fontSize: '1rem' }}>
            {formatDisplayDate(selectedDate)}
          </h3>
          <p style={{ color: colors.textMuted, fontSize: '0.78rem', marginTop: '2px' }}>
            {events.length} event{events.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={onAddEvent}>+ Add</Button>
      </div>

      {events.length === 0 ? (
        <div style={{ padding: '24px 20px', color: colors.textMuted, fontSize: '0.85rem', textAlign: 'center' }}>
          No practices scheduled.{' '}
          <button onClick={onAddEvent} style={{ background: 'none', border: 'none', color: colors.gold, cursor: 'pointer', fontSize: 'inherit', textDecoration: 'underline' }}>
            Add one?
          </button>
        </div>
      ) : (
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {events.map(event => <EventCard key={event.id} event={event} onEdited={onEdited} />)}
        </div>
      )}
    </div>
  )
}

function EventCard({ event, onEdited }) {
  const gcalUrl = buildGCalUrl({ title: event.title, date: event.date, startTime: event.time, endTime: event.end_time, location: event.location, notes: event.notes })
  const members = loadMembers()
  const [attendance, setAttendance] = useState({})
  const [showAttendance, setShowAttendance] = useState(false)
  const [loadingAttendance, setLoadingAttendance] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [currentEvent, setCurrentEvent] = useState(event)

  useEffect(() => { setCurrentEvent(event) }, [event])

  useEffect(() => {
    if (!showAttendance) return
    setLoadingAttendance(true)
    const q = query(collection(db, 'attendance'), where('event_id', '==', currentEvent.id))
    getDocs(q).then(snap => {
      const map = {}
      snap.docs.forEach(d => {
        const { position, response } = d.data()
        map[position] = response
      })
      setAttendance(map)
      setLoadingAttendance(false)
    })
  }, [showAttendance, currentEvent.id])

  const setResponse = useCallback(async (position, value) => {
    const current = attendance[position]
    const newVal = current === value ? null : value

    setAttendance(prev => ({ ...prev, [position]: newVal }))

    const docId = `${currentEvent.id}_${position}`
    if (newVal) {
      await setDoc(doc(db, 'attendance', docId), {
        event_id: currentEvent.id, position, response: newVal,
      })
    } else {
      await deleteDoc(doc(db, 'attendance', docId))
    }
  }, [attendance, currentEvent.id])

  const handleEdited = (updated) => {
    setCurrentEvent(updated)
    if (onEdited) onEdited(updated)
  }

  const yesCount = members.filter((_, i) => attendance[i] === 'yes').length
  const noCount = members.filter((_, i) => attendance[i] === 'no').length

  return (
    <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: '14px 16px', boxShadow: shadow.card }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <h4 style={{ fontFamily: fonts.heading, color: colors.cream, fontSize: '0.95rem', lineHeight: 1.3, flex: 1 }}>
          {currentEvent.title}
        </h4>
        <button
          onClick={() => setShowEdit(true)}
          title="Edit event"
          style={{
            background: 'none', border: `1px solid ${colors.border}`, borderRadius: radius.sm,
            color: colors.textMuted, cursor: 'pointer', padding: '3px 8px',
            fontSize: '0.72rem', flexShrink: 0, transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = colors.gold; e.currentTarget.style.color = colors.gold }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.color = colors.textMuted }}
        >
          Edit
        </button>
      </div>

      <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {currentEvent.time && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ color: colors.textMuted, fontSize: '0.75rem' }}>🕐</span>
            <span style={{ color: colors.creamDim, fontSize: '0.82rem', fontFamily: fonts.mono }}>
              {formatTime(currentEvent.time)}{currentEvent.end_time ? ` – ${formatTime(currentEvent.end_time)}` : ''}
            </span>
          </div>
        )}
        {currentEvent.location && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ color: colors.textMuted, fontSize: '0.75rem' }}>📍</span>
            <span style={{ color: colors.creamDim, fontSize: '0.82rem' }}>{currentEvent.location}</span>
          </div>
        )}
        {currentEvent.notes && (
          <p style={{ color: colors.textMuted, fontSize: '0.8rem', marginTop: '4px', lineHeight: 1.5 }}>{currentEvent.notes}</p>
        )}
      </div>

      {/* Attendance toggle */}
      <button
        onClick={() => setShowAttendance(v => !v)}
        style={{
          marginTop: '12px', background: 'none', border: `1px solid ${colors.border}`,
          borderRadius: radius.md, padding: '6px 12px', cursor: 'pointer',
          fontSize: '0.78rem', color: colors.creamDim, fontFamily: fonts.body,
          display: 'flex', alignItems: 'center', gap: '8px',
          transition: 'border-color 0.15s', width: '100%', justifyContent: 'space-between',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = colors.gold }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = colors.border }}
      >
        <span>
          👥 Attendance
          {(yesCount > 0 || noCount > 0) && (
            <span style={{ marginLeft: '8px', color: colors.textMuted }}>
              <span style={{ color: colors.green }}>✓ {yesCount}</span>
              {' · '}
              <span style={{ color: colors.red }}>✗ {noCount}</span>
              {' · '}
              <span>{12 - yesCount - noCount} pending</span>
            </span>
          )}
        </span>
        <span style={{ color: colors.textMuted, fontSize: '0.7rem' }}>{showAttendance ? '▲' : '▼'}</span>
      </button>

      {showAttendance && (
        <div style={{ marginTop: '8px', border: `1px solid ${colors.border}`, borderRadius: radius.md, overflow: 'hidden' }}>
          <div style={{ padding: '8px 12px', background: colors.bgDeep, borderBottom: `1px solid ${colors.border}`, fontFamily: fonts.mono, fontSize: '0.65rem', color: colors.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {loadingAttendance ? 'Loading…' : 'Will you attend?'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1px', background: colors.border }}>
            {members.map((name, i) => {
              const resp = attendance[i]
              return (
                <div key={i} style={{ background: colors.surface, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ fontSize: '0.82rem', color: colors.creamDim, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {name}
                  </span>
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    {['yes', 'no'].map(val => (
                      <button
                        key={val}
                        onClick={() => setResponse(i, val)}
                        title={val === 'yes' ? 'Attending' : 'Not attending'}
                        style={{
                          width: '28px', height: '28px', borderRadius: radius.sm,
                          border: `1px solid ${resp === val ? (val === 'yes' ? colors.green : colors.red) : colors.border}`,
                          background: resp === val ? `${val === 'yes' ? colors.green : colors.red}18` : 'transparent',
                          color: resp === val ? (val === 'yes' ? colors.green : colors.red) : colors.textMuted,
                          cursor: 'pointer', fontSize: '0.85rem', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s', fontWeight: 700,
                        }}
                      >
                        {val === 'yes' ? '✓' : '✗'}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ marginTop: '12px' }}>
        <a href={gcalUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="ghost" size="sm">📅 Add to Google Calendar</Button>
        </a>
      </div>

      {showEdit && (
        <AddEventModal
          event={currentEvent}
          onClose={() => setShowEdit(false)}
          onEdited={handleEdited}
          onAdded={() => {}}
        />
      )}
    </div>
  )
}
