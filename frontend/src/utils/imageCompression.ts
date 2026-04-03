/**
 * Image compression utility for mobile uploads.
 * Rear camera photos can be 8–20MB — we aggressively resize + compress
 * to ensure upload succeeds on mobile networks.
 */

/** Max dimensions — resize to this (keeps ratio) */
const MAX_WIDTH = 1280
const MAX_HEIGHT = 1280

/** Target file size (500 KB) — aggressive to survive slow mobile networks */
const TARGET_SIZE = 500 * 1024

/** Try quality steps from high to low until under TARGET_SIZE */
const QUALITY_STEPS = [0.7, 0.5, 0.35]

/**
 * Compress an image File for upload.
 * - Always resize to ≤ 1280px longest side
 * - Recompress to JPEG, quality stepped down until ≤ 500KB
 * - Falls back to original if compression fails
 */
export async function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)

    const img = new Image()

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
        resolve(file)
        return
      }

      ctx.drawImage(img, 0, 0, width, height)

      const tryCompress = (stepIndex: number) => {
        const quality = QUALITY_STEPS[stepIndex]
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              // Blob failed — try lower quality
              if (stepIndex < QUALITY_STEPS.length - 1) {
                tryCompress(stepIndex + 1)
              } else {
                resolve(file)
              }
              return
            }

            if (blob.size <= TARGET_SIZE || stepIndex >= QUALITY_STEPS.length - 1) {
              const baseName = file.name.replace(/\.[^.]+$/, '')
              const compressedFile = new File(
                [blob],
                `${baseName}.jpg`,
                { type: 'image/jpeg' },
              )
              resolve(compressedFile)
            } else {
              // Still too big — try lower quality
              tryCompress(stepIndex + 1)
            }
          },
          'image/jpeg',
          quality,
        )
      }

      tryCompress(0)
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file)
    }

    img.src = url
  })
}
