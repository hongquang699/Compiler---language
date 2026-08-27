import React from 'react';

export const GlassCard = ({
  children,
  className = '',
  variant = 'default',
  hoverEffect = true,
  glowColor = 'indigo',
  onClick,
  ...props
}) => {
  const glowShadowMap = {
    indigo: 'hover:shadow-[0_20px_50px_rgba(99,102,241,0.2)] hover:border-indigo-400/40',
    cyan: 'hover:shadow-[0_20px_50px_rgba(6,182,212,0.2)] hover:border-cyan-400/40',
    purple: 'hover:shadow-[0_20px_50px_rgba(168,85,247,0.2)] hover:border-purple-400/40',
    rose: 'hover:shadow-[0_20px_50px_rgba(244,63,94,0.2)] hover:border-rose-400/40',
    emerald: 'hover:shadow-[0_20px_50px_rgba(16,185,129,0.2)] hover:border-emerald-400/40',
    none: 'hover:shadow-black/20 hover:border-white/30',
  };

  const variantStyles = {
    default: 'bg-slate-900/40 border-white/[0.12] text-slate-100 shadow-[0_8px_32px_0_rgba(0,0,0,0.35)]',
    dark: 'bg-slate-950/60 border-white/[0.08] text-slate-200 shadow-[0_12px_40px_0_rgba(0,0,0,0.5)]',
    light: 'bg-white/[0.09] border-white/[0.22] text-white shadow-[0_8px_30px_rgb(0,0,0,0.2)]',
    gradient: 'bg-gradient-to-br from-white/[0.1] via-white/[0.04] to-transparent border-white/[0.16] shadow-[0_10px_35px_0_rgba(0,0,0,0.3)]',
  };

  return (
    <div
      onClick={onClick}
      className={`
        relative rounded-3xl p-6 backdrop-blur-xl border
        transition-all duration-300 ease-out
        ${variantStyles[variant] || variantStyles.default}
        ${hoverEffect ? `hover:-translate-y-1 hover:scale-[1.008] hover:bg-white/[0.08] ${glowShadowMap[glowColor] || glowShadowMap.indigo}` : ''}
        ${className}
      `}
      {...props}
    >
      {/* Top Rim Highlight */}
      <div className="absolute inset-x-6 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default GlassCard;
