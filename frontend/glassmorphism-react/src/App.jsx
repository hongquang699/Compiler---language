import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import AppRoutes from './routes/AppRoutes';
import './Glassmorphism.css';

function MainAppShell() {
  const { role, switchRole } = useAuth();
  const { currentTheme, themeMode, setThemeMode } = useTheme();

  return (
    <div className="relative min-h-screen bg-slate-950 font-sans overflow-x-hidden text-slate-100">
      {/* Dynamic Animated Aurora Ambient Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className={`absolute -top-32 -left-32 w-[550px] h-[550px] rounded-full bg-gradient-to-br ${currentTheme.orb1} blur-[130px] opacity-70 animate-float-slow transition-all duration-700`} />
        <div className={`absolute top-1/4 -right-20 w-[600px] h-[600px] rounded-full bg-gradient-to-tr ${currentTheme.orb2} blur-[140px] opacity-65 animate-float-reverse transition-all duration-700`} />
        <div className={`absolute -bottom-40 left-1/3 w-[700px] h-[700px] rounded-full bg-gradient-to-t ${currentTheme.orb3} blur-[150px] opacity-60 animate-pulse-glow transition-all duration-700`} />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      {/* Top Global Role & Theme Control Bar */}
      <div className="sticky top-0 z-50 flex items-center justify-between px-4 py-2 bg-slate-950/80 backdrop-blur-2xl border-b border-white/10 text-xs">
        <div className="flex items-center gap-3">
          <span className="text-slate-300 font-bold hidden sm:inline">Phân Hệ:</span>
          <div className="inline-flex p-0.5 rounded-xl bg-black/40 border border-white/10">
            <button
              onClick={() => switchRole('admin')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                role === 'admin'
                  ? 'bg-rose-500/30 text-rose-200 border border-rose-400/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              👑 Quản Trị (Admin)
            </button>
            <button
              onClick={() => switchRole('member')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                role === 'member'
                  ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🚀 Thành Viên (Member)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 hidden sm:inline">Theme:</span>
          {['aurora', 'cyber', 'deepsea'].map((t) => (
            <button
              key={t}
              onClick={() => setThemeMode(t)}
              className={`px-2 py-0.5 rounded-lg font-mono text-[11px] capitalize ${
                themeMode === t ? 'bg-white/20 text-white border border-white/20' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Main Routed Content */}
      <div className="relative z-10">
        <AppRoutes />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <MainAppShell />
      </ThemeProvider>
    </AuthProvider>
  );
}
