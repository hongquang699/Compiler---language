import React, { useState, useRef } from 'react';

export const SpotlightCard = ({
  children,
  className = '',
  spotlightColor = 'rgba(99, 102, 241, 0.22)',
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
        relative overflow-hidden rounded-3xl p-6
        bg-slate-900/50 backdrop-blur-2xl
        border border-white/10 hover:border-white/30
        shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]
        transition-all duration-300 ease-out
        ${hoverLift ? 'hover:-translate-y-1.5 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]' : ''}
        ${className}
      `}
      {...props}
    >
      {/* Radial Spotlight Follow */}
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(${spotlightRadius}px circle at ${mousePos.x}px ${mousePos.y}px, ${spotlightColor}, transparent 80%)`,
        }}
      />

      {/* Rim Glint */}
      <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />

      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default SpotlightCard;
