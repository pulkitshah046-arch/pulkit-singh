import React, { useState, useEffect } from 'react';
import {
  Heart,
  X,
  Sparkles,
  GraduationCap,
  Music,
  Tv,
  RefreshCw,
  ShieldCheck,
  Flag,
  Ban,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MutualMatchModal } from '../components/MutualMatchModal';
import { ReportModal } from '../components/ReportModal';
import { AnonymousAvatar } from '../components/AnonymousAvatar';

interface Prompt {
  prompt: string;
  answer: string;
}

interface DeckCandidate {
  id: string;
  displayName: string;
  displayNickname: string;
  age: number;
  course: string;
  academicYear: string;
  bio: string;
  gender: string;
  photos: string[];
  anonymousAvatarGradient?: string;
  interests: string[];
  favouriteMusic: string | null;
  favouriteMedia: string | null;
  prompts: Prompt[];
}

interface DiscoverPageProps {
  onStartChat: (conversationId?: string) => void;
  onNavigate: (tab: string) => void;
}

export const DiscoverPage: React.FC<DiscoverPageProps> = ({ onStartChat, onNavigate }) => {
  const { token } = useAuth();

  const [deck, setDeck] = useState<DeckCandidate[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [photoIndex, setPhotoIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionLocked, setActionLocked] = useState<boolean>(false);

  // Match celebration modal state
  const [matchModalOpen, setMatchModalOpen] = useState<boolean>(false);
  const [matchedPartner, setMatchedPartner] = useState<any>(null);

  // Report modal state
  const [reportModalOpen, setReportModalOpen] = useState<boolean>(false);
  const [reportingUser, setReportingUser] = useState<{ id: string; name: string } | null>(null);

  const fetchDeck = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/discover/deck', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDeck(data.deck);
        setCurrentIndex(0);
        setPhotoIndex(0);
      }
    } catch (err) {
      console.error('Failed to load discovery deck', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeck();
  }, [token]);

  const currentCandidate = deck[currentIndex];

  const handleNext = () => {
    setPhotoIndex(0);
    setCurrentIndex((prev) => prev + 1);
  };

  const handlePass = async () => {
    if (!currentCandidate || actionLocked || !token) return;
    setActionLocked(true);

    try {
      await fetch('/api/discover/pass', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ targetUserId: currentCandidate.id })
      });
      handleNext();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLocked(false);
    }
  };

  const handleLike = async () => {
    if (!currentCandidate || actionLocked || !token) return;
    setActionLocked(true);

    try {
      const res = await fetch('/api/matches/like', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ targetUserId: currentCandidate.id })
      });
      const data = await res.json();

      if (data.isMatch && data.match) {
        setMatchedPartner(data.match.matchedUser);
        setMatchModalOpen(true);
      }

      handleNext();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLocked(false);
    }
  };

  const handleBlockCandidate = async () => {
    if (!currentCandidate || !token) return;
    if (!confirm(`Block ${currentCandidate.displayName}? They will no longer appear in your deck or matches.`)) return;

    try {
      await fetch('/api/moderation/block', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ targetUserId: currentCandidate.id })
      });
      handleNext();
    } catch (err) {
      console.error(err);
    }
  };

  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentCandidate || currentCandidate.photos.length <= 1) return;
    setPhotoIndex((prev) => (prev + 1) % currentCandidate.photos.length);
  };

  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentCandidate || currentCandidate.photos.length <= 1) return;
    setPhotoIndex((prev) => (prev - 1 + currentCandidate.photos.length) % currentCandidate.photos.length);
  };

  if (isLoading) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center text-[#A1A1AA] gap-3">
        <RefreshCw className="w-8 h-8 text-[#E74763] animate-spin" />
        <span className="text-xs font-semibold">Discovering verified PCTE students...</span>
      </div>
    );
  }

  // Empty state
  if (!currentCandidate || currentIndex >= deck.length) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#191922] border border-[#272732] flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(231,71,99,0.25)]">
          <Sparkles className="w-8 h-8 text-[#E74763]" />
        </div>
        <h2 className="text-xl font-bold text-white mb-1">You're All Caught Up!</h2>
        <p className="text-xs text-[#A1A1AA] max-w-xs mx-auto leading-relaxed mb-6">
          You've reviewed all active PCTE student cards matching your criteria. Check back soon as more campus applicants are verified!
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={fetchDeck}
            className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-gradient-to-r from-[#E74763] to-[#A72E48] text-white text-xs font-bold shadow-[0_0_20px_rgba(231,71,99,0.3)] flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Deck</span>
          </button>
          <button
            onClick={() => onNavigate('matches')}
            className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#191922] border border-[#272732] text-[#A1A1AA] hover:text-white text-xs font-semibold"
          >
            View Your Matches
          </button>
        </div>
      </div>
    );
  }

  const hasPhotos = currentCandidate.photos && currentCandidate.photos.length > 0;
  const currentPhoto = hasPhotos ? currentCandidate.photos[photoIndex] : null;
  const candidateName = currentCandidate.displayNickname || currentCandidate.displayName;

  return (
    <div className="max-w-md mx-auto px-4 py-4 pb-28 md:pb-12">
      {/* Top Header Card Info */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-1.5 text-xs text-[#31C48D] bg-[#31C48D]/10 px-2.5 py-1 rounded-full border border-[#31C48D]/25 font-bold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Verified PCTE Student</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#191922] border border-[#272732] text-[10px] text-[#A1A1AA]">
            <Lock className="w-3 h-3 text-[#E74763]" />
            <span>Anonymous Profile</span>
          </div>

          <button
            onClick={() => {
              setReportingUser({ id: currentCandidate.id, name: candidateName });
              setReportModalOpen(true);
            }}
            className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-amber-400 hover:bg-[#191922] transition-colors"
            title="Report Profile"
          >
            <Flag className="w-4 h-4" />
          </button>
          <button
            onClick={handleBlockCandidate}
            className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-[#E74763] hover:bg-[#191922] transition-colors"
            title="Block Student"
          >
            <Ban className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Dating Card */}
      <div className="bg-[#191922] border border-[#272732] rounded-3xl overflow-hidden shadow-2xl flex flex-col relative">
        {/* Photo Carousel OR Intentional Aesthetic Avatar */}
        <div className="relative h-[380px] sm:h-[420px] w-full bg-[#111118] select-none">
          {hasPhotos && currentPhoto ? (
            <>
              <img
                src={currentPhoto}
                alt={candidateName}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                className="w-full h-full object-cover"
              />

              {/* Tap Zones for Next/Prev Photo */}
              <div className="absolute inset-0 flex">
                <div onClick={prevPhoto} className="w-1/2 h-full cursor-pointer" />
                <div onClick={nextPhoto} className="w-1/2 h-full cursor-pointer" />
              </div>

              {/* Photo Indicator Bars */}
              {currentCandidate.photos.length > 1 && (
                <div className="absolute top-3 inset-x-3 flex gap-1 z-10 pointer-events-none">
                  {currentCandidate.photos.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all ${
                        i === photoIndex ? 'bg-white shadow-sm' : 'bg-white/30'
                      }`}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <AnonymousAvatar
              photo={null}
              nickname={candidateName}
              gradient={currentCandidate.anonymousAvatarGradient || 'rose'}
              size="xl"
              className="w-full h-full"
            />
          )}

          {/* Bottom Gradient Overlay on Image/Avatar */}
          <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#191922] via-[#191922]/70 to-transparent pointer-events-none flex flex-col justify-end p-5">
            <div className="flex items-baseline gap-2">
              <h1 className="text-2xl font-black text-white drop-shadow-md">
                {candidateName}
              </h1>
              <span className="text-lg font-bold text-neutral-300 drop-shadow-md">
                {currentCandidate.age}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-neutral-300 mt-1">
              <GraduationCap className="w-3.5 h-3.5 text-[#E74763]" />
              <span className="truncate">
                {currentCandidate.course}
                {currentCandidate.academicYear ? ` • ${currentCandidate.academicYear}` : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Card Body Details */}
        <div className="p-5 space-y-4">
          {/* Bio */}
          {currentCandidate.bio && (
            <div>
              <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider block mb-1">
                About
              </span>
              <p className="text-xs text-neutral-300 leading-relaxed font-normal">
                {currentCandidate.bio}
              </p>
            </div>
          )}

          {/* Campus Interests Chips */}
          {currentCandidate.interests.length > 0 && (
            <div>
              <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider block mb-2">
                Interests & Passions
              </span>
              <div className="flex flex-wrap gap-1.5">
                {currentCandidate.interests.map((interest, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-full bg-[#111118] border border-[#272732] text-[11px] text-white font-medium"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Dating Prompts */}
          {currentCandidate.prompts.map((p, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-[#111118] border border-[#272732] space-y-1"
            >
              <span className="text-[10px] font-bold text-[#E74763] uppercase tracking-wider">
                {p.prompt}
              </span>
              <p className="text-xs text-white font-medium leading-relaxed">
                {p.answer}
              </p>
            </div>
          ))}

          {/* Media Favorites */}
          {(currentCandidate.favouriteMusic || currentCandidate.favouriteMedia) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {currentCandidate.favouriteMusic && (
                <div className="p-3 rounded-xl bg-[#111118] border border-[#272732] flex items-center gap-2.5">
                  <Music className="w-4 h-4 text-[#E74763] shrink-0" />
                  <div className="truncate">
                    <span className="text-[9px] text-[#71717A] font-bold block uppercase">MUSIC</span>
                    <span className="text-xs text-white truncate block">{currentCandidate.favouriteMusic}</span>
                  </div>
                </div>
              )}
              {currentCandidate.favouriteMedia && (
                <div className="p-3 rounded-xl bg-[#111118] border border-[#272732] flex items-center gap-2.5">
                  <Tv className="w-4 h-4 text-purple-400 shrink-0" />
                  <div className="truncate">
                    <span className="text-[9px] text-[#71717A] font-bold block uppercase">FAVOURITE MEDIA</span>
                    <span className="text-xs text-white truncate block">{currentCandidate.favouriteMedia}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="p-4 border-t border-[#272732] bg-[#111118] flex items-center justify-center gap-8 shrink-0">
          <button
            onClick={handlePass}
            disabled={actionLocked}
            className="w-14 h-14 rounded-full bg-[#191922] hover:bg-neutral-800 border border-[#272732] text-neutral-400 hover:text-white flex items-center justify-center transition-transform active:scale-90 shadow-md"
            title="Pass (Swipe Left)"
          >
            <X className="w-6 h-6" />
          </button>

          <button
            onClick={handleLike}
            disabled={actionLocked}
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#E74763] to-[#A72E48] hover:brightness-110 text-white flex items-center justify-center transition-transform active:scale-90 shadow-[0_0_25px_rgba(231,71,99,0.45)]"
            title="Like (Swipe Right)"
          >
            <Heart className="w-6 h-6 fill-white" />
          </button>
        </div>
      </div>

      {/* Mutual Match Modal Celebration */}
      <MutualMatchModal
        isOpen={matchModalOpen}
        onClose={() => setMatchModalOpen(false)}
        onStartChat={() => {
          setMatchModalOpen(false);
          onNavigate('matches');
        }}
        partner={matchedPartner}
      />

      {/* Report Modal */}
      {reportingUser && (
        <ReportModal
          isOpen={reportModalOpen}
          onClose={() => {
            setReportModalOpen(false);
            setReportingUser(null);
          }}
          targetUserId={reportingUser.id}
          targetUserName={reportingUser.name}
        />
      )}
    </div>
  );
};
