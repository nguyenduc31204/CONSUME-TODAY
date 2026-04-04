/**
 * CoverUploadSheet — Modal to upload a cover image for a Circle.
 * Used inside CircleSettings.
 */

import { useRef, useState } from 'react'
import { X, Image } from 'lucide-react'
import { cn } from '@/utils/cn'
import { imagesApi } from '@/api/images'
import { Spinner } from '@/components/ui/Spinner'
import { compressImage } from '@/utils/imageCompression'

interface CoverUploadSheetProps {
  circleName: string
  currentCoverUrl: string | null
  onClose: () => void
  onUploaded: (url: string) => void
}

export function CoverUploadSheet({
  circleName,
  currentCoverUrl,
  onClose,
  onUploaded,
}: CoverUploadSheetProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentCoverUrl)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setSelectedFile(file)
    setPreviewUrl(url)
    setError(null)
  }

  const handleRemoveCover = () => {
    if (previewUrl && !currentCoverUrl) URL.revokeObjectURL(previewUrl)
    setSelectedFile(null)
    setPreviewUrl(null)
    onUploaded('')
    onClose()
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      // Nothing selected — just close
      onClose()
      return
    }
    setIsUploading(true)
    setError(null)
    try {
      let fileToUpload = selectedFile
      try {
        fileToUpload = await compressImage(selectedFile)
      } catch { /* use original */ }

      const res = await imagesApi.upload(fileToUpload)
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Tải ảnh lên thất bại')
      }
      if (previewUrl && previewUrl !== currentCoverUrl) URL.revokeObjectURL(previewUrl)
      onUploaded(res.data.url)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tải ảnh thất bại')
      setIsUploading(false)
    }
  }

  const hasChange = selectedFile !== null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !isUploading) onClose() }}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300 overflow-hidden">

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

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Ảnh bìa nhóm</h2>
            <p className="text-xs text-gray-400 mt-0.5">{circleName}</p>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="rounded-full p-1.5 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Preview */}
          <div
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={cn(
              'relative h-32 w-full rounded-xl overflow-hidden cursor-pointer',
              'border-2 border-dashed transition-all',
              previewUrl
                ? 'border-gray-200'
                : 'border-gray-200 hover:border-memoir-300 hover:bg-memoir-50/30',
            )}
          >
            {previewUrl ? (
              <>
                <img
                  src={previewUrl}
                  alt="Ảnh bìa"
                  className="h-full w-full object-cover"
                />
                {isUploading && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <Spinner size="md" className="text-white" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute bottom-2 left-2">
                  <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                    Ảnh bìa
                  </span>
                </div>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2">
                <Image className="h-8 w-8 text-gray-300" />
                <p className="text-xs text-gray-400">Nhấn để chọn ảnh</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={isUploading}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className={cn(
                'flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all',
                hasChange
                  ? 'bg-memoir-500 text-white hover:bg-memoir-600 active:scale-[0.98]'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed',
                isUploading && 'opacity-60 cursor-not-allowed',
              )}
            >
              {isUploading ? <><Spinner size="sm" /> Đang tải...</> : 'Lưu ảnh bìa'}
            </button>
          </div>

          {/* Remove cover (only if there is one) */}
          {previewUrl && !isUploading && (
            <button
              onClick={handleRemoveCover}
              className="w-full rounded-xl border border-red-100 py-2 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
            >
              Xóa ảnh bìa
            </button>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-100 px-3 py-2">
              <p className="text-xs text-red-500">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
