/**
 * MemberList — List of circle members + pending join requests.
 */

import { Crown, UserMinus, Check, X, Loader2, Bell } from 'lucide-react'
import { cn } from '@/utils/cn'
import { getProxyImageUrl } from '@/utils/imageUrl'
import type { MemberItem } from '@/api/circles'

// ── Avatar ─────────────────────────────────────────────────────

function Avatar({ name, url, size = 'sm' }: { name: string; url: string | null; size?: 'sm' | 'lg' }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const sz = size === 'lg' ? 'h-10 w-10 text-sm' : 'h-8 w-8 text-xs'
  return url ? (
    <img src={getProxyImageUrl(url)} alt={name} className={cn('rounded-full object-cover', sz)} />
  ) : (
    <div className={cn('flex items-center justify-center rounded-full bg-memoir-100 font-semibold text-memoir-600', sz)}>
      {initials}
    </div>
  )
}

// ── PendingMemberItem ─────────────────────────────────────────

interface PendingMemberItemProps {
  member: MemberItem
  onApprove?: (userId: string) => void
  onReject?: (userId: string) => void
  isProcessing?: boolean
}

export function PendingMemberItem({
  member,
  onApprove,
  onReject,
  isProcessing,
}: PendingMemberItemProps) {
  return (
    <div className="flex items-center gap-3 py-2.5 bg-amber-50/50 rounded-xl px-3">
      <Avatar name={member.name} url={member.avatar_url} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{member.name}</p>
        <p className="text-[11px] text-amber-500">
          Chờ duyệt · {new Date(member.joined_at).toLocaleDateString('vi-VN', { day: '2-digit', month: 'short' })}
        </p>
      </div>
      {isProcessing ? (
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
      ) : (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onApprove?.(member.user_id)}
            className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold bg-green-500 text-white hover:bg-green-600 transition-colors"
          >
            <Check className="h-3.5 w-3.5" />
            Duyệt
          </button>
          <button
            onClick={() => onReject?.(member.user_id)}
            className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

// ── MemberItem (approved) ─────────────────────────────────────

interface ApprovedMemberItemProps {
  member: MemberItem
  onRemove?: (userId: string) => void
  canRemove: boolean
  isRemoving?: boolean
}

export function ApprovedMemberItem({ member, onRemove, canRemove, isRemoving }: ApprovedMemberItemProps) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <Avatar name={member.name} url={member.avatar_url} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-gray-800 truncate">{member.name}</p>
          {member.role === 'owner' && (
            <Crown className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
          )}
        </div>
        <p className="text-[11px] text-gray-400">
          {member.role === 'owner' ? 'Chủ nhóm' : `Tham gia ${new Date(member.joined_at).toLocaleDateString('vi-VN', { day: '2-digit', month: 'short', year: 'numeric' })}`}
        </p>
      </div>
      {canRemove && member.role !== 'owner' && (
        <button
          onClick={() => onRemove?.(member.user_id)}
          disabled={isRemoving}
          className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          <UserMinus className="h-3.5 w-3.5" />
          Xóa
        </button>
      )}
    </div>
  )
}

// ── MemberList ────────────────────────────────────────────────

interface MemberListProps {
  members: MemberItem[]
  pendingMembers: MemberItem[]
  myRole: string | null
  myUserId: string
  onRemoveMember?: (userId: string) => void
  onApproveMember?: (userId: string) => void
  onRejectMember?: (userId: string) => void
  isRemoving?: boolean
  isProcessing?: boolean
  isApprovedMember?: boolean
  isPendingMember?: boolean
  onLeave?: () => void
}

export function MemberList({
  members,
  pendingMembers,
  myRole,
  myUserId: _myUserId,
  onRemoveMember,
  onApproveMember,
  onRejectMember,
  isRemoving,
  isProcessing,
  isApprovedMember,
  isPendingMember,
  onLeave,
}: MemberListProps) {
  const isOwner = myRole === 'owner'

  const owner = members.filter((m) => m.role === 'owner')
  const others = members.filter((m) => m.role !== 'owner')

  return (
    <div className="divide-y divide-gray-100">
      {/* Pending requests (owner only) */}
      {isOwner && pendingMembers.length > 0 && (
        <div className="pb-3">
          {/* Section header */}
          <div className="flex items-center gap-2 py-3">
            <Bell className="h-4 w-4 text-amber-500" />
            <p className="text-sm font-semibold text-gray-800">Yêu cầu tham gia</p>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-600">
              {pendingMembers.length}
            </span>
          </div>
          <div className="space-y-2">
            {pendingMembers.map((m) => (
              <PendingMemberItem
                key={m.user_id}
                member={m}
                onApprove={onApproveMember}
                onReject={onRejectMember}
                isProcessing={isProcessing}
              />
            ))}
          </div>
        </div>
      )}

      {/* Owner first */}
      {owner.map((m) => (
        <ApprovedMemberItem key={m.user_id} member={m} canRemove={false} />
      ))}
      {/* Other members */}
      {others.map((m) => (
        <ApprovedMemberItem
          key={m.user_id}
          member={m}
          onRemove={onRemoveMember}
          canRemove={isOwner}
          isRemoving={isRemoving}
        />
      ))}

      {/* Leave / Cancel request button */}
      {(isApprovedMember || isPendingMember) && (
        <div className="pt-4 pb-2">
          <button
            onClick={onLeave}
            disabled={isRemoving}
            className={cn(
              'w-full rounded-xl py-3 text-sm font-semibold transition-all active:scale-[0.98]',
              isPendingMember
                ? 'border border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100'
                : 'border border-red-100 bg-red-50 text-red-500 hover:bg-red-100',
              isRemoving && 'opacity-50 cursor-not-allowed',
            )}
          >
            {isPendingMember ? 'Hủy yêu cầu tham gia' : 'Rời nhóm'}
          </button>
        </div>
      )}
    </div>
  )
}
