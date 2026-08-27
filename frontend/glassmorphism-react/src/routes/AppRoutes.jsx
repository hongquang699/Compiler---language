import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AdminLayout from '../layouts/AdminLayout';
import MemberLayout from '../layouts/MemberLayout';

// Admin Pages
import AdminDashboard from '../pages/admin/AdminDashboard';
import ProblemManager from '../pages/admin/ProblemManager';
import ContestManager from '../pages/admin/ContestManager';
import GitSync from '../pages/admin/GitSync';
import AdminConsole from '../pages/admin/AdminConsole';
import SystemConfig from '../pages/admin/SystemConfig';

// Member Pages
import MemberDashboard from '../pages/member/MemberDashboard';
import ProblemList from '../pages/member/ProblemList';
import ContestList from '../pages/member/ContestList';
import CompilerIDE from '../pages/member/CompilerIDE';
import SubmissionList from '../pages/member/SubmissionList';
import Leaderboard from '../pages/member/Leaderboard';
import AgentChat from '../pages/member/AgentChat';
import CodeVault from '../pages/member/CodeVault';
import UserProfile from '../pages/member/UserProfile';

// Auth Pages
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';

export const AppRoutes = () => {
  const { role, switchRole } = useAuth();
  
  // Navigation states
  const [adminRoute, setAdminRoute] = useState('dashboard');
  const [memberRoute, setMemberRoute] = useState('dashboard');
  const [authView, setAuthView] = useState(null); // 'login' | 'register' | null

  // If Auth page is active
  if (authView === 'login') {
    return (
      <Login
        onNavigateRegister={() => setAuthView('register')}
        onLoginSuccess={() => setAuthView(null)}
      />
    );
  }

  if (authView === 'register') {
    return (
      <Register
        onNavigateLogin={() => setAuthView('login')}
      />
    );
  }

  // Admin Portal
  if (role === 'admin') {
    return (
      <AdminLayout activeTab={adminRoute} onTabChange={setAdminRoute}>
        {adminRoute === 'dashboard' && <AdminDashboard />}
        {adminRoute === 'problems' && <ProblemManager />}
        {adminRoute === 'contests' && <ContestManager />}
        {adminRoute === 'gitsync' && <GitSync />}
        {adminRoute === 'console' && <AdminConsole />}
        {adminRoute === 'config' && <SystemConfig />}
        {adminRoute === 'users' && <AdminDashboard />}
      </AdminLayout>
    );
  }

  // Member Portal
  return (
    <MemberLayout activeTab={memberRoute} onTabChange={setMemberRoute}>
      {memberRoute === 'dashboard' && (
        <MemberDashboard onOpenIDE={() => setMemberRoute('ide')} />
      )}
      {memberRoute === 'problems' && (
        <ProblemList onSelectProblem={() => setMemberRoute('ide')} />
      )}
      {memberRoute === 'contests' && <ContestList />}
      {memberRoute === 'ide' && <CompilerIDE />}
      {memberRoute === 'submissions' && <SubmissionList />}
      {memberRoute === 'leaderboard' && <Leaderboard />}
      {memberRoute === 'agent' && <AgentChat />}
      {memberRoute === 'vault' && <CodeVault />}
      {memberRoute === 'profile' && (
        <UserProfile onViewSubmissions={() => setMemberRoute('submissions')} />
      )}
    </MemberLayout>
  );
};

export default AppRoutes;
