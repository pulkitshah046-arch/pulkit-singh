import React from 'react';
import { Heart, Sparkles, MessageCircle, X, ShieldCheck, Lock } from 'lucide-react';
import { AnonymousAvatar } from './AnonymousAvatar';

interface MutualMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartChat: (conversationId?: string) => void;
  partner: {
    displayName: string;
    displayNickname?: string;
    photo?: string | null;
    photos?: string[];
    anonymousAvatarGradient?: string;
    course?: string;
    academicYear?: string;
  } | null;
}

export const MutualMatchModal: React.FC<MutualMatchModalProps> = ({
  isOpen,
  onClose,
  onStartChat,
  partner,
}) => {
  if (!isOpen || !partner) return null;

  const publicName = partner.displayNickname || partner.displayName;
  const partnerPhoto = partner.photo || (partner.photos && partner.photos[0]) || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative max-w-sm w-full bg-[#191922] border border-[#272732] rounded-3xl p-6 text-center shadow-[0_0_50px_rgba(231,71,99,0.35)] overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-32 bg-[#E74763]/25 rounded-full blur-3xl pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-[#A1A1AA] hover:text-white bg-[#111118] border border-[#272732] z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Floating Heart Sparks */}
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-[#E74763] to-[#A72E48] flex items-center justify-center shadow-[0_0_30px_rgba(231,71,99,0.5)] mb-3">
          <Heart className="w-7 h-7 text-white fill-white animate-bounce" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-1">
          It's a Match!
        </h2>
        <p className="text-xs text-[#A1A1AA] max-w-xs mx-auto mb-4">
          You and <span className="text-white font-bold">{publicName}</span> both liked each other!
        </p>

        {/* Mandatory Privacy Indicator */}
        <div className="mb-5 p-3 rounded-2xl bg-[#111118] border border-[#272732] text-left flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[#31C48D] shrink-0 mt-0.5" />
          <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
            Both students are PCTE-verified. Personal identities remain private unless voluntarily revealed.
          </p>
        </div>

        {/* Partner Card Snippet */}
        <div className="relative mx-auto w-32 h-44 rounded-2xl overflow-hidden border-2 border-[#E74763] shadow-[0_0_25px_rgba(231,71,99,0.4)] mb-5">
          <AnonymousAvatar
            photo={partnerPhoto}
            nickname={publicName}
            gradient={partner.anonymousAvatarGradient || 'rose'}
            size="xl"
            className="w-full h-full"
          />
          <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black via-black/80 to-transparent text-left">
            <span className="font-bold text-xs text-white block truncate">{publicName}</span>
            <span className="text-[10px] text-[#A1A1AA] block truncate">{partner.course || 'Verified Student'}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <button
            onClick={() => onStartChat()}
            className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#E74763] to-[#A72E48] hover:brightness-110 text-white font-bold text-xs transition-all shadow-[0_0_25px_rgba(231,71,99,0.4)] flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4 fill-white" />
            <span>Send Anonymous Message</span>
          </button>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-full bg-[#111118] hover:bg-[#191922] border border-[#272732] text-[#A1A1AA] hover:text-white text-xs font-semibold transition-colors"
          >
            Keep Swiping
          </button>
        </div>
      </div>
    </div>
  );
};
