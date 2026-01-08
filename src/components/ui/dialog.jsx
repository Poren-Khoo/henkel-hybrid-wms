import * as React from "react"
import { cn } from "../../lib/utils"
import { X } from "lucide-react"

const DialogContext = React.createContext()

const Dialog = ({ open, onOpenChange, children, ...props }) => {
  const contextValue = React.useMemo(() => ({ open, onOpenChange }), [open, onOpenChange])
  
  return (
    <DialogContext.Provider value={contextValue}>
      {children}
    </DialogContext.Provider>
  )
}

const DialogContent = React.forwardRef(({ className, children, ...props }, ref) => {
  const { open, onOpenChange } = React.useContext(DialogContext)
  
  if (!open) return null
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="fixed inset-0 bg-black/50" 
        onClick={() => onOpenChange?.(false)}
      />
      <div
        ref={ref}
        className={cn(
          "relative z-50 bg-white rounded-lg shadow-lg border border-slate-200 p-6 w-full max-w-lg mx-4",
          className
        )}
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        <button
          onClick={() => onOpenChange?.(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  )
})
DialogContent.displayName = "DialogContent"

const DialogHeader = ({ className, ...props }) => (
  <div className={cn("flex flex-col space-y-1.5 mb-4", className)} {...props} />
)

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-lg font-semibold text-slate-900", className)}
    {...props}
  />
))
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-slate-500", className)}
    {...props}
  />
))
DialogDescription.displayName = "DialogDescription"

const DialogFooter = ({ className, ...props }) => (
  <div className={cn("flex justify-end gap-2 mt-6", className)} {...props} />
)

const DialogTrigger = React.forwardRef(({ asChild, className, children, ...props }, ref) => {
  const { onOpenChange } = React.useContext(DialogContext)
  
  if (asChild) {
    // If asChild, clone the child element and add onClick handler
    return React.cloneElement(React.Children.only(children), {
      onClick: () => onOpenChange?.(true),
      ref,
      ...props
    })
  }
  
  return (
    <button
      ref={ref}
      onClick={() => onOpenChange?.(true)}
      className={cn(className)}
      {...props}
    >
      {children}
    </button>
  )
})
DialogTrigger.displayName = "DialogTrigger"

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger }

