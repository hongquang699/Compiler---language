import React, { useState, useEffect } from 'react';
import GlassButton from '../common/GlassButton';
import GlassBadge from '../common/GlassBadge';
import UserPill from './UserPill';
import { useAuth } from '../../context/AuthContext';

export const MemberNavbar = ({ activeTab, onTabChange }) => {
  const { user, switchRole } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navs = [
    { id: 'dashboard', label: 'Bàn Làm Việc', icon: '💻' },
    { id: 'ide', label: 'AI Compiler IDE', icon: '⚡' },
    { id: 'problems', label: 'Kho Bài Tập & Contest', icon: '📚' },
    { id: 'leaderboard', label: 'Bảng Xếp Hạng', icon: '🏆' },
    { id: 'profile', label: 'Tài Khoản', icon: '👤' },
  ];

  return (
    <header className="fixed top-0 inset-x-0 z-50 flex justify-center p-4 sm:p-5 pointer-events-none">
      <nav
        className={`
          pointer-events-auto flex items-center justify-between w-full max-w-6xl
          px-5 py-2.5 rounded-3xl transition-all duration-300
          ${
            scrolled
              ? 'bg-slate-950/80 backdrop-blur-2xl border border-white/15 shadow-[0_16px_40px_rgba(0,0,0,0.5)] scale-[0.98]'
              : 'bg-white/[0.08] backdrop-blur-xl border border-white/20 shadow-[0_8px_30px_rgba(0,0,0,0.2)] scale-100'
          }
        `}
      >
        {/* Brand Logo */}
        <div
          onClick={() => onTabChange('dashboard')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-500/40 via-indigo-500/30 to-purple-500/20 border border-white/30 backdrop-blur-md flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 group-hover:rotate-6 transition-all duration-300">
            <span className="text-lg">🚀</span>
          </div>
          <div>
            <span className="text-base font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-cyan-200">
              Local-AI Coder
            </span>
            <div className="text-[10px] text-cyan-300 font-mono">Thành viên</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="hidden md:flex items-center gap-1.5 p-1 rounded-2xl bg-black/30 backdrop-blur-md border border-white/10">
          {navs.map((n) => (
            <button
              key={n.id}
              onClick={() => onTabChange(n.id)}
              className={`
                flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all duration-200
                ${
                  activeTab === n.id
                    ? 'text-white bg-white/20 shadow-md border border-white/20'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                }
              `}
            >
              <span>{n.icon}</span>
              {n.label}
            </button>
          ))}
        </div>

        {/* User Pill & Quick Role Switcher */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => switchRole('admin')}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold text-slate-200 transition-colors"
            title="Chuyển sang quyền Admin"
          >
            <span>👑</span> Quyền Admin
          </button>

          {/* Dedicated Common User Pill */}
          <UserPill
            username="vohongquang"
            avatarUrl="https://images.unsplash.com/photo-1578632767115-351597cf2477?w=100&auto=format&fit=crop&q=80"
            rating={1743}
            rank="#7"
            onClick={() => onTabChange('profile')}
          />
        </div>
      </nav>
    </header>
  );
};

export default MemberNavbar;
