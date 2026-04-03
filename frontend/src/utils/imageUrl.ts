/**
 * Image URL utilities — returns image URLs as-is.
 * Backend already returns presigned GET URLs (valid 24h) on upload,
 * so frontend just uses them directly without any transformation.
 */

export function getProxyImageUrl(url: string | null | undefined): string {
  return url ?? ''
}
