import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Star, Info, AlertTriangle, ChevronDown } from 'lucide-react';
import { EVAL_QUESTIONS } from '../../lib/mockData';

const RatingStars = ({ rating }: { rating: number }) => (
  <div className="flex gap-0.5">
    {[1,2,3,4,5].map(n => (
      <Star key={n} size={14} className={n <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'} />
    ))}
  </div>
);

export default function FacultyEvaluations() {
  const { state, getActiveTerm } = useApp();
  const me = state.currentUser;
  const activeTerm = getActiveTerm();
  const allTerms = state.terms;
  const [selectedTermId, setSelectedTermId] = useState(activeTerm?.id ?? allTerms[0]?.id ?? '');

  if (!me) return null;

  const myClasses = activeTerm
    ? state.sections.filter(s => s.facultyId === me.id && s.termId === activeTerm.id)
    : [];

  // Check if faculty has submitted all grades (prerequisite to see evaluations)
  const allGradesSubmitted = myClasses.every(sec => {
    const grades = state.grades.filter(g => g.sectionId === sec.id);
    return grades.length === 0 || grades.every(g => g.submitted);
  });

  const getEvalsForTerm = (termId: string) =>
    state.evaluations.filter(e => e.facultyId === me.id && e.termId === termId);

  const selectedTerm = allTerms.find(t => t.id === selectedTermId);
  const termEvals = selectedTerm ? getEvalsForTerm(selectedTerm.id) : [];
  const termClasses = selectedTerm
    ? state.sections.filter(s => s.facultyId === me.id && s.termId === selectedTerm.id)
    : [];
  const overallAvg = termEvals.length > 0
    ? (termEvals.reduce((sum, e) => sum + e.overallRating, 0) / termEvals.length).toFixed(2)
    : 'N/A';
  const termGradesSubmitted = termClasses.every(sec => {
    const grades = state.grades.filter(g => g.sectionId === sec.id);
    return grades.length === 0 || grades.every(g => g.submitted);
  });

  return (
    <PortalLayout title="Student Evaluations">
      <div className="space-y-5">
        {!allGradesSubmitted && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800">
            <AlertTriangle size={16} />
            <span className="text-sm font-medium">
              Submit all grades first to unlock student evaluation results.
            </span>
          </div>
        )}

        {/* Term dropdown */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground flex-shrink-0">
            <ChevronDown size={16} />
            Term:
          </div>
          <Select value={selectedTermId} onValueChange={setSelectedTermId}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Select term..." />
            </SelectTrigger>
            <SelectContent>
              {allTerms.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  <span className="flex items-center gap-2">
                    {t.name}
                    {t.isActive && <Badge className="bg-secondary text-secondary-foreground text-xs h-4 px-1 ml-1">Active</Badge>}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!selectedTerm ? (
          <div className="rounded-md overflow-hidden border border-border">
            <div className="bg-primary text-primary-foreground px-4 py-2.5 font-bold text-sm">Student Evaluations</div>
            <div className="py-10 text-center bg-background">
              <p className="text-muted-foreground">Select a term to view evaluations.</p>
            </div>
          </div>
        ) : !termGradesSubmitted && selectedTerm.isActive ? (
          <div className="rounded-md overflow-hidden border border-border">
            <div className="bg-primary text-primary-foreground px-4 py-2.5 font-bold text-sm">Student Evaluations</div>
            <div className="py-10 text-center bg-background">
              <Info size={32} className="text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">Submit all grades first to view evaluations.</p>
            </div>
          </div>
        ) : termEvals.length === 0 ? (
          <div className="rounded-md overflow-hidden border border-border">
            <div className="bg-primary text-primary-foreground px-4 py-2.5 font-bold text-sm">Student Evaluations</div>
            <div className="py-10 text-center bg-background">
              <p className="text-muted-foreground">No evaluations received for {selectedTerm.name}.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Summary */}
            <div className="rounded-md overflow-hidden border border-border">
              <div className="bg-primary text-primary-foreground px-4 py-2.5 font-bold text-sm flex items-center gap-2">
                <Star size={14} /> Evaluation Summary — {selectedTerm.name}
              </div>
              <div className="p-5 bg-gradient-to-r from-primary/5 to-secondary/5">
                <div className="flex items-center gap-6 flex-wrap">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-foreground">{overallAvg}</p>
                    <RatingStars rating={parseFloat(overallAvg) || 0} />
                    <p className="text-xs text-muted-foreground mt-1">Overall Average</p>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {[5,4,3,2,1].map(r => {
                      const cnt = termEvals.filter(e => Math.round(e.overallRating) === r).length;
                      const pct = termEvals.length > 0 ? (cnt / termEvals.length) * 100 : 0;
                      return (
                        <div key={r} className="flex items-center gap-2 text-xs">
                          <div className="flex gap-0.5 w-20">
                            {[1,2,3,4,5].map(n => (
                              <Star key={n} size={10} className={n <= r ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'} />
                            ))}
                          </div>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-6 text-right text-muted-foreground">{cnt}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">{termEvals.length}</p>
                    <p className="text-xs text-muted-foreground">Total Responses</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Per question breakdown */}
            <div className="rounded-md overflow-hidden border border-border">
              <div className="bg-primary text-primary-foreground px-4 py-2.5 font-bold text-sm">Per Question Summary</div>
              <div className="p-4 bg-background">
                <div className="space-y-4">
                  {EVAL_QUESTIONS.map(q => {
                    const ratings = termEvals.flatMap(e =>
                      e.responses.filter(r => r.questionId === q.id).map(r => r.rating)
                    );
                    const avg = ratings.length > 0
                      ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2)
                      : 'N/A';
                    return (
                      <div key={q.id} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <p className="text-foreground flex-1 pr-4">{q.text}</p>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <RatingStars rating={parseFloat(avg) || 0} />
                            <span className="font-bold text-foreground w-8 text-right">{avg}</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${(parseFloat(avg) / 5) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Per class */}
            <div className="rounded-md overflow-hidden border border-border">
              <div className="bg-primary text-primary-foreground px-4 py-2.5 font-bold text-sm">By Class Section</div>
              <div className="p-4 bg-background">
                <div className="space-y-3">
                  {termClasses.map(sec => {
                    const secEvals = termEvals.filter(e => e.sectionId === sec.id);
                    const course = state.courses.find(c => c.id === sec.courseId);
                    const avg = secEvals.length > 0
                      ? (secEvals.reduce((a, e) => a + e.overallRating, 0) / secEvals.length).toFixed(2)
                      : 'N/A';
                    const comments = secEvals.filter(e => e.comment?.trim());
                    return (
                      <div key={sec.id} className="rounded-lg border border-border overflow-hidden">
                        <div className="flex items-center justify-between p-3 bg-muted/40">
                          <div>
                            <p className="font-semibold text-foreground text-sm">{course?.code} — Sec {sec.sectionCode}</p>
                            <p className="text-xs text-muted-foreground">{secEvals.length} response(s)</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <RatingStars rating={parseFloat(avg) || 0} />
                            <span className="font-bold text-foreground">{avg}</span>
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
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
