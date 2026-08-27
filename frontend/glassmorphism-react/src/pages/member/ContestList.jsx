import React from 'react';
import SpotlightCard from '../../components/common/SpotlightCard';
import GlassCard from '../../components/common/GlassCard';
import GlassButton from '../../components/common/GlassButton';
import GlassBadge from '../../components/common/GlassBadge';

export const ContestList = () => {
  const contests = [
    {
      id: 'ROUND-42',
      title: 'Local-AI Grand Algorithm Championship 2026',
      type: 'ICPC Rules (Penalty 20m)',
      status: 'Đang Diễn Ra',
      duration: '02:00:00',
      participants: 412,
      problems: 6,
      badgeVariant: 'emerald',
      isLive: true,
    },
    {
      id: 'ROUND-43',
      title: 'Beginner Friendly Contest #15',
      type: 'IOI Rules (Partial Score)',
      status: 'Bắt đầu sau 2 ngày',
      duration: '02:30:00',
      participants: 680,
      problems: 5,
      badgeVariant: 'cyan',
      isLive: false,
    },
    {
      id: 'ROUND-41',
      title: 'Dynamic Programming Master Sprint',
      type: 'AtCoder / Codeforces Style',
      status: 'Đã Kết Thúc',
      duration: '01:45:00',
      participants: 950,
      problems: 6,
      badgeVariant: 'rose',
      isLive: false,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-lg">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>🏆 Đấu Trường Thi Đấu Trực Tuyến (Contests)</span>
            <GlassBadge variant="emerald">Live Contests</GlassBadge>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Thi đấu xếp hạng Elo theo luật ICPC/IOI với hệ thống chấm bài tức thời
          </p>
        </div>
        <GlassButton variant="primary" size="sm">
          Lịch Thi Đấu Mùa Giải
        </GlassButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contests.map((c) => (
          <SpotlightCard
            key={c.id}
            spotlightColor={c.isLive ? 'rgba(16, 185, 129, 0.25)' : 'rgba(99, 102, 241, 0.25)'}
            className="flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-slate-400">{c.id}</span>
                <GlassBadge variant={c.badgeVariant}>{c.status}</GlassBadge>
              </div>

              <h3 className="text-lg font-bold text-white mb-2 leading-snug">{c.title}</h3>
              <p className="text-xs text-slate-300 mb-4">{c.type}</p>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 py-3 border-y border-white/10 mb-4">
                <div>
                  <span className="text-slate-500 block">Thời lượng:</span>
                  <span className="font-mono font-bold text-white">{c.duration}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Thí sinh:</span>
                  <span className="font-mono font-bold text-cyan-300">{c.participants} người</span>
                </div>
              </div>
            </div>

            <GlassButton
              variant={c.isLive ? 'emerald' : 'secondary'}
              size="md"
              className="w-full"
            >
              {c.isLive ? '🔥 Tham Gia Thi Ngay' : 'Xem Chi Tiết / Standings'}
            </GlassButton>
          </SpotlightCard>
        ))}
      </div>
    </div>
  );
};

export default ContestList;
