import { useState, useEffect, useRef, useCallback } from 'react'
import { db, storage } from '../firebase'
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { colors, fonts, radius, shadow } from '../theme'
import { useIsMobile } from '../hooks/useWindowWidth'

function formatTime(s) {
  if (!s || isNaN(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function genId() {
  return Math.random().toString(36).slice(2, 10)
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]

const LOOP_COLORS = [
  '#f5820d', // orange
  '#2e86de', // blue
  '#16a34a', // green
  '#e03535', // red
  '#9333ea', // purple
  '#0891b2', // teal
  '#f59e0b', // amber
  '#ec4899', // pink
]

export default function Mix() {
  const isMobile = useIsMobile()
  const audioRef = useRef(null)

  const [mixMeta, setMixMeta] = useState(undefined)
  const [audioUrl, setAudioUrl] = useState(null)
  const [audioError, setAudioError] = useState(false)

  // Player state
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [seeking, setSeeking] = useState(false)
  const [speed, setSpeed] = useState(1)

  // Multi-loop state (synced with Firestore)
  // Each loop: { id, name, color, start, end }
  const [loops, setLoops] = useState([])
  const [activeLoopId, setActiveLoopId] = useState(null)
  const loopRef = useRef({ start: null, end: null, enabled: false })

  // Draft loop state (local, for setting A/B before saving)
  const [showDraft, setShowDraft] = useState(false)
  const [draftStart, setDraftStart] = useState(null)
  const [draftEnd, setDraftEnd] = useState(null)
  const [draftName, setDraftName] = useState('')
  const [draftColor, setDraftColor] = useState(LOOP_COLORS[0])

  // Upload state
  const [showUpload, setShowUpload] = useState(false)
  const [versionLabel, setVersionLabel] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const fileInputRef = useRef(null)

  // Keep loopRef in sync so the timeupdate closure can read it without stale state
  useEffect(() => {
    const active = loops.find(l => l.id === activeLoopId)
    loopRef.current = {
      start: active?.start ?? null,
      end: active?.end ?? null,
      enabled: !!active,
    }
  }, [activeLoopId, loops])

  useEffect(() => { loadMix() }, [])

  // Load loops from Firestore and subscribe to changes
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'mix_loops', 'current'), snap => {
      if (!snap.exists()) return
      const d = snap.data()
      setLoops(d.loops ?? [])
      setActiveLoopId(d.activeLoopId ?? null)
    })
    return unsub
  }, [])

  // Wire up audio events
  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const onTime = () => {
      if (!seeking) {
        const t = el.currentTime
        setCurrentTime(t)
        const { start, end, enabled } = loopRef.current
        if (enabled && start !== null && end !== null && end > start && t >= end) {
          el.currentTime = start
        }
      }
    }
    const onMeta = () => setDuration(el.duration)
    const onEnd = () => {
      const { start, enabled } = loopRef.current
      if (enabled && start !== null) {
        el.currentTime = start
        el.play()
      } else {
        setPlaying(false)
      }
    }
    const onErr = () => setAudioError(true)
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('loadedmetadata', onMeta)
    el.addEventListener('ended', onEnd)
    el.addEventListener('error', onErr)
    return () => {
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('loadedmetadata', onMeta)
      el.removeEventListener('ended', onEnd)
      el.removeEventListener('error', onErr)
    }
  }, [audioUrl, seeking])

  // Sync playback speed
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed
  }, [speed])

  async function loadMix() {
    setAudioError(false)
    try {
      const snap = await getDoc(doc(db, 'mix_meta', 'current'))
      if (!snap.exists()) { setMixMeta(null); return }
      const data = snap.data()
      setMixMeta(data)
      setAudioUrl(data.download_url)
      setCurrentTime(0)
      setDuration(0)
      setPlaying(false)
    } catch {
      setMixMeta(null)
    }
  }

  function togglePlay() {
    const el = audioRef.current
    if (!el) return
    if (playing) { el.pause(); setPlaying(false) }
    else { el.play(); setPlaying(true) }
  }

  function handleSkip(secs) {
    const el = audioRef.current
    if (!el) return
    el.currentTime = Math.max(0, Math.min(duration, el.currentTime + secs))
  }

  function handleScrubStart(e) {
    setSeeking(true)
    setCurrentTime(parseFloat(e.target.value))
  }
  function handleScrubMove(e) { setCurrentTime(parseFloat(e.target.value)) }
  function handleScrubEnd(e) {
    const t = parseFloat(e.target.value)
    if (audioRef.current) audioRef.current.currentTime = t
    setCurrentTime(t)
    setSeeking(false)
  }

  // ── Loop helpers ──────────────────────────────────────────────────────────
  const persistLoops = useCallback(async (newLoops, newActiveId) => {
    try {
      await setDoc(doc(db, 'mix_loops', 'current'), {
        loops: newLoops,
        activeLoopId: newActiveId ?? null,
      })
    } catch { /* non-critical */ }
  }, [])

  function setDraftA() {
    const t = audioRef.current?.currentTime ?? currentTime
    setDraftStart(t)
    if (draftEnd !== null && draftEnd <= t) setDraftEnd(null)
    setShowDraft(true)
  }

  function setDraftB() {
    const t = audioRef.current?.currentTime ?? currentTime
    if (draftStart !== null && t <= draftStart) return
    setDraftEnd(t)
  }

  function clearDraft() {
    setDraftStart(null)
    setDraftEnd(null)
    setDraftName('')
    setDraftColor(LOOP_COLORS[0])
    setShowDraft(false)
  }

  async function saveNewLoop() {
    if (draftStart === null || draftEnd === null || draftEnd <= draftStart) return
    const newLoop = {
      id: genId(),
      name: draftName.trim() || `Loop ${loops.length + 1}`,
      color: draftColor,
      start: draftStart,
      end: draftEnd,
    }
    const newLoops = [...loops, newLoop]
    setLoops(newLoops)
    await persistLoops(newLoops, activeLoopId)
    clearDraft()
  }

  async function deleteLoop(id) {
    const newLoops = loops.filter(l => l.id !== id)
    const newActiveId = activeLoopId === id ? null : activeLoopId
    setLoops(newLoops)
    setActiveLoopId(newActiveId)
    await persistLoops(newLoops, newActiveId)
  }

  async function activateLoop(id) {
    const newActiveId = activeLoopId === id ? null : id
    setActiveLoopId(newActiveId)
    await persistLoops(loops, newActiveId)
    if (newActiveId && audioRef.current) {
      const loop = loops.find(l => l.id === newActiveId)
      if (loop) audioRef.current.currentTime = loop.start
    }
  }

  async function handleFilePicked(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    const ext = file.name.split('.').pop().toLowerCase()
    const path = `mix/current.${ext}`
    try {
      const storageRef = ref(storage, path)
      await uploadBytes(storageRef, file, { contentType: file.type })
      const downloadUrl = await getDownloadURL(storageRef)
      const label = versionLabel.trim() ||
        `Mix — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      await setDoc(doc(db, 'mix_meta', 'current'), {
        label,
        file_path: path,
        file_name: file.name,
        uploaded_at: new Date().toISOString(),
        download_url: downloadUrl,
      })
      // Reset all loops when a new mix is uploaded
      await setDoc(doc(db, 'mix_loops', 'current'), { loops: [], activeLoopId: null })
      setLoops([])
      setActiveLoopId(null)
      clearDraft()
      setUploading(false)
      setShowUpload(false)
      setVersionLabel('')
      e.target.value = ''
      loadMix()
    } catch (err) {
      setUploadError(`Upload failed: ${err.message}`)
      setUploading(false)
    }
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0
  const hasDraft = draftStart !== null && draftEnd !== null && draftEnd > draftStart
  const draftStartPct = duration > 0 && draftStart !== null ? (draftStart / duration) * 100 : null
  const draftEndPct   = duration > 0 && draftEnd   !== null ? (draftEnd   / duration) * 100 : null

  // ── Styles ────────────────────────────────────────────────────────────────
  const css = `
    .mix-scrubber {
      -webkit-appearance: none; appearance: none;
      width: 100%; height: 5px; border-radius: 3px;
      background: linear-gradient(to right, ${colors.gold} ${pct}%, ${colors.border} ${pct}%);
      outline: none; cursor: pointer; position: relative; z-index: 2;
    }
    .mix-scrubber::-webkit-slider-thumb {
      -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%;
      background: ${colors.gold}; cursor: pointer;
      box-shadow: 0 0 0 2px white, 0 0 0 3px ${colors.gold}60;
      transition: transform 0.1s;
    }
    .mix-scrubber::-webkit-slider-thumb:hover { transform: scale(1.2); }
    .mix-scrubber::-moz-range-thumb {
      width: 16px; height: 16px; border-radius: 50%;
      background: ${colors.gold}; cursor: pointer; border: none;
    }
    .speed-chip {
      background: none;
      border: 1.5px solid ${colors.border};
      border-radius: 20px;
      padding: 4px 10px;
      font-family: ${fonts.mono};
      font-size: 0.72rem;
      color: ${colors.textMuted};
      cursor: pointer;
      transition: all 0.15s;
    }
    .speed-chip:hover { border-color: ${colors.gold}; color: ${colors.gold}; }
    .speed-chip.active {
      background: ${colors.gold}18;
      border-color: ${colors.gold};
      color: ${colors.gold};
      font-weight: 700;
    }
    .loop-btn {
      background: none;
      border: 1.5px solid ${colors.border};
      border-radius: ${radius.md};
      padding: 7px 14px;
      font-family: ${fonts.mono};
      font-size: 0.75rem;
      color: ${colors.creamDim};
      cursor: pointer;
      transition: all 0.15s;
    }
    .loop-btn:hover { border-color: ${colors.gold}; color: ${colors.gold}; }
    .loop-btn:disabled { opacity: 0.35; cursor: not-allowed; }
    .loop-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 7px 10px;
      border-radius: ${radius.md};
      border: 1px solid ${colors.border};
      margin-bottom: 6px;
      transition: border-color 0.15s, background 0.15s;
    }
    .loop-row:hover { border-color: ${colors.textMuted}; }
    .color-dot {
      width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0;
      cursor: pointer; padding: 0; transition: transform 0.1s, outline 0.1s;
      outline: 2px solid transparent; outline-offset: 2px;
    }
    .color-dot:hover { transform: scale(1.25); }
    .color-dot.selected { outline-color: ${colors.cream}; transform: scale(1.15); }
  `

  return (
    <div style={{ padding: isMobile ? '24px 16px' : '36px 36px', maxWidth: '680px' }}>
      <style>{css}</style>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <p style={{
          fontFamily: fonts.mono, fontSize: '0.68rem', color: colors.textMuted,
          letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px',
        }}>Current</p>
        <h1 style={{
          fontFamily: fonts.heading, fontSize: isMobile ? '2rem' : '2.6rem',
          fontWeight: 800, color: colors.cream, lineHeight: 1.1, marginBottom: '8px',
        }}>
          <span style={{ color: colors.gold }}>GHG</span> Mix
        </h1>
        <p style={{ color: colors.textMuted, fontSize: '0.92rem' }}>
          The latest version of the team mix, updated weekly.
        </p>
      </div>

      {/* Loading */}
      {mixMeta === undefined && (
        <div style={{ color: colors.textMuted, fontSize: '0.9rem' }}>Loading…</div>
      )}

      {/* No mix yet */}
      {mixMeta === null && !showUpload && (
        <div style={{
          background: colors.surface, border: `1px solid ${colors.border}`,
          borderRadius: radius.xl, boxShadow: shadow.card,
          padding: '48px 32px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎵</div>
          <p style={{ fontFamily: fonts.heading, fontSize: '1.1rem', color: colors.creamDim, marginBottom: '8px' }}>
            No mix uploaded yet
          </p>
          <p style={{ color: colors.textMuted, fontSize: '0.85rem', marginBottom: '24px' }}>
            Upload an audio file to share the current mix with the team.
          </p>
          <button
            onClick={() => setShowUpload(true)}
            style={{
              background: colors.gold, color: '#fff', border: 'none',
              borderRadius: radius.lg, padding: '12px 28px',
              fontFamily: fonts.heading, fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
            }}
          >Upload Mix</button>
        </div>
      )}

      {/* Player */}
      {mixMeta && audioUrl && (
        <div style={{
          background: colors.surface, border: `1px solid ${colors.border}`,
          borderRadius: radius.xl, boxShadow: shadow.card,
          overflow: 'hidden', marginBottom: '20px',
        }}>
          <audio ref={audioRef} src={audioUrl} preload="metadata" />

          {/* Header strip */}
          <div style={{
            background: `linear-gradient(135deg, ${colors.gold}18 0%, ${colors.bgDeep} 100%)`,
            borderBottom: `1px solid ${colors.border}`,
            padding: '20px 24px 16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: radius.lg, flexShrink: 0,
                background: `linear-gradient(135deg, ${colors.gold}, ${colors.goldDim})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem',
              }}>🎵</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: fonts.heading, fontWeight: 800, fontSize: '1rem',
                  color: colors.cream, marginBottom: '2px',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{mixMeta.label}</div>
                <div style={{ fontSize: '0.75rem', color: colors.textMuted }}>
                  {mixMeta.file_name} · {formatDate(mixMeta.uploaded_at)}
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div style={{ padding: '20px 24px 24px' }}>

            {/* ── Scrubber + loop region overlays ── */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ position: 'relative', height: '5px', marginBottom: '8px' }}>

                {/* Saved loop region fills */}
                {loops.map(loop => {
                  if (loop.start === null || loop.end === null || loop.end <= loop.start) return null
                  const sPct = duration > 0 ? (loop.start / duration) * 100 : 0
                  const ePct = duration > 0 ? (loop.end   / duration) * 100 : 0
                  const isActive = loop.id === activeLoopId
                  return (
                    <div key={`fill-${loop.id}`} style={{
                      position: 'absolute', top: 0,
                      left: `${sPct}%`, width: `${ePct - sPct}%`, height: '100%',
                      background: isActive ? `${loop.color}88` : `${loop.color}44`,
                      borderRadius: '3px', pointerEvents: 'none', zIndex: 1,
                    }} />
                  )
                })}

                {/* Saved loop start markers */}
                {loops.map(loop => {
                  const sPct = duration > 0 && loop.start !== null ? (loop.start / duration) * 100 : null
                  if (sPct === null) return null
                  return (
                    <div key={`ms-${loop.id}`} style={{
                      position: 'absolute', left: `${sPct}%`, top: '-4px',
                      width: '2px', height: '13px', background: loop.color,
                      borderRadius: '1px', zIndex: 3, pointerEvents: 'none',
                    }} />
                  )
                })}

                {/* Saved loop end markers */}
                {loops.map(loop => {
                  const ePct = duration > 0 && loop.end !== null ? (loop.end / duration) * 100 : null
                  if (ePct === null) return null
                  return (
                    <div key={`me-${loop.id}`} style={{
                      position: 'absolute', left: `${ePct}%`, top: '-4px',
                      width: '2px', height: '13px', background: loop.color,
                      borderRadius: '1px', zIndex: 3, pointerEvents: 'none',
                    }} />
                  )
                })}

                {/* Draft region fill */}
                {hasDraft && (
                  <div style={{
                    position: 'absolute', top: 0,
                    left: `${draftStartPct}%`, width: `${draftEndPct - draftStartPct}%`, height: '100%',
                    background: `${draftColor}44`,
                    border: `1px dashed ${draftColor}99`,
                    borderRadius: '3px', pointerEvents: 'none', zIndex: 1,
                    boxSizing: 'border-box',
                  }} />
                )}

                {/* Draft start marker */}
                {draftStartPct !== null && (
                  <div style={{
                    position: 'absolute', left: `${draftStartPct}%`, top: '-4px',
                    width: '2px', height: '13px', background: draftColor,
                    borderRadius: '1px', zIndex: 3, pointerEvents: 'none', opacity: 0.75,
                  }} />
                )}

                {/* Draft end marker */}
                {draftEndPct !== null && (
                  <div style={{
                    position: 'absolute', left: `${draftEndPct}%`, top: '-4px',
                    width: '2px', height: '13px', background: draftColor,
                    borderRadius: '1px', zIndex: 3, pointerEvents: 'none', opacity: 0.75,
                  }} />
                )}

                <input
                  type="range"
                  className="mix-scrubber"
                  style={{ position: 'absolute', top: 0, left: 0, margin: 0 }}
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onMouseDown={handleScrubStart}
                  onTouchStart={handleScrubStart}
                  onChange={handleScrubMove}
                  onMouseUp={handleScrubEnd}
                  onTouchEnd={handleScrubEnd}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: fonts.mono, fontSize: '0.72rem', color: colors.textMuted }}>
                  {formatTime(currentTime)}
                </span>
                <span style={{ fontFamily: fonts.mono, fontSize: '0.72rem', color: colors.textMuted }}>
                  {formatTime(duration)}
                </span>
              </div>
            </div>

            {/* ── Playback buttons ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', marginBottom: '20px' }}>
              <button
                onClick={() => handleSkip(-10)}
                style={{
                  background: 'none', border: 'none', color: colors.creamDim,
                  cursor: 'pointer', fontSize: '0.8rem', fontFamily: fonts.mono,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', opacity: 0.75,
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>⟪</span>
                <span>10s</span>
              </button>

              <button
                onClick={togglePlay}
                disabled={audioError}
                style={{
                  width: '60px', height: '60px', borderRadius: '50%', flexShrink: 0,
                  background: audioError ? colors.border : colors.gold,
                  border: 'none', color: '#fff', fontSize: '1.5rem',
                  cursor: audioError ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: audioError ? 'none' : `0 4px 16px ${colors.gold}50`,
                  transition: 'transform 0.1s, box-shadow 0.1s',
                }}
                onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.94)' }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
              >
                {playing ? '⏸' : '▶'}
              </button>

              <button
                onClick={() => handleSkip(10)}
                style={{
                  background: 'none', border: 'none', color: colors.creamDim,
                  cursor: 'pointer', fontSize: '0.8rem', fontFamily: fonts.mono,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', opacity: 0.75,
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>⟫</span>
                <span>10s</span>
              </button>
            </div>

            {audioError && (
              <p style={{ textAlign: 'center', color: colors.red, fontSize: '0.8rem', marginBottom: '16px' }}>
                Could not load audio. Check that Firebase Storage rules allow public reads.
              </p>
            )}

            {/* ── Speed control ── */}
            <div style={{
              borderTop: `1px solid ${colors.border}`,
              paddingTop: '16px',
              marginBottom: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: fonts.mono, fontSize: '0.68rem', color: colors.textMuted, marginRight: '2px' }}>
                  SPEED
                </span>
                {SPEEDS.map(s => (
                  <button
                    key={s}
                    className={`speed-chip${speed === s ? ' active' : ''}`}
                    onClick={() => setSpeed(s)}
                  >
                    {s}×
                  </button>
                ))}
              </div>
            </div>

            {/* ── Loop section ── */}
            <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: '16px' }}>

              {/* Section header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontFamily: fonts.mono, fontSize: '0.68rem', color: colors.textMuted }}>
                  LOOPS
                </span>
                {!showDraft && (
                  <button
                    className="loop-btn"
                    onClick={() => setShowDraft(true)}
                    style={{ padding: '4px 10px', fontSize: '0.7rem' }}
                  >
                    + New Loop
                  </button>
                )}
              </div>

              {/* Draft editor */}
              {showDraft && (
                <div style={{
                  border: `1.5px dashed ${draftColor}99`,
                  borderRadius: radius.md,
                  padding: '12px',
                  marginBottom: '10px',
                  background: `${draftColor}08`,
                }}>
                  {/* Name + color row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      placeholder={`Loop ${loops.length + 1}`}
                      value={draftName}
                      onChange={e => setDraftName(e.target.value)}
                      style={{
                        flex: 1, minWidth: '80px',
                        background: colors.bg, border: `1px solid ${colors.border}`,
                        borderRadius: radius.sm, padding: '6px 10px',
                        color: colors.cream, fontFamily: fonts.body, fontSize: '0.82rem',
                        outline: 'none',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                      {LOOP_COLORS.map(c => (
                        <button
                          key={c}
                          className={`color-dot${draftColor === c ? ' selected' : ''}`}
                          style={{ background: c }}
                          onClick={() => setDraftColor(c)}
                          title={c}
                        />
                      ))}
                    </div>
                  </div>

                  {/* A / B / Save / Cancel */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      className="loop-btn"
                      onClick={setDraftA}
                      style={{ borderColor: draftStart !== null ? draftColor : undefined,
                               color: draftStart !== null ? draftColor : undefined }}
                      title="Set loop start to current position"
                    >
                      [A] {draftStart !== null ? formatTime(draftStart) : '—'}
                    </button>
                    <button
                      className="loop-btn"
                      onClick={setDraftB}
                      disabled={draftStart === null}
                      style={{ borderColor: draftEnd !== null ? draftColor : undefined,
                               color: draftEnd !== null ? draftColor : undefined }}
                      title="Set loop end to current position"
                    >
                      [B] {draftEnd !== null ? formatTime(draftEnd) : '—'}
                    </button>
                    <button
                      className="loop-btn"
                      onClick={saveNewLoop}
                      disabled={!hasDraft}
                      style={hasDraft ? {
                        background: `${draftColor}22`,
                        borderColor: draftColor,
                        color: draftColor,
                        fontWeight: 700,
                      } : {}}
                    >
                      Save Loop
                    </button>
                    <button
                      className="loop-btn"
                      onClick={clearDraft}
                      style={{ marginLeft: 'auto', color: colors.textMuted }}
                    >
                      Cancel
                    </button>
                  </div>

                  {hasDraft && (
                    <p style={{ fontFamily: fonts.mono, fontSize: '0.65rem', color: colors.textMuted, marginTop: '8px' }}>
                      {formatTime(draftStart)} → {formatTime(draftEnd)} · {formatTime(draftEnd - draftStart)}
                    </p>
                  )}
                </div>
              )}

              {/* Saved loops list */}
              {loops.length === 0 && !showDraft && (
                <p style={{ fontSize: '0.8rem', color: colors.textMuted, padding: '8px 0 4px' }}>
                  No loops saved yet.
                </p>
              )}

              {loops.map(loop => {
                const isActive = loop.id === activeLoopId
                return (
                  <div
                    key={loop.id}
                    className="loop-row"
                    style={isActive ? {
                      borderColor: loop.color,
                      background: `${loop.color}10`,
                    } : {}}
                  >
                    {/* Color swatch */}
                    <div style={{
                      width: '10px', height: '10px', borderRadius: '50%',
                      background: loop.color, flexShrink: 0,
                    }} />

                    {/* Name */}
                    <span style={{
                      fontFamily: fonts.mono, fontSize: '0.75rem', flex: 1, minWidth: 0,
                      color: isActive ? loop.color : colors.creamDim,
                      fontWeight: isActive ? 700 : 400,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {loop.name}
                    </span>

                    {/* Time range */}
                    <span style={{
                      fontFamily: fonts.mono, fontSize: '0.65rem',
                      color: colors.textMuted, flexShrink: 0,
                    }}>
                      {formatTime(loop.start)}–{formatTime(loop.end)}
                    </span>

                    {/* Activate toggle */}
                    <button
                      onClick={() => activateLoop(loop.id)}
                      style={{
                        background: isActive ? `${loop.color}22` : 'none',
                        border: `1.5px solid ${isActive ? loop.color : colors.border}`,
                        borderRadius: radius.sm, padding: '3px 8px',
                        fontFamily: fonts.mono, fontSize: '0.65rem',
                        color: isActive ? loop.color : colors.textMuted,
                        cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s',
                        fontWeight: isActive ? 700 : 400,
                      }}
                    >
                      {isActive ? '⟳ On' : '⟳'}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => deleteLoop(loop.id)}
                      style={{
                        background: 'none', border: 'none',
                        color: colors.textMuted, cursor: 'pointer',
                        fontSize: '0.8rem', padding: '2px 4px',
                        flexShrink: 0, transition: 'color 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = colors.red }}
                      onMouseLeave={e => { e.currentTarget.style.color = colors.textMuted }}
                      title="Delete loop"
                    >
                      ✕
                    </button>
                  </div>
                )
              })}

              <p style={{ fontSize: '0.68rem', color: `${colors.textMuted}99`, marginTop: '8px' }}>
                Loops sync live for all team members and reset when a new mix is uploaded.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upload new version button */}
      {mixMeta && !showUpload && (
        <button
          onClick={() => setShowUpload(true)}
          style={{
            background: 'none', border: `1.5px dashed ${colors.border}`,
            borderRadius: radius.lg, padding: '14px 20px', width: '100%',
            color: colors.textMuted, fontSize: '0.88rem', fontFamily: fonts.body,
            cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = colors.gold; e.currentTarget.style.color = colors.gold }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.color = colors.textMuted }}
        >
          ↑ Upload new version
        </button>
      )}

      {/* Upload form */}
      {showUpload && (
        <div style={{
          background: colors.surface, border: `1px solid ${colors.border}`,
          borderRadius: radius.xl, boxShadow: shadow.card, padding: '24px',
        }}>
          <p style={{
            fontFamily: fonts.heading, fontWeight: 700, fontSize: '1rem',
            color: colors.cream, marginBottom: '16px',
          }}>
            {mixMeta ? 'Upload New Version' : 'Upload Mix'}
          </p>

          <label style={{ display: 'block', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.78rem', color: colors.textMuted, display: 'block', marginBottom: '6px' }}>
              Version label (optional)
            </span>
            <input
              type="text"
              placeholder={`Mix — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
              value={versionLabel}
              onChange={e => setVersionLabel(e.target.value)}
              style={{
                width: '100%', background: colors.bg, border: `1px solid ${colors.border}`,
                borderRadius: radius.md, padding: '10px 12px',
                color: colors.cream, fontFamily: fonts.body, fontSize: '0.9rem',
                boxSizing: 'border-box', outline: 'none',
              }}
            />
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFilePicked}
            style={{ display: 'none' }}
          />

          {uploadError && (
            <p style={{ color: colors.red, fontSize: '0.8rem', marginBottom: '12px' }}>{uploadError}</p>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                flex: 1, background: uploading ? colors.border : colors.gold,
                color: '#fff', border: 'none', borderRadius: radius.lg, padding: '12px',
                fontFamily: fonts.heading, fontWeight: 700, fontSize: '0.9rem',
                cursor: uploading ? 'not-allowed' : 'pointer',
              }}
            >
              {uploading ? 'Uploading…' : '↑ Choose Audio File'}
            </button>
            {!uploading && (
              <button
                onClick={() => { setShowUpload(false); setUploadError(null); setVersionLabel('') }}
                style={{
                  background: 'none', border: `1px solid ${colors.border}`,
                  borderRadius: radius.lg, padding: '12px 16px',
                  color: colors.textMuted, fontFamily: fonts.body, fontSize: '0.9rem', cursor: 'pointer',
                }}
              >Cancel</button>
            )}
          </div>

          <p style={{ fontSize: '0.73rem', color: colors.textMuted, marginTop: '10px' }}>
            Supports MP3, M4A, WAV, OGG. Uploading replaces the previous mix and resets all loops.
          </p>
        </div>
      )}
    </div>
  )
}
