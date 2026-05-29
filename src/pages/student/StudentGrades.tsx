import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { Badge } from '../../components/ui/badge';
import { TermSelect } from '@/components/shared/TermSelect';
import { Lock, CheckCircle, Award, ChevronDown, Clock, AlertCircle, Info } from 'lucide-react';
import type { GradeValue } from '../../lib/types';
import { getEffectiveGradeWithRules, getPrescriptionDeadlineLabel } from '../../lib/academic';

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
  const { state, getActiveTerm, canStudentViewGrades, computeGWA } = useApp();
  const me = state.currentUser;
  const activeTerm = getActiveTerm();
  const allTerms = state.terms;

  const defaultTerm = activeTerm?.id ?? allTerms[0]?.id ?? '';
  const [selectedTermId, setSelectedTermId] = useState(defaultTerm);

  if (!me) return null;

  const term = allTerms.find(t => t.id === selectedTermId);

  return (
    <PortalLayout title="My Grades">
      <div className="space-y-5">

        <TermSelect terms={allTerms} value={selectedTermId} onValueChange={setSelectedTermId} />

        {!term ? (
          <div className="portal-panel">
            <div className="portal-panel-header">Grades</div>
            <div className="py-10 text-center bg-background">
              <p className="text-muted-foreground">No terms available.</p>
            </div>
          </div>
        ) : (() => {
          const canView = canStudentViewGrades(me.id, term.id);
          const { gwa: termGWA } = computeGWA(me.id, term.id);

          // All enrolled (non-dropped) sections + dropped ones with an official completion/removal grade
          const enrollments = state.enrollments.filter(e => {
            if (e.studentId !== me.id || e.termId !== term.id) return false;
            if (e.status !== 'dropped') return true;
            // Include dropped enrollment if there's an officially submitted removal/completion grade
            const g = state.grades.find(
              gr => gr.studentId === me.id && gr.sectionId === e.sectionId && gr.termId === term.id && gr.removalSubmitted
            );
            return !!g;
          });

          const completedEvals = state.evaluations.filter(e => e.studentId === me.id && e.termId === term.id).length;

          // Build grade rows — one per enrollment (grade may not exist yet if faculty hasn't submitted)
          const gradeRows = enrollments.map(enr => {
            const section = state.sections.find(s => s.id === enr.sectionId);
            const course = section ? state.courses.find(c => c.id === section.courseId) : undefined;
            const grade = state.grades.find(g => g.studentId === me.id && g.sectionId === enr.sectionId && g.termId === term.id);
            return section && course ? { section, course, grade: grade ?? null } : null;
          }).filter(Boolean) as Array<{ section: NonNullable<ReturnType<typeof state.sections.find>>; course: NonNullable<ReturnType<typeof state.courses.find>>; grade: typeof state.grades[0] | null }>;

          const submittedCount = gradeRows.filter(r => r.grade?.submitted).length;
          const allSubmitted = gradeRows.length > 0 && gradeRows.every(r => r.grade?.submitted);

          return !canView ? (
            <div className="portal-panel">
              <div className="portal-panel-header">
                <Lock size={14} /> Grades Not Yet Available
              </div>
              <div className="py-10 bg-background">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <Lock size={28} className="text-muted-foreground" />
                  </div>
                  <p className="text-foreground font-semibold">Grades Not Yet Available</p>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Submit all your faculty evaluations to unlock your grade report.
                  </p>
                  <div className="mt-2 space-y-1.5 text-sm w-full max-w-xs">
                    <div className="flex items-center justify-between p-2 rounded bg-muted/60 border border-border">
                      <span className="text-muted-foreground">Faculty evaluations submitted</span>
                      <span className={`font-semibold ${completedEvals >= enrollments.length ? 'text-secondary' : 'text-yellow-600'}`}>
                        {completedEvals}/{enrollments.length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pending grades notice */}
              {!allSubmitted && (
                <div className="banner banner-warning">
                  <Clock size={15} className="flex-shrink-0" />
                  <span>
                    <strong>Grades are being processed.</strong> {submittedCount}/{gradeRows.length} faculty {submittedCount === 1 ? 'has' : 'have'} submitted grades.
                    Rows marked <span className="italic">Pending</span> will update automatically.
                  </span>
                </div>
              )}

              {/* Term GWA — only show if all grades submitted */}
              {termGWA > 0 && allSubmitted && (
                <div className="portal-panel">
                  <div className="portal-panel-header">
                    <Award size={14} /> {term.name} — GWA
                  </div>
                  <div className="p-4 bg-background flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                      <Award size={22} className="text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-foreground">{termGWA.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">(Excluding HK, PE, and NSTP)</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Grades table */}
              <div className="portal-panel">
                <div className="portal-panel-header">
                  <CheckCircle size={14} /> Grade Report — {term.name}
                </div>
                <div className="bg-background">
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
                        {gradeRows.map(({ grade, section, course }) => {
                          const submitted = grade?.submitted === true;
                          const hasGrade = submitted && grade?.grade != null;
                          // Apply all academic rules — auto-converts 4.0→5.0 when prescription expires
                          const effGrade = grade
                            ? getEffectiveGradeWithRules(grade, state.grades, state.sections, state.terms)
                            : null;
                          const wasAutoConverted = grade?.grade === '4' && !grade.removalSubmitted && effGrade === '5';
                          const rem = gradeRemarks(effGrade);
                          const remClass = rem === 'Passed' ? 'bg-green-100 text-green-700 border-green-300'
                            : rem === 'Failed' ? 'bg-red-100 text-red-700 border-red-300'
                            : rem === 'Conditional' ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
                            : 'bg-muted text-muted-foreground border-border';
                          // Prescription info for INC / 4.0 grades
                          const needsRemoval = hasGrade && grade && (grade.grade === 'INC' || grade.grade === '4') && !grade.removalSubmitted;
                          const dl = needsRemoval ? getPrescriptionDeadlineLabel(grade!.termId, state.terms) : null;

                          return (
                            <React.Fragment key={section.id}>
                            <tr className="border-b border-border/50 hover:bg-muted/20">
                              <td className="py-2.5 px-3 font-semibold text-foreground">{course.code}</td>
                              <td className="py-2.5 px-3 text-foreground">{course.title}</td>
                              <td className="py-2.5 px-3">
                                <Badge className="text-xs bg-muted text-muted-foreground border-border">{course.type}</Badge>
                                {course.isPE && <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-300 ml-1">PE</Badge>}
                                {course.isNSTP && <Badge className="text-xs bg-purple-100 text-purple-700 border-purple-300 ml-1">NSTP</Badge>}
                              </td>
                              <td className="py-2.5 px-3 text-foreground">{course.units}{course.labUnits ? `+${course.labUnits}` : ''}</td>
                              <td className="py-2.5 px-3">
                                {hasGrade
                                  ? <span className={`text-base ${gradeColor(grade!.grade)}`}>{grade!.grade}</span>
                                  : <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs flex items-center gap-1 w-fit">
                                      <Clock size={10} /> Pending
                                    </Badge>
                                }
                              </td>
                              <td className="py-2.5 px-3">
                                {wasAutoConverted ? (
                                  <span className="flex items-center gap-1">
                                    <span className={`font-bold ${gradeColor('5')}`}>5</span>
                                    <Badge className="text-xs bg-red-100 text-red-700 border-red-200 gap-1">
                                      <AlertCircle size={9} /> Auto-converted
                                    </Badge>
                                  </span>
                                ) : grade?.removalGrade ? (
                                  <span className={`font-bold ${gradeColor(grade.removalGrade)}`}>
                                    {grade.removalGrade}
                                    {grade.removalSubmitted && <span className="ml-1 text-xs text-green-600 font-normal">(official)</span>}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                {hasGrade
                                  ? <Badge className={`text-xs ${remClass}`}>{rem || '—'}</Badge>
                                  : <span className="text-muted-foreground text-xs">—</span>
                                }
                              </td>
                            </tr>
                            {/* Prescription deadline notice for INC / 4.0 */}
                            {dl && (
                              <tr key={`${section.id}-dl`} className="border-b border-border/50 bg-muted/5">
                                <td colSpan={7} className="px-3 py-1.5">
                                  <div className={`flex items-center gap-2 text-xs rounded px-2 py-1 ${dl.expired ? 'text-red-700 bg-red-50 border border-red-200' : dl.urgent ? 'text-amber-700 bg-amber-50 border border-amber-200' : 'text-blue-700 bg-blue-50 border border-blue-200'}`}>
                                    {dl.expired ? <AlertCircle size={11} /> : dl.urgent ? <Clock size={11} /> : <Info size={11} />}
                                    {dl.expired
                                      ? (grade!.grade === '4' ? 'Prescription expired — this 4.0 has been auto-converted to 5.0.' : 'Prescription period lapsed.')
                                      : dl.urgent
                                        ? `Urgent: last term to remove/complete this grade. Deadline: ${dl.label}`
                                        : `Prescription deadline: ${dl.label}`
                                    }
                                  </div>
                                </td>
                              </tr>
                            )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                    {gradeRows.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No grades for this term.</p>}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </PortalLayout>
  );
}
