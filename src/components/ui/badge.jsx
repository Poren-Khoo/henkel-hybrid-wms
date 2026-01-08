import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-gray-900 text-gray-50 hover:bg-gray-900/80",
        secondary:
          "border-transparent bg-gray-100 text-gray-900 hover:bg-gray-100/80",
        destructive:
          "border-transparent bg-red-500 text-gray-50 hover:bg-red-500/80",
        outline: "text-gray-950 border-gray-300",
        green: "border-transparent bg-green-500 text-white",
        gray: "border-transparent bg-gray-500 text-white",
        amber: "border-transparent bg-amber-500 text-white",
        blue: "border-transparent bg-blue-500 text-white",
        warning: "border-transparent bg-amber-500 text-white",
        red: "border-transparent bg-red-500 text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

