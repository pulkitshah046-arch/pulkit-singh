import React, { useState } from 'react';
import {
  Heart,
  ShieldCheck,
  Lock,
  GraduationCap,
  Sparkles,
  ChevronDown,
  AlertCircle,
  Users,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

interface LandingPageProps {
  onNavigate: (tab: string) => void;
  onOpenLegal: (type: 'terms' | 'privacy' | 'guidelines' | 'contact') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, onOpenLegal }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const faqs = [
    {
      q: 'Who is eligible to join PCTE MATCH?',
      a: 'Only verified adult students aged 18 and above currently enrolled at PCTE Institute of Engineering and Technology. Every applicant must submit a photograph of their physical college ID card, which is reviewed privately by the founder before matching features are unlocked.'
    },
    {
      q: 'Is PCTE MATCH officially affiliated with the college?',
      a: 'No. PCTE MATCH is an independent student project created by students for students. It is neither officially endorsed, sponsored, nor affiliated with the PCTE administration.'
    },
    {
      q: 'Can anyone see my uploaded student ID card?',
      a: 'No. Student ID cards are stored in private, unexposed offline storage and are never served over public URLs or visible to other students. Only the founder inspects the card to verify active enrollment and 18+ adult age.'
    },
    {
      q: 'Can people message me without matching first?',
      a: 'No. PCTE MATCH implements genuine mutual matching. Chat access is strictly gated: Student A likes Student B and Student B likes Student A. You can unmatch or block anyone at any moment.'
    },
    {
      q: 'How does age verification work?',
      a: 'Your age is calculated on the server using your exact Date of Birth. If the calculation is below 18, registration is completely rejected.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#09090D] text-white flex flex-col justify-between selection:bg-[#E74763] selection:text-white">
      {/* Top Banner Notice */}
      <div className="bg-[#111118] border-b border-[#272732] py-2 px-4 text-center text-xs text-[#A1A1AA] flex items-center justify-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-[#E74763] animate-pulse"></span>
        <span>Independent student project • Strictly 18+ verified members • Not an official college product</span>
      </div>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-16 pb-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
          {/* Ambient Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[500px] h-[320px] sm:h-[500px] bg-[#E74763]/15 rounded-full blur-[130px] pointer-events-none" />

          {/* 18+ Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#191922] border border-[#272732] text-xs text-[#A1A1AA] mb-6 shadow-sm">
            <span className="w-5 h-5 rounded-full bg-[#E74763]/20 text-[#E74763] font-bold flex items-center justify-center text-[10px]">
              18+
            </span>
            <span>Exclusively for verified PCTE students</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.12] mb-6">
            Find your person. <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#E74763] via-[#F05874] to-[#FFA07A]">
              Start your story.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-[#A1A1AA] leading-relaxed mb-8">
            A private, vetted social and dating space built strictly for verified adult PCTE students. No random outsiders, no fake profiles—just real campus connections.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto">
            <button
              onClick={() => onNavigate('register')}
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-gradient-to-r from-[#E74763] to-[#A72E48] hover:brightness-110 text-white font-bold text-sm transition-all shadow-[0_0_25px_rgba(231,71,99,0.35)] hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <span>Get Verified & Join (18+)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate('login')}
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#191922] hover:bg-[#111118] border border-[#272732] text-white font-semibold text-sm transition-all text-center"
            >
              Sign In to Account
            </button>
          </div>

          {/* Key Value Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16 text-left">
            <div className="p-5 rounded-2xl bg-[#191922]/70 border border-[#272732] backdrop-blur-sm">
              <ShieldCheck className="w-6 h-6 text-[#31C48D] mb-3" />
              <h3 className="font-bold text-sm text-white">Physical ID Verified</h3>
              <p className="text-xs text-[#A1A1AA] mt-1 leading-relaxed">
                Every applicant submits their front college ID card for founder review.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-[#191922]/70 border border-[#272732] backdrop-blur-sm">
              <Lock className="w-6 h-6 text-[#E74763] mb-3" />
              <h3 className="font-bold text-sm text-white">Private & Match-Gated</h3>
              <p className="text-xs text-[#A1A1AA] mt-1 leading-relaxed">
                ID images are never public. Only mutual matches can ever message you.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-[#191922]/70 border border-[#272732] backdrop-blur-sm">
              <GraduationCap className="w-6 h-6 text-purple-400 mb-3" />
              <h3 className="font-bold text-sm text-white">Campus Community</h3>
              <p className="text-xs text-[#A1A1AA] mt-1 leading-relaxed">
                Connect with adult students across engineering, business, and campus programs.
              </p>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 bg-[#111118] border-t border-[#272732]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">How PCTE MATCH Works</h2>
              <p className="text-xs sm:text-sm text-[#A1A1AA] mt-2">
                Four simple steps to real, vetted campus connections.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="flex flex-col items-center text-center p-4">
                <div className="w-14 h-14 rounded-2xl bg-[#191922] border border-[#272732] flex items-center justify-center text-[#E74763] font-bold text-xl mb-4 shadow-md">
                  1
                </div>
                <h3 className="font-bold text-sm text-white mb-1">Create Account</h3>
                <p className="text-xs text-[#A1A1AA]">Register with your DOB (18+ calculated), email, and PCTE course.</p>
              </div>

              <div className="flex flex-col items-center text-center p-4">
                <div className="w-14 h-14 rounded-2xl bg-[#191922] border border-[#272732] flex items-center justify-center text-[#E74763] font-bold text-xl mb-4 shadow-md">
                  2
                </div>
                <h3 className="font-bold text-sm text-white mb-1">Upload College ID</h3>
                <p className="text-xs text-[#A1A1AA]">Submit a clear front photo of your physical card for founder approval.</p>
              </div>

              <div className="flex flex-col items-center text-center p-4">
                <div className="w-14 h-14 rounded-2xl bg-[#191922] border border-[#272732] flex items-center justify-center text-[#E74763] font-bold text-xl mb-4 shadow-md">
                  3
                </div>
                <h3 className="font-bold text-sm text-white mb-1">Build Your Profile</h3>
                <p className="text-xs text-[#A1A1AA]">Add photos, choose campus interest chips, and answer dating prompts.</p>
              </div>

              <div className="flex flex-col items-center text-center p-4">
                <div className="w-14 h-14 rounded-2xl bg-[#191922] border border-[#272732] flex items-center justify-center text-[#E74763] font-bold text-xl mb-4 shadow-md">
                  4
                </div>
                <h3 className="font-bold text-sm text-white mb-1">Mutual Match & Chat</h3>
                <p className="text-xs text-[#A1A1AA]">Like profiles. When both say yes, private one-on-one chat is unlocked!</p>
              </div>
            </div>
          </div>
        </section>

        {/* Safety & Legal Box */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          <div className="p-6 sm:p-8 rounded-3xl bg-[#191922] border border-[#272732] relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="p-4 rounded-2xl bg-[#E74763]/10 border border-[#E74763]/20 shrink-0">
                <AlertCircle className="w-8 h-8 text-[#E74763]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white mb-1">Student Safety & Privacy Transparency</h3>
                <p className="text-xs text-[#A1A1AA] leading-relaxed mb-3">
                  PCTE MATCH protects your data. ID cards are reviewed exclusively by the founder and are NEVER displayed publicly or shared with third parties. Unapproved users cannot browse or message anyone.
                </p>
                <div className="flex flex-wrap gap-4 text-[11px] text-[#A1A1AA]">
                  <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-[#31C48D]" /> Strict Anti-Catfish</span>
                  <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-[#31C48D]" /> Instant Block & Report</span>
                  <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-[#31C48D]" /> Zero Unsolicited Messaging</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Accordion */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto border-t border-[#272732]">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="rounded-2xl bg-[#191922] border border-[#272732] overflow-hidden"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full py-4 px-5 text-left flex justify-between items-center hover:bg-[#111118] transition-colors"
                >
                  <span className="font-semibold text-xs sm:text-sm text-white">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-[#A1A1AA] transition-transform duration-200 ${openFaq === index ? 'rotate-180 text-[#E74763]' : ''}`} />
                </button>
                {openFaq === index && (
                  <div className="px-5 pb-4 text-xs text-[#A1A1AA] border-t border-[#272732]/50 pt-3 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#111118] border-t border-[#272732] py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-center sm:text-left">
            <span className="font-bold text-base tracking-wider text-white">PCTE MATCH</span>
            <p className="text-xs text-[#A1A1AA] mt-1">
              Find your person. Start your story.
            </p>
            <p className="text-[10px] text-[#71717A] mt-2 max-w-md">
              Disclaimer: PCTE MATCH is an independent student project and is not affiliated with, endorsed by, or sponsored by PCTE Institute of Engineering and Technology.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-[#A1A1AA]">
            <button onClick={() => onOpenLegal('terms')} className="hover:text-white transition-colors">
              Terms of Use
            </button>
            <button onClick={() => onOpenLegal('privacy')} className="hover:text-white transition-colors">
              Privacy Policy
            </button>
            <button onClick={() => onOpenLegal('guidelines')} className="hover:text-white transition-colors">
              Community Guidelines
            </button>
            <button onClick={() => onOpenLegal('contact')} className="hover:text-white transition-colors">
              Founder Support
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-[#272732]/60 text-center text-xs text-[#71717A]">
          © {new Date().getFullYear()} PCTE MATCH. Strictly 18+ verified members.
        </div>
      </footer>
    </div>
  );
};
