import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { colors, fonts, shadow } from '../theme'
import { useIsMobile } from '../hooks/useWindowWidth'
import { useMembers } from '../hooks/useMembers'
import { getAllFolders } from '../constants'
import FolderTree from '../components/video/FolderTree'
import VideoGrid from '../components/video/VideoGrid'
import AddVideoModal from '../components/video/AddVideoModal'
import Button from '../components/ui/Button'

export default function VideoLibrary() {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedFolder, setSelectedFolder] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const isMobile = useIsMobile()
  const { members } = useMembers()

  useEffect(() => {
    loadVideos()
  }, [])

  async function loadVideos() {
    setLoading(true)
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .order('added_at', { ascending: false })
    if (!error) setVideos(data || [])
    setLoading(false)
  }

  async function handleDelete(id) {
    await supabase.from('videos').delete().eq('id', id)
    setVideos(prev => prev.filter(v => v.id !== id))
  }

  function handleAdded(video) {
    setVideos(prev => [video, ...prev])
  }

  const allFolders = getAllFolders(members)

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: '100vh' }}>
      {/* Desktop folder sidebar */}
      {!isMobile && (
        <aside style={{
          width: '200px',
          minWidth: '200px',
          borderRight: `1px solid ${colors.border}`,
          background: `${colors.bgDeep}88`,
          overflowY: 'auto',
        }}>
          <div style={{ padding: '16px 12px 8px' }}>
            <p style={{
              fontFamily: fonts.mono,
              fontSize: '0.65rem',
              color: colors.textMuted,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}>
              Folders
            </p>
          </div>
          <FolderTree
            videos={videos}
            selectedFolder={selectedFolder}
            onSelectFolder={setSelectedFolder}
            members={members}
          />
        </aside>
      )}

      {/* Main content */}
      <div style={{ flex: 1, padding: isMobile ? '16px' : '28px', overflowY: 'auto' }}>
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
              Video Library
            </h1>
            <p style={{ color: colors.textMuted, fontSize: '0.85rem' }}>
              {videos.length} video{videos.length !== 1 ? 's' : ''} total
            </p>
          </div>
          <Button variant="primary" onClick={() => setShowAdd(true)}>
            + Add Video
          </Button>
        </div>

        {/* Mobile folder picker */}
        {isMobile && (
          <div style={{ marginBottom: '20px' }}>
            <select
              value={selectedFolder}
              onChange={e => setSelectedFolder(e.target.value)}
              style={{
                width: '100%',
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                color: colors.cream,
                padding: '10px 12px',
                fontSize: '0.9rem',
              }}
            >
              <option value="all">All Videos ({videos.length})</option>
              {allFolders.map(f => (
                <option key={f.key} value={f.key}>
                  {f.label} ({videos.filter(v => v.folder === f.key).length})
                </option>
              ))}
            </select>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: colors.textMuted }}>
            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⏳</div>
            <p>Loading videos…</p>
          </div>
        ) : (
          <VideoGrid
            videos={videos}
            selectedFolder={selectedFolder}
            onDelete={handleDelete}
          />
        )}
      </div>

      {showAdd && (
        <AddVideoModal
          onClose={() => setShowAdd(false)}
          onAdded={handleAdded}
          defaultFolder={selectedFolder !== 'all' ? selectedFolder : 'at-home'}
          members={members}
        />
      )}
    </div>
  )
}
