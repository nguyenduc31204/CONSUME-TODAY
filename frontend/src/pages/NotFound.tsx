import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Home } from 'lucide-react'

/**
 * 404 — Not Found page
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="mb-8 text-8xl">📸</div>
      <h1 className="mb-2 text-3xl font-bold text-gray-900">404</h1>
      <p className="mb-8 text-gray-500">Trang bạn tìm không tồn tại</p>
      <Link to="/home">
        <Button variant="primary" size="lg">
          <Home className="h-5 w-5" />
          Về trang chủ
        </Button>
      </Link>
    </div>
  )
}
