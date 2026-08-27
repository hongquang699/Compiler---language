import React from 'react';
import GlassCard from '../../components/common/GlassCard';
import GlassBadge from '../../components/common/GlassBadge';
import GlassTable from '../../components/common/GlassTable';

export const Leaderboard = () => {
  const topCoders = [
    { rank: 1, name: 'Hoà Bình (You)', handle: '@hoabinh_coder', elo: 2450, solved: 320, streak: '42 Ngày', medal: '🥇 Vàng' },
    { rank: 2, name: 'Alex Nguyen', handle: '@alex_cpp', elo: 2390, solved: 298, streak: '28 Ngày', medal: '🥈 Bạc' },
    { rank: 3, name: 'Minh Quang', handle: '@quang_algo', elo: 2310, solved: 280, streak: '19 Ngày', medal: '🥉 Đồng' },
    { rank: 4, name: 'Sarah Le', handle: '@sarah_coder', elo: 2190, solved: 245, streak: '14 Ngày', medal: '#4' },
    { rank: 5, name: 'Trần Văn Long', handle: '@long_tv', elo: 2150, solved: 210, streak: '9 Ngày', medal: '#5' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-lg">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>🏆 Bảng Xếp Hạng Thuật Toán Học Viên</span>
            <GlassBadge variant="indigo">Chỉ Thí Sinh / Học Viên</GlassBadge>
          </h2>
          <p className="text-xs text-slate-400 mt-1">Đã ẩn tài khoản Quản trị viên (Admin), Nhà phát triển (Dev) và Superadmin</p>
        </div>
      </div>

      <GlassTable
        headers={['Thứ hạng', 'Thành viên', 'Tài khoản', 'Elo Rating', 'Bài tập AC', 'Chuỗi Streak']}
        data={topCoders}
        renderRow={(coder, i) => (
          <>
            <td className="py-4 px-5">
              <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
                coder.rank === 1 ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-lg shadow-amber-500/20' :
                coder.rank === 2 ? 'bg-slate-300/20 text-slate-200 border border-slate-300/40' :
                coder.rank === 3 ? 'bg-amber-700/20 text-amber-400 border border-amber-600/40' :
                'text-slate-400 font-mono'
              }`}>
                {coder.medal}
              </span>
            </td>
            <td className="py-4 px-5 font-bold text-white flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold shadow-sm">
                {coder.name.charAt(0)}
              </div>
              {coder.name}
            </td>
            <td className="py-4 px-5 font-mono text-xs text-indigo-300">{coder.handle}</td>
            <td className="py-4 px-5 font-mono font-bold text-cyan-300 text-base">{coder.elo}</td>
            <td className="py-4 px-5 font-mono text-slate-300 text-xs">{coder.solved} bài</td>
            <td className="py-4 px-5 text-rose-300 text-xs font-semibold">{coder.streak}</td>
          </>
        )}
      />
    </div>
  );
};

export default Leaderboard;
