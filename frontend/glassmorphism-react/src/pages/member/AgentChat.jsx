import React, { useState } from 'react';
import GlassCard from '../../components/common/GlassCard';
import GlassButton from '../../components/common/GlassButton';
import GlassBadge from '../../components/common/GlassBadge';
import GlassInput from '../../components/common/GlassInput';

export const AgentChat = () => {
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: 'Xin chào Hoà Bình! Tôi là trợ lý AI chuyên về thuật toán & lập trình thi đấu. Bạn cần phân tích độ phức tạp, gỡ lỗi logic hay tạo bộ dữ liệu kiểm thử (Stress Test)?',
      time: '06:48',
    },
    {
      sender: 'user',
      text: 'Làm thế nào để tìm cầu và khớp trong đồ thị vô hướng trong O(V + E)?',
      time: '06:49',
    },
    {
      sender: 'ai',
      text: 'Bạn có thể sử dụng thuật toán DFS kết hợp mảng `num[]` (thứ tự duyệt) và `low[]` (thứ tự nhỏ nhất của đỉnh mà từ nhánh con có thể quay lại).\n\n• Cạnh `(u, v)` là cầu khi `low[v] > num[u]`.\n• Đỉnh `u` (không phải gốc cây DFS) là khớp khi có con `v` thỏa mãn `low[v] >= num[u]`.',
      codeSnippet: `void dfs(int u, int p = -1) {
    num[u] = low[u] = ++timer;
    int children = 0;
    for (int v : adj[u]) {
        if (v == p) continue;
        if (num[v]) {
            low[u] = min(low[u], num[v]);
        } else {
            dfs(v, u);
            low[u] = min(low[u], low[v]);
            if (low[v] > num[u]) bridges.push_back({u, v});
            if (low[v] >= num[u] && p != -1) is_cut[u] = true;
            ++children;
        }
    }
    if (p == -1 && children > 1) is_cut[u] = true;
}`,
      time: '06:50',
    },
  ]);

  const [inputMsg, setInputMsg] = useState('');

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    const userText = inputMsg;
    const newMsgList = [
      ...messages,
      { sender: 'user', text: userText, time: 'Vừa xong' },
    ];
    setMessages(newMsgList);
    setInputMsg('');

    setTimeout(() => {
      setMessages([
        ...newMsgList,
        {
          sender: 'ai',
          text: `Tôi đã nhận được câu hỏi về "${userText}". Đang phân tích AST và tra cứu thư viện thuật toán tối ưu...`,
          time: 'Vừa xong',
        },
      ]);
    }, 600);
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto h-[calc(100vh-180px)]">
      {/* Header */}
      <GlassCard className="p-4 flex items-center justify-between" glowColor="indigo">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500/40 to-purple-500/30 border border-white/20 flex items-center justify-center text-xl shadow-lg shadow-indigo-500/20">
            🤖
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>Trợ Lý Trí Tuệ Nhân Tạo Local-AI</span>
              <GlassBadge variant="emerald">Online 100% Offline</GlassBadge>
            </h2>
            <p className="text-xs text-slate-400">Chuyên sâu C++, Python, Java, Rust, Go và Tư duy logic</p>
          </div>
        </div>

        <GlassButton size="sm" variant="secondary">
          Xóa Cuộc Trò Chuyện
        </GlassButton>
      </GlassCard>

      {/* Chat Messages Log */}
      <GlassCard className="flex-1 p-6 overflow-y-auto flex flex-col gap-4" glowColor="cyan">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex flex-col max-w-[85%] ${
              m.sender === 'user' ? 'self-end items-end' : 'self-start items-start'
            }`}
          >
            <div
              className={`p-4 rounded-3xl backdrop-blur-xl border text-sm leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-indigo-600/30 border-indigo-400/40 text-white shadow-lg shadow-indigo-500/20 rounded-tr-sm'
                  : 'bg-slate-900/60 border-white/15 text-slate-200 shadow-lg shadow-black/30 rounded-tl-sm'
              }`}
            >
              <div className="whitespace-pre-wrap">{m.text}</div>
              {m.codeSnippet && (
                <div className="mt-3 p-3 rounded-2xl bg-black/50 border border-white/10 font-mono text-xs text-cyan-200 overflow-x-auto">
                  <pre>{m.codeSnippet}</pre>
                </div>
              )}
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-1 px-1">{m.time}</span>
          </div>
        ))}
      </GlassCard>

      {/* Message Input Box */}
      <form onSubmit={handleSendMessage} className="flex items-center gap-3">
        <GlassInput
          placeholder="Nhập câu hỏi thuật toán hoặc dán đoạn mã nguồn cần review..."
          value={inputMsg}
          onChange={(e) => setInputMsg(e.target.value)}
          className="py-3.5"
        />
        <GlassButton type="submit" variant="primary" size="lg">
          Gửi
        </GlassButton>
      </form>
    </div>
  );
};

export default AgentChat;
