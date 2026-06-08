import { useState, useEffect } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { StatusBanner } from '@/components/shared/StatusBanner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ShieldBan, ShieldCheck, Search, UserX, GraduationCap, AlertTriangle, CheckCircle, MessageSquare, Clock, XCircle, BookOpen, Lock, ChevronDown, ChevronUp, Calendar, User, History } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { getScholasticStanding } from '@/lib/academic';

export default function OCSReconsideration() {
  const { state, processReconsiderationRequest, loadReconsiderationRequests } = useApp();
  const [search, setSearch] = useState('');
  const [selectedTermId, setSelectedTermId] = useState<string>('all');
  const [denyDialogId, setDenyDialogId] = useState<string | null>(null);
  const [denyNote, setDenyNote] = useState('');
  const [approveNoteId, setApproveNoteId] = useState<string | null>(null);
  const [approveNote, setApproveNote] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [viewStudentId, setViewStudentId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadReconsiderationRequests();
  }, [loadReconsiderationRequests]);

  // Default the term filter to the currently active term
  useEffect(() => {
    const active = state.terms.find(t => t.isActive);
    if (active) setSelectedTermId(active.id);
  }, [state.terms]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const me = state.currentUser;
  if (!me) return null;

  const ocsCollege = me.college;
  const ocsColByName = state.colleges.find(c => c.name === ocsCollege);
  const ocsColById = state.colleges.find(c => c.id === ocsCollege);
  const ocsCollegeName = (ocsColById ?? ocsColByName)?.name ?? ocsCollege ?? '';

  const studentInOcsCollege = (student: typeof state.users[0]) => {
    if (!ocsCollegeName) return true;
    const sc = state.colleges.find(c => c.id === student.college || c.name === student.college);
    return (sc?.name ?? student.college ?? '') === ocsCollegeName;
  };
  const activeTerm = state.terms.find(t => t.isActive);
  const isDeadlinePassed = activeTerm?.requestDeadline
    ? new Date() > new Date(activeTerm.requestDeadline)
    : false;

  const recRequests = (state.reconsiderationRequests ?? [])
    .slice()
    .filter(r => {
      const student = state.users.find(u => u.id === r.studentId);
      if (!student) return false;
      if (!studentInOcsCollege(student)) return false;
      return true;
    })
    .sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return b.requestedAt.localeCompare(a.requestedAt);
    });

  const pendingCount = recRequests.filter(r => r.status === 'pending' && (!r.requestType || r.requestType === 'pd_reconsideration')).length;

  const filteredRequests = recRequests.filter(r => {
    if (r.requestType && r.requestType !== 'pd_reconsideration') return false;
    const student = state.users.find(u => u.id === r.studentId);
    if (!student) return false;
    if (selectedTermId !== 'all' && r.termId !== selectedTermId) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return student.name.toLowerCase().includes(q) ||
      student.username.toLowerCase().includes(q) ||
      (student.studentNumber ?? '').toLowerCase().includes(q);
  });

  const filteredLateRequests = recRequests.filter(r => {
    if (r.requestType !== 'late_enlistment') return false;
    const student = state.users.find(u => u.id === r.studentId);
    if (!student) return false;
    if (selectedTermId !== 'all' && r.termId !== selectedTermId) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return student.name.toLowerCase().includes(q) ||
      student.username.toLowerCase().includes(q) ||
      (student.studentNumber ?? '').toLowerCase().includes(q);
  });
  const pendingLateCount = recRequests.filter(r => r.requestType === 'late_enlistment' && r.status === 'pending').length;

  // All processed (approved/denied) requests for Transaction History
  const historyItems = recRequests
    .filter(r => r.status !== 'pending' && r.requestType !== 'disqualified')
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));

  const disqualifiedStudents = state.users.filter(u => {
    if (u.role !== 'student') return false;
    if (!studentInOcsCollege(u)) return false;
    const pdByStatus = u.status === 'permanently_disqualified';
    const pdByGrades = state.terms.some(t =>
      getScholasticStanding(u.id, t.id, state.grades, state.sections, state.courses)?.standing === 'Permanent Disqualification'
    );
    if (!pdByStatus && !pdByGrades) return false;
    if (!search.trim()) return true;
    return u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      (u.studentNumber ?? '').toLowerCase().includes(search.toLowerCase());
  });

  const handleApprove = async (requestId: string, note?: string) => {
    const req = recRequests.find(r => r.id === requestId);
    if (!req) return;
    setProcessingId(requestId);
    try {
      await processReconsiderationRequest(requestId, 'approved', me.id, note?.trim() || undefined);
      const student = state.users.find(u => u.id === req.studentId);
      const isLate = req.requestType === 'late_enlistment';
      toast.success('Request Approved', {
        description: isLate
          ? `${student?.name ?? 'Student'} has been granted late enlistment access.`
          : `${student?.name ?? 'Student'} has been reinstated with restored enlistment privileges.`,
      });
    } catch {
      toast.error('Error', { description: 'Failed to approve request.' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeny = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      await processReconsiderationRequest(requestId, 'denied', me.id, denyNote.trim() || undefined);
      toast.success('Request Denied', { description: 'The student has been notified.' });
    } catch {
      toast.error('Error', { description: 'Failed to deny request.' });
    } finally {
      setProcessingId(null);
      setDenyDialogId(null);
      setDenyNote('');
    }
  };

  const viewStudent = viewStudentId ? state.users.find(u => u.id === viewStudentId) : null;
  const viewedHistory = viewStudent
    ? state.grades
        .filter(g => g.studentId === viewStudent.id && g.submitted && g.grade)
        .map(g => {
          const sec = state.sections.find(s => s.id === g.sectionId);
          const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
          const term = state.terms.find(t => t.id === g.termId);
          return course && term ? { g, course, term } : null;
        })
        .filter(Boolean)
    : [];

  const statusConfig = {
    pending: { bg: 'bg-amber-50 border-amber-200', badge: 'bg-amber-100 text-amber-800 border-amber-300', dot: 'bg-amber-500', icon: <Clock className="w-3 h-3" />, label: 'Pending' },
    approved: { bg: 'bg-emerald-50 border-emerald-200', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300', dot: 'bg-emerald-500', icon: <CheckCircle className="w-3 h-3" />, label: 'Approved' },
    denied: { bg: 'bg-red-50 border-red-200', badge: 'bg-red-100 text-red-800 border-red-300', dot: 'bg-red-500', icon: <XCircle className="w-3 h-3" />, label: 'Denied' },
  };

  const RequestCard = ({ req, typeBadgeLabel, typeBadgeClass }: {
    req: typeof filteredRequests[0];
    typeBadgeLabel: string;
    typeBadgeClass: string;
  }) => {
    const student = state.users.find(u => u.id === req.studentId);
    const term = state.terms.find(t => t.id === req.termId);
    if (!student) return null;
    const sc = statusConfig[req.status];
    const isOpen = expandedIds.has(req.id);
    const initials = student.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    return (
      <div className={`rounded-xl border overflow-hidden transition-shadow hover:shadow-md ${sc.bg}`}>
        {/* Card Header — clickable to expand */}
        <button
          type="button"
          className="w-full text-left px-4 py-3.5 flex items-center gap-3 focus:outline-none"
          onClick={() => toggleExpand(req.id)}
        >
          {/* Avatar */}
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${sc.dot}`}>
            {initials}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-foreground">{student.name}</span>
              <Badge className={`text-xs gap-1 ${sc.badge}`}>{sc.icon}{sc.label}</Badge>
              <Badge className={`text-xs ${typeBadgeClass}`}>{typeBadgeLabel}</Badge>
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
              {student.studentNumber && (
                <span className="flex items-center gap-1"><User className="w-3 h-3" />{student.studentNumber}</span>
              )}
              {student.program && <span>{student.program}</span>}
              {term && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{term.name}</span>}
            </div>
          </div>

          {/* Date + chevron */}
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className="text-xs text-muted-foreground">
              {new Date(req.requestedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </button>

        {/* Expanded Content */}
        {isOpen && (
          <div className="px-4 pb-4 pt-1 border-t border-current/10 space-y-3">
            {/* Reason box */}
            <div className="bg-background/70 border border-border rounded-lg p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Reason / Appeal Letter</p>
              <p className="text-sm text-foreground leading-relaxed">{req.reason}</p>
            </div>

            {/* OCS Response */}
            {req.response && (
              <div className={`rounded-lg px-3 py-2 text-xs border ${req.status === 'approved' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                <span className="font-semibold">OCS Response: </span>{req.response}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5"
                onClick={() => setViewStudentId(student.id)}
              >
                <BookOpen className="w-3.5 h-3.5" /> View Profile
              </Button>

              {req.status === 'pending' && !isDeadlinePassed && (
                <>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={processingId === req.id}>
                        <ShieldCheck className="w-3.5 h-3.5" /> Approve
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Approve Reconsideration for {student.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will reinstate {student.name} to <strong>active</strong> status and restore their enlistment privileges immediately.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => handleApprove(req.id)}>
                          Approve &amp; Reinstate
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
                    disabled={processingId === req.id}
                    onClick={() => { setDenyDialogId(req.id); setDenyNote(''); }}
                  >
                    <XCircle className="w-3.5 h-3.5" /> Deny
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const LateRequestCard = ({ req }: { req: typeof filteredLateRequests[0] }) => {
    const student = state.users.find(u => u.id === req.studentId);
    const term = state.terms.find(t => t.id === req.termId);
    if (!student) return null;
    const sc = statusConfig[req.status];
    const isOpen = expandedIds.has(req.id);
    const initials = student.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    return (
      <div className={`rounded-xl border overflow-hidden transition-shadow hover:shadow-md ${sc.bg}`}>
        <button
          type="button"
          className="w-full text-left px-4 py-3.5 flex items-center gap-3 focus:outline-none"
          onClick={() => toggleExpand(req.id)}
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${sc.dot}`}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-foreground">{student.name}</span>
              <Badge className={`text-xs gap-1 ${sc.badge}`}>{sc.icon}{sc.label}</Badge>
              <Badge className="text-xs bg-orange-100 text-orange-800 border-orange-300 gap-1">
                <BookOpen className="w-3 h-3" /> Late Enrollment
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
              {student.studentNumber && <span className="flex items-center gap-1"><User className="w-3 h-3" />{student.studentNumber}</span>}
              {student.program && <span>{student.program}</span>}
              {term && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{term.name}</span>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className="text-xs text-muted-foreground">
              {new Date(req.requestedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </button>

        {isOpen && (
          <div className="px-4 pb-4 pt-1 border-t border-current/10 space-y-3">
            <div className="bg-background/70 border border-border rounded-lg p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Appeal Letter</p>
              <p className="text-sm text-foreground leading-relaxed">{req.reason}</p>
            </div>
            {req.response && (
              <div className={`rounded-lg px-3 py-2 text-xs border ${req.status === 'approved' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                <span className="font-semibold">OCS Response: </span>{req.response}
              </div>
            )}
            {req.status === 'pending' && !isDeadlinePassed && (
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <Button size="sm" className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={processingId === req.id}
                  onClick={() => { setApproveNoteId(req.id); setApproveNote(''); }}>
                  <ShieldCheck className="w-3.5 h-3.5" /> Approve
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
                  disabled={processingId === req.id} onClick={() => { setDenyDialogId(req.id); setDenyNote(''); }}>
                  <XCircle className="w-3.5 h-3.5" /> Deny
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <PortalLayout role="ocs" userName={me.name}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="portal-panel">
          <div className="portal-panel-header">
            <ShieldBan className="w-4 h-4" /> Student Requests
            {(pendingCount + pendingLateCount) > 0 && (
              <Badge className="ml-auto bg-destructive/15 text-destructive border-destructive/30 text-xs px-2">
                {pendingCount + pendingLateCount} Pending
              </Badge>
            )}
          </div>
          <div className="px-4 py-3 flex flex-wrap gap-3 items-center border-b border-border/50">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by name or student no..." className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={selectedTermId} onValueChange={setSelectedTermId}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Filter by term" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Terms</SelectItem>
                {state.terms.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {isDeadlinePassed && (
            <div className="mx-4 mt-3">
              <StatusBanner type="error" title="Request Deadline Has Passed" description="No actions can be performed on pending requests for the active term." />
            </div>
          )}

          <div className="p-4">
            <Tabs defaultValue="requests">
              <TabsList className="w-full justify-start gap-1">
                <TabsTrigger value="requests" className="flex items-center gap-1.5 text-xs">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Reconsideration
                  {pendingCount > 0 && (
                    <span className="ml-1 h-4 min-w-4 px-1 text-[10px] bg-destructive text-white rounded-full flex items-center justify-center">
                      {pendingCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="late_enlistment" className="flex items-center gap-1.5 text-xs">
                  <BookOpen className="w-3.5 h-3.5" />
                  Late Enrollment
                  {pendingLateCount > 0 && (
                    <span className="ml-1 h-4 min-w-4 px-1 text-[10px] bg-orange-500 text-white rounded-full flex items-center justify-center">
                      {pendingLateCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="disqualified" className="flex items-center gap-1.5 text-xs">
                  <ShieldBan className="w-3.5 h-3.5" />
                  Disqualified ({disqualifiedStudents.length})
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-1.5 text-xs">
                  <History className="w-3.5 h-3.5" />
                  Transaction History
                  {historyItems.length > 0 && (
                    <span className="ml-1 h-4 min-w-4 px-1 text-[10px] bg-muted text-muted-foreground rounded-full flex items-center justify-center">
                      {historyItems.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* === REQUESTS TAB === */}
              <TabsContent value="requests" className="mt-4 space-y-2.5">
                {filteredRequests.length === 0 ? (
                  <div className="py-14 text-center">
                    <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3 opacity-60" />
                    <p className="text-sm font-medium text-muted-foreground">No reconsideration requests.</p>
                    <p className="text-xs text-muted-foreground/70 mt-1 max-w-xs mx-auto">
                      Permanently disqualified students who submit requests will appear here.
                    </p>
                  </div>
                ) : (
                  filteredRequests.map(req => (
                    <RequestCard key={req.id} req={req} typeBadgeLabel="PD Reconsideration" typeBadgeClass="bg-red-100 text-red-800 border-red-300" />
                  ))
                )}
              </TabsContent>

              {/* === LATE ENLISTMENT TAB === */}
              <TabsContent value="late_enlistment" className="mt-4 space-y-2.5">
                {filteredLateRequests.length === 0 ? (
                  <div className="py-14 text-center">
                    <BookOpen className="w-10 h-10 text-orange-300 mx-auto mb-3 opacity-60" />
                    <p className="text-sm font-medium text-muted-foreground">No late enrollment requests.</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Students who missed the enrollment window will appear here.</p>
                  </div>
                ) : (
                  filteredLateRequests.map(req => <LateRequestCard key={req.id} req={req} />)
                )}
              </TabsContent>

              {/* === ALL DISQUALIFIED TAB === */}
              <TabsContent value="disqualified" className="mt-4 space-y-2.5">
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 mb-3">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>To reinstate a student, wait for them to submit a reconsideration request — it will appear in the <strong>Reconsideration</strong> tab.</span>
                </div>

                {disqualifiedStudents.length === 0 ? (
                  <div className="py-14 text-center">
                    <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3 opacity-60" />
                    <p className="text-sm font-medium text-muted-foreground">No permanently disqualified students.</p>
                  </div>
                ) : (
                  disqualifiedStudents.map(student => {
                    const pdByStatus = student.status === 'permanently_disqualified';
                    return (
                      <div key={student.id} className="rounded-xl border border-red-200 bg-red-50/40 px-4 py-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-destructive text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {student.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-foreground">{student.name}</span>
                            <Badge className="bg-red-100 text-red-700 border-red-300 text-xs gap-1">
                              <ShieldBan className="w-2.5 h-2.5" /> Disqualified
                            </Badge>
                            {!pdByStatus && (
                              <Badge className="bg-orange-100 text-orange-700 border-orange-300 text-xs">Grades — status pending update</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {student.studentNumber && <span className="mr-2">{student.studentNumber}</span>}
                            {student.program && <span className="flex items-center gap-1 inline-flex"><GraduationCap className="w-3 h-3" />{student.program}</span>}
                          </p>
                        </div>
                        <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 flex-shrink-0" onClick={() => setViewStudentId(student.id)}>
                          <BookOpen className="w-3.5 h-3.5" /> Profile
                        </Button>
                      </div>
                    );
                  })
                )}
              </TabsContent>

              {/* === TRANSACTION HISTORY TAB === */}
              <TabsContent value="history" className="mt-4 space-y-2.5">
                {historyItems.length === 0 ? (
                  <div className="py-14 text-center">
                    <History className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-sm font-medium text-muted-foreground">No transaction history yet.</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Approved and denied requests will appear here.</p>
                  </div>
                ) : (
                  <div className="rounded-xl border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted border-b">
                        <tr>
                          <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Student</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Type</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Term</th>
                          <th className="text-center px-4 py-2.5 font-semibold text-muted-foreground">Decision</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Note</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {historyItems.map(req => {
                          const student = state.users.find(u => u.id === req.studentId);
                          const term = state.terms.find(t => t.id === req.termId);
                          if (!student) return null;
                          const isApproved = req.status === 'approved';
                          const isLate = req.requestType === 'late_enlistment';
                          return (
                            <tr key={req.id} className={isApproved ? 'bg-emerald-50/40' : 'bg-red-50/30'}>
                              <td className="px-4 py-2.5">
                                <p className="font-semibold text-foreground">{student.name}</p>
                                {student.studentNumber && <p className="text-muted-foreground">{student.studentNumber}</p>}
                              </td>
                              <td className="px-4 py-2.5">
                                <Badge className={`text-[10px] ${isLate ? 'bg-orange-100 text-orange-800 border-orange-300' : 'bg-red-100 text-red-800 border-red-300'}`}>
                                  {isLate ? 'Late Enrollment' : 'PD Reconsideration'}
                                </Badge>
                              </td>
                              <td className="px-4 py-2.5 text-muted-foreground">{term?.name ?? '—'}</td>
                              <td className="px-4 py-2.5 text-center">
                                <Badge className={`text-[10px] gap-1 ${isApproved ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-red-100 text-red-800 border-red-300'}`}>
                                  {isApproved ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                  {isApproved ? 'Approved' : 'Denied'}
                                </Badge>
                              </td>
                              <td className="px-4 py-2.5 text-muted-foreground max-w-[200px] truncate">{req.response ?? '—'}</td>
                              <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                                {new Date(req.requestedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Approve with Note Dialog (Late Enlistment) */}
        <Dialog open={!!approveNoteId} onOpenChange={v => { if (!v) { setApproveNoteId(null); setApproveNote(''); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-700">
                <ShieldCheck className="w-5 h-5" /> Grant Late Enrollment Access
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <p className="text-sm text-muted-foreground">
                This will allow the student to enlist subjects and finalize their enrollment even though the registration period has closed.
              </p>
              <div>
                <Label>Response to Student <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                <Textarea rows={3} placeholder="e.g. Your request has been approved. Please proceed with enrollment immediately..." value={approveNote} onChange={e => setApproveNote(e.target.value)} className="mt-1" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setApproveNoteId(null); setApproveNote(''); }}>Cancel</Button>
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={!!processingId}
                  onClick={async () => {
                    if (!approveNoteId) return;
                    const id = approveNoteId;
                    setApproveNoteId(null);
                    await handleApprove(id, approveNote);
                    setApproveNote('');
                  }}>
                  {processingId ? 'Processing...' : 'Grant Access'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Deny Dialog */}
        <Dialog open={!!denyDialogId} onOpenChange={v => { if (!v) { setDenyDialogId(null); setDenyNote(''); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <XCircle className="w-5 h-5" /> Deny Request
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <p className="text-sm text-muted-foreground">The student will be notified. Optionally provide a reason.</p>
              <div>
                <Label>OCS Note <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                <Textarea rows={3} placeholder="e.g. Insufficient grounds for reconsideration..." value={denyNote} onChange={e => setDenyNote(e.target.value)} className="mt-1" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setDenyDialogId(null); setDenyNote(''); }}>Cancel</Button>
                <Button className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={!!processingId}
                  onClick={() => denyDialogId && handleDeny(denyDialogId)}>
                  {processingId ? 'Processing...' : 'Deny Request'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Student Profile Dialog */}
        <Dialog open={!!viewStudent} onOpenChange={v => { if (!v) setViewStudentId(null); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserX className="w-5 h-5 text-destructive" /> {viewStudent?.name}
              </DialogTitle>
            </DialogHeader>
            {viewStudent && (
              <div className="space-y-4 mt-2">
                <div className="p-3 bg-muted/50 rounded-lg space-y-1 text-sm">
                  <p><span className="font-medium text-muted-foreground">Username:</span> @{viewStudent.username}</p>
                  {viewStudent.studentNumber && <p><span className="font-medium text-muted-foreground">Student No.:</span> {viewStudent.studentNumber}</p>}
                  {viewStudent.program && <p><span className="font-medium text-muted-foreground">Program:</span> {viewStudent.program}</p>}
                  <p className="flex items-center gap-2">
                    <span className="font-medium text-muted-foreground">Status:</span>
                    <Badge className="bg-red-100 text-red-700 border-red-300 text-xs">
                      {viewStudent.status === 'permanently_disqualified' ? 'Permanently Disqualified' : viewStudent.status}
                    </Badge>
                  </p>
                </div>
                {viewedHistory.length > 0 && (
                  <div>
                    <p className="font-semibold text-sm mb-2">Grade History</p>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-muted border-b">
                          <tr>
                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Term</th>
                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Course</th>
                            <th className="text-center px-3 py-2 font-medium text-muted-foreground">Grade</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {viewedHistory.map((item, i) => {
                            if (!item) return null;
                            const { g, course, term } = item;
                            const effectiveGrade = (g.removalSubmitted && g.removalGrade) ? g.removalGrade : g.grade;
                            const failGrades = ['4', '5', 'INC', 'DRP'];
                            const passed = effectiveGrade && !failGrades.includes(String(effectiveGrade));
                            return (
                              <tr key={i} className={passed ? 'bg-emerald-50/50' : ''}>
                                <td className="px-3 py-2 text-muted-foreground">{term.name}</td>
                                <td className="px-3 py-2 font-mono text-primary font-medium">{course.code}</td>
                                <td className="px-3 py-2 text-center">
                                  <span className={`font-bold text-sm ${passed ? 'text-emerald-700' : 'text-red-600'}`}>{effectiveGrade}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                <Button variant="outline" className="w-full" onClick={() => setViewStudentId(null)}>Close</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PortalLayout>
  );
}
