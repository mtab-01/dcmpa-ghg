import { useState } from 'react'
import { colors, fonts, radius, shadow } from '../../theme'
import { computeShares, formatCurrency } from '../../utils/splitExpense'
import Badge from '../ui/Badge'

function ReceiptModal({ url, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '-12px', right: '-12px',
            background: colors.surface, border: `1px solid ${colors.border}`,
            color: colors.cream, cursor: 'pointer',
            width: '32px', height: '32px', borderRadius: '50%',
            fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1,
          }}
        >×</button>
        <img
          src={url}
          alt="Receipt"
          style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '8px', display: 'block' }}
        />
      </div>
    </div>
  )
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ExpenseList({ expenses, members }) {
  const [receiptUrl, setReceiptUrl] = useState(null)

  if (expenses.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: colors.textMuted }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>💸</div>
        <p style={{ fontFamily: fonts.heading, color: colors.creamDim, marginBottom: '8px' }}>No expenses yet</p>
        <p style={{ fontSize: '0.85rem' }}>Add your first expense using the button above.</p>
      </div>
    )
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {expenses.map(expense => {
          const shares = computeShares(expense.amount, expense.split_type, expense.splits, members)

          return (
            <div
              key={expense.id}
              style={{
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: radius.lg,
                padding: '16px 20px',
                boxShadow: shadow.card,
              }}
            >
              {/* Top row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontFamily: fonts.heading, color: colors.cream, fontSize: '1rem', marginBottom: '6px' }}>
                    {expense.title}
                  </h4>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <Badge>{expense.category || 'Other'}</Badge>
                    <span style={{
                      fontFamily: fonts.mono,
                      fontSize: '0.72rem',
                      color: colors.textMuted,
                      background: colors.border,
                      padding: '2px 6px',
                      borderRadius: '4px',
                    }}>
                      Paid by {expense.paid_by}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: colors.textMuted }}>
                      {formatDate(expense.date)}
                    </span>
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{
                    fontFamily: fonts.heading,
                    fontSize: '1.3rem',
                    color: colors.gold,
                  }}>
                    {formatCurrency(expense.amount)}
                  </p>
                  <p style={{ fontSize: '0.72rem', color: colors.textMuted, fontFamily: fonts.mono }}>
                    {formatCurrency(expense.amount / members.length)}/person
                  </p>
                </div>
              </div>

              {/* Per-person chips */}
              <div style={{ marginTop: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {members.slice(0, 6).map(member => (
                  <span key={member} style={{
                    fontFamily: fonts.mono,
                    fontSize: '0.68rem',
                    color: colors.creamDim,
                    background: `${colors.border}`,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    border: `1px solid ${colors.borderLight}`,
                  }}>
                    {member}: {formatCurrency(shares[member] || 0)}
                  </span>
                ))}
                {members.length > 6 && (
                  <span style={{
                    fontFamily: fonts.mono,
                    fontSize: '0.68rem',
                    color: colors.textMuted,
                    padding: '2px 6px',
                  }}>
                    +{members.length - 6} more
                  </span>
                )}
              </div>

              {/* Receipt button */}
              {expense.receipt_url && (
                <div style={{ marginTop: '10px' }}>
                  <button
                    onClick={() => setReceiptUrl(expense.receipt_url)}
                    style={{
                      background: 'none',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '4px',
                      color: colors.creamDim,
                      cursor: 'pointer',
                      padding: '4px 10px',
                      fontSize: '0.78rem',
                      fontFamily: fonts.mono,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = colors.gold; e.currentTarget.style.color = colors.gold }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.color = colors.creamDim }}
                  >
                    🧾 View Receipt
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {receiptUrl && <ReceiptModal url={receiptUrl} onClose={() => setReceiptUrl(null)} />}
    </>
  )
}
