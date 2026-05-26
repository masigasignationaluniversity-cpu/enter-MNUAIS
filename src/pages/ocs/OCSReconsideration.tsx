import { useState } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ShieldBan, ShieldCheck, Search, UserX, BookOpen, GraduationCap, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function OCSReconsideration() {
  const { state, updateUser } = useApp();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [viewStudent, setViewStudent] = useState<string | null>(null);
  const [reinstateNote, setReinstateNote] = useState('');
  const [loading, setLoading] = useState(false);

  const me = state.currentUser;
  if (!me) return null;

  // All students with permanently_disqualified status
  const disqualifiedStudents = state.users.filter(u =>
    u.role === 'student' &&
    u.status === 'permanently_disqualified' &&
    (search.trim()
      ? u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        (u.studentNumber ?? '').toLowerCase().includes(search.toLowerCase())
      : true)
  );

  const handleReinstate = async (studentId: string, studentName: string) => {
    setLoading(true);
    try {
      await updateUser(studentId, { status: 'active' });
      toast({
        title: 'Student Reinstated',
        description: `${studentName} has been reinstated and their enlistment privileges restored.`,
      });
      setViewStudent(null);
      setReinstateNote('');
    } catch {
      toast({ title: 'Error', description: 'Failed to reinstate student.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const activeTerm = state.terms.find(t => t.isActive);

  const getStudentStats = (studentId: string) => {
    const enrollments = state.enrollments.filter(e => e.studentId === studentId && e.status !== 'dropped');
    const grades = state.grades.filter(g => g.studentId === studentId && g.submitted && g.grade);
    const passedGrades = grades.filter(g => {
      const effectiveGrade = (g.removalSubmitted && g.removalGrade) ? g.removalGrade : g.grade;
      const failGrades = ['4', '5', 'INC', 'DRP', 'F'];
      return effectiveGrade && !failGrades.includes(String(effectiveGrade));
    });
    const currentTermEnrollments = activeTerm
      ? enrollments.filter(e => e.termId === activeTerm.id)
      : [];
    return {
      totalEnrollments: enrollments.length,
      passedSubjects: passedGrades.length,
      currentTerm: currentTermEnrollments.length,
    };
  };

  const viewedStudent = viewStudent ? state.users.find(u => u.id === viewStudent) : null;
  const viewedStats = viewedStudent ? getStudentStats(viewedStudent.id) : null;

  // Grade history for viewed student
  const viewedHistory = viewedStudent
    ? state.grades
        .filter(g => g.studentId === viewedStudent.id && g.submitted && g.grade)
        .map(g => {
          const sec = state.sections.find(s => s.id === g.sectionId);
          const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
          const term = state.terms.find(t => t.id === g.termId);
          return course && term ? { g, course, term } : null;
        })
        .filter(Boolean)
        .sort((a, b) => a!.term.academicYear.localeCompare(b!.term.academicYear))
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
            <p className="text-gray-600 mt-1">
              Review and reinstate permanently disqualified students.
            </p>
          </div>
          <Badge className="bg-red-100 text-red-800 border-red-200 text-sm px-3 py-1">
            {disqualifiedStudents.length} Disqualified Student{disqualifiedStudents.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Info card */}
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="pt-3 pb-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold">About Permanent Disqualification</p>
                <p className="text-xs mt-1 text-amber-700">
                  Permanently disqualified students cannot enlist in any courses. Their status is set by Admin.
                  As OCS, you can review the student's academic record and reinstate their enlistment privileges.
                  Reinstatement restores the student to <strong>active</strong> status.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

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

        {/* Student List */}
        {disqualifiedStudents.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">
                {search ? 'No disqualified students match your search.' : 'No permanently disqualified students.'}
              </p>
              <p className="text-gray-400 text-sm mt-1">
                {!search && 'All students currently have active enlistment privileges.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {disqualifiedStudents.map(student => {
              const stats = getStudentStats(student.id);
              return (
                <Card key={student.id} className="border-red-200 bg-red-50/30">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {student.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900 truncate">{student.name}</p>
                          <Badge className="bg-red-100 text-red-700 border-red-300 text-xs flex items-center gap-1">
                            <ShieldBan className="w-2.5 h-2.5" /> Disqualified
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">@{student.username}</p>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                          {student.studentNumber && <span className="flex items-center gap-1"><UserX className="w-3 h-3" />{student.studentNumber}</span>}
                          {student.program && <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" />{student.program}</span>}
                        </div>
                        <div className="flex gap-3 mt-2 text-xs">
                          <span className="text-gray-600"><span className="font-medium text-gray-800">{stats.passedSubjects}</span> passed</span>
                          <span className="text-gray-600"><span className="font-medium text-gray-800">{stats.totalEnrollments}</span> total enrollments</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
                          onClick={() => { setViewStudent(student.id); setReinstateNote(''); }}
                        >
                          <BookOpen className="w-3 h-3 mr-1" /> Review
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
                                This will restore {student.name}'s enlistment privileges and change their status back to <strong>active</strong>.
                                They will be able to enlist in courses again.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-green-600 text-white hover:bg-green-700"
                                onClick={() => handleReinstate(student.id, student.name)}
                              >
                                Reinstate Student
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Review & Reinstate Dialog */}
        <Dialog open={!!viewedStudent} onOpenChange={v => { if (!v) { setViewStudent(null); setReinstateNote(''); } }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldBan className="w-5 h-5 text-red-600" />
                Review: {viewedStudent?.name}
              </DialogTitle>
            </DialogHeader>
            {viewedStudent && viewedStats && (
              <div className="space-y-4 mt-2">
                {/* Student Info */}
                <div className="p-3 bg-gray-50 rounded-lg space-y-1 text-sm">
                  <p><span className="font-medium text-gray-600">Username:</span> @{viewedStudent.username}</p>
                  {viewedStudent.studentNumber && <p><span className="font-medium text-gray-600">Student No.:</span> {viewedStudent.studentNumber}</p>}
                  {viewedStudent.program && <p><span className="font-medium text-gray-600">Program:</span> {viewedStudent.program}</p>}
                  <p>
                    <span className="font-medium text-gray-600">Status:</span>{' '}
                    <Badge className="bg-red-100 text-red-700 border-red-300 text-xs">Permanently Disqualified</Badge>
                  </p>
                </div>

                {/* Academic Summary */}
                <div>
                  <p className="font-semibold text-sm mb-2">Academic Summary</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-lg font-bold text-blue-700">{viewedStats.passedSubjects}</p>
                      <p className="text-xs text-blue-600">Passed</p>
                    </div>
                    <div className="p-2 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-lg font-bold text-gray-700">{viewedStats.totalEnrollments}</p>
                      <p className="text-xs text-gray-600">Total Enrolled</p>
                    </div>
                    <div className="p-2 bg-purple-50 border border-purple-200 rounded-lg">
                      <p className="text-lg font-bold text-purple-700">{viewedStats.currentTerm}</p>
                      <p className="text-xs text-purple-600">Current Term</p>
                    </div>
                  </div>
                </div>

                {/* Grade History */}
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
                                  <span className={`font-bold ${passed ? 'text-green-700' : 'text-red-600'}`}>
                                    {effectiveGrade}
                                  </span>
                                  {g.removalSubmitted && g.removalGrade && (
                                    <span className="text-gray-400 ml-1">(Removal)</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Reinstatement Note */}
                <div>
                  <Label className="text-sm font-medium">OCS Note <span className="text-muted-foreground font-normal text-xs">(optional — for record keeping)</span></Label>
                  <Textarea
                    rows={3}
                    placeholder="e.g. Student has met requirements for reconsideration..."
                    value={reinstateNote}
                    onChange={e => setReinstateNote(e.target.value)}
                    className="mt-1"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => { setViewStudent(null); setReinstateNote(''); }}>
                    Close
                  </Button>
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-1.5"
                    disabled={loading}
                    onClick={() => handleReinstate(viewedStudent.id, viewedStudent.name)}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    {loading ? 'Reinstating...' : 'Reinstate Student'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PortalLayout>
  );
}
