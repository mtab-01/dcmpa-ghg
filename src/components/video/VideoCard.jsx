import { useState } from 'react'
import { colors, radius, shadow, fonts } from '../../theme'
import { getYouTubeEmbedUrl } from '../../utils/youtubeEmbed'
import { FOLDER_STRUCTURE } from '../../constants'
import Badge from '../ui/Badge'
import Button from '../ui/Button'

function getFolderLabel(folderKey) {
  for (const f of FOLDER_STRUCTURE) {
    if (f.key === folderKey) return f.label
    for (const child of f.children || []) {
      if (child.key === folderKey) return `${f.label} / ${child.label}`
    }
  }
  return folderKey
}

export default function VideoCard({ video, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const embedUrl = getYouTubeEmbedUrl(video.url)

  return (
    <div style={{
      background: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: radius.lg,
      overflow: 'hidden',
      boxShadow: shadow.card,
      transition: 'border-color 0.2s',
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = colors.borderLight}
    onMouseLeave={e => e.currentTarget.style.borderColor = colors.border}
    >
      {/* Video embed or placeholder */}
      {embedUrl ? (
        <div style={{ position: 'relative', paddingTop: '56.25%', background: '#000' }}>
          <iframe
            src={embedUrl}
            style={{
              position: 'absolute', top: 0, left: 0,
              width: '100%', height: '100%',
              border: 'none',
            }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>
      ) : (
        <div style={{
          background: `${colors.bgDeep}`,
          padding: '20px',
          borderBottom: `1px solid ${colors.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <span style={{ fontSize: '2rem' }}>🔗</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: colors.textMuted, fontSize: '0.8rem', marginBottom: '8px', fontFamily: fonts.mono }}>
              External Link
            </p>
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: colors.gold,
                fontSize: '0.85rem',
                textDecoration: 'underline',
                wordBreak: 'break-all',
              }}
            >
              Open ↗
            </a>
          </div>
        </div>
      )}

      {/* Card body */}
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
          <h4 style={{
            fontFamily: fonts.heading,
            color: colors.cream,
            fontSize: '1rem',
            lineHeight: 1.3,
            flex: 1,
          }}>
            {video.title}
          </h4>

          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              style={{
                background: 'none', border: 'none',
                color: colors.textMuted, cursor: 'pointer',
                padding: '2px 6px', borderRadius: radius.sm,
                fontSize: '0.85rem', flexShrink: 0,
              }}
              title="Delete video"
              onMouseEnter={e => e.target.style.color = colors.red}
              onMouseLeave={e => e.target.style.color = colors.textMuted}
            >
              🗑
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
              <button
                onClick={() => onDelete(video.id)}
                style={{
                  background: colors.red, border: 'none',
                  color: colors.cream, cursor: 'pointer',
                  padding: '2px 8px', borderRadius: radius.sm,
                  fontSize: '0.75rem',
                }}
              >Del</button>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{
                  background: colors.border, border: 'none',
                  color: colors.cream, cursor: 'pointer',
                  padding: '2px 8px', borderRadius: radius.sm,
                  fontSize: '0.75rem',
                }}
              >No</button>
            </div>
          )}
        </div>

        <div style={{ marginTop: '8px', display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Badge color={colors.bgDeep} variant="light">
            {getFolderLabel(video.folder)}
          </Badge>
        </div>

        {video.notes && (
          <p style={{
            marginTop: '8px',
            color: colors.textMuted,
            fontSize: '0.82rem',
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {video.notes}
          </p>
        )}

        {/* Non-YouTube link also shows open button at bottom */}
        {!embedUrl && (
          <div style={{ marginTop: '10px' }}>
            <a href={video.url} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" size="sm">Open Link ↗</Button>
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
