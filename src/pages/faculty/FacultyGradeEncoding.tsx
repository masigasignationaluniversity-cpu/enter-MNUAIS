import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Send, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import type { GradeValue } from '../../lib/types';

const GRADE_OPTIONS: GradeValue[] = ['1.0','1.25','1.5','1.75','2.0','2.25','2.5','2.75','3.0','4','5','INC','DRP'];
const REMOVAL_OPTIONS: GradeValue[] = ['1.0','1.25','1.5','1.75','2.0','2.25','2.5','2.75','3.0','5'];

const gradeColor = (g: GradeValue | null) => {
  if (!g) return 'text-muted-foreground';
  if (['1.0','1.25','1.5','1.75'].includes(g)) return 'text-secondary font-bold';
  if (['2.0','2.25','2.5','2.75','3.0'].includes(g)) return 'text-foreground font-semibold';
  if (g === '4') return 'text-yellow-600 font-bold';
  if (g === '5') return 'text-destructive font-bold';
  if (g === 'INC') return 'text-orange-600 font-bold';
  if (g === 'DRP') return 'text-muted-foreground';
  return 'text-foreground';
};

export default function FacultyGradeEncoding() {
  const { state, submitGrade, submitGradesBatch, submitRemovalGrade, getActiveTerm } = useApp();
  const { toast } = useToast();
  const me = state.currentUser!;
  const activeTerm = getActiveTerm();

  const myClasses = activeTerm
    ? state.sections.filter(s => s.facultyId === me.id && s.termId === activeTerm.id)
    : [];

  const [selectedSec, setSelectedSec] = useState(myClasses[0]?.id ?? '');
  const currentSec = state.sections.find(s => s.id === selectedSec);
  const currentCourse = currentSec ? state.courses.find(c => c.id === currentSec.courseId) : null;

  const sectionGrades = selectedSec
    ? state.grades.filter(g => g.sectionId === selectedSec)
    : [];

  const gradeSubmissionOpen = activeTerm?.controls.gradeSubmissionOpen ?? false;

  const handleSubmitAll = () => {
    if (!gradeSubmissionOpen) {
      toast({ title: 'Grade submission is closed', variant: 'destructive' });
      return;
    }
    const hasUnencoded = sectionGrades.some(g => g.grade === null);
    if (hasUnencoded) {
      toast({ title: 'Incomplete grades', description: 'Please encode all grades before submitting.', variant: 'destructive' });
      return;
    }
    submitGradesBatch(selectedSec);
    toast({ title: 'Grades submitted!', description: 'Students can now view their grades after submitting evaluations.' });
  };

  const incOrFourGrades = sectionGrades.filter(g => g.grade === 'INC' || g.grade === '4' || g.grade === '5');

  return (
    <PortalLayout title="Grade Encoding">
      <div className="space-y-5">
        {!gradeSubmissionOpen && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800">
            <AlertTriangle size={16} />
            <span className="text-sm font-medium">Grade submission is currently closed by the administrator.</span>
          </div>
        )}

        {myClasses.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground">No classes assigned for the active term.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Section selector */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Select Section</p>
                <div className="flex gap-2 flex-wrap">
                  {myClasses.map(sec => {
                    const course = state.courses.find(c => c.id === sec.courseId);
                    return (
                      <button
                        key={sec.id}
                        onClick={() => setSelectedSec(sec.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors
                          ${selectedSec === sec.id
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-card text-foreground border-border hover:bg-muted'}`}
                      >
                        {course?.code} - {sec.sectionCode}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <Tabs defaultValue="encode">
              <TabsList className="bg-muted">
                <TabsTrigger value="encode">Encode Grades</TabsTrigger>
                <TabsTrigger value="removal" className="flex items-center gap-1.5">
                  Removal / Completion
                  {incOrFourGrades.length > 0 && (
                    <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 text-xs">{incOrFourGrades.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="encode">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <CardTitle className="text-base">
                        {currentCourse?.code} — Section {currentSec?.sectionCode}
                      </CardTitle>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">
                          {sectionGrades.filter(g => g.grade !== null).length}/{sectionGrades.length} encoded
                        </span>
                        {sectionGrades.every(g => g.submitted) && sectionGrades.length > 0 ? (
                          <Badge className="bg-secondary/10 text-secondary border-secondary/30 flex items-center gap-1">
                            <CheckCircle size={12} /> Submitted
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            className="bg-primary hover:bg-primary/90 gap-1.5"
                            onClick={handleSubmitAll}
                            disabled={!gradeSubmissionOpen}
                          >
                            <Send size={13} /> Submit All Grades
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 px-3 text-muted-foreground font-semibold text-xs uppercase tracking-wide">Student</th>
                            <th className="text-left py-2 px-3 text-muted-foreground font-semibold text-xs uppercase tracking-wide">Student No.</th>
                            <th className="text-left py-2 px-3 text-muted-foreground font-semibold text-xs uppercase tracking-wide">Grade</th>
                            <th className="text-left py-2 px-3 text-muted-foreground font-semibold text-xs uppercase tracking-wide">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sectionGrades.map(g => {
                            const student = state.users.find(u => u.id === g.studentId);
                            return (
                              <tr key={g.id} className="border-b border-border/50 hover:bg-muted/20">
                                <td className="py-2.5 px-3 font-medium text-foreground">{student?.name}</td>
                                <td className="py-2.5 px-3 text-muted-foreground text-xs">{student?.studentNumber}</td>
                                <td className="py-2.5 px-3">
                                  {g.submitted ? (
                                    <span className={`font-bold ${gradeColor(g.grade)}`}>{g.grade ?? '—'}</span>
                                  ) : (
                                    <Select
                                      value={g.grade ?? ''}
                                      onValueChange={v => submitGrade(g.id, v as GradeValue)}
                                    >
                                      <SelectTrigger className="h-8 w-28 text-xs">
                                        <SelectValue placeholder="Select" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {GRADE_OPTIONS.map(opt => (
                                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                </td>
                                <td className="py-2.5 px-3">
                                  {g.submitted
                                    ? <Badge className="text-xs bg-secondary/10 text-secondary border-secondary/30">Submitted</Badge>
                                    : g.grade
                                      ? <Badge className="text-xs bg-yellow-50 text-yellow-700 border-yellow-300">Encoded</Badge>
                                      : <Badge variant="outline" className="text-xs text-muted-foreground">Pending</Badge>
                                  }
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {sectionGrades.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-8">No students enrolled in this section.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="removal">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Removal / Completion Grades</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">Encode removal grades for students with 4, 5, or INC grades.</p>
                  </CardHeader>
                  <CardContent>
                    {incOrFourGrades.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-6 text-center">No students eligible for removal/completion.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-2 px-3 text-muted-foreground font-semibold text-xs uppercase tracking-wide">Student</th>
                              <th className="text-left py-2 px-3 text-muted-foreground font-semibold text-xs uppercase tracking-wide">Original Grade</th>
                              <th className="text-left py-2 px-3 text-muted-foreground font-semibold text-xs uppercase tracking-wide">Removal Grade</th>
                            </tr>
                          </thead>
                          <tbody>
                            {incOrFourGrades.map(g => {
                              const student = state.users.find(u => u.id === g.studentId);
                              return (
                                <tr key={g.id} className="border-b border-border/50 hover:bg-muted/20">
                                  <td className="py-2.5 px-3 font-medium text-foreground">{student?.name}</td>
                                  <td className="py-2.5 px-3">
                                    <span className={`font-bold ${gradeColor(g.grade)}`}>{g.grade}</span>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <Select
                                      value={g.removalGrade ?? ''}
                                      onValueChange={v => submitRemovalGrade(g.id, v as GradeValue)}
                                    >
                                      <SelectTrigger className="h-8 w-28 text-xs">
                                        <SelectValue placeholder="Select" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {REMOVAL_OPTIONS.map(opt => (
                                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </PortalLayout>
  );
}
