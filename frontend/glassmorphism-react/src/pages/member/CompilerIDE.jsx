import React, { useState } from 'react';
import GlassCard from '../../components/common/GlassCard';
import GlassButton from '../../components/common/GlassButton';
import GlassBadge from '../../components/common/GlassBadge';

export const CompilerIDE = () => {
  const [selectedLang, setSelectedLang] = useState('cpp');
  const [code, setCode] = useState(`#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

// Giải thuật tìm dãy con tăng dài nhất O(N log N)
int lengthOfLIS(vector<int>& nums) {
    vector<int> tails;
    for (int x : nums) {
        auto it = lower_bound(tails.begin(), tails.end(), x);
        if (it == tails.end()) tails.push_back(x);
        else *it = x;
    }
    return tails.size();
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    int n;
    if (cin >> n) {
        vector<int> a(n);
        for (int i = 0; i < n; ++i) cin >> a[i];
        cout << lengthOfLIS(a) << "\\n";
    }
    return 0;
}`);

  const [inputVal, setInputVal] = useState("6\n10 9 2 5 3 7");
  const [outputVal, setOutputVal] = useState("3\n\n[Thời gian chạy: 2.1ms | Bộ nhớ: 1.4MB | Status: Accepted]");
  const [isRunning, setIsRunning] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("Trợ lý AI: Thuật toán đã tối ưu O(N log N) bằng binary search trên mảng tails. Không phát hiện rò rỉ bộ nhớ.");

  const handleRunCode = () => {
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
      setOutputVal("3\n\n[Biên dịch thành công | Thời gian: 1.8ms | Bộ nhớ: 1.2MB | Trạng thái: AC]");
      setAiSuggestion("AI Code Review: Mã nguồn C++20 rất sạch sẽ. Bạn có thể thêm 'const vector<int>& nums' để tránh sao chép dữ liệu không cần thiết.");
    }, 600);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* IDE Topbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-3xl bg-slate-900/50 backdrop-blur-2xl border border-white/10 shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-xl">⚡</span>
          <div>
            <h2 className="text-base font-bold text-white">Bài Toán: Dãy Con Tăng Dài Nhất (LIS)</h2>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Độ khó: Medium</span> • <span>Thời gian: 1.0s</span> • <span>Bộ nhớ: 256MB</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedLang}
            onChange={(e) => setSelectedLang(e.target.value)}
            className="bg-slate-950/60 backdrop-blur-md border border-white/15 text-slate-100 text-xs font-semibold rounded-2xl py-2 px-3 outline-none"
          >
            <option value="cpp">C++ 20 (GCC 13.2)</option>
            <option value="py">Python 3.11</option>
            <option value="java">Java 21 OpenJDK</option>
            <option value="rust">Rust 1.76</option>
          </select>

          <GlassButton
            variant="cyan"
            size="sm"
            onClick={handleRunCode}
            disabled={isRunning}
          >
            {isRunning ? '⏳ Đang Chấm...' : '▶ Chạy & Nộp Bài'}
          </GlassButton>
        </div>
      </div>

      {/* Editor & Output Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Code Editor Panel (2 cols) */}
        <div className="lg:col-span-2 rounded-3xl border border-white/10 bg-slate-950/70 backdrop-blur-2xl p-5 shadow-2xl flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="text-xs font-mono text-slate-400 ml-2">solution.cpp</span>
            </div>
            <GlassBadge variant="indigo">C++20 Strict</GlassBadge>
          </div>

          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            rows={16}
            className="w-full bg-transparent font-mono text-sm text-indigo-100 leading-relaxed outline-none resize-none selection:bg-indigo-500/40"
            spellCheck="false"
          />
        </div>

        {/* Testcases & AI Assistant Panel (1 col) */}
        <div className="flex flex-col gap-5">
          {/* Custom Input */}
          <GlassCard className="p-5" glowColor="cyan">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Dữ Liệu Đầu Vào (Custom Stdin)
            </div>
            <textarea
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              rows={3}
              className="w-full bg-black/40 border border-white/10 rounded-2xl p-3 text-xs font-mono text-cyan-200 outline-none resize-none"
            />
          </GlassCard>

          {/* Execution Output */}
          <GlassCard className="p-5 flex-1" glowColor="purple">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Kết Quả Thực Thi (Stdout)</span>
              <GlassBadge variant="emerald">Accepted</GlassBadge>
            </div>
            <pre className="w-full bg-black/40 border border-white/10 rounded-2xl p-3 text-xs font-mono text-emerald-300 whitespace-pre-wrap">
              {outputVal}
            </pre>
          </GlassCard>

          {/* AI Assistant Insight */}
          <GlassCard className="p-5" glowColor="indigo">
            <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <span>💡 Phân Tích & Gợi Ý Từ AI</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {aiSuggestion}
            </p>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default CompilerIDE;
