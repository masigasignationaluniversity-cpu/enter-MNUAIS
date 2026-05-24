import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Star, CheckCircle, Lock, AlertTriangle } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { EVAL_QUESTIONS } from '../../lib/mockData';
import type { EvaluationResponse } from '../../lib/types';

const RatingButton = ({ rating, selected, onClick }: { rating: number; selected: boolean; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg border transition-all w-12
      ${selected ? 'bg-yellow-100 border-yellow-400' : 'bg-background border-border hover:bg-muted'}`}
  >
    <Star size={16} className={selected ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'} />
    <span className="text-xs font-semibold text-foreground">{rating}</span>
  </button>
);

export default function StudentEvaluation() {
  const { state, submitEvaluation, getActiveTerm, getStudentEnrollments } = useApp();
  const { toast } = useToast();
  const me = state.currentUser!;
  const activeTerm = getActiveTerm();
  const enrollments = activeTerm ? getStudentEnrollments(me.id, activeTerm.id) : [];

  const ficEvalOpen = activeTerm?.controls.ficEvalOpen ?? false;

  // Group by faculty (one evaluation per faculty per section)
  const evalTargets = enrollments.map(enr => {
    const sec = state.sections.find(s => s.id === enr.sectionId);
    const faculty = sec ? state.users.find(u => u.id === sec.facultyId) : null;
    const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
    const submitted = state.evaluations.some(e =>
      e.studentId === me.id && e.sectionId === enr.sectionId && e.termId === activeTerm?.id
    );
    // Check if grades were submitted (prerequisite)
    const gradesSubmitted = state.grades.some(g =>
      g.studentId === me.id && g.sectionId === enr.sectionId && g.submitted
    );
    return { enrollment: enr, sec, faculty, course, submitted, gradesSubmitted };
  });

  const [ratings, setRatings] = useState<Record<string, EvaluationResponse[]>>({});

  const handleRating = (sectionId: string, questionId: string, rating: number) => {
    setRatings(prev => {
      const existing = prev[sectionId] ?? [];
      const updated = existing.filter(r => r.questionId !== questionId);
      return { ...prev, [sectionId]: [...updated, { questionId, rating }] };
    });
  };

  const getRating = (sectionId: string, questionId: string) =>
    ratings[sectionId]?.find(r => r.questionId === questionId)?.rating ?? 0;

  const isComplete = (sectionId: string) =>
    EVAL_QUESTIONS.every(q => getRating(sectionId, q.id) > 0);

  const handleSubmit = (sectionId: string, facultyId: string) => {
    const responses = ratings[sectionId] ?? [];
    if (!isComplete(sectionId)) {
      toast({ title: 'Incomplete', description: 'Please rate all questions before submitting.', variant: 'destructive' });
      return;
    }
    submitEvaluation({
      studentId: me.id,
      facultyId,
      sectionId,
      termId: activeTerm!.id,
      responses,
    });
    toast({ title: 'Evaluation submitted!', description: 'Thank you for your feedback.' });
  };

  const completedCount = evalTargets.filter(t => t.submitted).length;
  const totalCount = evalTargets.length;

  return (
    <PortalLayout title="Faculty Evaluation">
      <div className="space-y-5">
        {!ficEvalOpen && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800">
            <AlertTriangle size={16} />
            <span className="text-sm font-medium">Faculty evaluation is currently closed.</span>
          </div>
        )}

        {/* Progress */}
        <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-foreground">Evaluation Progress</p>
              <p className="text-sm font-bold text-foreground">{completedCount}/{totalCount}</p>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${completedCount === totalCount ? 'bg-secondary' : 'bg-primary'}`}
                style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
              />
            </div>
            {completedCount === totalCount && totalCount > 0 && (
              <p className="text-xs text-secondary font-medium mt-1.5 flex items-center gap-1">
                <CheckCircle size={12} /> All evaluations completed! Grades will be unlocked.
              </p>
            )}
          </CardContent>
        </Card>

        {evalTargets.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground">No classes to evaluate for this term.</p>
            </CardContent>
          </Card>
        ) : (
          evalTargets.map(({ enrollment, sec, faculty, course, submitted, gradesSubmitted }) => (
            <Card key={enrollment.id} className={submitted ? 'border-secondary' : 'border-border'}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{course?.code} — {course?.title}</CardTitle>
                    <CardDescription>
                      Section {sec?.sectionCode} | Instructor: <strong>{faculty?.name}</strong>
                    </CardDescription>
                  </div>
                  {submitted
                    ? <Badge className="bg-secondary/10 text-secondary border-secondary/30 flex items-center gap-1"><CheckCircle size={12} /> Submitted</Badge>
                    : !gradesSubmitted
                      ? <Badge className="bg-muted text-muted-foreground border-border flex items-center gap-1"><Lock size={12} /> Grades not submitted</Badge>
                      : <Badge className="status-pending flex items-center gap-1"><Star size={12} /> Pending</Badge>
                  }
                </div>
              </CardHeader>
              <CardContent>
                {submitted ? (
                  <div className="p-4 rounded-lg bg-secondary/5 border border-secondary/20 text-center">
                    <CheckCircle size={24} className="text-secondary mx-auto mb-2" />
                    <p className="text-sm text-secondary font-medium">Evaluation submitted successfully.</p>
                    <p className="text-xs text-muted-foreground mt-1">Your feedback has been recorded.</p>
                  </div>
                ) : !ficEvalOpen ? (
                  <div className="p-4 rounded-lg bg-muted/40 border border-border text-center">
                    <Lock size={20} className="text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Evaluation period is not yet open.</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="p-3 rounded-lg bg-muted/40 border border-border">
                      <p className="text-xs text-muted-foreground mb-2 font-medium">Rating Scale: 1 = Poor, 5 = Excellent</p>
                      <div className="space-y-4">
                        {EVAL_QUESTIONS.map((q, qIdx) => {
                          const currentRating = getRating(enrollment.sectionId, q.id);
                          return (
                            <div key={q.id} className="space-y-2">
                              <p className="text-sm text-foreground">
                                <span className="font-semibold text-muted-foreground mr-2">{qIdx + 1}.</span>
                                {q.text}
                              </p>
                              <div className="flex gap-2">
                                {[1,2,3,4,5].map(r => (
                                  <RatingButton
                                    key={r}
                                    rating={r}
                                    selected={currentRating === r}
                                    onClick={() => handleRating(enrollment.sectionId, q.id, r)}
                                  />
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <Button
                      className={`w-full ${isComplete(enrollment.sectionId) ? 'bg-secondary hover:bg-secondary/90' : 'bg-muted text-muted-foreground'} gap-2`}
                      disabled={!isComplete(enrollment.sectionId)}
                      onClick={() => handleSubmit(enrollment.sectionId, sec!.facultyId)}
                    >
                      <Star size={16} />
                      Submit Evaluation
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </PortalLayout>
  );
}
