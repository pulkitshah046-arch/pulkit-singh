import React from 'react';
import { X, ShieldCheck, FileText, AlertTriangle, Mail } from 'lucide-react';

interface LegalModalProps {
  type: 'terms' | 'privacy' | 'guidelines' | 'contact' | null;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ type, onClose }) => {
  if (!type) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="max-w-2xl w-full bg-[#191922] border border-[#272732] rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[85vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-[#A1A1AA] hover:text-white hover:bg-[#111118]"
        >
          <X className="w-5 h-5" />
        </button>

        {type === 'terms' && (
          <div className="overflow-y-auto pr-2 space-y-4 text-xs text-[#A1A1AA] leading-relaxed">
            <div className="flex items-center gap-2 text-white font-bold text-lg mb-2">
              <FileText className="w-5 h-5 text-[#E74763]" />
              <span>Terms of Use</span>
            </div>
            <p className="font-semibold text-white">
              1. Independent Project Disclaimer:
            </p>
            <p>
              PCTE MATCH is an independent student initiative developed by adult PCTE students. It is neither officially endorsed, sponsored, affiliated with, nor operated by the PCTE Institute of Engineering and Technology administration.
            </p>
            <p className="font-semibold text-white">
              2. Strict 18+ Age Requirement:
            </p>
            <p>
              You must be at least 18 years of age to register and use PCTE MATCH. Age is strictly calculated from your authentic Date of Birth. Any attempt by minors to falsify records results in immediate permanent banning.
            </p>
            <p className="font-semibold text-white">
              3. Student ID Verification:
            </p>
            <p>
              Access to discover, like, and message other students requires submission of your genuine physical PCTE college ID card. Uploading another person's ID or fraudulent credentials is a violation of these terms.
            </p>
            <p className="font-semibold text-white">
              4. Code of Conduct:
            </p>
            <p>
              Harassment, stalking, extortion, hate speech, sharing non-consensual media, or abusive behavior will result in an immediate account ban and potential referral to campus authorities where applicable.
            </p>
          </div>
        )}

        {type === 'privacy' && (
          <div className="overflow-y-auto pr-2 space-y-4 text-xs text-[#A1A1AA] leading-relaxed">
            <div className="flex items-center gap-2 text-white font-bold text-lg mb-2">
              <ShieldCheck className="w-5 h-5 text-[#31C48D]" />
              <span>Privacy Policy & ID Security</span>
            </div>
            <p className="font-semibold text-white">
              1. Confidential Physical ID Storage:
            </p>
            <p>
              Uploaded student ID cards are stored in private, access-controlled offline storage. ID card photos are NEVER publicly accessible, NEVER served to other students, and NEVER shared with advertising third parties.
            </p>
            <p className="font-semibold text-white">
              2. Public Profile Data Boundary:
            </p>
            <p>
              Other verified students can only see your chosen display name, computed age, course, academic year, selected public photos, bio, interests, and prompt answers. Your email address, phone number, and ID card image are strictly private.
            </p>
            <p className="font-semibold text-white">
              3. Data Retention & Deletion:
            </p>
            <p>
              You have the right to pause your discovery card or delete your account at any time through your profile settings. Account deletion deactivates your profile and revokes matching immediately.
            </p>
          </div>
        )}

        {type === 'guidelines' && (
          <div className="overflow-y-auto pr-2 space-y-4 text-xs text-[#A1A1AA] leading-relaxed">
            <div className="flex items-center gap-2 text-white font-bold text-lg mb-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <span>Campus Community Guidelines</span>
            </div>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-white">Be Authentic:</strong> Use your real name and actual photos. Catfishing and fake profiles are prohibited.</li>
              <li><strong className="text-white">Respect Consent:</strong> A match is an invitation to converse respectfully. If someone asks you to stop or unmatches, respect their boundary.</li>
              <li><strong className="text-white">Keep It Campus-Friendly:</strong> No explicit, pornographic, or violent images on profile pictures.</li>
              <li><strong className="text-white">Zero Tolerance for Harassment:</strong> Any reports of intimidation, threats, or unsolicited explicit content lead to immediate suspension.</li>
            </ul>
          </div>
        )}

        {type === 'contact' && (
          <div className="overflow-y-auto pr-2 space-y-4 text-xs text-[#A1A1AA] leading-relaxed text-center py-4">
            <div className="w-12 h-12 rounded-2xl bg-[#E74763]/10 border border-[#E74763]/30 mx-auto flex items-center justify-center text-[#E74763] mb-3">
              <Mail className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-white">Founder & Support Contact</h3>
            <p className="max-w-md mx-auto">
              PCTE MATCH is maintained by the founder as a dedicated student discovery initiative. For verification inquiries, safety escalations, or account questions, reach out directly:
            </p>
            <div className="p-4 bg-[#111118] border border-[#272732] rounded-2xl max-w-sm mx-auto text-center">
              <span className="text-[10px] text-[#A1A1AA] uppercase font-bold block mb-1">FOUNDER EMAIL</span>
              <span className="text-white font-semibold text-sm">pulkitshah046@gmail.com</span>
            </div>
            <p className="text-[11px] text-[#71717A]">
              Response time is typically within 12 to 24 hours.
            </p>
          </div>
        )}

        <div className="pt-4 mt-auto border-t border-[#272732] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-[#111118] hover:bg-[#272732] text-white text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
