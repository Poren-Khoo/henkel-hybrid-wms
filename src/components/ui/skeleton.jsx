import * as React from "react"
import { cn } from "../../lib/utils"

/**
 * Subtle skeleton loader for data tables and list loading states.
 * Use with tables: <TableCell><Skeleton className="h-4 w-24" /></TableCell>
 */
const Skeleton = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "animate-pulse rounded-md bg-slate-200",
      className
    )}
    {...props}
  />
))
Skeleton.displayName = "Skeleton"

export { Skeleton }
