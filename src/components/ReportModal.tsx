import React, { useState } from 'react';
import { Flag, X, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: string;
  targetUserName: string;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  targetUserId,
  targetUserName,
}) => {
  const { token } = useAuth();
  const [category, setCategory] = useState<string>('HARASSMENT');
  const [details, setDetails] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/moderation/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          reportedUserId: targetUserId,
          category,
          details,
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit report.');

      setSuccessMessage(data.message || 'Report submitted successfully.');
      setTimeout(() => {
        onClose();
        setSuccessMessage(null);
        setDetails('');
      }, 1800);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="max-w-md w-full bg-[#191922] border border-[#272732] rounded-3xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#A1A1AA] hover:text-white hover:bg-[#111118]"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 text-amber-400 mb-2">
          <Flag className="w-5 h-5" />
          <h3 className="font-bold text-base text-white">Report Student Profile</h3>
        </div>
        <p className="text-xs text-[#A1A1AA] mb-4">
          Reporting <span className="text-white font-medium">{targetUserName}</span>. Reports are handled privately by the founder.
        </p>

        {successMessage ? (
          <div className="py-8 text-center text-xs text-[#31C48D] flex flex-col items-center gap-2">
            <CheckCircle className="w-8 h-8" />
            <span>{successMessage}</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-[#E74763]/10 border border-[#E74763]/30 text-xs text-[#E74763] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Reason for Report</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#111118] border border-[#272732] rounded-xl text-xs text-white focus:outline-none focus:border-[#E74763]"
              >
                <option value="HARASSMENT">Harassment or Bullying</option>
                <option value="INAPPROPRIATE_CONTENT">Inappropriate Content or Photos</option>
                <option value="FAKE_PROFILE">Fake Profile or Impersonation</option>
                <option value="SPAM">Spam or Commercial Solicitation</option>
                <option value="UNDERAGE">Suspected Under 18</option>
                <option value="OTHER">Other Community Guideline Violation</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Details & Context</label>
              <textarea
                required
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Please describe what happened..."
                className="w-full px-3.5 py-2.5 bg-[#111118] border border-[#272732] rounded-xl text-xs text-white focus:outline-none focus:border-[#E74763] resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-full text-xs text-[#A1A1AA] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !details.trim()}
                className="px-5 py-2.5 rounded-full bg-[#E74763] hover:bg-[#F05874] disabled:opacity-50 text-white font-bold text-xs transition-all shadow-[0_0_15px_rgba(231,71,99,0.3)]"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
