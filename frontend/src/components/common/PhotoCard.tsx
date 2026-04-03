import { useNavigate } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { formatVND, formatRelativeTime } from '@/utils/formatters'
import { getProxyImageUrl } from '@/utils/imageUrl'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import type { Transaction } from '@/types/transaction'

interface PhotoCardProps {
  transaction: Transaction
  /** Called when user taps the card, before navigation */
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
  const imageUrl = getProxyImageUrl(t.thumbnail_url ?? t.image_url)
  const isLifeLog = t.is_life_log || t.amount === 0

  const handleClick = () => {
    if (onClick) {
      onClick(t)
    } else {
      navigate(`/transactions/${t.id}`)
    }
  }

  // ── Compact grid cell ─────────────────────────────────────────
  if (compact) {
    return (
      <button
        onClick={handleClick}
        className={cn(
          'group relative aspect-square overflow-hidden rounded-xl bg-gray-100',
          'focus:outline-none focus:ring-2 focus:ring-memoir-300',
          'transition-transform active:scale-95',
          className,
        )}
      >
        {imageUrl ? (
          
          <img
            src={imageUrl}
            alt={t.merchant_name ?? 'Kỷ niệm'}
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

  // ── Full feed card (template design) ────────────────────────────
  return (
    <Card
      padding="none"
      className={cn(
        'overflow-hidden cursor-pointer transition-all active:scale-[0.99]',
        'hover:shadow-md focus:outline-none',
        className,
      )}
      onClick={handleClick}
    >
      {/* ── Image (3:4 portrait ratio) ─────────────────────────── */}
      <div className="relative aspect-[3/4] overflow-hidden bg-gray-100">
        {imageUrl ? (
          
          <img
            src={imageUrl}
            alt={t.merchant_name ?? 'Kỷ niệm'}
            className="h-full w-full object-cover transition-transform hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-memoir-50">
            <span className="text-5xl">{isLifeLog ? '📷' : '💳'}</span>
          </div>
        )}

        {/* Top-left: Life Log badge */}
        {isLifeLog && (
          <div className="absolute left-3 top-3">
            <Badge variant="life-log" size="sm">Life Log</Badge>
          </div>
        )}

        {/* Top-right: Pending badge */}
        {t.transaction_status === 'pending' && (
          <div className="absolute right-3 top-3">
            <Badge variant="warning" size="sm">Chờ xác nhận</Badge>
          </div>
        )}

        {/* Bottom gradient overlay: merchant name + amount */}
        {!isLifeLog && showOverlay && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-4 pt-12 pb-3">
            <p className="text-xl font-bold text-white truncate">
              {t.merchant_name || 'Giao dịch'}
            </p>
            <p className="text-2xl font-extrabold text-white mt-0.5">
              {formatVND(t.amount)}
            </p>
          </div>
        )}

        {/* Bottom gradient for life log */}
        {isLifeLog && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/40 to-transparent px-4 pt-8 pb-3">
            <p className="text-base font-semibold text-white truncate">
              {t.merchant_name || 'Kỷ niệm'}
            </p>
          </div>
        )}
      </div>

      {/* ── Card body ───────────────────────────────────────────── */}
      <div className="px-4 py-3 space-y-2">
        {/* Category + wallet row */}
        <div className="flex items-center gap-2 flex-wrap">
          {t.category_name && (
            <Badge variant="category" size="sm" color="#8B5CF6">
              {t.category_name}
            </Badge>
          )}
          {t.wallet_name && (
            <Badge variant="default" size="sm">
              {t.wallet_name}
            </Badge>
          )}
        </div>

        {/* Amount + time */}
        <div className="flex items-center justify-between">
          {!isLifeLog && (
            <p className="text-lg font-bold text-gray-900">{formatVND(t.amount)}</p>
          )}
          {isLifeLog && <div />}
          <p className="text-xs text-gray-400">{formatRelativeTime(t.created_at)}</p>
        </div>

        {/* Note (if any) */}
        {t.note && (
          <p className="text-xs text-gray-500 line-clamp-1">{t.note}</p>
        )}
      </div>
    </Card>
  )
}
