import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../../components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '../../components/ui/alert-dialog';
import { Search, LockOpen, CheckSquare, Info } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

export default function OCSUnfinalize() {
  const { state, unfinalizeEnlistment, getActiveTerm } = useApp();
  const { toast } = useToast();
  const [search, setSearch] = useState('');

  const activeTerm = getActiveTerm();
  const dept = state.currentUser?.department ?? '';

  const deptCourseIds = new Set(
    dept ? state.courses.filter(c => c.department === dept).map(c => c.id) : state.courses.map(c => c.id)
  );

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
      const hasDeptSection = enlistedSections.some(sec => deptCourseIds.has(sec.courseId));
      if (dept && !hasDeptSection) return null;
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

  const handleUnfinalize = (studentId: string, studentName: string, termId: string) => {
    unfinalizeEnlistment(studentId, termId);
    toast({
      title: 'Enlistment unfinalized',
      description: `${studentName}'s enlistment has been unlocked.`,
    });
  };

  return (
    <PortalLayout title="Unfinalize Enlistment">
      <div className="space-y-4">
        {/* Info banner */}
        <div className="flex items-start gap-3 p-4 rounded-lg bg-accent border border-accent-foreground/10">
          <Info className="w-4 h-4 text-accent-foreground mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-accent-foreground">OCS: Unfinalize Student Enlistment</p>
            <p className="text-xs text-accent-foreground/80 mt-0.5">
              Remove a student's finalization lock so they can still add or drop courses.
              {dept && <span className="ml-1 font-medium">Showing students enrolled in <span className="text-primary">{dept}</span> courses.</span>}
            </p>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold">Finalized Students</h2>
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
              {search && <p className="text-sm mt-1">Try a different search.</p>}
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
                    const deptSections = enlistedSections.filter(sec => deptCourseIds.has(sec.courseId));
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
                            {deptSections.length > 0
                              ? deptSections.map(sec => {
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
      </div>
    </PortalLayout>
  );
}
