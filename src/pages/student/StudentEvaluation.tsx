import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { CheckCircle, Lock, AlertTriangle } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { EVAL_QUESTIONS } from '../../lib/mockData';
import type { EvaluationResponse } from '../../lib/types';

// rating: 1-5 = score, 6 = N/A, 0 = unanswered
const RatingCell = ({ value, onSelect, disabled }: {
  value: number;
  onSelect: (v: number) => void;
  disabled?: boolean;
}) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map(r => (
      <button
        key={r}
        type="button"
        disabled={disabled}
        onClick={() => onSelect(r)}
        className={`w-7 h-7 rounded-full text-xs font-semibold border transition-all
          ${value === r
            ? 'bg-[#8B0000] text-white border-[#8B0000]'
            : 'bg-background border-border text-foreground hover:border-[#8B0000] hover:text-[#8B0000]'
          } ${disabled ? 'opacity-60 cursor-default' : 'cursor-pointer'}`}
      >
        {r}
      </button>
    ))}
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(6)}
      className={`px-2 h-7 rounded-full text-xs font-semibold border transition-all
        ${value === 6
          ? 'bg-[#8B0000] text-white border-[#8B0000]'
          : 'bg-background border-border text-foreground hover:border-[#8B0000] hover:text-[#8B0000]'
        } ${disabled ? 'opacity-60 cursor-default' : 'cursor-pointer'}`}
    >
      N/A
    </button>
  </div>
);

