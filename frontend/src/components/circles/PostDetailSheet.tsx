/**
 * PostDetailSheet — Full-screen overlay showing a post with comments + like.
 */

import { useState } from 'react'
import { Heart, MessageCircle, Send, MoreHorizontal, Trash2, ChevronLeft } from 'lucide-react'
import { cn } from '@/utils/cn'
import { getProxyImageUrl } from '@/utils/imageUrl'
import { formatRelativeTime } from '@/utils/formatters'
import { useComments, useAddComment, useDeleteComment, useToggleLike } from '@/hooks/useCircles'
import type { PostItem } from '@/api/circles'
import { useAuthStore } from '@/stores/authStore'

// ── Avatar ─────────────────────────────────────────────────────

function Avatar({ name, url, size = 'sm' }: { name: string; url: string | null; size?: 'sm' | 'md' }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const sz = size === 'sm' ? 'h-7 w-7 text-[11px]' : 'h-9 w-9 text-sm'
  return url ? (
    <img src={getProxyImageUrl(url)} alt={name} className={cn('rounded-full object-cover', sz)} />
  ) : (
    <div className={cn('flex items-center justify-center rounded-full bg-memoir-100 font-semibold text-memoir-600', sz)}>
      {initials}
    </div>
  )
}

// ── CommentItem ────────────────────────────────────────────────

interface CommentItemData {
  id: string
  author_name: string
  author_avatar: string | null
  content: string
  created_at: string
  author_id: string
}

function CommentItem({
  comment,
  onDelete,
  isDeleting,
  canDelete,
}: {
  comment: CommentItemData
  onDelete: (id: string) => void
  isDeleting: boolean
  canDelete: boolean
}) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div className="flex gap-2.5 py-2.5">
      <Avatar name={comment.author_name} url={comment.author_avatar} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-700">{comment.author_name}</p>
            <p className="mt-0.5 text-sm text-gray-800 leading-relaxed break-words">{comment.content}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-[10px] text-gray-400">{formatRelativeTime(comment.created_at)}</span>
            {canDelete && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu((v) => !v)}
                  className="rounded p-1 hover:bg-gray-100 transition-colors"
                >
                  <MoreHorizontal className="h-3 w-3 text-gray-400" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-6 z-20 w-36 rounded-xl bg-white shadow-lg border border-gray-100 py-1">
                    <button
                      onClick={() => { onDelete(comment.id); setShowMenu(false) }}
                      disabled={isDeleting}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Xóa bình luận
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── PostDetailSheet ────────────────────────────────────────────

interface PostDetailSheetProps {
  post: PostItem
  circleId: string
  myRole: string | null
  onClose: () => void
  onDelete?: () => void
}

