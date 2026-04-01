import { useNavigate } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { formatVND, formatRelativeTime } from '@/utils/formatters'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import type { Transaction } from '@/types/transaction'

interface PhotoCardProps {
  transaction: Transaction
  onClick?: (t: Transaction) => void
  /** Compact mode for journal grid view */
  compact?: boolean
  /** Show amount overlay on image */
  showOverlay?: boolean
  className?: string
}

export function PhotoCard({
  transaction: t,
  onClick,
  compact = false,
  showOverlay = true,
  className,
}: PhotoCardProps) {
  const navigate = useNavigate()

  const handleClick = () => {
    if (onClick) {
      onClick(t)
    } else {
      navigate(`/journal?highlight=${t.id}`)
    }
  }

  // Prefer thumbnail for performance, fallback to full image
  const imageUrl = t.thumbnail_url ?? t.image_url
  const isLifeLog = t.is_life_log || t.amount === 0

  if (compact) {
    // Compact: thumbnail grid cell with amount overlay
    return (
      <button
        onClick={handleClick}
        className={cn(
          'group relative aspect-square overflow-hidden rounded-lg bg-gray-100',
          'focus:outline-none focus:ring-2 focus:ring-memoir-300',
          'transition-transform active:scale-95',
          className,
        )}
      >
        {imageUrl ? (
          // eslint-disable-next-line jsx-a11y/img-redundant-alt
          <img
            src={imageUrl}
            alt={t.merchant_name ?? 'Ảnh kỷ niệm'}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-memoir-50">
            <span className="text-3xl">{isLifeLog ? '📷' : '💳'}</span>
          </div>
        )}

        {/* Amount overlay */}
        {showOverlay && !isLifeLog && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
            <span className="text-xs font-semibold text-white">
              {formatVND(t.amount)}
            </span>
          </div>
        )}

        {/* Life log indicator */}
        {isLifeLog && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/30 to-transparent px-2 py-1.5">
            <span className="text-[10px] font-medium text-white/80">Life Log</span>
          </div>
        )}
      </button>
    )
  }

  // Full card: image + details
  return (
    <Card
      padding="none"
      className={cn(
        'overflow-hidden cursor-pointer transition-all active:scale-[0.98]',
        'hover:shadow-md focus:outline-none',
        className,
      )}
      onClick={handleClick}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        {imageUrl ? (
          // eslint-disable-next-line jsx-a11y/img-redundant-alt
          <img
            src={imageUrl}
            alt={t.merchant_name ?? 'Ảnh kỷ niệm'}
            className="h-full w-full object-cover transition-transform hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-memoir-50">
            <span className="text-5xl">{isLifeLog ? '📷' : '💳'}</span>
          </div>
        )}

        {/* Life log badge */}
        {isLifeLog && (
          <div className="absolute left-3 top-3">
            <Badge variant="life-log" size="sm">Life Log</Badge>
          </div>
        )}

        {/* Pending badge */}
        {t.transaction_status === 'pending' && (
          <div className="absolute right-3 top-3">
            <Badge variant="warning" size="sm">Chờ xác nhận</Badge>
          </div>
        )}

        {/* Amount overlay */}
        {showOverlay && !isLifeLog && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3">
            <p className="text-lg font-bold text-white">{formatVND(t.amount)}</p>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-gray-900">
              {t.merchant_name || (isLifeLog ? 'Kỷ niệm' : 'Giao dịch')}
            </h3>
            {t.note && (
              <p className="mt-0.5 line-clamp-1 text-sm text-gray-500">{t.note}</p>
            )}
          </div>

          {!isLifeLog && !showOverlay && (
            <p className="flex-shrink-0 font-bold text-gray-900">{formatVND(t.amount)}</p>
          )}

          {isLifeLog && (
            <p className="flex-shrink-0 text-sm text-gray-400">{formatRelativeTime(t.created_at)}</p>
          )}
        </div>

        {/* Bottom row */}
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-gray-400">{formatRelativeTime(t.created_at)}</span>
          {t.ocr_confidence > 0 && !isLifeLog && (
            <span className="text-[10px] text-gray-400">AI {Math.round(t.ocr_confidence * 100)}%</span>
          )}
        </div>
      </div>
    </Card>
  )
}
