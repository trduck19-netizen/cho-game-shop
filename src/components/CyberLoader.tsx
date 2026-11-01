import React from 'react';

export interface CyberLoaderProps {
  title?: string;
  subText?: string;
  size?: number;
  avatarSize?: number;
  isOverlay?: boolean;
  className?: string;
}

export const CyberLoader: React.FC<CyberLoaderProps> = ({
  title = 'CODE GAME',
  subText,
  size = 180,
  avatarSize,
  isOverlay = false,
  className = '',
}) => {
  const calcAvatarSize = avatarSize || Math.round(size * 0.6);
  const letters = title.split('');

  const content = (
    <div className={`flex flex-col items-center justify-center gap-4 text-center select-none ${className}`}>
      {/* 3D Glowing Ring & Center Avatar */}
      <div
        className="loader-wrapper"
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        <div className="loader" />
        <div
          className="loader-center-avatar"
          style={{ width: `${calcAvatarSize}px`, height: `${calcAvatarSize}px` }}
        >
          <img
            src="/brand_loader_logo.jpg"
            alt="Code Game Logo"
            className="w-full h-full object-cover rounded-full"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.src = '/favicon.png';
            }}
          />
        </div>
      </div>

      {/* Bouncing neon letters */}
      {title && (
        <div className="flex items-center justify-center gap-0.5 sm:gap-1 text-sm sm:text-base font-extrabold text-white tracking-widest font-display drop-shadow-[0_0_12px_rgba(139,92,246,0.6)]">
          {letters.map((char, idx) => (
            <span
              key={idx}
              className="loader-letter inline-block"
              style={{ animationDelay: `${(idx % 12) * 0.1}s` }}
            >
              {char === ' ' ? '\u00A0' : char}
            </span>
          ))}
        </div>
      )}

      {/* Subtitle / Status details */}
      {subText && (
        <p className="text-xs sm:text-sm text-slate-300/90 font-medium max-w-xs leading-relaxed animate-pulse">
          {subText}
        </p>
      )}
    </div>
  );

  if (isOverlay) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in pointer-events-auto">
        {content}
      </div>
    );
  }

  return content;
};
