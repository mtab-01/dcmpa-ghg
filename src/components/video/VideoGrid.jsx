import { colors, fonts } from '../../theme'
import VideoCard from './VideoCard'

export default function VideoGrid({ videos, onDelete, selectedFolder, members }) {
  const filtered = !selectedFolder || selectedFolder === 'all'
    ? videos
    : videos.filter(v => v.folder === selectedFolder || v.folder?.startsWith(selectedFolder + '-'))

  if (filtered.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        color: colors.textMuted,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎬</div>
        <p style={{ fontFamily: fonts.heading, fontSize: '1.1rem', marginBottom: '8px', color: colors.creamDim }}>
          No videos yet
        </p>
        <p style={{ fontSize: '0.85rem' }}>
          {selectedFolder && selectedFolder !== 'all'
            ? 'No videos in this folder. Add one using the button above.'
            : 'Add your first video using the button above.'}
        </p>
      </div>
    )
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: '20px',
    }}>
      {filtered.map(video => (
        <VideoCard key={video.id} video={video} onDelete={onDelete} members={members} />
      ))}
    </div>
  )
}
