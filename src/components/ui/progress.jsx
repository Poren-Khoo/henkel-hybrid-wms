import * as React from "react"
import { cn } from "../../lib/utils"

const Progress = React.forwardRef(({ className, value = 0, indicatorClassName, ...props }, ref) => {
  const clampedValue = Math.min(Math.max(value || 0, 0), 100)
  
  return (
    <div
      ref={ref}
      className={cn("relative h-2 w-full overflow-hidden rounded-full", className)}
      {...props}
    >
      <div
        className={cn(
          "h-full transition-all duration-300 ease-in-out",
          indicatorClassName || "bg-slate-900"
        )}
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  )
})
Progress.displayName = "Progress"

export { Progress }
