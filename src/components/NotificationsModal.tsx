import React, { useState, useEffect } from 'react';
import { Bell, X, CheckCheck, Clock } from 'lucide-react';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { UserAvatar } from './UserAvatar.tsx';
import type { AppNotification } from '../types/index.ts';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction?: (notif: AppNotification) => void;
  onOpenChat?: (userId: string) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  onSelectAction
}) => {
  const { refreshNotifications } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifs = async () => {
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifs();
    }
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      await refreshNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleItemClick = async (notif: AppNotification) => {
    if (!notif.read) {
      await api.markNotificationRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      );
      await refreshNotifications();
    }
    onSelectAction?.(notif);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
      <div 
        className="florum-card bg-white dark:bg-[#181C1A] w-full max-w-md rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[85vh] border border-black/[0.08] dark:border-white/[0.10]"
        role="dialog"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-900 text-white flex items-center justify-center shadow-xs">
              <Bell className="w-4 h-4 text-emerald-100" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold font-display text-[#191D1A] dark:text-[#F5F7F5]">
                Notifications
              </h2>
              <p className="text-[11px] text-[#8A968F]">Activity from your circle</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {notifications.some((n) => !n.read) && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer py-1 px-2 rounded-lg"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark read</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#8A968F] hover:text-[#191D1A] dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notifications Scroll View */}
        <div className="flex-1 overflow-y-auto divide-y divide-black/[0.04] dark:divide-white/[0.06]">
          {isLoading ? (
            <div className="text-center py-12 text-xs text-[#8A968F]">
              <Clock className="w-6 h-6 mx-auto mb-2 text-[#8A968F] animate-spin" />
              <span>Loading notifications...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-16 px-4 text-[#8A968F]">
              <div className="w-12 h-12 rounded-2xl bg-[#F5F2EB] dark:bg-[#1E2421] flex items-center justify-center mx-auto mb-3 text-[#8A968F]">
                <Bell className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-[#191D1A] dark:text-[#F5F7F5]">No notifications yet</p>
              <p className="text-xs mt-1 text-[#8A968F]">You're all caught up with your circle.</p>
            </div>
          ) : (
            notifications.map((notif) => {
              return (
                <div
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className={`p-3.5 sm:p-4 px-5 flex items-start gap-3 transition-colors cursor-pointer ${
                    notif.read 
                      ? 'hover:bg-[#FAF8F5] dark:hover:bg-[#1E2421]' 
                      : 'bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                  }`}
                >
                  <UserAvatar name={notif.senderName} src={notif.senderAvatar} size="md" />
                  <div className="flex-1 min-w-0 text-xs">
                    <p className={`text-xs leading-relaxed ${notif.read ? 'text-[#58635C] dark:text-[#9DAAA0] font-normal' : 'text-[#191D1A] dark:text-[#F5F7F5] font-semibold'}`}>
                      {notif.text}
                    </p>
                    <span className="text-[10px] text-[#8A968F] mt-1 block">
                      {new Date(notif.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  {!notif.read && (
                    <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0 mt-2 shadow-xs" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
