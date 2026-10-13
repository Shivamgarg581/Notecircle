import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  UserPlus, 
  Check, 
  X, 
  Lock, 
  Clock, 
  UserCheck, 
  Users, 
  AlertCircle,
  Loader2,
  ShieldCheck,
  UserX,
  MessageSquare
} from 'lucide-react';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { UserAvatar } from './UserAvatar.tsx';
import type { PublicUserProfile } from '../types/index.ts';

interface SearchAndConnectionsProps {
  onOpenProfile: (username: string) => void;
  onOpenChatWithUser: (userId: string) => void;
}

export const SearchAndConnections: React.FC<SearchAndConnectionsProps> = ({
  onOpenProfile,
  onOpenChatWithUser
}) => {
  const { currentUser, refreshNotifications, isUserOnline } = useAuth();
  const [activeTab, setActiveTab] = useState<'search' | 'requests' | 'following'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PublicUserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [pendingIncoming, setPendingIncoming] = useState<any[]>([]);
  const [pendingOutgoing, setPendingOutgoing] = useState<any[]>([]);
  const [connectionsList, setConnectionsList] = useState<PublicUserProfile[]>([]);
  const [actionInProgress, setActionInProgress] = useState<Record<string, boolean>>({});

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchConnectionsData = async () => {
    try {
      const res = await api.getPendingRequests();
      setPendingIncoming(res.incoming);
      setPendingOutgoing(res.outgoing);

      const connRes = await api.getConnectionsList();
      setConnectionsList(connRes.connections || []);
    } catch (err) {
      console.error('Failed to load connections data:', err);
    }
  };

  useEffect(() => {
    fetchConnectionsData();
  }, [currentUser]);

  // Real Debounced Username Search
  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    setSearchError(null);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!value.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await api.searchUsers(value.trim());
        setSearchResults(res.users);
      } catch (err: any) {
        setSearchError(err.message || 'Failed to search users');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 280);
  };

  const handleSendFollowRequest = async (targetUserId: string) => {
    setActionInProgress((prev) => ({ ...prev, [targetUserId]: true }));
    try {
      await api.sendFollowRequest(targetUserId);
      setSearchResults((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, isPendingRequest: true } : u))
      );
      await fetchConnectionsData();
      await refreshNotifications();
    } catch (err: any) {
      alert(err.message || 'Failed to send follow request');
    } finally {
      setActionInProgress((prev) => ({ ...prev, [targetUserId]: false }));
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await api.acceptFollowRequest(requestId);
      await fetchConnectionsData();
      await refreshNotifications();
    } catch (err: any) {
      alert(err.message || 'Failed to accept');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await api.rejectFollowRequest(requestId);
      await fetchConnectionsData();
    } catch (err: any) {
      alert(err.message || 'Failed to reject');
    }
  };

  const handleUnfollow = async (targetUserId: string) => {
    if (!confirm('Unfollow this user? You will no longer see their private status notes.')) return;
    try {
      await api.unfollow(targetUserId);
      setConnectionsList((prev) => prev.filter((u) => u.id !== targetUserId));
      setSearchResults((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, isConnection: false, isPendingRequest: false } : u))
      );
      await fetchConnectionsData();
    } catch (err: any) {
      alert(err.message || 'Failed to unfollow');
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
      
      {/* Modern Segmented Tab Bar */}
      <div className="flex items-center gap-1.5 p-1 bg-[#F5F2EB] dark:bg-[#181C1A] border border-black/[0.05] dark:border-white/[0.06] rounded-2xl text-xs font-semibold">
        <button
          onClick={() => setActiveTab('search')}
          className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'search'
              ? 'bg-white dark:bg-[#242A27] text-[#191D1A] dark:text-white shadow-xs font-bold'
              : 'text-[#58635C] dark:text-[#9DAAA0] hover:text-[#191D1A] dark:hover:text-white'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Find People</span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'requests'
              ? 'bg-white dark:bg-[#242A27] text-[#191D1A] dark:text-white shadow-xs font-bold'
              : 'text-[#58635C] dark:text-[#9DAAA0] hover:text-[#191D1A] dark:hover:text-white'
          }`}
        >
          <span>Requests</span>
          {pendingIncoming.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
              {pendingIncoming.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('following')}
          className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'following'
              ? 'bg-white dark:bg-[#242A27] text-[#191D1A] dark:text-white shadow-xs font-bold'
              : 'text-[#58635C] dark:text-[#9DAAA0] hover:text-[#191D1A] dark:hover:text-white'
          }`}
        >
          <span>My Circle ({connectionsList.length})</span>
        </button>
      </div>

      {/* Tab 1: Username Search */}
      {activeTab === 'search' && (
        <div className="space-y-4">
          
          {/* Search Input Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#8A968F] absolute left-4 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              placeholder="Search exact username (e.g. rahul, priya, alex)..."
              className="w-full pl-11 pr-10 py-3 text-xs sm:text-sm florum-input"
              autoFocus
            />
            {isSearching && (
              <Loader2 className="w-4 h-4 text-emerald-600 animate-spin absolute right-4 top-3.5" />
            )}
          </div>

          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 rounded-2xl flex items-start gap-3 text-xs text-emerald-950 dark:text-emerald-200">
            <Lock className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="font-semibold">Privacy Guarantee:</strong> NoteCircle has no public feeds. Searching an exact username returns minimal info (Display Name and @username). Your notes are only visible to approved connections.
            </div>
          </div>

          {searchError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{searchError}</span>
            </div>
          )}

          {/* Search Results List */}
          <div className="space-y-3 pt-1">
            {isSearching ? (
              <div className="text-center py-12 text-xs text-[#8A968F] flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                <span>Searching directory...</span>
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((user) => {
                const isLoadingAction = actionInProgress[user.id] || false;

                return (
                  <div
                    key={user.id}
                    className="florum-card bg-white dark:bg-[#181C1A] p-4 flex items-center justify-between gap-3"
                  >
                    <div 
                      onClick={() => onOpenProfile(user.username)}
                      className="flex items-center gap-3.5 cursor-pointer flex-1 min-w-0"
                    >
                      <UserAvatar name={user.displayName} src={user.avatarUrl} size="md" isOnline={isUserOnline(user.id)} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs sm:text-sm font-semibold text-[#191D1A] dark:text-[#F5F7F5] truncate">{user.displayName}</p>
                          <span className="text-[10px] text-[#58635C] dark:text-[#9DAAA0] flex items-center gap-0.5 bg-[#F5F2EB] dark:bg-[#202622] px-2 py-0.5 rounded-full">
                            <Lock className="w-2.5 h-2.5" /> Private
                          </span>
                        </div>
                        <p className="text-xs text-[#8A968F]">@{user.username}</p>
                        
                        {!user.isConnection && (
                          <p className="text-[11px] text-[#8A968F] mt-0.5 italic">
                            "Connect to view their private notes."
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {user.isConnection ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-xl font-medium border border-emerald-200/60 dark:border-emerald-800/60 flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>In Circle</span>
                          </span>
                          <button
                            onClick={() => onOpenChatWithUser(user.id)}
                            className="florum-btn-secondary text-xs py-1.5 px-3"
                          >
                            Chat
                          </button>
                        </div>
                      ) : user.isPendingRequest ? (
                        <span className="text-xs text-[#58635C] dark:text-[#9DAAA0] bg-[#F5F2EB] dark:bg-[#202622] px-3 py-1.5 rounded-xl font-medium flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Requested</span>
                        </span>
                      ) : user.hasIncomingRequest ? (
                        <span className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-3 py-1.5 rounded-xl font-medium">
                          Requested you
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSendFollowRequest(user.id)}
                          disabled={isLoadingAction}
                          className="florum-btn-primary text-xs py-1.5 px-3.5 flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>{isLoadingAction ? 'Sending...' : 'Request'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : searchQuery.trim() ? (
              <div className="text-center py-12 florum-card bg-white dark:bg-[#181C1A] text-xs text-[#8A968F]">
                No private accounts found matching "@{searchQuery}".
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-[#8A968F]">
                Type an exact username above to find and connect with friends.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Requests */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-xs font-semibold text-[#8A968F] uppercase tracking-wider mb-3">
              Incoming Follow Requests ({pendingIncoming.length})
            </h3>

            {pendingIncoming.length === 0 ? (
              <div className="p-8 florum-card bg-white dark:bg-[#181C1A] text-center space-y-2">
                <Users className="w-8 h-8 text-[#8A968F] mx-auto mb-1" />
                <p className="text-xs font-semibold text-[#191D1A] dark:text-[#F5F7F5]">No new follow requests right now.</p>
                <p className="text-xs text-[#8A968F] max-w-xs mx-auto">
                  When someone requests to join your private circle, you can approve or reject them here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingIncoming.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 florum-card bg-white dark:bg-[#181C1A] flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      {req.requester && (
                        <UserAvatar
                          name={req.requester.displayName}
                          src={req.requester.avatarUrl}
                          size="md"
                        />
                      )}
                      <div>
                        <p className="text-xs font-semibold text-[#191D1A] dark:text-[#F5F7F5]">
                          {req.requester?.displayName}
                        </p>
                        <p className="text-[11px] text-[#8A968F]">
                          @{req.requester?.username} · 🔒 Private
                        </p>
                        {req.requester?.bio && (
                          <p className="text-xs text-[#58635C] dark:text-[#9DAAA0] italic mt-0.5 line-clamp-1">
                            "{req.requester.bio}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAcceptRequest(req.id)}
                        className="florum-btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept</span>
                      </button>
                      <button
                        onClick={() => handleRejectRequest(req.id)}
                        className="florum-btn-ghost text-xs py-1.5 px-3 text-[#8A968F] hover:text-rose-600"
                      >
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Outgoing Requests */}
          {pendingOutgoing.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-[#8A968F] uppercase tracking-wider mb-3">
                Sent Requests Pending ({pendingOutgoing.length})
              </h3>
              <div className="space-y-2.5">
                {pendingOutgoing.map((req) => (
                  <div
                    key={req.id}
                    className="p-3.5 florum-card bg-white dark:bg-[#181C1A] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {req.target && (
                        <UserAvatar name={req.target.displayName} src={req.target.avatarUrl} size="sm" />
                      )}
                      <div>
                        <p className="text-xs font-semibold text-[#191D1A] dark:text-[#F5F7F5]">{req.target?.displayName}</p>
                        <p className="text-[11px] text-[#8A968F]">@{req.target?.username}</p>
                      </div>
                    </div>
                    <span className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-200/60 dark:border-amber-800/60">
                      Pending approval
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Connections */}
      {activeTab === 'following' && (
        <div className="space-y-3">
          {connectionsList.length === 0 ? (
            <div className="p-8 florum-card bg-white dark:bg-[#181C1A] text-center text-xs text-[#8A968F]">
              No approved connections in your circle yet.
            </div>
          ) : (
            connectionsList.map((user) => (
              <div key={user.id} className="p-4 florum-card bg-white dark:bg-[#181C1A] flex items-center justify-between gap-3">
                <div 
                  onClick={() => onOpenProfile(user.username)}
                  className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                >
                  <UserAvatar name={user.displayName} src={user.avatarUrl} size="sm" isOnline={isUserOnline(user.id)} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#191D1A] dark:text-[#F5F7F5] truncate">{user.displayName}</p>
                    <p className="text-[11px] text-[#8A968F] truncate">@{user.username}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenChatWithUser(user.id)}
                    className="florum-btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat</span>
                  </button>
                  <button
                    onClick={() => handleUnfollow(user.id)}
                    className="florum-btn-ghost text-xs py-1.5 px-2.5 text-[#8A968F] hover:text-rose-600"
                  >
                    Unfollow
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
