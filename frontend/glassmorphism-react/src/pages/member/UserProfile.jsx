import React, { useState } from 'react';
import ProfileSidebar from './profile/ProfileSidebar';
import ProfileBio from './profile/ProfileBio';
import ProfileHeatmap from './profile/ProfileHeatmap';
import ProfileSolvedList from './profile/ProfileSolvedList';
import ProfileEditForm from './profile/ProfileEditForm';

export const UserProfile = ({
  username = "vohongquang",
  avatarUrl = "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&auto=format&fit=crop&q=80",
  bio = "Người đam mê về lịch sử Việt Nam",
  solvedCount = 562,
  rank = "#7",
  totalScore = 2232,
  onViewSubmissions,
}) => {
  const [activeTab, setActiveTab] = useState('about'); // 'about' | 'problems' | 'edit'

  return (
    <div className="w-full flex flex-col gap-6 max-w-6xl mx-auto">
      
      {/* 1. Header Topbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900/40 backdrop-blur-2xl border border-white/10 shadow-lg">
        <div>
          <div className="text-[11px] font-mono text-indigo-300 font-bold uppercase tracking-wider mb-0.5">
            WORKSPACE
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Tài khoản của tôi
          </h1>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/40 border border-white/10">
          <button
            onClick={() => setActiveTab('about')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'about'
                ? 'bg-white/20 text-white shadow-sm border border-white/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>👤</span> Giới thiệu
          </button>
          <button
            onClick={() => setActiveTab('problems')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'problems'
                ? 'bg-white/20 text-white shadow-sm border border-white/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>⭐</span> Bài tập
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'edit'
                ? 'bg-white/20 text-white shadow-sm border border-white/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>✏️</span> Chỉnh sửa tiểu sử
          </button>
        </div>
      </div>

      {/* 2. Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (4 cols) */}
        <div className="lg:col-span-4">
          <ProfileSidebar
            username={username}
            avatarUrl={avatarUrl}
            solvedCount={solvedCount}
            rank={rank}
            totalScore={totalScore}
            onViewSubmissions={onViewSubmissions}
          />
        </div>

        {/* Right Column (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {activeTab === 'about' && (
            <>
              <ProfileBio bio={bio} />
              <ProfileHeatmap totalSubmissions={2423} />
            </>
          )}

          {activeTab === 'problems' && (
            <ProfileSolvedList solvedList={[]} />
          )}

          {activeTab === 'edit' && (
            <ProfileEditForm
              initialBio={bio}
              onSave={(updated) => alert('Cập nhật profile thành công!')}
            />
          )}
        </div>

      </div>

    </div>
  );
};

export default UserProfile;
