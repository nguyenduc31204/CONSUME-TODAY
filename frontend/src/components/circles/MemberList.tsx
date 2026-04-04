/**
 * MemberList — List of circle members with roles.
 */

import { Crown, UserMinus } from 'lucide-react'
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

// ── MemberItem ────────────────────────────────────────────────

interface MemberItemProps {
  member: MemberItem
  onRemove?: (userId: string) => void
  canRemove: boolean
  isRemoving?: boolean
}

export function MemberItem({ member, onRemove, canRemove, isRemoving }: MemberItemProps) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      {/* Avatar */}
      <Avatar name={member.name} url={member.avatar_url} />

      {/* Info */}
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

      {/* Remove button (only for owner, not self) */}
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
  myRole: string | null
  myUserId: string
  onRemoveMember?: (userId: string) => void
  isRemoving?: boolean
}

export function MemberList({ members, myRole, myUserId: _myUserId, onRemoveMember, isRemoving }: MemberListProps) {
  const owner = members.filter((m) => m.role === 'owner')
  const others = members.filter((m) => m.role !== 'owner')

  const canRemove = myRole === 'owner'

  return (
    <div className="divide-y divide-gray-50">
      {/* Owner first */}
      {owner.map((m) => (
        <MemberItem
          key={m.user_id}
          member={m}
          canRemove={false}
        />
      ))}
      {/* Other members */}
      {others.map((m) => (
        <MemberItem
          key={m.user_id}
          member={m}
          onRemove={onRemoveMember}
          canRemove={canRemove}
          isRemoving={isRemoving}
        />
      ))}
    </div>
  )
}
