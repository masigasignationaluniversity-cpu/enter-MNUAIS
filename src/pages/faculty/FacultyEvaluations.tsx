import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Info, AlertTriangle, ChevronDown } from 'lucide-react';
import { EVAL_QUESTIONS } from '../../lib/mockData';

// Exclude N/A (6) from numeric average
function avgRatings(vals: number[]): string {
  const numeric = vals.filter(v => v >= 1 && v <= 5);
  if (numeric.length === 0) return 'N/A';
  return (numeric.reduce((a, b) => a + b, 0) / numeric.length).toFixed(2);
}

export default function FacultyEvaluations() {
  const { state, getActiveTerm } = useApp();
  const me = state.currentUser;
  const activeTerm = getActiveTerm();
  const allTerms = state.terms;
  const [selectedTermId, setSelectedTermId] = useState(activeTerm?.id ?? allTerms[0]?.id ?? '');

  if (!me) return null;

  const selectedTerm = allTerms.find(t => t.id === selectedTermId);
  const termEvals = selectedTerm
    ? state.evaluations.filter(e => e.facultyId === me.id && e.termId === selectedTerm.id)
    : [];
  const termClasses = selectedTerm
    ? state.sections.filter(s => s.facultyId === me.id && s.termId === selectedTerm.id)
    : [];

  const termGradesSubmitted = termClasses.every(sec => {
    const grades = state.grades.filter(g => g.sectionId === sec.id);
    return grades.length === 0 || grades.every(g => g.submitted);
  });

  const allNumericRatings = termEvals.flatMap(e =>
    e.responses.map(r => r.rating).filter(v => v >= 1 && v <= 5)
  );
  const overallAvg = avgRatings(allNumericRatings.length > 0 ? allNumericRatings : []);

  return (
    <PortalLayout title="Student Evaluation of Teaching (SET)">
      <div className="space-y-5">

        {/* Semester selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground shrink-0">
            <ChevronDown size={16} />
            Semester:
          </div>
          <Select value={selectedTermId} onValueChange={setSelectedTermId}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Select semester..." />
            </SelectTrigger>
            <SelectContent>
              {allTerms.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  <span className="flex items-center gap-2">
                    {t.name}
                    {t.isActive && (
                      <Badge className="bg-secondary text-secondary-foreground text-xs h-4 px-1 ml-1">Active</Badge>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!selectedTerm ? (
          <div className="portal-panel">
            <div className="bg-[#8B0000] text-white px-4 py-2.5 font-bold text-sm">Student Evaluation of Teaching (SET)</div>
            <div className="py-10 text-center bg-background">
              <p className="text-muted-foreground">Select a semester to view results.</p>
            </div>
          </div>
        ) : !termGradesSubmitted && selectedTerm.isActive ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50/70 border border-amber-200 text-yellow-800 text-sm font-medium">
              <AlertTriangle size={16} />
              Submit all grades first to unlock student evaluation results.
            </div>
            <div className="portal-panel">
              <div className="bg-[#8B0000] text-white px-4 py-2.5 font-bold text-sm">Student Evaluation of Teaching (SET)</div>
              <div className="py-10 text-center bg-background">
                <Info size={32} className="text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">Grades must be submitted before results are visible.</p>
              </div>
            </div>
          </div>
        ) : termEvals.length === 0 ? (
          <div className="portal-panel">
            <div className="bg-[#8B0000] text-white px-4 py-2.5 font-bold text-sm">Student Evaluation of Teaching (SET)</div>
            <div className="py-10 text-center bg-background">
              <p className="text-muted-foreground">No evaluations received for {selectedTerm.name}.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-5">

            {/* Summary banner */}
            <div className="portal-panel">
              <div className="bg-[#8B0000] text-white px-4 py-2.5 font-bold text-sm">
                Summary — {selectedTerm.name}
              </div>
              <div className="p-4 bg-background flex items-center gap-8 flex-wrap">
                <div className="text-center">
                  <p className="text-4xl font-bold text-foreground">{overallAvg}</p>
                  <p className="text-xs text-muted-foreground mt-1">Overall Average</p>
                  <p className="text-xs text-muted-foreground">(out of 5.00)</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold text-foreground">{termEvals.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total Responses</p>
                </div>
                <div className="flex-1 min-w-[200px]">
                  {[5, 4, 3, 2, 1].map(r => {
                    const cnt = termEvals.flatMap(e => e.responses).filter(res => res.rating === r).length;
                    const total = termEvals.flatMap(e => e.responses).filter(res => res.rating >= 1 && res.rating <= 5).length;
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

            {/* Per question breakdown — SET table format */}
            <div className="portal-panel">
              <div className="flex items-center justify-between bg-[#8B0000] text-white px-4 py-2.5">
                <span className="font-bold text-sm">In this class the teacher</span>
                <span className="font-bold text-sm">Avg Rating</span>
              </div>
              {EVAL_QUESTIONS.map((q, idx) => {
                const vals = termEvals.flatMap(e =>
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
                      {/* Mini bar */}
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden hidden sm:block">
                        <div
                          className="h-full bg-[#8B0000] rounded-full"
                          style={{ width: avgNum > 0 ? `${(avgNum / 5) * 100}%` : '0%' }}
                        />
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-sm text-foreground">{avg}</span>
                        <p className="text-[10px] text-muted-foreground leading-tight">
                          n={numericVals.length}{naCount > 0 ? ` · ${naCount} N/A` : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Per class section */}
            <div className="portal-panel">
              <div className="bg-[#8B0000] text-white px-4 py-2.5 font-bold text-sm">By Class Section</div>
              <div className="p-4 bg-background space-y-3">
                {termClasses.map(sec => {
                  const secEvals = termEvals.filter(e => e.sectionId === sec.id);
                  const course = state.courses.find(c => c.id === sec.courseId);
                  const secVals = secEvals.flatMap(e =>
                    e.responses.map(r => r.rating).filter(v => v >= 1 && v <= 5)
                  );
                  const avg = avgRatings(secVals);
                  const comments = secEvals.filter(e => e.comment?.trim());

                  return (
                    <div key={sec.id} className="rounded-lg border border-border overflow-hidden">
                      <div className="flex items-center justify-between p-3 bg-muted/40">
                        <div>
                          <p className="font-semibold text-foreground text-sm">{course?.code} — Sec {sec.sectionCode}</p>
                          <p className="text-xs text-muted-foreground">{secEvals.length} response(s)</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{avg}</span>
                          {avg !== 'N/A' && (
                            <span className="text-xs text-muted-foreground">/ 5.00</span>
                          )}
                        </div>
                      </div>
                      {comments.length > 0 && (
                        <div className="p-3 space-y-2 border-t border-border bg-background">
                          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                            <Info size={12} /> Student Comments ({comments.length})
                          </p>
                          {comments.map((e, i) => (
                            <div key={e.id} className="text-xs italic text-foreground/80 bg-muted/30 border border-border rounded px-3 py-2">
                              <span className="text-muted-foreground font-normal not-italic mr-1">#{i + 1}</span>
                              "{e.comment}"
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}
      </div>
    </PortalLayout>
  );
}
