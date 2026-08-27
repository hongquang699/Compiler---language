import React from 'react';
import GlassCard from '../../../components/common/GlassCard';

export const ProfileHeatmap = ({
  totalSubmissions = 0,
  heatmapData = {},
}) => {
  const daysOfWeek = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ 6', 'Thứ 7'];

  // Tạo 52 tuần
  const weeks = Array.from({ length: 52 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      // Dữ liệu từ heatmapData hoặc ngẫu nhiên nếu trống
      return Math.floor(Math.random() * 2);
    })
  );

  const getHeatmapColor = (level) => {
    switch (level) {
      case 4: return 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]';
      case 3: return 'bg-emerald-500/80';
      case 2: return 'bg-emerald-600/60';
      case 1: return 'bg-emerald-700/40';
      default: return 'bg-white/[0.06] border border-white/[0.04]';
    }
  };

  return (
    <GlassCard className="p-6 flex flex-col gap-4" glowColor="indigo">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-white tracking-tight">
          {totalSubmissions} submissions in the last year
        </h3>
        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
          <button className="hover:text-white transition-colors">«</button>
          <span className="text-slate-200">năm qua</span>
          <button className="hover:text-white transition-colors">»</button>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-black/40 border border-white/10 overflow-x-auto">
        <div className="flex gap-2 min-w-[640px]">
          <div className="flex flex-col justify-between text-[10px] text-slate-500 font-medium pr-2 py-0.5">
            {daysOfWeek.map((day, idx) => (
              <span key={idx} className="h-3 leading-3">{day}</span>
            ))}
          </div>

          <div className="flex-1 flex gap-1.5">
            {weeks.map((col, wIdx) => (
              <div key={wIdx} className="flex flex-col gap-1.5 flex-1">
                {col.map((val, dIdx) => (
                  <div
                    key={dIdx}
                    title={`Tuần ${wIdx + 1}, ${daysOfWeek[dIdx]}`}
                    className={`w-3 h-3 rounded-md transition-transform duration-200 hover:scale-125 cursor-pointer ${getHeatmapColor(val)}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-white/10 pt-3 mt-4">
          <span className="font-mono">{totalSubmissions} total submissions</span>
          <div className="flex items-center gap-2">
            <span>Hiển thị ít hơn</span>
            <div className="flex gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-white/[0.06]" />
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-700/40" />
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600/60" />
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/80" />
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
            </div>
            <span>Hiển thị thêm</span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
};

export default ProfileHeatmap;
