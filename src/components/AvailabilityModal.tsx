import React, { useState } from 'react';
import { X, Clock, Moon, Shield, Check, Sparkles } from 'lucide-react';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import type { AvailabilityCode, UserAvailability } from '../types/index.ts';
import { NeoSelect } from './NeoSelect.tsx';
import { NeoCheckbox } from './NeoCheckbox.tsx';

interface AvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AVAILABILITY_OPTIONS: { code: AvailabilityCode; label: string; emoji: string; desc: string }[] = [
  { code: 'available', label: 'Available', emoji: '🟢', desc: 'Free to talk and reply to notes' },
  { code: 'dnd', label: 'Do Not Disturb', emoji: '🔴', desc: 'Focusing or taking quiet time' },
  { code: 'busy', label: 'Busy', emoji: '🟡', desc: 'Working or in meetings; replies delayed' },
  { code: 'sleeping', label: 'Sleeping', emoji: '🌙', desc: 'Resting; will reply when awake' },
  { code: 'travelling', label: 'Travelling', emoji: '✈️', desc: 'On the road; intermittent signal' },
  { code: 'studying', label: 'Studying', emoji: '📚', desc: 'Deep focus study session' },
  { code: 'family', label: 'Family Time', emoji: '🏕️', desc: 'Spending time with family' },
  { code: 'offline', label: 'Offline', emoji: '⚫', desc: 'Stepped away from NoteCircle' },
  { code: 'other', label: 'Custom Note', emoji: '✨', desc: 'Set custom status, emoji & note' }
];

const CUSTOM_STATUS_EMOJIS = ['✨', '☕', '🎧', '🎨', '🌿', '💻', '🏃‍♂️', '🧘', '🍕', '🚀', '💡', '🌧️', '🍿', '🎸'];

