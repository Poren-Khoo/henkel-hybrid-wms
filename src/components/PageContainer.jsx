import React from 'react'

const variantStyles = {
  standard: 'bg-slate-50/50',
  finance: 'bg-gradient-to-br from-emerald-50/50 via-slate-50 to-slate-50',
  alert: 'bg-gradient-to-br from-rose-50/50 via-slate-50 to-slate-50',
  analysis: 'bg-gradient-to-br from-indigo-50/50 via-slate-50 to-slate-50',
}

export default function PageContainer({ children, title, subtitle, variant = 'standard', className = '' }) {
  const bgClass = variantStyles[variant] || variantStyles.standard

  return (
    <div className={`min-h-screen w-full p-6 ${bgClass} ${className}`}>
      {(title || subtitle) && (
        <div className="mb-6">
          {title && (
            <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
          )}
          {subtitle && (
            <p className="text-slate-600 mt-2">{subtitle}</p>
          )}
        </div>
      )}
      {children}
    </div>
  )
}

