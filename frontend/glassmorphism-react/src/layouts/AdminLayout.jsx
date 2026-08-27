import React, { useState } from 'react';
import AdminSidebar from '../components/admin/AdminSidebar';
import AdminHeader from '../components/admin/AdminHeader';

export const AdminLayout = ({ children, activeTab, onTabChange }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 selection:bg-rose-500/30 selection:text-rose-200">
      {/* Admin Sidebar */}
      <AdminSidebar
        activeTab={activeTab}
        onTabChange={onTabChange}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Content Area */}
      <div
        className={`
          transition-all duration-300 ease-out
          ${isSidebarCollapsed ? 'lg:pl-28' : 'lg:pl-72'}
          p-4 sm:p-8 max-w-7xl mx-auto
        `}
      >
        <AdminHeader
          title={
            activeTab === 'dashboard' ? 'Tổng Quan Hệ Thống' :
            activeTab === 'users' ? 'Quản Lý Người Dùng & Quyền Hạn' :
            activeTab === 'compiler' ? 'Compiler Engine & Sandbox Judge' :
            activeTab === 'security' ? 'Nhật Ký An Ninh & Cách Ly' :
            'Cấu Hình Tham Số Hệ Thống'
          }
          breadcrumb={`Admin / ${activeTab.toUpperCase()}`}
        />

        <main>{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
