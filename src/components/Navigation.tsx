import React, { useState } from 'react';
import { 
  Home, 
  StickyNote, 
  MessageSquare, 
  Users, 
  Settings, 
  Plus, 
  Smartphone, 
  Monitor, 
  LogOut, 
  Check, 
  ChevronDown, 
  Bell, 
  Bug, 
  HelpCircle, 
  WifiOff, 
  Sun,
  Moon,
  Palette,
  User
} from 'lucide-react';
import { useAuth, ThemePreset } from '../context/AuthContext.tsx';
import { UserAvatar } from './UserAvatar.tsx';
import { NotebookLogoBadge } from './NotebookAssets.tsx';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenCreateNote: () => void;
  onOpenNotifications: () => void;
  onOpenAvailability: () => void;
  onOpenBugReport: () => void;
  onOpenSupport: () => void;
  hideBottomNav?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  onOpenCreateNote,
  onOpenNotifications,
  onOpenAvailability,
  onOpenBugReport,
  onOpenSupport,
  hideBottomNav = false
}) => {
  const { 
    currentUser, 
    isOnline, 
    isDarkMode, 
    toggleDarkMode, 
    themePreset,
    setThemePreset,
    logout, 
    unreadNotifsCount, 
    androidPreview, 
    toggleAndroidPreview 
  } = useAuth();
  
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);

  const themeOptions: { id: ThemePreset; name: string; bg: string; dot: string }[] = [
    { id: 'classic-cream', name: 'Classic Cream', bg: '#FAF7F0', dot: '#FFCA05' },
    { id: 'dark-ink', name: 'Dark Ink', bg: '#111111', dot: '#FFCA05' },
    { id: 'electric-yellow', name: 'Electric Yellow', bg: '#FFCA05', dot: '#111111' },
    { id: 'soft-mint', name: 'Soft Mint', bg: '#D8F3DC', dot: '#2D7A58' },
  ];

  return (
    <>
      {/* Top Navigation Bar with Confident Neo-Brutalist Border */}
      <header className="sticky top-0 z-30 bg-[var(--bg-canvas)] border-b-2.5 border-[#111111] dark:border-[#3E3E4A] shadow-[0_2px_0px_rgba(17,17,17,0.06)] transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          
          {/* Zone 1: Brand & Vibe Signal */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveTab('feed')}
              className="group flex items-center gap-2.5 text-left cursor-pointer transition-transform active:translate-x-[1px] active:translate-y-[1px]"
              aria-label="NoteCircle Home"
            >
              <NotebookLogoBadge size="sm" />
              <div className="flex flex-col">
                <span className="font-display font-black text-base text-[#111111] dark:text-[#F5F2EB] leading-none tracking-tight">
                  NoteCircle
                </span>
                <span className="text-[10px] font-black text-[#6B6863] dark:text-[#C8C5BE] tracking-widest uppercase mt-0.5">
                  Private Notebook
                </span>
              </div>
            </button>

            {/* Clickable Live Availability / Vibe Indicator */}
            {currentUser?.availability && (
              <button
                onClick={onOpenAvailability}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[var(--card-surface)] border-2 border-[#111111] dark:border-[#3E3E4A] text-xs font-black text-[#111111] dark:text-[#F5F2EB] shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all cursor-pointer"
                title="Change availability status"
              >
                <span className="text-sm select-none">{currentUser.availability.emoji}</span>
                <span className="truncate max-w-[110px]">{currentUser.availability.label}</span>
                {currentUser.availability.strictDnd && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="Strict DND" />
                )}
              </button>
            )}

            {!isOnline && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-black text-[#111111] bg-[#FFCA05] border-2 border-[#111111] px-2.5 py-0.5 rounded-xl shadow-[2px_2px_0px_#111111]">
                <WifiOff className="w-3 h-3" /> Offline
              </span>
            )}
          </div>

          {/* Zone 2: Desktop Segmented Navigation */}
          <nav className="hidden md:flex items-center gap-1 p-1 bg-[var(--card-surface-subtle)] rounded-2xl border-2 border-[#111111] dark:border-[#3E3E4A] shadow-[2px_2px_0px_#111111] text-xs font-black">
            <button
              onClick={() => setActiveTab('feed')}
              className={`px-4 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'feed'
                  ? 'bg-[#FFCA05] text-[#111111] border-1.5 border-[#111111] shadow-[1.5px_1.5px_0px_#111111]'
                  : 'text-[#4A4742] dark:text-[#C8C5BE] hover:text-[#111111] dark:hover:text-white'
              }`}
            >
              STREAM
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`px-4 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'notes'
                  ? 'bg-[#FFCA05] text-[#111111] border-1.5 border-[#111111] shadow-[1.5px_1.5px_0px_#111111]'
                  : 'text-[#4A4742] dark:text-[#C8C5BE] hover:text-[#111111] dark:hover:text-white'
              }`}
            >
              NOTES
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-4 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-[#FFCA05] text-[#111111] border-1.5 border-[#111111] shadow-[1.5px_1.5px_0px_#111111]'
                  : 'text-[#4A4742] dark:text-[#C8C5BE] hover:text-[#111111] dark:hover:text-white'
              }`}
            >
              CHAT
            </button>
            <button
              onClick={() => setActiveTab('connections')}
              className={`px-4 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'connections'
                  ? 'bg-[#FFCA05] text-[#111111] border-1.5 border-[#111111] shadow-[1.5px_1.5px_0px_#111111]'
                  : 'text-[#4A4742] dark:text-[#C8C5BE] hover:text-[#111111] dark:hover:text-white'
              }`}
            >
              CIRCLE
            </button>
          </nav>

          {/* Zone 3: Actions & Profile */}
          <div className="flex items-center gap-2">
            
            {/* Theme Presets Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowThemePicker(!showThemePicker)}
                className="w-9 h-9 rounded-xl border-2 border-[#111111] dark:border-[#3E3E4A] bg-[var(--card-surface)] text-[#111111] dark:text-[#F5F2EB] shadow-[2px_2px_0px_#111111] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] flex items-center justify-center transition-all cursor-pointer"
                title="Theme Presets"
                aria-label="Theme Presets"
              >
                <Palette className="w-4 h-4" />
              </button>

              {showThemePicker && (
                <div 
                  className="absolute right-0 mt-2 w-48 rounded-2xl bg-[var(--card-surface)] border-2.5 border-[#111111] dark:border-[#3E3E4A] shadow-[4px_4px_0px_#111111] p-2 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-100"
                  onClick={() => setShowThemePicker(false)}
                >
                  <div className="px-2 py-1 text-[10px] font-black uppercase text-[#6B6863] dark:text-[#C8C5BE] tracking-wider border-b border-black/10 dark:border-white/10 mb-1">
                    Theme Presets
                  </div>
                  {themeOptions.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setThemePreset(opt.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        themePreset === opt.id
                          ? 'bg-[#FFCA05] text-[#111111] border-1.5 border-[#111111] shadow-[1px_1px_0px_#111111]'
                          : 'text-[var(--text-primary)] hover:bg-[var(--card-surface-subtle)]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-3.5 h-3.5 rounded-full border border-[#111111]" 
                          style={{ backgroundColor: opt.dot }} 
                        />
                        <span>{opt.name}</span>
                      </div>
                      {themePreset === opt.id && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Dark Mode Quick Toggle */}
            <button
              onClick={toggleDarkMode}
              className="w-9 h-9 rounded-xl border-2 border-[#111111] dark:border-[#3E3E4A] bg-[var(--card-surface)] text-[#111111] dark:text-[#F5F2EB] shadow-[2px_2px_0px_#111111] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] flex items-center justify-center transition-all cursor-pointer"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-[#FFCA05]" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Mobile / Android Companion Toggle */}
            <button
              onClick={toggleAndroidPreview}
              title={androidPreview ? 'Exit Mobile Frame' : 'Simulate Mobile Frame'}
              className="hidden lg:flex w-9 h-9 rounded-xl border-2 border-[#111111] dark:border-[#3E3E4A] bg-[var(--card-surface)] text-[#111111] dark:text-[#F5F2EB] shadow-[2px_2px_0px_#111111] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] items-center justify-center transition-all cursor-pointer"
            >
              {androidPreview ? <Monitor className="w-4 h-4 text-[#FFCA05]" /> : <Smartphone className="w-4 h-4" />}
            </button>

            {/* Help / Support (Desktop) */}
            <button
              onClick={onOpenSupport}
              className="hidden xl:flex w-9 h-9 rounded-xl border-2 border-[#111111] dark:border-[#3E3E4A] bg-[var(--card-surface)] text-[#111111] dark:text-[#F5F2EB] shadow-[2px_2px_0px_#111111] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] items-center justify-center transition-all cursor-pointer"
              title="Help & Safety Center"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* Bug Report (Desktop) */}
            <button
              onClick={onOpenBugReport}
              className="hidden xl:flex w-9 h-9 rounded-xl border-2 border-[#111111] dark:border-[#3E3E4A] bg-[var(--card-surface)] text-[#111111] dark:text-[#F5F2EB] shadow-[2px_2px_0px_#111111] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] items-center justify-center transition-all cursor-pointer"
              title="Report a Problem"
            >
              <Bug className="w-4 h-4" />
            </button>

            {/* Notifications */}
            <button
              onClick={onOpenNotifications}
              className="w-9 h-9 rounded-xl border-2 border-[#111111] dark:border-[#3E3E4A] bg-[var(--card-surface)] text-[#111111] dark:text-[#F5F2EB] shadow-[2px_2px_0px_#111111] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] flex items-center justify-center relative transition-all cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#FF6B6B] border-1.5 border-[#111111] rounded-full" />
              )}
            </button>

            {/* Settings Button (STRICT: Accessible through header gear only) */}
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-9 h-9 rounded-xl border-2 border-[#111111] dark:border-[#3E3E4A] shadow-[2px_2px_0px_#111111] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] flex items-center justify-center transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-[#FFCA05] text-[#111111]'
                  : 'bg-[var(--card-surface)] text-[#111111] dark:text-[#F5F2EB]'
              }`}
              title="Settings & Privacy"
              aria-label="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Desktop Post Note Button */}
            <button
              onClick={onOpenCreateNote}
              className="hidden md:inline-flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-[#FFCA05] text-[#111111] border-2 border-[#111111] text-xs font-black uppercase tracking-wider shadow-[3px_3px_0px_#111111] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>POST NOTE</span>
            </button>

            {/* User Dropdown */}
            <div className="relative ml-0.5">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-1.5 p-0.5 rounded-full hover:scale-105 transition-transform cursor-pointer"
                aria-label="User menu"
              >
                <UserAvatar
                  src={currentUser?.avatarUrl}
                  name={currentUser?.displayName || currentUser?.username || 'User'}
                  size="sm"
                  isOnline={isOnline}
                />
                <ChevronDown className="w-3.5 h-3.5 text-[#6B6863] dark:text-[#C8C5BE] hidden sm:block" />
              </button>

              {showUserDropdown && (
                <div 
                  className="absolute right-0 mt-2 w-60 rounded-2xl bg-[var(--card-surface)] border-2.5 border-[#111111] dark:border-[#3E3E4A] shadow-[5px_5px_0px_#111111] py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                  onClick={() => setShowUserDropdown(false)}
                >
                  <div className="px-4 py-2.5 border-b-2 border-black/10 dark:border-white/10">
                    <p className="text-xs font-black text-[#111111] dark:text-[#F5F2EB] truncate">
                      {currentUser?.displayName || currentUser?.username}
                    </p>
                    <p className="text-[11px] font-bold text-[#6B6863] dark:text-[#C8C5BE] truncate">
                      @{currentUser?.username}
                    </p>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => setActiveTab('profile')}
                      className="w-full px-4 py-2 text-left text-xs font-bold text-[#111111] dark:text-[#F5F2EB] hover:bg-[#FFCA05] hover:text-[#111111] flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>My Profile</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('settings')}
                      className="w-full px-4 py-2 text-left text-xs font-bold text-[#111111] dark:text-[#F5F2EB] hover:bg-[#FFCA05] hover:text-[#111111] flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Settings & Privacy</span>
                    </button>
                    <button
                      onClick={onOpenAvailability}
                      className="w-full px-4 py-2 text-left text-xs font-bold text-[#111111] dark:text-[#F5F2EB] hover:bg-[#FFCA05] hover:text-[#111111] flex items-center gap-2 cursor-pointer transition-colors sm:hidden"
                    >
                      <span>{currentUser?.availability?.emoji || '✨'}</span>
                      <span>Update Status</span>
                    </button>
                  </div>

                  <div className="pt-1 border-t-2 border-black/10 dark:border-white/10">
                    <button
                      onClick={logout}
                      className="w-full px-4 py-2 text-left text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/40 flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* Tactile Mobile Floating Navigation Dock (EXACTLY 5 ITEMS) */}
      {!hideBottomNav && (
        <nav 
          aria-label="Mobile Navigation"
          className="md:hidden fixed bottom-3 left-4 right-4 max-w-sm mx-auto z-40 bg-[var(--card-surface)] border-2.5 border-[#111111] dark:border-[#3E3E4A] shadow-[5px_5px_0px_#111111] rounded-2xl px-2 py-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] grid grid-cols-5 items-center justify-items-center transition-all"
        >
          {/* 1. Stream */}
          <button
            onClick={() => setActiveTab('feed')}
            className={`flex flex-col items-center justify-center w-full py-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'feed'
                ? 'bg-[#FFCA05] text-[#111111] border-1.5 border-[#111111] shadow-[1.5px_1.5px_0px_#111111] font-black scale-102'
                : 'text-[#6B6863] dark:text-[#C8C5BE] hover:text-[#111111] dark:hover:text-white font-bold'
            }`}
            aria-label="Feed Stream"
          >
            <Home className="w-5 h-5 stroke-[2.5]" />
            <span className="text-[9px] mt-0.5 tracking-tight uppercase">STREAM</span>
          </button>

          {/* 2. Notes */}
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex flex-col items-center justify-center w-full py-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'notes'
                ? 'bg-[#FFCA05] text-[#111111] border-1.5 border-[#111111] shadow-[1.5px_1.5px_0px_#111111] font-black scale-102'
                : 'text-[#6B6863] dark:text-[#C8C5BE] hover:text-[#111111] dark:hover:text-white font-bold'
            }`}
            aria-label="My Notes"
          >
            <StickyNote className="w-5 h-5 stroke-[2.5]" />
            <span className="text-[9px] mt-0.5 tracking-tight uppercase">NOTES</span>
          </button>

          {/* 3. Center Elevated Action Button (Create Note) */}
          <button
            onClick={onOpenCreateNote}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-[#FFCA05] text-[#111111] border-2.5 border-[#111111] shadow-[3.5px_3.5px_0px_#111111] -translate-y-3 hover:-translate-y-3.5 active:translate-y-0 active:shadow-[1px_1px_0px_#111111] transition-all cursor-pointer"
            aria-label="Create Note"
            title="Create Note"
          >
            <Plus className="w-7 h-7 stroke-[3]" />
          </button>

          {/* 4. Chat */}
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex flex-col items-center justify-center w-full py-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-[#FFCA05] text-[#111111] border-1.5 border-[#111111] shadow-[1.5px_1.5px_0px_#111111] font-black scale-102'
                : 'text-[#6B6863] dark:text-[#C8C5BE] hover:text-[#111111] dark:hover:text-white font-bold'
            }`}
            aria-label="Private Chat"
          >
            <MessageSquare className="w-5 h-5 stroke-[2.5]" />
            <span className="text-[9px] mt-0.5 tracking-tight uppercase">CHAT</span>
          </button>

          {/* 5. Circle */}
          <button
            onClick={() => setActiveTab('connections')}
            className={`flex flex-col items-center justify-center w-full py-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'connections'
                ? 'bg-[#FFCA05] text-[#111111] border-1.5 border-[#111111] shadow-[1.5px_1.5px_0px_#111111] font-black scale-102'
                : 'text-[#6B6863] dark:text-[#C8C5BE] hover:text-[#111111] dark:hover:text-white font-bold'
            }`}
            aria-label="Search and Connections"
          >
            <Users className="w-5 h-5 stroke-[2.5]" />
            <span className="text-[9px] mt-0.5 tracking-tight uppercase">CIRCLE</span>
          </button>
        </nav>
      )}
    </>
  );
};
