import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, getDocs, doc, deleteDoc, query, orderBy } from 'firebase/firestore'
import { colors, fonts, radius, shadow } from '../theme'
import { useIsMobile } from '../hooks/useWindowWidth'
import { useMembers } from '../hooks/useMembers'
import { getFolderStructure } from '../constants'
import FolderTree from '../components/video/FolderTree'
import VideoGrid from '../components/video/VideoGrid'
import AddVideoModal from '../components/video/AddVideoModal'
import Button from '../components/ui/Button'

function Chip({ label, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '7px 14px',
        borderRadius: '20px',
        border: `1.5px solid ${active ? colors.gold : colors.border}`,
        background: active ? colors.gold : colors.surface,
        color: active ? '#fff' : colors.creamDim,
        fontFamily: fonts.body,
        fontWeight: 600,
        fontSize: '0.82rem',
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'all 0.15s ease',
      }}
    >
      {label}
      {count != null && (
        <span style={{
          fontSize: '0.7rem',
          opacity: active ? 0.85 : 0.6,
          fontWeight: 500,
        }}>
          {count}
        </span>
      )}
    </button>
  )
}

export default function VideoLibrary() {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedFolder, setSelectedFolder] = useState('all')
  const [mobileParent, setMobileParent] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const isMobile = useIsMobile()
  const { members } = useMembers()

  useEffect(() => {
    loadVideos()
  }, [])

  async function loadVideos() {
    setLoading(true)
    try {
      const q = query(collection(db, 'videos'), orderBy('added_at', 'desc'))
      const snap = await getDocs(q)
      setVideos(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch {}
    setLoading(false)
  }

  async function handleDelete(id) {
    await deleteDoc(doc(db, 'videos', id))
    setVideos(prev => prev.filter(v => v.id !== id))
  }

  function handleAdded(video) {
    setVideos(prev => [video, ...prev])
  }

  const folderStructure = getFolderStructure(members)

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

        {/* Mobile folder picker — two-tier chip navigation */}
        {isMobile && (
          <div style={{ marginBottom: '20px' }}>
            {/* Row 1: top-level categories */}
            <div style={{
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              paddingBottom: '10px',
              scrollbarWidth: 'none',
            }}>
              <Chip
                label="All"
                count={videos.length}
                active={mobileParent === 'all'}
                onClick={() => { setMobileParent('all'); setSelectedFolder('all') }}
              />
              {folderStructure.map(folder => {
                const count = folder.children?.length > 0
                  ? videos.filter(v => v.folder?.startsWith(folder.key + '-') || v.folder === folder.key).length
                  : videos.filter(v => v.folder === folder.key).length
                return (
                  <Chip
                    key={folder.key}
                    label={`${folder.icon} ${folder.label.split(' ')[0]}`}
                    count={count || null}
                    active={mobileParent === folder.key}
                    onClick={() => {
                      setMobileParent(folder.key)
                      setSelectedFolder(folder.key)
                    }}
                  />
                )
              })}
            </div>

            {/* Row 2: sub-folder chips (only when parent has children) */}
            {(() => {
              const parent = folderStructure.find(f => f.key === mobileParent)
              if (!parent?.children?.length) return null
              return (
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  overflowX: 'auto',
                  paddingBottom: '4px',
                  scrollbarWidth: 'none',
                }}>
                  <Chip
                    label={`All ${parent.label.split(' ')[0]}`}
                    count={videos.filter(v => v.folder?.startsWith(parent.key + '-')).length || null}
                    active={selectedFolder === parent.key}
                    onClick={() => setSelectedFolder(parent.key)}
                  />
                  {parent.children.map(child => (
                    <Chip
                      key={child.key}
                      label={child.label}
                      count={videos.filter(v => v.folder === child.key).length || null}
                      active={selectedFolder === child.key}
                      onClick={() => setSelectedFolder(child.key)}
                    />
                  ))}
                </div>
              )
            })()}
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
