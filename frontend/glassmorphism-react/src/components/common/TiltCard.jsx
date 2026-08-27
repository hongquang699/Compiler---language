import React, { useState, useRef } from 'react';

/**
 * Component TiltCard
 * Card kính mờ với hiệu ứng nghiêng 3D (3D Parallax Tilt) theo chuyển động của chuột.
 * Kết hợp hiệu ứng ánh sáng phản chiếu đa chiều và đổ bóng mềm (soft shadows).
 */
export const TiltCard = ({
  children,
  className = '',
  maxTilt = 12,
  glare = true,
  glowColor = 'rgba(99, 102, 241, 0.25)',
  ...props
}) => {
  const cardRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -maxTilt;
    const rotateY = ((x - centerX) / centerX) * maxTilt;

    setTilt({ x: rotateX, y: rotateY });
    setGlarePos({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.8,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setGlarePos((prev) => ({ ...prev, opacity: 0 }));
  };

  return (
    <div
      style={{ perspective: 1000 }}
      className=inline-block w-full
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: otateX(deg) rotateY(deg) scale3d(1.02, 1.02, 1.02),
          transition: 'transform 0.15s ease-out, box-shadow 0.3s ease-out',
        }}
        className={
          relative overflow-hidden rounded-3xl p-6 sm:p-8
          bg-slate-900/40 backdrop-blur-2xl
          border border-white/15 hover:border-white/30
          shadow-[0_12px_40px_rgba(0,0,0,0.35)] hover:shadow-[0_25px_60px_rgba(0,0,0,0.55)]
          transform-gpu select-none
          
        }
        {...props}
      >
        {/* Specular Glare reflection layer */}
        {glare && (
          <div
            className=pointer-events-none absolute -inset-px transition-opacity duration-300 rounded-3xl
            style={{
              opacity: glarePos.opacity,
              background: adial-gradient(400px circle at % %, rgba(255,255,255,0.2), transparent 70%),
            }}
          />
        )}

        {/* Ambient Glow */}
        <div
          className=pointer-events-none absolute -inset-px transition-opacity duration-300 rounded-3xl
          style={{
            opacity: glarePos.opacity ? 0.6 : 0,
            background: adial-gradient(300px circle at % %, , transparent 80%),
          }}
        />

        {/* Top Rim Highlight */}
        <div className=absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent pointer-events-none />

        {/* Card Content */}
        <div className=relative z-10>{children}</div>
      </div>
    </div>
  );
};

export default TiltCard;
