import React from 'react';

/**
 * Component UserPill - Nút hiển thị thông tin người dùng trên thanh điều hướng chung (Common Navbar)
 * Thiết kế chuẩn Glassmorphism: Nền kính mờ, viền bo tròn mềm mại, avatar phát sáng nhẹ và hiệu ứng hover mượt mà.
 */
export const UserPill = ({
  username = "vohongquang",
  avatarUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
  rating = 1743,
  rank = "#7",
  onClick,
  className = ""
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        group relative inline-flex items-center gap-2.5 px-3 py-1.5 rounded-2xl
        bg-white/[0.08] hover:bg-white/[0.16]
        backdrop-blur-xl border border-white/20 hover:border-indigo-400/50
        shadow-[0_4px_16px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_25px_rgba(99,102,241,0.25)]
        transition-all duration-300 ease-out hover:-translate-y-0.5 active:translate-y-0
        select-none cursor-pointer
        ${className}
      `}
    >
      {/* Top rim highlight */}
      <span className="absolute inset-x-3 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

      {/* Avatar with soft glow border */}
      <div className="relative w-7 h-7 rounded-xl overflow-hidden border border-white/30 shadow-sm group-hover:scale-105 transition-transform duration-300">
        <img
          src={avatarUrl}
          alt={username}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback gradient avatar
            e.target.style.display = 'none';
            e.target.parentElement.classList.add('bg-gradient-to-tr', 'from-purple-500', 'to-indigo-500', 'flex', 'items-center', 'justify-center', 'text-white', 'text-[11px]', 'font-bold');
            e.target.parentElement.innerText = username.slice(0, 2).toUpperCase();
          }}
        />
        <div className="absolute inset-0 bg-indigo-500/10 group-hover:bg-transparent transition-colors" />
      </div>

      {/* Username Text */}
      <span className="text-xs font-semibold text-slate-100 group-hover:text-white tracking-tight font-mono transition-colors">
        {username}
      </span>

      {/* Subtle indicator dot */}
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
    </button>
  );
};

export default UserPill;
