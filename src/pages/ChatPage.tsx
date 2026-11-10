import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Send,
  MoreVertical,
  ShieldCheck,
  UserX,
  Flag,
  RefreshCw,
  Ban,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Check,
  X,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ReportModal } from '../components/ReportModal';
import { AnonymousAvatar } from '../components/AnonymousAvatar';

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  isMe: boolean;
  isSystem?: boolean;
}

interface ChatPartner {
  id: string;
  displayName: string;
  displayNickname?: string;
  age: number;
  course: string;
  academicYear?: string;
  photo: string | null;
  photos?: string[];
  anonymousAvatarGradient?: string;
}

interface ChatPageProps {
  conversationId: string;
  onBack: () => void;
}

export const ChatPage: React.FC<ChatPageProps> = ({ conversationId, onBack }) => {
  const { token } = useAuth();

  const [partner, setPartner] = useState<ChatPartner | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const [reportModalOpen, setReportModalOpen] = useState<boolean>(false);

  // Reveal state
  const [revealState, setRevealState] = useState<'anonymous' | 'reveal_requested' | 'reveal_pending' | 'revealed' | 'reverted_to_anonymous'>('anonymous');
  const [revealedIdentity, setRevealedIdentity] = useState<{ realFirstName: string; course: string } | null>(null);
  const [isRevealActionLoading, setIsRevealActionLoading] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async (silent = false) => {
    if (!token) return;
    if (!silent) setIsLoading(true);

    try {
      const res = await fetch(`/api/chat/${conversationId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPartner(data.partner);
        setMatchId(data.matchId);
        setMessages(data.messages);
        setRevealState(data.revealState || 'anonymous');
        setRevealedIdentity(data.revealedIdentity || null);
      } else {
        if (!silent) {
          alert(data.error || 'Chat is unavailable.');
          onBack();
        }
      }
    } catch (err) {
      console.error('Failed to fetch messages', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(() => {
      fetchMessages(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [conversationId, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending || !token) return;

    const textToSend = inputText.trim();
    setInputText('');
    setIsSending(true);

    try {
      const res = await fetch(`/api/chat/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: textToSend })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessages((prev) => [...prev, data.message]);
      } else {
        alert(data.error || 'Failed to send message.');
      }
    } catch (err) {
      console.error('Failed to send message', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleRequestReveal = async () => {
    if (!matchId || !token || isRevealActionLoading) return;
    setIsRevealActionLoading(true);
    try {
      const res = await fetch(`/api/matches/${matchId}/reveal/request`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRevealState('reveal_requested');
        fetchMessages(true);
      } else {
        alert(data.error || 'Failed to request identity reveal.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRevealActionLoading(false);
    }
  };

  const handleAcceptReveal = async () => {
    if (!matchId || !token || isRevealActionLoading) return;
    setIsRevealActionLoading(true);
    try {
      const res = await fetch(`/api/matches/${matchId}/reveal/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRevealState('revealed');
        setRevealedIdentity(data.revealedIdentity);
        fetchMessages(true);
      } else {
        alert(data.error || 'Failed to accept identity reveal.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRevealActionLoading(false);
    }
  };

  const handleDeclineReveal = async () => {
    if (!matchId || !token || isRevealActionLoading) return;
    setIsRevealActionLoading(true);
    try {
      const res = await fetch(`/api/matches/${matchId}/reveal/decline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRevealState('anonymous');
        fetchMessages(true);
      } else {
        alert(data.error || 'Failed to decline reveal.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRevealActionLoading(false);
    }
  };

  const handleRevertReveal = async () => {
    if (!matchId || !token || isRevealActionLoading) return;
    if (!confirm('Return this conversation to Anonymous Mode? Real names and identity fields will be hidden immediately.')) return;

    setIsRevealActionLoading(true);
    try {
      const res = await fetch(`/api/matches/${matchId}/reveal/revert`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRevealState('reverted_to_anonymous');
        setRevealedIdentity(null);
        fetchMessages(true);
      } else {
        alert(data.error || 'Failed to return to anonymous mode.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRevealActionLoading(false);
    }
  };

  const handleUnmatch = async () => {
    if (!matchId || !token) return;
    if (!confirm(`Are you sure you want to unmatch ${partner?.displayName}? This will delete the conversation and revoke chat access.`)) return;

    try {
      await fetch(`/api/matches/${matchId}/unmatch`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      onBack();
    } catch (err) {
      console.error('Failed to unmatch', err);
    }
  };

  const handleBlock = async () => {
    if (!partner || !token) return;
    if (!confirm(`Block ${partner.displayName}? They will no longer be able to match or message you.`)) return;

    try {
      await fetch('/api/moderation/block', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ targetUserId: partner.id })
      });
      onBack();
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center text-[#A1A1AA] gap-3">
        <RefreshCw className="w-8 h-8 text-[#E74763] animate-spin" />
        <span className="text-xs font-semibold">Opening secure campus chat...</span>
      </div>
    );
  }

  const isRevealed = revealState === 'revealed';
  const partnerName = isRevealed && revealedIdentity
    ? `${revealedIdentity.realFirstName} (${partner?.displayName})`
    : (partner?.displayName || 'CampusPeer');

  return (
    <div className="max-w-2xl mx-auto h-[calc(100vh-65px)] flex flex-col bg-[#09090D] border-x border-[#272732]">
      {/* Chat Top Bar */}
      <div className="px-4 py-3 bg-[#111118] border-b border-[#272732] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-xl text-[#A1A1AA] hover:text-white hover:bg-[#191922] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {partner && (
            <div className="flex items-center gap-2.5">
              <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-[#272732] flex items-center justify-center">
                {partner.photo ? (
                  <img
                    src={partner.photo}
                    alt={partner.displayName}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <AnonymousAvatar
                    nickname={partner.displayName}
                    gradient={partner.anonymousAvatarGradient || 'rose'}
                    size="md"
                    showBadge={false}
                  />
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs sm:text-sm text-white">
                    {partnerName}
                  </span>
                  {partner.age && (
                    <span className="text-xs text-[#71717A]">, {partner.age}</span>
                  )}
                  {isRevealed ? (
                    <span className="text-[9px] text-[#31C48D] bg-[#31C48D]/15 border border-[#31C48D]/30 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                      <Eye className="w-2.5 h-2.5" />
                      Revealed
                    </span>
                  ) : (
                    <span className="text-[9px] text-[#A1A1AA] bg-[#272732] px-1.5 py-0.5 rounded font-semibold flex items-center gap-0.5">
                      <Lock className="w-2.5 h-2.5" />
                      Anonymous
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-[#A1A1AA] block">
                  {isRevealed && revealedIdentity?.course ? revealedIdentity.course : partner.course}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Safety & Identity Reveal Actions Dropdown */}
        <div className="flex items-center gap-1">
          {/* Quick toggle reveal button if revealed */}
          {isRevealed ? (
            <button
              onClick={handleRevertReveal}
              disabled={isRevealActionLoading}
              title="Return to Anonymous Mode"
              className="px-2.5 py-1 rounded-xl bg-[#272732] hover:bg-[#31313F] text-[10px] font-semibold text-[#A1A1AA] hover:text-white transition-colors flex items-center gap-1"
            >
              <EyeOff className="w-3 h-3 text-amber-400" />
              <span className="hidden sm:inline">Return to Anonymous</span>
            </button>
          ) : revealState === 'anonymous' || revealState === 'reverted_to_anonymous' ? (
            <button
              onClick={handleRequestReveal}
              disabled={isRevealActionLoading}
              title="Request Mutual Identity Reveal"
              className="px-2.5 py-1 rounded-xl bg-[#E74763]/15 hover:bg-[#E74763]/25 border border-[#E74763]/30 text-[10px] font-semibold text-[#E74763] transition-colors flex items-center gap-1"
            >
              <Unlock className="w-3 h-3" />
              <span className="hidden sm:inline">Request Reveal</span>
            </button>
          ) : null}

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-xl text-[#A1A1AA] hover:text-white hover:bg-[#191922] transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-[#191922] border border-[#272732] rounded-2xl p-1.5 shadow-2xl z-30 space-y-0.5">
                {isRevealed ? (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      handleRevertReveal();
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs text-amber-400 hover:bg-[#111118] flex items-center gap-2 transition-colors"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Return to Anonymous</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      handleRequestReveal();
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs text-white hover:bg-[#111118] flex items-center gap-2 transition-colors"
                  >
                    <Unlock className="w-3.5 h-3.5 text-[#E74763]" />
                    <span>Request Identity Reveal</span>
                  </button>
                )}

                <div className="my-1 border-t border-[#272732]" />

                <button
                  onClick={() => {
                    setShowMenu(false);
                    setReportModalOpen(true);
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs text-amber-400 hover:bg-[#111118] flex items-center gap-2 transition-colors"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>Report Student</span>
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    handleBlock();
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs text-[#E74763] hover:bg-[#111118] flex items-center gap-2 transition-colors"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Block User</span>
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    handleUnmatch();
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs text-[#A1A1AA] hover:text-white hover:bg-[#111118] flex items-center gap-2 transition-colors"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>Unmatch</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Reveal Banners */}
      {revealState === 'reveal_pending' && (
        <div className="bg-amber-950/40 border-b border-amber-500/30 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-amber-300">
            <Unlock className="w-4 h-4 shrink-0" />
            <span>
              <strong>{partner?.displayName}</strong> requested mutual identity reveal. Exchange real first names?
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleAcceptReveal}
              disabled={isRevealActionLoading}
              className="px-3 py-1 bg-gradient-to-r from-[#10B981] to-[#059669] text-white rounded-lg font-bold text-[11px] shadow-sm flex items-center gap-1 hover:brightness-110"
            >
              <Check className="w-3 h-3" />
              <span>Accept Reveal</span>
            </button>
            <button
              onClick={handleDeclineReveal}
              disabled={isRevealActionLoading}
              className="px-2.5 py-1 bg-[#191922] border border-[#272732] text-[#A1A1AA] hover:text-white rounded-lg text-[11px]"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {revealState === 'reveal_requested' && (
        <div className="bg-[#191922] border-b border-[#272732] px-4 py-2 flex items-center justify-between text-xs text-[#A1A1AA]">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 text-[#E74763] animate-spin" />
            <span>Identity reveal requested. Waiting for partner's mutual consent...</span>
          </div>
          <span className="text-[10px] text-[#71717A]">One-sided disclosure is strictly prevented</span>
        </div>
      )}

      {revealState === 'revealed' && (
        <div className="bg-[#10B981]/10 border-b border-[#10B981]/25 px-4 py-2 flex items-center justify-between text-xs text-[#31C48D]">
          <div className="flex items-center gap-2">
            <Eye className="w-3.5 h-3.5" />
            <span>
              <strong>Identities Revealed:</strong> Partner is <strong>{revealedIdentity?.realFirstName}</strong>.
            </span>
          </div>
          <button
            onClick={handleRevertReveal}
            disabled={isRevealActionLoading}
            className="text-[10px] text-[#A1A1AA] hover:text-white underline ml-2 shrink-0"
          >
            Revert to Anonymous
          </button>
        </div>
      )}

      {revealState === 'reverted_to_anonymous' && (
        <div className="bg-[#191922]/80 border-b border-[#272732] px-4 py-1.5 flex items-center justify-between text-[11px] text-[#71717A]">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3 h-3" />
            <span>Chat is in Anonymous Mode. Real names are hidden from APIs.</span>
          </div>
          <button
            onClick={handleRequestReveal}
            className="text-[10px] text-[#E74763] hover:underline"
          >
            Request Reveal Again
          </button>
        </div>
      )}

      {/* Safety Notice Banner */}
      <div className="bg-[#111118]/60 border-b border-[#272732]/50 py-1.5 px-4 text-center text-[10px] text-[#71717A] flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-[#31C48D]" />
        <span>Verified PCTE Campus Chat • Zero real name leakage in anonymous mode</span>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#A1A1AA]">
            <div className="w-12 h-12 rounded-2xl bg-[#191922] border border-[#272732] flex items-center justify-center mb-3 shadow-md">
              <ShieldCheck className="w-6 h-6 text-[#E74763]" />
            </div>
            <h4 className="text-sm font-bold text-white mb-1">
              Say hello to {partner?.displayName}!
            </h4>
            <p className="text-xs text-[#71717A] max-w-xs">
              Chat anonymously! Once you get to know each other, you can request a mutual identity reveal.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <div className="max-w-[85%] px-3.5 py-1.5 rounded-full bg-[#191922] border border-[#272732] text-[10px] text-[#A1A1AA] text-center flex items-center gap-1.5 shadow-sm">
                    <Sparkles className="w-3 h-3 text-[#E74763] shrink-0" />
                    <span>{msg.content.replace('[SYSTEM]:', '').trim()}</span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                    msg.isMe
                      ? 'bg-gradient-to-r from-[#E74763] to-[#A72E48] text-white rounded-br-none shadow-[0_0_15px_rgba(231,71,99,0.25)]'
                      : 'bg-[#191922] border border-[#272732] text-white rounded-bl-none'
                  }`}
                >
                  {msg.content}
                </div>
                <span className="text-[9px] text-[#71717A] mt-1 px-1">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Form */}
      <form onSubmit={handleSendMessage} className="p-3 bg-[#111118] border-t border-[#272732] flex items-center gap-2">
        <input
          type="text"
          maxLength={1000}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Message ${partner?.displayName || 'student'}...`}
          className="flex-1 px-4 py-2.5 bg-[#191922] border border-[#272732] rounded-full text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-[#E74763]"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isSending}
          className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#E74763] to-[#A72E48] hover:brightness-110 disabled:opacity-40 text-white flex items-center justify-center transition-all shadow-[0_0_15px_rgba(231,71,99,0.3)] shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Report Modal */}
      {partner && (
        <ReportModal
          isOpen={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          targetUserId={partner.id}
          targetUserName={partner.displayName}
        />
      )}
    </div>
  );
};
