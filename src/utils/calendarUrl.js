/**
 * Builds a Google Calendar "add event" URL using the TEMPLATE action.
 * No API key needed — works for any Google account.
 *
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} opts.date - 'YYYY-MM-DD'
 * @param {string} [opts.startTime] - 'HH:MM' 24h
 * @param {string} [opts.endTime] - 'HH:MM' 24h
 * @param {string} [opts.location]
 * @param {string} [opts.notes]
 */
export function buildGCalUrl({ title, date, startTime, endTime, location, notes }) {
  const toGCalDateTime = (dateStr, timeStr) => {
    const [y, m, d] = dateStr.split('-')
    const [h, min] = (timeStr || '00:00').split(':')
    return `${y}${m}${d}T${h}${min}00`
  }

  const addHours = (timeStr, hours) => {
    const [h, min] = timeStr.split(':').map(Number)
    const newH = (h + hours) % 24
    return `${String(newH).padStart(2, '0')}:${String(min).padStart(2, '0')}`
  }

  const start = toGCalDateTime(date, startTime || '09:00')
  const effectiveEnd = endTime || (startTime ? addHours(startTime, 2) : '11:00')
  const end = toGCalDateTime(date, effectiveEnd)

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title || 'Practice',
    dates: `${start}/${end}`,
  })
  if (location) params.set('location', location)
  if (notes) params.set('details', notes)

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
