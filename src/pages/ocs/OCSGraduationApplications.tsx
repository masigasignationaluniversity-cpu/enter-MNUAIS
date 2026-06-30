import { useState, useMemo } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { StatusBanner } from '@/components/shared/StatusBanner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TermSelect } from '@/components/shared/TermSelect';
import {
  CheckCircle2, XCircle, Clock, GraduationCap, BookOpen,
  Search, AlertTriangle, RefreshCw, FileText, Users,
} from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import type { GraduationApplication, GraduationApplicationStatus } from '@/lib/types';

type FilterStatus = 'all' | 'pending' | 'approved' | 'denied';

const fmtDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString('en-PH', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
      })
    : '—';

function AppStatusBadge({ status }: { status: GraduationApplicationStatus }) {
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
}

export default function OCSGraduationApplications() {
  const { state, processGraduationApplication, loadGraduationApplications } = useApp();
  const me = state.currentUser;

  const activeTerm = state.terms.find(t => t.isActive);
  const [selectedTermId, setSelectedTermId] = useState(activeTerm?.id ?? state.terms[0]?.id ?? '');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [denyResponse, setDenyResponse] = useState('');
  const [denyingId, setDenyingId] = useState<string | null>(null);
  const [approveNoteId, setApproveNoteId] = useState<string | null>(null);
  const [approveNote, setApproveNote] = useState('');
  const [viewStudentId, setViewStudentId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const selectedTerm = state.terms.find(t => t.id === selectedTermId);
  const gradFrom = selectedTerm?.graduationFrom;
  const gradUntil = selectedTerm?.graduationUntil;
  const now = new Date();
  const isWindowOpen = gradFrom && gradUntil
    ? now >= new Date(gradFrom) && now <= new Date(gradUntil)
    : false;
  const isWindowPast = gradUntil ? now > new Date(gradUntil) : false;

  // OCS college
  const ocsCollegeId = useMemo(() => {
    if (!me) return '';
    return state.colleges.find(c =>
      c.name === me.college || c.id === me.college || c.abbreviation === me.college
    )?.id ?? me.college ?? '';
  }, [state.colleges, me]);

  // Terms that have graduation applications
  const relevantTermIds = useMemo(() => new Set(
    (state.graduationApplications ?? [])
      .filter(a => a.collegeId === ocsCollegeId)
      .map(a => a.termId)
      .filter(Boolean)
  ), [state.graduationApplications, ocsCollegeId]);
  const relevantTerms = state.terms.filter(t => relevantTermIds.has(t.id) || !!t.isActive);

  // Applications for selected term
  const allApplications = useMemo(() => {
    const apps = (state.graduationApplications ?? [])
      .filter(a => a.collegeId === ocsCollegeId && (a.termId === selectedTermId || (!a.termId && selectedTermId === activeTerm?.id)));
    return apps.slice().sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    });
  }, [state.graduationApplications, ocsCollegeId, selectedTermId, activeTerm]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allApplications.filter(app => {
      if (filterStatus !== 'all' && app.status !== filterStatus) return false;
      if (!q) return true;
      const student = state.users.find(u => u.id === app.studentId);
      const name = (student?.name ?? '').toLowerCase();
      const num = (student?.studentNumber ?? '').toLowerCase();
      const prog = (student?.program ?? '').toLowerCase();
      return name.includes(q) || num.includes(q) || prog.includes(q);
    });
  }, [allApplications, filterStatus, search, state.users]);

  const pendingCount = allApplications.filter(a => a.status === 'pending').length;

  const getProgramName = (id?: string) => {
    if (!id) return '—';
    const p = state.degreePrograms.find(p => p.id === id || p.name === id || p.abbreviation === id);
    return p?.name ?? id;
  };

  // View courses dialog
  const getStudentCourseRows = (studentId: string) => {
    const enrollments = state.enrollments.filter(e => e.studentId === studentId);
    const seenSec = new Map<string, typeof enrollments[0]>();
    for (const e of enrollments) {
      const existing = seenSec.get(e.sectionId);
      if (!existing || (existing.status === 'dropped' && e.status !== 'dropped')) seenSec.set(e.sectionId, e);
    }
    const termMap = new Map<string, { term: typeof state.terms[0]; rows: Array<{ course: typeof state.courses[0] | undefined; grade: string | null; status: string }> }>();
    for (const e of Array.from(seenSec.values())) {
      const sec = state.sections.find(s => s.id === e.sectionId);
      if (!sec) continue;
      const term = state.terms.find(t => t.id === sec.termId);
      if (!term) continue;
      const course = state.courses.find(c => c.id === sec.courseId);
      const gradeRec = state.grades.find(g => g.studentId === studentId && g.sectionId === e.sectionId);
      if (!termMap.has(term.id)) termMap.set(term.id, { term, rows: [] });
      termMap.get(term.id)!.rows.push({ course, grade: gradeRec?.grade ?? null, status: e.status });
    }
    return Array.from(termMap.values()).sort((a, b) => (a.term.startDate ?? '').localeCompare(b.term.startDate ?? ''));
  };

  const gradeColor = (g: string | null) => {
    if (!g) return 'text-muted-foreground';
    if (g === '5' || g === 'F') return 'text-destructive font-bold';
    if (g === '4' || g === 'INC') return 'text-orange-600 font-bold';
    if (['1.0','1.25','1.5','1.75','2.0','2.25','2.5','2.75','3.0'].includes(g)) return 'text-emerald-700 font-bold';
    if (g === 'DRP') return 'text-muted-foreground italic';
    return 'text-foreground';
  };

  const handleApprove = async (app: GraduationApplication) => {
    setProcessingId(app.id);
    try {
      await processGraduationApplication(app.id, 'approved', me.id, approveNote || undefined);
      toast.success('Graduation application approved.');
      setApproveNoteId(null);
      setApproveNote('');
    } catch {
      toast.error('Failed to approve. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmDeny = async () => {
    if (!denyingId) return;
    setProcessingId(denyingId);
    try {
      await processGraduationApplication(denyingId, 'denied', me.id, denyResponse || undefined);
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
    await loadGraduationApplications();
    setRefreshing(false);
    toast.success('Applications refreshed.');
  };

  const viewStudent = viewStudentId ? state.users.find(u => u.id === viewStudentId) : null;
  const viewCourseTerms = viewStudentId ? getStudentCourseRows(viewStudentId) : [];
  const totalUnitsView = viewCourseTerms.reduce(
    (s, t) => s + t.rows.reduce((rs, r) => rs + (r.status !== 'dropped' && r.course ? (r.course.units ?? 0) : 0), 0),
    0,
  );

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

        {/* Window status banners */}
        {isWindowOpen && (
          <StatusBanner type="open" title="Graduation Application Window is Open"
            description={<>Students may submit applications until <strong>{fmtDate(gradUntil)}</strong>.</>} />
        )}
        {!isWindowOpen && isWindowPast && (
          <StatusBanner type="error" title="Graduation Application Window Closed"
            description={`Was open from ${fmtDate(gradFrom)} to ${fmtDate(gradUntil)}.`} />
        )}
        {!isWindowOpen && !isWindowPast && (
          <StatusBanner
            type="warning"
            title={!gradFrom && !gradUntil ? 'Graduation Window Not Yet Scheduled' : 'Graduation Window Not Yet Open'}
            description={!gradFrom && !gradUntil
              ? 'No graduation application window has been set for this term.'
              : <><strong>{fmtDate(gradFrom)}</strong> to <strong>{fmtDate(gradUntil)}</strong>.</>}
          />
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4">
          {statConfigs.map(({ key, label, icon, style }) => (
            <button
              key={key}
              onClick={() => setFilterStatus(filterStatus === key ? 'all' : key)}
              className={`dash-stat portal-panel transition-all ${filterStatus === key ? 'ring-2 ring-primary ring-offset-1' : 'hover:shadow-md'}`}
            >
              <div className="dash-stat-icon" style={style}>{icon}</div>
              <p className="dash-stat-value">{allApplications.filter(a => a.status === key).length}</p>
              <p className="dash-stat-label">{label}</p>
            </button>
          ))}
        </div>

        {/* Pending alert */}
        {pendingCount > 0 && (
          <StatusBanner
            type="warning"
            title={`${pendingCount} application${pendingCount !== 1 ? 's' : ''} awaiting review`}
            description="Review and process all pending graduation applications below."
          />
        )}

        {/* Filters panel */}
        <div className="portal-panel">
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
        </div>

        {/* Applications list */}
        {filtered.length === 0 ? (
          <div className="portal-panel">
            <div className="py-16 text-center text-muted-foreground">
              <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-25" />
              <p className="font-semibold text-sm">No applications found</p>
              <p className="text-xs mt-1 opacity-70">
                {filterStatus === 'pending'
                  ? 'No pending graduation applications for this term.'
                  : 'Try adjusting your search or filter.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(app => {
              const student = state.users.find(u => u.id === app.studentId);
              const processedBy = state.users.find(u => u.id === app.processedBy)?.name;
              const isDenying = denyingId === app.id;
              const isApproving = approveNoteId === app.id;
              const isProcessing = processingId === app.id;

              return (
                <div key={app.id} className="portal-panel">
                  {/* Card header */}
                  <div className="portal-panel-header">
                    <div className="flex items-center gap-2 flex-1 flex-wrap">
                      <GraduationCap className="w-4 h-4 text-white/70 flex-shrink-0" />
                      <span className="font-bold text-white">{student?.name ?? 'Unknown Student'}</span>
                      <span className="text-white/55 text-xs font-normal">{student?.studentNumber ?? '—'}</span>
                    </div>
                    <AppStatusBadge status={app.status} />
                  </div>

                  {/* Card body */}
                  <div className="p-4 space-y-3">
                    {/* Meta info */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{getProgramName(app.programId)}</span>
                      <span>Submitted: {fmtDate(app.submittedAt)}</span>
                      {processedBy && app.processedAt && (
                        <span>Processed by {processedBy} on {fmtDate(app.processedAt)}</span>
                      )}
                    </div>

                    {/* OCS response / approval note */}
                    {app.response && (
                      <div className={`banner ${app.status === 'approved' ? 'banner-success' : 'banner-error'}`}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${app.status === 'approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                          {app.status === 'approved' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="banner-title">{app.status === 'approved' ? 'Approved by OCS' : 'Denied by OCS'}</span>
                          <span className="banner-desc italic">"{app.response}"</span>
                        </div>
                      </div>
                    )}

                    {/* Decision status (no note) */}
                    {app.status !== 'pending' && !app.response && (
                      <div className={`banner ${app.status === 'approved' ? 'banner-success' : 'banner-error'}`}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${app.status === 'approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                          {app.status === 'approved' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="banner-title">{app.status === 'approved' ? 'Approved by OCS' : 'Denied by OCS'}</span>
                          {app.processedAt && <span className="banner-desc">Processed: {fmtDate(app.processedAt)}</span>}
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-1 flex-wrap">
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setViewStudentId(app.studentId)}>
                        <BookOpen className="w-3 h-3" /> View Courses
                      </Button>
                      {app.status === 'pending' && !isDenying && !isApproving && (
                        <>
                          <Button
                            size="sm"
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                            disabled={isProcessing}
                            onClick={() => { setApproveNoteId(app.id); setApproveNote(''); }}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 border-red-300 text-red-600 hover:bg-red-50 gap-1.5"
                            disabled={isProcessing}
                            onClick={() => { setDenyingId(app.id); setDenyResponse(''); }}
                          >
                            <XCircle className="w-3.5 h-3.5" /> Deny
                          </Button>
                        </>
                      )}
                    </div>

                    {/* Approve with note */}
                    {app.status === 'pending' && isApproving && (
                      <div className="banner banner-success flex-col items-stretch gap-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={15} className="flex-shrink-0" />
                          <span className="banner-title">Confirm Approval</span>
                        </div>
                        <Textarea
                          className="text-xs bg-white border-emerald-200 focus:ring-emerald-300"
                          rows={2}
                          placeholder="Optional approval note (shown to student)..."
                          value={approveNote}
                          onChange={e => setApproveNote(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                            disabled={isProcessing}
                            onClick={() => handleApprove(app)}
                          >
                            {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            Confirm Approve
                          </Button>
                          <Button size="sm" variant="ghost" className="flex-1" onClick={() => { setApproveNoteId(null); setApproveNote(''); }}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Deny confirmation form */}
                    {app.status === 'pending' && isDenying && (
                      <div className="banner banner-error flex-col items-stretch gap-2">
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
        )}
      </div>

      {/* View Courses Dialog */}
      <Dialog open={!!viewStudentId} onOpenChange={open => { if (!open) setViewStudentId(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" /> Courses Taken
            </DialogTitle>
          </DialogHeader>
          {viewStudent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs border rounded p-3 bg-muted/30">
                <span><span className="font-medium">Name:</span> {viewStudent.name}</span>
                <span><span className="font-medium">Student No.:</span> {viewStudent.studentNumber ?? '—'}</span>
                <span><span className="font-medium">Program:</span> {viewStudent.program ?? '—'}</span>
                <span><span className="font-medium">Total Units:</span> {totalUnitsView}</span>
              </div>
              {viewCourseTerms.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No enrollment records found.</p>
              ) : viewCourseTerms.map(({ term, rows }) => (
                <div key={term.id} className="space-y-1">
                  <h3 className="text-sm font-semibold text-muted-foreground">{term.name}</h3>
                  <div className="overflow-x-auto border rounded">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="text-xs py-2 font-bold">Code</TableHead>
                          <TableHead className="text-xs py-2 font-bold">Course Title</TableHead>
                          <TableHead className="text-xs py-2 font-bold text-center w-[60px]">Units</TableHead>
                          <TableHead className="text-xs py-2 font-bold text-center w-[70px]">Grade</TableHead>
                          <TableHead className="text-xs py-2 font-bold text-center w-[80px]">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((r, i) => (
                          <TableRow key={i} className={r.status === 'dropped' ? 'opacity-50' : ''}>
                            <TableCell className="text-xs font-mono py-1.5">{r.course?.code ?? '—'}</TableCell>
                            <TableCell className="text-xs py-1.5">{r.course?.title ?? '—'}</TableCell>
                            <TableCell className="text-xs py-1.5 text-center">{r.course?.units ?? '—'}</TableCell>
                            <TableCell className={`text-xs py-1.5 text-center ${gradeColor(r.status === 'dropped' ? 'DRP' : r.grade)}`}>
                              {r.status === 'dropped' ? 'DRP' : (r.grade ?? '—')}
                            </TableCell>
                            <TableCell className="text-xs py-1.5 text-center capitalize text-muted-foreground">{r.status}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
