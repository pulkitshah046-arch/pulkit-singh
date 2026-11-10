import React from 'react';
import { Shield, Sparkles, User, Lock } from 'lucide-react';

interface AnonymousAvatarProps {
  photo?: string | null;
  nickname: string;
  gradient?: 'rose' | 'emerald' | 'cyan' | 'purple' | 'amber' | string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBadge?: boolean;
  className?: string;
}

export const AnonymousAvatar: React.FC<AnonymousAvatarProps> = ({
  photo,
  nickname,
  gradient = 'rose',
  size = 'md',
  showBadge = false,
  className = '',
}) => {
  const [imageError, setImageError] = React.useState(false);

  const initial = (nickname || 'A').charAt(0).toUpperCase();

  const gradientMap: Record<string, { bg: string; border: string; glow: string; text: string }> = {
    rose: {
      bg: 'from-[#E74763]/25 via-[#2A121A] to-[#120B0F]',
      border: 'border-[#E74763]/40',
      glow: 'shadow-[0_0_20px_rgba(231,71,99,0.25)]',
      text: 'text-[#E74763]',
    },
    emerald: {
      bg: 'from-[#31C48D]/25 via-[#0E241A] to-[#0A140F]',
      border: 'border-[#31C48D]/40',
      glow: 'shadow-[0_0_20px_rgba(49,196,141,0.25)]',
      text: 'text-[#31C48D]',
    },
    cyan: {
      bg: 'from-cyan-500/25 via-[#0A2229] to-[#081216]',
      border: 'border-cyan-500/40',
      glow: 'shadow-[0_0_20px_rgba(6,182,212,0.25)]',
      text: 'text-cyan-400',
    },
    purple: {
      bg: 'from-purple-500/25 via-[#221233] to-[#110A1A]',
      border: 'border-purple-500/40',
      glow: 'shadow-[0_0_20px_rgba(168,85,247,0.25)]',
      text: 'text-purple-400',
    },
    amber: {
      bg: 'from-amber-500/25 via-[#2E1F0A] to-[#140D04]',
      border: 'border-amber-500/40',
      glow: 'shadow-[0_0_20px_rgba(245,158,11,0.25)]',
      text: 'text-amber-400',
    },
  };

  const style = gradientMap[gradient] || gradientMap.rose;

  const sizeClasses = {
    sm: 'w-10 h-10 text-xs rounded-xl',
    md: 'w-14 h-14 text-sm rounded-2xl',
    lg: 'w-20 h-20 text-xl rounded-3xl',
    xl: 'w-full h-full text-5xl rounded-3xl',
  }[size];

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-16 h-16',
  }[size];

  if (photo && !imageError) {
    return (
      <div className={`relative overflow-hidden ${sizeClasses} ${className} border border-[#272732]`}>
        <img
          src={photo}
          alt={nickname}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover"
        />
        {showBadge && (
          <span className="absolute bottom-1 right-1 p-0.5 rounded-full bg-[#111118] border border-[#31C48D] text-[#31C48D]">
            <Shield className="w-2.5 h-2.5" />
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative flex flex-col items-center justify-center bg-gradient-to-br ${style.bg} border ${style.border} ${style.glow} ${sizeClasses} ${className} select-none`}
    >
      {/* Decorative ambient subtle stars / dots */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.06),transparent_70%)] pointer-events-none" />

      <div className="relative flex flex-col items-center justify-center">
        <span className={`font-black tracking-wider ${style.text}`}>
          {initial}
        </span>
        {size === 'xl' && (
          <div className="mt-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 border border-white/10 text-[11px] font-semibold text-[#A1A1AA]">
            <Lock className="w-3 h-3 text-[#E74763]" />
            <span>Anonymous Profile</span>
          </div>
        )}
      </div>

      {showBadge && (
        <span className="absolute bottom-1.5 right-1.5 p-0.5 rounded-full bg-[#111118] border border-[#31C48D] text-[#31C48D]">
          <Shield className="w-2.5 h-2.5" />
        </span>
      )}
    </div>
  );
};
