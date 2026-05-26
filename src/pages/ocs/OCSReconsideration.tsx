import { useState } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ShieldBan, ShieldCheck, Search, UserX, GraduationCap, AlertTriangle, CheckCircle, MessageSquare, Clock, XCircle, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getScholasticStanding } from '@/lib/academic';

export default function OCSReconsideration() {
  const { state, processReconsiderationRequest, updateUser } = useApp();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [denyDialogId, setDenyDialogId] = useState<string | null>(null);
  const [denyNote, setDenyNote] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [viewStudentId, setViewStudentId] = useState<string | null>(null);

  const me = state.currentUser;
  if (!me) return null;

  // OCS can only see students in their own college
  const ocsCollege = me.college;

  const recRequests = (state.reconsiderationRequests ?? [])
    .slice()
    .filter(r => {
      const student = state.users.find(u => u.id === r.studentId);
      if (!student) return false;
      // College filter: match on college OR department field
      if (ocsCollege) {
        const studentCollege = student.college || student.department;
        if (studentCollege && studentCollege !== ocsCollege) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return b.requestedAt.localeCompare(a.requestedAt);
    });

  const pendingCount = recRequests.filter(r => r.status === 'pending').length;

  const filteredRequests = recRequests.filter(r => {
    const student = state.users.find(u => u.id === r.studentId);
    if (!student) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return student.name.toLowerCase().includes(q) ||
      student.username.toLowerCase().includes(q) ||
      (student.studentNumber ?? '').toLowerCase().includes(q);
  });

  const disqualifiedStudents = state.users.filter(u => {
    if (u.role !== 'student') return false;
    // College filter: match on college OR department field
    if (ocsCollege) {
      const studentCollege = u.college || u.department;
      if (studentCollege && studentCollege !== ocsCollege) return false;
    }
    // PD by status OR by grades
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

  const handleApprove = async (requestId: string) => {
    const req = recRequests.find(r => r.id === requestId);
    if (!req) return;
    setProcessingId(requestId);
    try {
      await processReconsiderationRequest(requestId, 'approved', me.id);
      const student = state.users.find(u => u.id === req.studentId);
      toast({
        title: 'Request Approved',
        description: `${student?.name ?? 'Student'} has been reinstated. Their enlistment privileges are restored.`,
      });
    } catch {
      toast({ title: 'Error', description: 'Failed to approve request.', variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeny = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      await processReconsiderationRequest(requestId, 'denied', me.id, denyNote.trim() || undefined);
      toast({ title: 'Request Denied', description: 'The student has been notified.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to deny request.', variant: 'destructive' });
    } finally {
      setProcessingId(null);
      setDenyDialogId(null);
      setDenyNote('');
    }
  };

  const handleDirectReinstate = async (studentId: string, studentName: string) => {
    try {
      await updateUser(studentId, { status: 'active' });
      toast({ title: 'Student Reinstated', description: `${studentName}'s enlistment privileges have been restored.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to reinstate student.', variant: 'destructive' });
    }
  };

  const viewStudent = viewStudentId ? state.users.find(u => u.id === viewStudentId) : null;

  // Grade history for viewed student
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

  return (
    <PortalLayout role="ocs" userName={me.name}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ShieldBan className="w-6 h-6 text-red-600" />
              Student Reconsideration
            </h1>
            <p className="text-gray-600 mt-1">Review reconsideration requests from permanently disqualified students.</p>
          </div>
          {pendingCount > 0 && (
            <Badge className="bg-red-100 text-red-800 border-red-300 text-sm px-3 py-1">
              {pendingCount} Pending Request{pendingCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by name, username, or student no..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <Tabs defaultValue="requests">
          <TabsList>
            <TabsTrigger value="requests" className="flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              Requests
              {pendingCount > 0 && (
                <Badge className="ml-1 h-4 w-4 p-0 text-xs bg-red-500 text-white rounded-full flex items-center justify-center">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="disqualified" className="flex items-center gap-1.5">
              <ShieldBan className="w-3.5 h-3.5" />
              All Disqualified ({disqualifiedStudents.length})
            </TabsTrigger>
          </TabsList>

          {/* === REQUESTS TAB === */}
          <TabsContent value="requests" className="mt-4 space-y-3">
            {filteredRequests.length === 0 ? (
              <div className="rounded-md overflow-hidden border border-border">
                <div className="py-16 text-center bg-background">
                  <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No reconsideration requests.</p>
                  <p className="text-gray-400 text-sm mt-1">
                    When permanently disqualified students submit requests from their enlistment page, they will appear here.
                  </p>
                </div>
              </div>
            ) : (
              filteredRequests.map(req => {
                const student = state.users.find(u => u.id === req.studentId);
                if (!student) return null;
                const statusColors = {
                  pending: 'bg-yellow-50 border-yellow-200',
                  approved: 'bg-green-50 border-green-200',
                  denied: 'bg-red-50 border-red-200',
                };
                return (
                  <div key={req.id} className={`rounded-md overflow-hidden border ${statusColors[req.status]}`}>
                    <div className="p-4 bg-background">
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                          req.status === 'pending' ? 'bg-yellow-500 text-white' :
                          req.status === 'approved' ? 'bg-green-500 text-white' :
                          'bg-red-500 text-white'
                        }`}>
                          {student.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-gray-900 text-sm">{student.name}</p>
                            <Badge className={`text-xs ${
                              req.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                              req.status === 'approved' ? 'bg-green-100 text-green-800 border-green-300' :
                              'bg-red-100 text-red-800 border-red-300'
                            }`}>
                              {req.status === 'pending' ? <Clock className="w-2.5 h-2.5 mr-1" /> :
                               req.status === 'approved' ? <CheckCircle className="w-2.5 h-2.5 mr-1" /> :
                               <XCircle className="w-2.5 h-2.5 mr-1" />}
                              {req.status.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            @{student.username}
                            {student.studentNumber && ` • ${student.studentNumber}`}
                            {student.program && ` • ${student.program}`}
                          </p>
                          <div className="mt-2 p-2 bg-white/70 border border-gray-200 rounded text-xs text-gray-700">
                            <span className="font-medium text-gray-900">Reason: </span>{req.reason}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            Submitted: {new Date(req.requestedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {req.status !== 'pending' && req.response && (
                            <p className="text-xs mt-1 text-gray-600">OCS Note: &quot;{req.response}&quot;</p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
                            onClick={() => setViewStudentId(student.id)}
                          >
                            <BookOpen className="w-3 h-3 mr-1" /> Profile
                          </Button>
                          {req.status === 'pending' && (
                            <>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white gap-1"
                                    disabled={processingId === req.id}
                                  >
                                    <ShieldCheck className="w-3 h-3" /> Approve
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
                                    <AlertDialogAction
                                      className="bg-green-600 text-white hover:bg-green-700"
                                      onClick={() => handleApprove(req.id)}
                                    >
                                      Approve & Reinstate
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-red-300 text-red-600 hover:bg-red-50"
                                disabled={processingId === req.id}
                                onClick={() => { setDenyDialogId(req.id); setDenyNote(''); }}
                              >
                                <XCircle className="w-3 h-3 mr-1" /> Deny
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>

          {/* === ALL DISQUALIFIED TAB === */}
          <TabsContent value="disqualified" className="mt-4 space-y-3">
            <div className="rounded-md border border-amber-200 bg-amber-50">
              <div className="pt-3 pb-3 px-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    This tab shows all permanently disqualified students. You can directly reinstate them here, or wait for them to submit a reconsideration request in their enlistment page.
                  </p>
                </div>
              </div>
            </div>

            {disqualifiedStudents.length === 0 ? (
              <div className="rounded-md overflow-hidden border border-border">
                <div className="py-12 text-center bg-background">
                  <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No permanently disqualified students.</p>
                </div>
              </div>
            ) : (
              disqualifiedStudents.map(student => {
                const pdByStatus = student.status === 'permanently_disqualified';
                return (
                <div key={student.id} className="rounded-md overflow-hidden border border-red-200 bg-red-50/30">
                  <div className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {student.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900 text-sm">{student.name}</p>
                          <Badge className="bg-red-100 text-red-700 border-red-300 text-xs">
                            <ShieldBan className="w-2.5 h-2.5 mr-1" /> Disqualified
                          </Badge>
                          {!pdByStatus && (
                            <Badge className="bg-orange-100 text-orange-700 border-orange-300 text-xs">
                              From Grades — status pending update
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          @{student.username}
                          {student.studentNumber && ` • ${student.studentNumber}`}
                          {student.college && ` • ${student.college}`}
                        </p>
                        {student.program && (
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <GraduationCap className="w-3 h-3" />{student.program}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
                          onClick={() => setViewStudentId(student.id)}
                        >
                          <BookOpen className="w-3 h-3 mr-1" /> Profile
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white gap-1">
                              <ShieldCheck className="w-3 h-3" /> Reinstate
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Reinstate {student.name}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will restore their enlistment privileges and change their status back to <strong>active</strong>.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-green-600 text-white hover:bg-green-700"
                                onClick={() => handleDirectReinstate(student.id, student.name)}
                              >
                                Reinstate Student
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                </div>
                );
              })
            )}
          </TabsContent>
        </Tabs>

        {/* Deny Dialog */}
        <Dialog open={!!denyDialogId} onOpenChange={v => { if (!v) { setDenyDialogId(null); setDenyNote(''); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-700">
                <XCircle className="w-5 h-5" />
                Deny Reconsideration Request
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <p className="text-sm text-muted-foreground">
                The student will be notified that their request was denied. Optionally provide a reason.
              </p>
              <div>
                <Label>OCS Note <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                <Textarea
                  rows={3}
                  placeholder="e.g. Insufficient grounds for reconsideration..."
                  value={denyNote}
                  onChange={e => setDenyNote(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setDenyDialogId(null); setDenyNote(''); }}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  disabled={!!processingId}
                  onClick={() => denyDialogId && handleDeny(denyDialogId)}
                >
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
                <UserX className="w-5 h-5 text-red-600" />
                {viewStudent?.name}
              </DialogTitle>
            </DialogHeader>
            {viewStudent && (
              <div className="space-y-4 mt-2">
                <div className="p-3 bg-gray-50 rounded-lg space-y-1 text-sm">
                  <p><span className="font-medium text-gray-600">Username:</span> @{viewStudent.username}</p>
                  {viewStudent.studentNumber && <p><span className="font-medium text-gray-600">Student No.:</span> {viewStudent.studentNumber}</p>}
                  {viewStudent.program && <p><span className="font-medium text-gray-600">Program:</span> {viewStudent.program}</p>}
                  <p>
                    <span className="font-medium text-gray-600">Status:</span>{' '}
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
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="text-left px-3 py-2 font-medium text-gray-600">Term</th>
                            <th className="text-left px-3 py-2 font-medium text-gray-600">Course</th>
                            <th className="text-center px-3 py-2 font-medium text-gray-600">Grade</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {viewedHistory.map((item, i) => {
                            if (!item) return null;
                            const { g, course, term } = item;
                            const effectiveGrade = (g.removalSubmitted && g.removalGrade) ? g.removalGrade : g.grade;
                            const failGrades = ['4', '5', 'INC', 'DRP', 'F'];
                            const passed = effectiveGrade && !failGrades.includes(String(effectiveGrade));
                            return (
                              <tr key={i} className={passed ? 'bg-green-50/50' : ''}>
                                <td className="px-3 py-2 text-gray-600">{term.name}</td>
                                <td className="px-3 py-2 font-mono text-primary font-medium">{course.code}</td>
                                <td className="px-3 py-2 text-center">
                                  <span className={`font-bold ${passed ? 'text-green-700' : 'text-red-600'}`}>{effectiveGrade}</span>
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
