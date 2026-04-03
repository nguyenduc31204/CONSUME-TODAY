import { useNavigate } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { formatVND } from '@/utils/formatters'
import { getProxyImageUrl } from '@/utils/imageUrl'
import type { Transaction } from '@/types/transaction'

interface HomeCardProps {
  transaction: Transaction
  onClick?: (t: Transaction) => void
  className?: string
}

// ── Helpers ────────────────────────────────────────────────────

function getCategoryIcon(name: string | null | undefined) {
  if (!name) return '📌'
  const lower = (name || '').toLowerCase()
  if (lower.includes('ăn') || lower.includes('uống') || lower.includes('cà phê')) return '🍜'
  if (lower.includes('mua') || lower.includes('shop')) return '🛍️'
  if (lower.includes('di chuyển') || lower.includes('xe') || lower.includes('ô tô')) return '🚗'
  if (lower.includes('giải trí') || lower.includes('phim')) return '🎬'
  if (lower.includes('hóa đơn') || lower.includes('tiện ích')) return '🏠'
  if (lower.includes('sức khỏe') || lower.includes('thuốc')) return '💊'
  return '📌'
}

export function HomeCard({ transaction: t, onClick, className }: HomeCardProps) {
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

  // Amount string: "75.000đ" → "75.000" for display
  const amountNumber = formatVND(t.amount).replace('đ', '').trim()

  return (
    <button
      onClick={handleClick}
      className={cn(
        'relative w-full overflow-hidden rounded-2xl bg-gray-200',
        'focus:outline-none focus:ring-2 focus:ring-memoir-400',
        'active:scale-[0.99] transition-transform',
        className,
      )}
      style={{ aspectRatio: '1' }}
    >
      {/* Full-bleed image */}
      {imageUrl ? (
        
        <img
          src={imageUrl}
          alt={t.merchant_name ?? 'Kỷ niệm'}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-memoir-100">
          <span className="text-6xl">{isLifeLog ? '📷' : '💳'}</span>
        </div>
      )}

      {/* ── Top: Tags Row ──────────────────────────────────── */}
      <div className="absolute top-3 inset-x-0 flex justify-center pointer-events-none">
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {/* Category tag */}
          {t.category_name && (
            <div
              className={cn(
                'flex items-center gap-1 rounded-full px-2.5 py-1',
                'text-white text-[10px] font-semibold leading-none',
              )}
              style={{ background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(10px)' }}
            >
              <span className="text-[11px] leading-none">{getCategoryIcon(t.category_name)}</span>
              <span className="whitespace-nowrap leading-none">{t.category_name}</span>
            </div>
          )}

          {/* Wallet tag */}
          {t.wallet_name && (
            <div
              className="flex items-center gap-1 rounded-full px-2.5 py-1 text-white text-[10px] font-semibold whitespace-nowrap leading-none"
              style={{ background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(10px)' }}
            >
              <span className="text-[11px] leading-none">💰</span>
              <span className="leading-none">{t.wallet_name}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom: Amount Footer ─────────────────────────── */}
      {!isLifeLog ? (
        <div className="absolute bottom-3 left-3 right-3">
          <div
            className="rounded-2xl px-4 py-2.5 mx-auto text-center"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
          >
            {/* Amount row */}
            <div className="flex items-baseline justify-center gap-0.5">
              <span className={cn(
                'text-xl font-bold leading-none',
                t.is_income ? 'text-emerald-400' : 'text-red-400',
              )}>
                {t.is_income ? '+' : '−'}
              </span>
              <span className="text-white text-[22px] font-bold leading-none">
                {amountNumber}
              </span>
              <span className="text-white text-base font-semibold leading-none">đ</span>
            </div>
            {/* Note */}
            {t.note && (
              <p className="text-[10px] text-white/80 leading-tight mt-0.5 max-w-full truncate">
                {t.note}
              </p>
            )}
          </div>
        </div>
      ) : (
        /* Life Log indicator */
        <div className="absolute bottom-3 left-3">
          <div
            className="rounded-full px-2.5 py-1 text-white text-[10px] font-semibold"
            style={{ background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(10px)' }}
          >
            Life Log
          </div>
        </div>
      )}
    </button>
  )
}
