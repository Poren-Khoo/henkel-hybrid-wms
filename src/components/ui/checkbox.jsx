import * as React from "react"
import { cn } from "../../lib/utils"

const Checkbox = React.forwardRef(({ className, checked, onChange, onCheckedChange, ...props }, ref) => {
  const handleChange = (e) => {
    if (onCheckedChange) {
      onCheckedChange(e.target.checked)
    } else if (onChange) {
      onChange(e)
    }
  }

  return (
    <input
      type="checkbox"
      className={cn(
        "h-4 w-4 rounded border-slate-300 text-[#e60000] focus:ring-2 focus:ring-[#e60000] focus:ring-offset-2 cursor-pointer",
        className
      )}
      ref={ref}
      checked={checked}
      onChange={handleChange}
      {...props}
    />
  )
})
Checkbox.displayName = "Checkbox"

export { Checkbox }

