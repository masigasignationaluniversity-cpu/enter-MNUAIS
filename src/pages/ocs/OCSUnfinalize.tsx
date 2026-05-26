import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Textarea } from '../../components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../../components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '../../components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../../components/ui/dialog';
import { Search, LockOpen, CheckSquare, Info, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

export default function OCSUnfinalize() {
  const { state, unfinalizeEnlistment, getActiveTerm, processUnfinalizedRequest } = useApp();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [reqSearch, setReqSearch] = useState('');
  const [responseText, setResponseText] = useState('');
  const [processingReqId, setProcessingReqId] = useState<string | null>(null);

  const activeTerm = getActiveTerm();
  const ocsUser = state.currentUser;

  // College-based filtering
  const ocsCollege = ocsUser?.college
    ? state.colleges.find(c => c.name === ocsUser.college) ?? null
    : null;
  const collegeDeptNames = new Set(
    ocsCollege
      ? state.departments.filter(d => d.collegeId === ocsCollege.id).map(d => d.name)
      : []
  );
  const collegeCourseIds = new Set(
    ocsCollege
      ? state.courses.filter(c => collegeDeptNames.has(c.department)).map(c => c.id)
      : state.courses.map(c => c.id)
  );

  // Finalized students for active term
  const termFinalizations = activeTerm
    ? state.finalizedEnlistments.filter(f => f.termId === activeTerm.id)
    : [];

  const finalizedStudents = termFinalizations
    .map(fin => {
      const student = state.users.find(u => u.id === fin.studentId);
      if (!student || student.role !== 'student') return null;
      const enlistedSections = state.sections.filter(sec => {
        if (!activeTerm || sec.termId !== activeTerm.id) return false;
        return state.enrollments.some(e => e.studentId === fin.studentId && e.sectionId === sec.id && e.status !== 'dropped');
      });
      const hasCollegeSection = enlistedSections.some(sec => collegeCourseIds.has(sec.courseId));
      if (ocsCollege && !hasCollegeSection) return null;
      return { student, fin, enlistedSections };
    })
    .filter(Boolean) as Array<{
      student: typeof state.users[0];
      fin: typeof termFinalizations[0];
      enlistedSections: typeof state.sections;
    }>;

  const filtered = search
    ? finalizedStudents.filter(({ student }) =>
        student.name.toLowerCase().includes(search.toLowerCase()) ||
        student.username.toLowerCase().includes(search.toLowerCase()) ||
        (student.studentNumber ?? '').includes(search) ||
        (student.program ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : finalizedStudents;

  // Unfinalized requests for active term
  const unfinalizedRequests = activeTerm
    ? (state.unfinalizedRequests ?? []).filter(r => r.termId === activeTerm.id)
    : [];

  const filteredRequests = reqSearch
    ? unfinalizedRequests.filter(r => {
        const student = state.users.find(u => u.id === r.studentId);
        return student?.name.toLowerCase().includes(reqSearch.toLowerCase()) ||
          student?.username.toLowerCase().includes(reqSearch.toLowerCase()) ||
          (student?.studentNumber ?? '').includes(reqSearch);
      })
    : unfinalizedRequests;

  const pendingRequests = filteredRequests.filter(r => r.status === 'pending');
  const processedRequests = filteredRequests.filter(r => r.status !== 'pending');

  const handleUnfinalize = (studentId: string, studentName: string, termId: string) => {
    unfinalizeEnlistment(studentId, termId);
    toast({
      title: 'Enlistment unfinalized',
      description: `${studentName}'s enlistment has been unlocked.`,
    });
  };

  const handleProcessRequest = async (reqId: string, status: 'approved' | 'denied') => {
    if (!ocsUser) return;
    await processUnfinalizedRequest(reqId, status, ocsUser.id, responseText.trim() || undefined);
    toast({
      title: status === 'approved' ? 'Request approved' : 'Request denied',
      description: status === 'approved'
        ? 'Student can now re-enlist their courses.'
        : 'Request has been denied.',
    });
    setProcessingReqId(null);
    setResponseText('');
  };

  return (
    <PortalLayout title="Unfinalize / Requests">
      <div className="space-y-4">
        {/* Info banner */}
        <div className="flex items-start gap-3 p-4 rounded-lg bg-accent border border-accent-foreground/10">
          <Info className="w-4 h-4 text-accent-foreground mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-accent-foreground">OCS: Enlistment Management</p>
            <p className="text-xs text-accent-foreground/80 mt-0.5">
              Review student re-enlistment requests and manage finalization locks.
              {ocsCollege && <span className="ml-1 font-medium">Showing data for <span className="text-primary">{ocsCollege.name}</span>.</span>}
            </p>
          </div>
        </div>

        <Tabs defaultValue="requests">
          <TabsList>
            <TabsTrigger value="requests">
              Student Requests
              {pendingRequests.length > 0 && (
                <Badge className="ml-2 bg-yellow-500 text-white text-xs">{pendingRequests.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="finalized">
              Finalized Students ({filtered.length})
            </TabsTrigger>
          </TabsList>

          {/* ── Student Requests Tab ── */}
          <TabsContent value="requests" className="mt-4 space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-base font-semibold">Re-Enlistment Requests</h2>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or ID…"
                  className="pl-9 w-60"
                  value={reqSearch}
                  onChange={e => setReqSearch(e.target.value)}
                />
              </div>
            </div>

            {!activeTerm ? (
              <Card><CardContent className="py-10 text-center text-muted-foreground">No active term.</CardContent></Card>
            ) : pendingRequests.length === 0 && processedRequests.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <MessageSquare className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 font-medium">No re-enlistment requests yet</p>
                  <p className="text-xs text-gray-400 mt-1">Students who didn't finalize on time can submit a request here.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {pendingRequests.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-yellow-700">Pending ({pendingRequests.length})</p>
                    {pendingRequests.map(req => {
                      const student = state.users.find(u => u.id === req.studentId);
                      if (!student) return null;
                      return (
                        <Card key={req.id} className="border-yellow-200 bg-yellow-50/30">
                          <CardContent className="pt-4 pb-4">
                            <div className="flex items-start justify-between gap-4 flex-wrap">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
                                    {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-sm">{student.name}</p>
                                    <p className="text-xs text-muted-foreground">{student.studentNumber} • {student.program}</p>
                                  </div>
                                </div>
                                <div className="mt-2 p-2 bg-white rounded border border-yellow-200 text-sm italic text-gray-700">
                                  "{req.reason}"
                                </div>
                                <p className="text-xs text-gray-400 mt-1">
                                  Requested: {new Date(req.requestedAt).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                              <div className="flex flex-col gap-2 items-end">
                                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">PENDING</Badge>
                                {processingReqId === req.id ? (
                                  <div className="w-64 space-y-2">
                                    <Label className="text-xs">Response (optional)</Label>
                                    <Textarea
                                      rows={2}
                                      className="text-xs"
                                      placeholder="Add a note to the student..."
                                      value={responseText}
                                      onChange={e => setResponseText(e.target.value)}
                                    />
                                    <div className="flex gap-1.5">
                                      <Button size="sm" className="flex-1 h-7 text-xs bg-green-600 hover:bg-green-700 text-white gap-1"
                                        onClick={() => handleProcessRequest(req.id, 'approved')}>
                                        <CheckCircle className="w-3 h-3" /> Approve
                                      </Button>
                                      <Button size="sm" variant="outline" className="flex-1 h-7 text-xs border-red-300 text-red-600 hover:bg-red-50 gap-1"
                                        onClick={() => handleProcessRequest(req.id, 'denied')}>
                                        <XCircle className="w-3 h-3" /> Deny
                                      </Button>
                                      <Button size="sm" variant="ghost" className="h-7 text-xs"
                                        onClick={() => { setProcessingReqId(null); setResponseText(''); }}>
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                                    onClick={() => { setProcessingReqId(req.id); setResponseText(''); }}>
                                    Review
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
                {processedRequests.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-muted-foreground">Processed ({processedRequests.length})</p>
                    {processedRequests.map(req => {
                      const student = state.users.find(u => u.id === req.studentId);
                      if (!student) return null;
                      const statusMap = {
                        approved: 'bg-green-100 text-green-800 border-green-200',
                        denied: 'bg-red-100 text-red-800 border-red-200',
                        pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                      };
                      return (
                        <Card key={req.id} className="opacity-75">
                          <CardContent className="pt-4 pb-4">
                            <div className="flex items-start justify-between gap-4 flex-wrap">
                              <div className="flex-1">
                                <p className="font-semibold text-sm">{student.name}</p>
                                <p className="text-xs text-muted-foreground">{student.studentNumber}</p>
                                <p className="text-xs italic text-gray-600 mt-1">"{req.reason}"</p>
                                {req.response && (
                                  <p className="text-xs text-gray-500 mt-1 bg-gray-50 p-1.5 rounded border">Response: {req.response}</p>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <Badge className={`text-xs border ${statusMap[req.status]}`}>{req.status.toUpperCase()}</Badge>
                                {req.processedAt && <p className="text-xs text-gray-400">{new Date(req.processedAt).toLocaleDateString('en-PH')}</p>}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* ── Finalized Students Tab ── */}
          <TabsContent value="finalized" className="mt-4 space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-base font-semibold">Finalized Students</h2>
                <p className="text-sm text-muted-foreground">
                  {activeTerm ? activeTerm.name : 'No active term'} · {filtered.length} student(s)
                </p>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, ID, or program…"
                  className="pl-9 w-64"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            {!activeTerm && (
              <Card><CardContent className="py-10 text-center text-muted-foreground">No active term.</CardContent></Card>
            )}

            {activeTerm && filtered.length === 0 && (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="font-medium">No finalized students found.</p>
                </CardContent>
              </Card>
            )}

            {activeTerm && filtered.length > 0 && (
              <Card>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>Student</TableHead>
                        <TableHead>Student No</TableHead>
                        <TableHead>Program</TableHead>
                        <TableHead className="text-center">Year</TableHead>
                        <TableHead>Enrolled Courses</TableHead>
                        <TableHead>Finalized At</TableHead>
                        <TableHead className="text-center">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(({ student, fin, enlistedSections }) => {
                        const collegeSections = enlistedSections.filter(sec => collegeCourseIds.has(sec.courseId));
                        return (
                          <TableRow key={student.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{student.name}</span>
                                <Badge className="bg-green-100 text-green-800 border-green-200 text-xs gap-1">
                                  <CheckSquare className="w-2.5 h-2.5" /> Finalized
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm text-muted-foreground">
                              {student.studentNumber ?? '—'}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[140px] truncate">
                              {student.program ?? '—'}
                            </TableCell>
                            <TableCell className="text-center text-sm">
                              {student.yearLevel ?? '—'}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {collegeSections.length > 0
                                  ? collegeSections.map(sec => {
                                      const course = state.courses.find(c => c.id === sec.courseId);
                                      return (
                                        <Badge key={sec.id} variant="outline" className="text-xs font-mono">
                                          {course?.code ?? sec.courseId} §{sec.sectionCode}
                                        </Badge>
                                      );
                                    })
                                  : <span className="text-muted-foreground text-xs">—</span>
                                }
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {new Date(fin.finalizedAt).toLocaleString('en-PH', {
                                month: 'short', day: 'numeric',
                                hour: '2-digit', minute: '2-digit',
                              })}
                            </TableCell>
                            <TableCell className="text-center">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm" className="border-orange-300 text-orange-700 hover:bg-orange-50 gap-1.5">
                                    <LockOpen className="w-3.5 h-3.5" /> Unfinalize
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Unfinalize {student.name}'s enlistment?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will remove their finalization lock for <span className="font-semibold">{activeTerm?.name}</span>.
                                      The student will be able to add or drop courses again until they re-finalize.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-orange-600 text-white hover:bg-orange-700"
                                      onClick={() => handleUnfinalize(student.id, student.name, activeTerm!.id)}
                                    >
                                      Unfinalize
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PortalLayout>
  );
}
