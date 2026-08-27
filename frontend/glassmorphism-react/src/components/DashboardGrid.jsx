import React, { useState } from 'react';
import GlassCard from './GlassCard';
import SpotlightCard from './SpotlightCard';
import GlassButton from './GlassButton';

/**
 * Component DashboardGrid
 * Bảng điều khiển mô phỏng giao diện SaaS / AI với phong cách kính mờ cao cấp,
 * các hiệu ứng hover nâng card mượt mà và soft ambient glows.
 */
export const DashboardGrid = () => {
  const [activeRange, setActiveRange] = useState('7d');
  const [autoScale, setAutoScale] = useState(true);

  const stats = [
    {
      title: "Tổng lượt tương tác",
      value: "148,290",
      change: "+24.5%",
      isPositive: true,
      color: "cyan",
      glow: "hover:shadow-cyan-500/20",
      icon: (
        <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      )
    },
    {
      title: "Tốc độ phản hồi AI",
      value: "12.4 ms",
      change: "-18.2%",
      isPositive: true,
      color: "indigo",
      glow: "hover:shadow-indigo-500/20",
      icon: (
        <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    {
      title: "Bộ nhớ đệm GlassCache",
      value: "99.8%",
      change: "+1.4%",
      isPositive: true,
      color: "purple",
      glow: "hover:shadow-purple-500/20",
      icon: (
        <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1.5 3 3.5 3h9c2 0 3.5-1 3.5-3V7c0-2-1.5-3-3.5-3h-9C5.5 4 4 5 4 7z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6M9 16h6" />
        </svg>
      )
    },
    {
      title: "Tỷ lệ chuyển đổi",
      value: "4.85%",
      change: "+0.8%",
      isPositive: true,
      color: "rose",
      glow: "hover:shadow-rose-500/20",
      icon: (
        <svg className="w-6 h-6 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
  ];

  const recentLogs = [
    { time: '06:48:12', user: 'Hoà Bình (Admin)', action: 'Triển khai Glassmorphism UI v2.0', status: 'Thành công', dot: 'bg-emerald-400' },
    { time: '06:42:05', user: 'AI Compiler Core', action: 'Tối ưu hóa AST parser (2.1x speedup)', status: 'Hoàn tất', dot: 'bg-indigo-400' },
    { time: '06:35:50', user: 'Gemini Agent', action: 'Đồng bộ hóa Soft Shadows & Shimmer CSS', status: 'Hoạt động', dot: 'bg-cyan-400' },
    { time: '06:19:22', user: 'Playwright E2E', action: 'Kiểm thử chuyển động 60 FPS animation', status: 'Đạt chuẩn', dot: 'bg-purple-400' },
  ];

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Header bar within Dashboard */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-lg">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Bảng Điều Khiển Thời Gian Thực</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse">
              ● Trực tiếp
            </span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Hiệu ứng khúc xạ kính mờ với các thẻ tương tác Spotlight thông minh.
          </p>
        </div>

        {/* Time filters */}
        <div className="flex items-center p-1 rounded-2xl bg-black/30 backdrop-blur-md border border-white/10">
          {['24h', '7d', '30d', 'Toàn bộ'].map((range) => (
            <button
              key={range}
              onClick={() => setActiveRange(range)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-xl transition-all duration-200 ${
                activeRange === range
                  ? 'bg-white/20 text-white shadow-md border border-white/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, idx) => (
          <SpotlightCard
            key={idx}
            className={`p-5 transition-all duration-300 ${stat.glow}`}
            spotlightColor={
              stat.color === 'cyan' ? 'rgba(6, 182, 212, 0.2)' :
              stat.color === 'indigo' ? 'rgba(99, 102, 241, 0.2)' :
              stat.color === 'purple' ? 'rgba(168, 85, 247, 0.2)' :
              'rgba(244, 63, 94, 0.2)'
            }
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {stat.title}
              </span>
              <div className="p-2 rounded-2xl bg-white/[0.08] border border-white/10 backdrop-blur-md">
                {stat.icon}
              </div>
            </div>
            
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
              {stat.value}
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                {stat.change}
              </span>
              <span className="text-xs text-slate-400">so với tuần trước</span>
            </div>
          </SpotlightCard>
        ))}
      </div>

      {/* Main Chart + Live Feed Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Simulated Interactive Wave Chart (2 cols) */}
        <GlassCard className="lg:col-span-2 p-6 flex flex-col justify-between" glowColor="indigo">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-white">Lưu Lượng Truy Cập Khúc Xạ</h3>
              <p className="text-xs text-slate-400">Phân bố băng thông & tốc độ xử lý</p>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoScale}
                  onChange={(e) => setAutoScale(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-800 border-white/20 text-indigo-500 focus:ring-0 focus:ring-offset-0"
                />
                Tự cân bằng tải
              </label>
              <GlassButton size="sm" variant="secondary">
                Xuất Báo Cáo
              </GlassButton>
            </div>
          </div>

          {/* Graphical Bar Wave Simulation */}
          <div className="h-56 w-full flex items-end justify-between gap-2 pt-4 px-2">
            {[40, 65, 30, 85, 55, 95, 70, 60, 90, 45, 80, 100, 75, 88, 62, 92].map((height, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <div className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity font-mono">
                  {height}%
                </div>
                <div
                  style={{ height: `${height}%` }}
                  className="w-full rounded-t-xl bg-gradient-to-t from-indigo-500/30 via-purple-500/50 to-cyan-400/80 border-t border-x border-white/30 backdrop-blur-md transition-all duration-300 group-hover:scale-y-105 group-hover:brightness-125 shadow-lg group-hover:shadow-cyan-400/30"
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 border-t border-white/10 pt-4 mt-4">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>Hiện tại (23:59)</span>
          </div>
        </GlassCard>

        {/* Live Glass Activity Feed (1 col) */}
        <GlassCard className="p-6 flex flex-col" glowColor="purple">
          <h3 className="text-lg font-bold text-white mb-1">Nhật Ký Tác Vụ</h3>
          <p className="text-xs text-slate-400 mb-4">Các sự kiện hệ thống mới nhất</p>

          <div className="flex flex-col gap-3.5 overflow-y-auto max-h-[290px] pr-1">
            {recentLogs.map((log, index) => (
              <div
                key={index}
                className="p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] hover:border-white/20 transition-all duration-200 flex items-start gap-3 group"
              >
                <span className={`w-2.5 h-2.5 rounded-full mt-1.5 ${log.dot} shadow-sm group-hover:scale-125 transition-transform`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200 truncate">{log.user}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{log.time}</span>
                  </div>
                  <p className="text-xs text-slate-300 truncate mt-0.5">{log.action}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-auto pt-4 border-t border-white/10 text-center">
            <button className="text-xs font-medium text-indigo-300 hover:text-indigo-200 transition-colors">
              Xem toàn bộ 142 sự kiện →
            </button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default DashboardGrid;
