import React from 'react';

/**
 * Component GlassToggle
 * Cong tac truot phong cach kinh mo voi hieu ung phat sang muot ma
 */
export const GlassToggle = ({
  checked,
  onChange,
  label,
  description,
  variant = 'indigo',
  className = '',
}) => {
  const glowMap = {
    indigo: 'bg-indigo-500/70 shadow-[0_0_16px_rgba(99,102,241,0.5)] border-indigo-400/40',
    cyan: 'bg-cyan-500/70 shadow-[0_0_16px_rgba(6,182,212,0.5)] border-cyan-400/40',
    emerald: 'bg-emerald-500/70 shadow-[0_0_16px_rgba(16,185,129,0.5)] border-emerald-400/40',
    rose: 'bg-rose-500/70 shadow-[0_0_16px_rgba(244,63,94,0.5)] border-rose-400/40',
  };

  return (
    <div className={lex items-center justify-between gap-4 p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 transition-all duration-300 }>
      <div>
        {label && <div className=text-sm font-semibold text-white>{label}</div>}
        {description && <div className=text-xs text-slate-400 mt-0.5>{description}</div>}
      </div>
      <button
        type=button
        onClick={() => onChange && onChange(!checked)}
        className={
          relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full
          border transition-all duration-300 ease-out backdrop-blur-md
          
        }
      >
        <span
          className={
            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white
            shadow-md ring-0 transition duration-300 ease-out
            
            mt-0.5
          }
        />
      </button>
    </div>
  );
};

export default GlassToggle;
