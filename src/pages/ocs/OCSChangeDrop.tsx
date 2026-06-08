import { useState, useEffect } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { StatusBanner } from '@/components/shared/StatusBanner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, Search, AlertTriangle, Clock, MessageSquare, Lock, ChevronDown, ChevronUp, Calendar, User, ArrowLeftRight, History } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

export default function OCSChangeDrop() {
  const { state, processChangeDropRequest, loadChangeDropRequests } = useApp();
  const [search, setSearch] = useState('');
  const [selectedTermId, setSelectedTermId] = useState<string>('all');
  const [denyDialogId, setDenyDialogId] = useState<string | null>(null);
  const [denyNote, setDenyNote] = useState('');
  const [approveNoteId, setApproveNoteId] = useState<string | null>(null);
  const [approveNote, setApproveNote] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadChangeDropRequests();
  }, [loadChangeDropRequests]);

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

  const allRequests = (state.changeDropRequests ?? [])
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

  const pendingCount = allRequests.filter(r => r.status === 'pending').length;

  // Processed requests for Transaction History tab
  const historyItems = allRequests
    .filter(r => r.status !== 'pending')
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));

  const filtered = allRequests.filter(r => {
    const student = state.users.find(u => u.id === r.studentId);
    if (!student) return false;
    if (selectedTermId !== 'all' && r.termId !== selectedTermId) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return student.name.toLowerCase().includes(q) ||
      student.username.toLowerCase().includes(q) ||
      (student.studentNumber ?? '').toLowerCase().includes(q);
  });

  const handleApprove = async (requestId: string, note?: string) => {
    const req = allRequests.find(r => r.id === requestId);
    if (!req) return;
    setProcessingId(requestId);
    try {
      await processChangeDropRequest(requestId, 'approved', me.id, note?.trim() || undefined);
      const student = state.users.find(u => u.id === req.studentId);
      const isNewStyle = req.addSections !== undefined || req.dropSections !== undefined;
      toast.success('Request Approved', {
        description: isNewStyle
          ? `Changes have been applied to ${student?.name ?? 'Student'}'s enrollment.`
          : `${student?.name ?? 'Student'}'s enrollment has been reopened for changes.`,
      });
    } catch {
      toast.error('Error', { description: 'Failed to approve request.' });
    } finally {
      setProcessingId(null);
      setApproveNoteId(null);
      setApproveNote('');
    }
  };

  const handleDeny = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      await processChangeDropRequest(requestId, 'denied', me.id, denyNote.trim() || undefined);
      toast.success('Request Denied', { description: 'The student has been notified.' });
    } catch {
      toast.error('Error', { description: 'Failed to deny request.' });
    } finally {
      setProcessingId(null);
      setDenyDialogId(null);
      setDenyNote('');
    }
  };

  const statusConfig = {
    pending: { bg: 'bg-amber-50 border-amber-200', badge: 'bg-amber-100 text-amber-800 border-amber-300', dot: 'bg-amber-500', icon: <Clock className="w-3 h-3" />, label: 'Pending' },
    approved: { bg: 'bg-emerald-50 border-emerald-200', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300', dot: 'bg-emerald-500', icon: <CheckCircle className="w-3 h-3" />, label: 'Approved' },
    denied: { bg: 'bg-red-50 border-red-200', badge: 'bg-red-100 text-red-800 border-red-300', dot: 'bg-red-500', icon: <XCircle className="w-3 h-3" />, label: 'Denied' },
  };

  return (
    <PortalLayout>
      <div className="p-6 space-y-6">
        {/* Header panel */}
        <div className="portal-panel">
          <div className="portal-panel-header">
            <ArrowLeftRight className="w-4 h-4" /> Change &amp; Drop After Finalization
            {pendingCount > 0 && (
              <Badge className="ml-auto bg-amber-100 text-amber-800 border-amber-300 text-xs px-2 gap-1">
                <AlertTriangle className="w-3 h-3" /> {pendingCount} Pending
              </Badge>
            )}
          </div>

          {/* Filters */}
          <div className="px-4 py-3 flex flex-wrap gap-3 items-center border-b border-border/50">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by name or student number..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
            <Select value={selectedTermId} onValueChange={setSelectedTermId}>
              <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="All Terms" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Terms</SelectItem>
                {state.terms.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {isDeadlinePassed && (
            <div className="mx-4 mt-3">
              <StatusBanner type="error" title="Request Deadline Has Passed" description="No actions can be performed on pending Change/Drop requests." />
            </div>
          )}

          {/* Tabs: Requests / Transaction History */}
          <div className="p-4">
            <Tabs defaultValue="requests">
              <TabsList className="w-full justify-start gap-1">
                <TabsTrigger value="requests" className="flex items-center gap-1.5 text-xs">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Requests
                  {pendingCount > 0 && (
                    <span className="ml-1 h-4 min-w-4 px-1 text-[10px] bg-destructive text-white rounded-full flex items-center justify-center">
                      {pendingCount}
                    </span>
                  )}
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
                {filtered.length === 0 ? (
                  <div className="py-14 text-center">
                    <MessageSquare className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-sm font-medium text-muted-foreground">No Change/Drop requests found.</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Students who request to change or drop subjects after finalizing will appear here.</p>
                  </div>
                ) : (
                  filtered.map(req => {
                const student = state.users.find(u => u.id === req.studentId);
                const term = state.terms.find(t => t.id === req.termId);
                if (!student) return null;
                const sc = statusConfig[req.status];
                const isOpen = expandedIds.has(req.id);
                const initials = student.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

                return (
                  <div key={req.id} className={`rounded-xl border overflow-hidden transition-shadow hover:shadow-md ${sc.bg}`}>
                    {/* Card Header */}
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
                          <Badge variant="outline" className="text-xs gap-1">
                            <ArrowLeftRight className="w-3 h-3" /> Change &amp; Drop
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                          {student.studentNumber && (
                            <span className="flex items-center gap-1"><User className="w-3 h-3" />{student.studentNumber}</span>
                          )}
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

                    {/* Expanded Content */}
                    {isOpen && (
                      <div className="px-4 pb-4 pt-1 border-t border-current/10 space-y-3">
                        {/* Course tables for new-style requests */}
                        {(req.addSections?.length || req.dropSections?.length) ? (
                          <div className="space-y-2.5">
                            {(req.addSections ?? []).length > 0 && (
                              <div>
                                <p className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wide mb-1.5">Courses to Add</p>
                                <div className="rounded-lg border border-emerald-200 overflow-hidden">
                                  <table className="w-full text-xs">
                                    <thead className="bg-emerald-50 border-b border-emerald-200">
                                      <tr>
                                        <th className="text-left px-3 py-2 font-semibold">Code</th>
                                        <th className="text-left px-3 py-2 font-semibold">Title</th>
                                        <th className="text-center px-3 py-2 font-semibold">Units</th>
                                        <th className="text-center px-3 py-2 font-semibold">Section</th>
                                        <th className="text-left px-3 py-2 font-semibold">Schedule</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-emerald-100">
                                      {(req.addSections ?? []).map(sid => {
                                        const sec = state.sections.find(s => s.id === sid);
                                        const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
                                        if (!sec || !course) return null;
                                        const sched = sec.schedule;
                                        const schedStr = sched?.days?.length ? `${sched.days.join('')} ${sched.startTime}–${sched.endTime}` : 'TBA';
                                        return (
                                          <tr key={sid} className="bg-white">
                                            <td className="px-3 py-2 font-semibold">{course.code}</td>
                                            <td className="px-3 py-2">{course.title}</td>
                                            <td className="px-3 py-2 text-center">{course.units}</td>
                                            <td className="px-3 py-2 text-center">{sec.sectionCode}</td>
                                            <td className="px-3 py-2">{schedStr}</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                            {(req.dropSections ?? []).length > 0 && (
                              <div>
                                <p className="text-[11px] font-semibold text-red-800 uppercase tracking-wide mb-1.5">Courses to Drop</p>
                                <div className="rounded-lg border border-red-200 overflow-hidden">
                                  <table className="w-full text-xs">
                                    <thead className="bg-red-50 border-b border-red-200">
                                      <tr>
                                        <th className="text-left px-3 py-2 font-semibold">Code</th>
                                        <th className="text-left px-3 py-2 font-semibold">Title</th>
                                        <th className="text-center px-3 py-2 font-semibold">Units</th>
                                        <th className="text-center px-3 py-2 font-semibold">Section</th>
                                        <th className="text-left px-3 py-2 font-semibold">Schedule</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-red-100">
                                      {(req.dropSections ?? []).map(sid => {
                                        const sec = state.sections.find(s => s.id === sid);
                                        const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
                                        if (!sec || !course) return null;
                                        const sched = sec.schedule;
                                        const schedStr = sched?.days?.length ? `${sched.days.join('')} ${sched.startTime}–${sched.endTime}` : 'TBA';
                                        return (
                                          <tr key={sid} className="bg-white">
                                            <td className="px-3 py-2 font-semibold">{course.code}</td>
                                            <td className="px-3 py-2">{course.title}</td>
                                            <td className="px-3 py-2 text-center">{course.units}</td>
                                            <td className="px-3 py-2 text-center">{sec.sectionCode}</td>
                                            <td className="px-3 py-2">{schedStr}</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : null}

                        {/* Appeal letter / statement */}
                        <div className="bg-background/70 border border-border rounded-lg p-3">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                            {(req.addSections?.length || req.dropSections?.length) ? 'Statement / Reason' : 'Appeal Letter'}
                          </p>
                          <p className="text-sm text-foreground leading-relaxed">{req.reason}</p>
                        </div>

                        {/* OCS Response */}
                        {req.response && (
                          <div className={`rounded-lg px-3 py-2 text-xs border ${req.status === 'approved' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                            <span className="font-semibold">OCS Response: </span>{req.response}
                          </div>
                        )}

                        {/* Actions */}
                        {req.status === 'pending' && !isDeadlinePassed && (
                          <div className="flex items-center gap-2 flex-wrap pt-1">
                            <Button size="sm" className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                              disabled={processingId === req.id}
                              onClick={() => { setApproveNoteId(req.id); setApproveNote(''); }}>
                              <CheckCircle className="w-3.5 h-3.5" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
                              disabled={processingId === req.id}
                              onClick={() => { setDenyDialogId(req.id); setDenyNote(''); }}>
                              <XCircle className="w-3.5 h-3.5" /> Deny
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
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
                    <p className="text-xs text-muted-foreground/60 mt-1">Approved and denied Change/Drop requests will appear here.</p>
                  </div>
                ) : (
                  <div className="rounded-xl border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted border-b">
                        <tr>
                          <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Student</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Term</th>
                          <th className="text-center px-4 py-2.5 font-semibold text-muted-foreground">Decision</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">OCS Note</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {historyItems.map(req => {
                          const student = state.users.find(u => u.id === req.studentId);
                          const term = state.terms.find(t => t.id === req.termId);
                          if (!student) return null;
                          const isApproved = req.status === 'approved';
                          return (
                            <tr key={req.id} className={isApproved ? 'bg-emerald-50/40' : 'bg-red-50/30'}>
                              <td className="px-4 py-2.5">
                                <p className="font-semibold text-foreground">{student.name}</p>
                                {student.studentNumber && <p className="text-muted-foreground">{student.studentNumber}</p>}
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

        {/* Approve with Note Dialog */}
        <Dialog open={!!approveNoteId} onOpenChange={open => { if (!open) { setApproveNoteId(null); setApproveNote(''); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-700">
                <CheckCircle className="w-5 h-5" /> Approve Change/Drop Request
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <p className="text-sm text-muted-foreground">Approving this will reopen the student's finalized enrollment for modification.</p>
              <div>
                <Label className="text-sm">Response to Student <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                <Textarea rows={3} placeholder="e.g. Your request has been approved. Please make changes before the deadline..." value={approveNote} onChange={e => setApproveNote(e.target.value)} className="mt-1" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setApproveNoteId(null); setApproveNote(''); }}>Cancel</Button>
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={!!processingId}
                  onClick={() => approveNoteId && handleApprove(approveNoteId, approveNote)}>
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
                <XCircle className="w-5 h-5" /> Deny Change/Drop Request
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <p className="text-sm text-muted-foreground">The student will be notified. Optionally provide a reason for denial.</p>
              <div>
                <Label className="text-sm">OCS Note <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                <Textarea rows={3} placeholder="Reason (optional)..." value={denyNote} onChange={e => setDenyNote(e.target.value)} className="mt-1" />
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
      </div>
    </PortalLayout>
  );
}
