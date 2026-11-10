import React, { useEffect, useState } from 'react';
import { Clock, ShieldCheck, AlertCircle, RefreshCw, LogOut, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface PendingVerificationPageProps {
  onNavigate: (tab: string) => void;
}

export const PendingVerificationPage: React.FC<PendingVerificationPageProps> = ({ onNavigate }) => {
  const { user, refreshUser, logout } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (user?.verificationStatus === 'APPROVED' || user?.role === 'FOUNDER') {
      onNavigate('discover');
    }
  }, [user, onNavigate]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshUser();
    setIsRefreshing(false);
  };

  const isRejected = user?.verificationStatus === 'REJECTED';

  return (
    <div className="min-h-screen bg-[#09090D] text-white flex flex-col justify-center items-center px-4 py-12">
      <div className="max-w-md w-full bg-[#191922] border border-[#272732] rounded-3xl p-6 sm:p-8 shadow-2xl text-center relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-[#E74763]/15 rounded-full blur-2xl pointer-events-none" />

        <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-5 bg-[#111118] border border-[#272732] shadow-[0_0_20px_rgba(231,71,99,0.25)]">
          {isRejected ? (
            <AlertCircle className="w-8 h-8 text-[#E74763]" />
          ) : (
            <Clock className="w-8 h-8 text-[#E74763] animate-pulse" />
          )}
        </div>

        {isRejected ? (
          <>
            <h2 className="text-xl font-bold text-white mb-2">Verification Unsuccessful</h2>
            <p className="text-xs text-[#A1A1AA] leading-relaxed mb-4">
              Your student ID verification could not be approved by the founder.
            </p>
            {user?.rejectionReason && (
              <div className="p-3.5 bg-[#E74763]/10 border border-[#E74763]/30 rounded-2xl text-left text-xs text-[#E74763] mb-6">
                <span className="font-bold block mb-1">Reason provided:</span>
                {user.rejectionReason}
              </div>
            )}
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold text-white mb-2">ID Verification In Progress</h2>
            <p className="text-xs text-[#A1A1AA] leading-relaxed mb-6">
              Thank you for applying to PCTE MATCH! To protect community safety and guarantee 100% genuine students, the founder personally reviews every physical ID card before discovery features unlock.
            </p>

            <div className="p-4 rounded-2xl bg-[#111118]/80 border border-[#272732] text-left space-y-2.5 mb-6">
              <div className="flex items-center gap-2 text-xs text-[#31C48D]">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Account registered with 18+ DOB verification</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#31C48D]">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Physical ID uploaded securely to private storage</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#E74763]">
                <Clock className="w-4 h-4 shrink-0 animate-spin" />
                <span>Pending founder approval in admin queue</span>
              </div>
            </div>
          </>
        )}

        <div className="flex flex-col gap-3">
          {!isRejected && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-full py-3 rounded-full bg-gradient-to-r from-[#E74763] to-[#A72E48] hover:brightness-110 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(231,71,99,0.35)]"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Checking Status...' : 'Check Verification Status'}</span>
            </button>
          )}

          <button
            onClick={() => {
              logout();
              onNavigate('login');
            }}
            className="w-full py-2.5 rounded-full bg-[#111118] hover:bg-[#09090D] border border-[#272732] text-[#A1A1AA] hover:text-white text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        <p className="text-[11px] text-[#71717A] mt-6">
          Founder support:{' '}
          <span className="text-[#A1A1AA]">pulkitshah046@gmail.com</span>
        </p>
      </div>
    </div>
  );
};
