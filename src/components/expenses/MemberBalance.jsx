import { colors, fonts, radius, shadow } from '../../theme'
import { computeBalances, formatCurrency } from '../../utils/splitExpense'

export default function MemberBalance({ expenses, members }) {
  const balances = computeBalances(expenses, members)

  return (
    <div style={{
      background: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: radius.lg,
      boxShadow: shadow.card,
      overflow: 'hidden',
      marginBottom: '28px',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px',
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <h3 style={{ fontFamily: fonts.heading, color: colors.cream, fontSize: '1rem' }}>
          Member Balances
        </h3>
        <span style={{
          fontFamily: fonts.mono,
          fontSize: '0.68rem',
          color: colors.textMuted,
          letterSpacing: '0.05em',
        }}>
          {members.length} MEMBERS
        </span>
      </div>

      {/* Member rows */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '0',
      }}>
        {members.map((member, idx) => {
          const balance = balances[member] || 0
          const isOwed = balance > 0.005
          const isOwes = balance < -0.005
          const isSettled = !isOwed && !isOwes

          const statusColor = isOwed ? colors.green : isOwes ? colors.red : colors.textMuted
          const statusLabel = isOwed ? `Owed ${formatCurrency(balance)}` : isOwes ? `Owes ${formatCurrency(balance)}` : 'Settled'
          const statusBg = isOwed ? `${colors.green}12` : isOwes ? `${colors.red}12` : 'transparent'

          return (
            <div
              key={member}
              style={{
                padding: '12px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                borderBottom: idx < members.length - 1 ? `1px solid ${colors.border}` : 'none',
                background: statusBg,
              }}
            >
              <span style={{
                color: colors.cream,
                fontSize: '0.88rem',
                fontWeight: '500',
              }}>
                {member}
              </span>
              <span style={{
                fontFamily: fonts.mono,
                fontSize: '0.78rem',
                color: statusColor,
                background: `${statusColor}18`,
                padding: '2px 8px',
                borderRadius: '4px',
                whiteSpace: 'nowrap',
              }}>
                {statusLabel}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
