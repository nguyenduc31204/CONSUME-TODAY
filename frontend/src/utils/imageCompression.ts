/**
 * Image compression for mobile uploads.
 * Target: ~5MB max per photo, preserve as much detail as possible.
 * Canvas resize + JPEG quality stepped down only if still over 5MB.
 */

const MAX_PIXELS = 3_000_000 // 3 megapixels — keeps canvas from crashing on mobile
const TARGET_SIZE = 5 * 1024 * 1024 // 5MB — user's target
const QUALITY_STEPS = [0.92, 0.82, 0.72]

/**
 * Compress a File for upload.
 *  1. Resize to ≤ 3MP to avoid mobile canvas memory crash
 *  2. JPEG encode at stepped quality until ≤ 5MB
 *  3. Fallback to original if anything fails
 */
export async function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(url)

      // Determine target dimensions to stay under MAX_PIXELS
      const pixels = img.width * img.height
      let { width, height } = img

      if (pixels > MAX_PIXELS) {
        const scale = Math.sqrt(MAX_PIXELS / pixels)
        width = Math.round(width * scale)
        height = Math.round(height * scale)
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(file); return }

      ctx.drawImage(img, 0, 0, width, height)

      const tryQuality = (step: number): void => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              if (step < QUALITY_STEPS.length - 1) { tryQuality(step + 1); return }
              resolve(file); return
            }
            if (blob.size <= TARGET_SIZE || step >= QUALITY_STEPS.length - 1) {
              const name = file.name.replace(/\.[^.]+$/, '')
              resolve(new File([blob], `${name}.jpg`, { type: 'image/jpeg' }))
            } else {
              tryQuality(step + 1)
            }
          },
          'image/jpeg',
          QUALITY_STEPS[step],
        )
      }

      tryQuality(0)
    }

    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}
