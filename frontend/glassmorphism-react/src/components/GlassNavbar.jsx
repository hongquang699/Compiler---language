import React, { useState, useEffect } from 'react';
import GlassButton from './GlassButton';

/**
 * Component GlassNavbar
 * Thanh điều hướng dạng Floating Glass với hiệu ứng mờ đa lớp, viền mỏng và co dãn nhẹ khi cuộn trang.
 */
export const GlassNavbar = ({
  logoText = "AetherGlass",
  navItems = [
    { label: "Trang chủ", href: "#hero" },
    { label: "Tính năng", href: "#features" },
    { label: "Bảng điều khiển", href: "#dashboard" },
    { label: "Bảng giá", href: "#pricing" },
  ],
  activeTab = "Trang chủ",
  onTabChange,
  onCtaClick
}) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className="fixed top-0 inset-x-0 z-50 flex justify-center p-4 sm:p-6 transition-all duration-300 pointer-events-none">
      <nav
        className={`
          pointer-events-auto flex items-center justify-between w-full max-w-6xl
          px-5 py-3 sm:px-6 sm:py-3.5 rounded-3xl
          transition-all duration-500 ease-out
          ${
            scrolled
              ? 'bg-slate-900/60 backdrop-blur-2xl border border-white/15 shadow-[0_16px_36px_rgba(0,0,0,0.35)] scale-[0.98]'
              : 'bg-white/[0.08] backdrop-blur-xl border border-white/20 shadow-[0_8px_30px_rgba(0,0,0,0.15)] scale-100'
          }
        `}
      >
        {/* Brand Logo with Glow */}
        <div className="flex items-center gap-3 cursor-pointer group">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500/40 via-purple-500/30 to-pink-500/20 border border-white/30 backdrop-blur-md shadow-lg shadow-indigo-500/20 group-hover:scale-105 group-hover:rotate-3 transition-transform duration-300">
            <svg
              className="w-5 h-5 text-indigo-200 group-hover:text-white transition-colors"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
            <div className="absolute inset-0 rounded-2xl bg-indigo-400/20 blur-md -z-10 group-hover:bg-indigo-400/40 transition-colors" />
          </div>
          <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-indigo-200 tracking-tight">
            {logoText}
          </span>
        </div>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-1.5 p-1.5 rounded-2xl bg-black/20 backdrop-blur-md border border-white/10">
          {navItems.map((item) => {
            const isActive = activeTab === item.label;
            return (
              <button
                key={item.label}
                onClick={() => onTabChange && onTabChange(item.label)}
                className={`
                  relative px-4 py-1.5 text-sm font-medium rounded-xl transition-all duration-300
                  ${
                    isActive
                      ? 'text-white bg-white/[0.14] shadow-[0_2px_10px_rgba(0,0,0,0.2)] border border-white/20'
                      : 'text-slate-300 hover:text-white hover:bg-white/[0.06] border border-transparent'
                  }
                `}
              >
                {item.label}
                {isActive && (
                  <span className="absolute bottom-1 inset-x-4 h-0.5 bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Action Button */}
        <div className="hidden sm:flex items-center gap-3">
          <GlassButton
            variant="primary"
            size="sm"
            onClick={onCtaClick}
          >
            Trải Nghiệm Ngay
          </GlassButton>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-300 hover:text-white rounded-xl bg-white/10 border border-white/10 backdrop-blur-md"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="pointer-events-auto absolute top-20 inset-x-4 p-5 rounded-3xl bg-slate-950/80 backdrop-blur-3xl border border-white/15 shadow-2xl flex flex-col gap-3 md:hidden animate-in fade-in slide-in-from-top-4 duration-200">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                onTabChange && onTabChange(item.label);
                setMobileMenuOpen(false);
              }}
              className="text-left px-4 py-2.5 rounded-xl text-slate-200 hover:bg-white/10 font-medium transition-colors"
            >
              {item.label}
            </button>
          ))}
          <div className="pt-2 border-t border-white/10">
            <GlassButton
              variant="primary"
              size="md"
              className="w-full"
              onClick={() => {
                onCtaClick && onCtaClick();
                setMobileMenuOpen(false);
              }}
            >
              Trải Nghiệm Ngay
            </GlassButton>
          </div>
        </div>
      )}
    </header>
  );
};

export default GlassNavbar;
