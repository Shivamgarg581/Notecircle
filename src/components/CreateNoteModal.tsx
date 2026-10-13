import React, { useState } from 'react';
import { X, Clock, Users, Sparkles, MessageCircle, Heart, Calendar, Pin, FileText, Lock } from 'lucide-react';
import { api } from '../services/api.ts';
import { localDb } from '../services/localDb.ts';
import type { NoteCategory, PrivacyAudience } from '../types/index.ts';
import { NeoSelect } from './NeoSelect.tsx';
import { NeoCheckbox } from './NeoCheckbox.tsx';
import { WashiTape } from './NotebookAssets.tsx';

interface CreateNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNoteCreated: () => void;
}

interface TemplateItem {
  emoji: string;
  category: NoteCategory;
  title: string;
  defaultText: string;
  defaultDuration: string;
}

const NOTE_TEMPLATES: TemplateItem[] = [
  {
    emoji: '🏕️',
    category: 'family',
    title: 'Family Time',
    defaultText: "Spending quiet time with family for the next few days. Reach out if urgent.",
    defaultDuration: '3_days'
  },
  {
    emoji: '📚',
    category: 'study',
    title: 'Studying',
    defaultText: 'Focusing on reading and study today. Replies may be slow.',
    defaultDuration: '6_hours'
  },
  {
    emoji: '💼',
    category: 'work',
    title: 'Deep Work',
    defaultText: "In deep focus mode right now. Catching up on messages later.",
    defaultDuration: '3_hours'
  },
  {
    emoji: '☕',
    category: 'break',
    title: 'Coffee Break',
    defaultText: 'Stepping out for coffee and screen detox.',
    defaultDuration: '1_hour'
  },
  {
    emoji: '✈️',
    category: 'travel',
    title: 'Travelling',
    defaultText: 'On the road with intermittent signal.',
    defaultDuration: '1_day'
  },
  {
    emoji: '🏖️',
    category: 'vacation',
    title: 'Vacation',
    defaultText: 'Off the grid enjoying downtime.',
    defaultDuration: '7_days'
  }
];