export default function StudentEvaluation() {
  const { state, submitEvaluation, getActiveTerm } = useApp();
  const [ratings, setRatings] = useState<Record<string, EvaluationResponse[]>>({});
  const [helpful, setHelpful] = useState<Record<string, string>>({});
  const [improve, setImprove] = useState<Record<string, string>>({});
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [viewMode, setViewMode] = useState(false);

  const me = state.currentUser;
  if (!me) return null;
  const activeTerm = getActiveTerm();

  const enrollments = activeTerm
    ? state.enrollments.filter(e => e.studentId === me.id && e.termId === activeTerm.id && e.status === 'enrolled')
    : [];

  const now = new Date();
  const withinWindow = activeTerm?.evaluationFrom && activeTerm?.evaluationUntil
    ? now >= new Date(activeTerm.evaluationFrom) && now <= new Date(activeTerm.evaluationUntil)
    : activeTerm?.evaluationFrom
    ? now >= new Date(activeTerm.evaluationFrom)
    : false;
  const ficEvalOpen = (activeTerm?.controls.ficEvalOpen ?? false) || withinWindow;
  const ficEvalWindowStatus = (() => {
    if (!activeTerm) return 'not-set';
    const { evaluationFrom, evaluationUntil } = activeTerm;
    if (!evaluationFrom && !evaluationUntil) return 'not-set';
    const now = new Date();
    if (evaluationFrom && now < new Date(evaluationFrom)) return 'upcoming';
    if (evaluationUntil && now > new Date(evaluationUntil)) return 'ended';
    return 'open';
  })();

  const evalTargets = enrollments.map(enr => {
    const sec = state.sections.find(s => s.id === enr.sectionId);
    const faculty = sec ? state.users.find(u => u.id === sec.facultyId) : null;
    const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
    const existing = state.evaluations.find(e =>
      e.studentId === me.id && e.sectionId === enr.sectionId && e.termId === activeTerm?.id
    );
    const submitted = !!existing;
    const gradesSubmitted = state.grades.some(g =>
      g.studentId === me.id && g.sectionId === enr.sectionId && g.submitted
    );
    return { enrollment: enr, sec, faculty, course, submitted, existing, gradesSubmitted };
  });

  const completedCount = evalTargets.filter(t => t.submitted).length;
  const totalCount = evalTargets.length;

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
    EVAL_QUESTIONS.every(q => getRating(sectionId, q.id) !== 0);

  const handleSubmit = (sectionId: string, facultyId: string) => {
    if (!isComplete(sectionId)) {
      toast.error('Incomplete', { description: 'Please rate all questions before submitting.' });
      return;
    }
    submitEvaluation({
      studentId: me.id,
      facultyId,
      sectionId,
      termId: activeTerm!.id,
      responses: ratings[sectionId] ?? [],
      comment: [helpful[sectionId], improve[sectionId]].filter(Boolean).join(' | ') || undefined,
    });
    toast.success('Evaluation submitted!', { description: 'Thank you for your feedback.' });
    setSelectedSectionId('');
    setViewMode(false);
  };

  const selectedTarget = evalTargets.find(t => t.enrollment.sectionId === selectedSectionId);

  // ── Evaluation form view ──
  if (selectedTarget) {
    const { enrollment, sec, faculty, course, submitted, existing } = selectedTarget;
    const sectionId = enrollment.sectionId;
    const isReadOnly = submitted || viewMode;

    return (
      <PortalLayout title="Student Evaluation of Teaching (SET)">
        <div className="space-y-4">
          {/* Back + context */}
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              className="bg-[#8B0000] hover:bg-[#700000] text-white h-7 px-3 text-xs shrink-0"
              onClick={() => { setSelectedSectionId(''); setViewMode(false); }}
            >
              Back
            </Button>
            <p className="text-sm">
              You are evaluating: <strong>{faculty?.name?.toUpperCase()}</strong> for class <strong>{course?.code} {sec?.sectionCode}</strong>
            </p>
          </div>

          {/* Questions table */}
          <div className="border border-border rounded-md overflow-hidden">
            <div className="flex items-center justify-between bg-[#8B0000] text-white px-4 py-2.5">
              <span className="font-bold text-sm">In this class the teacher</span>
              <span className="font-bold text-sm">Rating</span>
            </div>
            {EVAL_QUESTIONS.map((q, idx) => {
              const currentRating = isReadOnly
                ? (existing?.responses.find(r => r.questionId === q.id)?.rating ?? 0)
                : getRating(sectionId, q.id);
              return (
                <div
                  key={q.id}
                  className={`flex items-center justify-between px-4 py-3 border-b border-border last:border-0 gap-4 ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}
                >
                  <p className="text-sm flex-1">{q.text}</p>
                  <div className="shrink-0">
                    <RatingCell
                      value={currentRating}
                      onSelect={isReadOnly ? () => {} : (v) => handleRating(sectionId, q.id, v)}
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Open-ended questions */}
          <div className="border border-border rounded-md overflow-hidden">
            <div className="bg-[#8B0000] text-white px-4 py-2.5">
              <span className="font-bold text-sm">Please also answer the following questions:</span>
            </div>
            <div className="p-4 space-y-4 bg-background">
              <div>
                <p className="text-sm mb-1.5">In relation to your learning experience in this class , what does your teacher do that you find very helpful/effective?</p>
                <Input
                  value={helpful[sectionId] ?? ''}
                  onChange={e => setHelpful(prev => ({ ...prev, [sectionId]: e.target.value }))}
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <p className="text-sm mb-1.5">How do you think can the teaching in this class be improved to enhance your learning experience?</p>
                <Input
                  value={improve[sectionId] ?? ''}
                  onChange={e => setImprove(prev => ({ ...prev, [sectionId]: e.target.value }))}
                  disabled={isReadOnly}
                />
              </div>
              {!isReadOnly && (
                <div className="flex justify-start">
                  <Button
                    className="bg-[#8B0000] hover:bg-[#700000] text-white"
                    disabled={!isComplete(sectionId)}
                    onClick={() => handleSubmit(sectionId, sec!.facultyId)}
                  >
                    Submit Evaluation
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </PortalLayout>
    );
  }

  // ── List view ──
  return (
    <PortalLayout title="Student Evaluation of Teaching (SET)">
      <div className="space-y-4">
        {!ficEvalOpen && (
          <div className={`banner ${
            ficEvalWindowStatus === 'not-set' ? 'banner-warning' :
            ficEvalWindowStatus === 'upcoming' ? 'banner-info' :
            'banner-warning'
          }`}>
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
            {ficEvalWindowStatus === 'not-set' && 'Evaluation has not been scheduled. Please wait for the University announcement.'}
            {ficEvalWindowStatus === 'upcoming' && activeTerm?.evaluationFrom && `Evaluation opens on ${new Date(activeTerm.evaluationFrom).toLocaleString('en-PH', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}.`}
            {ficEvalWindowStatus === 'ended' && 'Evaluation period has closed.'}
          </div>
        )}

        {/* Progress */}
        <div className="portal-panel">
          <div className="portal-panel-header">Evaluation Progress</div>
          <div className="p-4 bg-background">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-foreground">Completed</p>
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
          </div>
        </div>

        {/* Table */}
        {evalTargets.length === 0 ? (
          <div className="portal-panel">
            <div className="portal-panel-header">Student Evaluation of Teaching (SET)</div>
            <div className="py-10 text-center bg-background">
              <p className="text-muted-foreground">No classes to evaluate for this term.</p>
            </div>
          </div>
        ) : (
          <div className="portal-panel">
            <div className="grid bg-muted/60 border-b border-border" style={{ gridTemplateColumns: '1fr 1fr 110px 170px' }}>
              <div className="px-4 py-3 text-sm font-bold text-foreground">Faculty Name</div>
              <div className="px-4 py-3 text-sm font-bold text-foreground">Course Code &amp; Section</div>
              <div className="px-4 py-3 text-sm font-bold text-foreground text-center">Completed</div>
              <div className="px-4 py-3 text-sm font-bold text-foreground text-center">Action</div>
            </div>
            {evalTargets.map(({ enrollment, faculty, course, sec, submitted, gradesSubmitted }, idx) => (
              <div
                key={enrollment.sectionId}
                className={`grid items-center border-b border-border last:border-0 ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}
                style={{ gridTemplateColumns: '1fr 1fr 110px 170px' }}
              >
                <div className="px-4 py-3 text-sm font-medium">{faculty?.name ?? 'TBA'}</div>
                <div className="px-4 py-3 text-sm">{course?.code} {sec?.sectionCode}</div>
                <div className="px-4 py-3 text-center">
                  {submitted
                    ? <span className="text-sm font-bold text-green-700">YES</span>
                    : <span className="text-sm font-bold text-red-600">NO</span>
                  }
                </div>
                <div className="px-4 py-3 flex justify-center">
                  {submitted ? (
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-7"
                      onClick={() => { setSelectedSectionId(enrollment.sectionId); setViewMode(true); }}>
                      View Evaluation
                    </Button>
                  ) : !ficEvalOpen ? (
                    <Badge className="bg-muted text-muted-foreground border-border text-xs flex items-center gap-1">
                      <Lock size={10} /> Closed
                    </Badge>
                  ) : !gradesSubmitted ? (
                    <Badge className="bg-muted text-muted-foreground border-border text-xs flex items-center gap-1">
                      <Lock size={10} /> Awaiting grades
                    </Badge>
                  ) : (
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs h-7"
                      onClick={() => { setSelectedSectionId(enrollment.sectionId); setViewMode(false); }}>
                      Evaluate
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
