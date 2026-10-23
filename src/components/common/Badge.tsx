import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple';
  size?: 'sm' | 'md';
  className?: string;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
  icon,
}) => {
  const variantStyles = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20',
    warning: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20',
    danger: 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/20',
    info: 'bg-sky-50 text-sky-700 border-sky-200 ring-sky-500/20',
    purple: 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-indigo-500/20',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200 ring-slate-400/20',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-semibold tracking-wide',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ring-1 transition-colors ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
};
