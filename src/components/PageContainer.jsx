import React from 'react'

const variantStyles = {
  standard: 'bg-white',
  finance: 'bg-white',
  alert: 'bg-white',
  analysis: 'bg-white',
  compact: 'bg-white',
}

export default function PageContainer({ children, variant = 'standard', className = '' }) {
  const bgClass = variantStyles[variant] || variantStyles.standard
  const isCompact = variant === 'compact'

  return (
    <div className={`min-h-screen w-full ${isCompact ? 'p-2 sm:p-3' : 'p-3 sm:p-6'} ${bgClass} ${className}`}>
      {children}
    </div>
  )
}

