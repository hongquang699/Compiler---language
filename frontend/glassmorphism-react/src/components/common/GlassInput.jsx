import React from 'react';

export const GlassInput = ({
  label,
  icon: Icon,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-semibold text-slate-300 tracking-wide">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 pointer-events-none text-slate-400">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          className={`
            w-full bg-slate-950/40 backdrop-blur-xl border border-white/15
            focus:border-indigo-400/60 focus:bg-white/[0.08] focus:shadow-[0_0_20px_rgba(99,102,241,0.25)]
            text-slate-100 placeholder-slate-500 rounded-2xl text-sm py-2.5 px-4
            outline-none transition-all duration-300
            ${Icon ? 'pl-10' : ''}
            ${error ? 'border-red-400/60 focus:border-red-400' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
};

export default GlassInput;
