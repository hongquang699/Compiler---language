import React from 'react';
import GlassButton from '../common/GlassButton';
import GlassBadge from '../common/GlassBadge';
import { useAuth } from '../../context/AuthContext';

export const AdminHeader = ({ title = "Bảng Quản Trị Hệ Thống", breadcrumb = "Admin / Dashboard" }) => {
  const { user, switchRole } = useAuth();

  return (
    <header className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-lg mb-6">
      <div>
        <div className="text-xs font-mono text-indigo-300 mb-1">{breadcrumb}</div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-3">
          <span>{title}</span>
          <GlassBadge variant="rose">Quản Trị Viên</GlassBadge>
        </h1>
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
        {/* Switch Role Quick Button for demo */}
        <button
          onClick={() => switchRole('member')}
          className="px-3.5 py-1.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-slate-200 transition-all flex items-center gap-1.5"
          title="Chuyển sang giao diện Member"
        >
          <span>🔄</span> Xem chế độ Member
        </button>

        {/* Admin Profile Pill */}
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl bg-slate-950/60 border border-white/15 backdrop-blur-md">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
            {user.avatar || 'AD'}
          </div>
          <div className="text-left">
            <div className="text-xs font-semibold text-white leading-tight">{user.name}</div>
            <div className="text-[10px] text-slate-400 leading-tight">Quyền Root</div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