export const CreateNoteModal: React.FC<CreateNoteModalProps> = ({
  isOpen,
  onClose,
  onNoteCreated
}) => {
  const [text, setText] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('💭');
  const [category, setCategory] = useState<NoteCategory>('custom');
  const [duration, setDuration] = useState('1_day');
  const [audience, setAudience] = useState<PrivacyAudience>('followers');
  const [scheduledFor, setScheduledFor] = useState('');
  const [allowReplies, setAllowReplies] = useState(true);
  const [allowReactions, setAllowReactions] = useState(true);
  const [isPinned, setIsPinned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApplyTemplate = (tmpl: TemplateItem) => {
    setSelectedEmoji(tmpl.emoji);
    setCategory(tmpl.category);
    setText(tmpl.defaultText);
    setDuration(tmpl.defaultDuration);
  };

  const handlePostNote = async (asDraft = false) => {
    if (!text.trim()) {
      setError('Please write some content for your note.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload = {
      emoji: selectedEmoji,
      category,
      text: text.trim(),
      duration,
      audience,
      scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : undefined,
      isDraft: asDraft,
      isPinned,
      allowReplies,
      allowReactions
    };

    try {
      if (navigator.onLine) {
        const res = await api.createNote(payload);
        await localDb.saveNote(res.note);
      } else {
        await localDb.enqueueSyncAction({
          id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          type: 'CREATE_NOTE',
          payload,
          timestamp: new Date().toISOString()
        });
      }
      onNoteCreated();
      onClose();
    } catch (err: any) {
      console.error('Failed to create note:', err);
      setError(err.message || 'Failed to post note. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#111111]/70 backdrop-blur-sm animate-in fade-in">
      <div 
        className="w-full sm:max-w-lg bg-[var(--card-surface)] border-t-3 sm:border-3 border-[#111111] dark:border-[#3E3E4A] rounded-t-3xl sm:rounded-3xl shadow-[6px_6px_0px_#111111] flex flex-col max-h-[92vh] overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-note-title"
      >
        {/* Mobile Grabber / Sheet Handle */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="w-12 h-1.5 rounded-full bg-[#111111]/20 dark:bg-white/20" />
        </div>

        {/* Modal Header with Washi Tape */}
        <div className="px-5 sm:px-6 py-4 flex items-center justify-between border-b-2.5 border-black/10 dark:border-white/10 relative">
          <div className="flex items-center gap-2.5">
            <WashiTape color="yellow" label="Notebook Entry" />
            <h2 id="create-note-title" className="text-base font-black font-display text-[#111111] dark:text-[#F5F2EB] uppercase tracking-wide">
              Post Circle Note
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl border-2 border-[#111111] dark:border-[#3E3E4A] bg-[var(--card-surface)] flex items-center justify-center text-[#111111] dark:text-[#F5F2EB] shadow-[1.5px_1.5px_0px_#111111] hover:scale-105 transition-transform cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 bg-rose-100 dark:bg-rose-950/60 border-2 border-rose-600 rounded-2xl text-xs font-bold text-rose-900 dark:text-rose-200 shadow-[2px_2px_0px_#111111]">
              {error}
            </div>
          )}

          {/* Quick Templates */}
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-[#111111] dark:text-[#F5F2EB] flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#FFCA05]" />
              <span>Quick Notebook Templates</span>
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {NOTE_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.title}
                  type="button"
                  onClick={() => handleApplyTemplate(tmpl)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border-2 ${
                    category === tmpl.category
                      ? 'bg-[#FFCA05] text-[#111111] border-[#111111] shadow-[2px_2px_0px_#111111]'
                      : 'bg-[var(--card-surface-subtle)] text-[#4A4742] dark:text-[#C8C5BE] border-[#111111]/30 hover:border-[#111111]'
                  }`}
                >
                  <span>{tmpl.emoji}</span>
                  <span>{tmpl.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Note Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-black uppercase text-[#111111] dark:text-[#F5F2EB]">
                What's happening?
              </label>
              <span className="text-[11px] font-bold text-[#6B6863] dark:text-[#C8C5BE]">{text.length}/280</span>
            </div>
            
            <div className="rounded-2xl border-2.5 border-[#111111] dark:border-[#3E3E4A] bg-[var(--card-surface-subtle)] overflow-hidden shadow-[3px_3px_0px_#111111]">
              <div className="px-3.5 py-2 flex items-center gap-2.5 border-b-2 border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5">
                <span className="text-xl select-none">{selectedEmoji}</span>
                <input
                  type="text"
                  value={selectedEmoji}
                  onChange={(e) => setSelectedEmoji(e.target.value.slice(0, 2))}
                  className="w-10 text-center text-sm font-black bg-[var(--card-surface)] border-2 border-[#111111] rounded-lg p-1 text-[#111111] dark:text-[#F5F2EB] shadow-[1px_1px_0px_#111111]"
                  title="Custom emoji icon"
                />
                <span className="text-[11px] font-bold text-[#6B6863] dark:text-[#C8C5BE]">Change mood sticker</span>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 280))}
                rows={3}
                placeholder="Write a private note for your circle..."
                className="w-full p-3.5 text-sm sm:text-base text-[#111111] dark:text-[#F5F2EB] placeholder:text-[#6B6863] bg-transparent focus:outline-none resize-none leading-relaxed font-medium"
              />
            </div>
          </div>

          {/* Audience Selection */}
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-[#111111] dark:text-[#F5F2EB] flex items-center gap-1.5 mb-2">
              <Users className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Target Audience</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setAudience('followers')}
                className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                  audience === 'followers'
                    ? 'border-[#111111] bg-[#FFCA05] text-[#111111] shadow-[3px_3px_0px_#111111]'
                    : 'border-[#111111]/30 dark:border-[#3E3E4A] bg-[var(--card-surface-subtle)] text-[#111111] dark:text-[#F5F2EB]'
                }`}
              >
                <div className="text-xs font-black uppercase">Entire Circle</div>
                <div className="text-[11px] font-semibold text-[#111111]/80 dark:text-[#C8C5BE] mt-0.5">Approved connections only</div>
              </button>

              <button
                type="button"
                onClick={() => setAudience('close_friends')}
                className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                  audience === 'close_friends'
                    ? 'border-[#111111] bg-[#D8F3DC] text-[#111111] shadow-[3px_3px_0px_#111111]'
                    : 'border-[#111111]/30 dark:border-[#3E3E4A] bg-[var(--card-surface-subtle)] text-[#111111] dark:text-[#F5F2EB]'
                }`}
              >
                <div className="text-xs font-black uppercase">Close Friends</div>
                <div className="text-[11px] font-semibold text-[#111111]/80 dark:text-[#C8C5BE] mt-0.5">Strictly inner circle</div>
              </button>
            </div>
          </div>

          {/* Expiration Settings & Optional Schedule */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <NeoSelect
              id="note-duration"
              label="Expires After"
              value={duration}
              onChange={(val) => setDuration(val)}
              options={[
                { value: '1_hour', label: '1 hour' },
                { value: '3_hours', label: '3 hours' },
                { value: '6_hours', label: '6 hours' },
                { value: '12_hours', label: '12 hours' },
                { value: '1_day', label: '1 day (24 hours)' },
                { value: '3_days', label: '3 days' },
                { value: '1_week', label: '1 week' },
                { value: 'never', label: 'Never (Until replaced)' }
              ]}
            />

            <div>
              <label className="text-xs font-black uppercase text-[#111111] dark:text-[#F5F2EB] block mb-1.5">
                Schedule Later (Optional)
              </label>
              <input
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                className="w-full text-xs font-bold p-2.5 neo-input"
              />
            </div>
          </div>

          {/* Privacy Preview */}
          <div className="p-3 bg-[#FEF9E7] dark:bg-[#26241A] rounded-2xl border-2 border-[#111111] dark:border-[#3E3E4A] flex items-center justify-between text-xs text-[#111111] dark:text-[#F5F2EB] shadow-[2px_2px_0px_#111111]">
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="font-black uppercase tracking-wider text-[11px]">Privacy:</span>
            </div>
            <span className="text-xs font-bold">
              {audience === 'close_friends' ? 'Close Friends Only' : 'Entire Circle'} · {duration.replace('_', ' ')}
            </span>
          </div>

          {/* Interaction Toggles */}
          <div className="pt-2 border-t-2 border-black/10 dark:border-white/10 flex flex-wrap items-center justify-between text-xs text-[#111111] dark:text-[#F5F2EB] gap-3">
            <NeoCheckbox
              id="note-allow-replies"
              checked={allowReplies}
              onChange={(checked) => setAllowReplies(checked)}
              label={<span className="flex items-center gap-1 font-bold"><MessageCircle className="w-3.5 h-3.5" /> Allow replies</span>}
            />

            <NeoCheckbox
              id="note-allow-reactions"
              checked={allowReactions}
              onChange={(checked) => setAllowReactions(checked)}
              label={<span className="flex items-center gap-1 font-bold"><Heart className="w-3.5 h-3.5" /> Allow reactions</span>}
            />

            <NeoCheckbox
              id="note-is-pinned"
              checked={isPinned}
              onChange={(checked) => setIsPinned(checked)}
              label={<span className="flex items-center gap-1 font-bold"><Pin className="w-3.5 h-3.5" /> Pin note</span>}
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-3.5 border-t-2.5 border-black/10 dark:border-white/10 bg-[var(--card-surface-subtle)] flex items-center justify-between pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            disabled={isSubmitting || !text.trim()}
            onClick={() => handlePostNote(true)}
            className="neo-btn text-xs py-2 px-3 flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            <FileText className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Save Draft</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="neo-btn text-xs py-2 px-3.5 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting || !text.trim()}
              onClick={() => handlePostNote(false)}
              className="neo-btn-primary text-xs py-2 px-5 cursor-pointer disabled:opacity-40 uppercase tracking-wider"
            >
              {isSubmitting ? 'Posting...' : scheduledFor ? 'Schedule' : 'Post Note'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
