import React, { useState } from 'react';
import GlassCard from '../../components/common/GlassCard';
import GlassInput from '../../components/common/GlassInput';
import GlassButton from '../../components/common/GlassButton';
import AuthLayout from '../../layouts/AuthLayout';
import { useAuth } from '../../context/AuthContext';

export const Login = ({ onNavigateRegister, onLoginSuccess }) => {
  const { switchRole } = useAuth();
  const [email, setEmail] = useState('admin@local-ai.dev');
  const [password, setPassword] = useState('••••••••');
  const [selectedRole, setSelectedRole] = useState('admin');

  const handleSubmit = (e) => {
    e.preventDefault();
    switchRole(selectedRole);
    if (onLoginSuccess) onLoginSuccess(selectedRole);
  };

  return (
    <AuthLayout
      title="Đăng Nhập Local-AI"
      subtitle="Hệ thống trợ lý AI & Nền tảng luyện thuật toán cá nhân"
    >
      <GlassCard className="p-8" glowColor="indigo">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <GlassInput
            label="Địa chỉ Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            required
          />

          <GlassInput
            label="Mật khẩu"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nhập mật khẩu..."
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-300">Đăng nhập với vai trò:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedRole('admin')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                  selectedRole === 'admin'
                    ? 'bg-rose-500/20 text-rose-200 border-rose-400/40 shadow-sm'
                    : 'bg-white/[0.04] text-slate-400 border-white/10 hover:text-white'
                }`}
              >
                👑 Quản Trị (Admin)
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('member')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                  selectedRole === 'member'
                    ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40 shadow-sm'
                    : 'bg-white/[0.04] text-slate-400 border-white/10 hover:text-white'
                }`}
              >
                🚀 Thành Viên (Coder)
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded text-indigo-500" />
              Ghi nhớ đăng nhập
            </label>
            <a href="#forgot" className="text-indigo-300 hover:text-indigo-200">
              Quên mật khẩu?
            </a>
          </div>

          <GlassButton type="submit" variant="primary" size="lg" className="mt-2 w-full">
            Đăng Nhập Ngay
          </GlassButton>

          <div className="text-center text-xs text-slate-400 pt-3 border-t border-white/10">
            Chưa có tài khoản?{' '}
            <button
              type="button"
              onClick={onNavigateRegister}
              className="text-indigo-300 font-semibold hover:underline"
            >
              Đăng ký tài khoản mới
            </button>
          </div>
        </form>
      </GlassCard>
    </AuthLayout>
  );
};

export default Login;
