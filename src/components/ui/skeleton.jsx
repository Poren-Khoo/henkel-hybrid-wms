import * as React from "react"
import { cn } from "../../lib/utils"

const Skeleton = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "skeleton-shimmer rounded-md",
      className
    )}
    {...props}
  />
))
Skeleton.displayName = "Skeleton"

function CardSkeleton({ lines = 3 }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-8 rounded" />
      </div>
      <Skeleton className="h-8 w-24" />
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <Skeleton key={i} className="h-3 w-20" />
      ))}
    </div>
  )
}

function PageSkeleton({ cards = 4, rows = 5, cols = 4 }) {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: cards }).map((_, i) => (
          <CardSkeleton key={i} lines={2} />
        ))}
      </div>
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex gap-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-18" />
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-slate-50">
            {Array.from({ length: cols }).map((_, j) => (
              <Skeleton key={j} className={cn("h-4", j === 0 ? "w-20" : "w-full max-w-[120px]")} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export { Skeleton, CardSkeleton, PageSkeleton }
