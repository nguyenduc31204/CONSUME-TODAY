/**
 * CircleDetailPage — Feed, members, calendar, and settings for a single Circle.
 * Route: /circles/:id
 */

import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ChevronLeft, Users, Settings, Share2, Plus,
  LayoutGrid, Image, Camera, Calendar as CalendarIcon,
  ChevronLeft as PrevIcon, ChevronRight as NextIcon, X,
  Wallet,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { getProxyImageUrl } from '@/utils/imageUrl'
import {
  useCircle, useCirclePosts, useRemoveMember, useLeaveCircle,
  useInviteMember, useCircleCalendarMonth, useCircleCalendarDay,
  useApproveJoinRequest, useRejectJoinRequest,
  useCircleFund, useCircleFundTransactions,
  useAddCircleFundTransaction, useDeleteCircleFundTransaction,
  useDeletePost,
} from '@/hooks/useCircles'
import { PostCard } from '@/components/circles/PostCard'
import { PostDetailSheet } from '@/components/circles/PostDetailSheet'
import { MemberList } from '@/components/circles/MemberList'
import { InviteSheet } from '@/components/circles/InviteSheet'
import { CircleSettings } from '@/components/circles/CircleSettings'
import { CircleUploadSheet } from '@/components/circles/CircleUploadSheet'
import { CircleFundCard } from '@/components/circles/CircleFundCard'
import { AddFundTransactionSheet } from '@/components/circles/AddFundTransactionSheet'
import type {
  PostItem, CirclePostCalendarDay,
} from '@/api/circles'

// ── Tab types ──────────────────────────────────────────────────

type Tab = 'feed' | 'members' | 'calendar' | 'fund'

// ── Fund Transaction Item ───────────────────────────────────

interface FundTransactionItemProps {
  txn: import('@/api/circles').CircleFundTransactionItem
  onDelete?: () => void
  isDeleting?: boolean
}

