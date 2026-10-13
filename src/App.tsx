import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navigation } from './components/Navigation.tsx';
import { HomeFeed } from './components/HomeFeed.tsx';
import { NotesHistory } from './components/NotesHistory.tsx';
import { ChatView } from './components/ChatView.tsx';
import { SearchAndConnections } from './components/SearchAndConnections.tsx';
import { ProfileView } from './components/ProfileView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { AdminPanel } from './components/AdminPanel.tsx';
import { CreateNoteModal } from './components/CreateNoteModal.tsx';
import { NotificationsModal } from './components/NotificationsModal.tsx';
import { AvailabilityModal } from './components/AvailabilityModal.tsx';
import { BugReportModal } from './components/BugReportModal.tsx';
import { SupportModal } from './components/SupportModal.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { AndroidFrame } from './components/AndroidFrame.tsx';
import { NotebookLogoBadge, WelcomeCelebrationIllustration } from './components/NotebookAssets.tsx';
import { ShieldCheck, LogIn } from 'lucide-react';

function MainApp() {
  const { currentUser, androidPreview } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('feed');
  const [viewingProfileUsername, setViewingProfileUsername] = useState<string | null>(null);
  const [activeChatUserId, setActiveChatUserId] = useState<string | undefined>(undefined);
  
  // Modals state
  const [isCreateNoteOpen, setIsCreateNoteOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(false);
  const [isBugReportOpen, setIsBugReportOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isChatActiveOnMobile, setIsChatActiveOnMobile] = useState(false);

  const handleOpenProfile = (username: string) => {
    setViewingProfileUsername(username);
    setActiveTab('profile');
  };

  const handleOpenChatWithUser = (userId: string) => {
    setActiveChatUserId(userId);
    setActiveTab('chat');
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'feed':
        return (
          <HomeFeed
            onOpenCreateNote={() => setIsCreateNoteOpen(true)}
            onOpenAvailability={() => setIsAvailabilityOpen(true)}
            onOpenChatWithUser={handleOpenChatWithUser}
            onOpenProfile={handleOpenProfile}
            onNavigate={(tab) => {
              setViewingProfileUsername(null);
              setActiveTab(tab);
            }}
            onOpenNotifications={() => setIsNotificationsOpen(true)}
            onOpenSettings={() => setActiveTab('settings')}
          />
        );
      case 'notes':
        return (
          <NotesHistory
            onOpenCreateNote={() => setIsCreateNoteOpen(true)}
          />
        );
      case 'chat':
        return (
          <ChatView
            initialUserId={activeChatUserId}
            onActiveConversationChange={setIsChatActiveOnMobile}
          />
        );
      case 'connections':
        return (
          <SearchAndConnections
            onOpenProfile={handleOpenProfile}
            onOpenChatWithUser={handleOpenChatWithUser}
          />
        );
      case 'profile':
        return (
          <ProfileView
            username={viewingProfileUsername || currentUser?.username}
            onOpenChatWithUser={handleOpenChatWithUser}
            onOpenCreateNote={() => setIsCreateNoteOpen(true)}
          />
        );
      case 'settings':
        return (
          <SettingsView
            onOpenSupport={() => setIsSupportOpen(true)}
            onOpenBugReport={() => setIsBugReportOpen(true)}
          />
        );
      case 'admin':
        return <AdminPanel />;
      default:
        return (
          <HomeFeed
            onOpenCreateNote={() => setIsCreateNoteOpen(true)}
            onOpenAvailability={() => setIsAvailabilityOpen(true)}
            onOpenChatWithUser={handleOpenChatWithUser}
            onOpenProfile={handleOpenProfile}
          />
        );
    }
  };

  const [showCelebration, setShowCelebration] = useState(() => {
    return !!sessionStorage.getItem('notecircle_just_registered');
  });

  const handleDismissCelebration = () => {
    sessionStorage.removeItem('notecircle_just_registered');
    setShowCelebration(false);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[var(--bg-canvas)] text-[#111111] dark:text-[#F5F2EB] flex flex-col font-sans transition-colors relative overflow-hidden bg-notebook-grain">
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6 relative z-10">
          <div className="max-w-lg w-full text-center space-y-6 animate-in fade-in duration-200">
            {/* Distinctive Neo-Brutalist Logo Mark */}
            <div className="inline-flex items-center justify-center">
              <NotebookLogoBadge size="lg" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#FFCA05] border-2 border-[#111111] text-[11px] font-black text-[#111111] shadow-[2px_2px_0px_#111111] uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Zero Public Discovery · E2E Encrypted</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-[#111111] dark:text-[#F5F2EB] tracking-tight font-display">
                NoteCircle
              </h1>
              <p className="text-sm sm:text-base font-semibold text-[#4A4742] dark:text-[#C8C5BE] max-w-md mx-auto leading-relaxed">
                Private notes & chat for your trusted circle.
              </p>
              <p className="text-xs font-black text-[#111111] dark:text-[#FFCA05] uppercase tracking-wider">
                Private by default · Temporary by design · Meaningful by choice
              </p>
            </div>

            {/* 3 Interactive Tactile Notebook Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
              <div className="p-3.5 rounded-2xl bg-[var(--card-surface)] border-2 border-[#111111] dark:border-[#3E3E4A] shadow-[3px_3px_0px_#111111] space-y-1">
                <span className="text-lg">🚫</span>
                <p className="text-xs font-black text-[#111111] dark:text-[#F5F2EB]">No Public Feeds</p>
                <p className="text-[11px] text-[#4A4742] dark:text-[#C8C5BE] leading-tight">Only people you approve see what you share.</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-[var(--card-surface)] border-2 border-[#111111] dark:border-[#3E3E4A] shadow-[3px_3px_0px_#111111] space-y-1">
                <span className="text-lg">⏱️</span>
                <p className="text-xs font-black text-[#111111] dark:text-[#F5F2EB]">Temporary Notes</p>
                <p className="text-[11px] text-[#4A4742] dark:text-[#C8C5BE] leading-tight">Status updates and thoughts expire naturally.</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-[var(--card-surface)] border-2 border-[#111111] dark:border-[#3E3E4A] shadow-[3px_3px_0px_#111111] space-y-1">
                <span className="text-lg">🔐</span>
                <p className="text-xs font-black text-[#111111] dark:text-[#F5F2EB]">Encrypted Chat</p>
                <p className="text-[11px] text-[#4A4742] dark:text-[#C8C5BE] leading-tight">Client-side encryption. The server stores zero plaintext.</p>
              </div>
            </div>

            {/* Action Box */}
            <div className="p-6 rounded-3xl bg-[var(--card-surface)] border-2.5 border-[#111111] dark:border-[#3E3E4A] shadow-[5px_5px_0px_#111111] space-y-4">
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="w-full py-3.5 px-6 rounded-2xl bg-[#FFCA05] text-[#111111] border-2.5 border-[#111111] font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[4px_4px_0px_#111111] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_#111111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#111111] transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4 stroke-[2.5]" />
                <span>Enter Your Private Circle</span>
              </button>
            </div>
          </div>
        </main>

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#111413] text-[#191D1A] dark:text-[#F5F7F5] flex flex-col font-sans transition-colors">
      
      {/* Main Glassmorphic Navigation */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setViewingProfileUsername(null);
          setActiveTab(tab);
        }}
        onOpenCreateNote={() => setIsCreateNoteOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenAvailability={() => setIsAvailabilityOpen(true)}
        onOpenBugReport={() => setIsBugReportOpen(true)}
        onOpenSupport={() => setIsSupportOpen(true)}
        hideBottomNav={activeTab === 'chat' && isChatActiveOnMobile}
      />

      {/* Core Body: Responsive Web or Android Device Shell */}
      <main className={`flex-1 ${(activeTab === 'chat' && isChatActiveOnMobile) ? 'pb-0' : 'pb-24 md:pb-8'} w-full max-w-full overflow-x-hidden`}>
        {androidPreview ? (
          <AndroidFrame
            activeTitle={
              activeTab === 'feed' ? 'Circle Feed' :
              activeTab === 'notes' ? 'My Notes' :
              activeTab === 'chat' ? 'Private Chat' :
              activeTab === 'connections' ? 'Find People' :
              activeTab === 'profile' ? `@${viewingProfileUsername || currentUser?.username}` :
              activeTab === 'settings' ? 'Settings' : 'Admin'
            }
            onBack={viewingProfileUsername ? () => setViewingProfileUsername(null) : undefined}
          >
            {renderTabContent()}
          </AndroidFrame>
        ) : (
          renderTabContent()
        )}
      </main>

      {/* Modals */}
      <CreateNoteModal
        isOpen={isCreateNoteOpen}
        onClose={() => setIsCreateNoteOpen(false)}
        onNoteCreated={() => {
          // If in feed, trigger feed refresh or switch to feed
          if (activeTab === 'feed') {
            window.dispatchEvent(new CustomEvent('notecircle:note_created'));
          }
        }}
      />

      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onOpenChat={(userId) => {
          setIsNotificationsOpen(false);
          handleOpenChatWithUser(userId);
        }}
      />

      <AvailabilityModal
        isOpen={isAvailabilityOpen}
        onClose={() => setIsAvailabilityOpen(false)}
      />

      <BugReportModal
        isOpen={isBugReportOpen}
        onClose={() => setIsBugReportOpen(false)}
      />

      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
      />

      {showCelebration && currentUser && (
        <WelcomeCelebrationIllustration
          username={currentUser.username}
          onDismiss={handleDismissCelebration}
        />
      )}
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
