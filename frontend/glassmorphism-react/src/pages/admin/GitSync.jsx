import React, { useState } from 'react';
import GlassCard from '../../components/common/GlassCard';
import GlassButton from '../../components/common/GlassButton';
import GlassBadge from '../../components/common/GlassBadge';
import GlassInput from '../../components/common/GlassInput';

export const GitSync = () => {
  const [repoUrl, setRepoUrl] = useState('https://github.com/hongquang699/Compiler---language.git');
  const [branch, setBranch] = useState('main');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState([
    '[06:40:12] Git Fetch origin/main hoàn tất (2 commits mới)',
    '[06:40:15] Đồng bộ hóa 4 đề bài từ problems/directory',
    '[06:40:18] Đã cập nhật hash commit: a8f9c12',
  ]);

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setSyncLogs((prev) => [
        `[Vừa xong] Đồng bộ hóa thành công với ${branch}! Không có xung đột.`,
        ...prev,
      ]);
    }, 800);
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-lg">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>🐙 Đồng Bộ Hóa GitHub Repository (Git Sync)</span>
            <GlassBadge variant="cyan">Git Hub Connected</GlassBadge>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Tự động kéo đề bài, testcases và mã nguồn giải mẫu từ kho lưu trữ Git
          </p>
        </div>
        <GlassButton variant="primary" size="md" onClick={handleSync} disabled={isSyncing}>
          {isSyncing ? '⏳ Đang Đồng Bộ...' : '🔄 Đồng Bộ Ngay'}
        </GlassButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlassCard className="p-6 flex flex-col gap-4" glowColor="indigo">
          <h3 className="text-base font-bold text-white">Cấu Hình Kết Nối Git</h3>
          <GlassInput
            label="Repository URL"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
          />
          <GlassInput
            label="Nhánh (Branch)"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
          />
          <GlassInput
            label="GitHub Personal Access Token (PAT)"
            type="password"
            defaultValue="ghp_••••••••••••••••••••••••••••"
          />
        </GlassCard>

        <GlassCard className="p-6 flex flex-col justify-between" glowColor="cyan">
          <div>
            <h3 className="text-base font-bold text-white mb-2">Nhật Ký Đồng Bộ (Sync Logs)</h3>
            <div className="p-3 rounded-2xl bg-black/50 border border-white/10 font-mono text-xs text-cyan-200 flex flex-col gap-1.5 max-h-56 overflow-y-auto">
              {syncLogs.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
            </div>
          </div>
          <div className="pt-4 border-t border-white/10 mt-4 text-xs text-slate-400">
            Tự động đồng bộ mỗi 15 phút (Auto Webhook)
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default GitSync;
