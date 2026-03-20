import { useState } from 'react'
import { supabase } from '../../supabase'
import { getAllFolders, DEFAULT_MEMBERS } from '../../constants'
import { colors } from '../../theme'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { Input, Textarea, Select } from '../ui/Input'

export default function AddVideoModal({ onClose, onAdded, defaultFolder, members = DEFAULT_MEMBERS }) {
  const [form, setForm] = useState({
    title: '',
    url: '',
    folder: defaultFolder || 'at-home',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const folders = getAllFolders(members)

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return setError('Title is required')
    if (!form.url.trim()) return setError('URL is required')
    if (!form.folder) return setError('Please select a folder')

    setLoading(true)
    setError('')

    const { data, error: err } = await supabase
      .from('videos')
      .insert([{ title: form.title.trim(), url: form.url.trim(), folder: form.folder, notes: form.notes.trim() }])
      .select()
      .single()

    setLoading(false)

    if (err) {
      setError(err.message)
    } else {
      onAdded(data)
      onClose()
    }
  }

  return (
    <Modal onClose={onClose} title="Add Video">
      <form onSubmit={handleSubmit}>
        <Input
          label="Title"
          placeholder="e.g. Week 3 Dhammal Breakdown"
          value={form.title}
          onChange={set('title')}
          required
        />

        <Input
          label="URL (YouTube, Google Drive, or any link)"
          placeholder="https://..."
          value={form.url}
          onChange={set('url')}
          type="url"
          required
        />

        <Select label="Folder" value={form.folder} onChange={set('folder')}>
          {folders.map(f => (
            <option key={f.key} value={f.key}>{f.label}</option>
          ))}
        </Select>

        <Textarea
          label="Notes (optional)"
          placeholder="What to focus on, timestamps, etc."
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
            {loading ? 'Adding…' : 'Add Video'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
