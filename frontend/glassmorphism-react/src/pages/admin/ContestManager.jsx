import React, { useState } from 'react';
import GlassCard from '../../components/common/GlassCard';
import GlassButton from '../../components/common/GlassButton';
import GlassBadge from '../../components/common/GlassBadge';
import GlassTable from '../../components/common/GlassTable';

export const ContestManager = () => {
  const contests = [
    { id: 'ROUND-42', title: 'Local-AI Grand Algorithm 2026', startTime: '2026-08-28 19:30', duration: '120m', rules: 'ICPC', state: 'Active' },
    { id: 'ROUND-43', title: 'Beginner Friendly Contest #15', startTime: '2026-08-30 20:00', duration: '150m', rules: 'IOI', state: 'Pending' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-lg">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>🏆 Quản Lý Kỳ Thi (Contest Manager)</span>
            <GlassBadge variant="emerald">Bảng Điều Khiển Kỳ Thi</GlassBadge>
          </h2>
          <p className="text-xs text-slate-400 mt-1">Khởi tạo contest, phân phối bộ đề và đóng băng bảng điểm (Freeze Standings)</p>
        </div>
        <GlassButton variant="primary" size="md">
          + Khởi Tạo Kỳ Thi Mới
        </GlassButton>
      </div>

      <GlassTable
        headers={['ID', 'Tên kỳ thi', 'Thời gian bắt đầu', 'Thời lượng', 'Luật thi đấu', 'Trạng thái', 'Hành động']}
        data={contests}
        renderRow={(c, idx) => (
          <>
            <td className="py-3.5 px-5 font-mono text-xs text-indigo-300 font-semibold">{c.id}</td>
            <td className="py-3.5 px-5 font-bold text-white">{c.title}</td>
            <td className="py-3.5 px-5 text-slate-300 text-xs font-mono">{c.startTime}</td>
            <td className="py-3.5 px-5 text-slate-300 text-xs font-mono">{c.duration}</td>
            <td className="py-3.5 px-5">
              <span className="px-2 py-0.5 rounded-lg bg-white/10 text-xs font-mono text-slate-200 border border-white/10">{c.rules}</span>
            </td>
            <td className="py-3.5 px-5">
              <GlassBadge variant={c.state === 'Active' ? 'emerald' : 'cyan'}>{c.state}</GlassBadge>
            </td>
            <td className="py-3.5 px-5 flex items-center gap-2">
              <button className="text-xs text-cyan-300 hover:text-cyan-200">Quản lý đề</button>
              <span className="text-slate-600">•</span>
              <button className="text-xs text-amber-400 hover:text-amber-300">Đóng băng</button>
            </td>
          </>
        )}
      />
    </div>
  );
};

export default ContestManager;
