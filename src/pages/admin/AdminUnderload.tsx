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
  AlertTriangle, Users, RefreshCw, Building2, ChevronDown, ChevronRight,
} from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import type { UnderloadApplicationStatus } from '@/lib/types';

type FilterStatus = 'all' | 'pending' | 'approved' | 'denied';

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '—';

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

export default function AdminUnderload() {
  const { state, processUnderloadApplication, loadUnderloadApplications } = useApp();
  const me = state.currentUser;

  const activeTerm = state.terms.find(t => t.isActive);
  const [selectedTermId, setSelectedTermId] = useState(activeTerm?.id ?? state.terms[0]?.id ?? '');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('pending');
  const [filterCollege, setFilterCollege] = useState<string>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [denyResponse, setDenyResponse] = useState('');
  const [denyingId, setDenyingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [collapsedColleges, setCollapsedColleges] = useState<Set<string>>(new Set());

  const selectedTerm = state.terms.find(t => t.id === selectedTermId);
  const underloadUntil = selectedTerm?.underloadUntil;
  const underloadFrom = selectedTerm?.underloadFrom;
  const now = new Date();
  const isWindowOpen = underloadFrom && underloadUntil
    ? now >= new Date(underloadFrom) && now <= new Date(underloadUntil)
    : false;
  const isWindowPast = underloadUntil ? now > new Date(underloadUntil) : false;

  // All applications for the selected term
  const allApplications = useMemo(() => {
    const apps = [...(state.underloadApplications ?? [])].filter(a => a.termId === selectedTermId);
    apps.sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return new Date(b.requestedAt ?? b.appliedAt ?? '').getTime() - new Date(a.requestedAt ?? a.appliedAt ?? '').getTime();
    });
    return apps;
  }, [state.underloadApplications, selectedTermId]);

  // Get college name for a student
  const getStudentCollege = (studentId: string): string => {
    const student = state.users.find(u => u.id === studentId);
    if (!student?.college) return 'Unassigned';
    const college = state.colleges.find(c => c.id === student.college || c.name === student.college || c.abbreviation === student.college);
    return college?.name ?? student.college ?? 'Unassigned';
  };

  // Available colleges from applications
  const collegesInTerm = useMemo(() => {
    const names = new Set(allApplications.map(a => getStudentCollege(a.studentId)));
    return Array.from(names).sort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allApplications, state.users, state.colleges]);

  // Filtered list
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allApplications.filter(app => {
      if (filterStatus !== 'all' && app.status !== filterStatus) return false;
      if (filterCollege !== 'all' && getStudentCollege(app.studentId) !== filterCollege) return false;
      if (!q) return true;
      const student = state.users.find(u => u.id === app.studentId);
      const name = (student?.name ?? '').toLowerCase();
      const num = (student?.studentNumber ?? '').toLowerCase();
      const program = (student?.program ?? '').toLowerCase();
      const college = getStudentCollege(app.studentId).toLowerCase();
      return name.includes(q) || num.includes(q) || program.includes(q) || college.includes(q);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allApplications, filterStatus, filterCollege, search, state.users, state.colleges]);

  // Group by college
  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const app of filtered) {
      const col = getStudentCollege(app.studentId);
      if (!map.has(col)) map.set(col, []);
      map.get(col)!.push(app);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, state.users, state.colleges]);

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

  const handleDeny = (appId: string) => {
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

  const toggleCollege = (name: string) => {
    setCollapsedColleges(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const pendingCount = allApplications.filter(a => a.status === 'pending').length;
  const approvedCount = allApplications.filter(a => a.status === 'approved').length;
  const deniedCount = allApplications.filter(a => a.status === 'denied').length;

  if (!me) return null;

  return (
    <PortalLayout title="Underload Management">
      <div className="space-y-5">

        {/* Controls bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <TermSelect terms={state.terms} value={selectedTermId} onChange={setSelectedTermId} />
            <Button size="sm" variant="outline" onClick={handleRefresh} disabled={refreshing} className="gap-1.5">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Window status */}
        {isWindowOpen && (
          <StatusBanner type="open" title="Underload Window is Open"
            description={<>Students may submit applications until <strong>{fmtDate(underloadUntil)}</strong>.</>} />
        )}
        {!isWindowOpen && isWindowPast && (
          <StatusBanner type="error" title="Underload Window Closed"
            description={`Was open from ${fmtDate(underloadFrom)} to ${fmtDate(underloadUntil)}.`} />
        )}
        {!isWindowOpen && !isWindowPast && (
          <StatusBanner
            type="warning"
            title={!underloadFrom && !underloadUntil ? 'Underload Window Not Yet Scheduled' : 'Underload Window Not Yet Open'}
            description={!underloadFrom && !underloadUntil
              ? 'No underload window has been configured for this term. Go to Term Control to set the window.'
              : <><strong>{fmtDate(underloadFrom)}</strong> to <strong>{fmtDate(underloadUntil)}</strong>.</>}
          />
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="dash-stat portal-panel">
            <div className="dash-stat-icon" style={{ background: 'var(--gradient-header)' }}><Users className="w-5 h-5" /></div>
            <p className="dash-stat-value">{allApplications.length}</p>
            <p className="dash-stat-label">Total Applications</p>
          </div>
          <div className="dash-stat portal-panel cursor-pointer" onClick={() => setFilterStatus('pending')}>
            <div className="dash-stat-icon" style={{ background: 'linear-gradient(135deg, hsl(38 95% 50%), hsl(25 95% 50%))' }}><Clock className="w-5 h-5" /></div>
            <p className="dash-stat-value">{pendingCount}</p>
            <p className="dash-stat-label">Pending</p>
          </div>
          <div className="dash-stat portal-panel cursor-pointer" onClick={() => setFilterStatus('approved')}>
            <div className="dash-stat-icon" style={{ background: 'linear-gradient(135deg, hsl(145 60% 40%), hsl(160 60% 35%))' }}><CheckCircle2 className="w-5 h-5" /></div>
            <p className="dash-stat-value">{approvedCount}</p>
            <p className="dash-stat-label">Approved</p>
          </div>
          <div className="dash-stat portal-panel cursor-pointer" onClick={() => setFilterStatus('denied')}>
            <div className="dash-stat-icon" style={{ background: 'linear-gradient(135deg, hsl(0 70% 55%), hsl(0 70% 45%))' }}><XCircle className="w-5 h-5" /></div>
            <p className="dash-stat-value">{deniedCount}</p>
            <p className="dash-stat-label">Denied</p>
          </div>
        </div>

        {pendingCount > 0 && (
          <StatusBanner
            type="warning"
            title={`${pendingCount} application${pendingCount !== 1 ? 's' : ''} awaiting review`}
            description="Review and process all pending underload applications below."
          />
        )}

        {/* Per-college breakdown strip */}
        {collegesInTerm.length > 1 && (
          <div className="portal-panel">
            <div className="portal-panel-header">
              <Building2 className="w-4 h-4" />
              <span>Per-College Breakdown &nbsp;·&nbsp; {selectedTerm?.name ?? '—'}</span>
            </div>
            <div className="p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {collegesInTerm.map(col => {
                const colApps = allApplications.filter(a => getStudentCollege(a.studentId) === col);
                const colPending = colApps.filter(a => a.status === 'pending').length;
                return (
                  <button
                    key={col}
                    onClick={() => setFilterCollege(prev => prev === col ? 'all' : col)}
                    className={`text-left rounded-lg border px-3 py-2 transition-all ${filterCollege === col ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-border hover:border-primary/40 hover:bg-muted/50'}`}
                  >
                    <p className="text-xs font-bold text-foreground truncate">{col}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-xs text-muted-foreground">{colApps.length} total</span>
                      {colPending > 0 && (
                        <Badge className="text-[9px] px-1.5 py-0 bg-amber-100 text-amber-700 border-amber-300">{colPending} pending</Badge>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Filter panel */}
        <div className="portal-panel">
          <div className="portal-panel-header">
            <Search className="w-4 h-4 text-white/80" />
            <span>Filter Applications</span>
            {filterCollege !== 'all' && (
              <Badge className="bg-white/20 border-0 text-white text-xs ml-auto">{filterCollege}</Badge>
            )}
          </div>
          <div className="p-4 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9 text-sm" placeholder="Search by name, student number, program, or college..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={filterStatus} onValueChange={v => setFilterStatus(v as FilterStatus)}>
              <SelectTrigger className="w-44 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ({allApplications.length})</SelectItem>
                <SelectItem value="pending">Pending ({pendingCount})</SelectItem>
                <SelectItem value="approved">Approved ({approvedCount})</SelectItem>
                <SelectItem value="denied">Denied ({deniedCount})</SelectItem>
              </SelectContent>
            </Select>
            {filterCollege !== 'all' && (
              <Button size="sm" variant="outline" onClick={() => setFilterCollege('all')} className="gap-1.5">
                <XCircle className="w-3.5 h-3.5" /> Clear college filter
              </Button>
            )}
          </div>
        </div>

        {/* Applications grouped by college */}
        {filtered.length === 0 ? (
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
            {grouped.map(([collegeName, apps]) => {
              const collapsed = collapsedColleges.has(collegeName);
              const colPending = apps.filter(a => a.status === 'pending').length;
              return (
                <div key={collegeName} className="portal-panel">
                  {/* College header */}
                  <button
                    className="portal-panel-header w-full text-left flex items-center gap-2"
                    onClick={() => toggleCollege(collegeName)}
                  >
                    <Building2 className="w-4 h-4 text-white/70 flex-shrink-0" />
                    <span className="font-bold text-white flex-1">{collegeName}</span>
                    {colPending > 0 && (
                      <Badge className="bg-amber-400/30 border-0 text-amber-100 text-xs">{colPending} pending</Badge>
                    )}
                    <Badge className="bg-white/15 border-0 text-white text-xs">{apps.length}</Badge>
                    {collapsed ? <ChevronRight className="w-4 h-4 text-white/60" /> : <ChevronDown className="w-4 h-4 text-white/60" />}
                  </button>

                  {!collapsed && (
                    <div className="divide-y divide-border">
                      {apps.map(app => {
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
                          <div key={app.id} className="p-4 space-y-3">
                            {/* Student info row */}
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-sm text-foreground">{student?.name ?? 'Unknown Student'}</p>
                                  <StatusBadge status={app.status} />
                                </div>
                                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                                  <span>{student?.studentNumber ?? '—'}</span>
                                  <span>{student?.program ?? '—'}</span>
                                  <span className="font-semibold text-foreground">{enrolledUnits} units enlisted</span>
                                  <span>Submitted: {fmtDate((app as { requestedAt?: string; appliedAt?: string }).requestedAt ?? (app as { appliedAt?: string }).appliedAt)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Reason */}
                            <div className="banner banner-notice">
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm bg-slate-100 text-slate-500">
                                <FileText size={16} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="banner-title">Student's Reason</span>
                                <span className="banner-desc">{(app as { reason?: string }).reason ?? '—'}</span>
                              </div>
                            </div>

                            {/* Decision */}
                            {app.status !== 'pending' && (
                              <div className={`banner ${app.status === 'approved' ? 'banner-success' : 'banner-error'}`}>
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${app.status === 'approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                  {app.status === 'approved' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="banner-title">
                                    {app.status === 'approved' ? 'Approved' : 'Denied'}
                                    {(() => {
                                      const pid = (app as unknown as { processedBy?: string }).processedBy ?? (app as unknown as { reviewedBy?: string }).reviewedBy;
                                      const reviewer = state.users.find(u => u.id === pid);
                                      return reviewer ? ` by ${reviewer.name}` : '';
                                    })()}
                                  </span>
                                  {(app as { processedAt?: string }).processedAt && (
                                    <span className="banner-desc">Processed: {fmtDate((app as { processedAt?: string }).processedAt)}</span>
                                  )}
                                  {(app as { response?: string }).response && (
                                    <span className="banner-desc italic">"{(app as { response?: string }).response}"</span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Approve / Deny actions */}
                            {app.status === 'pending' && !isDenying && (
                              <div className="flex gap-2 pt-1">
                                <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5" disabled={isProcessing} onClick={() => handleApprove(app.id)}>
                                  {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                  Approve
                                </Button>
                                <Button size="sm" variant="outline" className="flex-1 border-red-300 text-red-600 hover:bg-red-50 gap-1.5" disabled={isProcessing} onClick={() => handleDeny(app.id)}>
                                  <XCircle className="w-3.5 h-3.5" /> Deny
                                </Button>
                              </div>
                            )}

                            {/* Deny confirmation */}
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
                                  <Button size="sm" className="flex-1 bg-red-600 hover:bg-red-700 text-white gap-1.5" disabled={isProcessing} onClick={handleConfirmDeny}>
                                    {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                                    Confirm Deny
                                  </Button>
                                  <Button size="sm" variant="ghost" className="flex-1" onClick={() => setDenyingId(null)}>Cancel</Button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
