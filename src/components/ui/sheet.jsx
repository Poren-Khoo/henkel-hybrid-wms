import * as React from "react"
import { cn } from "../../lib/utils"

const Sheet = ({ open, onOpenChange, children, className, ...props }) => {
  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={() => onOpenChange(false)}
      />
      {/* Sheet */}
      <div
        className={cn(
          "fixed right-0 top-0 h-full w-full md:w-[500px] bg-white shadow-lg z-50 overflow-auto",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </>
  )
}

const SheetHeader = ({ className, children, ...props }) => (
  <div className={cn("p-6 border-b border-slate-200", className)} {...props}>
    {children}
  </div>
)

const SheetTitle = ({ className, children, ...props }) => (
  <h2 className={cn("text-xl font-semibold text-slate-900", className)} {...props}>
    {children}
  </h2>
)

const SheetDescription = ({ className, children, ...props }) => (
  <p className={cn("text-sm text-slate-500", className)} {...props}>
    {children}
  </p>
)

const SheetContent = ({ className, children, ...props }) => (
  <div className={cn("p-6", className)} {...props}>
    {children}
  </div>
)

const SheetFooter = ({ className, children, ...props }) => (
  <div className={cn("p-6 border-t border-slate-200", className)} {...props}>
    {children}
  </div>
)

export { Sheet, SheetHeader, SheetTitle, SheetDescription, SheetContent, SheetFooter }

