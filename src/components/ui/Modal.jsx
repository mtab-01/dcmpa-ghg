import { useEffect } from 'react'
import { colors, radius, shadow } from '../../theme'

export default function Modal({ onClose, title, children, maxWidth = '560px' }) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Prevent background scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.lg,
          boxShadow: shadow.modal,
          width: '100%',
          maxWidth,
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px 16px',
          borderBottom: `1px solid ${colors.border}`,
          position: 'sticky', top: 0, background: colors.surface, zIndex: 1,
        }}>
          <h3 style={{ fontFamily: "'Georgia', serif", color: colors.gold, fontSize: '1.2rem' }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: colors.textMuted,
              fontSize: '1.4rem', lineHeight: 1, cursor: 'pointer',
              padding: '4px 8px', borderRadius: radius.sm,
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.target.style.color = colors.cream}
            onMouseLeave={e => e.target.style.color = colors.textMuted}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px 24px' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
