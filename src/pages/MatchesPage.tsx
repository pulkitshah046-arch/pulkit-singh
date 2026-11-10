import React, { useState, useEffect } from 'react';
import {
  Heart,
  MessageCircle,
  ShieldCheck,
  Search,
  Sparkles,
  RefreshCw,
  MoreVertical,
  UserX,
  Lock,
  Unlock,
  Eye,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AnonymousAvatar } from '../components/AnonymousAvatar';

export interface MatchItem {
  matchId: string;
  conversationId: string;
  matchedAt: string;
  lastMessage: string | null;
  lastMessageTime: string | null;
  unreadCount: number;
  revealState?: 'anonymous' | 'reveal_requested' | 'reveal_pending' | 'revealed' | 'reverted_to_anonymous';
  revealRequestedBy?: string;
  revealedIdentity?: {
    realFirstName: string;
    course: string;
  } | null;
  partner: {
    id: string;
    displayName: string;
    displayNickname?: string;
    age: number;
    course: string;
    academicYear: string;
    photo: string | null;
    photos?: string[];
    anonymousAvatarGradient?: string;
  };
}

interface MatchesPageProps {
  onSelectConversation: (conversationId: string) => void;
  onNavigate: (tab: string) => void;
}

export const MatchesPage: React.FC<MatchesPageProps> = ({ onSelectConversation, onNavigate }) => {
  const { token } = useAuth();
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchMatches = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/matches', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMatches(data.matches);
      }
    } catch (err) {
      console.error('Failed to load matches', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
    // Poll matches every 8 seconds for new incoming matches/chats
    const interval = setInterval(fetchMatches, 8000);
    return () => clearInterval(interval);
  }, [token]);

  const filteredMatches = matches.filter((m) =>
    m.partner.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.partner.course.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTimestamp = (isoDate: string | null) => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center text-[#A1A1AA] gap-3">
        <RefreshCw className="w-8 h-8 text-[#E74763] animate-spin" />
        <span className="text-xs font-semibold">Loading your campus matches...</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28 md:pb-12">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Your Matches</h1>
          <p className="text-xs text-[#A1A1AA] mt-0.5">
            Mutual campus connections ({matches.length})
          </p>
        </div>

        <button
          onClick={fetchMatches}
          className="p-2 rounded-xl bg-[#191922] hover:bg-[#111118] border border-[#272732] text-[#A1A1AA] hover:text-white transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {matches.length === 0 ? (
        <div className="p-8 text-center bg-[#191922] border border-[#272732] rounded-3xl mt-6 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-[#111118] border border-[#272732] flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(231,71,99,0.2)]">
            <Heart className="w-6 h-6 text-[#E74763]" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">No Matches Yet</h3>
          <p className="text-xs text-[#A1A1AA] max-w-xs mx-auto leading-relaxed mb-6">
            When you and another verified PCTE student like each other, they will appear here ready to chat!
          </p>
          <button
            onClick={() => onNavigate('discover')}
            className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#E74763] to-[#A72E48] text-white text-xs font-bold shadow-[0_0_20px_rgba(231,71,99,0.3)] transition-all"
          >
            Start Discovering Peers
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Recent Match Circles Bar */}
          <div>
            <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider block mb-3">
              New Matches
            </span>
            <div className="flex items-center gap-3.5 overflow-x-auto pb-2 scrollbar-none">
              {matches.map((m) => (
                <button
                  key={m.matchId}
                  onClick={() => onSelectConversation(m.conversationId)}
                  className="flex flex-col items-center gap-1.5 focus:outline-none shrink-0 group"
                >
                  <div className="relative w-15 h-15 rounded-full p-0.5 bg-gradient-to-tr from-[#E74763] to-[#A72E48] group-hover:scale-105 transition-transform shadow-[0_0_15px_rgba(231,71,99,0.25)]">
                    {m.partner.photo ? (
                      <img
                        src={m.partner.photo}
                        alt={m.partner.displayName}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                        className="w-full h-full object-cover rounded-full border-2 border-[#111118]"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full overflow-hidden border-2 border-[#111118]">
                        <AnonymousAvatar
                          nickname={m.partner.displayName}
                          gradient={m.partner.anonymousAvatarGradient || 'rose'}
                          size="sm"
                          showBadge={false}
                        />
                      </div>
                    )}
                    {m.unreadCount > 0 && (
                      <span className="absolute bottom-0 right-0 w-4 h-4 bg-[#E74763] border-2 border-[#111118] rounded-full" />
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-white max-w-[65px] truncate">
                    {m.partner.displayName}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#71717A] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search conversations by student or course..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#191922] border border-[#272732] rounded-2xl text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-[#E74763]"
            />
          </div>

          {/* Conversations List */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider block mb-1">
              Conversations ({filteredMatches.length})
            </span>

            {filteredMatches.map((m) => (
              <div
                key={m.conversationId}
                onClick={() => onSelectConversation(m.conversationId)}
                className="p-3.5 rounded-2xl bg-[#191922] hover:bg-[#111118] border border-[#272732] hover:border-[#E74763]/50 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-sm group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-12 h-12 rounded-2xl overflow-hidden shrink-0 border border-[#272732] flex items-center justify-center">
                    {m.partner.photo ? (
                      <img
                        src={m.partner.photo}
                        alt={m.partner.displayName}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <AnonymousAvatar
                        nickname={m.partner.displayName}
                        gradient={m.partner.anonymousAvatarGradient || 'rose'}
                        size="md"
                        showBadge={false}
                      />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs sm:text-sm text-white truncate">
                        {m.revealState === 'revealed' && m.revealedIdentity
                          ? `${m.revealedIdentity.realFirstName} (${m.partner.displayName})`
                          : m.partner.displayName}
                        {m.partner.age ? `, ${m.partner.age}` : ''}
                      </span>
                      {m.revealState === 'revealed' ? (
                        <span className="text-[9px] text-[#31C48D] bg-[#31C48D]/15 border border-[#31C48D]/30 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                          <Eye className="w-2.5 h-2.5" />
                          Revealed
                        </span>
                      ) : m.revealState === 'reveal_pending' ? (
                        <span className="text-[9px] text-amber-400 bg-amber-400/10 border border-amber-400/30 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                          <Unlock className="w-2.5 h-2.5" />
                          Reveal Request
                        </span>
                      ) : (
                        <span className="text-[9px] text-[#A1A1AA] bg-[#272732] px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" />
                          Anonymous
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#A1A1AA] block truncate">
                      {m.partner.course}
                    </span>
                    <p className={`text-xs truncate mt-0.5 ${m.unreadCount > 0 ? 'text-white font-semibold' : 'text-[#71717A]'}`}>
                      {m.lastMessage || 'Matched! Tap to send your first message...'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-[10px] text-[#71717A]">
                    {formatTimestamp(m.lastMessageTime || m.matchedAt)}
                  </span>
                  {m.unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-[#E74763] text-white text-[10px] font-bold shadow-[0_0_10px_rgba(231,71,99,0.5)]">
                      {m.unreadCount} new
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
