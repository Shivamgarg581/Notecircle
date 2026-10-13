import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Users, 
  StickyNote, 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  RefreshCcw, 
  Bug,
  Activity,
  FileText,
  UserX,
  Trash2,
  Lock,
  ShieldCheck
} from 'lucide-react';
import { api } from '../services/api.ts';
import type { Report, BugReport } from '../types/index.ts';

export const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'metrics' | 'abuse' | 'bugs'>('metrics');
  const [reports, setReports] = useState<Report[]>([]);
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      const [reportsRes, bugsRes, metricsRes] = await Promise.all([
        api.getAdminReports(),
        api.getAdminBugs(),
        api.getAdminMetrics()
      ]);
      setReports(reportsRes.reports);
      setBugs(bugsRes.bugs);
      setMetrics(metricsRes.metrics);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleReportAction = async (reportId: string, action: string) => {
    const resolutionNote = prompt('Resolution note for audit log:', `Action taken: ${action}`);
    if (resolutionNote === null) return;

    try {
      await api.handleReportAction(reportId, action, resolutionNote);
      await fetchAdminData();
      alert(`Report action executed: ${action}`);
    } catch (err: any) {
      alert(err.message || 'Action failed');
    }
  };

  const handleUpdateBug = async (bugId: string, status: string) => {
    const note = prompt('Resolution note:', `Status updated to ${status}`);
    if (note === null) return;
    try {
      await api.updateAdminBug(bugId, status, note);
      await fetchAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to update bug');
    }
  };

  const handleRefresh = () => {
    fetchAdminData();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 florum-card bg-white dark:bg-[#181C1A]">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-800 to-emerald-950 text-white flex items-center justify-center shadow-xs">
            <ShieldAlert className="w-5 h-5 text-emerald-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                Staff Ops
              </span>
              <h2 className="text-base font-bold font-display text-[#191D1A] dark:text-[#F5F7F5]">
                Trust & Safety Moderation Dashboard
              </h2>
            </div>
            <p className="text-xs text-[#8A968F] mt-0.5">
              Real server data: abuse telemetry, system status & bug issues
            </p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          className="florum-btn-secondary text-xs py-2 px-3.5 flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Segmented Admin Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-[#F5F2EB] dark:bg-[#181C1A] border border-black/[0.04] dark:border-white/[0.06] rounded-2xl text-xs font-semibold overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('metrics')}
          className={`py-2 px-4 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'metrics'
              ? 'bg-white dark:bg-[#252B28] text-[#191D1A] dark:text-white shadow-xs font-bold'
              : 'text-[#58635C] dark:text-[#9DAAA0] hover:text-[#191D1A] dark:hover:text-white'
          }`}
        >
          System Health & Metrics
        </button>
        <button
          onClick={() => setActiveTab('abuse')}
          className={`py-2 px-4 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'abuse'
              ? 'bg-white dark:bg-[#252B28] text-[#191D1A] dark:text-white shadow-xs font-bold'
              : 'text-[#58635C] dark:text-[#9DAAA0] hover:text-[#191D1A] dark:hover:text-white'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Abuse Reports ({reports.filter((r) => r.status === 'PENDING').length})</span>
        </button>
        <button
          onClick={() => setActiveTab('bugs')}
          className={`py-2 px-4 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'bugs'
              ? 'bg-white dark:bg-[#252B28] text-[#191D1A] dark:text-white shadow-xs font-bold'
              : 'text-[#58635C] dark:text-[#9DAAA0] hover:text-[#191D1A] dark:hover:text-white'
          }`}
        >
          <Bug className="w-3.5 h-3.5" />
          <span>Bug Reports ({bugs.length})</span>
        </button>
      </div>

      {/* Tab 1: Metrics */}
      {activeTab === 'metrics' && metrics && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="florum-card bg-white dark:bg-[#181C1A] p-4">
              <p className="text-[11px] font-medium text-[#8A968F]">Total Users</p>
              <p className="text-2xl sm:text-3xl font-bold text-[#191D1A] dark:text-[#F5F7F5] tabular-nums mt-1 font-display">
                {metrics.totalUsers}
              </p>
            </div>
            <div className="florum-card bg-white dark:bg-[#181C1A] p-4">
              <p className="text-[11px] font-medium text-[#8A968F]">Active Notes</p>
              <p className="text-2xl sm:text-3xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums mt-1 font-display">
                {metrics.activeNotes}
              </p>
            </div>
            <div className="florum-card bg-white dark:bg-[#181C1A] p-4">
              <p className="text-[11px] font-medium text-[#8A968F]">Connections</p>
              <p className="text-2xl sm:text-3xl font-bold text-[#191D1A] dark:text-[#F5F7F5] tabular-nums mt-1 font-display">
                {metrics.acceptedConnections}
              </p>
            </div>
            <div className="florum-card bg-white dark:bg-[#181C1A] p-4">
              <p className="text-[11px] font-medium text-[#8A968F]">Pending Requests</p>
              <p className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400 tabular-nums mt-1 font-display">
                {metrics.pendingRequests}
              </p>
            </div>
          </div>

          <div className="florum-card bg-white dark:bg-[#181C1A] p-5 sm:p-6 space-y-3.5">
            <h4 className="font-semibold text-sm text-[#191D1A] dark:text-[#F5F7F5] flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>System & Privacy Security Status</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
              <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-200">
                <span className="font-bold">E2E Cryptographic Relay</span>
                <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">Active & Verified</p>
              </div>
              <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-200">
                <span className="font-bold">IndexedDB Local Cache</span>
                <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">Encrypted & Fresh</p>
              </div>
              <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-200">
                <span className="font-bold">Object-Level Auth</span>
                <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">Strict 403 Enforced</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Abuse Reports */}
      {activeTab === 'abuse' && (
        <div className="florum-card bg-white dark:bg-[#181C1A] divide-y divide-black/[0.04] dark:divide-white/[0.06] overflow-hidden">
          {reports.length === 0 ? (
            <div className="p-12 text-center space-y-1.5 text-[#8A968F]">
              <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-emerald-600" />
              <p className="text-sm font-semibold text-[#191D1A] dark:text-[#F5F7F5]">
                No abuse reports pending review
              </p>
              <p className="text-xs">
                Your NoteCircle environment is clean and privacy-safe.
              </p>
            </div>
          ) : (
            reports.map((report) => (
              <div key={report.id} className="p-4 sm:p-5 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-rose-800 dark:text-rose-200 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-800 text-[10px]">
                      {report.reason}
                    </span>
                    <span className="text-[#8A968F]">
                      Reported by @{report.reporterUsername}
                    </span>
                  </div>
                  <span className="font-medium text-[#58635C] dark:text-[#9DAAA0] bg-[#F5F2EB] dark:bg-[#1E2421] px-2 py-0.5 rounded-lg text-[10px]">
                    Status: {report.status}
                  </span>
                </div>

                <p className="text-[#191D1A] dark:text-[#F5F7F5]">
                  <strong className="font-semibold">Target:</strong> {report.targetType} ({report.targetAuthorName})
                </p>
                {report.targetContentPreview && (
                  <p className="font-mono text-xs text-[#58635C] dark:text-[#9DAAA0] bg-[#FAF8F5] dark:bg-[#1E2421] p-3 rounded-xl border border-black/[0.06] dark:border-white/[0.08]">
                    "{report.targetContentPreview}"
                  </p>
                )}

                {report.status === 'PENDING' && (
                  <div className="flex items-center gap-2 pt-1">
                    {report.targetType === 'user' && (
                      <button
                        onClick={() => handleReportAction(report.id, 'suspend_user')}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                      >
                        Suspend User
                      </button>
                    )}
                    <button
                      onClick={() => handleReportAction(report.id, 'delete_content')}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      Delete Content
                    </button>
                    <button
                      onClick={() => handleReportAction(report.id, 'dismiss')}
                      className="florum-btn-ghost text-xs py-1.5 px-3 rounded-xl cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Bug Reports */}
      {activeTab === 'bugs' && (
        <div className="florum-card bg-white dark:bg-[#181C1A] divide-y divide-black/[0.04] dark:divide-white/[0.06] overflow-hidden">
          {bugs.length === 0 ? (
            <div className="p-12 text-center space-y-1.5 text-[#8A968F]">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-600" />
              <p className="text-sm font-semibold text-[#191D1A] dark:text-[#F5F7F5]">
                No active bug reports filed
              </p>
              <p className="text-xs">
                Everything is running smoothly.
              </p>
            </div>
          ) : (
            bugs.map((b) => (
              <div key={b.id} className="p-4 sm:p-5 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/60 text-[10px]">
                      {b.category}
                    </span>
                    <span className="text-[#8A968F]">Reported by @{b.username}</span>
                  </div>
                  <span className="font-medium text-[#58635C] dark:text-[#9DAAA0] bg-[#F5F2EB] dark:bg-[#1E2421] px-2 py-0.5 rounded-lg text-[10px]">
                    {b.status}
                  </span>
                </div>

                <p className="text-[#191D1A] dark:text-[#F5F7F5] font-medium leading-relaxed">
                  {b.description}
                </p>
                {b.screenshot && (
                  <div className="pt-1">
                    <span className="text-[10px] text-[#8A968F] font-semibold block mb-1">Attached Screenshot:</span>
                    <a href={b.screenshot} target="_blank" rel="noreferrer">
                      <img src={b.screenshot} alt="Bug screenshot" className="h-28 w-auto rounded-xl border border-black/[0.08] dark:border-white/[0.08] object-cover hover:opacity-90" />
                    </a>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleUpdateBug(b.id, 'REVIEWING')}
                    className="florum-btn-secondary text-xs py-1.5 px-3 rounded-xl cursor-pointer"
                  >
                    Mark Reviewing
                  </button>
                  <button
                    onClick={() => handleUpdateBug(b.id, 'IN_PROGRESS')}
                    className="florum-btn-secondary text-xs py-1.5 px-3 rounded-xl cursor-pointer"
                  >
                    Mark In Progress
                  </button>
                  <button
                    onClick={() => handleUpdateBug(b.id, 'RESOLVED')}
                    className="florum-btn-primary text-xs py-1.5 px-3 rounded-xl cursor-pointer"
                  >
                    Mark Resolved
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
