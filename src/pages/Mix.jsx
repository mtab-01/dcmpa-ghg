import { useState, useEffect, useRef, useCallback, Component } from 'react'
import { db, storage } from '../firebase'
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { colors, fonts, radius, shadow } from '../theme'
import { useIsMobile } from '../hooks/useWindowWidth'

// ── Waveform error boundary ───────────────────────────────────────────────────
class WaveformErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { err: false } }
  static getDerivedStateFromError() { return { err: true } }
  render() {
    if (this.state.err) return null   // fail silently – don't crash the page
    return this.props.children
  }
}

// ── Waveform ──────────────────────────────────────────────────────────────────
// Generate a stable, realistic-looking bar pattern seeded by the audio URL
function generateBars(audioUrl, count = 150) {
  let s = 0
  const src = audioUrl || 'default'
  for (let i = 0; i < Math.min(src.length, 64); i++) {
    s = (s * 31 + src.charCodeAt(i)) >>> 0
  }
  const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xFFFFFFFF }
  return Array.from({ length: count }, (_, i) => {
    const t = i / count
    const base = 0.15 + 0.7 * Math.abs(
      Math.sin(t * 17.3 + 1) * Math.cos(t * 8.7) * Math.sin(t * 3.1)
    )
    return Math.min(1, base + rng() * 0.15)
  })
}

