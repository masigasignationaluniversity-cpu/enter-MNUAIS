import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { Badge } from '../../components/ui/badge';
import { TermSelect } from '@/components/shared/TermSelect';
import { StatusBanner } from '@/components/shared/StatusBanner';
import { Lock, CheckCircle, Award, ChevronDown, Clock, AlertCircle, Info } from 'lucide-react';
import type { GradeValue } from '../../lib/types';
import { getEffectiveGradeWithRules, getPrescriptionDeadlineLabel } from '../../lib/academic';

const gradeColor = (g: GradeValue | null) => {
  if (!g) return '';
  if (['1.0','1.25','1.5','1.75'].includes(g)) return 'text-secondary font-bold';
  if (['2.0','2.25','2.5','2.75','3.0'].includes(g)) return 'text-foreground font-semibold';
  if (g === 'P' || g === 'S') return 'text-secondary font-bold';
  if (g === '4') return 'text-yellow-600 font-bold';
  if (g === '5' || g === 'F' || g === 'U') return 'text-destructive font-bold';
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
  if (g === 'P' || g === 'S') return 'Passed';
  if (g === 'F' || g === 'U') return 'Failed';
  return '';
};

export default function StudentGrades() {
  const { state, getActiveTerm, canStudentViewGrades } = useApp();
  const me = state.currentUser;
  const activeTerm = getActiveTerm();
  const allTerms = state.terms;

  // Only consider terms that still exist (guard against race-condition orphaned data)
  const existingTermIds = new Set(allTerms.map(t => t.id));

  const relevantTermIds = new Set([
    ...state.enrollments.filter(e => e.studentId === me?.id && existingTermIds.has(e.termId)).map(e => e.termId),
    ...state.grades.filter(g => g.studentId === me?.id && existingTermIds.has(g.termId)).map(g => g.termId),
  ]);
  const relevantTerms = allTerms.filter(t => relevantTermIds.has(t.id) || !!t.isActive);

  const defaultTerm = activeTerm?.id ?? relevantTerms[0]?.id ?? '';
  const [selectedTermId, setSelectedTermId] = useState(defaultTerm);

  // Reset selectedTermId if it points to a term that no longer exists
  React.useEffect(() => {
    if (selectedTermId && !allTerms.find(t => t.id === selectedTermId)) {
      setSelectedTermId(activeTerm?.id ?? relevantTerms[0]?.id ?? '');
    }
  }, [allTerms, selectedTermId, activeTerm?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!me) return null;

  const term = allTerms.find(t => t.id === selectedTermId);

  return (
    <PortalLayout title="My Grades">
      <div className="space-y-5">

        <TermSelect terms={relevantTerms} value={selectedTermId} onValueChange={setSelectedTermId} />

        {!term ? (
          <div className="portal-panel">
            <div className="portal-panel-header">Grades</div>
            <div className="py-10 text-center bg-background">
              <p className="text-muted-foreground">No terms available.</p>
            </div>
          </div>
        ) : (() => {
          const canView = canStudentViewGrades(me.id, term.id);
          // Compute per-term GWA without program-course filter:
          // include ALL non-PE/NSTP/HK academic courses with submitted numeric grades.
          const termGWA = (() => {
            const termGrades = state.grades.filter(g =>
              g.studentId === me.id && g.termId === term.id && g.submitted && g.grade !== null
            );
            let tw = 0, tu = 0;
            termGrades.forEach(g => {
              const sec = state.sections.find(s => s.id === g.sectionId);
              const course = sec ? state.courses.find(c => c.id === sec.courseId) : undefined;
              if (!course || course.isPE || course.isNSTP || /^HK\b/i.test(course.code)) return;
              const enr = state.enrollments.find(
                e => e.studentId === me.id && e.sectionId === g.sectionId && e.termId === term.id
              );
              if (enr?.status === 'dropped') return;
              const effectiveGrade = getEffectiveGradeWithRules(g, state.grades, state.sections, state.terms);
              const numGrade = parseFloat(effectiveGrade as string);
              if (isNaN(numGrade)) return;
              tw += numGrade * course.units;
              tu += course.units;
            });
            return tu > 0 ? Math.round((tw / tu) * 100) / 100 : 0;
          })();

          // Only finalized (officially enrolled) sections + officially-dropped ones with a grade
          // Guard: only consider enrollments where the section still exists (not from deleted term)
          const hasFinalized = !!state.finalizedEnlistments.find(f => f.studentId === me.id && f.termId === term.id);
          const rawEnrollments = state.enrollments.filter(e => {
            if (e.studentId !== me.id || e.termId !== term.id) return false;
            // Skip if section was removed (e.g. from a term cascade)
            if (!state.sections.find(s => s.id === e.sectionId)) return false;
            // Finalized enrollments always show
            if (e.status === 'enrolled') return true;
            // 'enlisted' enrollments for a finalized student = post-finalization prerog/consent approvals
            // (legacy data: enlistWithPrerogative used to always create 'enlisted'; new code creates 'enrolled')
            if (e.status === 'enlisted' && hasFinalized) return true;
            if (e.status === 'dropped') {
              const g = state.grades.find(
                gr => gr.studentId === me.id && gr.sectionId === e.sectionId && gr.termId === term.id
              );
              // Show dropped if officially dropped (DRP grade) or has a removalSubmitted completion grade
              if (g?.grade === 'DRP' && g.submitted) return true;
              if (g?.removalSubmitted) return true;
            }
            return false;
          });

          // Deduplicate by sectionId — non-dropped takes priority over dropped
          const seenSections = new Map<string, typeof rawEnrollments[0]>();
          for (const e of rawEnrollments) {
            const existing = seenSections.get(e.sectionId);
            if (!existing || (existing.status === 'dropped' && e.status !== 'dropped')) {
              seenSections.set(e.sectionId, e);
            }
          }
          // Filter out child (lab/rec) sections — grades belong to the parent lecture only
          const enrollments = Array.from(seenSections.values()).filter(e => {
            const sec = state.sections.find(s => s.id === e.sectionId);
            return !sec?.parentSectionId;
          });

          // Mirror canStudentViewGrades: same ficEvalOpen + window check for counter display
          const now = new Date();
          const evalFrom = term.evaluationFrom ? new Date(term.evaluationFrom) : null;
          const evalUntil = term.evaluationUntil ? new Date(term.evaluationUntil) : null;
          // Match canStudentViewGrades: open-ended if only start date is set
          const withinWindow = evalFrom
            ? (evalUntil ? now >= evalFrom && now <= evalUntil : now >= evalFrom)
            : false;
          const termFicEvalOpen = (term.controls?.ficEvalOpen ?? false) || withinWindow;

          const evalSectionIds = !termFicEvalOpen ? [] : state.enrollments
            .filter(e => {
              if (e.studentId !== me.id || e.termId !== term.id || e.status !== 'enrolled') return false;
              const sec = state.sections.find(s => s.id === e.sectionId);
              if (!sec) return false; // deleted section
              if (sec.sectionCode === '__MANUAL__') return false;
              const course = state.courses.find(c => c.id === sec.courseId);
              if (!course) return false; // deleted course
              return true;
            })
            .map(e => e.sectionId);
          const evalSectionSet = new Set(evalSectionIds);
          const evalRequired = evalSectionIds.length;
          const completedEvals = state.evaluations.filter(e =>
            e.studentId === me.id && e.termId === term.id && evalSectionSet.has(e.sectionId)
          ).length;

          // Build grade rows — one per enrollment (grade may not exist yet if faculty hasn't submitted)
          const gradeRows = enrollments.map(enr => {
            const section = state.sections.find(s => s.id === enr.sectionId);
            const course = section ? state.courses.find(c => c.id === section.courseId) : undefined;
            // Grade lookup: for Lec+Lab/Rec courses, the lab/rec faculty submits the grade
            // under the CHILD section's sectionId (not the lecture's). So always check the child
            // section's grade — prefer it if it is submitted.
            let grade = state.grades.find(g => g.studentId === me.id && g.sectionId === enr.sectionId && g.termId === term.id);
            if (section) {
              const childSec = state.sections.find(s => s.parentSectionId === section.id && s.termId === term.id);
              if (childSec) {
                const childGrade = state.grades.find(g => g.studentId === me.id && g.sectionId === childSec.id && g.termId === term.id);
                // Prefer child grade if submitted, or if there's no lecture grade record at all
                if (childGrade && (childGrade.submitted || !grade)) grade = childGrade;
              }
            }
            return section && course ? { section, course, grade: grade ?? null } : null;
          }).filter(Boolean) as Array<{ section: NonNullable<ReturnType<typeof state.sections.find>>; course: NonNullable<ReturnType<typeof state.courses.find>>; grade: typeof state.grades[0] | null }>;

          const submittedCount = gradeRows.filter(r => r.grade?.grade !== 'DRP' && r.grade?.submitted).length;
          const gradedRequired = gradeRows.filter(r => r.grade?.grade !== 'DRP').length;
          const allSubmitted = gradedRequired > 0 && gradeRows.filter(r => r.grade?.grade !== 'DRP').every(r => r.grade?.submitted);

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
                  {termFicEvalOpen ? (
                    <>
                      <p className="text-sm text-muted-foreground max-w-xs">
                        Submit all your faculty evaluations to unlock your grade report.
                      </p>
                      <div className="mt-2 space-y-1.5 text-sm w-full max-w-xs">
                        <div className="flex items-center justify-between p-2 rounded bg-muted/60 border border-border">
                          <span className="text-muted-foreground">Faculty evaluations submitted</span>
                          <span className={`font-semibold ${completedEvals >= evalRequired ? 'text-secondary' : 'text-yellow-600'}`}>
                            {completedEvals}/{evalRequired}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground max-w-xs">
                      Your grade report will be available after the Faculty Evaluation period opens and you have submitted all your evaluations.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pending grades notice */}
              {!allSubmitted && (
                <StatusBanner type="notice" title="Grades Being Processed" description={<><strong>{submittedCount}/{gradedRequired}</strong> faculty {submittedCount === 1 ? 'has' : 'have'} submitted grades. Rows marked <span className="italic">Pending</span> will update automatically.</>} />
              )}

              {/* Term GWA — only show if all grades submitted */}
              {allSubmitted && (
                <div className="portal-panel">
                  <div className="portal-panel-header">
                    <Award size={14} /> {term.name} — GWA
                  </div>
                  <div className="p-4 bg-background flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${termGWA > 0 ? 'bg-primary' : 'bg-muted'}`}>
                      <Award size={22} className={termGWA > 0 ? 'text-primary-foreground' : 'text-muted-foreground'} />
                    </div>
                    <div>
                      {termGWA > 0 ? (
                        <>
                          <p className="text-3xl font-bold text-foreground">{termGWA.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">(Excluding HK, PE, and NSTP)</p>
                        </>
                      ) : (
                        <>
                          <p className="text-base font-semibold text-muted-foreground">Incomputable GWA</p>
                          <p className="text-xs text-muted-foreground">Enrolled courses are not included in GWA calculation.</p>
                        </>
                      )}
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
                          const isDRP = grade?.grade === 'DRP' && grade.submitted;
                          // Apply all academic rules — auto-converts 4.0→5.0 when prescription expires
                          const effGrade = grade
                            ? getEffectiveGradeWithRules(grade, state.grades, state.sections, state.terms)
                            : null;
                          const wasAutoConverted = grade?.grade === '4' && effGrade === '5';
                          const rem = gradeRemarks(effGrade);
                          const remClass = rem === 'Passed' ? 'bg-green-100 text-green-700 border-green-300'
                            : rem === 'Failed' ? 'bg-red-100 text-red-700 border-red-300'
                            : rem === 'Conditional' ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
                            : rem === 'Dropped' ? 'bg-slate-100 text-slate-600 border-slate-300'
                            : 'bg-muted text-muted-foreground border-border';
                          // Prescription info for INC / 4.0 grades
                          const needsRemoval = hasGrade && grade && (grade.grade === 'INC' || grade.grade === '4') && !grade.removalSubmitted;
                          const dl = needsRemoval ? getPrescriptionDeadlineLabel(grade!.termId, state.terms) : null;

                          return (
                            <React.Fragment key={section.id}>
                            <tr className={`border-b border-border/50 hover:bg-muted/20 ${isDRP ? 'bg-slate-50/60 opacity-75' : ''}`}>
                              <td className={`py-2.5 px-3 font-semibold ${isDRP ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{course.code}</td>
                              <td className={`py-2.5 px-3 ${isDRP ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{course.title}</td>
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
                            {/* Semester-to-complete-by notice for INC / 4.0 */}
                            {dl && (
                              <tr key={`${section.id}-dl`} className="border-b border-border/50 bg-muted/5">
                                <td colSpan={7} className="px-3 py-1.5">
                                  <div className={`flex items-center gap-2 text-xs rounded px-2 py-1 ${dl.expired ? 'text-red-700 bg-red-50 border border-red-200' : dl.urgent ? 'text-amber-700 bg-amber-50 border border-amber-200' : 'text-blue-700 bg-blue-50 border border-blue-200'}`}>
                                    {dl.expired ? <AlertCircle size={11} /> : dl.urgent ? <Clock size={11} /> : <Info size={11} />}
                                    {dl.expired
                                      ? (grade!.grade === '4' ? 'Deadline semester passed — this 4.0 has been automatically converted to 5.0.' : 'Deadline semester passed for completing this INC.')
                                      : dl.urgent
                                        ? `Last semester to complete this grade: ${dl.label}. If not resolved, it will automatically become 5.0.`
                                        : `Must be completed by: ${dl.label}`
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
