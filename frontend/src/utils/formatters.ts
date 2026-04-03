/**
 * VND Currency Formatter — integer VND amounts, no floating point errors.
 */

/**
 * Format an integer VND amount to Vietnamese currency string.
 * Example: 75000 → "75.000₫"
 */
export function formatVND(amount: number): string {
  if (amount === 0) return '0₫'
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format an integer VND amount to compact string.
 * Example: 1500000 → "1,5Tr"
 */
export function formatVNDCompact(amount: number): string {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1).replace('.0', '')}Tr`
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(0)}K`
  }
  return `${amount}đ`
}

/**
 * Format a date to Vietnamese date string.
 * Example: "2026-04-01" → "01/04/2026"
 *
 * API returns naive datetimes (no TZ suffix). When passed to new Date(),
 * JS treats them as UTC which can shift to previous day in UTC+7.
 * We parse YYYY-MM-DD strings directly to avoid this.
 */
export function formatDate(date: string | Date): string {
  let d: Date
  if (typeof date === 'string' && date.length === 10) {
    // YYYY-MM-DD only
    const [y, mo, day] = date.split('-').map(Number)
    d = new Date(y, mo - 1, day)
  } else {
    d = new Date(date)
  }
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

/**
 * Format a date to Vietnamese time string.
 * Example: "2026-04-01T12:30:00" → "12:30"
 */
export function formatTime(date: string | Date): string {
  let d: Date
  if (typeof date === 'string' && !date.endsWith('Z') && date.includes('T')) {
    const [ymd, hms] = date.split('T')
    const [y, mo, day] = ymd.split('-').map(Number)
    const [h, mi] = hms.split(':').map(Number)
    d = new Date(y, mo - 1, day, h ?? 0, mi ?? 0)
  } else {
    d = new Date(date)
  }
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

/**
 * Format a date to full Vietnamese datetime.
 */
export function formatDateTime(date: string | Date): string {
  return `${formatDate(date)} lúc ${formatTime(date)}`
}

/**
 * Format a date to relative time (e.g. "2 phút trước", "Hôm nay").
 * API returns naive datetimes (no TZ suffix), so parse them as local time
 * to avoid JS shifting them to the previous day.
 */
export function formatRelativeTime(date: string | Date): string {
  const now = new Date()

  // If date is a naive ISO string without TZ suffix (e.g. "2026-04-02T06:44:28"),
  // construct Date from parts to avoid UTC-shift. Otherwise fall back to Date().
  let then: Date
  if (typeof date === 'string' && !date.endsWith('Z') && date.includes('T')) {
    const [ymd, hms] = date.split('T')
    const [y, mo, d] = ymd.split('-').map(Number)
    const [h, mi, s] = hms.split(/[.:]/).map(Number)
    then = new Date(y, mo - 1, d, h ?? 0, mi ?? 0, s ?? 0)
  } else {
    then = new Date(date)
  }

  const diffMs = now.getTime() - then.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'Vừa xong'
  if (diffMin < 60) return `${diffMin} phút trước`
  if (diffHour < 24) return `${diffHour} giờ trước`
  if (diffDay === 1) return 'Hôm qua'
  if (diffDay < 7) return `${diffDay} ngày trước`

  return formatDate(date)
}

/**
 * Get today's date as YYYY-MM-DD string in local timezone (Vietnam: UTC+7).
 */
export function todayISO(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  const local = new Date(now.getTime() - offset * 60 * 1000)
  return local.toISOString().split('T')[0]
}
