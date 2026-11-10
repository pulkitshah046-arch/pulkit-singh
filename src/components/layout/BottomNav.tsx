import React from 'react';
import { Sparkles, Heart, MessageCircle, User, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface BottomNavProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  unreadCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onNavigate, unreadCount = 0 }) => {
  const { user } = useAuth();

  if (!user || (user.verificationStatus !== 'APPROVED' && user.role !== 'FOUNDER')) {
    return null;
  }

  const isFounder = user.role === 'FOUNDER';

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#111118]/95 backdrop-blur-lg border-t border-[#272732] px-6 py-2.5">
      <div className="flex items-center justify-around max-w-md mx-auto">
        <button
          onClick={() => onNavigate('discover')}
          className={`flex flex-col items-center gap-1 transition-all ${
            currentTab === 'discover' ? 'text-[#E74763]' : 'text-[#A1A1AA] hover:text-white'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Discover</span>
        </button>

        <button
          onClick={() => onNavigate('matches')}
          className={`relative flex flex-col items-center gap-1 transition-all ${
            currentTab === 'matches' || currentTab === 'chat' ? 'text-[#E74763]' : 'text-[#A1A1AA] hover:text-white'
          }`}
        >
          <div className="relative">
            <Heart className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-2 w-4 h-4 bg-[#E74763] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-semibold">Matches</span>
        </button>

        <button
          onClick={() => onNavigate('profile')}
          className={`flex flex-col items-center gap-1 transition-all ${
            currentTab === 'profile' ? 'text-[#E74763]' : 'text-[#A1A1AA] hover:text-white'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Profile</span>
        </button>

        {isFounder && (
          <button
            onClick={() => onNavigate('admin')}
            className={`flex flex-col items-center gap-1 transition-all ${
              currentTab === 'admin' ? 'text-amber-400' : 'text-[#A1A1AA] hover:text-white'
            }`}
          >
            <ShieldAlert className="w-5 h-5" />
            <span className="text-[10px] font-semibold">Founder</span>
          </button>
        )}
      </div>
    </div>
  );
};
