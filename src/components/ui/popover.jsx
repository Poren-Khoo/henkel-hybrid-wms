import * as React from "react"
import { cn } from "../../lib/utils"

const PopoverContext = React.createContext({
  open: false,
  setOpen: () => {},
})

const Popover = ({ children, open: controlledOpen, onOpenChange }) => {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? onOpenChange : setInternalOpen

  return (
    <PopoverContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">
        {children}
      </div>
    </PopoverContext.Provider>
  )
}

const PopoverTrigger = ({ children, asChild, ...props }) => {
  const { open, setOpen } = React.useContext(PopoverContext)
  
  const handleClick = (e) => {
    e.stopPropagation()
    setOpen(!open)
  }

  return (
    <div onClick={handleClick} data-popover-trigger {...props}>
      {children}
    </div>
  )
}

const PopoverContent = ({ className, children, align = "start", ...props }) => {
  const { open, setOpen } = React.useContext(PopoverContext)
  const contentRef = React.useRef(null)

  React.useEffect(() => {
    if (!open) return

    const handleClickOutside = (e) => {
      if (contentRef.current && !contentRef.current.contains(e.target)) {
        const trigger = e.target.closest('[data-popover-trigger]')
        if (!trigger) {
          setOpen(false)
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open, setOpen])

  if (!open) return null

  const alignClasses = {
    start: "left-0",
    center: "left-1/2 -translate-x-1/2",
    end: "right-0"
  }

  return (
    <div
      ref={contentRef}
      className={cn(
        "absolute z-50 min-w-[8rem] rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-950 shadow-lg",
        "top-full mt-2",
        alignClasses[align] || alignClasses.start,
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { Popover, PopoverTrigger, PopoverContent }

