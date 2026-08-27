import React from 'react';
import MemberNavbar from '../components/member/MemberNavbar';

export const MemberLayout = ({ children, activeTab, onTabChange }) => {
  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Floating Member Navbar */}
      <MemberNavbar activeTab={activeTab} onTabChange={onTabChange} />

      {/* Main Content Area */}
      <main className="pt-28 pb-16 px-4 sm:px-6 max-w-6xl mx-auto">
        {children}
      </main>
    </div>
  );
};

export default MemberLayout;
