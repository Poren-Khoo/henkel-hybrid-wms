import * as React from "react"
import { cn } from "../../lib/utils"
import { ChevronDown } from "lucide-react"

const SelectContext = React.createContext({
  value: undefined,
  onValueChange: () => {},
  open: false,
  onOpenChange: () => {},
  items: {}
})

const Select = ({ value, onValueChange, children, ...props }) => {
  const [open, setOpen] = React.useState(false)
  const [selectedValue, setSelectedValue] = React.useState(value || "")
  const [items, setItems] = React.useState({})

  React.useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value)
    }
  }, [value])

  const handleValueChange = (newValue) => {
    setSelectedValue(newValue)
    onValueChange?.(newValue)
    setOpen(false)
  }

  const registerItem = React.useCallback((itemValue, itemLabel) => {
    setItems(prev => {
      // Only update if the value doesn't exist or has changed
      if (prev[itemValue] === itemLabel) return prev
      return { ...prev, [itemValue]: itemLabel }
    })
  }, [])

  const contextValue = React.useMemo(() => ({
    value: selectedValue,
    onValueChange: handleValueChange,
    open,
    onOpenChange: setOpen,
    items,
    registerItem
  }), [selectedValue, open, items, registerItem])

  return (
    <SelectContext.Provider value={contextValue}>
      <div className="relative" {...props}>
        {children}
      </div>
    </SelectContext.Provider>
  )
}

const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => {
  const context = React.useContext(SelectContext)
  if (!context) throw new Error("SelectTrigger must be used within Select")

  return (
    <button
      ref={ref}
      type="button"
      data-select-trigger
      onClick={() => context.onOpenChange(!context.open)}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform", context.open && "rotate-180")} />
    </button>
  )
})
SelectTrigger.displayName = "SelectTrigger"

const SelectValue = ({ placeholder = "Select..." }) => {
  const context = React.useContext(SelectContext)
  if (!context) throw new Error("SelectValue must be used within Select")

  // Get the label from registered items, or use value as fallback
  const selectedLabel = React.useMemo(() => {
    if (!context.value) return placeholder
    return context.items[context.value] || context.value || placeholder
  }, [context.value, context.items, placeholder])

  return <span className={context.value ? "text-slate-900" : "text-slate-500"}>{selectedLabel}</span>
}
SelectValue.displayName = "SelectValue"

const SelectContent = React.forwardRef(({ className, children, ...props }, ref) => {
  const context = React.useContext(SelectContext)
  const contentRef = React.useRef(null)

  React.useImperativeHandle(ref, () => contentRef.current)

  if (!context) throw new Error("SelectContent must be used within Select")

  // Close on outside click - MUST be called before any conditional returns
  React.useEffect(() => {
    if (!context.open) return

    const handleClickOutside = (event) => {
      if (contentRef.current && !contentRef.current.contains(event.target)) {
        // Check if click is not on the trigger
        const trigger = event.target.closest('[data-select-trigger]')
        if (!trigger) {
          context.onOpenChange(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [context.open, context])

  // Conditional return AFTER all hooks
  if (!context.open) return null

  return (
    <div
      ref={contentRef}
      className={cn(
        "absolute z-50 min-w-[8rem] overflow-hidden rounded-md border border-slate-200 bg-white shadow-md mt-1",
        className
      )}
      {...props}
    >
      <div className="p-1">
        {React.Children.map(children, child => {
          if (React.isValidElement(child) && child.type === SelectItem) {
            return React.cloneElement(child, { 
              selectedValue: context.value,
              onSelect: context.onValueChange
            })
          }
          return child
        })}
      </div>
    </div>
  )
})
SelectContent.displayName = "SelectContent"

const SelectItem = React.forwardRef(({ className, children, value, selectedValue, onSelect, ...props }, ref) => {
  const context = React.useContext(SelectContext)
  const isSelected = (selectedValue || context?.value) === value

  // Register this item with its label
  React.useEffect(() => {
    if (context?.registerItem && children && value) {
      const label = typeof children === 'string' ? children : React.Children.toArray(children).join('')
      context.registerItem(value, label)
    }
    // Only depend on value and children, not the entire context object
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, children])

  const handleClick = () => {
    onSelect?.(value)
    context?.onValueChange?.(value)
  }

  return (
    <div
      ref={ref}
      onClick={handleClick}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-slate-100 focus:bg-slate-100",
        isSelected && "bg-slate-100 font-medium",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})
SelectItem.displayName = "SelectItem"

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }
