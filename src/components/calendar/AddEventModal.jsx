import { useState } from 'react'
import { supabase } from '../../supabase'
import { colors } from '../../theme'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { Input, Textarea } from '../ui/Input'

export default function AddEventModal({ onClose, onAdded, defaultDate }) {
  const [form, setForm] = useState({
    title: '',
    date: defaultDate || new Date().toISOString().split('T')[0],
    time: '',
    end_time: '',
    location: '',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return setError('Title is required')
    if (!form.date) return setError('Date is required')

    setLoading(true)
    setError('')

    const { data, error: err } = await supabase
      .from('events')
      .insert([{
        title: form.title.trim(),
        date: form.date,
        time: form.time || null,
        end_time: form.end_time || null,
        location: form.location.trim() || null,
        notes: form.notes.trim() || null,
      }])
      .select()
      .single()

    setLoading(false)

    if (err) {
      const msg = err.message || ''
      if (msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network')) {
        setError('Cannot reach database. Your Supabase project may be paused — visit supabase.com to resume it.')
      } else {
        setError(err.message)
      }
    } else {
      onAdded(data)
      onClose()
    }
  }

  return (
    <Modal onClose={onClose} title="Add Practice">
      <form onSubmit={handleSubmit}>
        <Input
          label="Title"
          placeholder="e.g. Full Runthrough — Dhammal Focus"
          value={form.title}
          onChange={set('title')}
          required
        />

        <Input
          label="Date"
          type="date"
          value={form.date}
          onChange={set('date')}
          required
        />

        <Input
          label="Start Time"
          type="time"
          value={form.time}
          onChange={set('time')}
        />

        <Input
          label="End Time"
          type="time"
          value={form.end_time}
          onChange={set('end_time')}
        />

        <Input
          label="Location"
          placeholder="e.g. Rec Center Studio B"
          value={form.location}
          onChange={set('location')}
        />

        <Textarea
          label="Notes (optional)"
          placeholder="What to bring, focus areas, etc."
          value={form.notes}
          onChange={set('notes')}
          rows={3}
        />

        {error && (
          <p style={{ color: colors.red, fontSize: '0.85rem', marginBottom: '12px' }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? 'Saving…' : 'Add Practice'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
