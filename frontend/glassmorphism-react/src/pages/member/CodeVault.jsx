import React, { useState } from 'react';
import GlassCard from '../../components/common/GlassCard';
import GlassButton from '../../components/common/GlassButton';
import GlassBadge from '../../components/common/GlassBadge';
import SpotlightCard from '../../components/common/SpotlightCard';

export const CodeVault = () => {
  const [selectedTemplate, setSelectedTemplate] = useState('SegmentTree');

  const templates = {
    SegmentTree: {
      title: 'Segment Tree (Lazy Propagation)',
      category: 'Data Structure',
      lang: 'C++20',
      code: `struct SegmentTree {
    int n;
    vector<long long> tree, lazy;
    SegmentTree(int n) : n(n), tree(4 * n, 0), lazy(4 * n, 0) {}
    
    void push(int node, int l, int r) {
        if (lazy[node] != 0) {
            tree[node] += (r - l + 1) * lazy[node];
            if (l != r) {
                lazy[2 * node] += lazy[node];
                lazy[2 * node + 1] += lazy[node];
            }
            lazy[node] = 0;
        }
    }
};`,
    },
    DinicMaxFlow: {
      title: 'Dinic Max Flow O(V^2 E)',
      category: 'Graph / Network Flow',
      lang: 'C++20',
      code: `struct Dinic {
    struct Edge { int to; long long cap, flow; };
    vector<Edge> edges;
    vector<vector<int>> adj;
    vector<int> level, ptr;
    // Fast Dinic implementation...
};`,
    },
    MatrixExponentiation: {
      title: 'Nhân Ma Trận & Lũy Thừa Nhanh',
      category: 'Math & DP',
      lang: 'C++20',
      code: `using Matrix = vector<vector<long long>>;
Matrix multiply(const Matrix& A, const Matrix& B, long long mod) {
    int n = A.size();
    Matrix C(n, vector<long long>(n, 0));
    for (int i = 0; i < n; ++i)
        for (int k = 0; k < n; ++k)
            for (int j = 0; j < n; ++j)
                C[i][j] = (C[i][j] + A[i][k] * B[k][j]) % mod;
    return C;
}`,
    },
  };

  const current = templates[selectedTemplate] || templates.SegmentTree;

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-lg">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>🗄️ Kho Mã Nguồn Mẫu (Code Vault & Templates)</span>
            <GlassBadge variant="cyan">Standard Snippets</GlassBadge>
          </h2>
          <p className="text-xs text-slate-400 mt-1">Các thuật toán mẫu chuẩn bị sẵn để sao chép nhanh khi thi đấu</p>
        </div>
        <GlassButton variant="primary" size="sm">
          + Thêm Template Mới
        </GlassButton>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template List Sidebar */}
        <div className="flex flex-col gap-3">
          {Object.entries(templates).map(([key, item]) => (
            <SpotlightCard
              key={key}
              onClick={() => setSelectedTemplate(key)}
              className={`cursor-pointer p-4 transition-all ${
                selectedTemplate === key
                  ? 'border-indigo-400/60 bg-indigo-500/15 shadow-indigo-500/20'
                  : 'hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-white">{item.title}</span>
                <GlassBadge variant="indigo" dot={false}>{item.lang}</GlassBadge>
              </div>
              <span className="text-[11px] text-slate-400">{item.category}</span>
            </SpotlightCard>
          ))}
        </div>

        {/* Code Preview & Copy */}
        <GlassCard className="lg:col-span-2 p-6 flex flex-col justify-between" glowColor="indigo">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">{current.title}</h3>
                <span className="text-xs text-indigo-300 font-mono">{current.category} • {current.lang}</span>
              </div>
              <GlassButton
                variant="cyan"
                size="sm"
                onClick={() => {
                  navigator.clipboard && navigator.clipboard.writeText(current.code);
                  alert('Đã sao chép mã nguồn mẫu vào Clipboard!');
                }}
              >
                📋 Sao Chép Mã
              </GlassButton>
            </div>

            <pre className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 text-xs font-mono text-cyan-200 overflow-x-auto leading-relaxed">
              {current.code}
            </pre>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default CodeVault;
