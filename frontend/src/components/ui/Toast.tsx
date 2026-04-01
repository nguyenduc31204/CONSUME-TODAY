import { createPortal } from 'react-dom'
import { CheckCircle2, AlertCircle, Info, XCircle, X } from 'lucide-react'
import { useUiStore, type Toast as ToastType } from '@/stores/uiStore'
import { cn } from '@/utils/cn'

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
}

const STYLES = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
}

function Toast({ toast }: { toast: ToastType }) {
  const removeToast = useUiStore((s) => s.removeToast)
  const Icon = ICONS[toast.type]

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg',
        'animate-in slide-in-from-right fade-in duration-300',
        STYLES[toast.type],
      )}
      role="alert"
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={() => removeToast(toast.id)}
        className="flex-shrink-0 rounded-full p-0.5 hover:bg-black/5 transition-colors"
        aria-label="Đóng"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

/** Toast container — renders toasts via portal */
export function ToastContainer() {
  const toasts = useUiStore((s) => s.toasts)

  if (toasts.length === 0) return null

  return createPortal(
    <div
      className="fixed bottom-24 right-4 z-50 flex flex-col gap-2 max-w-sm w-full"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>,
    document.body,
  )
}
