import * as React from "react"
import { cn } from "../../lib/utils"

// Tier0 Green palette (aligned with src/config/theme.js)
// primary.DEFAULT: #b2ed1d
// primary.hover:   #84cc16
// primary.dark:    #65a30d

const buttonVariants = {
  default: "bg-[#b2ed1d] text-slate-900 hover:bg-[#84cc16] shadow-sm",
  outline: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  ghost: "bg-transparent hover:bg-slate-100 text-slate-700",
  destructive: "bg-red-600 text-white hover:bg-red-700",
}

const buttonSizes = {
  default: "h-9 px-4 py-2",
  sm: "h-8 px-3 text-xs",
  lg: "h-10 px-6",
  icon: "h-9 w-9 p-0",
  xs: "h-7 px-3 text-[11px]",
}

const Button = React.forwardRef(
  ({ className, variant = "default", size = "default", asChild, ...props }, ref) => {
    const Comp = asChild ? "span" : "button"
    return (
      <Comp
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b2ed1d] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          buttonSizes[size] || buttonSizes.default,
          buttonVariants[variant] || buttonVariants.default,
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }

