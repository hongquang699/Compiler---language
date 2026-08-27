import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // 'admin' | 'member' | 'guest'
  const [role, setRole] = useState('admin');
  const [user, setUser] = useState({
    name: 'Hoà Bình',
    email: 'admin@local-ai.dev',
    avatar: 'HB',
    rank: 'Grandmaster #1',
    rating: 2450,
    role: 'admin',
    lastLogin: 'Hôm nay lúc 06:48',
  });

  const switchRole = (newRole) => {
    setRole(newRole);
    if (newRole === 'admin') {
      setUser({
        name: 'Hoà Bình (Admin)',
        email: 'admin@local-ai.dev',
        avatar: 'HB',
        rank: 'System Architect',
        rating: 2999,
        role: 'admin',
        lastLogin: 'Vừa xong',
      });
    } else {
      setUser({
        name: 'Nguyễn Văn A (Member)',
        email: 'member@local-ai.dev',
        avatar: 'NA',
        rank: 'Master Coder',
        rating: 2150,
        role: 'member',
        lastLogin: '10 phút trước',
      });
    }
  };

  return (
    <AuthContext.Provider value={{ role, user, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
