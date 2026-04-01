import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { Camera } from 'lucide-react'

/**
 * Home — "Hôm Nay" Feed Screen
 *
 * MVP placeholder: Shows greeting + empty state.
 * Phase 4: Vertical photo feed with photo cards.
 */
export default function Home() {
  const user = useAuthStore((s) => s.user)

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Chào buổi sáng'
    if (hour < 18) return 'Chào buổi chiều'
    return 'Chào buổi tối'
  }

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {user ? `${greeting()}, ${user.name.split(' ')[0]} 👋` : 'Hôm nay'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {new Date().toLocaleDateString('vi-VN', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </p>
      </div>

      {/* Empty State — Phase 4: Replace with photo feed */}
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-memoir-50">
          <Camera className="h-12 w-12 text-memoir-300" />
        </div>

        <h2 className="mb-2 text-lg font-semibold text-gray-900">Chưa có kỷ niệm nào hôm nay</h2>
        <p className="mb-8 max-w-xs text-sm text-gray-500">
          Bấm nút 📸 để chụp ảnh đầu tiên. AI sẽ tự động ghi nhận chi tiêu cho bạn!
        </p>

        <Button
          variant="primary"
          size="lg"
          onClick={() => {
            document.querySelector<HTMLButtonElement>('[aria-label="Chụp ảnh"]')?.click()
          }}
        >
          <Camera className="h-5 w-5" />
          Chụp ảnh ngay
        </Button>
      </div>

      {/* Placeholder cards — Phase 4 */}
      <div className="mt-4 space-y-4">
        {/* TODO Phase 4: Replace with actual photo feed */}
        {/* <PhotoCard transaction={...} onClick={...} /> */}
      </div>
    </div>
  )
}
