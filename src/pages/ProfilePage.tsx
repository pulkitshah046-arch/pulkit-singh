import React, { useState, useEffect } from 'react';
import {
  Upload,
  Trash2,
  Save,
  Plus,
  Heart,
  EyeOff,
  UserCheck,
  AlertTriangle,
  RefreshCw,
  LogOut,
  Lock,
  Shield,
  Eye,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AnonymousAvatar } from '../components/AnonymousAvatar';

const AVAILABLE_PROMPTS = [
  "My ideal weekend looks like...",
  "The fastest way to make me smile...",
  "My unpopular opinion is...",
  "Together we could...",
  "One thing I want to try...",
  "My perfect first date...",
];

const PREDEFINED_INTERESTS = [
  "Coding", "Debate", "Coffee", "Gym", "Anime", "Music Production",
  "Photography", "Reading", "Gaming", "Campus Tech Club", "Formula Student",
  "Culinary", "Badminton", "Startups", "Road Trips", "Volunteering"
];

const AVATAR_GRADIENTS = [
  { id: 'rose', label: 'Rose Gold', class: 'from-[#E74763] to-[#881337]' },
  { id: 'emerald', label: 'Emerald Mint', class: 'from-[#10B981] to-[#064E3B]' },
  { id: 'cyan', label: 'Cyan Ocean', class: 'from-[#06B6D4] to-[#0E7490]' },
  { id: 'purple', label: 'Velvet Violet', class: 'from-[#8B5CF6] to-[#4C1D95]' },
  { id: 'amber', label: 'Warm Amber', class: 'from-[#F59E0B] to-[#78350F]' },
];

