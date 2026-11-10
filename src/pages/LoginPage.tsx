import React, { useState } from 'react';
import { Heart, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginPageProps {
  onNavigate: (tab: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed.');
      }

      login(data.token, data.user);

      if (data.user.role === 'FOUNDER') {
        onNavigate('admin');
      } else if (data.user.verificationStatus === 'APPROVED') {
        onNavigate('discover');
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
    <div className="min-h-screen bg-[#09090D] text-white flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
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
        <h2 className="text-2xl font-extrabold tracking-tight">Welcome Back</h2>
        <p className="text-xs text-[#A1A1AA] mt-1">Sign in to your verified student account</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#191922] border border-[#272732] p-6 sm:p-8 rounded-3xl shadow-2xl">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-[#E74763]/10 border border-[#E74763]/30 flex items-start gap-3 text-[#E74763] text-xs">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
                className="w-full px-3.5 py-2.5 bg-[#111118] border border-[#272732] rounded-xl text-xs text-white focus:outline-none focus:border-[#E74763] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-[#111118] border border-[#272732] rounded-xl text-xs text-white focus:outline-none focus:border-[#E74763] transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 rounded-full bg-gradient-to-r from-[#E74763] to-[#A72E48] hover:brightness-110 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-[0_0_20px_rgba(231,71,99,0.35)] flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Signing In...' : 'Sign In'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-[#A1A1AA]">
            Don't have an account yet?{' '}
            <button
              onClick={() => onNavigate('register')}
              className="text-[#E74763] font-bold hover:underline"
            >
              Apply to Join (18+)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
