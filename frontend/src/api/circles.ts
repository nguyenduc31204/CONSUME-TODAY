/**
 * Circles API — /api/v1/circles endpoints.
 */

import { apiClient } from './client'
import type { ApiResponse } from '@/types/api'

// ── Types ───────────────────────────────────────────────────────

export interface MemberItem {
  user_id: string
  name: string
  avatar_url: string | null
  role: 'owner' | 'member'
  joined_at: string
}

export interface CircleItem {
  id: string
  name: string
  description: string | null
  cover_image_url: string | null
  owner_id: string
  visibility: 'members_only' | 'link_shared'
  circle_type: 'private' | 'family' | 'friends'
  max_members: number
  member_count: number
  post_count: number
  is_member: boolean
  my_role: 'owner' | 'member' | null
  created_at: string
  updated_at: string
}

export interface PostItem {
  id: string
  circle_id: string
  author_id: string
  author_name: string
  author_avatar: string | null
  image_url: string
  thumbnail_url: string | null
  caption: string | null
  like_count: number
  comment_count: number
  is_liked: boolean
  created_at: string
}

export interface CommentItem {
  id: string
  post_id: string
  author_id: string
  author_name: string
  author_avatar: string | null
  content: string
  created_at: string
}

export interface CircleListData {
  items: CircleItem[]
  total: number
}

export interface CircleDetailData {
  circle: CircleItem
  members: MemberItem[]
}

export interface PostListData {
  items: PostItem[]
  total: number
  has_more: boolean
}

export interface CommentListData {
  items: CommentItem[]
  total: number
}

export interface LikeData {
  liked: boolean
  like_count: number
}

export interface CreateCircleData {
  name: string
  description?: string
  visibility?: 'members_only' | 'link_shared'
  circle_type?: 'private' | 'family' | 'friends'
  max_members?: number
  cover_image_url?: string
}

export interface UpdateCircleData {
  name?: string
  description?: string | null
  visibility?: 'members_only' | 'link_shared'
  cover_image_url?: string | null
}

export interface CreatePostData {
  image_url: string
  caption?: string
  ocr_data?: Record<string, unknown>
  is_visible_link?: boolean
}

export interface CreateCommentData {
  content: string
}

// ── API ────────────────────────────────────────────────────────

export const circlesApi = {
  // ── Circle CRUD ────────────────────────────────────────────

  list(): Promise<ApiResponse<CircleListData>> {
    return apiClient.get<CircleListData>('/circles')
  },

  get(id: string): Promise<ApiResponse<CircleDetailData>> {
    return apiClient.get<CircleDetailData>(`/circles/${id}`)
  },

  create(data: CreateCircleData): Promise<ApiResponse<{ circle: CircleItem; invite_code: string }>> {
    return apiClient.post('/circles', data)
  },

  update(id: string, data: UpdateCircleData): Promise<ApiResponse<{ circle: CircleItem }>> {
    return apiClient.patch(`/circles/${id}`, data)
  },

  delete(id: string): Promise<ApiResponse<null>> {
    return apiClient.delete(`/circles/${id}`)
  },

  // ── Member management ────────────────────────────────────────

  invite(id: string): Promise<ApiResponse<{ invite_code: string; share_url: string }>> {
    return apiClient.post(`/circles/${id}/invite`)
  },

  join(id: string, inviteCode: string): Promise<ApiResponse<{ circle_id: string }>> {
    return apiClient.post(`/circles/${id}/join/${inviteCode}`)
  },

  leave(id: string): Promise<ApiResponse<null>> {
    return apiClient.post(`/circles/${id}/leave`)
  },

  removeMember(circleId: string, userId: string): Promise<ApiResponse<null>> {
    return apiClient.delete(`/circles/${circleId}/members/${userId}`)
  },

  // ── Posts ────────────────────────────────────────────────────

  listPosts(
    circleId: string,
    params?: { skip?: number; limit?: number }
  ): Promise<ApiResponse<PostListData>> {
    return apiClient.get<PostListData>(`/circles/${circleId}/posts`, params as Record<string, string>)
  },

  createPost(circleId: string, data: CreatePostData): Promise<ApiResponse<{ post: PostItem }>> {
    return apiClient.post(`/circles/${circleId}/posts`, data)
  },

  deletePost(circleId: string, postId: string): Promise<ApiResponse<null>> {
    return apiClient.delete(`/circles/${circleId}/posts/${postId}`)
  },

  // ── Likes ────────────────────────────────────────────────────

  toggleLike(circleId: string, postId: string): Promise<ApiResponse<LikeData>> {
    return apiClient.post<LikeData>(`/circles/${circleId}/posts/${postId}/like`)
  },

  // ── Comments ─────────────────────────────────────────────────

  listComments(circleId: string, postId: string): Promise<ApiResponse<CommentListData>> {
    return apiClient.get<CommentListData>(`/circles/${circleId}/posts/${postId}/comments`)
  },

  createComment(
    circleId: string,
    postId: string,
    data: CreateCommentData
  ): Promise<ApiResponse<{ comment: CommentItem }>> {
    return apiClient.post(`/circles/${circleId}/posts/${postId}/comments`, data)
  },

  deleteComment(circleId: string, commentId: string): Promise<ApiResponse<null>> {
    return apiClient.delete(`/circles/${circleId}/comments/${commentId}`)
  },
}
