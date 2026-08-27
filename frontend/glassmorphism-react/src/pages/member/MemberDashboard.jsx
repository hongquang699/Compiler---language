import React from 'react';
import SpotlightCard from '../../components/common/SpotlightCard';
import GlassCard from '../../components/common/GlassCard';
import GlassButton from '../../components/common/GlassButton';
import GlassBadge from '../../components/common/GlassBadge';
import GlassTable from '../../components/common/GlassTable';
import { useAuth } from '../../context/AuthContext';

export const MemberDashboard = ({ onOpenIDE }) => {
  const { user } = useAuth();

  const userStats = [
    { title: 'Điểm Elo Rating', val: '2,150', sub: 'Top 5% Grandmaster', color: 'indigo', glow: 'rgba(99, 102, 241, 0.25)' },
    { title: 'Bài Tập Đã Giải', val: '148', sub: '+12 bài trong tuần này', color: 'cyan', glow: 'rgba(6, 182, 212, 0.25)' },
    { title: 'Chuỗi Luyện Tập', val: '15 Ngày', sub: '🔥 Đang giữ phong độ', color: 'rose', glow: 'rgba(244, 63, 94, 0.25)' },
    { title: 'Độ Chuẩn Xác AI', val: '94.8%', sub: 'Tối ưu độ phức tạp O(N)', color: 'emerald', glow: 'rgba(16, 185, 129, 0.25)' },
  ];

  const recentSubmissions = [
    { id: '#10492', problem: 'Tìm Đường Đi Ngắn Nhất (Dijkstra + Priority Queue)', lang: 'C++20', result: 'Accepted (100/100)', time: '14ms', memory: '3.2MB' },
    { id: '#10488', problem: 'Quy Hoạch Động Balo 0/1 Tối Ưu Bộ Nhớ', lang: 'Python 3.11', result: 'Accepted (100/100)', time: '45ms', memory: '12.4MB' },
    { id: '#10475', problem: 'Cây Phân Đoạn Segment Tree Lazy Propagation', lang: 'C++20', result: 'Time Limit Exceeded', time: '1002ms', memory: '8.1MB' },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome Banner */}
      <GlassCard className="p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6" glowColor="cyan">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <GlassBadge variant="cyan">Thành Viên Tích Cực</GlassBadge>
            <span className="text-xs text-slate-400">ID: #MEMBER-8829</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Chào mừng trở lại, {user.name}!
          </h1>
          <p className="text-sm text-slate-300 max-w-xl">
            Hôm nay có 3 bài thi đấu mới về <strong>Quy hoạch động</strong> và <strong>Đồ thị</strong>. Hãy bắt đầu luyện tập với trợ lý AI phân tích độ phức tạp thuật toán.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <GlassButton variant="primary" size="lg" onClick={onOpenIDE}>
            Mở AI Compiler IDE →
          </GlassButton>
        </div>
      </GlassCard>

      {/* 4 Spotlight Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {userStats.map((s, idx) => (
          <SpotlightCard key={idx} spotlightColor={s.glow} className="p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              {s.title}
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight my-1">
              {s.val}
            </div>
            <div className="text-xs text-slate-300 mt-1">{s.sub}</div>
          </SpotlightCard>
        ))}
      </div>

      {/* Submissions History Table */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Lịch Sử Nộp Bài Gần Nhất</h3>
          <button className="text-xs text-cyan-300 hover:text-cyan-200 transition-colors">
            Xem toàn bộ bài nộp →
          </button>
        </div>

        <GlassTable
          headers={['Mã bài nộp', 'Bài toán', 'Ngôn ngữ', 'Kết quả chấm', 'Thời gian', 'Bộ nhớ']}
          data={recentSubmissions}
          renderRow={(sub, idx) => (
            <>
              <td className="py-3.5 px-5 font-mono text-xs text-slate-400">{sub.id}</td>
              <td className="py-3.5 px-5 font-semibold text-white">{sub.problem}</td>
              <td className="py-3.5 px-5">
                <span className="px-2.5 py-0.5 rounded-lg bg-white/10 text-xs font-mono text-slate-200 border border-white/15">
                  {sub.lang}
                </span>
              </td>
              <td className="py-3.5 px-5">
                <GlassBadge variant={sub.result.includes('Accepted') ? 'emerald' : 'rose'}>
                  {sub.result}
                </GlassBadge>
              </td>
              <td className="py-3.5 px-5 text-slate-300 font-mono text-xs">{sub.time}</td>
              <td className="py-3.5 px-5 text-slate-300 font-mono text-xs">{sub.memory}</td>
            </>
          )}
        />
      </div>
    </div>
  );
};

export default MemberDashboard;
