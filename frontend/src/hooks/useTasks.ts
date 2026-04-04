/**
 * useTasks — React Query hooks for task management.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { tasksApi } from '@/api/tasks'
import type { CreateTaskData, TaskItem, UpdateTaskData } from '@/api/tasks'

const TASKS_KEY = ['tasks']

export function useTasks(status?: string) {
  return useQuery({
    queryKey: [...TASKS_KEY, status],
    queryFn: async () => {
      const res = await tasksApi.list(status ? { status } : undefined)
      if (!res.success) throw new Error(res.message)
      if (res.data === null) throw new Error('No data returned')
      return res.data
    },
    staleTime: 30 * 1000,
  })
}

export function useTask(id: string) {
  return useQuery({
    queryKey: [...TASKS_KEY, 'detail', id],
    queryFn: async () => {
      const res = await tasksApi.get(id)
      if (!res.success) throw new Error(res.message)
      if (res.data === null) throw new Error('Task not found')
      return res.data.task
    },
    enabled: !!id,
    staleTime: 30 * 1000,
  })
}

export function useCreateTask() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateTaskData) => {
      const res = await tasksApi.create(data)
      if (!res.success) throw new Error(res.message)
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TASKS_KEY })
    },
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTaskData }) => {
      const res = await tasksApi.update(id, data)
      if (!res.success) throw new Error(res.message)
      if (res.data === null) throw new Error('Update failed')
      return res.data.task
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TASKS_KEY })
    },
  })
}

export function useCompleteTask() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, completed = true }: { id: string; completed?: boolean }) => {
      const res = await tasksApi.complete(id, completed)
      if (!res.success) throw new Error(res.message)
      if (res.data === null) throw new Error('Complete failed')
      return res.data.task
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TASKS_KEY })
    },
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await tasksApi.delete(id)
      if (!res.success) throw new Error(res.message)
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TASKS_KEY })
    },
  })
}

// ── Helpers ─────────────────────────────────────────────────────

export type { TaskItem }
