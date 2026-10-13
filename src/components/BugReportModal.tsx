import React, { useState, useEffect } from 'react';
import { X, Bug, CheckCircle, Clock, AlertCircle, Send, Paperclip } from 'lucide-react';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import type { BugReport } from '../types/index.ts';
import { NeoSelect } from './NeoSelect.tsx';

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BugReportModal: React.FC<BugReportModalProps> = ({ isOpen, onClose }) => {
  const { androidPreview } = useAuth();
  const [tab, setTab] = useState<'new' | 'history'>('new');
  const [category, setCategory] = useState<'ui' | 'privacy' | 'notes' | 'chat' | 'sync' | 'other'>('notes');
  const [description, setDescription] = useState('');
  const [errorId, setErrorId] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [myBugs, setMyBugs] = useState<BugReport[]>([]);
  const [successMsg, setSuccessMsg] = useState(false);

  const fetchBugs = async () => {
    try {
      const res = await api.getMyBugs();
      setMyBugs(res.bugs);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBugs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Screenshot file size should be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshot(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsSubmitting(true);
    try {
      await api.submitBug({
        category,
        description: description.trim(),
        errorIdentifier: errorId.trim() || undefined,
        screenshot: screenshot || undefined,
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          screen: `${window.innerWidth}x${window.innerHeight}`,
          isAndroidPreview: androidPreview
        }
      });
      setSuccessMsg(true);
      setDescription('');
      setErrorId('');
      setScreenshot(null);
      await fetchBugs();
      setTimeout(() => setSuccessMsg(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to submit bug report');
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
              <Bug className="w-4 h-4 text-emerald-100" />
            </div>
            <div>
              <h2 className="text-base font-bold font-display text-[#191D1A] dark:text-[#F5F7F5]">
                Report Bug / Feedback
              </h2>
              <p className="text-[11px] text-[#8A968F]">Help keep NoteCircle secure and reliable</p>
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

        {/* Segmented Tab Header */}
        <div className="px-4 sm:px-6 pt-4 pb-0">
          <div className="flex items-center p-1 bg-[#F5F2EB] dark:bg-[#1E2421] border border-black/[0.04] dark:border-white/[0.06] rounded-2xl text-xs font-semibold">
            <button
              onClick={() => setTab('new')}
              className={`flex-1 py-1.5 px-3 rounded-xl transition-all text-center cursor-pointer ${
                tab === 'new'
                  ? 'bg-white dark:bg-[#252B28] text-[#191D1A] dark:text-white shadow-xs font-bold'
                  : 'text-[#58635C] dark:text-[#9DAAA0] hover:text-[#191D1A] dark:hover:text-white'
              }`}
            >
              New Bug Report
            </button>
            <button
              onClick={() => setTab('history')}
              className={`flex-1 py-1.5 px-3 rounded-xl transition-all text-center cursor-pointer ${
                tab === 'history'
                  ? 'bg-white dark:bg-[#252B28] text-[#191D1A] dark:text-white shadow-xs font-bold'
                  : 'text-[#58635C] dark:text-[#9DAAA0] hover:text-[#191D1A] dark:hover:text-white'
              }`}
            >
              My Reports ({myBugs.length})
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {tab === 'new' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {successMsg && (
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 text-xs rounded-2xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Report submitted successfully! Thank you for helping NoteCircle.</span>
                </div>
              )}

              <NeoSelect
                id="bug-category"
                label="Issue Category"
                value={category}
                onChange={(val) => setCategory(val as any)}
                options={[
                  { value: 'notes', label: 'Notes & Expiration' },
                  { value: 'chat', label: 'Private Chat & Messaging' },
                  { value: 'privacy', label: 'Privacy & Permissions' },
                  { value: 'sync', label: 'Local-First Sync & Storage' },
                  { value: 'ui', label: 'UI & Layout Experience' },
                  { value: 'other', label: 'General Feedback / Other' }
                ]}
              />

              <div>
                <label className="text-xs font-semibold text-[#191D1A] dark:text-[#F5F7F5] block mb-1.5">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="What happened? Include steps to reproduce or expected behavior..."
                  className="w-full text-xs sm:text-sm font-medium p-3 florum-input resize-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#191D1A] dark:text-[#F5F7F5] block mb-1.5">
                  Error Code / Identifier (Optional)
                </label>
                <input
                  type="text"
                  value={errorId}
                  onChange={(e) => setErrorId(e.target.value)}
                  placeholder="e.g. ERR_SYNC_TIMEOUT_403"
                  className="w-full text-xs sm:text-sm font-medium p-3 florum-input"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#191D1A] dark:text-[#F5F7F5] block mb-1.5">
                  Screenshot (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleScreenshotChange}
                  className="block w-full text-xs text-[#58635C] dark:text-[#9DAAA0] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 dark:file:bg-emerald-950/60 file:text-emerald-800 dark:file:text-emerald-200 hover:file:bg-emerald-100 cursor-pointer"
                />
                {screenshot && (
                  <div className="mt-2 relative rounded-2xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08] max-h-36">
                    <img src={screenshot} alt="Screenshot preview" className="w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setScreenshot(null)}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-lg text-xs"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="florum-btn-primary text-xs py-2.5 px-5 font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Submitting...' : 'Submit Report'}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              {myBugs.length === 0 ? (
                <div className="text-center py-12 text-[#8A968F]">
                  <Bug className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-semibold text-[#191D1A] dark:text-[#F5F7F5]">No submitted reports</p>
                  <p className="text-[11px] mt-0.5">Your submitted bug reports will appear here.</p>
                </div>
              ) : (
                myBugs.map((bug) => (
                  <div
                    key={bug.id}
                    className="p-3.5 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-[#FAF8F5] dark:bg-[#1E2421] space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                        {bug.category}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        bug.status === 'RESOLVED' 
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200' 
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200'
                      }`}>
                        {bug.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#191D1A] dark:text-[#F5F7F5] leading-relaxed">
                      {bug.description}
                    </p>
                    <span className="text-[10px] text-[#8A968F] block">
                      {new Date(bug.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
