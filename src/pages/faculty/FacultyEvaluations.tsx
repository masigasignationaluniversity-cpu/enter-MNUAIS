import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { TermSelect } from '@/components/shared/TermSelect';
import { StatusBanner } from '@/components/shared/StatusBanner';
import { Info, AlertTriangle, ChevronDown, ChevronUp, MessageSquare, BookOpen } from 'lucide-react';
import { EVAL_QUESTIONS } from '../../lib/mockData';

// Exclude N/A (6) from numeric average
function avgRatings(vals: number[]): string {
  const numeric = vals.filter(v => v >= 1 && v <= 5);
  if (numeric.length === 0) return 'N/A';
  return (numeric.reduce((a, b) => a + b, 0) / numeric.length).toFixed(2);
}

function ratingColor(avg: string) {
  const n = parseFloat(avg);
  if (isNaN(n)) return 'text-muted-foreground';
  if (n >= 4.5) return 'text-emerald-700 font-bold';
  if (n >= 3.5) return 'text-blue-700 font-bold';
  if (n >= 2.5) return 'text-amber-700 font-bold';
  return 'text-destructive font-bold';
}

export default function FacultyEvaluations() {
  const { state, getActiveTerm } = useApp();
  const me = state.currentUser;
  const activeTerm = getActiveTerm();
  const allTerms = state.terms;

  // Only show terms where faculty has sections
  const relevantTermIds = new Set(state.sections.filter(s => s.facultyId === me?.id).map(s => s.termId));
  const relevantTerms = allTerms.filter(t => relevantTermIds.has(t.id) || !!t.isActive);

  const [selectedTermId, setSelectedTermId] = useState(activeTerm?.id ?? relevantTerms[0]?.id ?? '');
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [showComments, setShowComments] = useState<Set<string>>(new Set());

  if (!me) return null;

  const selectedTerm = allTerms.find(t => t.id === selectedTermId);

  const termClasses = selectedTerm
    ? state.sections.filter(s => s.facultyId === me.id && s.termId === selectedTerm.id)
    : [];
  const termEvals = selectedTerm
    ? state.evaluations.filter(e => e.facultyId === me.id && e.termId === selectedTerm.id)
    : [];

  const termGradesSubmitted = termClasses.every(sec => {
    const grades = state.grades.filter(g => g.sectionId === sec.id);
    return grades.length === 0 || grades.every(g => g.submitted);
  });

  // Group by course (inline computation, no useMemo needed)
  const courseGroupMap = new Map<string, {
    course: typeof state.courses[0] | undefined;
    sections: typeof state.sections;
    evals: typeof state.evaluations;
  }>();
  termClasses.forEach(sec => {
    const course = state.courses.find(c => c.id === sec.courseId);
    const secEvals = termEvals.filter(e => e.sectionId === sec.id);
    const key = sec.courseId;
    if (!courseGroupMap.has(key)) {
      courseGroupMap.set(key, { course, sections: [sec], evals: [...secEvals] });
    } else {
      const g = courseGroupMap.get(key)!;
      g.sections.push(sec);
      g.evals.push(...secEvals);
    }
  });
  const courseGroups = Array.from(courseGroupMap.values()).sort((a, b) =>
    (a.course?.code ?? '').localeCompare(b.course?.code ?? '')
  );

  // Overall stats
  const totalResponses = termEvals.length;
  const allNumericRatings = termEvals.flatMap(e =>
    e.responses.map(r => r.rating).filter(v => v >= 1 && v <= 5)
  );
  const overallAvg = avgRatings(allNumericRatings);

  const toggleCourse = (id: string) => {
    setExpandedCourses(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleComments = (id: string) => {
    setShowComments(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <PortalLayout title="Student Evaluation of Teaching (SET)">
      <div className="space-y-5">

        <TermSelect terms={relevantTerms} value={selectedTermId} onValueChange={setSelectedTermId} />

        {!selectedTerm ? (
          <div className="portal-panel">
            <div className="bg-[#8B0000] text-white px-4 py-2.5 font-bold text-sm">Student Evaluation of Teaching (SET)</div>
            <div className="py-10 text-center bg-background">
              <p className="text-muted-foreground">Select a semester to view results.</p>
            </div>
          </div>
        ) : !termGradesSubmitted && selectedTerm.isActive ? (
          <>
            <StatusBanner type="warning" title="Grades Must Be Submitted First" description="Submit all grades to unlock student evaluation results for this term." />
            <div className="portal-panel">
              <div className="bg-[#8B0000] text-white px-4 py-2.5 font-bold text-sm">Student Evaluation of Teaching (SET)</div>
              <div className="py-10 text-center bg-background">
                <Info size={32} className="text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">Grades must be submitted before results are visible.</p>
              </div>
            </div>
          </>
        ) : termEvals.length === 0 ? (
          <div className="portal-panel">
            <div className="bg-[#8B0000] text-white px-4 py-2.5 font-bold text-sm">Student Evaluation of Teaching (SET)</div>
            <div className="py-10 text-center bg-background">
              <p className="text-muted-foreground">No evaluations received for {selectedTerm.name}.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">

            {/* Overall summary bar */}
            <div className="portal-panel">
              <div className="bg-[#8B0000] text-white px-4 py-2.5 font-bold text-sm flex items-center justify-between">
                <span>Overall Summary — {selectedTerm.name}</span>
                <span className="text-white/80 text-xs font-normal">{totalResponses} total response{totalResponses !== 1 ? 's' : ''}</span>
              </div>
              <div className="p-4 bg-background flex items-center gap-8 flex-wrap">
                <div className="text-center">
                  <p className={`text-4xl ${ratingColor(overallAvg)}`}>{overallAvg}</p>
                  <p className="text-xs text-muted-foreground mt-1">Overall Average</p>
                  <p className="text-xs text-muted-foreground">(out of 5.00)</p>
                </div>
                <div className="flex-1 min-w-[200px]">
                  {[5, 4, 3, 2, 1].map(r => {
                    const cnt = termEvals.flatMap(e => e.responses).filter(res => res.rating === r).length;
                    const total = allNumericRatings.length;
                    const pct = total > 0 ? (cnt / total) * 100 : 0;
                    return (
                      <div key={r} className="flex items-center gap-2 text-xs mb-1">
                        <span className="w-4 text-right font-medium text-foreground">{r}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-[#8B0000] rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-6 text-right text-muted-foreground">{cnt}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Per-course panels */}
            {courseGroups.map(({ course, sections, evals }) => {
              const courseKey = course?.id ?? sections[0]?.courseId ?? '';
              const isExpanded = expandedCourses.has(courseKey);
              const commentsExpanded = showComments.has(courseKey);
              const courseNumericVals = evals.flatMap(e =>
                e.responses.map(r => r.rating).filter(v => v >= 1 && v <= 5)
              );
              const courseAvg = avgRatings(courseNumericVals);
              const allComments = evals.filter(e => e.comment?.trim());
              const sectionLabel = sections.map(s => `Sec ${s.sectionCode}`).join(', ');

              return (
                <div key={courseKey} className="portal-panel overflow-hidden">
                  {/* Course header — always visible */}
                  <button
                    type="button"
                    onClick={() => toggleCourse(courseKey)}
                    className="w-full flex items-center justify-between bg-[#8B0000] hover:bg-[#700000] text-white px-4 py-3 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-4 h-4 shrink-0" />
                      <div>
                        <p className="font-bold text-sm">{course?.code ?? 'Unknown Course'} — {course?.title ?? ''}</p>
                        <p className="text-white/70 text-xs">{sectionLabel} · {evals.length} response{evals.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className={`text-lg font-bold ${courseAvg !== 'N/A' ? 'text-white' : 'text-white/50'}`}>{courseAvg}</span>
                        {courseAvg !== 'N/A' && <p className="text-white/60 text-[10px] leading-none">/ 5.00</p>}
                      </div>
                      {isExpanded
                        ? <ChevronUp className="w-4 h-4 text-white/70" />
                        : <ChevronDown className="w-4 h-4 text-white/70" />}
                    </div>
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="bg-background">
                      {/* Per-question breakdown */}
                      <div className="border-b border-border">
                        <div className="flex items-center justify-between px-4 py-2 bg-muted/40 border-b border-border">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">In this class the teacher</span>
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Avg</span>
                        </div>
                        {EVAL_QUESTIONS.map((q, idx) => {
                          const vals = evals.flatMap(e =>
                            e.responses.filter(r => r.questionId === q.id).map(r => r.rating)
                          );
                          const avg = avgRatings(vals);
                          const numericVals = vals.filter(v => v >= 1 && v <= 5);
                          const naCount = vals.filter(v => v === 6).length;
                          const avgNum = avg !== 'N/A' ? parseFloat(avg) : 0;
                          return (
                            <div
                              key={q.id}
                              className={`flex items-center justify-between px-4 py-3 border-b border-border last:border-0 gap-4 ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}
                            >
                              <p className="text-sm flex-1">{q.text}</p>
                              <div className="shrink-0 flex items-center gap-3">
                                <div className="w-20 h-2 bg-muted rounded-full overflow-hidden hidden sm:block">
                                  <div className="h-full bg-[#8B0000] rounded-full" style={{ width: avgNum > 0 ? `${(avgNum / 5) * 100}%` : '0%' }} />
                                </div>
                                <div className="text-right w-14">
                                  <span className={`text-sm ${ratingColor(avg)}`}>{avg}</span>
                                  <p className="text-[10px] text-muted-foreground leading-tight">
                                    n={numericVals.length}{naCount > 0 ? ` · ${naCount} N/A` : ''}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Section breakdown (if multiple sections) */}
                      {sections.length > 1 && (
                        <div className="px-4 py-3 border-b border-border bg-muted/10">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">By Section</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {sections.map(sec => {
                              const secEvals = evals.filter(e => e.sectionId === sec.id);
                              const secVals = secEvals.flatMap(e => e.responses.map(r => r.rating).filter(v => v >= 1 && v <= 5));
                              const secAvg = avgRatings(secVals);
                              return (
                                <div key={sec.id} className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-xs">
                                  <span className="font-medium">Sec {sec.sectionCode}</span>
                                  <span className={ratingColor(secAvg)}>{secAvg}</span>
                                  <span className="text-muted-foreground">{secEvals.length} resp.</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Comments toggle */}
                      {allComments.length > 0 && (
                        <div className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => toggleComments(courseKey)}
                            className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            {commentsExpanded ? 'Hide' : 'Show'} Student Comments ({allComments.length})
                            {commentsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                          {commentsExpanded && (
                            <div className="mt-3 space-y-2">
                              {allComments.map((e, i) => (
                                <div key={e.id} className="text-xs italic text-foreground/80 bg-muted/30 border border-border rounded px-3 py-2">
                                  <span className="text-muted-foreground font-normal not-italic mr-1">#{i + 1}</span>
                                  "{e.comment}"
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {allComments.length === 0 && (
                        <div className="px-4 py-3 text-xs text-muted-foreground italic">No written comments for this course.</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

          </div>
        )}
      </div>
    </PortalLayout>
  );
}
