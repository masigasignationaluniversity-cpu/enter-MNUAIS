import { useState, useEffect, useMemo } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, XCircle, Clock, GraduationCap, User, Calendar, AlertCircle, BookOpen } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import type { GraduationApplication } from '@/lib/types';

function AppStatusBadge({ status }: { status: GraduationApplication['status'] }) {
  if (status === 'approved') return (
    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1">
      <CheckCircle2 className="w-3 h-3" /> Approved
    </Badge>
  );
  if (status === 'denied') return (
    <Badge className="bg-red-100 text-red-700 border-red-200 gap-1">
      <XCircle className="w-3 h-3" /> Denied
    </Badge>
  );
  return (
    <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1">
      <Clock className="w-3 h-3" /> Pending
    </Badge>
  );
}

export default function OCSGraduationApplications() {
  const { state, processGraduationApplication, loadGraduationApplications } = useApp();
  const [denyId, setDenyId] = useState<string | null>(null);
  const [denyNote, setDenyNote] = useState('');
  const [approveNoteId, setApproveNoteId] = useState<string | null>(null);
  const [approveNote, setApproveNote] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [viewStudentId, setViewStudentId] = useState<string | null>(null);

  useEffect(() => { loadGraduationApplications(); }, [loadGraduationApplications]);

  const me = state.currentUser;

  // Resolve OCS college ID
  const ocsCollegeId = useMemo(() => {
    if (!me) return '';
    const byId = state.colleges.find(c => c.id === me.college);
    if (byId) return byId.id;
    const byName = state.colleges.find(c => c.name === me.college);
    return byName?.id ?? me.college ?? '';
  }, [state.colleges, me]);

  // Applications for this OCS user's college
  const apps = useMemo(() => {
    return (state.graduationApplications ?? [])
      .filter(a => a.collegeId === ocsCollegeId)
      .slice()
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }, [state.graduationApplications, ocsCollegeId]);

  const pendingApps = apps.filter(a => a.status === 'pending');
  const getStudent = (id: string) => state.users.find(u => u.id === id);
  const getCollegeName = (id: string) => state.colleges.find(c => c.id === id)?.name ?? id;
  const getProgramName = (id?: string) => {
    if (!id) return '—';
    const p = state.degreePrograms.find(p => p.id === id || p.name === id || p.abbreviation === id);
    return p?.name ?? id;
  };

  // Build course rows for a student: term → courses with grades
  const getStudentCourseRows = (studentId: string) => {
    const enrollments = state.enrollments.filter(e => e.studentId === studentId);
    // Deduplicate by sectionId — prefer non-dropped
    const seenSec = new Map<string, typeof enrollments[0]>();
    for (const e of enrollments) {
      const existing = seenSec.get(e.sectionId);
      if (!existing || (existing.status === 'dropped' && e.status !== 'dropped')) {
        seenSec.set(e.sectionId, e);
      }
    }
    const deduped = Array.from(seenSec.values());
    const termMap = new Map<string, { term: typeof state.terms[0]; rows: Array<{ course: typeof state.courses[0] | undefined; grade: string | null; status: string }> }>();
    for (const e of deduped) {
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

  const handleApprove = async (app: GraduationApplication) => {
    setProcessingId(app.id);
    await processGraduationApplication(app.id, 'approved', me.id, approveNote || undefined);
    toast.success('Application approved.');
    setApproveNoteId(null);
    setApproveNote('');
    setProcessingId(null);
  };

  const handleDeny = async () => {
    if (!denyId) return;
    setProcessingId(denyId);
    await processGraduationApplication(denyId, 'denied', me.id, denyNote || undefined);
    toast.success('Application denied.');
    setDenyId(null);
    setDenyNote('');
    setProcessingId(null);
  };

  function AppCard({ app }: { app: GraduationApplication }) {
    const student = getStudent(app.studentId);
    const processedBy = state.users.find(u => u.id === app.processedBy)?.name;
    return (
      <div className="border rounded-lg p-4 space-y-3 bg-card">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">{student?.name ?? 'Unknown Student'}</p>
              <p className="text-xs text-muted-foreground">{student?.studentNumber ?? '—'}</p>
            </div>
          </div>
          <AppStatusBadge status={app.status} />
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span><span className="font-medium text-foreground">Program:</span> {getProgramName(app.programId)}</span>
          <span><span className="font-medium text-foreground">College:</span> {getCollegeName(app.collegeId)}</span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Applied: {new Date(app.submittedAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
          </span>
          {app.processedAt && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Processed: {new Date(app.processedAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          )}
          {processedBy && (
            <span><span className="font-medium text-foreground">By:</span> {processedBy}</span>
          )}
        </div>

        {app.response && (
          <div className="text-xs bg-muted rounded p-2 text-muted-foreground">
            <span className="font-medium text-foreground">Notes: </span>{app.response}
          </div>
        )}

        <div className="flex items-center gap-2 pt-1 flex-wrap">
          <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setViewStudentId(app.studentId)}>
            <BookOpen className="w-3 h-3" /> View Courses
          </Button>
          {app.status === 'pending' && (
            <>
              {approveNoteId === app.id ? (
                <div className="flex-1 space-y-2 w-full">
                  <Textarea
                    placeholder="Optional approval note…"
                    value={approveNote}
                    onChange={e => setApproveNote(e.target.value)}
                    rows={2}
                    className="text-xs"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="gap-1" disabled={processingId === app.id} onClick={() => handleApprove(app)}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {processingId === app.id ? 'Approving…' : 'Confirm Approve'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setApproveNoteId(null); setApproveNote(''); }}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
                  <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => setApproveNoteId(app.id)}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                  </Button>
                  <Button size="sm" variant="destructive" className="gap-1" onClick={() => { setDenyId(app.id); setDenyNote(''); }}>
                    <XCircle className="w-3.5 h-3.5" /> Deny
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // Student courses dialog data
  const viewStudent = viewStudentId ? getStudent(viewStudentId) : null;
  const viewCourseTerms = viewStudentId ? getStudentCourseRows(viewStudentId) : [];
  const totalUnitsView = viewCourseTerms.reduce((s, t) => s + t.rows.reduce((rs, r) => rs + (r.status !== 'dropped' && r.course ? (r.course.units ?? 0) : 0), 0), 0);

  const gradeColor = (g: string | null) => {
    if (!g) return 'text-muted-foreground';
    if (g === '5' || g === 'F') return 'text-destructive font-bold';
    if (g === '4' || g === 'INC') return 'text-orange-600 font-bold';
    if (['1.0','1.25','1.5','1.75','2.0','2.25','2.5','2.75','3.0'].includes(g)) return 'text-emerald-700 font-bold';
    if (g === 'DRP') return 'text-muted-foreground italic';
    return 'text-foreground';
  };

  if (!me) return null;

  return (
    <PortalLayout role="ocs" userName={me.name}>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            Graduation Applications
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Review and process student applications for graduation.
          </p>
        </div>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              Pending
              {pendingApps.length > 0 && (
                <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs px-1.5 py-0">{pendingApps.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all">All Applications</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            {pendingApps.length === 0 ? (
              <div className="portal-panel">
                <div className="p-12 text-center text-muted-foreground">
                  <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No pending applications.</p>
                  <p className="text-sm mt-1">Eligible students will appear here once they apply.</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pendingApps.map(app => <AppCard key={app.id} app={app} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all" className="mt-4">
            {apps.length === 0 ? (
              <div className="portal-panel">
                <div className="p-12 text-center text-muted-foreground">
                  <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No graduation applications yet.</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {apps.map(app => <AppCard key={app.id} app={app} />)}
              </div>
            )}
          </TabsContent>
        </Tabs>
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

      {/* Deny dialog */}
      <Dialog open={!!denyId} onOpenChange={open => { if (!open) { setDenyId(null); setDenyNote(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deny Application</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">Provide a reason for denial (optional but recommended).</p>
            <Textarea
              placeholder="Reason for denial…"
              value={denyNote}
              onChange={e => setDenyNote(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { setDenyId(null); setDenyNote(''); }}>Cancel</Button>
              <Button variant="destructive" disabled={!!processingId} onClick={handleDeny}>
                {processingId ? 'Denying…' : 'Confirm Deny'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
