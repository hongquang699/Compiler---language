import React from 'react';
import GlassButton from './GlassButton';

export const GlassModal = ({
  isOpen,
  onClose,
  title,
  children,
  actions,
  maxWidth = 'max-w-lg',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dimmed Blurred Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
      />

      {/* Modal Dialog */}
      <div
        className={`
          relative w-full ${maxWidth} rounded-3xl p-6 sm:p-8
          bg-slate-900/80 backdrop-blur-2xl border border-white/20
          shadow-[0_25px_60px_rgba(0,0,0,0.6)] z-10
          animate-in zoom-in-95 fade-in duration-200
        `}
      >
        {/* Top Rim Highlight */}
        <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
          <h3 className="text-xl font-bold text-white tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="text-slate-200 text-sm">{children}</div>

        {/* Modal Footer */}
        {actions && (
          <div className="flex items-center justify-end gap-3 pt-5 border-t border-white/10 mt-6">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default GlassModal;
