import React, { useState } from 'react';
import GlassCard from '../../components/common/GlassCard';
import GlassButton from '../../components/common/GlassButton';
import GlassBadge from '../../components/common/GlassBadge';

export const AdminConsole = () => {
  const [command, setCommand] = useState('');
  const [terminalOutput, setTerminalOutput] = useState([
    'Local-AI System Terminal v2.4.0 (x86_64-w64-mingw32)',
    'Type "help" to see available admin tools and commands.',
    '-------------------------------------------------------',
  ]);

  const handleRunCommand = (e) => {
    e.preventDefault();
    if (!command.trim()) return;

    const cmd = command.trim();
    let res = '';
    if (cmd === 'help') {
      res = 'Available commands: status, compile --check, flush-cache, sandbox --list, restart-ai';
    } else if (cmd === 'status') {
      res = 'System Status: HEALTHY | Active Sandboxes: 24 | Judge Queues: 0 pending';
    } else if (cmd === 'flush-cache') {
      res = 'Success: 142.5 MB sandbox temp binaries purged.';
    } else {
      res = `Executed: "${cmd}" -> Exit code 0 (Success)`;
    }

    setTerminalOutput((prev) => [...prev, `$ ${cmd}`, res]);
    setCommand('');
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-lg">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>💻 Bảng Điều Khiển Lệnh Hệ Thống (Admin Console)</span>
            <GlassBadge variant="emerald">TTY Active</GlassBadge>
          </h2>
          <p className="text-xs text-slate-400 mt-1">Truy cập trực tiếp shell Sandbox và các lệnh quản trị cấp thấp</p>
        </div>
      </div>

      <div className="rounded-3xl border border-white/15 bg-slate-950/80 backdrop-blur-2xl p-6 shadow-2xl flex flex-col font-mono text-xs text-indigo-100">
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/80" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
            <span className="text-slate-400 text-xs ml-2">root@local-ai: ~</span>
          </div>
          <span className="text-slate-500 text-[10px]">PowerShell / Bash</span>
        </div>

        <div className="min-h-[280px] max-h-[360px] overflow-y-auto flex flex-col gap-1.5 mb-4 pr-1 leading-relaxed">
          {terminalOutput.map((line, idx) => (
            <div key={idx} className={line.startsWith('$') ? 'text-cyan-300 font-bold' : line.startsWith('Success') ? 'text-emerald-300' : 'text-slate-300'}>
              {line}
            </div>
          ))}
        </div>

        <form onSubmit={handleRunCommand} className="flex items-center gap-2 pt-3 border-t border-white/10">
          <span className="text-rose-400 font-bold">$</span>
          <input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="Nhập lệnh (ví dụ: status, help, flush-cache)..."
            className="flex-1 bg-transparent text-white outline-none font-mono text-xs"
          />
          <GlassButton type="submit" variant="primary" size="sm">
            Thực Thi
          </GlassButton>
        </form>
      </div>
    </div>
  );
};

export default AdminConsole;
