import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Heart,
  Flag,
  Search,
  Eye,
  Check,
  X,
  RefreshCw,
  LogOut,
  AlertTriangle,
  Ban,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Analytics {
  totalUsers: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  suspendedCount: number;
  totalMatches: number;
  totalReports: number;
}

interface VerificationApplication {
  id: string;
  userId: string;
  firstName: string;
  dateOfBirth: string;
  course: string;
  academicYear: string;
  status: 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  rejectionReason: string | null;
  createdAt: string;
  user: {
    email: string;
    verificationStatus: string;
    isDiscoveryPaused: boolean;
  };
}

interface ReportItem {
  id: string;
  category: string;
  details: string;
  status: string;
  action_taken: string | null;
  created_at: string;
  reporter_email: string;
  reported_id: string;
  reported_email: string;
  reported_name: string;
}

interface AuditLog {
  id: string;
  action: string;
  target_id: string | null;
  details: any;
  created_at: string;
  actor_email: string;
}

interface AdminDashboardPageProps {
  onNavigate: (tab: string) => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ onNavigate }) => {
  const { user, token, logout } = useAuth();

  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [applications, setApplications] = useState<VerificationApplication[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [activeTab, setActiveTab] = useState<'pending' | 'all' | 'reports' | 'audit'>('pending');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);

  // Review modal state
  const [selectedApp, setSelectedApp] = useState<VerificationApplication | null>(null);
  const [modalImageSrc, setModalImageSrc] = useState<string | null>(null);
  const [isImageLoading, setIsImageLoading] = useState<boolean>(false);
  const [showRejectBox, setShowRejectBox] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [actionInProgress, setActionInProgress] = useState<boolean>(false);

  // Guard access
  useEffect(() => {
    if (user && user.role !== 'FOUNDER') {
      onNavigate('discover');
    }
  }, [user, onNavigate]);

  const fetchDashboardData = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [analyticsRes, appsRes, reportsRes, logsRes] = await Promise.all([
        fetch('/api/admin/analytics', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/verifications', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/reports', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/audit-logs', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const aData = await analyticsRes.json();
      const appsData = await appsRes.json();
      const repData = await reportsRes.json();
      const logsData = await logsRes.json();

      if (aData.success) setAnalytics(aData.analytics);
      if (appsData.success) setApplications(appsData.applications);
      if (repData.success) setReports(repData.reports);
      if (logsData.success) setAuditLogs(logsData.logs);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  // Stream private physical ID photo securely using authenticated blob
  const handleOpenReview = async (app: VerificationApplication) => {
    setSelectedApp(app);
    setShowRejectBox(false);
    setRejectionReason('');
    setIsImageLoading(true);
    setModalImageSrc(null);

    try {
      const res = await fetch(`/api/admin/verifications/${app.id}/id-card`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load protected ID card.');
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      setModalImageSrc(objectUrl);
    } catch (err) {
      console.error(err);
    } finally {
      setIsImageLoading(false);
    }
  };

  const handleCloseModal = () => {
    if (modalImageSrc) URL.revokeObjectURL(modalImageSrc);
    setSelectedApp(null);
    setModalImageSrc(null);
    setShowRejectBox(false);
    setRejectionReason('');
  };

  const handleReviewAction = async (action: 'APPROVE' | 'REJECT') => {
    if (!selectedApp || !token) return;
    setActionInProgress(true);

    try {
      const res = await fetch(`/api/admin/verifications/${selectedApp.id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          rejectionReason: action === 'REJECT' ? rejectionReason : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      handleCloseModal();
      await fetchDashboardData();
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleToggleSuspension = async (userId: string, currentStatus: string) => {
    if (!token) return;
    const willSuspend = currentStatus !== 'SUSPENDED';
    const confirmMsg = willSuspend
      ? 'Suspend this student account? They will lose access immediately.'
      : 'Reinstate this student account?';
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}/suspend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ suspend: willSuspend })
      });
      const data = await res.json();
      if (res.ok) {
        await fetchDashboardData();
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolveReport = async (reportId: string, status: 'RESOLVED' | 'DISMISSED') => {
    if (!token) return;
    try {
      await fetch(`/api/admin/reports/${reportId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status, actionTaken: `Marked as ${status} by founder.` })
      });
      await fetchDashboardData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSeedDemoData = async () => {
    if (!token || isSeeding) return;
    setIsSeeding(true);
    try {
      const res = await fetch('/api/admin/demo-data', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        await fetchDashboardData();
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert('Seed failed: ' + err.message);
    } finally {
      setIsSeeding(false);
    }
  };

  const pendingApps = applications.filter((app) => app.status === 'PENDING_VERIFICATION');

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-32 text-white">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-wider">
              Super Admin Console
            </span>
            <span className="text-xs text-[#71717A]">Strict Founder Access</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
            Founder Command Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSeedDemoData}
            disabled={isSeeding}
            className="px-4 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 text-xs font-bold transition-all flex items-center gap-1.5"
            title="Populate test student profiles from PCTE for development testing"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isSeeding ? 'Seeding...' : 'Seed Demo Students'}</span>
          </button>

          <button
            onClick={fetchDashboardData}
            className="p-2 rounded-xl bg-[#191922] hover:bg-[#111118] border border-[#272732] text-[#A1A1AA] hover:text-white transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Analytics KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <div className="p-4 rounded-2xl bg-[#191922] border border-[#272732] shadow-sm">
          <div className="flex items-center justify-between text-[#A1A1AA] mb-1">
            <span className="text-[11px] font-semibold">Pending IDs</span>
            <Clock className="w-4 h-4 text-[#E74763]" />
          </div>
          <div className="text-2xl font-black text-[#E74763]">{analytics?.pendingCount ?? '—'}</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#191922] border border-[#272732] shadow-sm">
          <div className="flex items-center justify-between text-[#A1A1AA] mb-1">
            <span className="text-[11px] font-semibold">Approved</span>
            <CheckCircle className="w-4 h-4 text-[#31C48D]" />
          </div>
          <div className="text-2xl font-black text-[#31C48D]">{analytics?.approvedCount ?? '—'}</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#191922] border border-[#272732] shadow-sm">
          <div className="flex items-center justify-between text-[#A1A1AA] mb-1">
            <span className="text-[11px] font-semibold">Rejected</span>
            <XCircle className="w-4 h-4 text-[#71717A]" />
          </div>
          <div className="text-2xl font-black text-[#A1A1AA]">{analytics?.rejectedCount ?? '—'}</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#191922] border border-[#272732] shadow-sm">
          <div className="flex items-center justify-between text-[#A1A1AA] mb-1">
            <span className="text-[11px] font-semibold">Total Students</span>
            <Users className="w-4 h-4 text-white" />
          </div>
          <div className="text-2xl font-black text-white">{analytics?.totalUsers ?? '—'}</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#191922] border border-[#272732] shadow-sm">
          <div className="flex items-center justify-between text-[#A1A1AA] mb-1">
            <span className="text-[11px] font-semibold">Active Matches</span>
            <Heart className="w-4 h-4 text-pink-500" />
          </div>
          <div className="text-2xl font-black text-white">{analytics?.totalMatches ?? '—'}</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#191922] border border-[#272732] shadow-sm">
          <div className="flex items-center justify-between text-[#A1A1AA] mb-1">
            <span className="text-[11px] font-semibold">Pending Reports</span>
            <Flag className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-400">{analytics?.totalReports ?? '—'}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#272732] mb-6 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('pending')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'pending'
              ? 'border-[#E74763] text-[#E74763]'
              : 'border-transparent text-[#A1A1AA] hover:text-white'
          }`}
        >
          Pending Verifications ({pendingApps.length})
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'all'
              ? 'border-[#E74763] text-[#E74763]'
              : 'border-transparent text-[#A1A1AA] hover:text-white'
          }`}
        >
          All Students ({applications.length})
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'reports'
              ? 'border-[#E74763] text-[#E74763]'
              : 'border-transparent text-[#A1A1AA] hover:text-white'
          }`}
        >
          Safety Reports ({reports.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'audit'
              ? 'border-[#E74763] text-[#E74763]'
              : 'border-transparent text-[#A1A1AA] hover:text-white'
          }`}
        >
          Audit Log ({auditLogs.length})
        </button>
      </div>

      {/* Tab 1: Pending Verifications */}
      {activeTab === 'pending' && (
        <div className="bg-[#191922] border border-[#272732] rounded-3xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-[#272732] flex items-center justify-between">
            <h3 className="font-bold text-sm text-white">Pending ID Approvals</h3>
            <span className="text-xs text-[#71717A]">{pendingApps.length} applicants waiting</span>
          </div>

          {pendingApps.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#A1A1AA]">
              No pending applications in queue. All physical ID cards have been reviewed!
            </div>
          ) : (
            <div className="divide-y divide-[#272732]/60">
              {pendingApps.map((app) => (
                <div key={app.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#111118]/50 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{app.firstName}</span>
                      <span className="text-[10px] text-[#A1A1AA] bg-[#111118] px-2 py-0.5 rounded border border-[#272732]">
                        {app.course} ({app.academicYear})
                      </span>
                    </div>
                    <span className="text-xs text-[#71717A] block mt-0.5">{app.user.email}</span>
                    <span className="text-[10px] text-[#71717A]">
                      Submitted: {new Date(app.createdAt).toLocaleString()} • DOB: {app.dateOfBirth}
                    </span>
                  </div>

                  <button
                    onClick={() => handleOpenReview(app)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#E74763] to-[#A72E48] hover:brightness-110 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 self-start sm:self-auto"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inspect ID Card</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: All Students */}
      {activeTab === 'all' && (
        <div className="bg-[#191922] border border-[#272732] rounded-3xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-[#272732] flex items-center justify-between">
            <h3 className="font-bold text-sm text-white">All Registered Accounts</h3>
            <span className="text-xs text-[#71717A]">{applications.length} students</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#111118] text-[#71717A] uppercase text-[10px] font-bold border-b border-[#272732]">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#272732]/40">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-[#111118]/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-white block">{app.firstName}</span>
                      <span className="text-[#71717A] text-[11px]">{app.user.email}</span>
                    </td>
                    <td className="py-3.5 px-4 text-[#A1A1AA]">
                      {app.course} ({app.academicYear})
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        app.status === 'APPROVED'
                          ? 'bg-[#31C48D]/15 text-[#31C48D]'
                          : app.status === 'REJECTED'
                          ? 'bg-red-500/15 text-red-400'
                          : app.status === 'SUSPENDED'
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-[#E74763]/15 text-[#E74763]'
                      }`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenReview(app)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#111118] hover:bg-[#272732] text-[#A1A1AA] hover:text-white transition-colors"
                        title="Inspect ID"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleSuspension(app.userId, app.user.verificationStatus)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          app.user.verificationStatus === 'SUSPENDED'
                            ? 'bg-[#31C48D]/20 text-[#31C48D] hover:bg-[#31C48D]/30'
                            : 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
                        }`}
                      >
                        {app.user.verificationStatus === 'SUSPENDED' ? 'Reinstate' : 'Suspend'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Reports */}
      {activeTab === 'reports' && (
        <div className="bg-[#191922] border border-[#272732] rounded-3xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-[#272732] flex items-center justify-between">
            <h3 className="font-bold text-sm text-white">Student Safety Reports</h3>
            <span className="text-xs text-[#71717A]">{reports.length} reports</span>
          </div>

          {reports.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#A1A1AA]">
              No safety reports submitted. Campus community standards are clear!
            </div>
          ) : (
            <div className="divide-y divide-[#272732]/50">
              {reports.map((rep) => (
                <div key={rep.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-bold">
                      {rep.category}
                    </span>
                    <span className="text-[10px] text-[#71717A]">
                      {new Date(rep.created_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="text-xs text-[#A1A1AA]">
                    <span className="text-white font-semibold">{rep.reporter_email}</span> reported{' '}
                    <span className="text-white font-semibold">{rep.reported_name} ({rep.reported_email})</span>:
                  </div>

                  <p className="text-xs text-white p-2.5 rounded-xl bg-[#111118] border border-[#272732]">
                    {rep.details}
                  </p>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-[#71717A]">Status: {rep.status}</span>
                    {rep.status === 'PENDING' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleResolveReport(rep.id, 'DISMISSED')}
                          className="px-3 py-1 rounded-lg bg-[#111118] hover:bg-[#272732] text-xs text-[#A1A1AA]"
                        >
                          Dismiss
                        </button>
                        <button
                          onClick={() => handleResolveReport(rep.id, 'RESOLVED')}
                          className="px-3 py-1 rounded-lg bg-[#E74763] hover:bg-[#F05874] text-xs text-white font-bold"
                        >
                          Resolve
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-[#191922] border border-[#272732] rounded-3xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-[#272732] flex items-center justify-between">
            <h3 className="font-bold text-sm text-white">Founder Action Audit Logs</h3>
            <span className="text-xs text-[#71717A]">Last 100 recorded operations</span>
          </div>

          <div className="divide-y divide-[#272732]/40 max-h-[500px] overflow-y-auto">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3.5 text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold text-white mr-2">{log.action}</span>
                  <span className="text-[#71717A] text-[11px]">{new Date(log.created_at).toLocaleString()}</span>
                  {log.details && (
                    <p className="text-[10px] text-[#A1A1AA] mt-0.5 font-mono">
                      {JSON.stringify(log.details)}
                    </p>
                  )}
                </div>
                <span className="text-[10px] text-[#71717A] shrink-0">{log.actor_email}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ID Inspection & Approval Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#191922] border border-[#272732] rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#272732] flex items-center justify-between">
              <div>
                <h3 className="font-black text-base text-white">Physical PCTE ID Review</h3>
                <p className="text-xs text-[#A1A1AA]">Confidential founder review stream</p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-white hover:bg-[#111118]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Applicant Summary */}
            <div className="p-4 bg-[#111118] border-b border-[#272732] grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[#71717A] block text-[10px] uppercase font-bold">STUDENT NAME</span>
                <span className="font-bold text-white">{selectedApp.firstName}</span>
              </div>
              <div>
                <span className="text-[#71717A] block text-[10px] uppercase font-bold">EMAIL</span>
                <span className="text-white truncate block">{selectedApp.user.email}</span>
              </div>
              <div>
                <span className="text-[#71717A] block text-[10px] uppercase font-bold">COURSE & YEAR</span>
                <span className="text-white">{selectedApp.course} ({selectedApp.academicYear})</span>
              </div>
              <div>
                <span className="text-[#71717A] block text-[10px] uppercase font-bold">DATE OF BIRTH</span>
                <span className="text-white">{selectedApp.dateOfBirth}</span>
              </div>
            </div>

            {/* ID Photo Viewer */}
            <div className="p-4 sm:p-5 flex-1 overflow-y-auto bg-[#09090D]">
              <span className="text-[10px] text-[#71717A] block mb-2 uppercase font-bold tracking-wider">
                Physical Student ID Card Photograph
              </span>

              <div className="rounded-2xl border border-[#272732] overflow-hidden bg-[#111118] flex items-center justify-center min-h-[220px]">
                {isImageLoading ? (
                  <div className="flex flex-col items-center gap-2 py-12 text-xs text-[#A1A1AA]">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#E74763]" />
                    <span>Streaming private ID from disk...</span>
                  </div>
                ) : modalImageSrc ? (
                  <img
                    src={modalImageSrc}
                    alt="Physical ID Card"
                    className="w-full max-h-[380px] object-contain"
                  />
                ) : (
                  <div className="p-8 text-center text-xs text-[#71717A]">
                    Demo verified account or ID card not found on disk.
                  </div>
                )}
              </div>

              {/* Rejection Reason Input */}
              {showRejectBox && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl space-y-2">
                  <label className="block text-xs font-bold text-red-400">
                    Reason for Rejection (Displayed to student)
                  </label>
                  <input
                    type="text"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g. Photo blurry; name not legible; expired ID"
                    className="w-full px-3 py-2 bg-[#111118] border border-[#272732] rounded-lg text-xs text-white focus:outline-none focus:border-red-400"
                  />
                </div>
              )}
            </div>

            {/* Decision Controls */}
            <div className="p-4 border-t border-[#272732] bg-[#111118] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 text-xs text-[#A1A1AA] hover:text-white"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                {!showRejectBox ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowRejectBox(true)}
                      disabled={actionInProgress}
                      className="px-4 py-2.5 rounded-full bg-[#191922] hover:bg-[#272732] border border-red-500/30 text-red-400 text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReviewAction('APPROVE')}
                      disabled={actionInProgress}
                      className="px-5 py-2.5 rounded-full bg-[#31C48D] hover:bg-emerald-600 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve Student</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleReviewAction('REJECT')}
                    disabled={actionInProgress}
                    className="px-5 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Confirm Rejection</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
