import React from 'react';

/**
 * Component GlassButton
 * Nút bấm phong cách Thủy tinh mờ với hiệu ứng lướt sáng (Shine Sweep) và đổ bóng mềm (Soft Glow).
 */
export const GlassButton = ({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  className = '',
  onClick,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-3.5 py-1.5 text-xs rounded-xl gap-1.5',
    md: 'px-5 py-2.5 text-sm rounded-2xl gap-2',
    lg: 'px-7 py-3.5 text-base rounded-2xl gap-2.5 font-medium',
  };

  const variantClasses = {
    // Primary: Kính xanh tím phát quang dịu
    primary: 'bg-indigo-500/20 hover:bg-indigo-500/30 text-white border border-indigo-400/40 hover:border-indigo-300/60 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40',
    // Secondary: Thủy tinh trắng trong suốt
    secondary: 'bg-white/10 hover:bg-white/20 text-slate-100 border border-white/25 hover:border-white/50 shadow-md shadow-black/10 hover:shadow-white/10',
    // Cyan Neon Glass
    cyan: 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 hover:border-cyan-300/60 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40',
    // Rose Glow Glass
    rose: 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/40 hover:border-rose-300/60 shadow-lg shadow-rose-500/20 hover:shadow-rose-500/40',
    // Ghost / Subtle
    ghost: 'bg-transparent hover:bg-white/10 text-slate-300 hover:text-white border border-transparent hover:border-white/15',
  };

  return (
    <button
      onClick={onClick}
      className={`
        group relative inline-flex items-center justify-center font-medium
        backdrop-blur-md transition-all duration-300 ease-out
        hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]
        shine-sweep select-none cursor-pointer overflow-hidden
        ${sizeClasses[size] || sizeClasses.md}
        ${variantClasses[variant] || variantClasses.primary}
        ${className}
      `}
      {...props}
    >
      {/* Vùng phản chiếu ánh sáng bên trong nút */}
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
