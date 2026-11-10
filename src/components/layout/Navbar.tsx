import React from 'react';
import { Heart, ShieldAlert, Sparkles, User, MessageCircle, LogOut, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
  currentTab?: string;
  onNavigate?: (tab: string) => void;
  onOpenLegal?: (type: 'terms' | 'privacy' | 'guidelines' | 'contact') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onNavigate, onOpenLegal }) => {
  const { user, logout } = useAuth();

  const isApproved = user?.verificationStatus === 'APPROVED' || user?.role === 'FOUNDER';
  const isFounder = user?.role === 'FOUNDER';

  return (
    <header className="sticky top-0 z-40 bg-[#09090D]/85 backdrop-blur-md border-b border-[#272732]">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo Branding */}
        <button
          onClick={() => onNavigate && onNavigate(user ? (isFounder ? 'admin' : (isApproved ? 'discover' : 'pending')) : 'landing')}
          className="flex items-center gap-2.5 text-left focus:outline-none"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#E74763] to-[#A72E48] flex items-center justify-center shadow-[0_0_20px_rgba(231,71,99,0.35)]">
            <Heart className="w-4 h-4 text-white fill-white" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white via-neutral-200 to-[#E74763]">
              PCTE MATCH
            </span>
            <span className="block text-[9px] text-[#A1A1AA] font-medium leading-none">
              Verified Campus Dating
            </span>
          </div>
        </button>

        {/* Desktop Nav Links */}
        {user && isApproved && onNavigate && (
          <nav className="hidden md:flex items-center gap-1 bg-[#111118] p-1 rounded-2xl border border-[#272732]">
            <button
              onClick={() => onNavigate('discover')}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                currentTab === 'discover'
                  ? 'bg-[#E74763] text-white shadow-[0_0_15px_rgba(231,71,99,0.3)]'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              Discover
            </button>
            <button
              onClick={() => onNavigate('matches')}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                currentTab === 'matches'
                  ? 'bg-[#E74763] text-white shadow-[0_0_15px_rgba(231,71,99,0.3)]'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              Matches & Chat
            </button>
            <button
              onClick={() => onNavigate('profile')}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                currentTab === 'profile'
                  ? 'bg-[#E74763] text-white shadow-[0_0_15px_rgba(231,71,99,0.3)]'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              My Profile
            </button>
            {isFounder && (
              <button
                onClick={() => onNavigate('admin')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  currentTab === 'admin'
                    ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(217,119,6,0.3)]'
                    : 'text-amber-400 hover:text-white'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Founder Admin</span>
              </button>
            )}
          </nav>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-2.5">
          {user ? (
            <div className="flex items-center gap-2">
              {isFounder && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-bold text-amber-400">
                  <ShieldAlert className="w-3 h-3" />
                  FOUNDER
                </span>
              )}
              {isApproved && !isFounder && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#31C48D]/10 border border-[#31C48D]/30 text-[10px] font-bold text-[#31C48D]">
                  <CheckCircle2 className="w-3 h-3" />
                  VERIFIED 18+
                </span>
              )}

              <button
                onClick={() => logout()}
                className="p-2 rounded-xl bg-[#191922] hover:bg-[#111118] border border-[#272732] text-[#A1A1AA] hover:text-white transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate && onNavigate('login')}
                className="px-3.5 py-2 text-xs font-semibold text-[#A1A1AA] hover:text-white transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => onNavigate && onNavigate('register')}
                className="px-4 py-2 text-xs font-bold rounded-full bg-gradient-to-r from-[#E74763] to-[#A72E48] text-white hover:brightness-110 shadow-[0_0_20px_rgba(231,71,99,0.35)] transition-all"
              >
                Apply to Join (18+)
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
