import React, { useState } from 'react';
import GlassCard from '../../../components/common/GlassCard';
import GlassButton from '../../../components/common/GlassButton';

export const ProfileEditForm = ({
  initialBio = "Người đam mê về lịch sử Việt Nam",
  initialFullname = "Võ Hồng Quang",
  initialTimezone = "Ho_Chi_Minh",
  initialLanguage = "C++17",
  initialTheme = "Github",
  onSave,
}) => {
  const [bio, setBio] = useState(initialBio);
  const [fullname, setFullname] = useState(initialFullname);
  const [timezone, setTimezone] = useState(initialTimezone);
  const [language, setLanguage] = useState(initialLanguage);
  const [theme, setTheme] = useState(initialTheme);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSave) onSave({ bio, fullname, timezone, language, theme });
  };

  return (
    <GlassCard className="p-6 flex flex-col gap-5">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        
        {/* 1. Mô tả bản thân */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Mô tả bản thân:
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={5}
            placeholder="Nhập mô tả hoặc tiểu sử giới thiệu của bạn..."
            className="w-full p-4 rounded-2xl bg-black/40 border border-white/15 text-sm text-white focus:border-indigo-400 outline-none transition-colors"
          />
        </div>

        {/* 2. Cài đặt chi tiết */}
        <div className="p-4 rounded-2xl bg-black/30 border border-white/10 flex flex-col gap-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Tên đầy đủ:</span>
            <input
              type="text"
              value={fullname}
              onChange={(e) => setFullname(e.target.value)}
              className="sm:col-span-2 p-2.5 rounded-xl bg-black/40 border border-white/15 text-white font-medium outline-none focus:border-indigo-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Múi giờ:</span>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="sm:col-span-2 p-2.5 rounded-xl bg-black/40 border border-white/15 text-white font-medium outline-none focus:border-indigo-400"
            >
              <option value="Ho_Chi_Minh">Ho_Chi_Minh (UTC+7)</option>
              <option value="Asia/Bangkok">Asia/Bangkok (UTC+7)</option>
              <option value="UTC">UTC (UTC+0)</option>
              <option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Ngôn ngữ:</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="sm:col-span-2 p-2.5 rounded-xl bg-black/40 border border-white/15 text-white font-medium outline-none focus:border-indigo-400"
            >
              <option value="C++17">C++17</option>
              <option value="C++20">C++20 (GCC)</option>
              <option value="Python 3.12">Python 3.12</option>
              <option value="Java 17">Java 17 (OpenJDK)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Giao diện code:</span>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="sm:col-span-2 p-2.5 rounded-xl bg-black/40 border border-white/15 text-white font-medium outline-none focus:border-indigo-400"
            >
              <option value="Github">Github</option>
              <option value="VS Code Dark">VS Code Dark</option>
              <option value="Monokai">Monokai</option>
              <option value="Dracula">Dracula</option>
            </select>
          </div>
        </div>

        {/* 3. Nút Lưu */}
        <div className="flex justify-end pt-2">
          <GlassButton type="submit" variant="primary" size="md" className="font-bold">
            Cập nhật profile
          </GlassButton>
        </div>

      </form>
    </GlassCard>
  );
};

export default ProfileEditForm;
