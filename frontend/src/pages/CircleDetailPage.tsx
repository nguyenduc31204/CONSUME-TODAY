/**
 * CircleDetailPage — Feed, members, and settings for a single Circle.
 * Route: /circles/:id
 */

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ChevronLeft, Users, Settings, Share2, Plus,
  LayoutGrid, LogOut, Image, Camera,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useCircle, useCirclePosts, useRemoveMember, useLeaveCircle, useInviteMember } from '@/hooks/useCircles'
import { PostCard } from '@/components/circles/PostCard'
import { PostDetailSheet } from '@/components/circles/PostDetailSheet'
import { MemberList } from '@/components/circles/MemberList'
import { InviteSheet } from '@/components/circles/InviteSheet'
import { CircleSettings } from '@/components/circles/CircleSettings'
import { CircleUploadSheet } from '@/components/circles/CircleUploadSheet'
import type { PostItem } from '@/api/circles'

// ── Tab types ──────────────────────────────────────────────────

type Tab = 'feed' | 'members'

// ── PostGrid ──────────────────────────────────────────────────

function PostGridSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-1">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="aspect-square bg-gray-200 animate-pulse rounded-sm" />
      ))}
    </div>
  )
}

// ── PostGrid ──────────────────────────────────────────────────

interface PostGridProps {
  posts: PostItem[]
  isLoading: boolean
  onPostClick: (post: PostItem) => void
}

function PostGrid({ posts, isLoading, onPostClick }: PostGridProps) {
  if (isLoading) return <PostGridSkeleton />

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <Image className="h-8 w-8 text-gray-300" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-600">Chưa có kỷ niệm nào</p>
          <p className="mt-1 text-xs text-gray-400">Chia sẻ kỷ niệm đầu tiên với nhóm</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-0.5 bg-gray-100">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} onClick={() => onPostClick(post)} />
      ))}
    </div>
  )
}

// ── CircleDetailPage ───────────────────────────────────────────

