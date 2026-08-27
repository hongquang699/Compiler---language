import React, { useState } from 'react';
import GlassCard from '../../components/common/GlassCard';
import GlassBadge from '../../components/common/GlassBadge';
import GlassTable from '../../components/common/GlassTable';
import GlassButton from '../../components/common/GlassButton';

export const SubmissionList = () => {
  const [filterLang, setFilterLang] = useState('All');

  const submissions = [
    { id: '#10502', user: 'Hoà Bình', problem: 'Tìm Đường Đi Ngắn Nhất (Dijkstra)', lang: 'C++20', verdict: 'Accepted (100/100)', time: '12ms', memory: '2.4MB', submitAt: '2 phút trước' },
    { id: '#10501', user: 'Alex Nguyen', problem: 'Dãy Con Tăng Dài Nhất (LIS)', lang: 'Python 3.11', verdict: 'Time Limit Exceeded', time: '1004ms', memory: '14.1MB', submitAt: '8 phút trước' },
    { id: '#10499', user: 'Minh Quang', problem: 'Cây Phân Đoạn (Segment Tree)', lang: 'C++20', verdict: 'Accepted (100/100)', time: '48ms', memory: '8.2MB', submitAt: '15 phút trước' },
    { id: '#10495', user: 'Sarah Le', problem: 'Quy Hoạch Động Balo 0/1', lang: 'Java 21', verdict: 'Wrong Answer on Test 14', time: '110ms', memory: '28.5MB', submitAt: '35 phút trước' },
    { id: '#10490', user: 'Hoà Bình', problem: 'Bao Lồi Convex Hull (Graham Scan)', lang: 'C++20', verdict: 'Accepted (100/100)', time: '22ms', memory: '4.1MB', submitAt: '1 giờ trước' },
  ];

  const filtered = filterLang === 'All' ? submissions : submissions.filter((s) => s.lang.includes(filterLang));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-lg">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>⚡ Danh Sách Bài Nộp Hệ Thống (Submissions)</span>
            <GlassBadge variant="indigo">Live Feed</GlassBadge>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Theo dõi trạng thái chấm mã nguồn theo thời gian thực từ máy chủ Sandbox
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={filterLang}
            onChange={(e) => setFilterLang(e.target.value)}
            className="bg-slate-950/60 border border-white/15 text-slate-200 text-xs font-semibold rounded-2xl py-2 px-3 outline-none"
          >
            <option value="All">Mọi ngôn ngữ</option>
            <option value="C++">C++</option>
            <option value="Python">Python</option>
            <option value="Java">Java</option>
          </select>
        </div>
      </div>

      <GlassTable
        headers={['ID', 'Thí sinh', 'Bài toán', 'Ngôn ngữ', 'Kết quả chấm', 'Thời gian', 'Bộ nhớ', 'Thời điểm']}
        data={filtered}
        renderRow={(s, idx) => (
          <>
            <td className="py-3.5 px-5 font-mono text-xs text-indigo-300 font-semibold">{s.id}</td>
            <td className="py-3.5 px-5 font-bold text-white">{s.user}</td>
            <td className="py-3.5 px-5 text-slate-200">{s.problem}</td>
            <td className="py-3.5 px-5">
              <span className="px-2 py-0.5 rounded-lg bg-white/10 text-xs font-mono text-slate-300 border border-white/10">
                {s.lang}
              </span>
            </td>
            <td className="py-3.5 px-5">
              <GlassBadge
                variant={s.verdict.includes('Accepted') ? 'emerald' : s.verdict.includes('Wrong') ? 'rose' : 'amber'}
              >
                {s.verdict}
              </GlassBadge>
            </td>
            <td className="py-3.5 px-5 font-mono text-xs text-slate-300">{s.time}</td>
            <td className="py-3.5 px-5 font-mono text-xs text-slate-300">{s.memory}</td>
            <td className="py-3.5 px-5 text-xs text-slate-400">{s.submitAt}</td>
          </>
        )}
      />
    </div>
  );
};

export default SubmissionList;
