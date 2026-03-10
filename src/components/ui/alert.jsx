import * as React from "react"
import { cva } from "class-variance-authority"
import { AlertCircle, CheckCircle2, Info, XCircle, X } from "lucide-react"
import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive:
          "border-red-200 bg-red-50 text-red-900 dark:border-red-900 [&>svg]:text-red-600",
        warning:
          "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 [&>svg]:text-amber-600",
        success:
          "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 [&>svg]:text-emerald-600",
        info:
          "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 [&>svg]:text-blue-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

/**
 * Pre-built Alert component for MQTT/Action errors
 * 
 * @example
 * <ActionErrorAlert 
 *   error={error} 
 *   onDismiss={clearError}
 *   title="Failed to create order"
 * />
 */
const ActionErrorAlert = React.forwardRef(({ 
  error, 
  onDismiss, 
  title = "Action Failed",
  className,
  ...props 
}, ref) => {
  if (!error) return null;

  const getIcon = () => {
    if (error.code === 'MQTT_TIMEOUT') return <AlertCircle className="h-4 w-4" />;
    if (error.code === 'MQTT_DISCONNECTED') return <XCircle className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  return (
    <Alert ref={ref} variant="destructive" className={cn("mb-4", className)} {...props}>
      {getIcon()}
      <AlertTitle className="flex items-center justify-between">
        {title}
        {onDismiss && (
          <button 
            onClick={onDismiss} 
            className="ml-auto p-1 hover:bg-red-100 rounded"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </AlertTitle>
      <AlertDescription>
        {error.message || String(error)}
        {error.code === 'MQTT_TIMEOUT' && (
          <p className="mt-2 text-xs opacity-75">
            Tip: Check if Node-RED backend is running and connected to the same broker.
          </p>
        )}
        {error.code === 'MQTT_DISCONNECTED' && (
          <p className="mt-2 text-xs opacity-75">
            Tip: Wait for automatic reconnection or refresh the page.
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
});
ActionErrorAlert.displayName = "ActionErrorAlert"

/**
 * Success alert for action completion
 */
const ActionSuccessAlert = React.forwardRef(({ 
  message, 
  onDismiss,
  title = "Success",
  className,
  show = true,
  ...props 
}, ref) => {
  if (!show || !message) return null;

  return (
    <Alert ref={ref} variant="success" className={cn("mb-4", className)} {...props}>
      <CheckCircle2 className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between">
        {title}
        {onDismiss && (
          <button 
            onClick={onDismiss} 
            className="ml-auto p-1 hover:bg-emerald-100 rounded"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
});
ActionSuccessAlert.displayName = "ActionSuccessAlert"

export { Alert, AlertTitle, AlertDescription, ActionErrorAlert, ActionSuccessAlert }