export function PostDetailSheet({ post, circleId, myRole, onClose, onDelete }: PostDetailSheetProps) {
  const [commentText, setCommentText] = useState('')
  const [isLikeLoading, setIsLikeLoading] = useState(false)

  // ── Optimistic like state ─────────────────────────────────────
  const [optimisticLiked, setOptimisticLiked] = useState<boolean | null>(null)
  const [optimisticCount, setOptimisticCount] = useState<number | null>(null)

  const isCurrentlyLiked = optimisticLiked ?? post.is_liked
  const currentCount = optimisticCount ?? post.like_count

  const { data: commentsData, refetch: refetchComments } = useComments(circleId, post.id)
  const addComment = useAddComment()
  const deleteComment = useDeleteComment()
  const toggleLike = useToggleLike()

  const comments = commentsData?.items ?? []
  const currentUserId = useAuthStore((s) => s.user?.id)

  const imageUrl = getProxyImageUrl(post.image_url)

  const handleLike = async () => {
    if (isLikeLoading) return
    setIsLikeLoading(true)

    // Optimistic update: flip immediately
    const wasLiked = isCurrentlyLiked
    setOptimisticLiked(!wasLiked)
    setOptimisticCount((c) => (c ?? post.like_count) + (wasLiked ? -1 : 1))

    try {
      const result = await toggleLike.mutateAsync({ circleId, postId: post.id })
      // Sync with server response
      if (result) {
        setOptimisticLiked(result.liked)
        setOptimisticCount(result.like_count)
      }
    } catch {
      // Revert on failure
      setOptimisticLiked(wasLiked)
      setOptimisticCount(post.like_count)
    } finally {
      setIsLikeLoading(false)
    }
  }

  const handleComment = async () => {
    if (!commentText.trim()) return
    await addComment.mutateAsync({ circleId, postId: post.id, data: { content: commentText.trim() } })
    setCommentText('')
    refetchComments()
  }

  const handleDeleteComment = async (commentId: string) => {
    await deleteComment.mutateAsync({ circleId, postId: post.id, commentId })
    refetchComments()
  }

  const canDeletePost = myRole === 'owner' || post.author_id === currentUserId

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-white"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <button
          onClick={onClose}
          className="rounded-full p-1.5 hover:bg-gray-100 transition-colors"
          aria-label="Đóng"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-800">Kỷ niệm</p>
          <p className="text-[11px] text-gray-400">{formatRelativeTime(post.created_at)}</p>
        </div>
        {canDeletePost && onDelete && (
          <button
            onClick={onDelete}
            className="rounded-full p-1.5 hover:bg-red-50 transition-colors"
            aria-label="Xóa bài viết"
          >
            <Trash2 className="h-4 w-4 text-red-400" />
          </button>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Image */}
        <div className="relative bg-gray-100">
          <img
            src={imageUrl}
            alt={post.caption ?? 'Kỷ niệm'}
            className="w-full max-h-[55vh] object-contain mx-auto"
          />
        </div>

        {/* Caption */}
        {post.caption && (
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm text-gray-800 leading-relaxed">{post.caption}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-100">
          <button
            onClick={handleLike}
            disabled={isLikeLoading}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 hover:bg-gray-50 transition-colors"
          >
            <Heart
              className={cn(
                'h-5 w-5 transition-all',
                isCurrentlyLiked ? 'fill-red-500 text-red-500 scale-110' : 'text-gray-500 hover:text-red-400',
              )}
            />
            <span className={cn('text-sm font-medium', isCurrentlyLiked ? 'text-red-500' : 'text-gray-500')}>
              {currentCount > 0 ? currentCount : 'Thích'}
            </span>
          </button>

          <button className="flex items-center gap-1.5 rounded-full px-3 py-1.5 hover:bg-gray-50 transition-colors">
            <MessageCircle className="h-5 w-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-500">
              {comments.length > 0 ? comments.length : 'Bình luận'}
            </span>
          </button>
        </div>

        {/* Author */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100">
          <Avatar name={post.author_name} url={post.author_avatar} size="md" />
          <div>
            <p className="text-sm font-semibold text-gray-800">{post.author_name}</p>
            <p className="text-[11px] text-gray-400">Tác giả</p>
          </div>
        </div>

        {/* Comments */}
        <div className="px-4 py-1">
          {comments.length === 0 ? (
            <p className="py-4 text-center text-xs text-gray-400">Chưa có bình luận nào</p>
          ) : (
            comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onDelete={handleDeleteComment}
                isDeleting={deleteComment.isPending}
                canDelete={comment.author_id === currentUserId || myRole === 'owner'}
              />
            ))
          )}
        </div>
      </div>

      {/* Comment input */}
      <div className="flex-shrink-0 border-t border-gray-100 px-4 py-3 bg-white">
        <div className="flex items-end gap-2.5">
          <div className="flex-1">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleComment()
                }
              }}
              placeholder="Viết bình luận..."
              rows={1}
              className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-memoir-400 focus:border-transparent transition-all"
              style={{ minHeight: '40px', maxHeight: '120px' }}
            />
          </div>
          <button
            onClick={handleComment}
            disabled={!commentText.trim() || addComment.isPending}
            className={cn(
              'flex-shrink-0 rounded-xl p-2.5 transition-all',
              commentText.trim()
                ? 'bg-memoir-500 text-white hover:bg-memoir-600 active:scale-95'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed',
            )}
            aria-label="Gửi bình luận"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
