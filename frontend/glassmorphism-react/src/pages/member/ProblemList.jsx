import React, { useState } from 'react';
import GlassCard from '../../components/common/GlassCard';
import GlassButton from '../../components/common/GlassButton';
import GlassBadge from '../../components/common/GlassBadge';
import GlassTable from '../../components/common/GlassTable';
import GlassInput from '../../components/common/GlassInput';

export const ProblemList = ({ onSelectProblem }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [selectedTopic, setSelectedTopic] = useState('All');

  const problems = [
    { id: 1001, title: 'Dãy Con Tăng Dài Nhất (LIS)', difficulty: 'Medium', topic: 'Quy hoạch động', solvedRate: '68.4%', acCount: 1420, status: 'AC' },
    { id: 1002, title: 'Đường Đi Ngắn Nhất Dijkstra', difficulty: 'Medium', topic: 'Đồ thị', solvedRate: '72.1%', acCount: 1890, status: 'AC' },
    { id: 1003, title: 'Cây Phân Đoạn (Segment Tree) Lazy Update', difficulty: 'Hard', topic: 'Cấu trúc dữ liệu', solvedRate: '34.2%', acCount: 650, status: 'Attempted' },
    { id: 1004, title: 'Luồng Cực Đại Dinic Algorithm', difficulty: 'Hard', topic: 'Mạng luồng', solvedRate: '28.9%', acCount: 410, status: 'Todo' },
    { id: 1005, title: 'Tìm Kiếm Nhị Phân Nâng Cao', difficulty: 'Easy', topic: 'Tìm kiếm', solvedRate: '88.5%', acCount: 3200, status: 'AC' },
    { id: 1006, title: 'Bao Lồi Convex Hull (Graham Scan)', difficulty: 'Hard', topic: 'Hình học', solvedRate: '41.0%', acCount: 530, status: 'Todo' },
  ];

  const filtered = problems.filter((p) => {
    const matchSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || p.id.toString().includes(searchTerm);
    const matchDiff = selectedDifficulty === 'All' || p.difficulty === selectedDifficulty;
    const matchTopic = selectedTopic === 'All' || p.topic === selectedTopic;
    return matchSearch && matchDiff && matchTopic;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header & Filter Bar */}
      <GlassCard className="p-6 flex flex-col gap-4" glowColor="cyan">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>📚 Kho Bài Tập Luyện Thuật Toán</span>
              <GlassBadge variant="cyan">{filtered.length} Bài Tập</GlassBadge>
            </h2>
            <p className="text-xs text-slate-400 mt-1">Các bài tập chuẩn Olympic và Competitive Programming hỗ trợ AI chấm điểm</p>
          </div>
          <GlassButton variant="primary" size="sm">
            🎲 Bài Tập Ngẫu Nhiên
          </GlassButton>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <GlassInput
            placeholder="Tìm theo tên bài hoặc ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="bg-slate-950/60 border border-white/15 text-slate-200 text-xs font-semibold rounded-2xl py-2 px-3 outline-none"
          >
            <option value="All">Tất cả độ khó</option>
            <option value="Easy">Dễ (Easy)</option>
            <option value="Medium">Trung bình (Medium)</option>
            <option value="Hard">Khó (Hard)</option>
          </select>

          <select
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            className="bg-slate-950/60 border border-white/15 text-slate-200 text-xs font-semibold rounded-2xl py-2 px-3 outline-none"
          >
            <option value="All">Tất cả chủ đề</option>
            <option value="Quy hoạch động">Quy hoạch động</option>
            <option value="Đồ thị">Đồ thị</option>
            <option value="Cấu trúc dữ liệu">Cấu trúc dữ liệu</option>
            <option value="Mạng luồng">Mạng luồng</option>
            <option value="Hình học">Hình học</option>
          </select>
        </div>
      </GlassCard>

      {/* Problems Table */}
      <GlassTable
        headers={['Trạng thái', 'ID', 'Tên bài toán', 'Chủ đề', 'Độ khó', 'Tỷ lệ AC', 'Thao tác']}
        data={filtered}
        renderRow={(p, idx) => (
          <>
            <td className="py-3.5 px-5">
              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                p.status === 'AC' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                p.status === 'Attempted' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                'bg-white/5 text-slate-500 border border-white/10'
              }`}>
                {p.status === 'AC' ? '✓' : p.status === 'Attempted' ? '!' : '○'}
              </span>
            </td>
            <td className="py-3.5 px-5 font-mono text-xs text-slate-400">#{p.id}</td>
            <td className="py-3.5 px-5 font-bold text-white hover:text-cyan-300 cursor-pointer transition-colors" onClick={() => onSelectProblem && onSelectProblem(p)}>
              {p.title}
            </td>
            <td className="py-3.5 px-5">
              <span className="px-2.5 py-1 rounded-xl bg-white/[0.06] text-slate-300 text-xs border border-white/10">
                {p.topic}
              </span>
            </td>
            <td className="py-3.5 px-5">
              <GlassBadge variant={p.difficulty === 'Easy' ? 'emerald' : p.difficulty === 'Medium' ? 'cyan' : 'rose'}>
                {p.difficulty}
              </GlassBadge>
            </td>
            <td className="py-3.5 px-5 text-xs text-slate-300 font-mono">
              {p.solvedRate} <span className="text-[10px] text-slate-500">({p.acCount})</span>
            </td>
            <td className="py-3.5 px-5">
              <GlassButton size="sm" variant="cyan" onClick={() => onSelectProblem && onSelectProblem(p)}>
                Giải Bài →
              </GlassButton>
            </td>
          </>
        )}
      />
    </div>
  );
};

export default ProblemList;
