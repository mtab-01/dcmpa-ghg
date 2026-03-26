import { useState } from 'react'
import { colors, fonts, radius, shadow } from '../theme'
import { useMembers } from '../hooks/useMembers'
import { useIsMobile } from '../hooks/useWindowWidth'
import Button from '../components/ui/Button'

export default function Settings() {
  const { members, setMembers, loading } = useMembers()
  const [draft, setDraft] = useState([...members])
  const [saved, setSaved] = useState(false)

  // Sync draft when members load from Firebase
  const [synced, setSynced] = useState(false)
  if (!loading && !synced) {
    setSynced(true)
    setDraft([...members])
  }
  const isMobile = useIsMobile()

  function updateMember(idx, value) {
    setDraft(prev => {
      const next = [...prev]
      next[idx] = value
      return next
    })
    setSaved(false)
  }

  function handleSave() {
    const cleaned = draft.map((name, i) => name.trim() || `Member ${i + 1}`)
    setMembers(cleaned)
    setDraft(cleaned)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  function handleReset() {
    const defaults = Array.from({ length: 12 }, (_, i) => `Member ${i + 1}`)
    setDraft(defaults)
    setSaved(false)
  }

  return (
    <div style={{ padding: isMobile ? '16px' : '28px', maxWidth: '700px' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{
          fontFamily: fonts.heading,
          fontSize: isMobile ? '1.6rem' : '2rem',
          color: colors.gold,
          marginBottom: '4px',
        }}>
          Settings
        </h1>
        <p style={{ color: colors.textMuted, fontSize: '0.85rem' }}>
          Manage team member names and app preferences.
        </p>
      </div>

      {/* Member names section */}
      <div style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.lg,
        boxShadow: shadow.card,
        overflow: 'hidden',
        marginBottom: '24px',
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${colors.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{ fontFamily: fonts.heading, color: colors.cream, fontSize: '1rem' }}>
              Team Members
            </h2>
            <p style={{ color: colors.textMuted, fontSize: '0.78rem', marginTop: '2px' }}>
              Names used in expenses and balance tracking.
            </p>
          </div>
          <span style={{
            fontFamily: fonts.mono,
            fontSize: '0.65rem',
            color: colors.textMuted,
            letterSpacing: '0.1em',
          }}>
            12 MEMBERS
          </span>
        </div>

        {/* Member inputs */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '0',
        }}>
          {draft.map((name, idx) => (
            <div
              key={idx}
              style={{
                padding: '12px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                borderBottom: idx < draft.length - 1 ? `1px solid ${colors.border}` : 'none',
              }}
            >
              <span style={{
                fontFamily: fonts.mono,
                fontSize: '0.72rem',
                color: colors.textMuted,
                width: '24px',
                textAlign: 'right',
                flexShrink: 0,
              }}>
                {String(idx + 1).padStart(2, '0')}
              </span>
              <input
                type="text"
                value={name}
                onChange={e => updateMember(idx, e.target.value)}
                placeholder={`Member ${idx + 1}`}
                maxLength={40}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  borderBottom: `1px solid ${colors.border}`,
                  color: colors.cream,
                  fontSize: '0.9rem',
                  padding: '4px 0',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderBottomColor = colors.gold}
                onBlur={e => e.target.style.borderBottomColor = colors.border}
              />
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{
          padding: '16px 20px',
          borderTop: `1px solid ${colors.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
        }}>
          <button
            onClick={handleReset}
            style={{
              background: 'none',
              border: 'none',
              color: colors.textMuted,
              cursor: 'pointer',
              fontSize: '0.82rem',
              textDecoration: 'underline',
              padding: 0,
            }}
            onMouseEnter={e => e.target.style.color = colors.red}
            onMouseLeave={e => e.target.style.color = colors.textMuted}
          >
            Reset to defaults
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {saved && (
              <span style={{
                fontFamily: fonts.mono,
                fontSize: '0.78rem',
                color: colors.green,
              }}>
                ✓ Saved!
              </span>
            )}
            <Button variant="primary" onClick={handleSave}>
              Save Names
            </Button>
          </div>
        </div>
      </div>

      {/* Info card */}
      <div style={{
        background: `${colors.bgDeep}`,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.lg,
        padding: '16px 20px',
      }}>
        <h3 style={{ fontFamily: fonts.heading, color: colors.cream, fontSize: '0.95rem', marginBottom: '8px' }}>
          About DCMPA GHG
        </h3>
        <p style={{ color: colors.textMuted, fontSize: '0.82rem', lineHeight: 1.6 }}>
          Shared team portal for your 12-person competitive DCMPA GHG team.
          Member names are synced across all devices via the cloud.
        </p>
        <p style={{ color: colors.textMuted, fontSize: '0.78rem', marginTop: '8px', fontFamily: fonts.mono }}>
          VERSION 1.0 · DCMPA GHG
        </p>
      </div>
    </div>
  )
}
