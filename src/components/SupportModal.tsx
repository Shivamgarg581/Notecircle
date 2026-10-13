import React, { useState, useEffect } from 'react';
import { X, HelpCircle, Shield, FileText, Send, ChevronDown, CheckCircle, Mail, MessageSquare } from 'lucide-react';
import { api } from '../services/api.ts';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBugReport?: () => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose, onOpenBugReport }) => {
  const [activeTab, setActiveTab] = useState<'faq' | 'safety' | 'policies' | 'contact'>('faq');
  const [faqs, setFaqs] = useState<Array<{ q: string; a: string }>>([]);
  const [policies, setPolicies] = useState<{ terms: string; privacyPolicy: string; communityGuidelines: string } | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Ticket form
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketSent, setTicketSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      api.getFaqs().then((res) => setFaqs(res.faqs)).catch(() => {});
      api.getPolicies().then((res) => setPolicies(res.policies)).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSendTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) return;

    setIsSubmitting(true);
    try {
      await api.submitSupportTicket(ticketSubject, ticketMessage);
      setTicketSent(true);
      setTicketSubject('');
      setTicketMessage('');
      setTimeout(() => setTicketSent(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to submit ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
      <div 
        className="florum-card bg-white dark:bg-[#181C1A] w-full max-w-xl rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] border border-black/[0.08] dark:border-white/[0.10]"
        role="dialog"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-900 text-white flex items-center justify-center shadow-xs">
              <HelpCircle className="w-4 h-4 text-emerald-100" />
            </div>
            <div>
              <h2 className="text-base font-bold font-display text-[#191D1A] dark:text-[#F5F7F5]">
                Help & Safety Center
              </h2>
              <p className="text-[11px] text-[#8A968F]">Guides, privacy architecture & support</p>
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

        {/* Tab switcher */}
        <div className="px-4 sm:px-6 pt-4 pb-0">
          <div className="flex items-center gap-1 overflow-x-auto p-1 bg-[#F5F2EB] dark:bg-[#1E2421] border border-black/[0.04] dark:border-white/[0.06] rounded-2xl text-xs font-semibold scrollbar-none">
            {[
              { id: 'faq', label: 'FAQs' },
              { id: 'safety', label: 'Privacy & Cryptography' },
              { id: 'policies', label: 'Policies' },
              { id: 'contact', label: 'Contact Us' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-1.5 px-3 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-[#252B28] text-[#191D1A] dark:text-white shadow-xs font-bold'
                    : 'text-[#58635C] dark:text-[#9DAAA0] hover:text-[#191D1A] dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {activeTab === 'faq' && (
            <div className="space-y-2.5">
              {faqs.length === 0 ? (
                <p className="text-xs text-[#8A968F] text-center py-8">Loading FAQs...</p>
              ) : (
                faqs.map((faq, idx) => {
                  const isOpen = openFaqIndex === idx;
                  return (
                    <div
                      key={idx}
                      className="border border-black/[0.06] dark:border-white/[0.08] rounded-2xl bg-[#FAF8F5] dark:bg-[#1E2421] overflow-hidden"
                    >
                      <button
                        onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                        className="w-full text-left p-3.5 flex items-center justify-between text-xs font-semibold text-[#191D1A] dark:text-[#F5F7F5] cursor-pointer"
                      >
                        <span>{faq.q}</span>
                        <ChevronDown className={`w-4 h-4 text-[#8A968F] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isOpen && (
                        <div className="px-3.5 pb-3.5 pt-0 text-xs text-[#58635C] dark:text-[#9DAAA0] leading-relaxed border-t border-black/[0.04] dark:border-white/[0.06] mt-1 pt-2">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'safety' && (
            <div className="space-y-3 text-xs leading-relaxed text-[#58635C] dark:text-[#9DAAA0]">
              <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 rounded-2xl space-y-2 text-emerald-950 dark:text-emerald-200">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span>End-to-End Cryptographic Architecture</span>
                </div>
                <p>
                  Every private chat message is encrypted in your browser using AES-GCM-256 and ECDH keys before transmission. NoteCircle servers only ever store encrypted ciphertext.
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-[#FAF8F5] dark:bg-[#1E2421] space-y-1.5">
                <h4 className="font-semibold text-[#191D1A] dark:text-[#F5F7F5]">Local-First Device Persistence</h4>
                <p>
                  Your drafts and device credentials reside securely in local IndexedDB. Production data syncs safely across devices via real server database persistence.
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-[#FAF8F5] dark:bg-[#1E2421] space-y-1.5">
                <h4 className="font-semibold text-[#191D1A] dark:text-[#F5F7F5]">Zero Public Feeds & Algorithmic Tracking</h4>
                <p>
                  No global discovery, no follower counts displayed to strangers, no vanity metrics. Your temporary notes exist solely for your approved circle.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'policies' && policies && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-[#FAF8F5] dark:bg-[#1E2421] space-y-1">
                <h4 className="font-semibold text-[#191D1A] dark:text-[#F5F7F5]">Terms of Service</h4>
                <p className="text-[#58635C] dark:text-[#9DAAA0] whitespace-pre-line leading-relaxed">{policies.terms}</p>
              </div>
              <div className="p-4 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-[#FAF8F5] dark:bg-[#1E2421] space-y-1">
                <h4 className="font-semibold text-[#191D1A] dark:text-[#F5F7F5]">Privacy Policy</h4>
                <p className="text-[#58635C] dark:text-[#9DAAA0] whitespace-pre-line leading-relaxed">{policies.privacyPolicy}</p>
              </div>
            </div>
          )}

          {activeTab === 'contact' && (
            <form onSubmit={handleSendTicket} className="space-y-3.5">
              {ticketSent && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 text-xs rounded-2xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Support request received! Our team will respond shortly.</span>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-[#191D1A] dark:text-[#F5F7F5] block mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  placeholder="e.g. Question about key backup"
                  className="w-full text-xs sm:text-sm p-3 florum-input font-medium"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#191D1A] dark:text-[#F5F7F5] block mb-1">
                  Message
                </label>
                <textarea
                  value={ticketMessage}
                  onChange={(e) => setTicketMessage(e.target.value)}
                  rows={4}
                  placeholder="How can our security and support team help you?"
                  className="w-full text-xs sm:text-sm p-3 florum-input font-medium resize-none"
                  required
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                {onOpenBugReport && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenBugReport();
                    }}
                    className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
                  >
                    Report a technical bug instead →
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="florum-btn-primary text-xs py-2.5 px-5 font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm ml-auto"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Sending...' : 'Send Message'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