export const AvailabilityModal: React.FC<AvailabilityModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, refreshUser } = useAuth();
  const currentAvail = currentUser?.availability || {
    code: 'available',
    label: 'Available',
    emoji: '🟢',
    strictDnd: false,
    updatedAt: new Date().toISOString()
  };

  const [selectedCode, setSelectedCode] = useState<AvailabilityCode>(currentAvail.code);
  const [customEmoji, setCustomEmoji] = useState(currentAvail.emoji || '✨');
  const [customLabel, setCustomLabel] = useState(currentAvail.code === 'other' ? currentAvail.label : 'In the Zone');
  const [customStatus, setCustomStatus] = useState(currentAvail.customStatus || '');
  const [duration, setDuration] = useState('4_hours');
  const [strictDnd, setStrictDnd] = useState(currentAvail.strictDnd || false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const now = Date.now();
    let expiresAt: string | null = null;
    switch (duration) {
      case '1_hour':
        expiresAt = new Date(now + 1 * 60 * 60 * 1000).toISOString();
        break;
      case '4_hours':
        expiresAt = new Date(now + 4 * 60 * 60 * 1000).toISOString();
        break;
      case 'today': {
        const midnight = new Date();
        midnight.setHours(23, 59, 59, 999);
        expiresAt = midnight.toISOString();
        break;
      }
      case 'custom_time':
        expiresAt = new Date(now + 8 * 60 * 60 * 1000).toISOString();
        break;
      case 'cleared':
        expiresAt = null;
        break;
    }

    const chosenOption = AVAILABILITY_OPTIONS.find((o) => o.code === selectedCode);
    const finalLabel = selectedCode === 'other' ? customLabel : (chosenOption?.label || 'Available');
    const finalEmoji = selectedCode === 'other' ? customEmoji : (chosenOption?.emoji || '🟢');

    const payload: Partial<UserAvailability> = {
      code: selectedCode,
      label: finalLabel,
      emoji: finalEmoji,
      customStatus: customStatus.trim() || undefined,
      strictDnd,
      expiresAt: expiresAt || undefined
    };

    try {
      await api.updateAvailability(payload);
      await refreshUser();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
      <div 
        className="florum-card bg-white dark:bg-[#181C1A] w-full max-w-lg rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] border border-black/[0.08] dark:border-white/[0.10]"
        role="dialog"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-900 text-white flex items-center justify-center shadow-xs">
              <Clock className="w-4 h-4 text-emerald-100" />
            </div>
            <div>
              <h2 className="text-base font-bold font-display text-[#191D1A] dark:text-[#F5F7F5]">
                Availability & Status
              </h2>
              <p className="text-[11px] text-[#8A968F]">Let your circle know when you're free</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#8A968F] hover:text-[#191D1A] dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs text-rose-800 dark:text-rose-200">
              {error}
            </div>
          )}

          {/* Status grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {AVAILABILITY_OPTIONS.map((opt) => {
              const isSelected = selectedCode === opt.code;
              return (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => setSelectedCode(opt.code)}
                  className={`p-3 rounded-2xl border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 ring-1 ring-emerald-600/30 shadow-xs'
                      : 'border-black/[0.06] dark:border-white/[0.08] bg-[#FAF8F5] dark:bg-[#1E2421] hover:border-black/[0.12] dark:hover:border-white/[0.15]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xl select-none">
                      {opt.code === 'other' && isSelected ? customEmoji : opt.emoji}
                    </span>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    )}
                  </div>
                  <p className="text-xs font-semibold truncate text-[#191D1A] dark:text-[#F5F7F5]">{opt.label}</p>
                  <p className="text-[10px] text-[#8A968F] line-clamp-1">{opt.desc}</p>
                </button>
              );
            })}
          </div>

          {/* Custom Status Expansion */}
          {selectedCode === 'other' && (
            <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/50 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Custom Status Details
                </span>
              </div>

              {/* Emoji quick selector */}
              <div>
                <label className="text-[11px] font-medium text-[#58635C] dark:text-[#9DAAA0] block mb-1">
                  Choose Status Emoji
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CUSTOM_STATUS_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setCustomEmoji(emoji)}
                      className={`w-8 h-8 rounded-xl border text-sm flex items-center justify-center transition-all cursor-pointer ${
                        customEmoji === emoji
                          ? 'border-emerald-600 bg-white dark:bg-[#181C1A] shadow-xs scale-105'
                          : 'border-black/[0.06] dark:border-white/[0.08] bg-[#FAF8F5] dark:bg-[#1E2421]'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                  <input
                    type="text"
                    value={customEmoji}
                    onChange={(e) => setCustomEmoji(e.target.value.slice(0, 4))}
                    placeholder="emoji"
                    className="w-16 px-2 py-1 text-xs text-center rounded-xl border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#181C1A]"
                    title="Type custom emoji"
                  />
                </div>
              </div>

              {/* Custom Status Label */}
              <div>
                <label className="text-[11px] font-medium text-[#58635C] dark:text-[#9DAAA0] block mb-1">
                  Status Name
                </label>
                <input
                  type="text"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value.slice(0, 30))}
                  placeholder="e.g. Deep Work, Gym, Cooking"
                  className="w-full text-xs p-2.5 florum-input"
                />
              </div>
            </div>
          )}

          {/* Custom status text note */}
          <div>
            <label className="text-xs font-semibold text-[#191D1A] dark:text-[#F5F7F5] block mb-1">
              Status Message (Optional)
            </label>
            <input
              type="text"
              value={customStatus}
              onChange={(e) => setCustomStatus(e.target.value)}
              placeholder="e.g. In meetings until 4 PM, call for urgent items"
              className="w-full text-xs sm:text-sm p-3 florum-input"
              maxLength={80}
            />
          </div>

          {/* Duration selector */}
          <NeoSelect
            id="status-duration"
            label="Clear After"
            value={duration}
            onChange={setDuration}
            options={[
              { value: '1_hour', label: '1 Hour' },
              { value: '4_hours', label: '4 Hours (Standard)' },
              { value: 'today', label: 'End of Today (Midnight)' },
              { value: 'cleared', label: 'Do not auto-clear (Until manual change)' }
            ]}
          />

          {/* Strict DND toggle */}
          <div className="pt-2">
            <NeoCheckbox
              id="strict-dnd"
              checked={strictDnd}
              onChange={setStrictDnd}
              label="Mute incoming notifications during this status"
              description="Your circle will see your DND badge before sending notes."
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="florum-btn-ghost text-xs py-2.5 px-4 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="florum-btn-primary text-xs py-2.5 px-5 font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving...' : 'Set Availability'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
