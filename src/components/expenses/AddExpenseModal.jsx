import { useState } from 'react'
import { db, storage } from '../../firebase'
import { collection, addDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { colors, fonts } from '../../theme'
import { EXPENSE_CATEGORIES } from '../../constants'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { Input, Select, FormField } from '../ui/Input'

export default function AddExpenseModal({ onClose, onAdded, members }) {
  const [form, setForm] = useState({
    title: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    paid_by: members[0] || '',
    category: 'Other',
    split_type: 'even',
  })
  const [customSplits, setCustomSplits] = useState(
    Object.fromEntries(members.map(m => [m, '']))
  )
  const [receiptFile, setReceiptFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const totalAmount = parseFloat(form.amount) || 0
  const customTotal = Object.values(customSplits).reduce((sum, v) => sum + (parseFloat(v) || 0), 0)
  const splitValid = form.split_type === 'even' || Math.abs(customTotal - totalAmount) < 0.01

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return setError('Title is required')
    if (!form.amount || totalAmount <= 0) return setError('Amount must be greater than 0')
    if (!form.paid_by) return setError('Select who paid')
    if (form.split_type === 'custom' && !splitValid) {
      return setError(`Custom splits must total ${totalAmount.toFixed(2)} (currently ${customTotal.toFixed(2)})`)
    }

    setLoading(true)
    setError('')

    let receipt_url = null

    // Upload receipt if provided
    if (receiptFile) {
      const ext = receiptFile.name.split('.').pop()
      const filename = `receipt-${Date.now()}.${ext}`
      try {
        const storageRef = ref(storage, `receipts/${filename}`)
        await uploadBytes(storageRef, receiptFile, { contentType: receiptFile.type })
        receipt_url = await getDownloadURL(storageRef)
      } catch (uploadErr) {
        setLoading(false)
        return setError(`Receipt upload failed: ${uploadErr.message}`)
      }
    }

    const splits = form.split_type === 'custom'
      ? Object.fromEntries(members.map(m => [m, parseFloat(customSplits[m]) || 0]))
      : null

    const payload = {
      title: form.title.trim(),
      amount: totalAmount,
      date: form.date,
      paid_by: form.paid_by,
      category: form.category,
      split_type: form.split_type,
      splits,
      receipt_url,
      created_at: new Date().toISOString(),
    }

    try {
      const docRef = await addDoc(collection(db, 'expenses'), payload)
      onAdded({ id: docRef.id, ...payload })
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save. Check your connection.')
    }
    setLoading(false)
  }

  return (
    <Modal onClose={onClose} title="Add Expense" maxWidth="600px">
      <form onSubmit={handleSubmit}>
        <Input
          label="Description"
          placeholder="e.g. Competition registration fees"
          value={form.title}
          onChange={set('title')}
          required
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Input
            label="Amount ($)"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={form.amount}
            onChange={set('amount')}
            required
          />
          <Input
            label="Date"
            type="date"
            value={form.date}
            onChange={set('date')}
            required
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Select label="Paid By" value={form.paid_by} onChange={set('paid_by')}>
            {members.map(m => <option key={m} value={m}>{m}</option>)}
          </Select>
          <Select label="Category" value={form.category} onChange={set('category')}>
            {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
        </div>

        {/* Split Type Toggle */}
        <FormField label="Split Type">
          <div style={{ display: 'flex', gap: '10px' }}>
            {['even', 'custom'].map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setForm(f => ({ ...f, split_type: type }))}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '6px',
                  border: `1px solid ${form.split_type === type ? colors.gold : colors.border}`,
                  background: form.split_type === type ? `${colors.gold}15` : 'transparent',
                  color: form.split_type === type ? colors.gold : colors.creamDim,
                  cursor: 'pointer',
                  fontFamily: fonts.mono,
                  fontSize: '0.8rem',
                  transition: 'all 0.15s',
                }}
              >
                {type === 'even' ? '÷ Split Evenly' : '✏ Custom Split'}
              </button>
            ))}
          </div>
        </FormField>

        {/* Even split preview */}
        {form.split_type === 'even' && totalAmount > 0 && (
          <p style={{
            fontFamily: fonts.mono,
            fontSize: '0.78rem',
            color: colors.textMuted,
            marginTop: '-8px',
            marginBottom: '16px',
          }}>
            Each member pays ${(totalAmount / 12).toFixed(2)}
          </p>
        )}

        {/* Custom split inputs */}
        {form.split_type === 'custom' && (
          <FormField label={`Custom Splits (total: $${customTotal.toFixed(2)} / $${totalAmount.toFixed(2)})`}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: '8px',
              maxHeight: '240px',
              overflowY: 'auto',
              padding: '8px',
              background: '#0d0d1a',
              borderRadius: '6px',
              border: `1px solid ${splitValid ? colors.border : colors.red}`,
            }}>
              {members.map(member => (
                <div key={member} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.75rem', color: colors.creamDim, minWidth: '64px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {member}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={customSplits[member]}
                    onChange={e => setCustomSplits(prev => ({ ...prev, [member]: e.target.value }))}
                    style={{
                      width: '70px',
                      background: '#111',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '4px',
                      color: colors.cream,
                      padding: '4px 6px',
                      fontSize: '0.8rem',
                      outline: 'none',
                    }}
                    placeholder="0.00"
                    onFocus={e => e.target.style.borderColor = colors.gold}
                    onBlur={e => e.target.style.borderColor = colors.border}
                  />
                </div>
              ))}
            </div>
          </FormField>
        )}

        {/* Receipt upload */}
        <FormField label="Receipt (optional)">
          <input
            type="file"
            accept="image/*"
            onChange={e => {
              const file = e.target.files[0]
              if (file && file.size > 10 * 1024 * 1024) {
                setError('Receipt image must be under 10MB')
                return
              }
              setReceiptFile(file || null)
            }}
            style={{
              color: colors.creamDim,
              fontSize: '0.85rem',
              background: '#0d0d1a',
              border: `1px solid ${colors.border}`,
              borderRadius: '6px',
              padding: '8px 12px',
              width: '100%',
              cursor: 'pointer',
            }}
          />
          {receiptFile && (
            <p style={{ fontSize: '0.75rem', color: colors.green, marginTop: '4px' }}>
              ✓ {receiptFile.name}
            </p>
          )}
        </FormField>

        {error && (
          <p style={{ color: colors.red, fontSize: '0.85rem', marginBottom: '12px' }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
          <Button
            variant="primary"
            type="submit"
            disabled={loading || (form.split_type === 'custom' && !splitValid && totalAmount > 0)}
          >
            {loading ? 'Saving…' : 'Add Expense'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
