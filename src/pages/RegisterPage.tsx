import React, { useState } from 'react';
import { Heart, Upload, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface RegisterPageProps {
  onNavigate: (tab: string) => void;
  onOpenLegal: (type: 'terms' | 'privacy') => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigate, onOpenLegal }) => {
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    firstName: '',
    displayNickname: '',
    email: '',
    password: '',
    confirmPassword: '',
    dateOfBirth: '',
    course: 'B.Tech CSE',
    academicYear: '1st Year',
    idConfirmed: false,
    termsAccepted: false,
  });

  const [idFile, setIdFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Exact client-side age calculation matching server
  const calculateAge = (dobString: string): number => {
    if (!dobString) return 0;
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) return 0;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age;
  };

  const age = calculateAge(formData.dateOfBirth);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must not exceed 5 MB.');
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setError('Only JPG, PNG, or WEBP images are allowed.');
        return;
      }
      setError(null);
      setIdFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (age < 18) {
      setError('Registration rejected: You must be at least 18 years old to join PCTE MATCH.');
      return;
    }

    if (!idFile) {
      setError('Please upload a clear photograph of your physical PCTE student ID card.');
      return;
    }

    if (!formData.idConfirmed) {
      setError('Please confirm that you are submitting your own authentic student ID.');
      return;
    }

    if (!formData.termsAccepted) {
      setError('You must accept the Terms of Service & Privacy Policy.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    const payload = new FormData();
    payload.append('firstName', formData.firstName);
    payload.append('displayNickname', formData.displayNickname.trim());
    payload.append('email', formData.email);
    payload.append('password', formData.password);
    payload.append('confirmPassword', formData.confirmPassword);
    payload.append('dateOfBirth', formData.dateOfBirth);
    payload.append('course', formData.course);
    payload.append('academicYear', formData.academicYear);
    payload.append('termsAccepted', String(formData.termsAccepted));
    payload.append('idCard', idFile);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        body: payload,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      login(data.token, data.user);

      if (data.user.role === 'FOUNDER') {
        onNavigate('admin');
      } else {
        onNavigate('pending');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090D] text-white flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <button
          onClick={() => onNavigate('landing')}
          className="inline-flex items-center gap-2 mb-3 focus:outline-none"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#E74763] to-[#A72E48] flex items-center justify-center shadow-[0_0_20px_rgba(231,71,99,0.35)]">
            <Heart className="w-4 h-4 text-white fill-white" />
          </div>
          <span className="font-extrabold text-lg tracking-wider text-white">PCTE MATCH</span>
        </button>
        <h2 className="text-2xl font-extrabold tracking-tight">Apply for Student Access</h2>
        <p className="text-xs text-[#A1A1AA] mt-1">
          Exclusively for verified PCTE students aged 18 and above.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-[#191922] border border-[#272732] p-6 sm:p-8 rounded-3xl shadow-2xl">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-[#E74763]/10 border border-[#E74763]/30 flex items-start gap-3 text-[#E74763] text-xs">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Identity & Anonymous Nickname */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">
                  Real First Name <span className="text-[10px] text-[#71717A]">(as on ID)</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aryan"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#111118] border border-[#272732] rounded-xl text-xs text-white focus:outline-none focus:border-[#E74763] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">
                  Anonymous Nickname <span className="text-[10px] text-[#31C48D]">(Public)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. CampusCoder (optional)"
                  value={formData.displayNickname}
                  onChange={(e) => setFormData({ ...formData, displayNickname: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#111118] border border-[#272732] rounded-xl text-xs text-white focus:outline-none focus:border-[#E74763] transition-colors"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Email Address</label>
              <input
                type="email"
                required
                placeholder="student@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#111118] border border-[#272732] rounded-xl text-xs text-white focus:outline-none focus:border-[#E74763] transition-colors"
              />
            </div>

            {/* Date of Birth & Live Age Calculation */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-[#A1A1AA]">Date of Birth (Must be 18+)</label>
                {formData.dateOfBirth && (
                  <span className={`text-[11px] font-bold ${age >= 18 ? 'text-[#31C48D]' : 'text-[#E74763]'}`}>
                    {age >= 18 ? `Age: ${age} (Verified 18+)` : `Age: ${age} (Under 18 - Not Eligible)`}
                  </span>
                )}
              </div>
              <input
                type="date"
                required
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#111118] border border-[#272732] rounded-xl text-xs text-white focus:outline-none focus:border-[#E74763] transition-colors"
              />
            </div>

            {/* Course & Academic Year */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">PCTE Course</label>
                <select
                  value={formData.course}
                  onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#111118] border border-[#272732] rounded-xl text-xs text-white focus:outline-none focus:border-[#E74763]"
                >
                  <option value="B.Tech CSE">B.Tech CSE</option>
                  <option value="B.Tech AI & DS">B.Tech AI & DS</option>
                  <option value="B.Tech ME">B.Tech ME</option>
                  <option value="B.Tech CE">B.Tech CE</option>
                  <option value="BBA">BBA</option>
                  <option value="BCA">BCA</option>
                  <option value="B.Pharmacy">B.Pharmacy</option>
                  <option value="MBA / MCA">MBA / MCA</option>
                  <option value="Other PCTE Course">Other PCTE Course</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Academic Year</label>
                <select
                  value={formData.academicYear}
                  onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#111118] border border-[#272732] rounded-xl text-xs text-white focus:outline-none focus:border-[#E74763]"
                >
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </select>
              </div>
            </div>

            {/* Password & Confirm */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Password (8+ chars)</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#111118] border border-[#272732] rounded-xl text-xs text-white focus:outline-none focus:border-[#E74763]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Confirm Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#111118] border border-[#272732] rounded-xl text-xs text-white focus:outline-none focus:border-[#E74763]"
                />
              </div>
            </div>

            {/* Physical ID Upload Box */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-[#A1A1AA] mb-1 flex items-center justify-between">
                <span>Upload Physical PCTE ID Card (Front)</span>
                <span className="text-[10px] text-[#71717A]">JPG, PNG, WEBP (Max 5MB)</span>
              </label>

              <div className="relative border-2 border-dashed border-[#272732] hover:border-[#E74763]/60 rounded-2xl p-4 transition-all text-center bg-[#111118]/50">
                {imagePreview ? (
                  <div className="relative group max-h-48 overflow-hidden rounded-xl">
                    <img src={imagePreview} alt="PCTE ID Preview" className="w-full h-44 object-cover rounded-xl" />
                    <button
                      type="button"
                      onClick={() => { setIdFile(null); setImagePreview(null); }}
                      className="absolute top-2 right-2 px-3 py-1 rounded-lg bg-black/80 text-xs text-white hover:bg-[#E74763] transition-colors"
                    >
                      Change Photo
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center py-4">
                    <Upload className="w-8 h-8 text-[#E74763] mb-2 opacity-80" />
                    <span className="text-xs font-medium text-white">Tap to upload student ID photo</span>
                    <span className="text-[11px] text-[#71717A] mt-1">Make sure your name and picture are clearly legible</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-3 pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.idConfirmed}
                  onChange={(e) => setFormData({ ...formData, idConfirmed: e.target.checked })}
                  className="mt-0.5 rounded border-[#272732] text-[#E74763] focus:ring-0 bg-[#111118]"
                />
                <span className="text-xs text-[#A1A1AA] leading-tight">
                  I confirm this is my own authentic, physical PCTE student ID card.
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.termsAccepted}
                  onChange={(e) => setFormData({ ...formData, termsAccepted: e.target.checked })}
                  className="mt-0.5 rounded border-[#272732] text-[#E74763] focus:ring-0 bg-[#111118]"
                />
                <span className="text-xs text-[#A1A1AA] leading-tight">
                  I am 18+ and accept the{' '}
                  <button type="button" onClick={() => onOpenLegal('terms')} className="text-[#E74763] underline">
                    Terms
                  </button>{' '}
                  &{' '}
                  <button type="button" onClick={() => onOpenLegal('privacy')} className="text-[#E74763] underline">
                    Privacy Policy
                  </button>.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || age < 18}
              className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#E74763] to-[#A72E48] hover:brightness-110 disabled:opacity-40 text-white font-bold text-xs transition-all shadow-[0_0_25px_rgba(231,71,99,0.35)] flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Submitting Application...' : 'Submit Application (18+)'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-[#A1A1AA]">
            Already registered?{' '}
            <button
              onClick={() => onNavigate('login')}
              className="text-[#E74763] font-bold hover:underline"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