export default function CircleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('feed')
  const [selectedPost, setSelectedPost] = useState<PostItem | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [inviteData, setInviteData] = useState<{ invite_code: string; share_url: string } | null>(null)

  const { data: circleData, isLoading, refetch } = useCircle(id!)
  const { data: postsData, isLoading: postsLoading, refetch: refetchPosts } = useCirclePosts(id!)
  const removeMember = useRemoveMember()
  const leaveCircle = useLeaveCircle()
  const inviteMember = useInviteMember()

  const circle = circleData?.circle
  const members = circleData?.members ?? []
  const posts = postsData?.items ?? []

  // Invite handler
  const handleInvite = async () => {
    if (!circle) return
    const data = await inviteMember.mutateAsync(id!)
    setInviteData(data)
    setShowInvite(true)
  }

  // Remove member
  const handleRemoveMember = async (userId: string) => {
    await removeMember.mutateAsync({ circleId: id!, userId })
    refetch()
  }

  // Leave circle
  const handleLeave = async () => {
    if (!confirm('Bạn có chắc muốn rời nhóm này?')) return
    await leaveCircle.mutateAsync(id!)
    navigate('/circles', { replace: true })
  }

  // Post deleted from detail sheet
  const handlePostDeleted = () => {
    setSelectedPost(null)
    refetchPosts()
  }

  // Photo posted to circle
  const handlePosted = () => {
    setShowUpload(false)
    refetchPosts()
    refetch()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-memoir-300 border-t-memoir-500 animate-spin" />
          <p className="text-sm text-gray-400">Đang tải...</p>
        </div>
      </div>
    )
  }

  if (!circle) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">Không tìm thấy nhóm</p>
        <button onClick={() => navigate('/circles')} className="text-sm text-memoir-500 font-medium">
          Quay lại
        </button>
      </div>
    )
  }

  const isOwner = circle.my_role === 'owner'

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100">
        {/* Cover + Back */}
        <div className="relative h-32 bg-memoir-50 overflow-hidden">
          {circle.cover_image_url && (
            <img
              src={circle.cover_image_url}
              alt={circle.name}
              className="h-full w-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent" />

          {/* Back button */}
          <button
            onClick={() => navigate('/circles')}
            className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-md hover:bg-white transition-colors"
            aria-label="Quay lại"
          >
            <ChevronLeft className="h-5 w-5 text-gray-700" />
          </button>

          {/* Header actions: Camera (add memory) + Settings (owner) + Share (non-owner) */}
          <div className="absolute right-3 top-3 flex items-center gap-2">
            {/* Add photo */}
            <button
              onClick={() => setShowUpload(true)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-md hover:bg-white transition-colors"
              aria-label="Thêm kỷ niệm"
            >
              <Camera className="h-4 w-4 text-memoir-600" />
            </button>

            {/* Settings (owner) / Invite (member) */}
            {isOwner ? (
              <button
                onClick={() => setShowSettings(true)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-md hover:bg-white transition-colors"
                aria-label="Cài đặt"
              >
                <Settings className="h-4 w-4 text-gray-700" />
              </button>
            ) : (
              <button
                onClick={handleInvite}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-md hover:bg-white transition-colors"
                aria-label="Mời thành viên"
              >
                <Share2 className="h-4 w-4 text-gray-700" />
              </button>
            )}
          </div>
        </div>

        {/* Circle info */}
        <div className="px-4 pb-3">
          <div className="flex items-start justify-between gap-2 -mt-8">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900 truncate leading-tight">{circle.name}</h1>
              {circle.description && (
                <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">{circle.description}</p>
              )}
              <div className="mt-1 flex items-center gap-3">
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Users className="h-3.5 w-3.5" />
                  {circle.member_count} thành viên
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Image className="h-3.5 w-3.5" />
                  {circle.post_count} kỷ niệm
                </span>
              </div>
            </div>

            {/* Action buttons — Leave (non-owner only, since owner uses header icon) */}
            {!isOwner && (
              <button
                onClick={handleLeave}
                className="flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-500 hover:border-red-200 hover:text-red-500 transition-colors flex-shrink-0"
              >
                <LogOut className="h-3.5 w-3.5" />
                Rời nhóm
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-t border-gray-100">
          <button
            onClick={() => setTab('feed')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors border-b-2',
              tab === 'feed'
                ? 'border-memoir-500 text-memoir-600'
                : 'border-transparent text-gray-400 hover:text-gray-600',
            )}
          >
            <LayoutGrid className="h-4 w-4" />
            Kỷ niệm
          </button>
          <button
            onClick={() => setTab('members')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors border-b-2',
              tab === 'members'
                ? 'border-memoir-500 text-memoir-600'
                : 'border-transparent text-gray-400 hover:text-gray-600',
            )}
          >
            <Users className="h-4 w-4" />
            Thành viên
            <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">
              {members.length}
            </span>
          </button>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────── */}
      {tab === 'feed' ? (
        <div className="flex-1">
          <PostGrid
            posts={posts}
            isLoading={postsLoading}
            onPostClick={setSelectedPost}
          />
        </div>
      ) : (
        <div className="flex-1 bg-white">
          {/* Invite shortcut */}
          <div className="mx-4 mt-4 flex items-center justify-between rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-gray-700">Mời thêm thành viên</p>
              <p className="text-xs text-gray-400">Chia sẻ link để bạn bè tham gia</p>
            </div>
            <button
              onClick={handleInvite}
              className="flex items-center gap-1.5 rounded-full bg-memoir-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-memoir-600 active:scale-95 transition-all"
            >
              <Share2 className="h-3.5 w-3.5" />
              Mời
            </button>
          </div>

          <div className="mx-4">
            <MemberList
              members={members}
              myRole={circle.my_role}
              myUserId=""
              onRemoveMember={handleRemoveMember}
              isRemoving={removeMember.isPending}
            />
          </div>
        </div>
      )}

      {/* ── FAB: Add memory ─────────────────────────────── */}
      <button
        onClick={() => setShowUpload(true)}
        className={cn(
          'fixed right-4 bottom-24 z-30',
          'flex items-center gap-2 rounded-full px-4 py-3',
          'bg-memoir-500 text-white',
          'shadow-lg shadow-memoir-500/30',
          'hover:bg-memoir-600 hover:shadow-xl hover:shadow-memoir-500/40',
          'active:scale-95 transition-all duration-150',
        )}
        aria-label="Thêm kỷ niệm"
      >
        <Plus className="h-5 w-5" />
        <span className="text-sm font-semibold">Thêm kỷ niệm</span>
      </button>

      {/* ── Post detail sheet ───────────────────────────── */}
      {selectedPost && (
        <PostDetailSheet
          post={selectedPost}
          circleId={id!}
          myRole={circle.my_role}
          onClose={() => setSelectedPost(null)}
          onDelete={handlePostDeleted}
        />
      )}

      {/* ── Settings sheet ────────────────────────────────── */}
      {showSettings && (
        <CircleSettings
          circle={circleData!.circle}
          onClose={() => setShowSettings(false)}
          onDeleted={() => navigate('/circles', { replace: true })}
        />
      )}

      {/* ── Invite sheet ──────────────────────────────────── */}
      {showInvite && inviteData && (
        <InviteSheet
          inviteCode={inviteData.invite_code}
          shareUrl={inviteData.share_url}
          onClose={() => setShowInvite(false)}
        />
      )}

      {/* ── Upload sheet ────────────────────────────────────── */}
      {showUpload && circle && (
        <CircleUploadSheet
          circleId={circle.id}
          circleName={circle.name}
          isLinkShared={circle.visibility === 'link_shared'}
          onClose={() => setShowUpload(false)}
          onPosted={handlePosted}
        />
      )}
    </div>
  )
}
