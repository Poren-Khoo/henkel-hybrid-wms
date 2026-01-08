import * as React from "react"
import { cn } from "../../lib/utils"

const buttonVariants = {
  default:
    "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-slate-900 text-white hover:bg-slate-800",
  ghost:
    "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-transparent text-slate-700 hover:bg-slate-100",
  outline:
    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400",
  destructive:
    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-red-600 text-white hover:bg-red-700",
}

const Button = React.forwardRef(({ className, variant = "default", asChild, ...props }, ref) => {
  const Comp = asChild ? "span" : "button"
  return (
    <Comp
      ref={ref}
      className={cn(buttonVariants[variant] || buttonVariants.default, className)}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button }

