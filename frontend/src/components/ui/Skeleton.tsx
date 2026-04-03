import { cn } from '@/utils/cn'

/**
 * Skeleton — animated placeholder for loading states.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-xl bg-gray-100',
        className,
      )}
    />
  )
}

/**
 * PhotoCardSkeleton — 3 skeleton cards for the feed.
 */
export function PhotoCardSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="overflow-hidden rounded-2xl bg-white shadow-sm border border-gray-100">
          {/* Image */}
          <Skeleton className="aspect-[4/3] w-full rounded-none" />
          {/* Content */}
          <div className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * CalendarSkeleton — skeleton for journal calendar view.
 */
export function CalendarSkeleton() {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>
      {/* Weekday labels */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-5" />
        ))}
      </div>
      {/* Day cells */}
      {Array.from({ length: 5 }).map((_, row) => (
        <div key={row} className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }).map((_, col) => (
            <Skeleton key={col} className="aspect-square rounded-xl" />
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * HomeCardSkeleton — skeleton for Home feed square cards.
 * Matches HomeCard layout: 1:1 square image + glassmorphism overlay.
 */
export function HomeCardSkeleton() {
  return (
    <div
      className="relative overflow-hidden rounded-[36px] bg-gray-100"
      style={{ aspectRatio: '1' }}
    >
      {/* Image placeholder */}
      <Skeleton className="absolute inset-0" />
      {/* Top tags row */}
      <div className="absolute top-3 inset-x-0 flex justify-center">
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      </div>
      {/* Bottom amount box */}
      <div className="absolute bottom-3 left-3 right-3">
        <Skeleton className="rounded-2xl h-14" />
      </div>
    </div>
  )
}

/**
 * StatsSkeleton — skeleton for profile stats.
 */
export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col items-center gap-2 rounded-2xl bg-white px-4 py-4 shadow-sm border border-gray-100">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  )
}
