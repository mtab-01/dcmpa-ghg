import { useState, useEffect } from 'react'
import { db } from '../firebase'
import {
  collection, getDocs, doc, setDoc, deleteDoc,
  query, where, orderBy, getCountFromServer,
} from 'firebase/firestore'
import { colors, fonts, radius, shadow } from '../theme'
import { useIsMobile } from '../hooks/useWindowWidth'
import { DEFAULT_MEMBERS } from '../constants'

const today = new Date()
const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatShortDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return `${DAY_NAMES[dt.getDay()]}, ${MONTH_NAMES[m - 1].slice(0, 3)} ${d}`
}

function formatTime12(timeStr) {
  if (!timeStr) return null
  const [h, min] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(min).padStart(2, '0')} ${ampm}`
}

function StatCard({ icon, label, value, accent }) {
  return (
    <div style={{
      background: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: radius.xl,
      padding: '20px 24px',
      boxShadow: shadow.card,
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      flex: 1,
      minWidth: '140px',
    }}>
      <div style={{
        width: '44px',
        height: '44px',
        borderRadius: radius.lg,
        background: `${accent}14`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.3rem',
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{
          fontSize: '1.6rem',
          fontWeight: 700,
          fontFamily: fonts.heading,
          color: accent,
          lineHeight: 1,
        }}>
          {value}
        </div>
        <div style={{
          fontSize: '0.78rem',
          color: colors.textMuted,
          marginTop: '4px',
          fontWeight: 500,
          letterSpacing: '0.01em',
        }}>
          {label}
        </div>
      </div>
    </div>
  )
}

function QuickLink({ icon, title, description, onClick, accent }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? colors.surfaceHover : colors.surface,
        border: `1px solid ${hovered ? accent + '50' : colors.border}`,
        borderRadius: radius.xl,
        padding: '20px',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.18s ease',
        boxShadow: hovered ? shadow.glow : shadow.card,
        flex: 1,
        minWidth: '140px',
      }}
    >
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: radius.md,
        background: `${accent}14`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.2rem',
        marginBottom: '12px',
      }}>
        {icon}
      </div>
      <div style={{
        fontFamily: fonts.heading,
        fontWeight: 700,
        fontSize: '0.95rem',
        color: colors.cream,
        marginBottom: '4px',
      }}>
        {title}
      </div>
      <div style={{
        fontSize: '0.78rem',
        color: colors.textMuted,
        lineHeight: 1.5,
      }}>
        {description}
      </div>
    </button>
  )
}

export default function Home({ onNavigate }) {
  const isMobile = useIsMobile()
  const [stats, setStats] = useState({ videos: '—', events: '—', expenses: '—' })
  const [upcomingPractices, setUpcomingPractices] = useState(null)
  const [nextEvent, setNextEvent] = useState(undefined) // undefined=loading, null=none, obj=event
  const [members, setMembers] = useState(DEFAULT_MEMBERS)
  const [myPosition, setMyPosition] = useState(() => {
    const s = localStorage.getItem('ghg_my_position')
    return s !== null ? parseInt(s, 10) : null
  })
  const [myRsvp, setMyRsvp] = useState(null) // null=not responded, 'yes', 'no'
  const [rsvpSaving, setRsvpSaving] = useState(false)

  // Load member names
  useEffect(() => {
    async function loadMembers() {
      try {
        const snap = await getDocs(collection(db, 'members'))
        if (snap.size > 0) {
          const arr = [...DEFAULT_MEMBERS]
          snap.docs.forEach(d => {
            const { position, name } = d.data()
            if (position >= 0 && position < 12) arr[position] = name
          })
          setMembers(arr)
        }
      } catch {}
    }
    loadMembers()
  }, [])

  useEffect(() => {
    async function fetchStats() {
      const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
      try {
        const [videosSnap, eventsSnap, expensesSnap] = await Promise.all([
          getCountFromServer(collection(db, 'videos')),
          getCountFromServer(query(collection(db, 'events'), where('date', '>=', `${thisMonth}-01`))),
          getDocs(collection(db, 'expenses')),
        ])
        const videoCount = videosSnap.data().count
        const eventCount = eventsSnap.data().count
        const total = expensesSnap.docs.reduce((sum, d) => sum + (parseFloat(d.data().amount) || 0), 0)
        setStats({
          videos: videoCount,
          events: eventCount,
          expenses: total > 0 ? `$${total.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '$0',
        })
      } catch {}
    }

    async function fetchUpcoming() {
      const cutoff = new Date(today)
      cutoff.setDate(cutoff.getDate() - 14)
      const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`

      try {
        const q = query(collection(db, 'events'), where('date', '>=', cutoffStr), orderBy('date'))
        const snap = await getDocs(q)
        const events = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
          .slice(0, 4)

        if (events.length === 0) {
          setUpcomingPractices([])
          setNextEvent(null)
          return
        }

        const ids = events.map(e => e.id)
        const attQ = query(collection(db, 'attendance'), where('event_id', 'in', ids))
        const attSnap = await getDocs(attQ)

        const attMap = {}
        attSnap.docs.forEach(d => {
          const { event_id, position, response } = d.data()
          if (!attMap[event_id]) attMap[event_id] = {}
          attMap[event_id][position] = response
        })

        const practices = events.map(e => {
          const att = attMap[e.id] || {}
          const yes = Object.values(att).filter(v => v === 'yes').length
          const no = Object.values(att).filter(v => v === 'no').length
          return { ...e, yes, no, pending: 12 - yes - no, att }
        })

        setUpcomingPractices(practices)
        const next = practices.find(p => p.date >= todayStr) ?? null
        setNextEvent(next)
      } catch {
        setUpcomingPractices([])
        setNextEvent(null)
      }
    }

    fetchStats()
    fetchUpcoming()
  }, [])

  // Derive my RSVP from already-fetched attendance data
  useEffect(() => {
    if (myPosition === null || !nextEvent) { setMyRsvp(null); return }
    setMyRsvp(nextEvent.att?.[myPosition] ?? null)
  }, [myPosition, nextEvent?.id])

  function saveMyPosition(pos) {
    const parsed = parseInt(pos, 10)
    setMyPosition(parsed)
    localStorage.setItem('ghg_my_position', String(parsed))
  }

  async function handleMyRsvp(response) {
    if (myPosition === null || !nextEvent || rsvpSaving) return
    setRsvpSaving(true)
    const newVal = myRsvp === response ? null : response
    const docId = `${nextEvent.id}_${myPosition}`

    if (newVal === null) {
      await deleteDoc(doc(db, 'attendance', docId))
    } else {
      await setDoc(doc(db, 'attendance', docId), {
        event_id: nextEvent.id, position: myPosition, response: newVal,
      })
    }

    setMyRsvp(newVal)

    const updateCounts = (p) => {
      if (p.id !== nextEvent.id) return p
      const att = { ...p.att }
      if (newVal === null) delete att[myPosition]
      else att[myPosition] = newVal
      const yes = Object.values(att).filter(v => v === 'yes').length
      const no = Object.values(att).filter(v => v === 'no').length
      return { ...p, att, yes, no, pending: 12 - yes - no }
    }
    setUpcomingPractices(prev => prev ? prev.map(updateCounts) : prev)
    setNextEvent(prev => prev ? updateCounts(prev) : prev)
    setRsvpSaving(false)
  }

  const greeting = (() => {
    const h = today.getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  const goingNames = nextEvent
    ? Object.entries(nextEvent.att || {})
        .filter(([, r]) => r === 'yes')
        .map(([pos]) => members[parseInt(pos)])
        .filter(Boolean)
    : []

  return (
    <div style={{ padding: isMobile ? '24px 16px' : '36px 36px', maxWidth: '860px' }}>

      {/* Header */}
      <div style={{ marginBottom: isMobile ? '24px' : '28px' }}>
        <p style={{
          fontSize: '0.82rem',
          color: colors.textMuted,
          fontWeight: 500,
          marginBottom: '6px',
          letterSpacing: '0.02em',
        }}>
          {greeting} · {MONTH_NAMES[today.getMonth()]} {today.getDate()}, {today.getFullYear()}
        </p>
        <h1 style={{
          fontFamily: fonts.heading,
          fontSize: isMobile ? '2rem' : '2.6rem',
          fontWeight: 800,
          color: colors.cream,
          lineHeight: 1.1,
          marginBottom: '8px',
        }}>
          Welcome to{' '}
          <span style={{ color: colors.gold }}>DCMPA</span>
          {' '}
          <span style={{ color: colors.orange }}>GHG</span>
        </h1>
        <p style={{ color: colors.textMuted, fontSize: '0.92rem', lineHeight: 1.6 }}>
          Your team's central hub for videos, events, and expenses.
        </p>
      </div>

      {/* ── Quick RSVP Card ── */}
      {nextEvent !== undefined && nextEvent !== null && (
        <div style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.xl,
          boxShadow: shadow.card,
          padding: '20px 24px',
          marginBottom: isMobile ? '24px' : '32px',
          borderLeft: `4px solid ${colors.gold}`,
        }}>
          {/* Event info */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
              <span style={{
                fontFamily: fonts.heading,
                fontWeight: 800,
                fontSize: isMobile ? '1.05rem' : '1.15rem',
                color: colors.cream,
              }}>
                {nextEvent.title}
              </span>
              <span style={{ fontSize: '0.78rem', color: colors.textMuted }}>
                {formatShortDate(nextEvent.date)}
                {nextEvent.time ? ` · ${formatTime12(nextEvent.time)}` : ''}
                {nextEvent.end_time ? ` – ${formatTime12(nextEvent.end_time)}` : ''}
              </span>
            </div>
            {nextEvent.location && (
              <div style={{ fontSize: '0.78rem', color: colors.textMuted }}>
                📍 {nextEvent.location}
              </div>
            )}
          </div>

          {/* Social proof */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '0.8rem', color: colors.textMuted, marginBottom: goingNames.length > 0 ? '4px' : 0 }}>
              <span style={{ color: colors.green, fontWeight: 600 }}>✓ {nextEvent.yes}</span>
              {' going · '}
              <span style={{ color: colors.red, fontWeight: 600 }}>✗ {nextEvent.no}</span>
              {' out · '}
              <span>{nextEvent.pending} pending</span>
            </div>
            {goingNames.length > 0 && (
              <div style={{ fontSize: '0.75rem', color: colors.textMuted }}>
                {goingNames.slice(0, 3).join(', ')}
                {goingNames.length > 3 ? ` +${goingNames.length - 3} more` : ''}
              </div>
            )}
          </div>

          {/* Identity picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', color: colors.textMuted, whiteSpace: 'nowrap' }}>
              {myPosition === null ? 'Who are you?' : 'You are:'}
            </span>
            <select
              value={myPosition ?? ''}
              onChange={e => e.target.value !== '' && saveMyPosition(e.target.value)}
              style={{
                fontFamily: fonts.body,
                fontSize: '0.82rem',
                color: myPosition === null ? colors.textMuted : colors.cream,
                background: colors.surfaceHover,
                border: `1px solid ${colors.border}`,
                borderRadius: radius.md,
                padding: '4px 8px',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {myPosition === null && <option value="">Pick your name…</option>}
              {members.map((name, i) => (
                <option key={i} value={i}>{name}</option>
              ))}
            </select>
          </div>

          {/* RSVP buttons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => handleMyRsvp('yes')}
              disabled={myPosition === null || rsvpSaving}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: radius.lg,
                border: `2px solid ${myRsvp === 'yes' ? colors.green : colors.border}`,
                background: myRsvp === 'yes' ? colors.green : 'transparent',
                color: myRsvp === 'yes' ? '#fff' : colors.cream,
                fontFamily: fonts.heading,
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: myPosition === null ? 'not-allowed' : 'pointer',
                opacity: myPosition === null ? 0.5 : 1,
                transition: 'all 0.15s ease',
              }}
            >
              ✓ I'm in!
            </button>
            <button
              onClick={() => handleMyRsvp('no')}
              disabled={myPosition === null || rsvpSaving}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: radius.lg,
                border: `2px solid ${myRsvp === 'no' ? colors.red : colors.border}`,
                background: myRsvp === 'no' ? colors.red : 'transparent',
                color: myRsvp === 'no' ? '#fff' : colors.cream,
                fontFamily: fonts.heading,
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: myPosition === null ? 'not-allowed' : 'pointer',
                opacity: myPosition === null ? 0.5 : 1,
                transition: 'all 0.15s ease',
              }}
            >
              ✗ Can't make it
            </button>
          </div>

          {myRsvp && (
            <p style={{ marginTop: '10px', fontSize: '0.75rem', color: colors.textMuted, textAlign: 'center' }}>
              {myRsvp === 'yes' ? '✓ You\'re confirmed! Tap again to undo.' : '✗ Marked as out. Tap again to undo.'}
            </p>
          )}
        </div>
      )}

      {/* Stats */}
      <div style={{
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
        marginBottom: isMobile ? '28px' : '36px',
      }}>
        <StatCard icon="▶" label="Videos saved" value={stats.videos} accent={colors.gold} />
        <StatCard icon="📅" label={`Events in ${MONTH_NAMES[today.getMonth()]}`} value={stats.events} accent={colors.orange} />
        <StatCard icon="💰" label="Total spent" value={stats.expenses} accent={colors.green} />
      </div>

      {/* Upcoming Attendance Widget */}
      <div style={{ marginBottom: isMobile ? '28px' : '36px' }}>
        <p style={{
          fontFamily: fonts.mono,
          fontSize: '0.68rem',
          color: colors.textMuted,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: '14px',
        }}>
          Attendance
        </p>
        <div style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.xl,
          boxShadow: shadow.card,
          overflow: 'hidden',
        }}>
          {upcomingPractices === null ? (
            <div style={{ padding: '20px', textAlign: 'center', color: colors.textMuted, fontSize: '0.82rem' }}>
              Loading…
            </div>
          ) : upcomingPractices.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: colors.textMuted, fontSize: '0.82rem' }}>
              No recent practices.{' '}
              <button onClick={() => onNavigate('calendar')} style={{ background: 'none', border: 'none', color: colors.gold, cursor: 'pointer', fontSize: 'inherit', textDecoration: 'underline', padding: 0 }}>
                Add one?
              </button>
            </div>
          ) : upcomingPractices.map((practice, idx) => {
            const yesWidth = (practice.yes / 12) * 100
            const noWidth = (practice.no / 12) * 100
            const pendingWidth = (practice.pending / 12) * 100
            const isNext = nextEvent && practice.id === nextEvent.id
            return (
              <div
                key={practice.id}
                onClick={() => onNavigate('calendar')}
                style={{
                  padding: '14px 20px',
                  borderBottom: idx < upcomingPractices.length - 1 ? `1px solid ${colors.border}` : 'none',
                  cursor: 'pointer',
                  background: isNext ? `${colors.gold}08` : 'transparent',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = colors.surfaceHover }}
                onMouseLeave={e => { e.currentTarget.style.background = isNext ? `${colors.gold}08` : 'transparent' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div>
                    <span style={{ fontFamily: fonts.heading, fontSize: '0.9rem', color: colors.cream, fontWeight: 700 }}>
                      {practice.title}
                    </span>
                    {isNext && (
                      <span style={{
                        marginLeft: '8px',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        color: colors.gold,
                        background: `${colors.gold}18`,
                        borderRadius: radius.sm,
                        padding: '2px 6px',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                      }}>
                        Next
                      </span>
                    )}
                    <span style={{ color: colors.textMuted, fontSize: '0.75rem', marginLeft: '10px' }}>
                      {formatShortDate(practice.date)}
                      {practice.time ? ` · ${formatTime12(practice.time)}` : ''}
                      {practice.end_time ? ` – ${formatTime12(practice.end_time)}` : ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', flexShrink: 0, marginLeft: '12px' }}>
                    <span style={{ color: colors.green, fontWeight: 600 }}>✓ {practice.yes}</span>
                    <span style={{ color: colors.red, fontWeight: 600 }}>✗ {practice.no}</span>
                    <span style={{ color: colors.textMuted }}>{practice.pending} pending</span>
                  </div>
                </div>
                <div style={{ display: 'flex', height: '5px', borderRadius: '3px', overflow: 'hidden', background: colors.border }}>
                  {yesWidth > 0 && <div style={{ width: `${yesWidth}%`, background: colors.green, transition: 'width 0.3s' }} />}
                  {noWidth > 0 && <div style={{ width: `${noWidth}%`, background: colors.red, transition: 'width 0.3s' }} />}
                  {pendingWidth > 0 && <div style={{ width: `${pendingWidth}%`, background: colors.border }} />}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Divider label */}
      <p style={{
        fontFamily: fonts.mono,
        fontSize: '0.68rem',
        color: colors.textMuted,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        marginBottom: '14px',
      }}>
        Quick Access
      </p>

      {/* Quick links */}
      <div style={{
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
      }}>
        <QuickLink
          icon="▶"
          title="Video Library"
          description="Browse practice videos and routines."
          accent={colors.gold}
          onClick={() => onNavigate('videos')}
        />
        <QuickLink
          icon="📅"
          title="Calendar"
          description="View and add practice sessions."
          accent={colors.orange}
          onClick={() => onNavigate('calendar')}
        />
        <QuickLink
          icon="💰"
          title="Expenses"
          description="Track team spending and balances."
          accent={colors.green}
          onClick={() => onNavigate('expenses')}
        />
        <QuickLink
          icon="⚙"
          title="Settings"
          description="Manage members and preferences."
          accent={colors.textMuted}
          onClick={() => onNavigate('settings')}
        />
      </div>
    </div>
  )
}
