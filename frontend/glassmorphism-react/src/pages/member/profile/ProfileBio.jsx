import React from 'react';
import GlassCard from '../../../components/common/GlassCard';

export const ProfileBio = ({ bio = "Người đam mê về lịch sử Việt Nam" }) => {
  return (
    <GlassCard className="p-6" glowColor="rose">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
        Giới thiệu
      </h3>
      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
        <p className="text-sm font-medium text-rose-300 leading-relaxed">
          {bio}
        </p>
      </div>
    </GlassCard>
  );
};

export default ProfileBio;
