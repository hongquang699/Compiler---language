import React from 'react';
import SpotlightCard from '../../../components/common/SpotlightCard';
import GlassButton from '../../../components/common/GlassButton';

export const ProfileSidebar = ({
  username = "vohongquang",
  avatarUrl = "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&auto=format&fit=crop&q=80",
  solvedCount = 0,
  rank = "#1",
  totalScore = 0,
  onViewSubmissions,
}) => {
  return (
    <SpotlightCard
      spotlightColor="rgba(168, 85, 247, 0.25)"
      className="p-6 flex flex-col items-center text-center"
    >
      {/* Avatar */}
      <div className="relative w-32 h-32 rounded-3xl overflow-hidden p-1 bg-gradient-to-tr from-purple-500 via-indigo-500 to-pink-500 shadow-xl shadow-purple-500/20 mb-5 group">
        <div className="w-full h-full rounded-[22px] overflow-hidden bg-slate-950">
          <img
            src={avatarUrl}
            alt={username}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      </div>

      {/* Số lượng bài đã giải */}
      <div className="w-full text-center mb-4">
        <span className="text-sm font-bold text-white tracking-tight">
          {solvedCount} số lượng bài đã giải
        </span>
      </div>

      {/* Xếp hạng bảng điểm & Tổng điểm */}
      <div className="w-full flex flex-col gap-2 mb-5">
        <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-xs">
          <span className="text-slate-400">Xếp hạng bảng điểm:</span>
          <span className="font-bold text-white font-mono text-sm">{rank}</span>
        </div>
        <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-xs">
          <span className="text-slate-400">Tổng điểm:</span>
          <span className="font-bold text-cyan-300 font-mono text-sm">{totalScore}</span>
        </div>
      </div>

      {/* Nút Xem các bài nộp */}
      <GlassButton
        variant="primary"
        size="md"
        className="w-full font-bold shadow-lg shadow-indigo-500/25"
        onClick={onViewSubmissions}
      >
        Xem các bài nộp
      </GlassButton>
    </SpotlightCard>
  );
};

export default ProfileSidebar;
