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
  const [seeking, setSeeking] = useState(false)
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

  // Waveform
  const canvasRef = useRef(null)
  const canvasContainerRef = useRef(null)
  const rafRef = useRef(null)
  const canvasSeekingRef = useRef(false)
  const pendingSeekTimeRef = useRef(null)
  const waveformPeaksRef = useRef(null)
  const durationRef = useRef(0)
  const [waveformPeaks, setWaveformPeaks] = useState(null)
  const [waveformLoading, setWaveformLoading] = useState(false)

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

  // Sync durationRef so drawCanvas can read it without stale closures
  useEffect(() => { durationRef.current = duration }, [duration])

  // Decode audio and compute waveform peaks
  useEffect(() => {
    if (!audioUrl) return
    let cancelled = false
    setWaveformPeaks(null)
    waveformPeaksRef.current = null
    setWaveformLoading(true)
    let actx = null

    fetch(audioUrl)
      .then(r => r.arrayBuffer())
      .then(buf => {
        if (cancelled) return null
        actx = new (window.AudioContext || window.webkitAudioContext)()
        return actx.decodeAudioData(buf)
      })
      .then(decoded => {
        if (!decoded || cancelled) return
        const NUM = 200
        const ch = decoded.getChannelData(0)
        const block = Math.floor(ch.length / NUM)
        const peaks = new Float32Array(NUM)
        for (let i = 0; i < NUM; i++) {
          let max = 0
          for (let j = 0; j < block; j++) {
            const v = Math.abs(ch[i * block + j])
            if (v > max) max = v
          }
          peaks[i] = max
        }
        let gMax = 0
        for (let i = 0; i < NUM; i++) if (peaks[i] > gMax) gMax = peaks[i]
        if (gMax > 0) for (let i = 0; i < NUM; i++) peaks[i] /= gMax
        if (!cancelled) {
          waveformPeaksRef.current = peaks
          setWaveformPeaks(peaks)
          setWaveformLoading(false)
        }
      })
      .catch(() => { if (!cancelled) setWaveformLoading(false) })
      .finally(() => { actx?.close() })

    return () => { cancelled = true }
  }, [audioUrl])

  // Draw the waveform canvas — reads exclusively from refs so any render's
  // version of this function will produce a correct result.
  function drawCanvas() {
    const canvas = canvasRef.current
    const container = canvasContainerRef.current
    const peaks = waveformPeaksRef.current
    if (!canvas || !container || !peaks) return
    const W = container.clientWidth
    if (!W) return
    if (canvas.width !== W) canvas.width = W
    if (canvas.height !== 72) canvas.height = 72
    const H = 72
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, W, H)

    const dur = durationRef.current
    const t = pendingSeekTimeRef.current !== null
      ? pendingSeekTimeRef.current
      : (audioRef.current?.currentTime ?? 0)
    const playedFrac = dur > 0 ? t / dur : 0
    const { start: ls, end: le, enabled: lEnabled } = loopRef.current
    const lsFrac = dur > 0 && ls !== null ? ls / dur : null
    const leFrac = dur > 0 && le !== null ? le / dur : null

    const NUM = peaks.length
    const bw = W / NUM
    const gap = bw > 3 ? 1 : 0
    const cy = H / 2

    for (let i = 0; i < NUM; i++) {
      const frac = i / NUM
      const x = i * bw
      const bh = Math.max(2, peaks[i] * H * 0.88)
      const inLoop = lsFrac !== null && leFrac !== null && frac >= lsFrac && frac <= leFrac
      const played = frac <= playedFrac

      let color
      if (inLoop && lEnabled) {
        color = played ? colors.orange : `${colors.orange}55`
      } else if (inLoop) {
        color = played ? colors.gold : `${colors.border}cc`
      } else {
        color = played ? colors.gold : colors.border
      }

      ctx.fillStyle = color
      ctx.fillRect(x + gap / 2, cy - bh / 2, Math.max(bw - gap, 1), bh)
    }
  }

  // Redraw when peaks, loop region, or duration changes
  useEffect(() => { drawCanvas() }, [waveformPeaks, loopStart, loopEnd, loopEnabled, duration])

  // ResizeObserver so the canvas stays sharp when the container resizes
  useEffect(() => {
    const container = canvasContainerRef.current
    if (!container) return
    const ro = new ResizeObserver(() => drawCanvas())
    ro.observe(container)
    return () => ro.disconnect()
  }, [])

  // RAF-driven waveform animation while audio is playing
  useEffect(() => {
    if (!playing) {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
      return
    }
    const tick = () => {
      if (audioRef.current && !canvasSeekingRef.current) {
        setCurrentTime(audioRef.current.currentTime)
        drawCanvas()
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null } }
  }, [playing])

  // Canvas seek helpers
  function getCanvasTime(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
    return (x / rect.width) * durationRef.current
  }
  function handleCanvasPointerDown(e) {
    e.currentTarget.setPointerCapture(e.pointerId)
    canvasSeekingRef.current = true
    setSeeking(true)
    const t = getCanvasTime(e)
    pendingSeekTimeRef.current = t
    setCurrentTime(t)
    drawCanvas()
  }
  function handleCanvasPointerMove(e) {
    if (!canvasSeekingRef.current) return
    const t = getCanvasTime(e)
    pendingSeekTimeRef.current = t
    setCurrentTime(t)
    drawCanvas()
  }
  function handleCanvasPointerUp(e) {
    if (!canvasSeekingRef.current) return
    const t = getCanvasTime(e)
    if (audioRef.current) audioRef.current.currentTime = t
    pendingSeekTimeRef.current = null
    canvasSeekingRef.current = false
    setCurrentTime(t)
    setSeeking(false)
  }

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
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0
  const loopStartPct = duration > 0 && loopStart !== null ? (loopStart / duration) * 100 : null
  const loopEndPct   = duration > 0 && loopEnd   !== null ? (loopEnd   / duration) * 100 : null
  const hasLoop = loopStart !== null && loopEnd !== null && loopEnd > loopStart

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

            {/* ── Waveform ── */}
            <div style={{ marginBottom: '16px' }}>
              <div ref={canvasContainerRef} style={{ marginBottom: '6px' }}>
                {/* Loading placeholder */}
                {waveformLoading && (
                  <div style={{
                    height: '72px', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: '2px',
                  }}>
                    {Array.from({ length: 40 }).map((_, i) => (
                      <div key={i} style={{
                        width: '3px', borderRadius: '2px',
                        height: `${6 + Math.abs(Math.sin(i * 0.45 + 0.5)) * 36}px`,
                        background: colors.border, opacity: 0.5,
                      }} />
                    ))}
                  </div>
                )}
                {/* Fallback plain scrubber if decode failed */}
                {!waveformPeaks && !waveformLoading && (
                  <div style={{ height: '72px', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="range" className="mix-scrubber"
                      min={0} max={duration || 100} value={currentTime}
                      onMouseDown={handleScrubStart} onTouchStart={handleScrubStart}
                      onChange={handleScrubMove} onMouseUp={handleScrubEnd} onTouchEnd={handleScrubEnd}
                      style={{ width: '100%' }}
                    />
                  </div>
                )}
                {/* Waveform canvas */}
                {waveformPeaks && (
                  <canvas
                    ref={canvasRef}
                    style={{ display: 'block', width: '100%', height: '72px', cursor: 'pointer', borderRadius: '6px' }}
                    onPointerDown={handleCanvasPointerDown}
                    onPointerMove={handleCanvasPointerMove}
                    onPointerUp={handleCanvasPointerUp}
                  />
                )}
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