function FundTransactionItem({ txn, onDelete, isDeleting }: FundTransactionItemProps) {
  const isIncome = txn.type === 'income'
  const dateLabel = txn.transaction_date
    ? new Date(txn.transaction_date + 'T12:00:00').toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' })
    : '—'
  const timeLabel = txn.transaction_time ? ` · ${txn.transaction_time}` : ''

  const CATEGORY_ICONS: Record<string, string> = {
    'Ăn uống': '🍜', 'Di chuyển': '🚗', 'Mua sắm': '🛍️',
    'Giải trí': '🎬', 'Nhà cửa': '🏠', 'Sức khỏe': '💊',
    'Giáo dục': '📚', 'Khác': '📦',
  }
  const emoji = txn.category ? (CATEGORY_ICONS[txn.category] ?? '📦') : '💰'

  const splitLabels: Record<string, string> = {
    equal: 'Chia đều',
    single: 'Một người chịu',
    custom: 'Chia tùy ý',
  }

  return (
    <div className="flex items-center gap-3 rounded-xl bg-white border border-gray-100 px-4 py-3 shadow-sm">
      <div className={cn(
        'flex h-10 w-10 items-center justify-center rounded-full text-lg',
        isIncome ? 'bg-green-50' : 'bg-red-50',
      )}>
        {emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">
          {txn.description || (isIncome ? 'Thu nhập' : 'Chi tiêu')}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {dateLabel}{timeLabel}
          {txn.split_type && ` · ${splitLabels[txn.split_type] ?? txn.split_type}`}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className={cn(
          'text-sm font-bold',
          isIncome ? 'text-green-600' : 'text-red-500',
        )}>
          {isIncome ? '+' : '-'}{txn.amount.toLocaleString('vi-VN')}đ</span>
        {onDelete && (
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="rounded-full p-1 text-gray-300 hover:bg-red-50 hover:text-red-400 transition-colors disabled:opacity-40"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

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
  const approveJoin = useApproveJoinRequest()
  const rejectJoin = useRejectJoinRequest()
  const deletePost = useDeletePost()

  // ── Calendar state ─────────────────────────────────────────────
  const [calendarMonth, setCalendarMonth] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const calYear = calendarMonth.getFullYear()
  const calMonth = calendarMonth.getMonth()
  const { data: calData, isLoading: calLoading } = useCircleCalendarMonth(id!, calYear, calMonth)
  const { data: dayData, isLoading: dayLoading } = useCircleCalendarDay(id!, selectedDay ?? '')

  // ── Fund state ─────────────────────────────────────────────────
  const [showAddFundTxn, setShowAddFundTxn] = useState(false)
  const [fundMonthFilter, setFundMonthFilter] = useState<string | undefined>(undefined)
  const { data: fundData, isLoading: fundLoading } = useCircleFund(id!)
  const { data: fundTxnsData, isLoading: fundTxnsLoading } = useCircleFundTransactions(
    id!,
    fundMonthFilter,
    undefined,
  )
  const addFundTxn = useAddCircleFundTransaction()
  const deleteFundTxn = useDeleteCircleFundTransaction()

  const dayDataMap = useMemo<Record<string, CirclePostCalendarDay>>(() => {
    if (!calData?.days) return {}
    const m: Record<string, CirclePostCalendarDay> = {}
    for (const d of calData.days) m[d.date] = d
    return m
  }, [calData])

  const handleDayClick = (dateKey: string) => {
    // Allow clicking any date — even if count=0 (shows loading then empty state)
    if (!dateKey) return
    setSelectedDay(dateKey)
  }

  const circle = circleData?.circle
  const members = circleData?.members ?? []
  const pendingMembers = circleData?.pending_members ?? []
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

  // Approve pending join request
  const handleApproveMember = async (userId: string) => {
    await approveJoin.mutateAsync({ circleId: id!, userId })
  }

  // Reject pending join request
  const handleRejectMember = async (userId: string) => {
    await rejectJoin.mutateAsync({ circleId: id!, userId })
  }

  // Leave circle
  const handleLeave = async () => {
    if (!window.confirm('Bạn có chắc muốn rời nhóm này?')) return
    await leaveCircle.mutateAsync(id!)
    navigate('/circles', { replace: true })
  }

  // Add fund transaction
  const handleAddFundTxn = async (data: import('@/api/circles').CreateFundTransactionData) => {
    await addFundTxn.mutateAsync({ circleId: id!, data })
    setShowAddFundTxn(false)
  }

  // Post deleted from detail sheet
  const handlePostDeleted = async () => {
    if (!selectedPost) return
    await deletePost.mutateAsync({ circleId: id!, postId: selectedPost.id })
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
  const isApprovedMember = circle.my_role === 'member' || (!circle.my_role && circle.is_member)
  const isPendingMember = circle.my_status === 'pending'

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
            onClick={() => setTab('calendar')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors border-b-2',
              tab === 'calendar'
                ? 'border-memoir-500 text-memoir-600'
                : 'border-transparent text-gray-400 hover:text-gray-600',
            )}
          >
            <CalendarIcon className="h-4 w-4" />
            Lịch
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
          <button
            onClick={() => setTab('fund')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors border-b-2',
              tab === 'fund'
                ? 'border-memoir-500 text-memoir-600'
                : 'border-transparent text-gray-400 hover:text-gray-600',
            )}
          >
            <Wallet className="h-4 w-4" />
            Quỹ
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
      ) : tab === 'calendar' ? (
        <div className="flex-1 px-4 py-4">
          <CircleCalendarTab
            year={calYear}
            month={calMonth}
            dayDataMap={dayDataMap}
            isLoading={calLoading}
            totalCount={calData?.days.reduce((s, d) => s + d.count, 0) ?? 0}
            onDayClick={handleDayClick}
            onMonthChange={(d) => setCalendarMonth(d)}
          />
        </div>
      ) : tab === 'fund' ? (
        <div className="flex-1 px-4 py-4 space-y-4">
          {/* Fund card */}
          <CircleFundCard
            fund={fundData ?? undefined}
            isLoading={fundLoading}
            memberCount={members.length}
          />

          {/* Month filter */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Lịch sử giao dịch</h3>
            <div className="flex items-center gap-2">
              <input
                type="month"
                value={fundMonthFilter ?? ''}
                onChange={(e) => setFundMonthFilter(e.target.value || undefined)}
                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-memoir-400"
              />
              <button
                onClick={() => setShowAddFundTxn(true)}
                className="rounded-full bg-memoir-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-memoir-600 active:scale-95 transition-all"
              >
                + Thêm
              </button>
            </div>
          </div>

          {/* Transaction list */}
          {fundTxnsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : fundTxnsData?.items.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">
              Chưa có giao dịch quỹ nào
            </div>
          ) : (
            <div className="space-y-2">
              {fundTxnsData?.items.map((txn) => (
                <FundTransactionItem
                  key={txn.id}
                  txn={txn}
                  onDelete={
                    isOwner && !isPendingMember
                      ? async () => {
                          await deleteFundTxn.mutateAsync({ circleId: id!, txnId: txn.id })
                        }
                      : undefined
                  }
                  isDeleting={deleteFundTxn.isPending}
                />
              ))}
            </div>
          )}
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
              pendingMembers={pendingMembers}
              myRole={circle.my_role}
              myUserId=""
              onRemoveMember={handleRemoveMember}
              onApproveMember={handleApproveMember}
              onRejectMember={handleRejectMember}
              isRemoving={removeMember.isPending}
              isProcessing={approveJoin.isPending || rejectJoin.isPending}
              isApprovedMember={isApprovedMember}
              isPendingMember={isPendingMember}
              onLeave={handleLeave}
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

      {/* ── Add fund transaction sheet ───────────────────────── */}
      {showAddFundTxn && (
        <AddFundTransactionSheet
          onClose={() => setShowAddFundTxn(false)}
          onSubmit={handleAddFundTxn}
          isLoading={addFundTxn.isPending}
          memberCount={members.length}
        />
      )}

      {/* ── Day detail sheet (from calendar) ──────────────── */}
      {selectedDay && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedDay(null) }}
        >
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-4 fade-in duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
              <div>
                <h2 className="text-base font-bold text-gray-900 capitalize">
                  {new Date(selectedDay + 'T12:00:00').toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">{dayLoading ? '...' : (dayData?.post_count ?? 0)} kỷ niệm</p>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="rounded-full p-1.5 hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            {/* Posts grid */}
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {dayLoading ? (
                <div className="grid grid-cols-3 gap-1.5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="aspect-square rounded-lg bg-gray-100 animate-pulse" />
                  ))}
                </div>
              ) : (dayData?.posts.length ?? 0) === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <div className="text-4xl">📷</div>
                  <p className="text-sm text-gray-500">Không có kỷ niệm nào</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {(dayData?.posts ?? []).map((post) => {
                    const imgUrl = post.thumbnail_url ?? post.image_url
                    if (!imgUrl) return null
                    const postItem: PostItem = {
                      id: post.id,
                      circle_id: id!,
                      author_id: '',
                      author_name: post.author_name,
                      author_avatar: null,
                      image_url: imgUrl,
                      thumbnail_url: post.thumbnail_url,
                      caption: post.caption,
                      like_count: post.like_count,
                      comment_count: post.comment_count,
                      is_liked: false,
                      created_at: post.created_at,
                    }
                    return (
                      <button
                        key={post.id}
                        onClick={() => { setSelectedDay(null); setSelectedPost(postItem) }}
                        className="group relative aspect-square overflow-hidden rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-memoir-400 transition-transform active:scale-95"
                      >
                        <img
                          src={getProxyImageUrl(imgUrl)}
                          alt={post.caption ?? 'Kỷ niệm'}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Circle Calendar Tab ───────────────────────────────────────────

interface CircleCalendarTabProps {
  year: number
  month: number
  dayDataMap: Record<string, CirclePostCalendarDay>
  isLoading: boolean
  totalCount: number
  onDayClick: (dateKey: string) => void
  onMonthChange: (date: Date) => void
}

function CircleCalendarTab({ year, month, dayDataMap, isLoading, totalCount, onDayClick, onMonthChange }: CircleCalendarTabProps) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPadding = firstDay.getDay() // 0 = Sunday
  const daysInMonth = lastDay.getDate()

  const calendarCells = useMemo<{ day: number | null; dateKey: string | null }[]>(() => {
    const cells: { day: number | null; dateKey: string | null }[] = []
    for (let i = 0; i < startPadding; i++) cells.push({ day: null, dateKey: null })
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      cells.push({ day: d, dateKey })
    }
    return cells
  }, [year, month, startPadding, daysInMonth])

  const monthName = new Date(year, month, 1).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month
  const todayDay = today.getDate()

  return (
    <div>
      {/* Month nav */}
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => onMonthChange(new Date(year, month - 1, 1))}
          className="rounded-full p-2 hover:bg-gray-100 transition-colors"
        >
          <PrevIcon className="h-5 w-5 text-gray-600" />
        </button>
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-gray-800 capitalize">{monthName}</h2>
          {!isCurrentMonth && (
            <button
              onClick={() => onMonthChange(new Date())}
              className="text-xs font-medium text-memoir-500 hover:underline"
            >
              Hôm nay
            </button>
          )}
        </div>
        <button
          onClick={() => onMonthChange(new Date(year, month + 1, 1))}
          className="rounded-full p-2 hover:bg-gray-100 transition-colors"
        >
          <NextIcon className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((d) => (
          <div key={d} className="py-1 text-center text-xs font-medium text-gray-400">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      {isLoading ? (
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {calendarCells.map(({ day, dateKey }, idx) => {
            const dayInfo = dateKey ? dayDataMap[dateKey] : undefined
            const count = dayInfo?.count ?? 0
            const thumbnail = dayInfo?.thumbnails?.[0]
            const isToday = isCurrentMonth && day === todayDay

            return (
              <button
                key={idx}
                onClick={() => dateKey && onDayClick(dateKey)}
                disabled={!dateKey}
                className={cn(
                  'group relative aspect-square overflow-hidden rounded-xl transition-all',
                  'hover:ring-2 hover:ring-memoir-300',
                  'focus:outline-none focus:ring-2 focus:ring-memoir-500',
                  'disabled:cursor-default disabled:hover:ring-0',
                  isToday ? 'bg-memoir-50 ring-1 ring-memoir-200' : count > 0 ? 'bg-gray-50' : 'bg-white',
                )}
              >
                <span className={cn(
                  'absolute inset-0 z-10 flex items-center justify-center text-sm',
                  isToday ? 'font-bold text-memoir-600' : 'text-gray-700',
                )}>
                  {day}
                </span>
                {count > 0 && thumbnail && (
                  <img
                    src={getProxyImageUrl(thumbnail)}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover opacity-50"
                  />
                )}
                {count > 1 && (
                  <span className="absolute right-0.5 top-0.5 z-20 flex h-4 min-w-4 items-center justify-center rounded-full bg-memoir-500 px-1 text-[10px] font-bold text-white shadow-sm">
                    +{count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Month summary */}
      {totalCount > 0 && (
        <div className="mt-4 rounded-xl bg-white px-4 py-3 text-center shadow-sm">
          <p className="text-xs text-gray-400">
            {totalCount} kỷ niệm trong tháng
          </p>
        </div>
      )}
    </div>
  )
}
