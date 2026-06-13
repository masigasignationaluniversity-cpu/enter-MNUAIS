import { useState, useMemo } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { StatusBanner } from '@/components/shared/StatusBanner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TermSelect } from '@/components/shared/TermSelect';
import {
  CheckCircle2, XCircle, Clock, FileText, Search,
  AlertTriangle, Users, RefreshCw,
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

  const selectedTerm = state.terms.find(t => t.id === selectedTermId);
  const isMidTerm = selectedTerm?.semester === 'Mid-Term';
  const underloadUntil = selectedTerm?.underloadUntil;
  const underloadFrom = selectedTerm?.underloadFrom;
  const now = new Date();
  const isWindowOpen = underloadFrom && underloadUntil
    ? now >= new Date(underloadFrom) && now <= new Date(underloadUntil)
    : false;
  const isWindowPast = underloadUntil ? now > new Date(underloadUntil) : false;

  const ocsCollegeId = useMemo(() => {
    if (!me) return '';
    return state.colleges.find(c =>
      c.name === me.college || c.id === me.college || c.abbreviation === me.college
    )?.id ?? me.college ?? '';
  }, [state.colleges, me]);

  const myStudents = useMemo(() => {
    return new Set(
      state.users.filter(u => u.role === 'student' && (
        u.college === ocsCollegeId ||
        state.colleges.find(c => c.id === ocsCollegeId)?.name === u.college
      )).map(u => u.id)
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
    toast.success('Applications refreshed.');
  };

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

  return (
    <PortalLayout>
      <div className="space-y-5">

        {/* Controls bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <TermSelect terms={relevantTerms} value={selectedTermId} onChange={setSelectedTermId} />
            <Button size="sm" variant="outline" onClick={handleRefresh} disabled={refreshing} className="gap-1.5">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
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
            <Select value={filterStatus} onValueChange={v => setFilterStatus(v as FilterStatus)}>
              <SelectTrigger className="w-44 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ({allApplications.length})</SelectItem>
                <SelectItem value="pending">Pending ({allApplications.filter(a => a.status === 'pending').length})</SelectItem>
                <SelectItem value="approved">Approved ({allApplications.filter(a => a.status === 'approved').length})</SelectItem>
                <SelectItem value="denied">Denied ({allApplications.filter(a => a.status === 'denied').length})</SelectItem>
              </SelectContent>
            </Select>
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
                      </div>
                    )}

                    {/* Approve / Deny actions */}
                    {app.status === 'pending' && !isDenying && (
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
                    )}

                    {/* Deny confirmation form */}
                    {app.status === 'pending' && isDenying && (
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
