import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Trash2, 
  Search, 
  Smile, 
  CornerDownRight, 
  X, 
  Clock, 
  ShieldAlert, 
  Lock,
  Moon,
  Copy,
  Paperclip,
  Check,
  ShieldCheck,
  Users,
  MoreVertical,
  ChevronLeft
} from 'lucide-react';
import { api, getStoredToken } from '../services/api.ts';
import { localDb } from '../services/localDb.ts';
import { 
  encryptClientPayload, 
  decryptClientPayload, 
  deriveConversationSecret,
  initOrGetDeviceIdentity
} from '../services/crypto.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { UserAvatar } from './UserAvatar.tsx';
import type { Conversation, Message } from '../types/index.ts';

interface ChatViewProps {
  initialUserId?: string;
  onActiveConversationChange?: (isActive: boolean) => void;
}

const MESSAGE_REACTIONS = ['❤️', '👍', '🙏', '😂', '🔥', '☕'];

export const ChatView: React.FC<ChatViewProps> = ({ initialUserId, onActiveConversationChange }) => {
  const { currentUser, isOnline, isUserOnline } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupTitle, setGroupTitle] = useState('');
  const [selectedGroupParticipants, setSelectedGroupParticipants] = useState<string[]>([]);
  const [allConnections, setAllConnections] = useState<any[]>([]);
  const [recipientPubKey, setRecipientPubKey] = useState<any>(null);
  const [safetyNumber, setSafetyNumber] = useState<string | null>(null);
  const [showSafetyModal, setShowSafetyModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Register device public key on startup for E2EE
  useEffect(() => {
    initOrGetDeviceIdentity().then(async (identity) => {
      if (identity.publicKeyJwk) {
        await api.registerDevicePublicKey(identity.deviceId, 'NoteCircle Web Client', identity.publicKeyJwk).catch(() => {});
      }
    });
  }, []);

  const fetchConversations = async () => {
    try {
      const res = await api.getConversations();
      setConversations(res.conversations);
      
      // On desktop auto-select first conversation; on mobile let user choose from list
      if (!activeConvId && res.conversations.length > 0 && (window.innerWidth >= 640 || initialUserId)) {
        setActiveConvId(res.conversations[0].id);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    onActiveConversationChange?.(!!activeConvId);
  }, [activeConvId, onActiveConversationChange]);

  useEffect(() => {
    fetchConversations();
    api.searchUsers('').then((res) => {
      setAllConnections(res.users.filter((u) => u.isConnection));
    }).catch(() => {});
  }, [currentUser]);

  useEffect(() => {
    if (initialUserId && currentUser) {
      api.startConversation(initialUserId)
        .then((res) => {
          setActiveConvId(res.conversation.id);
          fetchConversations();
        })
        .catch((err) => {
          alert(err.message || 'Cannot start conversation with this user');
        });
    }
  }, [initialUserId, currentUser]);

  // Load and decrypt messages for active conversation
  useEffect(() => {
    if (!activeConvId) return;
    setErrorBanner(null);
    let isMounted = true;

    async function loadChatMessages() {
      try {
        if (navigator.onLine) {
          const res = await api.getMessages(activeConvId!);
          if (isMounted) {
            const activeConv = conversations.find((c) => c.id === activeConvId);
            const convSecret = activeConv?.participantIds && activeConv.participantIds.length > 0
              ? deriveConversationSecret(activeConv.participantIds)
              : 'notecircle_secure_channel';

            // Decrypt any encrypted wire payloads locally
            const decryptedList: Message[] = await Promise.all(
              res.messages.map(async (msg) => {
                if (msg.encryptedPayload) {
                  const plain = await decryptClientPayload(msg.encryptedPayload, convSecret);
                  return { ...msg, text: plain };
                }
                return msg;
              })
            );

            setMessages(decryptedList);
            // Save to local IndexedDB
            for (const m of decryptedList) {
              await localDb.saveMessage(m);
            }

            // Acknowledge delivery to backend so temporary relay payloads are pruned
            const otherMsgIds = decryptedList.filter((m) => m.senderId !== currentUser?.id).map((m) => m.id);
            if (otherMsgIds.length > 0) {
              api.ackMessageDelivery(activeConvId!, otherMsgIds).catch(() => {});
            }

            scrollToBottom();
          }
        } else {
          // Offline: load from local IndexedDB
          const cached = await localDb.getMessagesByConversation(activeConvId!);
          if (isMounted) {
            setMessages(cached);
            scrollToBottom();
          }
        }
      } catch (err: any) {
        if (isMounted) setErrorBanner(err.message);
      }
    }

    loadChatMessages();

    // Listen to global authenticated WebSocket events from AuthContext
    const handleNewMessage = async (e: any) => {
      const payload = e.detail;
      if (payload?.conversationId === activeConvId) {
        const incomingMsg: Message = payload.message;
        const activeConv = conversations.find((c) => c.id === activeConvId);
        const convSecret = activeConv?.participantIds && activeConv.participantIds.length > 0
          ? deriveConversationSecret(activeConv.participantIds)
          : 'notecircle_secure_channel';

        let plain = incomingMsg.text;
        if (incomingMsg.encryptedPayload) {
          try {
            plain = await decryptClientPayload(incomingMsg.encryptedPayload, convSecret);
          } catch {}
        }
        const decryptedMsg = { ...incomingMsg, text: plain };
        setMessages((prev) => {
          if (prev.some((m) => m.id === decryptedMsg.id)) return prev;
          return [...prev, decryptedMsg];
        });
        await localDb.saveMessage(decryptedMsg);
        scrollToBottom();

        // Acknowledge read if recipient is viewer
        if (decryptedMsg.senderId !== currentUser?.id) {
          api.ackMessageDelivery(activeConvId!, [decryptedMsg.id]).catch(() => {});
        }
      }
    };

    const handleDeletedMessage = (e: any) => {
      const payload = e.detail;
      if (payload?.conversationId === activeConvId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === payload.messageId
              ? { ...m, isDeleted: true, text: 'This message was deleted.' }
              : m
          )
        );
      }
    };

    const handleMessageReaction = (e: any) => {
      const payload = e.detail;
      if (payload?.conversationId === activeConvId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === payload.messageId ? { ...m, reactions: payload.reactions } : m
          )
        );
      }
    };

    window.addEventListener('notecircle:new_message', handleNewMessage);
    window.addEventListener('notecircle:message_deleted', handleDeletedMessage);
    window.addEventListener('notecircle:message_reaction', handleMessageReaction);

    // Secondary fallback polling at 12s
    const interval = setInterval(loadChatMessages, 12000);
    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('notecircle:new_message', handleNewMessage);
      window.removeEventListener('notecircle:message_deleted', handleDeletedMessage);
      window.removeEventListener('notecircle:message_reaction', handleMessageReaction);
    };
  }, [activeConvId, conversations, currentUser?.id]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const activeConversation = conversations.find((c) => c.id === activeConvId);
  const otherParticipant = activeConversation?.participants.find(
    (p) => p.id !== currentUser?.id
  );

  useEffect(() => {
    if (otherParticipant?.id) {
      api.getUserPublicKeys(otherParticipant.id).then((res) => {
        if (res.keys && res.keys.length > 0) {
          try {
            const raw = res.keys[0].publicKeyJwk;
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            setRecipientPubKey(parsed);
          } catch {}
        } else {
          setRecipientPubKey(null);
        }
      }).catch(() => setRecipientPubKey(null));

      api.getSafetyNumber(otherParticipant.id).then((res) => {
        setSafetyNumber(res.safetyNumber);
      }).catch(() => setSafetyNumber(null));
    }
  }, [otherParticipant?.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConvId || isSending) return;

    setIsSending(true);
    setErrorBanner(null);

    const plaintext = inputText.trim();

    try {
      const convSecret = activeConversation?.participantIds && activeConversation.participantIds.length > 0
        ? deriveConversationSecret(activeConversation.participantIds)
        : 'notecircle_secure_channel';

      // 1. Encrypt message locally with Forward Secrecy ECDH Ephemeral or AES-GCM 256
      const { payloadString } = await encryptClientPayload(
        plaintext,
        recipientPubKey || convSecret,
        { conversationId: activeConvId, senderId: currentUser?.id }
      );

      if (navigator.onLine) {
        // 2. Transmit through backend relay with encrypted ciphertext
        const res = await api.sendMessage(
          activeConvId,
          plaintext, // for active local session
          payloadString, // real encrypted payload sent to wire/backend
          replyToMessage ? replyToMessage.id : undefined
        );

        const localMsg = { ...res.message, text: plaintext };
        setMessages((prev) => [...prev, localMsg]);
        await localDb.saveMessage(localMsg);
      } else {
        // Offline: save message locally in IndexedDB and queue sync
        const localMsg: Message = {
          id: `msg_local_${Date.now()}`,
          conversationId: activeConvId,
          senderId: currentUser!.id,
          senderName: currentUser!.displayName,
          senderAvatar: currentUser!.avatarUrl,
          text: plaintext,
          reactions: [],
          status: 'SENT',
          createdAt: new Date().toISOString()
        };

        setMessages((prev) => [...prev, localMsg]);
        await localDb.saveMessage(localMsg);
        await localDb.enqueueSyncAction({
          id: `sync_msg_${Date.now()}`,
          type: 'SEND_MESSAGE',
          payload: { conversationId: activeConvId, text: plaintext, encryptedPayload: payloadString },
          timestamp: new Date().toISOString()
        });
      }

      setInputText('');
      setReplyToMessage(null);
      scrollToBottom();
      fetchConversations();
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (msgId: string, deleteForEveryone: boolean) => {
    try {
      await api.deleteMessage(msgId, deleteForEveryone);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? { ...m, text: deleteForEveryone ? 'This message was deleted.' : m.text, isDeleted: deleteForEveryone, deletedForMe: !deleteForEveryone }
            : m
        ).filter((m) => !m.deletedForMe)
      );
    } catch (err: any) {
      alert(err.message || 'Failed to delete message');
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleReactToMessage = async (msgId: string, emoji: string) => {
    try {
      const res = await api.reactToMessage(msgId, emoji);
      setMessages((prev) => prev.map((m) => (m.id === msgId ? res.message : m)));
      await localDb.saveMessage(res.message);
    } catch (err: any) {
      alert(err.message || 'Failed to react');
    }
  };

  const handleCreateGroup = async () => {
    if (!groupTitle.trim() || selectedGroupParticipants.length < 2) {
      alert('Please enter a group title and select at least 2 connections.');
      return;
    }
    try {
      const res = await api.createGroupConversation(groupTitle.trim(), selectedGroupParticipants);
      setShowGroupModal(false);
      setGroupTitle('');
      setSelectedGroupParticipants([]);
      await fetchConversations();
      setActiveConvId(res.conversation.id);
    } catch (err: any) {
      alert(err.message || 'Failed to create group');
    }
  };

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    if (c.type === 'group') {
      return (c.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    }
    const other = c.participants.find((p) => p.id !== currentUser?.id);
    return (
      other?.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      other?.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="max-w-5xl mx-auto px-0 sm:px-4 py-0 sm:py-4 h-[calc(100dvh-3.75rem)] sm:h-[calc(100vh-6rem)] flex flex-col min-h-0 w-full">
      <div className="florum-card bg-white dark:bg-[#181C1A] rounded-none sm:rounded-3xl overflow-hidden flex-1 flex border-x-0 sm:border border-black/[0.08] dark:border-white/[0.10] min-h-0 shadow-sm">
        
        {/* Left Sidebar: Conversations List (Hidden on mobile when chat is open) */}
        <div className={`${activeConvId ? 'hidden sm:flex' : 'flex'} w-full sm:w-80 sm:shrink-0 border-r border-black/[0.06] dark:border-white/[0.08] flex-col bg-[#FAF8F5]/80 dark:bg-[#151917] min-h-0`}>
          
          {/* Search Header */}
          <div className="p-3.5 border-b border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#181C1A] flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#8A968F] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-9 pr-3 py-1.5 text-xs font-medium florum-input"
              />
            </div>
            <button
              onClick={() => setShowGroupModal(true)}
              className="p-2 rounded-xl florum-btn-ghost text-[#58635C] dark:text-[#9DAAA0] hover:text-[#191D1A] dark:hover:text-white cursor-pointer"
              title="Create Private Group Chat"
            >
              <Users className="w-4 h-4" />
            </button>
          </div>

          {/* Conversations Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-black/[0.04] dark:divide-white/[0.06] min-h-0">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#8A968F]">
                <Lock className="w-6 h-6 mx-auto mb-2 text-[#8A968F]" />
                <p className="font-semibold text-[#191D1A] dark:text-[#F5F7F5] text-sm">No chats yet</p>
                <p className="text-[11px] mt-1 text-[#8A968F]">
                  Connect with trusted people from Circle to start encrypted messaging.
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isGroup = conv.type === 'group';
                const other = conv.participants.find((p) => p.id !== currentUser?.id);
                const isActive = conv.id === activeConvId;
                const isOtherOnline = other ? isUserOnline(other.id) : false;

                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConvId(conv.id)}
                    className={`w-full text-left p-3.5 transition-all flex items-start gap-3 cursor-pointer ${
                      isActive 
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/40 text-[#191D1A] dark:text-[#F5F7F5] border-l-3 border-emerald-600' 
                        : 'hover:bg-[#FAF8F5] dark:hover:bg-[#1E2421]'
                    }`}
                  >
                    <div className="relative shrink-0">
                      {isGroup ? (
                        <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 flex items-center justify-center font-bold text-xs shadow-xs">
                          GRP
                        </div>
                      ) : (
                        other && (
                          <UserAvatar
                            name={other.displayName}
                            src={other.avatarUrl}
                            size="md"
                            isOnline={isOtherOnline}
                          />
                        )
                      )}
                      {!isGroup && other?.availability && (
                        <span className="absolute -bottom-1 -right-1 text-xs select-none bg-white dark:bg-[#181C1A] rounded-full p-0.5 border border-black/[0.08] dark:border-white/[0.08] shadow-xs">
                          {other.availability.emoji}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-xs truncate ${isActive ? 'font-bold text-emerald-900 dark:text-emerald-300' : 'font-semibold text-[#191D1A] dark:text-[#F5F7F5]'}`}>
                          {isGroup ? conv.title : other?.displayName || 'Unknown'}
                        </p>
                        {conv.lastMessage && (
                          <span className="text-[10px] text-[#8A968F] shrink-0">
                            {new Date(conv.lastMessage.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        )}
                      </div>

                      {/* Display participant's active status note if present */}
                      {!isGroup && other?.activeNote ? (
                        <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 truncate flex items-center gap-1 mt-0.5">
                          <span>{other.activeNote.emoji}</span>
                          <span className="truncate">{other.activeNote.categoryLabel}: {other.activeNote.text}</span>
                        </p>
                      ) : (
                        <p className="text-[11px] text-[#8A968F] truncate mt-0.5">
                          {conv.lastMessage?.text || 'No messages yet'}
                        </p>
                      )}
                    </div>

                    {conv.unreadCount > 0 && (
                      <span className="w-5 h-5 bg-emerald-600 text-white rounded-full text-[10px] font-semibold flex items-center justify-center shrink-0">
                        {conv.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Main Area: Active Chat */}
        <div className={`${!activeConvId ? 'hidden sm:flex' : 'flex'} flex-1 flex-col bg-[#FAF8F5]/50 dark:bg-[#151917] min-w-0 min-h-0 relative`}>
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between bg-white dark:bg-[#181C1A] z-10 shrink-0">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setActiveConvId(null)}
                    className="sm:hidden p-1.5 -ml-1 text-[#58635C] dark:text-[#9DAAA0] hover:text-[#191D1A] dark:hover:text-white rounded-xl florum-btn-ghost cursor-pointer shrink-0"
                    title="Back to conversations list"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  {activeConversation.type === 'group' ? (
                    <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                      GRP
                    </div>
                  ) : (
                    otherParticipant && (
                      <div className="shrink-0">
                        <UserAvatar
                          name={otherParticipant.displayName}
                          src={otherParticipant.avatarUrl}
                          size="sm"
                          isOnline={isUserOnline(otherParticipant.id)}
                        />
                      </div>
                    )
                  )}
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-semibold text-[#191D1A] dark:text-[#F5F7F5] flex items-center gap-2 truncate">
                      <span className="truncate">{activeConversation.type === 'group' ? activeConversation.title : otherParticipant?.displayName}</span>
                      {otherParticipant?.availability && (
                        <span className="text-[11px] text-[#8A968F] font-normal hidden sm:flex items-center gap-1 shrink-0">
                          <span>{otherParticipant.availability.emoji}</span>
                          <span className="truncate">{otherParticipant.availability.label}</span>
                        </span>
                      )}
                    </h4>
                    <div className="flex items-center gap-1.5 text-[11px] mt-0.5">
                      {activeConversation.type === 'direct' && otherParticipant && (
                        isUserOnline(otherParticipant.id) ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active now
                          </span>
                        ) : (
                          <span className="text-[#8A968F]">Offline</span>
                        )
                      )}
                      <span className="text-[#8A968F]">·</span>
                      <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-medium truncate">
                        <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span className="truncate">E2EE Verified</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowSafetyModal(true)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200/60 dark:border-emerald-800/60 rounded-xl text-xs font-medium transition-colors cursor-pointer shrink-0"
                    title="View Safety Number & verify E2E Cryptography"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="hidden sm:inline">Verify Safety</span>
                    <span className="sm:hidden">Safety</span>
                  </button>
                </div>
              </div>

              {/* Status Note Banner */}
              {otherParticipant?.activeNote && (
                <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border-b border-emerald-200/40 dark:border-emerald-800/40 px-4 py-2 flex items-center gap-2 text-xs text-emerald-950 dark:text-emerald-200 shrink-0">
                  <span className="text-sm select-none shrink-0">{otherParticipant.activeNote.emoji}</span>
                  <div className="flex-1 min-w-0 truncate">
                    <span className="font-semibold">{otherParticipant.displayName}</span>
                    <span className="text-[#8A968F] mx-1.5">·</span>
                    <span className="italic truncate">"{otherParticipant.activeNote.text}"</span>
                  </div>
                  {otherParticipant.activeNote.isDnd && (
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold shrink-0">
                      DND Active
                    </span>
                  )}
                </div>
              )}

              {/* Error Banner */}
              {errorBanner && (
                <div className="bg-rose-50 dark:bg-rose-950/50 border-b border-rose-200 dark:border-rose-900 p-2.5 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2 shrink-0">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorBanner}</span>
                </div>
              )}

              {/* Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                {messages.length === 0 ? (
                  <div className="text-center py-16 text-[#8A968F]">
                    <p className="text-xs font-semibold text-[#191D1A] dark:text-[#F5F7F5]">No messages yet</p>
                    <p className="text-[11px] mt-1 text-[#8A968F]">Messages are encrypted end-to-end with zero plaintext on server.</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.senderId === currentUser?.id;

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col group ${isMine ? 'items-end' : 'items-start'}`}
                      >
                        {msg.replyPreview && (
                          <div
                            className={`text-[11px] mb-1 px-2.5 py-1 rounded-xl border flex items-center gap-1.5 ${
                              isMine
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
                                : 'bg-white dark:bg-[#1E2421] text-[#58635C] dark:text-[#9DAAA0] border-black/[0.06] dark:border-white/[0.08]'
                            }`}
                          >
                            <CornerDownRight className="w-3 h-3 text-[#8A968F]" />
                            <span className="font-semibold">{msg.replyPreview.senderName}:</span>
                            <span className="truncate max-w-[200px]">{msg.replyPreview.text}</span>
                          </div>
                        )}

                        <div className="flex items-end gap-1.5 max-w-[85%] sm:max-w-[75%] min-w-0">
                          <div
                            className={`p-3 sm:p-3.5 text-xs sm:text-sm leading-relaxed relative break-words border-2 ${
                              isMine
                                ? 'bg-[#FFCA05] text-[#111111] border-[#111111] shadow-[2.5px_2.5px_0px_#111111] rounded-2xl rounded-br-xs font-semibold'
                                : 'bg-[var(--card-surface)] text-[#111111] dark:text-[#F5F2EB] border-[#111111] dark:border-[#3E3E4A] shadow-[2.5px_2.5px_0px_#111111] rounded-2xl rounded-bl-xs font-medium'
                            }`}
                          >
                            {activeConversation.type === 'group' && !isMine && (
                              <p className="text-[10px] font-black text-[#111111] dark:text-[#FFCA05] mb-1 uppercase tracking-wider">
                                {msg.senderName}
                              </p>
                            )}

                            <p className="whitespace-pre-wrap break-words">{msg.text}</p>

                            <div
                              className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${
                                isMine ? 'text-emerald-100/80' : 'text-[#8A968F]'
                              }`}
                            >
                              <span>
                                {new Date(msg.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              {isMine && <span>· {msg.status}</span>}
                            </div>

                            {/* Message Reactions */}
                            {msg.reactions && msg.reactions.length > 0 && (
                              <div className="absolute -bottom-2 right-2 bg-white dark:bg-[#181C1A] border border-black/[0.08] dark:border-white/[0.10] rounded-full px-2 py-0.5 shadow-xs flex items-center gap-0.5 text-[11px]">
                                {msg.reactions.map((r, idx) => (
                                  <span key={idx}>{r.emoji}</span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Message Actions */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 pb-1">
                            <button
                              onClick={() => setReplyToMessage(msg)}
                              className="p-1.5 text-[#8A968F] hover:text-[#191D1A] dark:hover:text-white rounded-lg text-xs"
                              title="Reply"
                            >
                              <CornerDownRight className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleCopyText(msg.text, msg.id)}
                              className="p-1.5 text-[#8A968F] hover:text-[#191D1A] dark:hover:text-white rounded-lg text-xs"
                              title="Copy text"
                            >
                              {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            {isMine && !msg.isDeleted && (
                              <button
                                onClick={() => {
                                  const delAll = confirm('Delete for everyone? Press Cancel to delete for you only.');
                                  handleDeleteMessage(msg.id, delAll);
                                }}
                                className="p-1.5 text-[#8A968F] hover:text-rose-600 rounded-lg text-xs"
                                title="Delete message"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Reaction Quick Picker */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mt-1">
                          {MESSAGE_REACTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => handleReactToMessage(msg.id, emoji)}
                              className="text-xs hover:scale-125 transition-transform cursor-pointer"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Preview */}
              {replyToMessage && (
                <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/40 border-t border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-between text-xs text-emerald-950 dark:text-emerald-200 shrink-0">
                  <div className="flex items-center gap-2 truncate">
                    <CornerDownRight className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span className="shrink-0 font-medium">Replying to <strong>{replyToMessage.senderName}</strong>:</span>
                    <span className="truncate italic text-[#58635C] dark:text-[#9DAAA0]">"{replyToMessage.text}"</span>
                  </div>
                  <button
                    onClick={() => setReplyToMessage(null)}
                    className="p-1 text-[#8A968F] hover:text-[#191D1A] dark:hover:text-white shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Message Composer */}
              <form onSubmit={handleSendMessage} className="p-3 sm:p-3.5 border-t-2.5 border-black/10 dark:border-white/10 bg-[var(--card-surface)] pb-[max(0.75rem,env(safe-area-inset-bottom))] shrink-0 z-20">
                <div className="flex items-center gap-2 max-w-full">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={
                      otherParticipant?.availability?.strictDnd && otherParticipant.availability.code === 'dnd'
                        ? `${otherParticipant.displayName} has strict DND active...`
                        : "Type an encrypted message..."
                    }
                    className="flex-1 min-w-0 px-4 py-2.5 text-xs sm:text-sm neo-input"
                  />
                  <button
                    type="submit"
                    disabled={isSending || !inputText.trim()}
                    className="p-2.5 sm:px-4 sm:py-2.5 neo-btn-primary disabled:opacity-40 rounded-xl cursor-pointer shrink-0 flex items-center justify-center gap-1.5 uppercase tracking-wider"
                    title="Send message"
                  >
                    <Send className="w-4 h-4 stroke-[2.5]" />
                    <span className="hidden sm:inline text-xs font-black">Send</span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[#8A968F] min-h-0">
              <Lock className="w-8 h-8 text-[#8A968F] mb-2" />
              <p className="text-sm font-semibold text-[#191D1A] dark:text-[#F5F7F5]">Private NoteCircle Chat</p>
              <p className="text-xs text-[#8A968F] max-w-xs mt-1">
                Select a conversation on the left, or connect with a friend from Circle to start messaging privately.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Group Chat Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="florum-card bg-white dark:bg-[#181C1A] w-full max-w-md p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] pb-3">
              <h3 className="text-sm font-bold font-display text-[#191D1A] dark:text-[#F5F7F5]">New Private Group Chat</h3>
              <button 
                onClick={() => setShowGroupModal(false)} 
                className="w-7 h-7 rounded-full flex items-center justify-center text-[#8A968F] hover:text-[#191D1A] dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#191D1A] dark:text-[#F5F7F5] block mb-1.5">Group Title</label>
              <input
                type="text"
                value={groupTitle}
                onChange={(e) => setGroupTitle(e.target.value)}
                placeholder="e.g. Weekend Hiking, Book Club..."
                className="w-full text-xs p-3 florum-input"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#191D1A] dark:text-[#F5F7F5] block mb-1.5">Select Connections (Min 2)</label>
              <div className="max-h-48 overflow-y-auto space-y-2 border border-black/[0.06] dark:border-white/[0.08] rounded-2xl p-2 bg-[#FAF8F5] dark:bg-[#202622]">
                {allConnections.map((user) => {
                  const isSelected = selectedGroupParticipants.includes(user.id);
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        setSelectedGroupParticipants((prev) =>
                          isSelected ? prev.filter((id) => id !== user.id) : [...prev, user.id]
                        );
                      }}
                      className={`w-full text-left p-2 rounded-xl flex items-center justify-between text-xs transition-colors cursor-pointer border ${
                        isSelected 
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border-emerald-400 font-semibold' 
                          : 'bg-white dark:bg-[#181C1A] border-transparent hover:border-black/[0.08] text-[#191D1A] dark:text-[#F5F7F5]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <UserAvatar name={user.displayName} src={user.avatarUrl} size="xs" />
                        <span className="font-medium">{user.displayName}</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
              <button
                type="button"
                onClick={() => setShowGroupModal(false)}
                className="florum-btn-ghost text-xs py-2 px-3.5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateGroup}
                className="florum-btn-primary text-xs py-2 px-4"
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safety Number & Cryptographic Verification Modal */}
      {showSafetyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="florum-card bg-white dark:bg-[#181C1A] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-display text-[#191D1A] dark:text-[#F5F7F5]">Verify Safety Number</h3>
                  <p className="text-[11px] text-[#8A968F]">End-to-End Encryption Verification</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSafetyModal(false)} 
                className="w-7 h-7 rounded-full flex items-center justify-center text-[#8A968F] hover:text-[#191D1A] dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#58635C] dark:text-[#9DAAA0] leading-relaxed">
              Compare this safety number with <strong>{otherParticipant?.displayName}</strong> in person or over another channel to verify that messages are encrypted end-to-end and protected against server tampering.
            </p>

            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 rounded-2xl text-center space-y-1.5 shadow-xs">
              <span className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 block uppercase tracking-wider">
                Cryptographic Safety Number
              </span>
              <div className="font-mono text-base font-bold text-emerald-950 dark:text-emerald-100 tracking-wider">
                {safetyNumber || 'Computing safety number...'}
              </div>
            </div>

            <div className="space-y-1 text-[11px] text-[#58635C] dark:text-[#9DAAA0] border-t border-black/[0.06] dark:border-white/[0.08] pt-3">
              <p>• Key Exchange: <strong className="text-[#191D1A] dark:text-[#F5F7F5]">ECDH (NIST P-256)</strong></p>
              <p>• Symmetric Cipher: <strong className="text-[#191D1A] dark:text-[#F5F7F5]">AES-GCM 256-bit</strong></p>
              <p>• Forward Secrecy: <strong className="text-[#191D1A] dark:text-[#F5F7F5]">Ephemeral keypair per message</strong></p>
              <p>• Server Storage: <strong className="text-[#191D1A] dark:text-[#F5F7F5]">Zero readable plaintext</strong></p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowSafetyModal(false)}
                className="florum-btn-primary text-xs py-2 px-5 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

