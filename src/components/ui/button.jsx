import React from 'react';

export function Button({ children, className = '', variant = 'default', disabled = false, ...props }) {
  const base = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none';
  const variants = {
    default: 'bg-slate-900 text-white hover:bg-slate-800',
    outline: 'border border-slate-300 bg-white hover:bg-slate-50 text-slate-900',
  };
  return (
    <button disabled={disabled} className={`${base} ${variants[variant] || variants.default} ${className}`} {...props}>
      {children}
    </button>
  );
}
