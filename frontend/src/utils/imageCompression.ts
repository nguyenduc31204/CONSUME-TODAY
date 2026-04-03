/**
 * Image compression utility for mobile uploads.
 * Ảnh chụp từ điện thoại có thể từ 3–15MB — cần nén trước khi gửi lên backend
 * để tránh timeout và giảm bandwidth.
 */

/** Max dimensions — resize if larger */
const MAX_WIDTH = 1920
const MAX_HEIGHT = 1920

/** Target quality for JPEG/WebP compression (0–1) */
const QUALITY = 0.85

/** Max file size before compression kicks in (5 MB) */
const SIZE_THRESHOLD = 5 * 1024 * 1024

/**
 * Compress an image File.
 * - If already ≤ SIZE_THRESHOLD → return as-is
 * - Otherwise → resize + recompress to JPEG at QUALITY
 *
 * Returns a new File object (original is untouched).
 * Output is always JPEG for consistent size reduction.
 */
export async function compressImage(file: File): Promise<File> {
  // Skip if already small enough
  if (file.size <= SIZE_THRESHOLD) {
    return file
  }

  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      // Calculate resize dimensions
      let { width, height } = img
      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas 2D context not available'))
        return
      }

      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas toBlob failed'))
            return
          }

          // Build filename keeping original name but changing extension to .jpg
          const baseName = file.name.replace(/\.[^.]+$/, '')
          const compressedFile = new File(
            [blob],
            `${baseName}.jpg`,
            { type: 'image/jpeg' },
          )

          resolve(compressedFile)
        },
        'image/jpeg',
        QUALITY,
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(`Failed to load image: ${file.name}`))
    }

    img.src = url
  })
}
