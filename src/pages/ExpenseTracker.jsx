import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { colors, fonts } from '../theme'
import { useIsMobile } from '../hooks/useWindowWidth'
import { useMembers } from '../hooks/useMembers'
import SummaryCards from '../components/expenses/SummaryCards'
import MemberBalance from '../components/expenses/MemberBalance'
import ExpenseList from '../components/expenses/ExpenseList'
import AddExpenseModal from '../components/expenses/AddExpenseModal'
import Button from '../components/ui/Button'

export default function ExpenseTracker() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const { members } = useMembers()
  const isMobile = useIsMobile()

  useEffect(() => {
    loadExpenses()
  }, [])

  async function loadExpenses() {
    setLoading(true)
    try {
      const q = query(collection(db, 'expenses'), orderBy('date', 'desc'))
      const snap = await getDocs(q)
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          if (b.date !== a.date) return b.date.localeCompare(a.date)
          return (b.created_at || '') > (a.created_at || '') ? 1 : -1
        })
      setExpenses(data)
    } catch {}
    setLoading(false)
  }

  function handleAdded(expense) {
    setExpenses(prev => [expense, ...prev])
  }

  return (
    <div style={{ padding: isMobile ? '16px' : '28px', maxWidth: '900px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: isMobile ? 'flex-start' : 'center',
        flexDirection: isMobile ? 'column' : 'row',
        gap: '12px',
        marginBottom: '24px',
      }}>
        <div style={{ flex: 1 }}>
          <h1 style={{
            fontFamily: fonts.heading,
            fontSize: isMobile ? '1.6rem' : '2rem',
            color: colors.gold,
            marginBottom: '4px',
          }}>
            Expenses
          </h1>
          <p style={{ color: colors.textMuted, fontSize: '0.85rem' }}>
            Team budget tracker · {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowAdd(true)}>
          + Add Expense
        </Button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: colors.textMuted }}>
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⏳</div>
          <p>Loading expenses…</p>
        </div>
      ) : (
        <>
          <SummaryCards expenses={expenses} />
          <MemberBalance expenses={expenses} members={members} />

          {/* Expense list header */}
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{
              fontFamily: fonts.heading,
              color: colors.cream,
              fontSize: '1.1rem',
            }}>
              All Expenses
            </h2>
          </div>

          <ExpenseList expenses={expenses} members={members} />
        </>
      )}

      {showAdd && (
        <AddExpenseModal
          onClose={() => setShowAdd(false)}
          onAdded={handleAdded}
          members={members}
        />
      )}
    </div>
  )
}
