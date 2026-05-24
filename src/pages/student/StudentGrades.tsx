import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Lock, CheckCircle, Award } from 'lucide-react';
import type { GradeValue } from '../../lib/types';

const gradeColor = (g: GradeValue | null) => {
  if (!g) return '';
  if (['1.0','1.25','1.5','1.75'].includes(g)) return 'text-secondary font-bold';
  if (['2.0','2.25','2.5','2.75','3.0'].includes(g)) return 'text-foreground font-semibold';
  if (g === '4') return 'text-yellow-600 font-bold';
  if (g === '5') return 'text-destructive font-bold';
  if (g === 'INC') return 'text-orange-600 font-bold';
  if (g === 'DRP') return 'text-muted-foreground';
  return 'text-foreground font-semibold';
};

const gradeRemarks = (g: GradeValue | null) => {
  if (!g) return '';
  const n = parseFloat(g);
  if (!isNaN(n) && n <= 3.0) return 'Passed';
  if (g === '4') return 'Conditional';
  if (g === '5') return 'Failed';
  if (g === 'INC') return 'Incomplete';
  if (g === 'DRP') return 'Dropped';
  if (g === 'P') return 'Passed';
  if (g === 'F') return 'Failed';
  return '';
};

export default function StudentGrades() {
  const { state, getActiveTerm, getStudentGrades, canStudentViewGrades, computeGWA } = useApp();
  const me = state.currentUser;
  if (!me) return null;
  const activeTerm = getActiveTerm();
  const allTerms = state.terms;

  return (
    <PortalLayout title="My Grades">
      <div className="space-y-5">
        <Tabs defaultValue={activeTerm?.id ?? allTerms[0]?.id}>
          <TabsList className="bg-muted">
            {allTerms.map(t => (
              <TabsTrigger key={t.id} value={t.id}>
                {t.name}
                {t.isActive && <Badge className="ml-1.5 bg-secondary text-secondary-foreground text-xs h-4 px-1">Active</Badge>}
              </TabsTrigger>
            ))}
          </TabsList>

          {allTerms.map(term => {
            const canView = canStudentViewGrades(me.id, term.id);
            const grades = getStudentGrades(me.id, term.id);
            const { gwa: termGWA } = computeGWA(me.id, term.id);

            const completedEvals = state.evaluations.filter(e => e.studentId === me.id && e.termId === term.id).length;
            const enrolledCount = state.enrollments.filter(e => e.studentId === me.id && e.termId === term.id && e.status !== 'dropped').length;
            const allGradesSubmitted = grades.length > 0 && grades.every(g => g.grade.submitted);

            return (
              <TabsContent key={term.id} value={term.id}>
                {!canView ? (
                  <Card>
                    <CardContent className="py-10">
                      <div className="flex flex-col items-center gap-3 text-center">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                          <Lock size={28} className="text-muted-foreground" />
                        </div>
                        <p className="text-foreground font-semibold">Grades Not Yet Available</p>
                        <p className="text-sm text-muted-foreground max-w-xs">
                          Grades will be visible once you have submitted all faculty evaluations AND your faculty has submitted the grades.
                        </p>
                        <div className="mt-2 space-y-1.5 text-sm w-full max-w-xs">
                          <div className="flex items-center justify-between p-2 rounded bg-muted/60 border border-border">
                            <span className="text-muted-foreground">Faculty evaluations submitted</span>
                            <span className={`font-semibold ${completedEvals >= enrolledCount ? 'text-secondary' : 'text-yellow-600'}`}>
                              {completedEvals}/{enrolledCount}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-2 rounded bg-muted/60 border border-border">
                            <span className="text-muted-foreground">Grades submitted by faculty</span>
                            <span className={`font-semibold ${allGradesSubmitted ? 'text-secondary' : 'text-yellow-600'}`}>
                              {allGradesSubmitted ? 'Yes' : 'No'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {/* Term GWA */}
                    {termGWA > 0 && (
                      <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                            <Award size={22} className="text-primary-foreground" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{term.name} — GWA</p>
                            <p className="text-3xl font-bold text-foreground">{termGWA.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">(Excluding PE and NSTP)</p>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Grades table */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <CheckCircle size={16} className="text-secondary" />
                          Grade Report — {term.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border bg-muted/40">
                                {['Course Code', 'Course Title', 'Type', 'Units', 'Grade', 'Removal', 'Remarks'].map(h => (
                                  <th key={h} className="text-left py-2.5 px-3 text-muted-foreground font-semibold text-xs uppercase tracking-wide">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {grades.map(({ grade, section, course }) => (
                                <tr key={grade.id} className="border-b border-border/50 hover:bg-muted/20">
                                  <td className="py-2.5 px-3 font-semibold text-foreground">{course.code}</td>
                                  <td className="py-2.5 px-3 text-foreground">{course.title}</td>
                                  <td className="py-2.5 px-3">
                                    <Badge className="text-xs bg-muted text-muted-foreground border-border">{course.type}</Badge>
                                    {course.isPE && <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-300 ml-1">PE</Badge>}
                                    {course.isNSTP && <Badge className="text-xs bg-purple-100 text-purple-700 border-purple-300 ml-1">NSTP</Badge>}
                                  </td>
                                  <td className="py-2.5 px-3 text-foreground">{course.units}{course.labUnits ? `+${course.labUnits}` : ''}</td>
                                  <td className="py-2.5 px-3">
                                    <span className={`text-base ${gradeColor(grade.grade)}`}>
                                      {grade.grade ?? '—'}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    {grade.removalGrade
                                      ? <span className={`font-bold ${gradeColor(grade.removalGrade)}`}>{grade.removalGrade}</span>
                                      : <span className="text-muted-foreground">—</span>
                                    }
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <Badge className={`text-xs ${gradeRemarks(grade.removalGrade ?? grade.grade) === 'Passed' ? 'bg-green-100 text-green-700 border-green-300' : gradeRemarks(grade.removalGrade ?? grade.grade) === 'Failed' ? 'bg-red-100 text-red-700 border-red-300' : 'bg-muted text-muted-foreground border-border'}`}>
                                      {gradeRemarks(grade.removalGrade ?? grade.grade) || '—'}
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {grades.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No grades for this term.</p>}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </PortalLayout>
  );
}
