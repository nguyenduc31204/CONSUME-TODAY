/**
 * useCircles — React Query hooks for Circles.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { circlesApi } from '@/api/circles'
import { imagesApi } from '@/api/images'
import type {
  CircleItem, CircleDetailData, CommentItem,
  CreateCircleData, CreateCommentData, CreatePostData, MemberItem,
  PostItem, UpdateCircleData,
} from '@/api/circles'

const CIRCLES_KEY = ['circles']

// ── Circles list ──────────────────────────────────────────────

export function useCircles() {
  return useQuery({
    queryKey: CIRCLES_KEY,
    queryFn: async () => {
      const res = await circlesApi.list()
      if (!res.success) throw new Error(res.message)
      return res.data
    },
    staleTime: 60_000,
  })
}

// ── Circle detail ─────────────────────────────────────────────

export function useCircle(id: string) {
  return useQuery({
    queryKey: [...CIRCLES_KEY, 'detail', id],
    queryFn: async () => {
      const res = await circlesApi.get(id)
      if (!res.success) throw new Error(res.message)
      return res.data
    },
    enabled: !!id,
    staleTime: 30_000,
  })
}

// ── Posts ─────────────────────────────────────────────────────

export function useCirclePosts(circleId: string, skip = 0) {
  return useQuery({
    queryKey: [...CIRCLES_KEY, 'posts', circleId, skip],
    queryFn: async () => {
      const res = await circlesApi.listPosts(circleId, { skip })
      if (!res.success) throw new Error(res.message)
      return res.data
    },
    enabled: !!circleId,
    staleTime: 30_000,
  })
}

// ── Comments ──────────────────────────────────────────────────

export function useComments(circleId: string, postId: string) {
  return useQuery({
    queryKey: [...CIRCLES_KEY, 'comments', postId],
    queryFn: async () => {
      const res = await circlesApi.listComments(circleId, postId)
      if (!res.success) throw new Error(res.message)
      return res.data
    },
    enabled: !!circleId && !!postId,
    staleTime: 15_000,
  })
}

// ── Mutations ─────────────────────────────────────────────────

export function useCreateCircle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateCircleData) => {
      const res = await circlesApi.create(data)
      if (!res.success) throw new Error(res.message)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CIRCLES_KEY }),
  })
}

export function useUpdateCircle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCircleData }) => {
      const res = await circlesApi.update(id, data)
      if (!res.success) throw new Error(res.message)
      return res.data
    },
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: [...CIRCLES_KEY, 'detail', vars.id] }),
  })
}

export function useDeleteCircle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await circlesApi.delete(id)
      if (!res.success) throw new Error(res.message)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CIRCLES_KEY }),
  })
}

export function useLeaveCircle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await circlesApi.leave(id)
      if (!res.success) throw new Error(res.message)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CIRCLES_KEY }),
  })
}

export function useInviteMember() {
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await circlesApi.invite(id)
      if (!res.success) throw new Error(res.message)
      return res.data
    },
  })
}

export function useRemoveMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ circleId, userId }: { circleId: string; userId: string }) => {
      const res = await circlesApi.removeMember(circleId, userId)
      if (!res.success) throw new Error(res.message)
      return res.data
    },
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: [...CIRCLES_KEY, 'detail', vars.circleId] }),
  })
}

export function useCreatePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ circleId, data }: { circleId: string; data: CreatePostData }) => {
      const res = await circlesApi.createPost(circleId, data)
      if (!res.success) throw new Error(res.message)
      return res.data
    },
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: [...CIRCLES_KEY, 'posts', vars.circleId] }),
  })
}

export function useDeletePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ circleId, postId }: { circleId: string; postId: string }) => {
      const res = await circlesApi.deletePost(circleId, postId)
      if (!res.success) throw new Error(res.message)
      return res.data
    },
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: [...CIRCLES_KEY, 'posts', vars.circleId] }),
  })
}

export function useToggleLike() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ circleId, postId }: { circleId: string; postId: string }) => {
      const res = await circlesApi.toggleLike(circleId, postId)
      if (!res.success) throw new Error(res.message)
      return res.data
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: [...CIRCLES_KEY, 'posts', vars.circleId] })
      qc.invalidateQueries({ queryKey: [...CIRCLES_KEY, 'detail', vars.circleId] })
    },
  })
}

export function useCircleCalendarMonth(circleId: string, year: number, month: number) {
  return useQuery({
    queryKey: [...CIRCLES_KEY, 'calendar', circleId, year, month],
    queryFn: async () => {
      const res = await circlesApi.getCalendarMonth(circleId, year, month)
      if (!res.success) throw new Error(res.message)
      return res.data
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}

export function useCircleCalendarDay(circleId: string, date: string) {
  return useQuery({
    queryKey: [...CIRCLES_KEY, 'calendar', 'day', circleId, date],
    queryFn: async () => {
      const res = await circlesApi.getCalendarDay(circleId, date)
      if (!res.success) throw new Error(res.message)
      return res.data
    },
    enabled: !!date,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}

// ── Join request management ──────────────────────────────────────

export function useApproveJoinRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ circleId, userId }: { circleId: string; userId: string }) => {
      const res = await circlesApi.approveJoinRequest(circleId, userId)
      if (!res.success) throw new Error(res.message)
      return res.data
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: [...CIRCLES_KEY, 'detail', vars.circleId] })
    },
  })
}

export function useRejectJoinRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ circleId, userId }: { circleId: string; userId: string }) => {
      const res = await circlesApi.rejectJoinRequest(circleId, userId)
      if (!res.success) throw new Error(res.message)
      return res.data
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: [...CIRCLES_KEY, 'detail', vars.circleId] })
    },
  })
}

export function useAddComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ circleId, postId, data }: { circleId: string; postId: string; data: CreateCommentData }) => {
      const res = await circlesApi.createComment(circleId, postId, data)
      if (!res.success) throw new Error(res.message)
      return res.data
    },
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: [...CIRCLES_KEY, 'comments', vars.postId] }),
  })
}

export function useJoinCircleByCode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (inviteCode: string) => {
      const res = await circlesApi.joinByCode(inviteCode)
      if (!res.success) throw new Error(res.message)
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CIRCLES_KEY })
    },
  })
}

export function useDeleteComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ circleId, postId: _postId, commentId }: { circleId: string; postId: string; commentId: string }) => {
      const res = await circlesApi.deleteComment(circleId, commentId)
      if (!res.success) throw new Error(res.message)
      return res.data
    },
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: [...CIRCLES_KEY, 'comments', vars.postId] }),
  })
}

// ── Circle post image upload ──────────────────────────────────

export function useUploadCircleImage() {
  return useMutation({
    mutationFn: async ({ circleId, file, caption, isVisibleLink }: {
      circleId: string
      file: File
      caption?: string
      isVisibleLink?: boolean
    }) => {
      // 1. Upload image to R2
      const imageRes = await imagesApi.upload(file)
      if (!imageRes.success || !imageRes.data) {
        throw new Error(imageRes.message || 'Tải ảnh lên thất bại')
      }

      // 2. Create post in circle with uploaded image URL
      const postRes = await circlesApi.createPost(circleId, {
        image_url: imageRes.data.url,
        caption,
        is_visible_link: isVisibleLink ?? false,
      })
      if (!postRes.success || !postRes.data) {
        throw new Error(postRes.message || 'Tạo bài viết thất bại')
      }
      return postRes.data
    },
  })
}

export type { CircleItem, CircleDetailData, CommentItem, MemberItem, PostItem }

// ── Circle Fund ─────────────────────────────────────────────────

import type {
  CircleFundData, CircleFundTransactionItem, CircleFundTransactionListData,
  CreateFundTransactionData,
} from '@/api/circles'

export function useCircleFund(circleId: string) {
  return useQuery({
    queryKey: [...CIRCLES_KEY, 'fund', circleId],
    queryFn: async () => {
      const res = await circlesApi.getFund(circleId)
      if (!res.success) throw new Error(res.message)
      return res.data
    },
    enabled: !!circleId,
    staleTime: 30_000,
  })
}

export function useCircleFundTransactions(
  circleId: string,
  month?: string,
  type?: 'expense' | 'income',
) {
  return useQuery({
    queryKey: [...CIRCLES_KEY, 'fund-txns', circleId, month, type],
    queryFn: async () => {
      const res = await circlesApi.listFundTransactions(circleId, { month, type })
      if (!res.success) throw new Error(res.message)
      return res.data
    },
    enabled: !!circleId,
    staleTime: 15_000,
  })
}

export function useAddCircleFundTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ circleId, data }: { circleId: string; data: CreateFundTransactionData }) =>
      circlesApi.addFundTransaction(circleId, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: [...CIRCLES_KEY, 'fund', variables.circleId] })
      qc.invalidateQueries({ queryKey: [...CIRCLES_KEY, 'fund-txns', variables.circleId] })
    },
  })
}

export function useDeleteCircleFundTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ circleId, txnId }: { circleId: string; txnId: string }) =>
      circlesApi.deleteFundTransaction(circleId, txnId),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: [...CIRCLES_KEY, 'fund', variables.circleId] })
      qc.invalidateQueries({ queryKey: [...CIRCLES_KEY, 'fund-txns', variables.circleId] })
    },
  })
}

export type {
  CircleFundData, CircleFundTransactionItem, CircleFundTransactionListData,
  CreateFundTransactionData,
}
