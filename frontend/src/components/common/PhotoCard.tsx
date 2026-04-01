import type { Transaction } from '@/types/transaction'
import { formatVND, formatRelativeTime } from '@/utils/formatters'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { cn } from '@/utils/cn'

interface PhotoCardProps {
  transaction: Transaction
  onClick?: () => void
  showOverlay?: boolean
  className?: string
}

export function PhotoCard({ transaction, onClick, showOverlay = true, className }: PhotoCardProps) {
  const isLifeLog = transaction.is_life_log
  const hasImage = !!transaction.image_url

  return (
    <Card
      padding="none"
      className={cn(
        'overflow-hidden cursor-pointer transition-transform active:scale-[0.98]',
        'hover:shadow-md',
        className,
      )}
      onClick={onClick}
    >
      {/* Image */}
      {hasImage ? (
        <div className="relative aspect-[4/3] bg-gray-100">
          <img
            src={transaction.image_url!}
            alt={transaction.merchant_name || 'Kỷ niệm'}
            className="h-full w-full object-cover"
            loading="lazy"
          />

          {/* Amount overlay (semi-transparent) */}
          {showOverlay && !isLifeLog && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3">
              <p className="text-white font-bold text-lg">{formatVND(transaction.amount)}</p>
            </div>
          )}

          {/* Life log badge */}
          {isLifeLog && (
            <div className="absolute top-3 right-3">
              <Badge variant="life-log" size="sm">Life Log</Badge>
            </div>
          )}
        </div>
      ) : (
        <div className="aspect-[4/3] bg-memoir-50 flex items-center justify-center">
          <span className="text-5xl">
            {isLifeLog ? '📷' : '💳'}
          </span>
        </div>
      )}

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">
              {transaction.merchant_name || (isLifeLog ? 'Kỷ niệm' : 'Giao dịch')}
            </h3>
            {transaction.note && (
              <p className="mt-0.5 text-sm text-gray-500 line-clamp-1">{transaction.note}</p>
            )}
          </div>

          {!isLifeLog && !hasImage && (
            <p className="font-bold text-gray-900">{formatVND(transaction.amount)}</p>
          )}
        </div>

        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {formatRelativeTime(transaction.created_at)}
          </span>
        </div>
      </div>
    </Card>
  )
}