interface ProfilePageProps {
  onNavigate: (tab: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigate }) => {
  const { token, logout, user } = useAuth();

  const [profile, setProfile] = useState<any>(null);
  const [displayName, setDisplayName] = useState('');
  const [displayNickname, setDisplayNickname] = useState('');
  const [anonymousAvatarGradient, setAnonymousAvatarGradient] = useState<string>('rose');
  const [showCourse, setShowCourse] = useState<boolean>(true);
  const [showAcademicYear, setShowAcademicYear] = useState<boolean>(true);
  const [bio, setBio] = useState('');
  const [gender, setGender] = useState('MAN');
  const [matchPreference, setMatchPreference] = useState('EVERYONE');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [favouriteMusic, setFavouriteMusic] = useState('');
  const [favouriteMedia, setFavouriteMedia] = useState('');
  const [prompts, setPrompts] = useState<{ prompt: string; answer: string }[]>([]);
  const [isDiscoveryPaused, setIsDiscoveryPaused] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  // Security & Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setPasswordMsg(null);

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ text: 'New passwords do not match.', isError: true });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMsg({ text: 'New password must be at least 8 characters long.', isError: true });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPasswordMsg({ text: 'Password successfully updated!', isError: false });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordMsg(null), 4000);
      } else {
        setPasswordMsg({ text: data.error || 'Failed to update password.', isError: true });
      }
    } catch (err: any) {
      setPasswordMsg({ text: err.message, isError: true });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const fetchProfile = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/profile/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success && data.profile) {
        const p = data.profile;
        setProfile(p);
        setDisplayName(p.displayName || p.firstName || '');
        setDisplayNickname(p.displayNickname || p.displayName || '');
        setAnonymousAvatarGradient(p.anonymousAvatarGradient || 'rose');
        setShowCourse(p.showCourse !== false && p.show_course !== 0);
        setShowAcademicYear(p.showAcademicYear !== false && p.show_academic_year !== 0);
        setBio(p.bio || '');
        setGender(p.gender || 'MAN');
        setMatchPreference(p.matchPreference || 'EVERYONE');
        setSelectedInterests(p.interests || []);
        setFavouriteMusic(p.favouriteMusic || '');
        setFavouriteMedia(p.favouriteMedia || '');
        setPrompts(p.prompts || []);
        setIsDiscoveryPaused(p.isDiscoveryPaused || false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [token]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !token) return;

    const formData = new FormData();
    Array.from(e.target.files).forEach((file) => formData.append('photos', file));

    try {
      const res = await fetch('/api/profile/photos', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProfile((prev: any) => ({ ...prev, photos: data.photos }));
      } else {
        alert(data.error || 'Failed to upload photo.');
      }
    } catch (err: any) {
      alert('Upload failed: ' + err.message);
    }
  };

  const handleDeletePhoto = async (photoUrl: string) => {
    if (!token) return;
    try {
      const res = await fetch('/api/profile/photos', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ photoUrl })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProfile((prev: any) => ({ ...prev, photos: data.photos }));
      }
    } catch (err: any) {
      alert('Failed to delete photo: ' + err.message);
    }
  };

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter((i) => i !== interest));
    } else {
      if (selectedInterests.length >= 8) {
        alert('You can select a maximum of 8 interests.');
        return;
      }
      setSelectedInterests([...selectedInterests, interest]);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/profile/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          displayName: displayNickname || displayName,
          displayNickname: displayNickname.trim(),
          anonymousAvatarGradient,
          showCourse,
          showAcademicYear,
          bio,
          gender,
          matchPreference,
          interests: selectedInterests,
          favouriteMusic,
          favouriteMedia,
          prompts: prompts.filter((p) => p.answer.trim().length > 0),
          isDiscoveryPaused,
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage('Profile updated successfully!');
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage(data.error || 'Failed to update profile.');
      }
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you certain you want to delete your account? This action is permanent and revokes all matches.')) return;
    if (!token) return;

    try {
      await fetch('/api/profile/me', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      logout();
      onNavigate('landing');
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center text-[#A1A1AA] gap-3">
        <RefreshCw className="w-8 h-8 text-[#E74763] animate-spin" />
        <span className="text-xs font-semibold">Loading profile...</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-32 md:pb-16 text-white">
      {/* Top Header Card */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">Your Campus Profile</h1>
          <p className="text-xs text-[#A1A1AA] mt-0.5">
            {profile?.course} • {profile?.academicYear}
          </p>
        </div>
        <div className="px-3 py-1 rounded-full bg-[#31C48D]/15 border border-[#31C48D]/30 text-[#31C48D] text-xs font-bold flex items-center gap-1.5 shadow-sm">
          <UserCheck className="w-3.5 h-3.5" />
          <span>Verified Student (18+)</span>
        </div>
      </div>

      {message && (
        <div className="mb-6 p-3.5 rounded-2xl bg-[#31C48D]/10 border border-[#31C48D]/30 text-xs text-[#31C48D] font-medium">
          {message}
        </div>
      )}

      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Anonymous Identity & Public Avatar */}
        <div className="bg-[#191922] p-5 rounded-3xl border border-[#272732] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#E74763]" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Anonymous Campus Identity
              </h2>
            </div>
            <span className="text-[10px] text-[#31C48D] bg-[#31C48D]/10 px-2 py-0.5 rounded font-bold">
              Protected by Default
            </span>
          </div>

          <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
            Your real name, student ID, and personal verification details are kept strictly private. Other students see only your anonymous nickname and chosen avatar until both of you mutually consent to reveal identities in chat.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center pt-2">
            {/* Live Avatar Preview */}
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <AnonymousAvatar
                nickname={displayNickname || 'Campus'}
                gradient={anonymousAvatarGradient}
                size="lg"
                showBadge
              />
              <span className="text-[10px] text-[#71717A]">Public Avatar</span>
            </div>

            <div className="flex-1 w-full space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">
                  Anonymous Nickname <span className="text-[10px] text-[#31C48D]">(Visible to campus peers)</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CampusCoder, VelvetSky"
                  value={displayNickname}
                  onChange={(e) => setDisplayNickname(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#111118] border border-[#272732] rounded-xl text-xs text-white focus:outline-none focus:border-[#E74763]"
                />
              </div>

              {/* Gradient selector */}
              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] mb-1.5">
                  Avatar Theme Gradient
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {AVATAR_GRADIENTS.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setAnonymousAvatarGradient(g.id)}
                      className={`h-7 px-2.5 rounded-lg text-[10px] font-semibold flex items-center gap-1.5 transition-all border ${
                        anonymousAvatarGradient === g.id
                          ? 'border-white text-white shadow-md'
                          : 'border-[#272732] text-[#A1A1AA] hover:text-white'
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full bg-gradient-to-tr ${g.class}`} />
                      <span>{g.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Privacy Toggles */}
          <div className="pt-2 border-t border-[#272732] grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center justify-between p-2.5 bg-[#111118] rounded-xl border border-[#272732] cursor-pointer">
              <span className="text-[11px] text-[#D4D4D8]">Show Course on Profile</span>
              <input
                type="checkbox"
                checked={showCourse}
                onChange={(e) => setShowCourse(e.target.checked)}
                className="w-4 h-4 rounded text-[#E74763] bg-[#191922] border-[#272732] focus:ring-0"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 bg-[#111118] rounded-xl border border-[#272732] cursor-pointer">
              <span className="text-[11px] text-[#D4D4D8]">Show Academic Year</span>
              <input
                type="checkbox"
                checked={showAcademicYear}
                onChange={(e) => setShowAcademicYear(e.target.checked)}
                className="w-4 h-4 rounded text-[#E74763] bg-[#191922] border-[#272732] focus:ring-0"
              />
            </label>
          </div>
        </div>

        {/* Photo Gallery Grid (Optional) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <label className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider">
                Profile Photos ({profile?.photos?.length || 0}/4)
              </label>
              <span className="ml-2 text-[10px] text-[#31C48D] bg-[#31C48D]/10 px-1.5 py-0.5 rounded font-semibold">
                Optional
              </span>
            </div>
            <span className="text-[10px] text-[#71717A]">Avatars are used if no photos are added</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(profile?.photos || []).map((url: string, index: number) => (
              <div key={index} className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-[#272732] group shadow-sm">
                <img
                  src={url}
                  alt={`Photo ${index + 1}`}
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80';
                  }}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleDeletePhoto(url)}
                  className="absolute top-2 right-2 p-1.5 rounded-xl bg-black/80 text-red-400 hover:text-white transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {(profile?.photos?.length || 0) < 4 && (
              <label className="aspect-[3/4] rounded-2xl border-2 border-dashed border-[#272732] hover:border-[#E74763]/70 flex flex-col items-center justify-center cursor-pointer bg-[#111118]/60 transition-colors">
                <Upload className="w-6 h-6 text-[#E74763] mb-1 opacity-80" />
                <span className="text-[11px] font-semibold text-white">Add Photo</span>
                <span className="text-[9px] text-[#71717A] mt-0.5">Optional</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* Short Bio */}
        <div className="space-y-4 bg-[#191922] p-5 rounded-3xl border border-[#272732]">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-[#A1A1AA]">Short Biography</label>
              <span className="text-[10px] text-[#71717A]">{500 - bio.length} chars remaining</span>
            </div>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Tell campus what you're passionate about, your college vibes, and what you're looking for..."
              className="w-full px-3.5 py-2.5 bg-[#111118] border border-[#272732] rounded-xl text-xs text-white focus:outline-none focus:border-[#E74763] resize-none"
            />
          </div>

          {/* Gender & Match Preference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#111118] border border-[#272732] rounded-xl text-xs text-white focus:outline-none focus:border-[#E74763]"
              >
                <option value="MAN">Man</option>
                <option value="WOMAN">Woman</option>
                <option value="NON_BINARY">Non-Binary</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Interested In</label>
              <select
                value={matchPreference}
                onChange={(e) => setMatchPreference(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#111118] border border-[#272732] rounded-xl text-xs text-white focus:outline-none focus:border-[#E74763]"
              >
                <option value="EVERYONE">Everyone on Campus</option>
                <option value="WOMEN">Women</option>
                <option value="MEN">Men</option>
              </select>
            </div>
          </div>
        </div>

        {/* Campus Interest Chips */}
        <div className="bg-[#191922] p-5 rounded-3xl border border-[#272732]">
          <label className="block text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-2">
            Interests & Clubs (Select up to 8)
          </label>
          <div className="flex flex-wrap gap-2">
            {PREDEFINED_INTERESTS.map((interest) => {
              const isSelected = selectedInterests.includes(interest);
              return (
                <button
                  type="button"
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#E74763] to-[#A72E48] text-white shadow-[0_0_15px_rgba(231,71,99,0.3)]'
                      : 'bg-[#111118] border border-[#272732] text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  {interest}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dating Prompts */}
        <div className="space-y-3 bg-[#191922] p-5 rounded-3xl border border-[#272732]">
          <label className="block text-xs font-bold text-[#A1A1AA] uppercase tracking-wider">
            Personality Prompts
          </label>
          {prompts.map((p, idx) => (
            <div key={idx} className="p-3.5 rounded-2xl bg-[#111118] border border-[#272732] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#E74763]">{p.prompt}</span>
                <button
                  type="button"
                  onClick={() => setPrompts(prompts.filter((_, i) => i !== idx))}
                  className="text-[#71717A] hover:text-red-400 text-xs"
                >
                  Remove
                </button>
              </div>
              <input
                type="text"
                value={p.answer}
                placeholder="Your answer..."
                onChange={(e) => {
                  const copy = [...prompts];
                  copy[idx].answer = e.target.value;
                  setPrompts(copy);
                }}
                className="w-full px-3 py-2 bg-[#191922] border border-[#272732] rounded-xl text-xs text-white focus:outline-none focus:border-[#E74763]"
              />
            </div>
          ))}

          {prompts.length < 3 && (
            <button
              type="button"
              onClick={() => {
                const unused = AVAILABLE_PROMPTS.find((ap) => !prompts.some((p) => p.prompt === ap));
                if (unused) setPrompts([...prompts, { prompt: unused, answer: '' }]);
              }}
              className="w-full py-2.5 rounded-2xl border border-dashed border-[#272732] hover:border-[#E74763] text-[#A1A1AA] hover:text-white text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add a Personality Prompt</span>
            </button>
          )}
        </div>

        {/* Music & Shows */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#191922] p-5 rounded-3xl border border-[#272732]">
          <div>
            <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Favourite Music / Artists</label>
            <input
              type="text"
              placeholder="e.g. The Local Train, Prateek Kuhad"
              value={favouriteMusic}
              onChange={(e) => setFavouriteMusic(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#111118] border border-[#272732] rounded-xl text-xs text-white focus:outline-none focus:border-[#E74763]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Favourite Show / Movie</label>
            <input
              type="text"
              placeholder="e.g. Interstellar, Peaky Blinders"
              value={favouriteMedia}
              onChange={(e) => setFavouriteMedia(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#111118] border border-[#272732] rounded-xl text-xs text-white focus:outline-none focus:border-[#E74763]"
            />
          </div>
        </div>

        {/* Pause Discovery Toggle */}
        <div className="p-4 rounded-2xl bg-[#191922] border border-[#272732] flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-white block">Pause Discovery</span>
            <span className="text-[11px] text-[#71717A]">Temporarily hide your profile card from new students while keeping active matches</span>
          </div>
          <input
            type="checkbox"
            checked={isDiscoveryPaused}
            onChange={(e) => setIsDiscoveryPaused(e.target.checked)}
            className="w-4 h-4 rounded text-[#E74763] bg-[#111118] border-[#272732] focus:ring-0"
          />
        </div>

        {/* Save Button */}
        <button
          type="submit"
          disabled={isSaving}
          className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#E74763] to-[#A72E48] hover:brightness-110 text-white font-bold text-xs shadow-[0_0_25px_rgba(231,71,99,0.35)] transition-all flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
        </button>
      </form>

      {/* Security & Password Change Section */}
      <div className="mt-8 bg-[#191922] p-5 rounded-3xl border border-[#272732]">
        <div className="flex items-center gap-2 mb-3">
          <Lock className="w-4 h-4 text-[#E74763]" />
          <h2 className="text-xs font-bold text-white uppercase tracking-wider">Security & Password</h2>
        </div>
        <p className="text-[11px] text-[#A1A1AA] mb-4">
          Change your account password. Must be at least 8 characters long.
        </p>

        {passwordMsg && (
          <div
            className={`mb-4 p-3 rounded-2xl text-xs font-medium ${
              passwordMsg.isError
                ? 'bg-[#E74763]/10 border border-[#E74763]/30 text-[#E74763]'
                : 'bg-[#31C48D]/10 border border-[#31C48D]/30 text-[#31C48D]'
            }`}
          >
            {passwordMsg.text}
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-[#A1A1AA] mb-1">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="w-full px-3.5 py-2.5 bg-[#111118] border border-[#272732] rounded-xl text-xs text-white focus:outline-none focus:border-[#E74763]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#A1A1AA] mb-1">New Password (8+ chars)</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-[#111118] border border-[#272732] rounded-xl text-xs text-white focus:outline-none focus:border-[#E74763]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#A1A1AA] mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-[#111118] border border-[#272732] rounded-xl text-xs text-white focus:outline-none focus:border-[#E74763]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isUpdatingPassword}
            className="w-full mt-2 py-2.5 rounded-xl bg-[#272732] hover:bg-[#31313F] text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2"
          >
            {isUpdatingPassword ? 'Updating Password...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Danger Zone: Account Deletion */}
      <div className="mt-8 pt-6 border-t border-[#272732] text-center">
        <button
          type="button"
          onClick={handleDeleteAccount}
          className="text-xs text-red-400 hover:text-red-300 transition-colors"
        >
          Deactivate & Delete My Account
        </button>
      </div>
    </div>
  );
};
