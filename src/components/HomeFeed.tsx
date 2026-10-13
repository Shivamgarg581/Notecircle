import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  MessageSquare, 
  Send, 
  Trash2, 
  Plus, 
  Calendar, 
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api.ts';
import { localDb } from '../services/localDb.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { UserAvatar } from './UserAvatar.tsx';
import { WashiTape, NotebookEmptyIllustration, StampBadge } from './NotebookAssets.tsx';
import type { Note } from '../types/index.ts';

interface HomeFeedProps {
  onOpenCreateNote: () => void;
  onOpenAvailability?: () => void;
  onOpenChatWithUser?: (userId: string) => void;
  onOpenProfile?: (username: string) => void;
  onNavigate?: (tab: string) => void;
  onOpenNotifications?: () => void;
  onOpenSettings?: () => void;
}

const QUICK_REACTION_EMOJIS = ['❤️', '☕', '✨', '👏', '💡', '🌱'];

export const HomeFeed: React.FC<HomeFeedProps> = ({
  onOpenCreateNote,
  onOpenAvailability,
  onOpenChatWithUser,
  onOpenProfile,
  onNavigate
}) => {
  const { currentUser, isOnline, isUserOnline } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [circleMembers, setCircleMembers] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'notes' | 'conversations' | 'plans'>('all');
  const [replyInput, setReplyInput] = useState<Record<string, string>>({});
  const [submittingReply, setSubmittingReply] = useState<Record<string, boolean>>({});
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [newPlanTitle, setNewPlanTitle] = useState('');
  const [newPlanTime, setNewPlanTime] = useState('');
  const [newPlanLocation, setNewPlanLocation] = useState('');

  const fetchFeed = async () => {
    try {
      if (navigator.onLine) {
        const [feedRes, circleRes, plansRes, chatRes] = await Promise.all([
          api.getFeed(),
          currentUser ? api.getCircleStatus() : Promise.resolve({ circleMembers: [] }),
          currentUser ? api.getPlans() : Promise.resolve({ plans: [] }),
          currentUser ? api.getConversations() : Promise.resolve({ conversations: [] })
        ]);

        setNotes(feedRes.notes || []);
        setCircleMembers(circleRes.circleMembers || []);
        setPlans(plansRes.plans || []);
        setConversations(chatRes.conversations || []);

        for (const n of feedRes.notes || []) {
          await localDb.saveNote(n);
        }
      } else {
        if (currentUser) {
          const cached = await localDb.getNotesByUser(currentUser.id);
          setNotes(cached);
        }
      }
    } catch (err) {
      console.error('Failed to load feed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, [currentUser, isOnline]);

  useEffect(() => {
    const handleNoteCreated = () => fetchFeed();
    window.addEventListener('notecircle:note_created', handleNoteCreated);
    return () => window.removeEventListener('notecircle:note_created', handleNoteCreated);
  }, []);

  const handleToggleReaction = async (noteId: string, emoji: string) => {
    try {
      const res = await api.toggleReaction(noteId, emoji);
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? res.note : n))
      );
    } catch (err) {
      console.error('Reaction failed:', err);
    }
  };

  const handleSendReply = async (noteId: string) => {
    const text = replyInput[noteId]?.trim();
    if (!text) return;

    setSubmittingReply((prev) => ({ ...prev, [noteId]: true }));
    try {
      const res = await api.addReply(noteId, text);
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? res.note : n))
      );
      setReplyInput((prev) => ({ ...prev, [noteId]: '' }));
    } catch (err) {
      console.error('Reply failed:', err);
    } finally {
      setSubmittingReply((prev) => ({ ...prev, [noteId]: false }));
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await api.deleteNote(noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (err) {
      console.error('Delete note failed:', err);
    }
  };

  const formatExpiration = (expiresAt?: string | null) => {
    if (!expiresAt) return 'Permanent';
    const remaining = Math.max(0, new Date(expiresAt).getTime() - Date.now());
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h remaining`;
    return `${mins}m remaining`;
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const activeCircleMembers = circleMembers.filter((m) => isUserOnline(m.id));

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 sm:py-7 space-y-6">
      
      {/* Intimate Greeting & Date Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-lg bg-[#FFCA05] text-[#111111] border-1.5 border-[#111111] text-[10px] font-black uppercase tracking-wider shadow-[1.5px_1.5px_0px_#111111]">
              {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-[#111111] dark:text-[#F5F2EB] tracking-tight">
            {greeting()}, {currentUser?.displayName?.split(' ')[0] || currentUser?.username || 'Friend'}
          </h1>
        </div>

        {currentUser?.availability && (
          <button
            onClick={onOpenAvailability}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--card-surface)] border-2 border-[#111111] dark:border-[#3E3E4A] text-xs font-black text-[#111111] dark:text-[#F5F2EB] shadow-[2.5px_2.5px_0px_#111111] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all cursor-pointer"
            title="Update your current status"
          >
            <span className="text-base select-none">{currentUser.availability.emoji}</span>
            <span className="hidden sm:inline">{currentUser.availability.label}</span>
          </button>
        )}
      </div>

      {/* Active People in Circle Carousel */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-black text-[#111111] dark:text-[#F5F2EB] uppercase tracking-wider text-[11px]">
            Circle Members Online
          </span>
          <span className="text-[10px] font-bold text-[#6B6863] dark:text-[#C8C5BE]">
            {activeCircleMembers.length} active
          </span>
        </div>

        {activeCircleMembers.length > 0 ? (
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
            {activeCircleMembers.map((member) => (
              <button
                key={member.id}
                onClick={() => onOpenProfile?.(member.username)}
                className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer"
              >
                <div className="p-0.5 rounded-full border-2 border-[#111111] shadow-[2px_2px_0px_#111111] group-hover:scale-105 transition-transform">
                  <UserAvatar
                    src={member.avatarUrl}
                    name={member.displayName || member.username}
                    size="md"
                    isOnline={true}
                  />
                </div>
                <span className="text-[11px] font-bold text-[#111111] dark:text-[#F5F2EB] max-w-[68px] truncate">
                  {member.displayName?.split(' ')[0] || member.username}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-3.5 bg-[var(--card-surface)] rounded-2xl border-2 border-[#111111] dark:border-[#3E3E4A] shadow-[2px_2px_0px_#111111] text-center">
            <p className="text-xs font-semibold text-[#4A4742] dark:text-[#C8C5BE]">
              No circle connections active right now.
            </p>
          </div>
        )}
      </div>

      {/* Segmented Filter Bar */}
      <div className="flex items-center gap-1.5 p-1 bg-[var(--card-surface-subtle)] rounded-2xl border-2 border-[#111111] dark:border-[#3E3E4A] shadow-[2px_2px_0px_#111111] text-xs font-black">
        <button
          onClick={() => setActiveFilter('all')}
          className={`flex-1 py-1.5 px-3 rounded-xl transition-all cursor-pointer text-center ${
            activeFilter === 'all'
              ? 'bg-[#FFCA05] text-[#111111] border-1.5 border-[#111111] shadow-[1px_1px_0px_#111111]'
              : 'text-[#4A4742] dark:text-[#C8C5BE] hover:text-[#111111]'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setActiveFilter('notes')}
          className={`flex-1 py-1.5 px-3 rounded-xl transition-all cursor-pointer text-center ${
            activeFilter === 'notes'
              ? 'bg-[#FFCA05] text-[#111111] border-1.5 border-[#111111] shadow-[1px_1px_0px_#111111]'
              : 'text-[#4A4742] dark:text-[#C8C5BE] hover:text-[#111111]'
          }`}
        >
          Notes ({notes.length})
        </button>
        <button
          onClick={() => setActiveFilter('conversations')}
          className={`flex-1 py-1.5 px-3 rounded-xl transition-all cursor-pointer text-center ${
            activeFilter === 'conversations'
              ? 'bg-[#FFCA05] text-[#111111] border-1.5 border-[#111111] shadow-[1px_1px_0px_#111111]'
              : 'text-[#4A4742] dark:text-[#C8C5BE] hover:text-[#111111]'
          }`}
        >
          Chat ({conversations.length})
        </button>
        <button
          onClick={() => setActiveFilter('plans')}
          className={`flex-1 py-1.5 px-3 rounded-xl transition-all cursor-pointer text-center ${
            activeFilter === 'plans'
              ? 'bg-[#FFCA05] text-[#111111] border-1.5 border-[#111111] shadow-[1px_1px_0px_#111111]'
              : 'text-[#4A4742] dark:text-[#C8C5BE] hover:text-[#111111]'
          }`}
        >
          Plans ({plans.length})
        </button>
      </div>

      {/* Tactile Post Note Action Banner */}
      <div 
        onClick={onOpenCreateNote}
        className="p-4 sm:p-5 rounded-3xl bg-[#FFCA05] border-2.5 border-[#111111] shadow-[4px_4px_0px_#111111] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_#111111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#111111] transition-all cursor-pointer group flex items-center justify-between gap-4 select-none relative overflow-hidden"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#FAF7F0] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] flex items-center justify-center text-xl shrink-0">
            ✍️
          </div>
          <div>
            <p className="text-sm font-black text-[#111111] tracking-tight uppercase">
              Write a Note for Your Circle
            </p>
            <p className="text-xs font-semibold text-[#111111]/80 mt-0.5">
              Auto-expires in 24 hours · Shared with approved people only
            </p>
          </div>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-[#111111] text-[#FFCA05] flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#111111] group-hover:scale-105 transition-transform">
          <Plus className="w-6 h-6 stroke-[3]" />
        </div>
      </div>

      {/* Notes Stream */}
      {(activeFilter === 'all' || activeFilter === 'notes') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black font-display text-[#111111] dark:text-[#F5F2EB] uppercase tracking-wide">
              Circle Notes
            </h2>
            <button
              onClick={() => onNavigate?.('notes')}
              className="text-xs font-black text-[#111111] dark:text-[#FFCA05] hover:underline cursor-pointer flex items-center gap-1 uppercase tracking-wider"
            >
              <span>Archive</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {notes.length > 0 ? (
            <div className="space-y-4">
              {notes.map((note) => {
                const isMine = currentUser && note.userId === currentUser.id;
                const isExpanded = !!expandedReplies[note.id];
                const replies = note.replies || [];

                return (
                  <div 
                    key={note.id}
                    className="p-5 rounded-3xl bg-[var(--card-surface)] border-2.5 border-[#111111] dark:border-[#3E3E4A] shadow-[4px_4px_0px_#111111] space-y-3.5 relative"
                  >
                    {/* Washi-Tape Sticker */}
                    <div className="flex items-center justify-between">
                      <div 
                        onClick={() => onOpenProfile?.(note.author?.username || '')}
                        className="flex items-center gap-2.5 cursor-pointer group"
                      >
                        <UserAvatar
                          src={note.author?.avatarUrl}
                          name={note.author?.displayName || note.author?.username || 'Circle'}
                          size="sm"
                        />
                        <div>
                          <p className="text-xs font-black text-[#111111] dark:text-[#F5F2EB] group-hover:underline">
                            {note.author?.displayName || note.author?.username}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#6B6863] dark:text-[#C8C5BE]">
                            <span>@{note.author?.username}</span>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 stroke-[2.5]" />
                              {formatExpiration(note.expiresAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {note.categoryLabel && (
                          <WashiTape 
                            color="yellow" 
                            label={`${note.emoji || ''} ${note.categoryLabel}`} 
                          />
                        )}

                        {isMine && (
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="text-[#6B6863] hover:text-rose-600 transition-colors p-1 rounded-lg cursor-pointer"
                            title="Delete note"
                          >
                            <Trash2 className="w-4 h-4 stroke-[2]" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Note Content */}
                    <p className="text-sm sm:text-base text-[#111111] dark:text-[#F5F2EB] leading-relaxed whitespace-pre-wrap font-medium">
                      {note.text}
                    </p>

                    {/* Reactions & Reply Toggle */}
                    <div className="pt-2 border-t-2 border-black/10 dark:border-white/10 flex items-center justify-between flex-wrap gap-2">
                      {/* Reaction Buttons */}
                      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                        {QUICK_REACTION_EMOJIS.map((emoji) => {
                          const hasReacted = note.reactions?.some((r) => r.emoji === emoji && r.userId === currentUser?.id);
                          const count = note.reactions?.filter((r) => r.emoji === emoji).length || 0;
                          return (
                            <button
                              key={emoji}
                              onClick={() => handleToggleReaction(note.id, emoji)}
                              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border-1.5 ${
                                hasReacted
                                  ? 'bg-[#FFCA05] text-[#111111] border-[#111111] shadow-[1.5px_1.5px_0px_#111111]'
                                  : 'bg-[var(--card-surface-subtle)] text-[#4A4742] dark:text-[#C8C5BE] border-transparent hover:border-[#111111]'
                              }`}
                            >
                              <span>{emoji}</span>
                              {count > 0 && <span className="text-[10px] font-black">{count}</span>}
                            </button>
                          );
                        })}
                      </div>

                      {/* Reply Toggle */}
                      <button
                        onClick={() => setExpandedReplies((prev) => ({ ...prev, [note.id]: !prev[note.id] }))}
                        className="text-xs font-black text-[#111111] dark:text-[#F5F2EB] flex items-center gap-1.5 cursor-pointer py-1 px-2.5 rounded-xl border-1.5 border-[#111111] dark:border-[#3E3E4A] bg-[var(--card-surface-subtle)] shadow-[1.5px_1.5px_0px_#111111]"
                      >
                        <MessageSquare className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>{replies.length > 0 ? `${replies.length} replies` : 'Reply'}</span>
                      </button>
                    </div>

                    {/* Inline Expandable Replies */}
                    {isExpanded && (
                      <div className="pt-3 border-t-2 border-black/10 dark:border-white/10 space-y-3">
                        {replies.length > 0 && (
                          <div className="space-y-2 pl-3 border-l-2.5 border-[#FFCA05]">
                            {replies.map((reply: any, rIdx: number) => (
                              <div key={rIdx} className="text-xs space-y-0.5">
                                <div className="flex items-center gap-1.5 text-[#6B6863] dark:text-[#C8C5BE]">
                                  <span className="font-black text-[#111111] dark:text-[#F5F2EB]">
                                    {reply.author?.displayName || reply.author?.username || 'Friend'}
                                  </span>
                                  <span>·</span>
                                  <span className="text-[10px] font-bold">
                                    {new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-[#111111] dark:text-[#F5F2EB] font-medium">
                                  {reply.text}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Reply Input Form */}
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={replyInput[note.id] || ''}
                            onChange={(e) => setReplyInput((prev) => ({ ...prev, [note.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendReply(note.id);
                              }
                            }}
                            placeholder="Write a private reply..."
                            className="neo-input text-xs py-2 px-3 flex-1"
                          />
                          <button
                            onClick={() => handleSendReply(note.id)}
                            disabled={submittingReply[note.id] || !(replyInput[note.id] || '').trim()}
                            className="p-2.5 rounded-xl bg-[#FFCA05] text-[#111111] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] disabled:opacity-40 cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <NotebookEmptyIllustration
              onAction={onOpenCreateNote}
              actionText="Post Your First Note"
            />
          )}
        </div>
      )}

      {/* Chat Preview Section */}
      {(activeFilter === 'all' || activeFilter === 'conversations') && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black font-display text-[#111111] dark:text-[#F5F2EB] uppercase tracking-wide">
              Recent Conversations
            </h2>
            <button
              onClick={() => onNavigate?.('chat')}
              className="text-xs font-black text-[#111111] dark:text-[#FFCA05] hover:underline cursor-pointer flex items-center gap-1 uppercase tracking-wider"
            >
              <span>Open Chat</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {conversations.length > 0 ? (
            <div className="rounded-3xl bg-[var(--card-surface)] border-2.5 border-[#111111] dark:border-[#3E3E4A] shadow-[4px_4px_0px_#111111] divide-y-2 divide-black/10 dark:divide-white/10 overflow-hidden">
              {conversations.slice(0, 3).map((conv) => {
                const other = conv.participants?.find((p: any) => p.id !== currentUser?.id) || conv.participants?.[0];
                const lastMsg = conv.lastMessage?.text || 'Encrypted conversation';
                return (
                  <div
                    key={conv.id}
                    onClick={() => other?.id && (onOpenChatWithUser ? onOpenChatWithUser(other.id) : onNavigate?.('chat'))}
                    className="p-3.5 flex items-center justify-between gap-3 hover:bg-[#FFCA05]/20 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar
                        src={other?.avatarUrl}
                        name={other?.displayName || 'Friend'}
                        size="md"
                      />
                      <div className="min-w-0">
                        <p className="font-black text-xs text-[#111111] dark:text-[#F5F2EB] truncate">
                          {conv.title || other?.displayName}
                        </p>
                        <p className="text-xs font-medium text-[#4A4742] dark:text-[#C8C5BE] truncate mt-0.5">
                          {lastMsg}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase text-[#111111] dark:text-[#FFCA05] bg-[#FFCA05]/20 dark:bg-[#FFCA05]/10 px-2 py-0.5 rounded-lg border border-[#111111] shrink-0">
                      E2EE
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 rounded-3xl bg-[var(--card-surface)] border-2.5 border-[#111111] dark:border-[#3E3E4A] shadow-[4px_4px_0px_#111111] text-center space-y-2">
              <p className="text-xs font-black text-[#111111] dark:text-[#F5F2EB]">
                No active conversations yet
              </p>
              <p className="text-xs text-[#4A4742] dark:text-[#C8C5BE]">
                Private 1:1 messages are end-to-end encrypted with zero server plaintext.
              </p>
              <button
                onClick={() => onNavigate?.('chat')}
                className="neo-btn py-1.5 px-3 text-xs"
              >
                Start a Chat
              </button>
            </div>
          )}
        </div>
      )}

      {/* Circle Plans & Meetups Card */}
      {(activeFilter === 'all' || activeFilter === 'plans') && (
        <div className="rounded-3xl bg-[var(--card-surface)] border-2.5 border-[#111111] dark:border-[#3E3E4A] shadow-[4px_4px_0px_#111111] p-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#111111] dark:text-[#FFCA05]" />
              <h3 className="text-sm font-black font-display text-[#111111] dark:text-[#F5F2EB] uppercase tracking-wide">
                Circle Meetups & Plans
              </h3>
            </div>
            <button
              onClick={() => setShowCreatePlanModal(true)}
              className="text-xs font-black text-[#111111] dark:text-[#FFCA05] hover:underline cursor-pointer uppercase tracking-wider"
            >
              + Propose Plan
            </button>
          </div>

          {plans.length === 0 ? (
            <p className="text-xs text-[#4A4742] dark:text-[#C8C5BE]">
              No plans scheduled yet. Coordinate coffee, dinner, or a walk with your circle.
            </p>
          ) : (
            <div className="space-y-2">
              {plans.slice(0, 3).map((p) => (
                <div key={p.id} className="p-3 bg-[var(--card-surface-subtle)] rounded-2xl border-1.5 border-[#111111] flex items-center justify-between gap-3 shadow-[2px_2px_0px_#111111]">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-[#111111] dark:text-[#F5F2EB] truncate">{p.title}</p>
                    <p className="text-[11px] font-semibold text-[#4A4742] dark:text-[#C8C5BE] mt-0.5">{p.scheduledTime} {p.location && `· ${p.location}`}</p>
                  </div>
                  <button
                    onClick={async () => {
                      await api.rsvpPlan(p.id, 'attending');
                      const res = await api.getPlans();
                      setPlans(res.plans);
                    }}
                    className="px-3 py-1 rounded-xl text-xs font-black bg-[#FFCA05] text-[#111111] border-1.5 border-[#111111] shadow-[1px_1px_0px_#111111] cursor-pointer shrink-0"
                  >
                    Going
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Plan Modal */}
      {showCreatePlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111111]/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-3xl bg-[var(--card-surface)] border-3 border-[#111111] shadow-[6px_6px_0px_#111111] space-y-4">
            <h3 className="text-base font-black font-display text-[#111111] dark:text-[#F5F2EB] flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              <span>Propose Circle Plan</span>
            </h3>

            <div>
              <label className="text-xs font-black uppercase text-[#111111] dark:text-[#F5F2EB] block mb-1">
                Plan Title
              </label>
              <input
                type="text"
                value={newPlanTitle}
                onChange={(e) => setNewPlanTitle(e.target.value)}
                placeholder="e.g. Saturday Coffee or Weekend Hike"
                className="neo-input text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase text-[#111111] dark:text-[#F5F2EB] block mb-1">
                Date & Time
              </label>
              <input
                type="text"
                value={newPlanTime}
                onChange={(e) => setNewPlanTime(e.target.value)}
                placeholder="e.g. Saturday at 4:00 PM"
                className="neo-input text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase text-[#111111] dark:text-[#F5F2EB] block mb-1">
                Location (Optional)
              </label>
              <input
                type="text"
                value={newPlanLocation}
                onChange={(e) => setNewPlanLocation(e.target.value)}
                placeholder="e.g. Park or Cafe"
                className="neo-input text-xs"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t-2 border-black/10 dark:border-white/10">
              <button
                type="button"
                onClick={() => setShowCreatePlanModal(false)}
                className="neo-btn text-xs py-2 px-4"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!newPlanTitle.trim() || !newPlanTime.trim()}
                onClick={async () => {
                  try {
                    await api.createPlan({
                      title: newPlanTitle.trim(),
                      scheduledTime: newPlanTime.trim(),
                      location: newPlanLocation.trim() || undefined
                    });
                    const res = await api.getPlans();
                    setPlans(res.plans);
                    setShowCreatePlanModal(false);
                    setNewPlanTitle('');
                    setNewPlanTime('');
                    setNewPlanLocation('');
                  } catch (err: any) {
                    console.error('Failed to create plan:', err);
                  }
                }}
                className="neo-btn-primary text-xs py-2 px-5 disabled:opacity-40"
              >
                Create Plan
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
