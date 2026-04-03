import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Check, X } from 'lucide-react'
import { useUiStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { usersApi } from '@/api/users'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/utils/cn'

/**
 * EditProfile — "Chỉnh sửa hồ sơ" Screen
 * Allows the user to change their display name and avatar.
 * Avatar is uploaded directly to R2 (cropped to square, 256x256 JPEG).
 */
export default function EditProfile() {
  const navigate = useNavigate()
  const addToast = useUiStore((s) => s.addToast)
  const setUser = useAuthStore((s) => s.setUser)
  const currentUser = useAuthStore((s) => s.user)

  const [name, setName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('') // R2 URL
  const [isSavingName, setIsSavingName] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [nameError, setNameError] = useState('')
  const [avatarError, setAvatarError] = useState('')
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // Load current profile on mount
  useEffect(() => {
    usersApi.getMyProfile().then((res) => {
      setIsFetching(false)
      if (res.success && res.data) {
        setName(res.data.name)
        setAvatarUrl(res.data.avatar_url ?? '')
      } else if (currentUser) {
        setName(currentUser.name)
        setAvatarUrl(currentUser.avatar ?? '')
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleAvatarClick() {
    avatarInputRef.current?.click()
  }

  async function handleAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate client-side
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowed.includes(file.type)) {
      setAvatarError('Chỉ hỗ trợ ảnh: JPEG, PNG, GIF, WebP')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Ảnh quá lớn (tối đa 5MB)')
      return
    }
    setAvatarError('')

    setIsUploadingAvatar(true)
    const res = await usersApi.uploadAvatar(file)
    setIsUploadingAvatar(false)

    // Reset file input so same file can be re-selected
    if (avatarInputRef.current) avatarInputRef.current.value = ''

    if (!res.success || !res.data) {
      addToast(res.message || 'Không thể tải ảnh lên', 'error')
      return
    }

    // Use the R2 URL from backend
    setAvatarUrl(res.data.avatar_url ?? '')

    // Sync into auth store immediately
    setUser({
      id: res.data.id,
      email: res.data.email,
      name: res.data.name,
      avatar: res.data.avatar_url ?? undefined,
      created_at: res.data.created_at,
    })

    addToast('Ảnh đại diện đã được cập nhật', 'success')
  }

  async function handleSave() {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setNameError('Tên không được để trống')
      return
    }
    if (trimmedName.length > 255) {
      setNameError('Tên quá dài (tối đa 255 ký tự)')
      return
    }
    setNameError('')
    setIsSavingName(true)

    const res = await usersApi.updateMyProfile({ name: trimmedName, avatar_url: avatarUrl || null })

    setIsSavingName(false)

    if (!res.success || !res.data) {
      addToast(res.message || 'Không thể cập nhật hồ sơ', 'error')
      return
    }

    setUser({
      id: res.data.id,
      email: res.data.email,
      name: res.data.name,
      avatar: res.data.avatar_url ?? undefined,
      created_at: res.data.created_at,
    })

    addToast('Hồ sơ đã được cập nhật', 'success')
    navigate(-1)
  }

  const hasChanges =
    name.trim() !== (currentUser?.name ?? '') ||
    avatarUrl !== (currentUser?.avatar ?? '')

  const isSaving = isSavingName || isUploadingAvatar

  if (isFetching) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-cream">
        <Spinner size="lg" />
        <p className="mt-4 text-sm text-gray-500">Đang tải hồ sơ...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-cream border-b border-gray-100 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
              aria-label="Quay lại"
            >
              <X className="h-5 w-5 text-gray-700" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Chỉnh sửa hồ sơ</h1>
          </div>
          <Button
            size="sm"
            variant="primary"
            isLoading={isSaving}
            disabled={isSaving || !hasChanges}
            onClick={handleSave}
            className="gap-1.5"
          >
            <Check className="h-4 w-4" />
            Lưu
          </Button>
        </div>
      </div>

      <div className="px-4 py-6 space-y-8">
        {/* Avatar Section */}
        <section className="flex flex-col items-center gap-4">
          {/* Avatar preview */}
          <div className="relative">
            <div className="h-24 w-24 rounded-full bg-memoir-100 overflow-hidden ring-4 ring-white shadow-md">
              {isUploadingAvatar ? (
                <div className="h-full w-full flex items-center justify-center bg-memoir-50">
                  <Spinner size="md" />
                </div>
              ) : avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                  onError={() => setAvatarUrl('')}
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <span className="text-4xl font-bold text-memoir-400">
                    {name?.[0]?.toUpperCase() || '?'}
                  </span>
                </div>
              )}
            </div>

            {/* Camera overlay on hover */}
            <button
              onClick={handleAvatarClick}
              disabled={isUploadingAvatar}
              className={cn(
                'absolute inset-0 rounded-full flex items-center justify-center',
                'bg-black/40 opacity-0 group-hover:opacity-100',
                'hover:opacity-100 transition-opacity cursor-pointer',
                isUploadingAvatar && 'opacity-100 cursor-not-allowed',
              )}
              aria-label="Đổi ảnh đại diện"
            >
              <Camera className="h-7 w-7 text-white" />
            </button>
          </div>

          {/* Hidden file input */}
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={handleAvatarFileChange}
          />

          {avatarError ? (
            <p className="text-xs text-red-500 text-center">{avatarError}</p>
          ) : (
            <p className="text-xs text-gray-400 text-center">
              Nhấn vào ảnh để đổi avatar<br />
              (JPEG, PNG, GIF, WebP — tối đa 5MB)
            </p>
          )}
        </section>

        {/* Name input */}
        <section>
          <label className="block mb-2 text-sm font-medium text-gray-700">
            Tên hiển thị <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (nameError) setNameError('')
            }}
            maxLength={255}
            placeholder="Nhập tên của bạn"
            className={cn(
              'w-full rounded-xl border bg-white px-4 py-3 text-sm',
              'text-gray-900 placeholder-gray-400',
              'focus:outline-none focus:ring-2 focus:ring-memoir-500 focus:border-transparent',
              'transition-shadow',
              nameError ? 'border-red-400 ring-1 ring-red-300' : 'border-gray-200',
            )}
          />
          {nameError && (
            <p className="mt-1.5 text-xs text-red-500">{nameError}</p>
          )}
          <p className="mt-1 text-xs text-gray-400">
            {name.length}/255 ký tự
          </p>
        </section>

        {/* Email (read-only) */}
        <section>
          <label className="block mb-2 text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            value={currentUser?.email ?? ''}
            readOnly
            disabled
            className={cn(
              'w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm',
              'text-gray-400 cursor-not-allowed',
            )}
          />
          <p className="mt-1 text-xs text-gray-400">
            Email không thể thay đổi
          </p>
        </section>

        {/* Divider */}
        <div className="border-t border-gray-100" />

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => navigate(-1)}
          >
            Hủy
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            isLoading={isSaving}
            disabled={isSaving || !hasChanges}
            onClick={handleSave}
          >
            Lưu thay đổi
          </Button>
        </div>
      </div>
    </div>
  )
}
