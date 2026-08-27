import React, { useState } from 'react';
import GlassCard from '../../components/common/GlassCard';
import GlassButton from '../../components/common/GlassButton';
import GlassInput from '../../components/common/GlassInput';
import GlassBadge from '../../components/common/GlassBadge';

export const SystemConfig = () => {
  const [modelType, setModelType] = useState('DeepSeek-Coder-V2-Local');
  const [maxExecutionTime, setMaxExecutionTime] = useState('5.0');
  const [maxMemoryMB, setMaxMemoryMB] = useState('512');
  const [strictSandbox, setStrictSandbox] = useState(true);
  const [enableNetworkAccess, setEnableNetworkAccess] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Cấu Hình Trợ Lý AI & Hệ Thống Compiler</h2>
          <p className="text-xs text-slate-400 mt-0.5">Tùy biến tham số runtime, sandbox cách ly và mô hình suy luận</p>
        </div>
        <GlassButton variant="primary" size="md" onClick={handleSave}>
          {savedSuccess ? '✓ Đã Lưu Cấu Hình' : 'Lưu Thay Đổi'}
        </GlassButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* AI Model Settings */}
        <GlassCard className="p-6 flex flex-col gap-4" glowColor="indigo">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>🧠 Mô Hình AI Lập Trình</span>
            </h3>
            <GlassBadge variant="indigo">Local Offline</GlassBadge>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-300">Chọn Mô Hình Suy Luận Cốt Lõi:</label>
            <select
              value={modelType}
              onChange={(e) => setModelType(e.target.value)}
              className="w-full bg-slate-950/50 backdrop-blur-xl border border-white/15 text-slate-100 rounded-2xl text-sm py-2.5 px-3.5 outline-none focus:border-indigo-400/60"
            >
              <option value="DeepSeek-Coder-V2-Local">DeepSeek-Coder-V2 (Chuyên C++/Thuật toán)</option>
              <option value="Qwen-2.5-Coder-7B">Qwen-2.5-Coder-7B (Tối ưu phản hồi nhanh)</option>
              <option value="Llama-3-Code-8B">Llama-3-Code-8B (Tư duy giải thích logic)</option>
            </select>
          </div>

          <GlassInput
            label="Nhiệt Độ Sinh Mã (Temperature: 0.0 - 1.0)"
            defaultValue="0.2"
            type="number"
            step="0.05"
            min="0"
            max="1"
          />

          <GlassInput
            label="Ngưỡng Token Tối Đa Mỗi Lần Phân Tích"
            defaultValue="4096"
            type="number"
          />
        </GlassCard>

        {/* Sandbox & Resource Limits */}
        <GlassCard className="p-6 flex flex-col gap-4" glowColor="cyan">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>⚡ Giới Hạn Tài Nguyên Sandbox</span>
            </h3>
            <GlassBadge variant="cyan">Bảo Mật Cao</GlassBadge>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <GlassInput
              label="Thời Gian Tối Đa (Giây)"
              value={maxExecutionTime}
              onChange={(e) => setMaxExecutionTime(e.target.value)}
              type="number"
            />
            <GlassInput
              label="Bộ Nhớ RAM Tối Đa (MB)"
              value={maxMemoryMB}
              onChange={(e) => setMaxMemoryMB(e.target.value)}
              type="number"
            />
          </div>

          {/* Toggle options */}
          <div className="flex flex-col gap-3 pt-2">
            <label className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.04] border border-white/10 cursor-pointer">
              <span className="text-xs font-semibold text-slate-200">Bật Cách Ly Sandbox Cực Đoan (Strict Seccomp)</span>
              <input
                type="checkbox"
                checked={strictSandbox}
                onChange={(e) => setStrictSandbox(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.04] border border-white/10 cursor-pointer">
              <span className="text-xs font-semibold text-slate-200">Cho Phép Bài Tập Kết Nối Mạng (Network Access)</span>
              <input
                type="checkbox"
                checked={enableNetworkAccess}
                onChange={(e) => setEnableNetworkAccess(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-500"
              />
            </label>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default SystemConfig;
