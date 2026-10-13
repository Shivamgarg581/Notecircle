import React, { useState, useEffect, useRef } from 'react';
import { 
  Lock, 
  MapPin, 
  Briefcase, 
  Calendar, 
  Edit3, 
  MessageSquare, 
  ShieldAlert, 
  UserPlus, 
  UserCheck, 
  Clock, 
  Sparkles,
  Users,
  Camera,
  Trash2,
  ShieldCheck,
  Check
} from 'lucide-react';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { UserAvatar } from './UserAvatar.tsx';
import type { PublicUserProfile } from '../types/index.ts';

interface ProfileViewProps {
  username?: string;
  onOpenChatWithUser?: (userId: string) => void;
  onOpenCreateNote?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  username,
  onOpenChatWithUser,
  onOpenCreateNote
}) => {
  const { currentUser, refreshUser, isUserOnline } = useAuth();
  const targetUsername = username || currentUser?.username || '';
  const isSelf = Boolean(currentUser && currentUser.username.toLowerCase() === targetUsername.toLowerCase());

  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Edit fields
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editWorkplace, setEditWorkplace] = useState('');
  const [editBirthday, setEditBirthday] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Native Photo/Gallery selection states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingPhotoDataUrl, setPendingPhotoDataUrl] = useState<string | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState<boolean>(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const res = await api.getProfile(targetUsername);
      setProfile(res.profile);
      if (isSelf) {
        setEditName(res.profile.displayName);
        setEditUsername(res.profile.username);
        setEditAvatarUrl(res.profile.avatarUrl || '');
        setEditBio(res.profile.bio || '');
        setEditCity(res.profile.city || '');
        setEditWorkplace(res.profile.workplace || '');
        setEditBirthday(res.profile.birthday || '');
        setPendingPhotoDataUrl(null);
        setPhotoRemoved(false);
        setPhotoError(null);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [targetUsername, currentUser]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError(null);

    const validMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!validMimes.includes(file.type.toLowerCase())) {
      setPhotoError('Unsupported format. Please select a JPG, PNG, WEBP, or GIF image.');
      return;
    }

    // 5MB limit
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Image exceeds the 5MB size limit. Please choose a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPendingPhotoDataUrl(reader.result);
        setPhotoRemoved(false);
      }
    };
    reader.onerror = () => {
      setPhotoError('Could not read the selected image file. Please retry.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPendingPhotoDataUrl(null);
    setPhotoRemoved(true);
    setPhotoError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setNotice(null);
    try {
      let finalAvatarUrl = editAvatarUrl;

      // Handle photo upload/removal first
      if (photoRemoved) {
        await api.removeAvatar();
        finalAvatarUrl = '';
      } else if (pendingPhotoDataUrl) {
        const uploadRes = await api.uploadAvatar(pendingPhotoDataUrl);
        finalAvatarUrl = uploadRes.avatarUrl;
      }

      await api.updateProfile({
        displayName: editName.trim(),
        username: editUsername.trim().toLowerCase(),
        avatarUrl: finalAvatarUrl || undefined,
        bio: editBio.trim() || undefined,
        city: editCity.trim() || undefined,
        workplace: editWorkplace.trim() || undefined,
        birthday: editBirthday.trim() || undefined
      });

      await refreshUser();
      await fetchProfile();
      setIsEditing(false);
      setNotice({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err: any) {
      setNotice({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendFollowRequest = async () => {
    if (!profile) return;
    try {
      await api.sendFollowRequest(profile.id);
      await fetchProfile();
    } catch (err: any) {
      alert(err.message || 'Failed to send request');
    }
  };

  const handleReport = () => {
    alert('Thank you. Our safety team will review this account for trust violations.');
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-xs text-[#8A968F]">
        Loading profile...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center florum-card bg-white dark:bg-[#181C1A]">
        <p className="text-sm font-semibold text-[#191D1A] dark:text-[#F5F7F5]">User not found</p>
        <p className="text-xs text-[#8A968F] mt-1">This private profile may have been deleted or does not exist.</p>
      </div>
    );
  }

  const isOtherOnline = isUserOnline(profile.id);

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
      {notice && (
        <div className={`p-3 rounded-2xl text-xs flex items-center justify-between ${
          notice.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border border-emerald-200/60 dark:border-emerald-800/60'
            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
        }`}>
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} className="cursor-pointer text-[#8A968F]">✕</button>
        </div>
      )}

      {/* Profile Card with Botanical Cover Banner */}
      <div className="florum-card bg-white dark:bg-[#181C1A] overflow-hidden">
        {/* Serene Botanical Banner */}
        <div className="h-32 sm:h-36 bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 relative">
          <div className="absolute inset-0 bg-florum-grain opacity-20" />
        </div>

        {/* Profile Info Row */}
        <div className="px-5 sm:px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between -mt-14 sm:-mt-16 gap-4">
            {/* Avatar with Status Ring */}
            <div className="relative">
              <div className="p-1 rounded-full bg-white dark:bg-[#181C1A] shadow-md">
                <UserAvatar
                  name={profile.displayName}
                  src={profile.avatarUrl}
                  size="xl"
                  isOnline={isOtherOnline}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {isSelf ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="florum-btn-secondary text-xs py-2 px-4 flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>
              ) : (
                <>
                  {profile.isConnection ? (
                    <button
                      onClick={() => onOpenChatWithUser?.(profile.id)}
                      className="florum-btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Message</span>
                    </button>
                  ) : profile.isPendingRequest ? (
                    <span className="px-3.5 py-1.5 bg-[#F5F2EB] dark:bg-[#202622] text-[#58635C] dark:text-[#9DAAA0] rounded-xl text-xs font-medium flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Requested</span>
                    </span>
                  ) : (
                    <button
                      onClick={handleSendFollowRequest}
                      className="florum-btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Request Follow</span>
                    </button>
                  )}

                  <button
                    onClick={handleReport}
                    className="florum-btn-ghost text-xs p-2 text-[#8A968F] hover:text-rose-600"
                    title="Report account"
                  >
                    <ShieldAlert className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* User Names & Bio */}
          <div className="mt-4 text-center sm:text-left space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h2 className="text-xl font-bold font-display text-[#191D1A] dark:text-[#F5F7F5]">
                {profile.displayName}
              </h2>
              <span className="text-[11px] text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>Verified</span>
              </span>
            </div>
            <p className="text-xs text-[#8A968F]">@{profile.username}</p>

            {profile.bio && (
              <p className="text-xs sm:text-sm text-[#58635C] dark:text-[#9DAAA0] pt-2 leading-relaxed max-w-lg">
                {profile.bio}
              </p>
            )}

            {/* Clean Unboxed Metadata & Followers */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 pt-3 text-xs text-[#58635C] dark:text-[#9DAAA0]">
              <span className="font-semibold text-[#191D1A] dark:text-[#F5F7F5]">{profile.followersCount} <span className="font-normal text-[#8A968F]">Followers</span></span>
              <span>·</span>
              <span className="font-semibold text-[#191D1A] dark:text-[#F5F7F5]">{profile.followingCount} <span className="font-normal text-[#8A968F]">Following</span></span>
              {profile.city && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {profile.city}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Active Note Broadcast */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-semibold text-[#8A968F] uppercase tracking-wider">
          Current Note Broadcast
        </h3>

        {profile.isConnection || isSelf ? (
          profile.activeNote ? (
            <div className="florum-card p-4 sm:p-5 bg-white dark:bg-[#181C1A] flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 text-xl flex items-center justify-center shrink-0">
                {profile.activeNote.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#191D1A] dark:text-[#F5F7F5]">
                    {profile.activeNote.categoryLabel}
                  </span>
                  <span className="text-[11px] text-[#8A968F] flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {profile.activeNote.expiresAt ? 'Temporary' : 'Permanent'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#191D1A] dark:text-[#F5F7F5] mt-1 leading-relaxed">
                  "{profile.activeNote.text}"
                </p>
              </div>
            </div>
          ) : (
            <div className="florum-card p-5 bg-white dark:bg-[#181C1A] text-xs text-[#8A968F] text-center">
              No active note right now.
              {isSelf && (
                <button
                  onClick={onOpenCreateNote}
                  className="block mx-auto mt-2 text-emerald-700 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
                >
                  Post a note to your circle
                </button>
              )}
            </div>
          )
        ) : (
          <div className="florum-card p-6 bg-white dark:bg-[#181C1A] text-center space-y-2">
            <Lock className="w-6 h-6 text-[#8A968F] mx-auto mb-1" />
            <p className="text-xs font-semibold text-[#191D1A] dark:text-[#F5F7F5]">Notes are private to circle</p>
            <p className="text-xs text-[#8A968F] max-w-xs mx-auto">
              Follow {profile.displayName.split(' ')[0]} to view their status notes and presence.
            </p>
            {!profile.isPendingRequest && (
              <button
                onClick={handleSendFollowRequest}
                className="mt-2 florum-btn-primary text-xs py-1.5 px-4"
              >
                Request Follow
              </button>
            )}
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={handleSaveProfile}
            className="florum-card bg-white dark:bg-[#181C1A] w-full max-w-lg p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] pb-3">
              <h3 className="text-sm font-bold font-display text-[#191D1A] dark:text-[#F5F7F5]">
                Edit Profile
              </h3>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-[#8A968F] hover:text-[#191D1A] dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Profile Photo Selector */}
            <div>
              <label className="text-xs font-semibold text-[#191D1A] dark:text-[#F5F7F5] block mb-2">
                Profile Photo
              </label>
              <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-[#FAF8F5] dark:bg-[#202622] border border-black/[0.06] dark:border-white/[0.08]">
                <div className="relative shrink-0">
                  {pendingPhotoDataUrl ? (
                    <img
                      src={pendingPhotoDataUrl}
                      alt="Preview"
                      className="w-16 h-16 rounded-full object-cover ring-2 ring-emerald-500 shadow-xs"
                    />
                  ) : !photoRemoved && editAvatarUrl ? (
                    <img
                      src={editAvatarUrl}
                      alt="Avatar"
                      className="w-16 h-16 rounded-full object-cover ring-1 ring-black/10 dark:ring-white/10 shadow-xs"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 flex items-center justify-center font-bold text-lg">
                      {(editName || 'U')[0].toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="florum-btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{pendingPhotoDataUrl || editAvatarUrl ? 'Change Photo' : 'Select Photo'}</span>
                    </button>

                    {(pendingPhotoDataUrl || editAvatarUrl) && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="florum-btn-ghost text-xs py-1.5 px-2.5 text-[#8A968F] hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                  {photoError && <p className="text-xs text-rose-600">{photoError}</p>}
                </div>
              </div>
            </div>

            {/* Text Inputs */}
            <div>
              <label className="text-xs font-semibold text-[#191D1A] dark:text-[#F5F7F5] block mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                className="w-full text-xs p-3 florum-input"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#191D1A] dark:text-[#F5F7F5] block mb-1">
                Username
              </label>
              <input
                type="text"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                required
                className="w-full text-xs p-3 florum-input"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#191D1A] dark:text-[#F5F7F5] block mb-1">
                Bio
              </label>
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                rows={2}
                className="w-full text-xs p-3 florum-input"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#191D1A] dark:text-[#F5F7F5] block mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  className="w-full text-xs p-3 florum-input"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#191D1A] dark:text-[#F5F7F5] block mb-1">
                  Workplace
                </label>
                <input
                  type="text"
                  value={editWorkplace}
                  onChange={(e) => setEditWorkplace(e.target.value)}
                  className="w-full text-xs p-3 florum-input"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="florum-btn-ghost text-xs py-2 px-3.5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="florum-btn-primary text-xs py-2 px-5 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
