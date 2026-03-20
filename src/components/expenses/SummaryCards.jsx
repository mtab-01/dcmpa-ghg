import { colors, fonts, radius, shadow } from '../../theme'

function Card({ label, value, sub }) {
  return (
    <div style={{
      background: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: radius.lg,
      padding: '20px 24px',
      boxShadow: shadow.card,
      flex: 1,
      minWidth: '140px',
    }}>
      <p style={{
        fontFamily: fonts.mono,
        fontSize: '0.65rem',
        color: colors.textMuted,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        marginBottom: '8px',
      }}>
        {label}
      </p>
      <p style={{
        fontFamily: fonts.heading,
        fontSize: '1.7rem',
        color: colors.gold,
        lineHeight: 1,
        marginBottom: '4px',
      }}>
        {value}
      </p>
      {sub && (
        <p style={{ fontSize: '0.75rem', color: colors.textMuted }}>{sub}</p>
      )}
    </div>
  )
}

export default function SummaryCards({ expenses }) {
  const total = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
  const perPerson = total / 12
  const count = expenses.length

  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  return (
    <div style={{
      display: 'flex',
      gap: '16px',
      flexWrap: 'wrap',
      marginBottom: '28px',
    }}>
      <Card label="Total Spent" value={fmt(total)} sub="all expenses" />
      <Card label="Per Person" value={fmt(perPerson)} sub="÷ 12 members" />
      <Card label="Expenses" value={count} sub={count === 1 ? '1 expense' : `${count} expenses`} />
    </div>
  )
}