function WaveformCanvas({ audioUrl, currentTime, duration, onSeek, loopStart, loopEnd, loopEnabled }) {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const barsRef = useRef([])
  const [canvasW, setCanvasW] = useState(0)
  const [hoverX, setHoverX] = useState(null)

  // Regenerate bars whenever the track changes (stable per URL)
  useEffect(() => {
    barsRef.current = generateBars(audioUrl)
  }, [audioUrl])

  // Track container width via ResizeObserver
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    try {
      const ro = new ResizeObserver(entries => {
        try {
          const w = entries[0]?.contentRect?.width
          if (w != null) setCanvasW(Math.round(w))
        } catch (_) {}
      })
      ro.observe(wrap)
      setCanvasW(wrap.offsetWidth)
      return () => ro.disconnect()
    } catch (_) {}
  }, [])

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || canvasW === 0) return
    try {
      const dpr = window.devicePixelRatio || 1
      const W = canvasW
      const H = 68
      canvas.width = W * dpr
      canvas.height = H * dpr
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.save()
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, W, H)

      const bars = barsRef.current
      const n = bars.length
      const gap = 2
      const barW = Math.max(1, (W - gap * (n - 1)) / n)
      const mid = H / 2
      const maxH = mid - 3
      const pct = duration > 0 ? currentTime / duration : 0
      const loopStartFrac = duration > 0 && loopStart !== null ? loopStart / duration : null
      const loopEndFrac   = duration > 0 && loopEnd   !== null ? loopEnd   / duration : null

      bars.forEach((bar, i) => {
        const x = i * (barW + gap)
        const h = Math.max(2, bar * maxH)
        const frac = (i + 0.5) / n
        const isPlayed = frac < pct
        const inLoop = loopStartFrac !== null && loopEndFrac !== null
          && frac >= loopStartFrac && frac <= loopEndFrac
        const isHovered = hoverX !== null && Math.abs(x + barW / 2 - hoverX) < (W * 0.04)

        if (isHovered) {
          ctx.fillStyle = colors.orange
        } else if (isPlayed) {
          ctx.fillStyle = colors.gold
        } else if (inLoop && loopEnabled) {
          ctx.fillStyle = colors.orange
        } else if (inLoop) {
          ctx.fillStyle = `rgba(245,130,13,0.45)`
        } else {
          ctx.fillStyle = colors.border
        }

        // Symmetric bar (up + down from centre, like SoundCloud)
        ctx.fillRect(x, mid - h, barW, h * 2)
      })

      ctx.restore()
    } catch (_) {}
  }, [currentTime, duration, loopStart, loopEnd, loopEnabled, hoverX, canvasW])

  function getSeekTime(clientX) {
    const wrap = wrapRef.current
    if (!wrap || !duration) return null
    try {
      const rect = wrap.getBoundingClientRect()
      if (!rect.width) return null
      return Math.max(0, Math.min(duration, ((clientX - rect.left) / rect.width) * duration))
    } catch (_) { return null }
  }

  function handlePointerSeek(e) {
    const clientX = e.clientX ?? e.changedTouches?.[0]?.clientX
    if (clientX == null) return
    const t = getSeekTime(clientX)
    if (t !== null) onSeek(t)
  }

  function handleMouseMove(e) {
    if (!wrapRef.current) return
    const rect = wrapRef.current.getBoundingClientRect()
    setHoverX(e.clientX - rect.left)
    if (e.buttons === 1) handlePointerSeek(e)
  }

  return (
    <div
      ref={wrapRef}
      style={{ position: 'relative', width: '100%', height: '68px', cursor: 'pointer', userSelect: 'none' }}
      onClick={handlePointerSeek}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoverX(null)}
      onTouchStart={handlePointerSeek}
      onTouchMove={e => { e.preventDefault(); handlePointerSeek(e) }}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '68px' }} />

      {/* Playhead */}
      {duration > 0 && (
        <div style={{
          position: 'absolute', top: 0,
          left: `${(currentTime / duration) * 100}%`,
          width: '2px', height: '100%',
          background: colors.gold, pointerEvents: 'none',
          transform: 'translateX(-1px)',
        }} />
      )}

      {/* Loop markers */}
      {loopStart !== null && duration > 0 && (
        <div style={{
          position: 'absolute', top: 0,
          left: `${(loopStart / duration) * 100}%`,
          width: '2px', height: '100%',
          background: colors.orange, pointerEvents: 'none', zIndex: 2,
        }} />
      )}
      {loopEnd !== null && duration > 0 && (
        <div style={{
          position: 'absolute', top: 0,
          left: `${(loopEnd / duration) * 100}%`,
          width: '2px', height: '100%',
          background: colors.orange, pointerEvents: 'none', zIndex: 2,
        }} />
      )}
    </div>
  )
}

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

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]

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
  const [speed, setSpeed] = useState(1)

  // Loop state
  const [loopStart, setLoopStart] = useState(null)   // seconds or null
  const [loopEnd, setLoopEnd] = useState(null)       // seconds or null
  const [loopEnabled, setLoopEnabled] = useState(false)
  const loopRef = useRef({ start: null, end: null, enabled: false })

  // Upload state
  const [showUpload, setShowUpload] = useState(false)
  const [versionLabel, setVersionLabel] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const fileInputRef = useRef(null)

  // Keep loopRef in sync so the timeupdate closure can read it without stale state
  useEffect(() => {
    loopRef.current = { start: loopStart, end: loopEnd, enabled: loopEnabled }
  }, [loopStart, loopEnd, loopEnabled])

  useEffect(() => { loadMix() }, [])

  // Load loop from Firestore and subscribe to changes
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'mix_loops', 'current'), snap => {
      if (!snap.exists()) return
      const d = snap.data()
      setLoopStart(d.loopStart ?? null)
      setLoopEnd(d.loopEnd ?? null)
      setLoopEnabled(d.loopEnabled ?? false)
    })
    return unsub
  }, [])

  // Wire up audio events
  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const onTime = () => {
      const t = el.currentTime
      setCurrentTime(t)
      const { start, end, enabled } = loopRef.current
      if (enabled && start !== null && end !== null && end > start && t >= end) {
        el.currentTime = start
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
  }, [audioUrl])

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

  // ── Loop helpers ──────────────────────────────────────────────────────────
  const saveLoop = useCallback(async (patch) => {
    try {
      await setDoc(doc(db, 'mix_loops', 'current'), patch, { merge: true })
    } catch { /* non-critical */ }
  }, [])

  function setLoopA() {
    const t = audioRef.current?.currentTime ?? currentTime
    setLoopStart(t)
    // If B exists and is before new A, clear B
    const newEnd = loopEnd !== null && loopEnd > t ? loopEnd : null
    setLoopEnd(newEnd)
    saveLoop({ loopStart: t, loopEnd: newEnd })
  }

  function setLoopB() {
    const t = audioRef.current?.currentTime ?? currentTime
    // B must be after A
    if (loopStart !== null && t <= loopStart) return
    setLoopEnd(t)
    saveLoop({ loopEnd: t })
  }

  function clearLoop() {
    setLoopStart(null)
    setLoopEnd(null)
    setLoopEnabled(false)
    saveLoop({ loopStart: null, loopEnd: null, loopEnabled: false })
  }

  async function toggleLoop() {
    const next = !loopEnabled
    setLoopEnabled(next)
    await saveLoop({ loopEnabled: next })
    // If enabling and we have a region, jump to start
    if (next && loopStart !== null && audioRef.current) {
      audioRef.current.currentTime = loopStart
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
  const hasLoop = loopStart !== null && loopEnd !== null && loopEnd > loopStart

  // ── Styles ────────────────────────────────────────────────────────────────
  const css = `
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
    .loop-toggle-on {
      background: ${colors.gold}18 !important;
      border-color: ${colors.gold} !important;
      color: ${colors.gold} !important;
      font-weight: 700 !important;
    }
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

            {/* ── Waveform scrubber ── */}
            <div style={{ marginBottom: '16px' }}>
              <WaveformErrorBoundary>
                <WaveformCanvas
                  audioUrl={audioUrl}
                  currentTime={currentTime}
                  duration={duration}
                  onSeek={t => {
                    const safe = Number.isFinite(t) ? t : 0
                    if (audioRef.current) audioRef.current.currentTime = safe
                    setCurrentTime(safe)
                  }}
                  loopStart={loopStart}
                  loopEnd={loopEnd}
                  loopEnabled={loopEnabled}
                />
              </WaveformErrorBoundary>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
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
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
              }}>
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
            <div style={{
              borderTop: `1px solid ${colors.border}`,
              paddingTop: '16px',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                flexWrap: 'wrap',
              }}>
                <span style={{ fontFamily: fonts.mono, fontSize: '0.68rem', color: colors.textMuted, marginRight: '2px' }}>
                  LOOP
                </span>

                {/* Set A */}
                <button className="loop-btn" onClick={setLoopA} title="Set loop start to current position">
                  [A] {loopStart !== null ? formatTime(loopStart) : '—'}
                </button>

                {/* Set B */}
                <button
                  className="loop-btn"
                  onClick={setLoopB}
                  disabled={loopStart === null}
                  title="Set loop end to current position"
                >
                  [B] {loopEnd !== null ? formatTime(loopEnd) : '—'}
                </button>

                {/* Toggle loop */}
                <button
                  className={`loop-btn${loopEnabled ? ' loop-toggle-on' : ''}`}
                  onClick={toggleLoop}
                  disabled={!hasLoop}
                  title={loopEnabled ? 'Disable loop' : 'Enable loop'}
                >
                  {loopEnabled ? '⟳ On' : '⟳ Off'}
                </button>

                {/* Clear */}
                {(loopStart !== null || loopEnd !== null) && (
                  <button
                    className="loop-btn"
                    onClick={clearLoop}
                    style={{ color: colors.red, borderColor: `${colors.red}60` }}
                    title="Clear loop markers"
                  >
                    ✕ Clear
                  </button>
                )}
              </div>

              {hasLoop && (
                <p style={{
                  fontFamily: fonts.mono, fontSize: '0.68rem', color: colors.textMuted,
                  marginTop: '8px',
                }}>
                  {formatTime(loopStart)} → {formatTime(loopEnd)}
                  {' '}·{' '}
                  {formatTime(loopEnd - loopStart)} region
                  {loopEnabled && (
                    <span style={{ color: colors.orange, marginLeft: '8px' }}>● looping</span>
                  )}
                </p>
              )}

              <p style={{ fontSize: '0.68rem', color: `${colors.textMuted}99`, marginTop: '6px' }}>
                Loop markers sync live for all team members.
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
            Supports MP3, M4A, WAV, OGG. Uploading replaces the previous mix.
          </p>
        </div>
      )}
    </div>
  )
}
