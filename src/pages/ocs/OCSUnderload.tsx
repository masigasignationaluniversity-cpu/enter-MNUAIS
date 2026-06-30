import { useState, useMemo, useEffect } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { StatusBanner } from '@/components/shared/StatusBanner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { TermSelect } from '@/components/shared/TermSelect';
import {
  CheckCircle2, XCircle, Clock, FileText, Search,
  AlertTriangle, Users, RefreshCw, Printer,
} from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import type { UnderloadApplication, UnderloadApplicationStatus } from '@/lib/types';

type FilterStatus = 'all' | 'pending' | 'approved' | 'denied';

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '—';

export default function OCSUnderload() {
  const { state, processUnderloadApplication, loadUnderloadApplications } = useApp();
  const me = state.currentUser;

  const activeTerm = state.terms.find(t => t.isActive);
  const [selectedTermId, setSelectedTermId] = useState(activeTerm?.id ?? state.terms[0]?.id ?? '');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [denyResponse, setDenyResponse] = useState('');
  const [denyingId, setDenyingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadUnderloadApplications(); }, [loadUnderloadApplications]);

  const selectedTerm = state.terms.find(t => t.id === selectedTermId);
  const isMidTerm = selectedTerm?.semester === 'Mid-Term';
  const underloadUntil = selectedTerm?.underloadUntil;
  const underloadFrom = selectedTerm?.underloadFrom;
  const underloadApprovalUntil = selectedTerm?.underloadApprovalUntil;
  const now = new Date();
  const isWindowOpen = underloadFrom && underloadUntil
    ? now >= new Date(underloadFrom) && now <= new Date(underloadUntil)
    : false;
  const isWindowPast = underloadUntil ? now > new Date(underloadUntil) : false;
  const isApprovalPast = underloadApprovalUntil ? now > new Date(underloadApprovalUntil) : false;

  const ocsCollegeId = useMemo(() => {
    if (!me) return '';
    return state.colleges.find(c =>
      c.name === me.college || c.id === me.college || c.abbreviation === me.college
    )?.id ?? me.college ?? '';
  }, [state.colleges, me]);

  const myStudents = useMemo(() => {
    return new Set(
      state.users.filter(u => {
        if (u.role !== 'student') return false;
        if (!ocsCollegeId) return true; // no college filter → show all
        return (
          u.college === ocsCollegeId ||
          state.colleges.find(c => c.id === ocsCollegeId)?.name === u.college
        );
      }).map(u => u.id)
    );
  }, [state.users, state.colleges, ocsCollegeId]);

  const relevantTermIds = useMemo(() => new Set(
    (state.underloadApplications ?? [])
      .filter(a => myStudents.has(a.studentId))
      .map(a => a.termId)
  ), [state.underloadApplications, myStudents]);
  const relevantTerms = state.terms.filter(t => relevantTermIds.has(t.id) || !!t.isActive);

  const allApplications = useMemo(() => {
    const apps = [...(state.underloadApplications ?? [])]
      .filter(a => a.termId === selectedTermId && myStudents.has(a.studentId));
    apps.sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime();
    });
    return apps;
  }, [state.underloadApplications, selectedTermId, myStudents]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allApplications.filter(app => {
      if (filterStatus !== 'all' && app.status !== filterStatus) return false;
      if (!q) return true;
      const student = state.users.find(u => u.id === app.studentId);
      const name = (student?.name ?? '').toLowerCase();
      const num = (student?.studentNumber ?? '').toLowerCase();
      const program = (student?.program ?? '').toLowerCase();
      return name.includes(q) || num.includes(q) || program.includes(q);
    });
  }, [allApplications, filterStatus, search, state.users]);

  const handleApprove = async (appId: string) => {
    setProcessingId(appId);
    try {
      await processUnderloadApplication(appId, 'approved', me.id);
      toast.success('Underload application approved.');
    } catch {
      toast.error('Failed to approve. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeny = async (appId: string) => {
    setDenyingId(appId);
    setDenyResponse('');
  };

  const handleConfirmDeny = async () => {
    if (!denyingId) return;
    setProcessingId(denyingId);
    try {
      await processUnderloadApplication(denyingId, 'denied', me.id, denyResponse || undefined);
      toast.success('Application denied.');
      setDenyingId(null);
      setDenyResponse('');
    } catch {
      toast.error('Failed to deny. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUnderloadApplications();
    setRefreshing(false);
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(loadUnderloadApplications, 30000);
    return () => clearInterval(interval);
  }, [loadUnderloadApplications]);

  const pendingCount = allApplications.filter(a => a.status === 'pending').length;

  const StatusBadge = ({ status }: { status: UnderloadApplicationStatus }) => {
    if (status === 'approved') return (
      <Badge className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 border-emerald-300 gap-1">
        <CheckCircle2 className="w-3 h-3" />Approved
      </Badge>
    );
    if (status === 'denied') return (
      <Badge className="text-[10px] px-2 py-0.5 bg-red-100 text-red-700 border-red-300 gap-1">
        <XCircle className="w-3 h-3" />Denied
      </Badge>
    );
    return (
      <Badge className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 border-amber-300 gap-1">
        <Clock className="w-3 h-3" />Pending
      </Badge>
    );
  };

  if (!me) return null;

  const statConfigs = [
    {
      key: 'pending' as const,
      label: 'Pending',
      icon: <Clock className="w-5 h-5" />,
      style: { background: 'linear-gradient(135deg, hsl(38 95% 50%), hsl(25 95% 50%))' },
    },
    {
      key: 'approved' as const,
      label: 'Approved',
      icon: <CheckCircle2 className="w-5 h-5" />,
      style: { background: 'var(--gradient-header)' },
    },
    {
      key: 'denied' as const,
      label: 'Denied',
      icon: <XCircle className="w-5 h-5" />,
      style: { background: 'linear-gradient(135deg, hsl(0 70% 55%), hsl(0 70% 45%))' },
    },
  ];

  const printUnderloadPDF = (app: UnderloadApplication) => {
    const student = state.users.find(u => u.id === app.studentId);
    if (!student) return;
    const term = state.terms.find(t => t.id === app.termId);
    const processedByUser = app.processedBy ? state.users.find(u => u.id === app.processedBy) : null;
    const inst = state.portalSettings?.institutionName || state.portalSettings?.portalName || 'University';
    const isApproved = app.status === 'approved';
    const dateNow = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
    const processedDate = app.processedAt ? new Date(app.processedAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
    const submittedDate = new Date(app.requestedAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
    const enrolledUnits = (state.enrollments ?? [])
      .filter(e => e.studentId === app.studentId && e.termId === app.termId)
      .reduce((sum, e) => {
        const sec = state.sections.find(s => s.id === e.sectionId);
        const course = state.courses.find(c => c.id === sec?.courseId);
        return sum + (course?.units ?? 0);
      }, 0);

    const html = `<!DOCTYPE html><html><head>
      <title>${isApproved ? 'Underload Permit' : 'Underload Application — Denied'}</title>
      <style>
        @page { size: A4; margin: 20mm 25mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #222; }
        .header { border-bottom: 3px solid #7A1A2E; padding-bottom: 14px; margin-bottom: 20px; }
        .institution { font-size: 15pt; font-weight: bold; color: #7A1A2E; text-transform: uppercase; }
        .office { font-size: 10pt; color: #555; margin-top: 3px; }
        .form-title { text-align: center; margin: 18px 0 6px; }
        .form-title h1 { font-size: 16pt; font-weight: bold; text-transform: uppercase; color: ${isApproved ? '#065f46' : '#991b1b'}; letter-spacing: 1px; }
        .ref { text-align: center; font-size: 9pt; color: #777; margin-bottom: 16px; }
        .section-label { font-size: 9pt; font-weight: bold; text-transform: uppercase; color: #7A1A2E; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; margin: 0 0 10px; letter-spacing: 0.5px; }
        .info-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        .info-table td { padding: 5px 8px; font-size: 10.5pt; }
        .info-table td:first-child { font-weight: bold; color: #444; width: 38%; }
        .reason-box { background: #f8f8f8; border: 1px solid #ddd; border-radius: 4px; padding: 10px 12px; font-size: 10.5pt; line-height: 1.6; margin-bottom: 16px; white-space: pre-wrap; }
        .decision-box { border: 2px solid ${isApproved ? '#059669' : '#dc2626'}; border-radius: 6px; padding: 14px 16px; margin-bottom: 22px; background: ${isApproved ? '#f0fdf4' : '#fff5f5'}; }
        .decision-title { font-size: 13pt; font-weight: bold; color: ${isApproved ? '#065f46' : '#991b1b'}; margin-bottom: 8px; }
        .decision-meta { font-size: 10pt; color: #555; line-height: 1.7; }
        .sig-row { display: flex; justify-content: space-between; margin-top: 40px; }
        .sig-block { width: 44%; text-align: center; }
        .sig-line { border-top: 1px solid #333; padding-top: 6px; margin-top: 50px; }
        .sig-name { font-weight: bold; font-size: 10pt; }
        .sig-title { font-size: 9pt; color: #666; }
        .footer { text-align: center; font-size: 8.5pt; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style></head><body>
      <div class="header">
        <div class="institution">${inst}</div>
        <div class="office">Office of the College Secretary (OCS) — Academic Information System</div>
      </div>
      <div class="form-title"><h1>${isApproved ? 'Underload Permit' : 'Underload Application — Denied'}</h1></div>
      <div class="ref">Reference No.: ${app.id.slice(0, 8).toUpperCase()} &nbsp;|&nbsp; Issued: ${dateNow}</div>
      <p class="section-label">Student Information</p>
      <table class="info-table">
        <tr><td>Student Name:</td><td>${student.name}</td></tr>
        <tr><td>Student Number:</td><td>${student.studentNumber ?? '—'}</td></tr>
        <tr><td>Program:</td><td>${student.program ?? '—'}</td></tr>
        <tr><td>Year Level:</td><td>${student.yearLevel ? student.yearLevel + (student.yearLevel === 1 ? 'st' : student.yearLevel === 2 ? 'nd' : student.yearLevel === 3 ? 'rd' : 'th') + ' Year' : '—'}</td></tr>
        <tr><td>College:</td><td>${student.college ?? '—'}</td></tr>
        <tr><td>Academic Term:</td><td>${term ? term.name + ' — ' + term.academicYear : '—'}</td></tr>
        <tr><td>Enrolled Units:</td><td>${enrolledUnits} units</td></tr>
      </table>
      <p class="section-label">Student's Reason</p>
      <div class="reason-box">${app.reason}</div>
      <p class="section-label">OCS Decision</p>
      <div class="decision-box">
        <div class="decision-title">${isApproved ? 'APPROVED — Underload Permit Granted' : 'DENIED — Application Not Approved'}</div>
        <div class="decision-meta">
          Date Submitted: ${submittedDate}<br/>
          Date Processed: ${processedDate}<br/>
          Processed By: ${processedByUser?.name ?? 'OCS Staff'}
          ${app.response ? '<br/><br/><em>OCS Note: &ldquo;' + app.response + '&rdquo;</em>' : ''}
        </div>
      </div>
      <div class="sig-row">
        <div class="sig-block">
          <div class="sig-line"></div>
          <div class="sig-name">${student.name}</div>
          <div class="sig-title">Student's Signature over Printed Name</div>
        </div>
        <div class="sig-block">
          <div class="sig-line"></div>
          <div class="sig-name">${processedByUser?.name ?? 'College Secretary'}</div>
          <div class="sig-title">College Secretary / Authorized OCS Representative</div>
        </div>
      </div>
      <div class="footer">This is a computer-generated document from the ${inst} Academic Information System. For verification, contact the Office of the College Secretary.</div>
    </body></html>`;

    const win = window.open('', '_blank');
    if (!win) { toast.error('Popup blocked — allow popups and try again.'); return; }
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 600);
  };

  return (
    <PortalLayout>
      <div className="space-y-5">

        {/* Controls bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <TermSelect terms={relevantTerms} value={selectedTermId} onChange={setSelectedTermId} />

          </div>
        </div>

        {/* Mid-Term: underload not applicable */}
        {isMidTerm && (
          <StatusBanner
            type="warning"
            title="Underload Permits Not Applicable for Mid-Term"
            description="Underload applications are only available for 1st and 2nd semester terms. No underload permits are issued during Mid-Term."
          />
        )}

        {/* Window status banners */}
        {!isMidTerm && isWindowOpen && (
          <StatusBanner type="open" title="Underload Window is Open"
            description={<>Students may submit applications until <strong>{fmtDate(underloadUntil)}</strong>.</>} />
        )}
        {!isMidTerm && !isWindowOpen && isWindowPast && (
          <StatusBanner type="error" title="Underload Window Closed"
            description={`Was open from ${fmtDate(underloadFrom)} to ${fmtDate(underloadUntil)}.`} />
        )}
        {!isMidTerm && !isWindowOpen && !isWindowPast && (
          <StatusBanner
            type="warning"
            title={!underloadFrom && !underloadUntil ? 'Underload Window Not Yet Scheduled' : 'Underload Window Not Yet Open'}
            description={!underloadFrom && !underloadUntil
              ? 'No underload window has been set for this term.'
              : <><strong>{fmtDate(underloadFrom)}</strong> to <strong>{fmtDate(underloadUntil)}</strong>.</>}
          />
        )}

        {/* OCS Approval Deadline banner */}
        {!isMidTerm && underloadApprovalUntil && (
          isApprovalPast
            ? <StatusBanner type="error" title="OCS Approval Deadline Passed"
                description={<>The approval deadline was <strong>{fmtDate(underloadApprovalUntil)}</strong>. Pending applications can no longer be approved or denied.</>} />
            : <StatusBanner type="warning" title="OCS Approval Deadline"
                description={<>Approve or deny all pending applications before <strong>{fmtDate(underloadApprovalUntil)}</strong>.</>} />
        )}

        {/* Stat cards */}
        {!isMidTerm && <div className="grid grid-cols-3 gap-4">
          {statConfigs.map(({ key, label, icon, style }) => (
            <div key={key} className="dash-stat portal-panel">
              <div className="dash-stat-icon" style={style}>{icon}</div>
              <p className="dash-stat-value">{allApplications.filter(a => a.status === key).length}</p>
              <p className="dash-stat-label">{label}</p>
            </div>
          ))}
        </div>}

        {/* Pending alert */}
        {!isMidTerm && pendingCount > 0 && (
          <StatusBanner
            type="warning"
            title={`${pendingCount} application${pendingCount !== 1 ? 's' : ''} awaiting review`}
            description="Review and process all pending underload applications below."
          />
        )}

        {/* Filters panel */}
        {!isMidTerm && <div className="portal-panel">
          <div className="portal-panel-header">
            <Search className="w-4 h-4 text-white/80" />
            <span>Filter Applications</span>
          </div>
          <div className="p-4 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9 text-sm" placeholder="Search by name, student number, or program..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <SearchableSelect
              value={filterStatus}
              onValueChange={v => setFilterStatus(v as FilterStatus)}
              triggerClassName="w-44 text-sm"
              placeholder="Filter status..."
              options={[
                { value: 'all', label: `All (${allApplications.length})` },
                { value: 'pending', label: `Pending (${allApplications.filter(a => a.status === 'pending').length})` },
                { value: 'approved', label: `Approved (${allApplications.filter(a => a.status === 'approved').length})` },
                { value: 'denied', label: `Denied (${allApplications.filter(a => a.status === 'denied').length})` },
              ]}
            />
          </div>
        </div>}

        {/* Applications list */}
        {!isMidTerm && (filtered.length === 0 ? (
          <div className="portal-panel">
            <div className="py-16 text-center text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-25" />
              <p className="font-semibold text-sm">No applications found</p>
              <p className="text-xs mt-1 opacity-70">
                {filterStatus === 'pending' ? 'No pending underload applications for this term.' : 'Try adjusting your search or filter.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(app => {
              const student = state.users.find(u => u.id === app.studentId);
              const isDenying = denyingId === app.id;
              const isProcessing = processingId === app.id;
              const enrolledUnits = state.enrollments.filter(e =>
                e.studentId === app.studentId && e.termId === app.termId
              ).reduce((sum, e) => {
                const sec = state.sections.find(s => s.id === e.sectionId);
                const course = state.courses.find(c => c.id === sec?.courseId);
                return sum + (course?.units ?? 0) + (course?.labUnits ?? 0);
              }, 0);

              return (
                <div key={app.id} className="portal-panel">
                  {/* Card header */}
                  <div className="portal-panel-header">
                    <div className="flex items-center gap-2 flex-1 flex-wrap">
                      <Users className="w-4 h-4 text-white/70 flex-shrink-0" />
                      <span className="font-bold text-white">{student?.name ?? 'Unknown Student'}</span>
                      <span className="text-white/55 text-xs font-normal">{student?.studentNumber ?? '—'}</span>
                    </div>
                    <StatusBadge status={app.status} />
                  </div>

                  {/* Card body */}
                  <div className="p-4 space-y-3">
                    {/* Meta info */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{student?.program ?? '—'}</span>
                      <span className="font-semibold text-foreground">{enrolledUnits} units enlisted</span>
                      <span>Submitted: {fmtDate(app.requestedAt)}</span>
                    </div>

                    {/* Reason */}
                    <div className="banner banner-notice">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm bg-slate-100 text-slate-500">
                        <FileText size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="banner-title">Student's Reason</span>
                        <span className="banner-desc">{app.reason}</span>
                      </div>
                    </div>

                    {/* Decision */}
                    {app.status !== 'pending' && (
                      <div className={`banner ${app.status === 'approved' ? 'banner-success' : 'banner-error'}`}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${app.status === 'approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                          {app.status === 'approved' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="banner-title">{app.status === 'approved' ? 'Approved by OCS' : 'Denied by OCS'}</span>
                          {app.processedAt && <span className="banner-desc">Processed: {fmtDate(app.processedAt)}</span>}
                          {app.response && <span className="banner-desc italic">"{app.response}"</span>}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 flex-shrink-0"
                          onClick={() => printUnderloadPDF(app)}
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Print
                        </Button>
                      </div>
                    )}

                    {/* Approve / Deny actions */}
                    {app.status === 'pending' && !isDenying && (
                      isApprovalPast ? (
                        <p className="text-xs text-muted-foreground italic pt-1">OCS approval deadline has passed — no further action allowed.</p>
                      ) : (
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                          disabled={isProcessing}
                          onClick={() => handleApprove(app.id)}
                        >
                          {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-red-300 text-red-600 hover:bg-red-50 gap-1.5"
                          disabled={isProcessing}
                          onClick={() => handleDeny(app.id)}
                        >
                          <XCircle className="w-3.5 h-3.5" /> Deny
                        </Button>
                      </div>
                      )
                    )}

                    {/* Deny confirmation form */}
                    {app.status === 'pending' && isDenying && !isApprovalPast && (
                      <div className="banner banner-error flex-col items-stretch gap-2 pt-1">
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={15} className="flex-shrink-0" />
                          <span className="banner-title">Confirm Denial</span>
                        </div>
                        <Textarea
                          className="text-xs bg-white border-red-200 focus:ring-red-300"
                          rows={3}
                          placeholder="Reason for denial (optional — shown to student)..."
                          value={denyResponse}
                          onChange={e => setDenyResponse(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white gap-1.5"
                            disabled={isProcessing}
                            onClick={handleConfirmDeny}
                          >
                            {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                            Confirm Deny
                          </Button>
                          <Button size="sm" variant="ghost" className="flex-1" onClick={() => setDenyingId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </PortalLayout>
  );
}
