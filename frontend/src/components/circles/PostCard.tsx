/**
 * PostCard — Grid card for a Circle post (photo with caption).
 */

import { Heart, MessageCircle, Image } from 'lucide-react'
import { cn } from '@/utils/cn'
import { getProxyImageUrl } from '@/utils/imageUrl'
import type { PostItem } from '@/api/circles'

interface PostCardProps {
  post: PostItem
  onClick: () => void
}

export function PostCard({ post, onClick }: PostCardProps) {
  const imageUrl = post.thumbnail_url
    ? getProxyImageUrl(post.thumbnail_url)
    : post.image_url
    ? getProxyImageUrl(post.image_url)
    : null

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative block w-full aspect-square overflow-hidden rounded-2xl',
        'bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-memoir-400',
        'active:scale-[0.98] transition-transform duration-100',
      )}
    >
      {/* Image */}
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={post.caption ?? 'Kỷ niệm'}
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-memoir-50">
          <Image className="h-10 w-10 text-memoir-200" />
        </div>
      )}

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

      {/* Bottom stats */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-2.5 pb-2.5">
        {/* Like count */}
        <div className="flex items-center gap-1">
          <Heart
            className={cn(
              'h-3.5 w-3.5',
              post.is_liked ? 'fill-red-500 text-red-500' : 'text-white/90',
            )}
          />
          <span className="text-[11px] font-semibold text-white/90">
            {post.like_count > 0 ? post.like_count : ''}
          </span>
        </div>

        {/* Comment count */}
        {post.comment_count > 0 && (
          <div className="flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5 text-white/90" />
            <span className="text-[11px] font-semibold text-white/90">
              {post.comment_count}
            </span>
          </div>
        )}
      </div>
    </button>
  )
}
