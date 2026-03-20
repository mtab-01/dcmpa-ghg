import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { colors, fonts, radius, shadow } from '../theme'
import { useIsMobile } from '../hooks/useWindowWidth'

const today = new Date()
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

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

  useEffect(() => {
    async function fetchStats() {
      const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

      const [{ count: videoCount }, { count: eventCount }, { data: expenseData }] = await Promise.all([
        supabase.from('videos').select('*', { count: 'exact', head: true }),
        supabase.from('events').select('*', { count: 'exact', head: true }).gte('date', `${thisMonth}-01`),
        supabase.from('expenses').select('amount'),
      ])

      const total = (expenseData || []).reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)

      setStats({
        videos: videoCount ?? '—',
        events: eventCount ?? '—',
        expenses: total > 0 ? `$${total.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '$0',
      })
    }
    fetchStats()
  }, [])

  const greeting = (() => {
    const h = today.getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <div style={{ padding: isMobile ? '24px 16px' : '36px 36px', maxWidth: '860px' }}>

      {/* Header */}
      <div style={{ marginBottom: isMobile ? '28px' : '36px' }}>
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
