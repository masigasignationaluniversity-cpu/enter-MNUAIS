import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '../../components/ui/alert-dialog';
import { Search, LockOpen, CheckSquare, User, Info } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

export default function OCSUnfinalize() {
  const { state, unfinalizeEnlistment, getActiveTerm } = useApp();
  const { toast } = useToast();
  const [search, setSearch] = useState('');

  const activeTerm = getActiveTerm();
  const dept = state.currentUser?.department ?? '';

  // Get all finalized records for the active term
  const termFinalizations = activeTerm
    ? state.finalizedEnlistments.filter(f => f.termId === activeTerm.id)
    : [];

  // For each finalized student, check if they have enlisted sections in this OCS dept's courses
  const deptCourseIds = new Set(
    dept ? state.courses.filter(c => c.department === dept).map(c => c.id) : state.courses.map(c => c.id)
  );

  const finalizedStudents = termFinalizations
    .map(fin => {
      const student = state.users.find(u => u.id === fin.studentId);
      if (!student || student.role !== 'student') return null;

      // Get their enlisted sections in this term
      const enlistedSections = state.sections.filter(sec => {
        if (!activeTerm || sec.termId !== activeTerm.id) return false;
        const hasEnrolled = state.enrollments.some(
          e => e.studentId === fin.studentId && e.sectionId === sec.id && e.status !== 'dropped'
        );
        return hasEnrolled;
      });

      // Filter to only students who have sections in OCS dept courses (or show all if no dept filter)
      const hasDeptSection = enlistedSections.some(sec => deptCourseIds.has(sec.courseId));
      if (dept && !hasDeptSection) return null;

      return { student, fin, enlistedSections };
    })
    .filter(Boolean) as Array<{
      student: typeof state.users[0];
      fin: typeof termFinalizations[0];
      enlistedSections: typeof state.sections;
    }>;

  // Search filter
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
      description: `${studentName}'s enlistment has been unlocked. They can now add or drop courses.`,
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
              {activeTerm ? activeTerm.name : 'No active term'} • {filtered.length} student(s)
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

        {/* No active term */}
        {!activeTerm && (
          <Card><CardContent className="py-10 text-center text-muted-foreground">No active term.</CardContent></Card>
        )}

        {/* No finalized students */}
        {activeTerm && filtered.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="font-medium">No finalized students found.</p>
              {search && <p className="text-sm mt-1">Try a different search.</p>}
            </CardContent>
          </Card>
        )}

        {/* Student list */}
        {filtered.map(({ student, fin, enlistedSections }) => {
          const deptSections = enlistedSections.filter(sec => deptCourseIds.has(sec.courseId));
          return (
            <Card key={student.id} className="border-l-4 border-l-green-500">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{student.name}</span>
                        <Badge className="bg-green-100 text-green-800 border-green-200 text-xs gap-1">
                          <CheckSquare className="w-2.5 h-2.5" /> Finalized
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {student.studentNumber && <span className="mr-2">{student.studentNumber}</span>}
                        {student.program && <span>{student.program}</span>}
                        {student.yearLevel && <span className="ml-1">• Year {student.yearLevel}</span>}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Finalized: {new Date(fin.finalizedAt).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {/* Enlisted sections in this dept */}
                      {deptSections.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {deptSections.map(sec => {
                            const course = state.courses.find(c => c.id === sec.courseId);
                            return (
                              <Badge key={sec.id} variant="outline" className="text-xs font-mono">
                                {course?.code ?? sec.courseId} §{sec.sectionCode}
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="border-orange-300 text-orange-700 hover:bg-orange-50 gap-1.5 flex-shrink-0">
                        <LockOpen className="w-3.5 h-3.5" />
                        Unfinalize
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Unfinalize {student.name}'s enlistment?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove their finalization lock for <span className="font-semibold">{activeTerm?.name}</span>.
                          The student will be able to add or drop courses again until they re-finalize or the enlistment period ends.
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
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </PortalLayout>
  );
}
