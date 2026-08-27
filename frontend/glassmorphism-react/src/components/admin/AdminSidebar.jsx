import React from 'react';
import GlassBadge from '../common/GlassBadge';

export const AdminSidebar = ({ activeTab, onTabChange, isCollapsed, onToggleCollapse }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Tổng Quan Hệ Thống', icon: '📊', badge: 'Live' },
    { id: 'users', label: 'Quản Lý Người Dùng', icon: '👥', count: 128 },
    { id: 'compiler', label: 'Compiler Engine & Judge', icon: '⚙️', badge: '6 Cores' },
    { id: 'security', label: 'Bảo Mật & Nhật Ký', icon: '🛡️' },
    { id: 'config', label: 'Cấu Hình Hệ Thống', icon: '🔧' },
  ];

  return (
    <aside
      className={`
        fixed left-4 top-24 bottom-4 z-40
        ${isCollapsed ? 'w-20' : 'w-64'}
        transition-all duration-300 ease-out
        rounded-3xl bg-slate-900/50 backdrop-blur-2xl border border-white/10
        shadow-[0_12px_40px_rgba(0,0,0,0.4)] flex flex-col p-4
        hidden lg:flex
      `}
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4 px-2">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <span className="text-xs font-bold uppercase tracking-wider text-rose-300">
              Admin Portal
            </span>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-colors ml-auto"
          title="Thu gọn / Mở rộng"
        >
          {isCollapsed ? '▶' : '◀'}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 flex flex-col gap-2 overflow-y-auto pr-1">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`
                relative flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-medium
                transition-all duration-200 group text-left
                ${
                  isActive
                    ? 'bg-white/[0.14] text-white border border-white/20 shadow-md shadow-black/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.06] border border-transparent'
                }
              `}
            >
              <span className="text-lg">{item.icon}</span>
              {!isCollapsed && (
                <span className="flex-1 truncate tracking-tight">{item.label}</span>
              )}
              {!isCollapsed && item.badge && (
                <GlassBadge variant={isActive ? 'emerald' : 'indigo'} dot={false}>
                  {item.badge}
                </GlassBadge>
              )}
              {!isCollapsed && item.count && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom System Status Pill */}
      {!isCollapsed && (
        <div className="pt-4 border-t border-white/10 mt-auto">
          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 font-bold text-xs">
              AI
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white truncate">Local Sandbox</div>
              <div className="text-[10px] text-emerald-400">100% Sẵn sàng</div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default AdminSidebar;
