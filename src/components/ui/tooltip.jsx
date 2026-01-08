import * as React from "react"
import { cn } from "../../lib/utils"

const TooltipContext = React.createContext({
  open: false,
  setOpen: () => {},
})

const TooltipProvider = ({ children }) => {
  const [open, setOpen] = React.useState(false)
  return (
    <TooltipContext.Provider value={{ open, setOpen }}>
      <div 
        className="relative inline-block"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        {children}
      </div>
    </TooltipContext.Provider>
  )
}

const Tooltip = ({ children }) => {
  return <>{children}</>
}

const TooltipTrigger = ({ children, asChild, ...props }) => {
  return <div {...props}>{children}</div>
}

const TooltipContent = ({ className, children, ...props }) => {
  const { open } = React.useContext(TooltipContext)
  
  if (!open) return null
  
  return (
    <div
      className={cn(
        "absolute z-50 min-w-[8rem] rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-950 shadow-md",
        "bottom-full left-1/2 mb-2 -translate-x-1/2",
        className
      )}
      {...props}
    >
      {children}
      <div className="absolute left-1/2 top-full -translate-x-1/2 -mt-px">
        <div className="h-2 w-2 rotate-45 border-r border-b border-slate-200 bg-white"></div>
      </div>
    </div>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }

