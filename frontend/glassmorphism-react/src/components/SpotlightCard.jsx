import React, { useState, useRef } from 'react';

/**
 * Component SpotlightCard
 * Card kính mờ cao cấp với hiệu ứng "Spotlight" (Vùng sáng phát quang di chuyển theo con trỏ chuột).
 * Giúp bề mặt kính tương tác sống động, chân thực và rất mượt mà.
 */
export const SpotlightCard = ({
  children,
  className = '',
  spotlightColor = 'rgba(99, 102, 241, 0.18)', // Màu luồng sáng (Indigo/Cyan/...)
  spotlightRadius = 320,
  hoverLift = true,
  ...props
}) => {
  const cardRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        relative overflow-hidden rounded-3xl p-7
        bg-slate-900/40 backdrop-blur-2xl
        border border-white/10 hover:border-white/25
        shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]
        transition-all duration-300 ease-out
        ${hoverLift ? 'hover:-translate-y-1.5 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]' : ''}
        ${className}
      `}
      {...props}
    >
      {/* Dynamic Radial Spotlight Beam */}
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(${spotlightRadius}px circle at ${mousePos.x}px ${mousePos.y}px, ${spotlightColor}, transparent 80%)`,
        }}
      />

      {/* Spotlight Border Glint */}
      <div
        className="pointer-events-none absolute inset-0 rounded-3xl transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(${spotlightRadius * 0.75}px circle at ${mousePos.x}px ${mousePos.y}px, rgba(255,255,255,0.35), transparent 70%)`,
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          padding: '1px',
        }}
      />

      {/* Inner highlight rim */}
      <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />

      {/* Child Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default SpotlightCard;
