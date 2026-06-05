import { useState, useMemo } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertTriangle, CheckCircle2, Clock, Layers, RefreshCw, XCircle,
  Info, BookOpen, ChevronRight,
} from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import type { Course, SpecializationRequest } from '@/lib/types';

const FAIL_GRADES = ['4', '5', 'DRP', 'F', 'U'];

export default function StudentSpecialization() {
  const { state, submitSpecializationRequest, cancelSpecializationRequest } = useApp();
  const student = state.currentUser!;

  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [changeMode, setChangeMode] = useState(false);

  // Resolve student's college and get graduation requirements
  const collegeId = useMemo(() => {
    const byId = state.colleges.find(c => c.id === student.college);
    if (byId) return byId.id;
    const byName = state.colleges.find(c => c.name === student.college);
    return byName?.id ?? student.college ?? '';
  }, [state.colleges, student.college]);

  const collegeReq = useMemo(
    () => state.graduationRequirements.find(r => r.collegeId === collegeId),
    [state.graduationRequirements, collegeId]
  );

  const maxUnits = collegeReq?.maxSpecialized ?? 0;

  // All specialized courses
  const allSpecCourses = useMemo(
    () => state.courses.filter(c => c.category === 'Specialized').sort((a, b) => a.code.localeCompare(b.code)),
    [state.courses]
  );

  // Current requests for this student
  const myRequests = useMemo(
    () => (state.specializationRequests ?? []).filter(r => r.studentId === student.id),
    [state.specializationRequests, student.id]
  );

  const approvedRequest: SpecializationRequest | undefined = myRequests.find(r => r.status === 'approved');
  const pendingRequest: SpecializationRequest | undefined = myRequests.find(r => r.status === 'pending');

  // Selected units computation
  const selectedUnits = useMemo(
    () => selected.reduce((sum, id) => {
      const c = state.courses.find(x => x.id === id);
      return sum + (c ? c.units + (c.labUnits ?? 0) : 0);
    }, 0),
    [selected, state.courses]
  );

  // Can student change their approved specialization?
  const { canChange, blockReasons } = useMemo(() => {
    if (!approvedRequest) return { canChange: true, blockReasons: [] };
    const reasons: string[] = [];
    // Check deadline
    const deadline = state.portalSettings.specializationChangeDeadline;
    if (deadline && new Date() > new Date(deadline)) {
      reasons.push(`The specialization change deadline has passed (${new Date(deadline).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}).`);
    }
    // Check if any course in approved plan has a failing grade
    for (const courseId of approvedRequest.courseIds) {
      const grade = state.grades.find(g => {
        if (g.studentId !== student.id || !g.submitted) return false;
        const sec = state.sections.find(s => s.id === g.sectionId);
        return sec?.courseId === courseId;
      });
      if (grade) {
        const effectiveGrade = (grade.removalSubmitted && grade.removalGrade) ? grade.removalGrade : grade.grade;
        if (effectiveGrade && FAIL_GRADES.includes(String(effectiveGrade))) {
          const course = state.courses.find(c => c.id === courseId);
          reasons.push(`${course?.code ?? 'A course'} has a failing grade (${effectiveGrade}). You must retake this course — you cannot change your specialization.`);
        }
      }
    }
    return { canChange: reasons.length === 0, blockReasons: reasons };
  }, [approvedRequest, state.portalSettings.specializationChangeDeadline, state.grades, state.sections, state.courses, student.id]);

  const handleToggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSubmit = async () => {
    if (selected.length === 0) {
      toast.error('No courses selected', { description: 'Please select at least one specialized course.' });
      return;
    }
    if (maxUnits > 0 && selectedUnits > maxUnits) {
      toast.error('Unit limit exceeded', { description: `You selected ${selectedUnits} units but the maximum is ${maxUnits} units.` });
      return;
    }
    setSubmitting(true);
    try {
      await submitSpecializationRequest(student.id, selected);
      toast.success('Specialization plan submitted!', { description: 'Your request is now pending OCS review.' });
      setSelected([]);
      setChangeMode(false);
    } catch {
      toast.error('Submission failed', { description: 'Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (!pendingRequest) return;
    cancelSpecializationRequest(pendingRequest.id);
    toast.success('Request cancelled.');
  };

  const handleStartChange = () => {
    // Pre-select currently approved courses
    if (approvedRequest) setSelected([...approvedRequest.courseIds]);
    setChangeMode(true);
  };

  const handleCancelChange = () => {
    setSelected([]);
    setChangeMode(false);
  };

  const fmtDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '—';

  const getCourseName = (id: string) => {
    const c = state.courses.find(x => x.id === id);
    return c ? `${c.code} — ${c.title}` : id;
  };

  const approvalDeadline = state.portalSettings.specializationApprovalDeadline;

  return (
    <PortalLayout title="Specialization Planner">
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Info card */}
        <div className="rounded-md border border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5 p-4 flex items-start gap-3">
          <Layers size={20} className="text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm text-foreground">Specialization Plan</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select up to <strong>{maxUnits} units</strong> of Specialized courses and submit for OCS approval.
              Once approved, these courses will appear in your Plan of Study and you may enlist in them during open enlistment periods.
              You must have an approved specialization plan to enlist in any Specialized course.
            </p>
          </div>
        </div>

        {/* OCS approval deadline notice */}
        {approvalDeadline && (
          <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
            <span>OCS processes specialization requests until <strong>{fmtDate(approvalDeadline)}</strong>.</span>
          </div>
        )}

        {/* Pending request */}
        {pendingRequest && !changeMode && (
          <div className="portal-panel">
            <div className="portal-panel-header">
              <Clock className="w-4 h-4 text-amber-500" /> Pending Request
            </div>
            <div className="p-4 bg-background space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-sm text-muted-foreground">Submitted {fmtDate(pendingRequest.requestedAt)}</span>
                <div className="flex items-center gap-2">
                  {pendingRequest.isChangeRequest && <Badge variant="outline" className="text-xs border-blue-400 text-blue-600">Change Request</Badge>}
                  <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-xs">Pending OCS Review</Badge>
                </div>
              </div>
              <div className="rounded-md border bg-muted/30 p-3 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Selected Courses ({pendingRequest.totalUnits} units)</p>
                {pendingRequest.courseIds.map(id => (
                  <div key={id} className="flex items-center gap-2 text-sm">
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span>{getCourseName(id)}</span>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={handleCancel} className="text-destructive border-destructive/40 hover:bg-destructive/5 h-8 text-xs gap-1.5">
                <XCircle className="w-3.5 h-3.5" /> Cancel Request
              </Button>
            </div>
          </div>
        )}

        {/* Approved request */}
        {approvedRequest && !pendingRequest && !changeMode && (
          <div className="portal-panel">
            <div className="portal-panel-header">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Approved Specialization
            </div>
            <div className="p-4 bg-background space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-sm text-muted-foreground">Approved {fmtDate(approvedRequest.processedAt)}</span>
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 text-xs">Approved</Badge>
              </div>
              <div className="rounded-md border bg-muted/30 p-3 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Your Specialization Courses ({approvedRequest.totalUnits} units)</p>
                {approvedRequest.courseIds.map(id => {
                  const grade = state.grades.find(g => {
                    if (g.studentId !== student.id || !g.submitted) return false;
                    const sec = state.sections.find(s => s.id === g.sectionId);
                    return sec?.courseId === id;
                  });
                  const effectiveGrade = grade ? ((grade.removalSubmitted && grade.removalGrade) ? grade.removalGrade : grade.grade) : null;
                  const isFailing = effectiveGrade && FAIL_GRADES.includes(String(effectiveGrade));
                  return (
                    <div key={id} className="flex items-center gap-2 text-sm">
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span className={isFailing ? 'text-destructive' : ''}>{getCourseName(id)}</span>
                      {effectiveGrade && (
                        <Badge variant="outline" className={`text-[10px] h-4 px-1 ${isFailing ? 'border-destructive text-destructive' : 'border-emerald-400 text-emerald-600'}`}>
                          {effectiveGrade}
                        </Badge>
                      )}
                      {isFailing && (
                        <span className="text-[10px] text-destructive font-medium">Must retake</span>
                      )}
                    </div>
                  );
                })}
              </div>
              {canChange ? (
                <Button size="sm" variant="outline" onClick={handleStartChange} className="h-8 text-xs gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5" /> Request Change of Specialization
                </Button>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-destructive">Change of Specialization is not available:</p>
                  {blockReasons.map((r, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-xs text-destructive/80">
                      <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* No request yet or change mode or pending with change mode */}
        {(!approvedRequest && !pendingRequest) || changeMode ? (
          <div className="portal-panel">
            <div className="portal-panel-header justify-between">
              <span className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                {changeMode ? 'Select New Specialization Courses' : 'Select Specialization Courses'}
              </span>
              <span className="text-xs font-normal text-primary-foreground/80">
                {selectedUnits}{maxUnits > 0 ? ` / ${maxUnits}` : ''} units selected
              </span>
            </div>
            <div className="p-4 bg-background space-y-3">
              {changeMode && (
                <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                  <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>You are requesting a change of specialization. Your current approved plan will be replaced once OCS approves this new request.</span>
                </div>
              )}

              {maxUnits > 0 && selectedUnits > maxUnits && (
                <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Selected {selectedUnits} units exceeds the {maxUnits}-unit limit. Please deselect some courses.</span>
                </div>
              )}

              {allSpecCourses.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
                  <Layers className="w-8 h-8 opacity-30" />
                  <p>No Specialized courses are available in the course catalog.</p>
                  <p className="text-xs">Contact OCS to have courses tagged as Specialized.</p>
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/60 border-b">
                      <tr>
                        <th className="w-8 px-3 py-2"></th>
                        <th className="text-left px-3 py-2 font-semibold">Course</th>
                        <th className="text-left px-3 py-2 font-semibold hidden sm:table-cell">Title</th>
                        <th className="text-center px-3 py-2 font-semibold">Units</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allSpecCourses.map((course: Course) => {
                        const isChecked = selected.includes(course.id);
                        return (
                          <tr
                            key={course.id}
                            className={`border-b last:border-b-0 cursor-pointer hover:bg-primary/5 transition-colors ${isChecked ? 'bg-primary/5' : ''}`}
                            onClick={() => handleToggle(course.id)}
                          >
                            <td className="px-3 py-2.5 text-center">
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() => handleToggle(course.id)}
                                onClick={e => e.stopPropagation()}
                                className="mt-0.5"
                              />
                            </td>
                            <td className="px-3 py-2.5 font-medium whitespace-nowrap">{course.code}</td>
                            <td className="px-3 py-2.5 text-muted-foreground hidden sm:table-cell max-w-[200px] truncate">{course.title}</td>
                            <td className="px-3 py-2.5 text-center font-medium">
                              {course.units}{course.labUnits ? `+${course.labUnits}` : ''}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex items-center gap-3 pt-1">
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || selected.length === 0 || (maxUnits > 0 && selectedUnits > maxUnits)}
                  className="h-9 text-sm gap-2"
                >
                  {submitting ? <Clock className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {changeMode ? 'Submit Change Request' : 'Submit Specialization Plan'}
                </Button>
                {changeMode && (
                  <Button variant="ghost" size="sm" onClick={handleCancelChange} className="h-9 text-sm">
                    Cancel
                  </Button>
                )}
                {selected.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {selected.length} course{selected.length !== 1 ? 's' : ''} selected · {selectedUnits} units
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {/* Denied history */}
        {myRequests.filter(r => r.status === 'denied').length > 0 && !pendingRequest && !changeMode && (
          <div className="portal-panel">
            <div className="portal-panel-header">
              <XCircle className="w-4 h-4 text-destructive" /> Previous Requests
            </div>
            <div className="p-4 bg-background space-y-2">
              {myRequests.filter(r => r.status === 'denied').slice(-3).reverse().map(req => (
                <div key={req.id} className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Submitted {fmtDate(req.requestedAt)}</span>
                    <Badge variant="outline" className="border-destructive text-destructive text-[10px]">Denied</Badge>
                  </div>
                  <div className="text-muted-foreground">
                    {req.courseIds.map(id => getCourseName(id)).join(', ')}
                  </div>
                  {req.response && (
                    <p className="text-foreground font-medium">OCS Response: {req.response}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
