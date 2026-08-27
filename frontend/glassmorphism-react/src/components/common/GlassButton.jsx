import React from 'react';

export const GlassButton = ({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  className = '',
  onClick,
  disabled = false,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-3.5 py-1.5 text-xs rounded-xl gap-1.5',
    md: 'px-5 py-2.5 text-sm rounded-2xl gap-2',
    lg: 'px-7 py-3.5 text-base rounded-2xl gap-2.5 font-medium',
  };

  const variantClasses = {
    primary: 'bg-indigo-500/20 hover:bg-indigo-500/35 text-white border border-indigo-400/40 hover:border-indigo-300/60 shadow-[0_8px_25px_rgba(99,102,241,0.25)] hover:shadow-[0_12px_35px_rgba(99,102,241,0.45)]',
    secondary: 'bg-white/10 hover:bg-white/20 text-slate-100 border border-white/25 hover:border-white/50 shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_30px_rgba(255,255,255,0.15)]',
    cyan: 'bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-200 border border-cyan-400/40 hover:border-cyan-300/60 shadow-[0_8px_25px_rgba(6,182,212,0.25)] hover:shadow-[0_12px_35px_rgba(6,182,212,0.45)]',
    rose: 'bg-rose-500/20 hover:bg-rose-500/35 text-rose-200 border border-rose-400/40 hover:border-rose-300/60 shadow-[0_8px_25px_rgba(244,63,94,0.25)] hover:shadow-[0_12px_35px_rgba(244,63,94,0.45)]',
    emerald: 'bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-200 border border-emerald-400/40 hover:border-emerald-300/60 shadow-[0_8px_25px_rgba(16,185,129,0.25)] hover:shadow-[0_12px_35px_rgba(16,185,129,0.45)]',
    danger: 'bg-red-500/20 hover:bg-red-500/35 text-red-200 border border-red-400/40 hover:border-red-300/60 shadow-[0_8px_25px_rgba(239,68,68,0.25)] hover:shadow-[0_12px_35px_rgba(239,68,68,0.45)]',
    ghost: 'bg-transparent hover:bg-white/10 text-slate-300 hover:text-white border border-transparent hover:border-white/15',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        group relative inline-flex items-center justify-center font-medium
        backdrop-blur-md transition-all duration-300 ease-out
        hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]
        shine-sweep select-none cursor-pointer overflow-hidden
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0
        ${sizeClasses[size] || sizeClasses.md}
        ${variantClasses[variant] || variantClasses.primary}
        ${className}
      `}
      {...props}
    >
      <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />
      
      {Icon && (
        <Icon className="w-4 h-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6" />
      )}
      
      <span className="relative z-10 flex items-center gap-2 tracking-wide">
        {children}
      </span>
    </button>
  );
};

export default GlassButton;
