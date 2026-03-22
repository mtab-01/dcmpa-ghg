import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
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

export default function Mix() {
  const isMobile = useIsMobile()
  const audioRef = useRef(null)

  const [mixMeta, setMixMeta] = useState(undefined) // undefined=loading, null=none, obj=exists
  const [audioUrl, setAudioUrl] = useState(null)
  const [audioError, setAudioError] = useState(false)

  // Player state
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [seeking, setSeeking] = useState(false)

  // Upload state
  const [showUpload, setShowUpload] = useState(false)
  const [versionLabel, setVersionLabel] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => { loadMix() }, [])

  // Wire up audio events
  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const onTime = () => { if (!seeking) setCurrentTime(el.currentTime) }
    const onMeta = () => setDuration(el.duration)
    const onEnd = () => setPlaying(false)
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

  async function loadMix() {
    setAudioError(false)
    const { data, error } = await supabase
      .from('mix_meta')
      .select('*')
      .eq('id', 1)
      .single()

    if (error || !data) {
      setMixMeta(null)
      return
    }
    setMixMeta(data)
    const { data: { publicUrl } } = supabase.storage.from('mix').getPublicUrl(data.file_path)
    setAudioUrl(publicUrl)
    setCurrentTime(0)
    setDuration(0)
    setPlaying(false)
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

  function handleScrubMove(e) {
    setCurrentTime(parseFloat(e.target.value))
  }

  function handleScrubEnd(e) {
    const t = parseFloat(e.target.value)
    if (audioRef.current) audioRef.current.currentTime = t
    setCurrentTime(t)
    setSeeking(false)
  }

  async function handleFilePicked(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)

    const ext = file.name.split('.').pop().toLowerCase()
    const path = `current.${ext}`

    const { error: storageErr } = await supabase.storage
      .from('mix')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (storageErr) {
      setUploadError(`Upload failed: ${storageErr.message}`)
      setUploading(false)
      return
    }

    const label = versionLabel.trim() ||
      `Mix — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

    const { error: dbErr } = await supabase.from('mix_meta').upsert({
      id: 1,
      label,
      file_path: path,
      file_name: file.name,
      uploaded_at: new Date().toISOString(),
    })

    if (dbErr) {
      setUploadError(`Metadata save failed: ${dbErr.message}`)
      setUploading(false)
      return
    }

    setUploading(false)
    setShowUpload(false)
    setVersionLabel('')
    e.target.value = ''
    loadMix()
  }

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div style={{ padding: isMobile ? '24px 16px' : '36px 36px', maxWidth: '680px' }}>
      <style>{`
        .mix-scrubber {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 5px;
          border-radius: 3px;
          background: linear-gradient(to right, ${colors.gold} ${pct}%, ${colors.border} ${pct}%);
          outline: none;
          cursor: pointer;
        }
        .mix-scrubber::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: ${colors.gold};
          cursor: pointer;
          box-shadow: 0 0 0 2px white, 0 0 0 3px ${colors.gold}60;
          transition: transform 0.1s;
        }
        .mix-scrubber::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        .mix-scrubber::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: ${colors.gold};
          cursor: pointer;
          border: none;
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <p style={{
          fontFamily: fonts.mono,
          fontSize: '0.68rem',
          color: colors.textMuted,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: '8px',
        }}>
          Current
        </p>
        <h1 style={{
          fontFamily: fonts.heading,
          fontSize: isMobile ? '2rem' : '2.6rem',
          fontWeight: 800,
          color: colors.cream,
          lineHeight: 1.1,
          marginBottom: '8px',
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
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.xl,
          boxShadow: shadow.card,
          padding: '48px 32px',
          textAlign: 'center',
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
              background: colors.gold,
              color: '#fff',
              border: 'none',
              borderRadius: radius.lg,
              padding: '12px 28px',
              fontFamily: fonts.heading,
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
            }}
          >
            Upload Mix
          </button>
        </div>
      )}

      {/* Player */}
      {mixMeta && audioUrl && (
        <div style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.xl,
          boxShadow: shadow.card,
          overflow: 'hidden',
          marginBottom: '20px',
        }}>
          {/* Hidden audio element */}
          <audio ref={audioRef} src={audioUrl} preload="metadata" />

          {/* Player header strip */}
          <div style={{
            background: `linear-gradient(135deg, ${colors.gold}18 0%, ${colors.bgDeep} 100%)`,
            borderBottom: `1px solid ${colors.border}`,
            padding: '20px 24px 16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: radius.lg,
                background: `linear-gradient(135deg, ${colors.gold}, ${colors.goldDim})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                flexShrink: 0,
              }}>
                🎵
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: fonts.heading,
                  fontWeight: 800,
                  fontSize: '1rem',
                  color: colors.cream,
                  marginBottom: '2px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {mixMeta.label}
                </div>
                <div style={{ fontSize: '0.75rem', color: colors.textMuted }}>
                  {mixMeta.file_name} · {formatDate(mixMeta.uploaded_at)}
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div style={{ padding: '20px 24px 24px' }}>
            {/* Scrubber */}
            <div style={{ marginBottom: '16px' }}>
              <input
                type="range"
                className="mix-scrubber"
                min={0}
                max={duration || 100}
                value={currentTime}
                onMouseDown={handleScrubStart}
                onTouchStart={handleScrubStart}
                onChange={handleScrubMove}
                onMouseUp={handleScrubEnd}
                onTouchEnd={handleScrubEnd}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ fontFamily: fonts.mono, fontSize: '0.72rem', color: colors.textMuted }}>
                  {formatTime(currentTime)}
                </span>
                <span style={{ fontFamily: fonts.mono, fontSize: '0.72rem', color: colors.textMuted }}>
                  {formatTime(duration)}
                </span>
              </div>
            </div>

            {/* Playback buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
              {/* Skip back */}
              <button
                onClick={() => handleSkip(-10)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: colors.creamDim,
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontFamily: fonts.mono,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  opacity: 0.75,
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>⟪</span>
                <span>10s</span>
              </button>

              {/* Play / Pause */}
              <button
                onClick={togglePlay}
                disabled={audioError}
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: audioError ? colors.border : colors.gold,
                  border: 'none',
                  color: '#fff',
                  fontSize: '1.5rem',
                  cursor: audioError ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: audioError ? 'none' : `0 4px 16px ${colors.gold}50`,
                  transition: 'transform 0.1s, box-shadow 0.1s',
                  flexShrink: 0,
                }}
                onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.94)' }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
              >
                {playing ? '⏸' : '▶'}
              </button>

              {/* Skip forward */}
              <button
                onClick={() => handleSkip(10)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: colors.creamDim,
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontFamily: fonts.mono,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  opacity: 0.75,
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>⟫</span>
                <span>10s</span>
              </button>
            </div>

            {audioError && (
              <p style={{ textAlign: 'center', color: colors.red, fontSize: '0.8rem', marginTop: '12px' }}>
                Could not load audio. Check that the storage bucket is public.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Update / upload section */}
      {mixMeta && !showUpload && (
        <button
          onClick={() => setShowUpload(true)}
          style={{
            background: 'none',
            border: `1.5px dashed ${colors.border}`,
            borderRadius: radius.lg,
            padding: '14px 20px',
            width: '100%',
            color: colors.textMuted,
            fontSize: '0.88rem',
            fontFamily: fonts.body,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = colors.gold
            e.currentTarget.style.color = colors.gold
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = colors.border
            e.currentTarget.style.color = colors.textMuted
          }}
        >
          ↑ Upload new version
        </button>
      )}

      {/* Upload form */}
      {showUpload && (
        <div style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.xl,
          boxShadow: shadow.card,
          padding: '24px',
          marginTop: mixMeta ? '0' : '0',
        }}>
          <p style={{
            fontFamily: fonts.heading,
            fontWeight: 700,
            fontSize: '1rem',
            color: colors.cream,
            marginBottom: '16px',
          }}>
            {mixMeta ? 'Upload New Version' : 'Upload Mix'}
          </p>

          {/* Version label */}
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
                width: '100%',
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: radius.md,
                padding: '10px 12px',
                color: colors.cream,
                fontFamily: fonts.body,
                fontSize: '0.9rem',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </label>

          {/* File picker */}
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFilePicked}
            style={{ display: 'none' }}
          />

          {uploadError && (
            <p style={{ color: colors.red, fontSize: '0.8rem', marginBottom: '12px' }}>
              {uploadError}
            </p>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                flex: 1,
                background: uploading ? colors.border : colors.gold,
                color: '#fff',
                border: 'none',
                borderRadius: radius.lg,
                padding: '12px',
                fontFamily: fonts.heading,
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: uploading ? 'not-allowed' : 'pointer',
              }}
            >
              {uploading ? 'Uploading…' : '↑ Choose Audio File'}
            </button>
            {!uploading && (
              <button
                onClick={() => { setShowUpload(false); setUploadError(null); setVersionLabel('') }}
                style={{
                  background: 'none',
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.lg,
                  padding: '12px 16px',
                  color: colors.textMuted,
                  fontFamily: fonts.body,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            )}
          </div>

          <p style={{ fontSize: '0.73rem', color: colors.textMuted, marginTop: '10px' }}>
            Supports MP3, M4A, WAV, OGG. Uploading replaces the previous mix.
          </p>

          {!mixMeta && (
            <details style={{ marginTop: '16px' }}>
              <summary style={{ fontSize: '0.78rem', color: colors.textMuted, cursor: 'pointer' }}>
                Supabase setup required ▸
              </summary>
              <div style={{
                marginTop: '10px',
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: radius.md,
                padding: '12px',
                fontSize: '0.78rem',
                color: colors.creamDim,
                lineHeight: 1.7,
              }}>
                <strong>1.</strong> In Supabase → Storage, create a bucket named <code>mix</code> and make it <strong>public</strong>.<br />
                <strong>2.</strong> In Supabase → Table Editor, create a table <code>mix_meta</code> with columns:<br />
                &nbsp;&nbsp;<code>id</code> int8 primary key, <code>label</code> text, <code>file_path</code> text,<br />
                &nbsp;&nbsp;<code>file_name</code> text, <code>uploaded_at</code> timestamptz<br />
                <strong>3.</strong> Set RLS policies to allow anon read/write (or disable RLS for this table).
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
