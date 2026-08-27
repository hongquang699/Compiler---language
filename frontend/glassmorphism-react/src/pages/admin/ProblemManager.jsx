import React, { useState } from 'react';
import GlassCard from '../../components/common/GlassCard';
import GlassButton from '../../components/common/GlassButton';
import GlassInput from '../../components/common/GlassInput';
import GlassBadge from '../../components/common/GlassBadge';
import GlassTable from '../../components/common/GlassTable';

export const ProblemManager = () => {
  const [problems, setProblems] = useState([
    { id: 1001, title: 'Dãy Con Tăng Dài Nhất (LIS)', diff: 'Medium', tests: 20, timeLimit: '1.0s', memoryLimit: '256MB', active: true },
    { id: 1002, title: 'Đường Đi Ngắn Nhất Dijkstra', diff: 'Medium', tests: 35, timeLimit: '1.5s', memoryLimit: '512MB', active: true },
    { id: 1003, title: 'Cây Phân Đoạn Segment Tree', diff: 'Hard', tests: 40, timeLimit: '2.0s', memoryLimit: '512MB', active: true },
    { id: 1004, title: 'Luồng Cực Đại Dinic Algorithm', diff: 'Hard', tests: 25, timeLimit: '2.5s', memoryLimit: '512MB', active: false },
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-lg">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>📝 Quản Lý Đề Bài & Bộ Test Chấm (Problem Manager)</span>
            <GlassBadge variant="indigo">{problems.length} Bài Tập</GlassBadge>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Thêm mới, sửa giới hạn thời gian/bộ nhớ và cấu hình bộ testcases tự động
          </p>
        </div>
        <GlassButton variant="primary" size="md">
          + Tạo Bài Tập Mới
        </GlassButton>
      </div>

      <GlassTable
        headers={['ID', 'Tên đề bài', 'Độ khó', 'Số Testcase', 'Giới hạn Thời gian', 'Giới hạn RAM', 'Trạng thái', 'Hành động']}
        data={problems}
        renderRow={(p, idx) => (
          <>
            <td className="py-3.5 px-5 font-mono text-xs text-slate-400">#{p.id}</td>
            <td className="py-3.5 px-5 font-bold text-white">{p.title}</td>
            <td className="py-3.5 px-5">
              <GlassBadge variant={p.diff === 'Hard' ? 'rose' : 'cyan'}>{p.diff}</GlassBadge>
            </td>
            <td className="py-3.5 px-5 font-mono text-xs text-slate-300">{p.tests} tests</td>
            <td className="py-3.5 px-5 font-mono text-xs text-slate-300">{p.timeLimit}</td>
            <td className="py-3.5 px-5 font-mono text-xs text-slate-300">{p.memoryLimit}</td>
            <td className="py-3.5 px-5">
              <GlassBadge variant={p.active ? 'emerald' : 'rose'}>
                {p.active ? 'Công khai' : 'Ẩn'}
              </GlassBadge>
            </td>
            <td className="py-3.5 px-5 flex items-center gap-2">
              <button className="text-xs text-cyan-300 hover:text-cyan-200">Sửa</button>
              <span className="text-slate-600">•</span>
              <button className="text-xs text-rose-400 hover:text-rose-300">Xóa</button>
            </td>
          </>
        )}
      />
    </div>
  );
};

export default ProblemManager;
