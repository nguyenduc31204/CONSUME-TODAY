/**
 * JoinByCodePage — Landing page when user visits a circle invite link.
 * Route: /circles/join/:inviteCode
 */

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Users, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useJoinCircleByCode, useCircles } from '@/hooks/useCircles'

export default function JoinByCodePage() {
  const { inviteCode } = useParams<{ inviteCode: string }>()
  const navigate = useNavigate()
  const joinCircle = useJoinCircleByCode()
  const { data } = useCircles()

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'pending' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  // Check if already member of this circle
  const alreadyMember = (data?.items ?? []).some((c) =>
    c.id.slice(-6).toUpperCase() === inviteCode?.toUpperCase()
  )

  const handleJoin = async () => {
    if (!inviteCode) return
    setStatus('loading')
    setErrorMsg('')
    try {
      const result = await joinCircle.mutateAsync(inviteCode)
      if (!result) throw new Error('Invalid response')
      if (result.approved) {
        setStatus('success')
        setTimeout(() => navigate(`/circles/${result.circle_id}`, { replace: true }), 1500)
      } else {
        setStatus('pending')
      }
    } catch (err: unknown) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Không thể tham gia nhóm.')
    }
  }

  if (!inviteCode) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-6 text-center">
        <XCircle className="h-12 w-12 text-red-400 mb-4" />
        <h1 className="text-xl font-bold text-gray-800">Mã mời không hợp lệ</h1>
        <p className="mt-2 text-sm text-gray-400">Liên kết này không hợp lệ hoặc đã hết hạn.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-memoir-50 mx-auto mb-4">
            <Users className="h-8 w-8 text-memoir-500" />
          </div>

          <h1 className="text-xl font-bold text-gray-900">Tham gia nhóm</h1>
          <p className="mt-2 text-sm text-gray-500">
            Bạn được mời tham gia một nhóm kỷ niệm
          </p>

          {/* Invite code display */}
          <div className="mt-4 rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
            <p className="text-xs text-gray-400 mb-1">Mã mời</p>
            <p className="font-mono text-2xl font-bold text-gray-800 tracking-widest">
              {inviteCode.toUpperCase()}
            </p>
          </div>

          {/* Already a member */}
          {alreadyMember && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-green-50 border border-green-100 px-4 py-3 text-left">
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-700">Bạn đã là thành viên</p>
                <p className="text-xs text-green-500">Nhóm này đã có trong danh sách của bạn</p>
              </div>
            </div>
          )}

          {/* Status */}
          {status === 'success' && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-green-50 border border-green-100 px-4 py-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <p className="text-sm font-semibold text-green-700">Đã tham gia! Đang chuyển...</p>
            </div>
          )}

          {status === 'pending' && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-left">
              <CheckCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-700">Đã gửi yêu cầu!</p>
                <p className="text-xs text-amber-500">Trưởng nhóm sẽ duyệt trong ít phút.</p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-left">
              <XCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
              <p className="text-sm font-semibold text-red-600">{errorMsg}</p>
            </div>
          )}

          {/* CTA button */}
          <div className="mt-5 flex flex-col gap-2">
            {alreadyMember ? (
              <button
                onClick={() => navigate('/circles')}
                className={cn(
                  'w-full rounded-xl py-3 text-sm font-semibold transition-all',
                  'bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-95',
                )}
              >
                Xem danh sách nhóm
              </button>
            ) : status === 'loading' ? (
              <button
                disabled
                className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold bg-memoir-400 text-white"
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang tham gia...
              </button>
            ) : status === 'pending' ? (
              <button
                onClick={() => navigate('/circles')}
                className={cn(
                  'w-full rounded-xl py-3 text-sm font-semibold transition-all',
                  'bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-95',
                )}
              >
                Quay về danh sách nhóm
              </button>
            ) : (
              <button
                onClick={handleJoin}
                className={cn(
                  'w-full rounded-xl py-3 text-sm font-semibold transition-all active:scale-95',
                  'bg-memoir-500 text-white hover:bg-memoir-600 shadow-md shadow-memoir-500/25',
                )}
              >
                Tham gia nhóm
              </button>
            )}
            <button
              onClick={() => navigate('/circles')}
              className="w-full rounded-xl py-2.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Hủy
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}