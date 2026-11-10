/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { BottomNav } from './components/layout/BottomNav';
import { LegalModal } from './components/LegalModal';
import { LandingPage } from './pages/LandingPage';
import { RegisterPage } from './pages/RegisterPage';
import { LoginPage } from './pages/LoginPage';
import { PendingVerificationPage } from './pages/PendingVerificationPage';
import { DiscoverPage } from './pages/DiscoverPage';
import { MatchesPage } from './pages/MatchesPage';
import { ChatPage } from './pages/ChatPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { RefreshCw } from 'lucide-react';

function MainApp() {
  const { user, isLoading } = useAuth();

  const [currentTab, setCurrentTab] = useState<string>('landing');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [legalModalType, setLegalModalType] = useState<'terms' | 'privacy' | 'guidelines' | 'contact' | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Sync initial tab based on user auth status
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        if (currentTab !== 'register' && currentTab !== 'login') {
          setCurrentTab('landing');
        }
      } else {
        if (user.role === 'FOUNDER') {
          if (currentTab === 'landing' || currentTab === 'login' || currentTab === 'register') {
            setCurrentTab('admin');
          }
        } else if (user.verificationStatus === 'APPROVED') {
          if (currentTab === 'landing' || currentTab === 'login' || currentTab === 'register' || currentTab === 'pending') {
            setCurrentTab('discover');
          }
        } else {
          setCurrentTab('pending');
        }
      }
    }
  }, [user, isLoading]);

  const handleOpenConversation = (convId: string) => {
    setActiveConversationId(convId);
    setCurrentTab('chat');
  };

  const handleBackFromChat = () => {
    setActiveConversationId(null);
    setCurrentTab('matches');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#09090D] flex flex-col items-center justify-center text-white gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#E74763] to-[#A72E48] flex items-center justify-center animate-pulse shadow-[0_0_20px_rgba(231,71,99,0.4)]">
          <RefreshCw className="w-5 h-5 text-white animate-spin" />
        </div>
        <span className="text-xs font-semibold text-[#A1A1AA]">Initializing PCTE MATCH...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090D] text-white flex flex-col">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onNavigate={(tab) => {
          setActiveConversationId(null);
          setCurrentTab(tab);
        }}
        onOpenLegal={(type) => setLegalModalType(type)}
      />

      {/* Main Page Content */}
      <main className="flex-1">
        {currentTab === 'landing' && (
          <LandingPage
            onNavigate={(tab) => setCurrentTab(tab)}
            onOpenLegal={(type) => setLegalModalType(type)}
          />
        )}

        {currentTab === 'register' && (
          <RegisterPage
            onNavigate={(tab) => setCurrentTab(tab)}
            onOpenLegal={(type) => setLegalModalType(type)}
          />
        )}

        {currentTab === 'login' && (
          <LoginPage
            onNavigate={(tab) => setCurrentTab(tab)}
          />
        )}

        {currentTab === 'pending' && (
          <PendingVerificationPage
            onNavigate={(tab) => setCurrentTab(tab)}
          />
        )}

        {currentTab === 'discover' && (
          <DiscoverPage
            onStartChat={() => setCurrentTab('matches')}
            onNavigate={(tab) => setCurrentTab(tab)}
          />
        )}

        {currentTab === 'matches' && (
          <MatchesPage
            onSelectConversation={handleOpenConversation}
            onNavigate={(tab) => setCurrentTab(tab)}
          />
        )}

        {currentTab === 'chat' && activeConversationId && (
          <ChatPage
            conversationId={activeConversationId}
            onBack={handleBackFromChat}
          />
        )}

        {currentTab === 'profile' && (
          <ProfilePage
            onNavigate={(tab) => setCurrentTab(tab)}
          />
        )}

        {currentTab === 'admin' && (
          <AdminDashboardPage
            onNavigate={(tab) => setCurrentTab(tab)}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      {currentTab !== 'chat' && (
        <BottomNav
          currentTab={currentTab}
          onNavigate={(tab) => {
            setActiveConversationId(null);
            setCurrentTab(tab);
          }}
          unreadCount={unreadCount}
        />
      )}

      {/* Global Legal & Guidelines Modal */}
      <LegalModal
        type={legalModalType}
        onClose={() => setLegalModalType(null)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
