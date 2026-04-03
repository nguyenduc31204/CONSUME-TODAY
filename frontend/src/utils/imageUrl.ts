/**
 * Image URL utilities — converts R2 public URLs to proxy endpoints.
 * Use this for all image display to ensure R2 private buckets work.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

/**
 * Convert R2 URL to backend proxy URL.
 * e.g. https://pub-xxx.r2.dev/thumbnails/abc.jpg
 *   → https://api.testduc.io.vn/api/v1/images/proxy/thumbnails/abc.jpg
 *
 * Falls back to original URL if already a proxy URL or path-only.
 */
export function getProxyImageUrl(r2Url: string | null | undefined): string {
  if (!r2Url) return ''
  // If it's already a proxy URL, return as-is
  if (r2Url.includes('/images/proxy/')) return r2Url
  // Extract R2 path after the domain
  const match = r2Url.match(/https?://[^/]+/(.+)/)
  if (match) {
    const r2Path = match[1]
    return `${API_BASE}/images/proxy/${r2Path}`
  }
  // Already a path, wrap in proxy
  return `${API_BASE}/images/proxy/${r2Url}`
}
