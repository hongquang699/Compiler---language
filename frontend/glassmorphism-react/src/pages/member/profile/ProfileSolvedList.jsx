import React from 'react';
import GlassCard from '../../../components/common/GlassCard';
import GlassBadge from '../../../components/common/GlassBadge';

export const ProfileSolvedList = ({ solvedList = [] }) => {
  return (
    <GlassCard className="p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white tracking-tight">
          Danh Sách Bài Tập Đã Giải ({solvedList.length})
        </h3>
      </div>

      {solvedList.length === 0 ? (
        <div className="text-center py-10 text-slate-400 text-xs">
          Chưa có bài tập nào được giải.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 font-semibold uppercase text-[10px]">
                <th className="p-3">#</th>
                <th className="p-3">Tên Bài Tập</th>
                <th className="p-3">Phân Loại</th>
                <th className="p-3">Trạng Thái</th>
                <th className="p-3">Thời Gian</th>
              </tr>
            </thead>
            <tbody>
              {solvedList.map((item, idx) => (
                <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="p-3 font-mono text-slate-500">{idx + 1}</td>
                  <td className="p-3 font-bold text-white">{item.title || 'Bài tập'}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 text-[11px]">
                      {item.category || 'Algorithm'}
                    </span>
                  </td>
                  <td className="p-3">
                    <GlassBadge variant="emerald" dot={true}>
                      {item.verdict || 'AC'}
                    </GlassBadge>
                  </td>
                  <td className="p-3 text-slate-400 font-mono text-[11px]">
                    {item.created_at || 'Gần đây'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </GlassCard>
  );
};

export default ProfileSolvedList;
