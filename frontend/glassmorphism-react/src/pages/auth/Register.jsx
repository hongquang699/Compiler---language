import React, { useState } from 'react';
import GlassCard from '../../components/common/GlassCard';
import GlassInput from '../../components/common/GlassInput';
import GlassButton from '../../components/common/GlassButton';
import AuthLayout from '../../layouts/AuthLayout';

export const Register = ({ onNavigateLogin }) => {
  const [fullname, setFullname] = useState('');
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = (e) => {
    e.preventDefault();
    alert('Đăng ký tài khoản thành công! Bạn có thể đăng nhập ngay.');
    onNavigateLogin();
  };

  return (
    <AuthLayout
      title="Tạo Tài Khoản Mới"
      subtitle="Tham gia cộng đồng lập trình thi đấu và hỗ trợ bởi AI"
    >
      <GlassCard className="p-8" glowColor="cyan">
        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <GlassInput
            label="Họ và Tên"
            value={fullname}
            onChange={(e) => setFullname(e.target.value)}
            placeholder="Ví dụ: Nguyễn Văn A"
            required
          />

          <GlassInput
            label="Tên người dùng (Handle)"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="@username"
            required
          />

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
            placeholder="Tối thiểu 8 ký tự..."
            required
          />

          <GlassButton type="submit" variant="cyan" size="lg" className="mt-2 w-full">
            Hoàn Tất Đăng Ký
          </GlassButton>

          <div className="text-center text-xs text-slate-400 pt-3 border-t border-white/10">
            Đã có tài khoản?{' '}
            <button
              type="button"
              onClick={onNavigateLogin}
              className="text-cyan-300 font-semibold hover:underline"
            >
              Đăng nhập tại đây
            </button>
          </div>
        </form>
      </GlassCard>
    </AuthLayout>
  );
};

export default Register;
