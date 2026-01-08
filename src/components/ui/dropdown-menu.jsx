import * as React from "react"
import { cn } from "../../lib/utils"

const DropdownMenuContext = React.createContext()

const DropdownMenu = ({ children, open, onOpenChange }) => {
  const [isOpen, setIsOpen] = React.useState(open || false)

  React.useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open)
    }
  }, [open])

  const handleOpenChange = (newOpen) => {
    setIsOpen(newOpen)
    if (onOpenChange) {
      onOpenChange(newOpen)
    }
  }

  return (
    <DropdownMenuContext.Provider value={{ isOpen, setIsOpen: handleOpenChange }}>
      <div className="relative inline-block text-left">
        {React.Children.map(children, child => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, { isOpen, setIsOpen: handleOpenChange })
          }
          return child
        })}
      </div>
    </DropdownMenuContext.Provider>
  )
}

const DropdownMenuTrigger = React.forwardRef(({ className, children, asChild, isOpen, setIsOpen, ...props }, ref) => {
  const context = React.useContext(DropdownMenuContext)
  const actualIsOpen = isOpen !== undefined ? isOpen : context?.isOpen
  const actualSetIsOpen = setIsOpen || context?.setIsOpen

  const handleClick = (e) => {
    e.stopPropagation()
    if (actualSetIsOpen) {
      actualSetIsOpen(!actualIsOpen)
    }
  }

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, { 
      onClick: handleClick, 
      ref,
      ...props
    })
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={handleClick}
      className={cn("outline-none focus:outline-none", className)}
      {...props}
    >
      {children}
    </button>
  )
})
DropdownMenuTrigger.displayName = "DropdownMenuTrigger"

const DropdownMenuContent = React.forwardRef(({ className, children, isOpen, ...props }, ref) => {
  const context = React.useContext(DropdownMenuContext)
  const actualIsOpen = isOpen !== undefined ? isOpen : context?.isOpen

  if (!actualIsOpen) return null

  return (
    <div
      ref={ref}
      className={cn(
        "absolute right-0 mt-2 w-64 rounded-md border border-slate-200 bg-white shadow-lg z-50",
        "animate-in fade-in-0 zoom-in-95",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})
DropdownMenuContent.displayName = "DropdownMenuContent"

const DropdownMenuItem = React.forwardRef(({ className, children, onClick, ...props }, ref) => {
  return (
    <div
      ref={ref}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 text-sm cursor-pointer hover:bg-slate-50 transition-colors",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})
DropdownMenuItem.displayName = "DropdownMenuItem"

const DropdownMenuLabel = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("px-4 py-2 text-sm font-semibold text-slate-900", className)}
      {...props}
    />
  )
})
DropdownMenuLabel.displayName = "DropdownMenuLabel"

const DropdownMenuSeparator = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("h-px bg-slate-200 my-1", className)}
      {...props}
    />
  )
})
DropdownMenuSeparator.displayName = "DropdownMenuSeparator"

const DropdownMenuGroup = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("px-1 py-1", className)}
      {...props}
    />
  )
})
DropdownMenuGroup.displayName = "DropdownMenuGroup"

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
}

