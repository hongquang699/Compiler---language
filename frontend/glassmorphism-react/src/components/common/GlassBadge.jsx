import React from 'react';

export const GlassBadge = ({
  children,
  variant = 'indigo',
  dot = true,
  className = '',
}) => {
  const badgeMap = {
    indigo: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30 dot:bg-indigo-400',
    emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 dot:bg-emerald-400',
    cyan: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 dot:bg-cyan-400',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30 dot:bg-amber-400',
    rose: 'bg-rose-500/15 text-rose-300 border-rose-500/30 dot:bg-rose-400',
    purple: 'bg-purple-500/15 text-purple-300 border-purple-500/30 dot:bg-purple-400',
  };

  const dotColorMap = {
    indigo: 'bg-indigo-400',
    emerald: 'bg-emerald-400 animate-pulse',
    cyan: 'bg-cyan-400',
    amber: 'bg-amber-400',
    rose: 'bg-rose-400',
    purple: 'bg-purple-400',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
        backdrop-blur-md border shadow-sm select-none
        ${badgeMap[variant] || badgeMap.indigo}
        ${className}
      `}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColorMap[variant] || 'bg-white'}`} />
      )}
      {children}
    </span>
  );
};

export default GlassBadge;
