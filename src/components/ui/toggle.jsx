import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "../../lib/utils"

const toggleVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-gray-900 data-[state=on]:text-gray-50",
  {
    variants: {
      variant: {
        default: "bg-transparent hover:bg-gray-100 hover:text-gray-900",
        outline:
          "border border-gray-300 bg-transparent hover:bg-gray-100 hover:text-gray-900",
      },
      size: {
        default: "h-10 px-3",
        sm: "h-9 px-2.5",
        lg: "h-11 px-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Toggle = React.forwardRef(({ className, variant, size, pressed, onPressedChange, ...props }, ref) => {
  const [internalPressed, setInternalPressed] = React.useState(pressed || false)
  const isPressed = pressed !== undefined ? pressed : internalPressed

  const handleClick = () => {
    const newPressed = !isPressed
    if (pressed === undefined) {
      setInternalPressed(newPressed)
    }
    onPressedChange?.(newPressed)
  }

  return (
    <button
      ref={ref}
      type="button"
      className={cn(toggleVariants({ variant, size, className }))}
      data-state={isPressed ? "on" : "off"}
      aria-pressed={isPressed}
      onClick={handleClick}
      {...props}
    />
  )
})
Toggle.displayName = "Toggle"

export { Toggle, toggleVariants }

