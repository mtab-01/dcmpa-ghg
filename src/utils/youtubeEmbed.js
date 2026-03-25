/**
 * Extracts YouTube video ID from various YouTube URL formats.
 * Returns an embed URL if it's a YouTube link, otherwise null.
 */
export function getYouTubeEmbedUrl(url) {
  if (!url) return null
  const match = url.match(
    /(?:(?:youtube(?:-nocookie)?\.com)\/(?:watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([^&?\s]+)/
  )
  if (match && match[1]) {
    return `https://www.youtube.com/embed/${match[1]}`
  }
  return null
}

export function isYouTubeUrl(url) {
  return getYouTubeEmbedUrl(url) !== null
}
