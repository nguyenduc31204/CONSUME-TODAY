/**
 * InviteSheet — Modal to invite members via shareable link/code.
 */

import { useState } from 'react'
import { X, Link2, Copy, Check, Users } from 'lucide-react'

interface InviteSheetProps {
  inviteCode: string
  shareUrl: string
  onClose: () => void
}

export function InviteSheet({ inviteCode, shareUrl, onClose }: InviteSheetProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-memoir-50">
              <Users className="h-4 w-4 text-memoir-500" />
            </div>
            <h2 className="text-base font-bold text-gray-900">Mời thành viên</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-gray-100 transition-colors"
            aria-label="Đóng"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Invite link */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">
              Link mời
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
              <Link2 className="h-4 w-4 flex-shrink-0 text-gray-400" />
              <p className="flex-1 truncate text-xs text-gray-600">{shareUrl}</p>
              <button
                onClick={() => handleCopy(shareUrl)}
                className="flex-shrink-0 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-memoir-600 border border-memoir-100 hover:bg-memoir-50 transition-colors"
              >
                {copied ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <Check className="h-3 w-3" /> Đã copy
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Copy className="h-3 w-3" /> Copy
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Invite code */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">
              Mã mời
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
              <p className="flex-1 font-mono text-sm font-bold text-gray-800 tracking-widest">
                {inviteCode}
              </p>
              <button
                onClick={() => handleCopy(inviteCode)}
                className="flex-shrink-0 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-memoir-600 border border-memoir-100 hover:bg-memoir-50 transition-colors"
              >
                {copied ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <Check className="h-3 w-3" /> Đã copy
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Copy className="h-3 w-3" /> Copy
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Hint */}
          <p className="text-xs text-gray-400 text-center">
            Gửi link hoặc mã cho bạn bè để họ tham gia nhóm
          </p>
        </div>
      </div>
    </div>
  )
}
