/**
 * CircleCard — Card trong danh sách Circles.
 * Shows: cover image, name, type icon, member count, post count.
 */

import { Link } from 'react-router-dom'
import { Users, Lock, Link2, Image } from 'lucide-react'
import { cn } from '@/utils/cn'
import { getProxyImageUrl } from '@/utils/imageUrl'
import type { CircleItem } from '@/api/circles'

// ── Type icons ───────────────────────────────────────────────

const TYPE_CONFIG = {
  private: { icon: Lock,   label: 'Riêng tư', color: 'text-gray-400' },
  family:  { icon: Users,  label: 'Gia đình', color: 'text-rose-400' },
  friends: { icon: Users,  label: 'Bạn bè',   color: 'text-blue-400' },
} as const

// ── CircleCard ───────────────────────────────────────────────

interface CircleCardProps {
  circle: CircleItem
}

export function CircleCard({ circle }: CircleCardProps) {
  const type = TYPE_CONFIG[circle.circle_type] ?? TYPE_CONFIG.private
  const TypeIcon = type.icon

  const coverUrl = circle.cover_image_url
    ? getProxyImageUrl(circle.cover_image_url)
    : null

  return (
    <Link
      to={`/circles/${circle.id}`}
      className={cn(
        'group block rounded-2xl border border-gray-100 bg-white overflow-hidden',
        'shadow-sm hover:shadow-md hover:border-gray-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-memoir-400',
        'transition-all duration-150',
      )}
    >
      {/* Cover image */}
      <div className="relative h-36 overflow-hidden bg-memoir-50">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={circle.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Users className="h-12 w-12 text-memoir-200" />
          </div>
        )}

        {/* Visibility badge */}
        <div className="absolute top-2 right-2">
          {circle.visibility === 'link_shared' ? (
            <span className="flex items-center gap-1 rounded-full bg-white/80 backdrop-blur-sm px-2 py-0.5 text-[10px] font-medium text-gray-600">
              <Link2 className="h-3 w-3" />
              Chia sẻ link
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-white/80 backdrop-blur-sm px-2 py-0.5 text-[10px] font-medium text-gray-600">
              <Lock className="h-3 w-3" />
              Riêng tư
            </span>
          )}
        </div>

        {/* Owner badge */}
        {circle.my_role === 'owner' && (
          <div className="absolute top-2 left-2">
            <span className="rounded-full bg-memoir-500/90 backdrop-blur-sm px-2 py-0.5 text-[10px] font-bold text-white">
              Chủ nhóm
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 truncate leading-snug">{circle.name}</h3>
            {circle.description && (
              <p className="mt-0.5 text-xs text-gray-400 line-clamp-1 leading-relaxed">
                {circle.description}
              </p>
            )}
          </div>
          <span className={cn('flex-shrink-0 p-1 rounded-lg bg-gray-50', type.color)}>
            <TypeIcon className="h-4 w-4" />
          </span>
        </div>

        {/* Stats */}
        <div className="mt-2.5 flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Users className="h-3 w-3" />
            {circle.member_count} thành viên
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Image className="h-3 w-3" />
            {circle.post_count} bài viết
          </span>
        </div>
      </div>
    </Link>
  )
}
