import React from 'react';
import SpotlightCard from '../../components/common/SpotlightCard';
import GlassCard from '../../components/common/GlassCard';
import GlassButton from '../../components/common/GlassButton';
import GlassBadge from '../../components/common/GlassBadge';
import GlassTable from '../../components/common/GlassTable';

export const AdminDashboard = () => {
  const hardwareMetrics = [
    { title: 'Tải CPU (Local Node)', val: '18.4%', status: 'Bình thường', color: 'cyan', glow: 'rgba(6, 182, 212, 0.25)' },
    { title: 'RAM Đã Dùng', val: '4.2 / 16 GB', status: '26% Allocated', color: 'indigo', glow: 'rgba(99, 102, 241, 0.25)' },
    { title: 'Compiler Tasks / Giây', val: '142 ops', status: '+12.5%', color: 'purple', glow: 'rgba(168, 85, 247, 0.25)' },
    { title: 'Phiên Sandbox Bảo Mật', val: '24 Active', status: 'Cách ly hoàn toàn', color: 'emerald', glow: 'rgba(16, 185, 129, 0.25)' },
  ];

  const recentUsers = [
    { name: 'Nguyễn Văn A', email: 'vana@gmail.com', role: 'Member', problems: 45, status: 'Hoạt động', time: '2 phút trước' },
    { name: 'Trần Thị B', email: 'thib@gmail.com', role: 'Judge', problems: 112, status: 'Đang chấm bài', time: '5 phút trước' },
    { name: 'Lê Hoàng Nam', email: 'namlh@local.ai', role: 'Admin', problems: 320, status: 'Quản trị', time: '12 phút trước' },
    { name: 'Phạm Minh Đức', email: 'ducpm@gmail.com', role: 'Member', problems: 18, status: 'Hoạt động', time: '1 giờ trước' },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {hardwareMetrics.map((item, idx) => (
          <SpotlightCard key={idx} spotlightColor={item.glow} className="p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              {item.title}
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight my-1">
              {item.val}
            </div>
            <div className="inline-flex items-center text-xs font-medium text-slate-300 bg-white/[0.06] px-2.5 py-0.5 rounded-lg border border-white/10 mt-1">
              {item.status}
            </div>
          </SpotlightCard>
        ))}
      </div>

      {/* Main Glass Grid: System Load + Sandbox Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Load Chart (2 cols) */}
        <GlassCard className="lg:col-span-2 p-6 flex flex-col justify-between" glowColor="cyan">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-white">Tải Xử Lý Compiler & AI Judge</h3>
              <p className="text-xs text-slate-400">Hiệu suất chấm mã nguồn C++, Python, Java theo mili-giây</p>
            </div>
            <GlassButton size="sm" variant="cyan">
              Giải Phóng Bộ Nhớ Đệm
            </GlassButton>
          </div>

          <div className="h-52 flex items-end justify-between gap-2 px-2">
            {[30, 45, 25, 80, 60, 95, 40, 55, 88, 70, 65, 90, 48, 85, 38, 72].map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity font-mono">
                  {val}%
                </span>
                <div
                  style={{ height: `${val}%` }}
                  className="w-full rounded-t-xl bg-gradient-to-t from-cyan-500/30 via-indigo-500/50 to-purple-400/80 border-t border-x border-white/30 backdrop-blur-md transition-all duration-300 group-hover:scale-y-105 group-hover:brightness-125 shadow-md group-hover:shadow-cyan-400/40"
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 border-t border-white/10 pt-4 mt-4">
            <span>Core #1: 1.2GHz</span>
            <span>Core #2: 2.8GHz</span>
            <span>Core #3: 3.4GHz</span>
            <span>Core #4: 2.1GHz</span>
          </div>
        </GlassCard>

        {/* Real-time Security Warnings (1 col) */}
        <GlassCard className="p-6 flex flex-col justify-between" glowColor="rose">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Sự Kiện Bảo Mật</h3>
              <GlassBadge variant="rose">An Toàn</GlassBadge>
            </div>
            <p className="text-xs text-slate-400 mb-4">Giám sát lệnh độc hại và tràn bộ nhớ sandbox</p>

            <div className="flex flex-col gap-3">
              {[
                { title: 'Chặn sys/socket trong C++', level: 'Khối bảo mật', time: '1 phút trước', tag: 'Chặn' },
                { title: 'Phát hiện Memory Leak 512MB', level: 'Sandbox Tự Thu Hồi', time: '8 phút trước', tag: 'Cảnh báo' },
                { title: 'Đăng nhập Admin từ 127.0.0.1', level: 'Xác thực 2FA thành công', time: '20 phút trước', tag: 'Hợp lệ' },
              ].map((ev, idx) => (
                <div key={idx} className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-200">{ev.title}</div>
                    <div className="text-[10px] text-slate-400">{ev.level} • {ev.time}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-semibold">
                    {ev.tag}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 mt-4 text-center">
            <button className="text-xs text-rose-300 hover:text-rose-200 transition-colors">
              Xem chi tiết 45 bản ghi bảo mật →
            </button>
          </div>
        </GlassCard>
      </div>

      {/* User Quick View Table */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Người Dùng Hoạt Động Gần Đây</h3>
          <span className="text-xs text-slate-400">Tổng số: 128 thành viên</span>
        </div>

        <GlassTable
          headers={['Người dùng', 'Email', 'Vai trò', 'Bài tập đã giải', 'Trạng thái', 'Hoạt động']}
          data={recentUsers}
          renderRow={(u, i) => (
            <>
              <td className="py-3.5 px-5 font-semibold text-white flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center text-xs text-indigo-200">
                  {u.name.charAt(0)}
                </div>
                {u.name}
              </td>
              <td className="py-3.5 px-5 text-slate-300 font-mono text-xs">{u.email}</td>
              <td className="py-3.5 px-5">
                <GlassBadge variant={u.role === 'Admin' ? 'rose' : u.role === 'Judge' ? 'purple' : 'cyan'}>
                  {u.role}
                </GlassBadge>
              </td>
              <td className="py-3.5 px-5 text-slate-200 font-mono">{u.problems} bài</td>
              <td className="py-3.5 px-5">
                <span className="text-emerald-400 text-xs flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {u.status}
                </span>
              </td>
              <td className="py-3.5 px-5 text-slate-400 text-xs">{u.time}</td>
            </>
          )}
        />
      </div>
    </div>
  );
};

export default AdminDashboard;
