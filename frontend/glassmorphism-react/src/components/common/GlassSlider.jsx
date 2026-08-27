import React from 'react';

/**
 * Component GlassSlider
 * Thanh truot Range phong cach kinh mo tinh xao
 */
export const GlassSlider = ({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  onChange,
  className = '',
}) => {
  return (
    <div className={lex flex-col gap-2 p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md }>
      <div className=flex justify-between items-center text-xs font-semibold>
        <span className=text-slate-300>{label}</span>
        <span className=font-mono text-indigo-300 px-2 py-0.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 shadow-sm>
          {value}{unit}
        </span>
      </div>
      <input
        type=range
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange && onChange(Number(e.target.value))}
        className=w-full h-1.5 bg-slate-800/80 rounded-lg appearance-none cursor-pointer accent-indigo-400 hover:accent-indigo-300 transition-all
      />
    </div>
  );
};

export default GlassSlider;
