import React from 'react';

/**
 * Component GlassCard
 * Card kính mờ với viền sáng mỏng (subtle light edge), lớp mờ backdrop-blur,
 * đổ bóng mềm đa tầng (soft ambient shadows) và chuyển động nâng nhẹ khi rê chuột.
 */
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
    indigo: 'hover:shadow-indigo-500/15 hover:border-indigo-400/30',
    cyan: 'hover:shadow-cyan-500/15 hover:border-cyan-400/30',
    purple: 'hover:shadow-purple-500/15 hover:border-purple-400/30',
    rose: 'hover:shadow-rose-500/15 hover:border-rose-400/30',
    none: 'hover:shadow-black/20 hover:border-white/30',
  };

  const variantStyles = {
    // Kính mờ tiêu chuẩn
    default: 'bg-white/[0.07] border-white/[0.14] text-slate-100 shadow-[0_8px_32px_0_rgba(0,0,0,0.25)]',
    // Kính tối tương phản cao
    dark: 'bg-slate-950/40 border-white/[0.08] text-slate-200 shadow-[0_12px_40px_0_rgba(0,0,0,0.4)]',
    // Kính sáng trong trẻo
    light: 'bg-white/[0.12] border-white/[0.25] text-white shadow-[0_8px_30px_rgb(0,0,0,0.12)]',
    // Kính gradient nổi bật
    gradient: 'bg-gradient-to-br from-white/[0.12] via-white/[0.05] to-transparent border-white/[0.18] shadow-[0_10px_35px_0_rgba(0,0,0,0.3)]',
  };

  return (
    <div
      onClick={onClick}
      className={`
        relative rounded-2xl md:rounded-3xl p-6 backdrop-blur-xl border
        transition-all duration-400 ease-out
        ${variantStyles[variant] || variantStyles.default}
        ${
          hoverEffect
            ? `hover:-translate-y-1.5 hover:scale-[1.01] hover:bg-white/[0.11] ${glowShadowMap[glowColor] || glowShadowMap.indigo}`
            : ''
        }
        ${className}
      `}
      {...props}
    >
      {/* Tia phản xạ viền trên cùng (Top Rim Highlight) */}
      <div className="absolute inset-x-4 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
      
      {/* Nội dung bên trong */}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default GlassCard;
