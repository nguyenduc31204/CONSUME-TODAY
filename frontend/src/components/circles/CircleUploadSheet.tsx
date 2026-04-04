/**
 * CircleUploadSheet — Modal to add a photo/memory to a Circle.
 * Flow: Select image → Preview → Add caption → Upload → Post
 */

import { useRef, useState } from 'react'
import { X, Image, Send, ChevronLeft, Link2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useUploadCircleImage } from '@/hooks/useCircles'
import { Spinner } from '@/components/ui/Spinner'
import { compressImage } from '@/utils/imageCompression'

interface CircleUploadSheetProps {
  circleId: string
  circleName: string
  isLinkShared: boolean
  onClose: () => void
  onPosted: () => void
}

export function CircleUploadSheet({
  circleId,
  circleName,
  isLinkShared,
  onClose,
  onPosted,
}: CircleUploadSheetProps) {
  const [step, setStep] = useState<'pick' | 'preview'>('pick')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [isVisibleLink, setIsVisibleLink] = useState(isLinkShared)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const uploadMutation = useUploadCircleImage()

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setSelectedFile(file)
    setPreviewUrl(url)
    setStep('preview')
    setError(null)
  }

  const handlePickFromGallery = () => {
    fileInputRef.current?.click()
  }

  const handleBack = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setSelectedFile(null)
    setPreviewUrl(null)
    setCaption('')
    setError(null)
    setStep('pick')
  }

  const handleSubmit = async () => {
    if (!selectedFile) return
    setError(null)

    // Compress before upload
    let fileToUpload = selectedFile
    try {
      fileToUpload = await compressImage(selectedFile)
    } catch {
      // Fallback: use original
    }

    try {
      await uploadMutation.mutateAsync({
        circleId,
        file: fileToUpload,
        caption: caption.trim() || undefined,
        isVisibleLink,
      })
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      onPosted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tải ảnh thất bại')
    }
  }

  const isLoading = uploadMutation.isPending

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !isLoading) onClose() }}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md animate-in slide-in-from-bottom-4 fade-in duration-300 overflow-hidden">

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={handleFilePick}
        />

        {/* ── Step 1: Pick image ─────────────────────────── */}
        {step === 'pick' && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-gray-900">Thêm kỷ niệm</h2>
                <p className="text-xs text-gray-400 mt-0.5">đến {circleName}</p>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-1.5 hover:bg-gray-100 transition-colors"
                aria-label="Đóng"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="flex flex-col items-center gap-6 py-12 px-6">
              {/* Illustration */}
              <div
                onClick={handlePickFromGallery}
                className={cn(
                  'flex flex-col items-center gap-4 cursor-pointer',
                  'rounded-2xl border-2 border-dashed border-gray-200',
                  'w-full py-12 px-6',
                  'hover:border-memoir-300 hover:bg-memoir-50/50 transition-all',
                  'active:scale-[0.98]',
                )}
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-memoir-50">
                  <Image className="h-8 w-8 text-memoir-300" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-700">Chọn ảnh từ thư viện</p>
                  <p className="mt-1 text-xs text-gray-400">hoặc chụp ảnh mới</p>
                </div>
              </div>

              <button
                onClick={handlePickFromGallery}
                className={cn(
                  'w-full rounded-xl py-3 text-sm font-semibold',
                  'bg-memoir-500 text-white hover:bg-memoir-600 active:scale-[0.98]',
                  'shadow-md shadow-memoir-500/20 transition-all',
                )}
              >
                Chọn ảnh
              </button>
            </div>
          </>
        )}

        {/* ── Step 2: Preview + caption ─────────────────── */}
        {step === 'preview' && (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-gray-100">
              <button
                onClick={handleBack}
                disabled={isLoading}
                className="rounded-full p-1.5 hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div className="flex-1">
                <h2 className="text-sm font-bold text-gray-900">Tạo bài viết</h2>
                <p className="text-[11px] text-gray-400">đến {circleName}</p>
              </div>
              <button
                onClick={handleSubmit}
                disabled={isLoading || !selectedFile}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all',
                  isLoading || !selectedFile
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-memoir-500 text-white hover:bg-memoir-600 active:scale-95',
                )}
              >
                {isLoading ? (
                  <><Spinner size="sm" /> Đang đăng...</>
                ) : (
                  <><Send className="h-3.5 w-3.5" /> Đăng</>
                )}
              </button>
            </div>

            {/* Image preview */}
            {previewUrl && (
              <div className="relative bg-gray-100 max-h-64 overflow-hidden">
                <img
                  src={previewUrl}
                  alt="Kỷ niệm"
                  className="w-full object-contain max-h-64 mx-auto"
                />
                {isLoading && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <Spinner size="md" className="text-white" />
                  </div>
                )}
              </div>
            )}

            {/* Caption */}
            <div className="px-4 py-3">
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Viết chú thích cho kỷ niệm này..."
                rows={2}
                maxLength={500}
                className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-memoir-400 transition-all"
                style={{ minHeight: '60px', maxHeight: '120px' }}
              />
            </div>

            {/* Link visibility toggle (only if circle is link_shared) */}
            {isLinkShared && (
              <div className="mx-4 mb-3 flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs font-semibold text-gray-700">Hiển thị với link</p>
                    <p className="text-[10px] text-gray-400">Người có link cũng xem được</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsVisibleLink((v) => !v)}
                  className={cn(
                    'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full transition-colors',
                    isVisibleLink ? 'bg-memoir-500' : 'bg-gray-200',
                  )}
                  role="switch"
                  aria-checked={isVisibleLink}
                >
                  <span
                    className={cn(
                      'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform',
                      isVisibleLink ? 'translate-x-4' : 'translate-x-0.5',
                    )}
                    style={{ marginTop: '2px' }}
                  />
                </button>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mx-4 mb-3 rounded-xl bg-red-50 border border-red-100 px-3 py-2">
                <p className="text-xs text-red-500">{error}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
