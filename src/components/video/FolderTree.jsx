import { useState } from 'react'
import { colors, fonts, radius } from '../../theme'
import { FOLDER_STRUCTURE } from '../../constants'

export default function FolderTree({ videos, selectedFolder, onSelectFolder }) {
  const [expanded, setExpanded] = useState(new Set(['choreo']))

  const getCount = (folderKey) => videos.filter(v => v.folder === folderKey).length

  const getChoreoChildCount = () => {
    const choreo = FOLDER_STRUCTURE.find(f => f.key === 'choreo')
    if (!choreo) return 0
    return choreo.children.reduce((sum, child) => sum + getCount(child.key), 0)
  }

  const toggleExpand = (key, e) => {
    e.stopPropagation()
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const itemStyle = (key) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    cursor: 'pointer',
    borderRadius: radius.sm,
    background: selectedFolder === key ? `${colors.gold}12` : 'transparent',
    borderLeft: selectedFolder === key ? `2px solid ${colors.gold}` : '2px solid transparent',
    color: selectedFolder === key ? colors.gold : colors.creamDim,
    fontSize: '0.85rem',
    transition: 'all 0.15s',
    userSelect: 'none',
  })

  const countBadge = (count) => count > 0 ? (
    <span style={{
      marginLeft: 'auto',
      fontFamily: fonts.mono,
      fontSize: '0.7rem',
      color: colors.textMuted,
      background: colors.border,
      padding: '1px 6px',
      borderRadius: '10px',
    }}>
      {count}
    </span>
  ) : null

  return (
    <div style={{ padding: '8px 0' }}>
      {/* All Videos */}
      <div
        style={itemStyle('all')}
        onClick={() => onSelectFolder('all')}
        onMouseEnter={e => { if (selectedFolder !== 'all') e.currentTarget.style.background = `${colors.gold}08` }}
        onMouseLeave={e => { if (selectedFolder !== 'all') e.currentTarget.style.background = 'transparent' }}
      >
        <span>📁</span>
        <span>All Videos</span>
        {countBadge(videos.length)}
      </div>

      <div style={{ height: '1px', background: colors.border, margin: '8px 12px' }} />

      {FOLDER_STRUCTURE.map(folder => {
        const hasChildren = folder.children && folder.children.length > 0
        const isExpanded = expanded.has(folder.key)

        return (
          <div key={folder.key}>
            {/* Parent folder */}
            <div
              style={itemStyle(hasChildren ? null : folder.key)}
              onClick={() => hasChildren ? onSelectFolder(folder.key) : onSelectFolder(folder.key)}
              onMouseEnter={e => {
                if (selectedFolder !== folder.key) e.currentTarget.style.background = `${colors.gold}08`
              }}
              onMouseLeave={e => {
                if (selectedFolder !== folder.key) e.currentTarget.style.background = 'transparent'
              }}
            >
              {hasChildren && (
                <button
                  onClick={(e) => toggleExpand(folder.key, e)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'inherit', padding: 0, fontSize: '0.7rem',
                    transform: isExpanded ? 'rotate(90deg)' : 'none',
                    transition: 'transform 0.15s',
                    width: '12px', flexShrink: 0,
                  }}
                >
                  ▶
                </button>
              )}
              {!hasChildren && <span style={{ width: '12px', flexShrink: 0 }} />}
              <span>{folder.icon}</span>
              <span style={{ flex: 1 }}>{folder.label}</span>
              {countBadge(hasChildren ? getChoreoChildCount() : getCount(folder.key))}
            </div>

            {/* Children */}
            {hasChildren && isExpanded && (
              <div style={{ paddingLeft: '16px' }}>
                {folder.children.map(child => (
                  <div
                    key={child.key}
                    style={itemStyle(child.key)}
                    onClick={() => onSelectFolder(child.key)}
                    onMouseEnter={e => {
                      if (selectedFolder !== child.key) e.currentTarget.style.background = `${colors.gold}08`
                    }}
                    onMouseLeave={e => {
                      if (selectedFolder !== child.key) e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <span style={{ color: colors.textMuted, fontSize: '0.7rem' }}>└</span>
                    <span style={{ flex: 1 }}>{child.label}</span>
                    {countBadge(getCount(child.key))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
