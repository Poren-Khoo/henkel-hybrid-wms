import React from 'react'

const variantStyles = {
  standard: 'bg-slate-50/50',
  finance: 'bg-gradient-to-br from-emerald-50/50 via-slate-50 to-slate-50',
  alert: 'bg-gradient-to-br from-rose-50/50 via-slate-50 to-slate-50',
  analysis: 'bg-gradient-to-br from-indigo-50/50 via-slate-50 to-slate-50',
  compact: 'bg-slate-50/50',
}

export default function PageContainer({ children, title, subtitle, variant = 'standard', className = '' }) {
  const bgClass = variantStyles[variant] || variantStyles.standard
  const isCompact = variant === 'compact'

  return (
    <div className={`min-h-screen w-full ${isCompact ? 'p-3' : 'p-6'} ${bgClass} ${className}`}>
      {(title || subtitle) && (
        <div className={isCompact ? 'mb-3' : 'mb-6'}>
          {title && (
            <h1 className={isCompact ? 'text-xl font-bold text-slate-900' : 'text-3xl font-bold text-slate-900'}>
              {title}
            </h1>
          )}
          {subtitle && (
            <p className={isCompact ? 'text-slate-600 mt-1 text-sm' : 'text-slate-600 mt-2'}>
              {subtitle}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  )
}

