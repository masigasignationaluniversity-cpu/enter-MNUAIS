import { useState, useMemo, useEffect } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle, CheckCircle2, Clock, Layers, RefreshCw, XCircle,
  Info, BookOpen, Search, Download, FileText, ChevronDown, ChevronUp,
} from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import PlanFlowchart from '@/components/student/PlanFlowchart';
import { downloadAsPdf } from '@/lib/pdfUtils';
import { getPassedUnits, getYearClassification, computeTotalRequiredUnits } from '@/lib/academic';
import type { Course, SpecializationRequest } from '@/lib/types';

const FAIL_GRADES = ['4', '5', 'DRP', 'F', 'U'];

export default function StudentSpecialization() {
  const { state, submitSpecializationRequest, cancelSpecializationRequest, loadGraduationRequirements } = useApp();
  const student = state.currentUser!;

  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [changeMode, setChangeMode] = useState(false);
  const [search, setSearch] = useState('');
  const [showFlowchart, setShowFlowchart] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => { loadGraduationRequirements(); }, [loadGraduationRequirements]);

  // Resolve college ID
  const collegeId = useMemo(() => {
    const byId = state.colleges.find(c => c.id === student.college);
    if (byId) return byId.id;
    const byName = state.colleges.find(c => c.name === student.college);
    return byName?.id ?? student.college ?? '';
  }, [state.colleges, student.college]);

  const globalReq = state.graduationRequirements.find(r => r.collegeId === 'global');
  const collegeReq = state.graduationRequirements.find(r => r.collegeId === collegeId);
  const maxUnits = collegeReq?.maxSpecialized ?? 0;

  // Only courses explicitly listed in the college's required specialization pool
  const allSpecCourses = useMemo(() => {
    const ids = new Set(collegeReq?.requiredSpecializedCourseIds ?? []);
    return state.courses
      .filter(c => ids.has(c.id))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [collegeReq, state.courses]);

  // Search-filtered courses
  const filteredCourses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allSpecCourses;
    return allSpecCourses.filter(c =>
      c.code.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q)
    );
  }, [allSpecCourses, search]);

  // Year classification from graduation requirements (not DegreeProgram.totalUnits)
  const { yearClass, passedUnits, totalReqUnits } = useMemo(() => {
    const passed = getPassedUnits(student.id, state.grades, state.sections, state.courses, state.enrollments);
    const total = computeTotalRequiredUnits(globalReq, collegeReq, state.courses);
    const yc = getYearClassification(passed, total);
    return { yearClass: yc, passedUnits: passed, totalReqUnits: total };
  }, [student.id, state.grades, state.sections, state.courses, state.enrollments, globalReq, collegeReq]);

  const isJuniorOrAbove = yearClass === 'Junior' || yearClass === 'Senior';

  // HK/PE/NSTP completion check
  const { hkPeNstpRequired, hkPeNstpDone } = useMemo(() => {
    const required = [
      ...(globalReq?.requiredHkPeNstpCourseIds ?? []),
      ...(collegeReq?.requiredHkPeNstpCourseIds ?? []),
    ];
    const done = required.every(courseId => {
      const grade = state.grades.find(g => {
        if (g.studentId !== student.id || !g.submitted) return false;
        const sec = state.sections.find(s => s.id === g.sectionId);
        return sec?.courseId === courseId;
      });
      if (!grade) return false;
      const effective = (grade.removalSubmitted && grade.removalGrade) ? grade.removalGrade : grade.grade;
      if (!effective) return false;
      const numG = parseFloat(String(effective));
      return effective === 'S' || effective === 'P' || (!isNaN(numG) && numG <= 3.0);
    });
    return { hkPeNstpRequired: required.length, hkPeNstpDone: done };
  }, [student.id, state.grades, state.sections, globalReq, collegeReq]);

  // Student's specialization requests
  const myRequests = useMemo(
    () => (state.specializationRequests ?? []).filter(r => r.studentId === student.id)
      .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()),
    [state.specializationRequests, student.id]
  );

  const approvedRequest: SpecializationRequest | undefined = myRequests.find(r => r.status === 'approved');
  const pendingRequest: SpecializationRequest | undefined = myRequests.find(r => r.status === 'pending');

  // Selected units
  const selectedUnits = useMemo(
    () => selected.reduce((sum, id) => {
      const c = state.courses.find(x => x.id === id);
      return sum + (c ? c.units + (c.labUnits ?? 0) : 0);
    }, 0),
    [selected, state.courses]
  );

  // Can change specialization?
  const { canChange, blockReasons } = useMemo(() => {
    if (!approvedRequest) return { canChange: true, blockReasons: [] };
    const reasons: string[] = [];
    const deadline = state.portalSettings.specializationChangeDeadline;
    if (deadline && new Date() > new Date(deadline)) {
      reasons.push(`The specialization change deadline has passed (${new Date(deadline).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}).`);
    }
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
          reasons.push(`${course?.code ?? 'A course'} has a failing grade (${effectiveGrade}). You must retake this course before changing your specialization.`);
        }
      }
    }
    return { canChange: reasons.length === 0, blockReasons: reasons };
  }, [approvedRequest, state.portalSettings.specializationChangeDeadline, state.grades, state.sections, state.courses, student.id]);

  const handleToggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSubmit = async () => {
    if (!isJuniorOrAbove) {
      toast.error('Junior standing required', { description: 'You must be at Junior standing to apply for a specialization plan.' });
      return;
    }
    if (selected.length === 0) {
      toast.error('No courses selected', { description: 'Select at least one specialized course.' });
      return;
    }
    if (maxUnits > 0 && selectedUnits > maxUnits) {
      toast.error('Unit limit exceeded', { description: `Maximum is ${maxUnits} units.` });
      return;
    }
    setSubmitting(true);
    try {
      await submitSpecializationRequest(student.id, selected);
      toast.success('Specialization plan submitted!', { description: 'Pending OCS review.' });
      setSelected([]);
      setChangeMode(false);
    } catch {
      toast.error('Submission failed. Please try again.');
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
    if (approvedRequest) setSelected([...approvedRequest.courseIds]);
    setChangeMode(true);
  };

  const handleCancelChange = () => { setSelected([]); setChangeMode(false); };

  // PDF generation for approved specialization
  const handleDownloadPdf = async () => {
    if (!approvedRequest) return;
    setGeneratingPdf(true);
    try {
      const institutionName = state.portalSettings?.institutionName ?? 'University';
      const logoUrl = state.portalSettings?.logoUrl ?? '';
      const approvedBy = state.users.find(u => u.id === approvedRequest.processedBy)?.name ?? approvedRequest.processedBy ?? '—';
      const dateGenerated = new Date().toLocaleString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
      const approvedDate = approvedRequest.processedAt
        ? new Date(approvedRequest.processedAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
        : '—';

      const courseRows = approvedRequest.courseIds.map(id => {
        const c = state.courses.find(x => x.id === id);
        if (!c) return '';
        return `<tr>
          <td style="padding:5px 10px;border:1px solid #ddd;font-size:11px">${c.code}</td>
          <td style="padding:5px 10px;border:1px solid #ddd;font-size:11px">${c.title}</td>
          <td style="padding:5px 10px;border:1px solid #ddd;font-size:11px;text-align:center">${c.units}${c.labUnits ? `+${c.labUnits}` : ''}</td>
          <td style="padding:5px 10px;border:1px solid #ddd;font-size:11px;text-align:center">${c.type}</td>
        </tr>`;
      }).join('');

      const html = `
        <div style="font-family:Arial,sans-serif;padding:32px;color:#111;width:760px">
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
            ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="width:64px;height:64px;object-fit:contain;flex-shrink:0" />` : ''}
            <div style="flex:1;text-align:center">
              <div style="font-size:15px;font-weight:bold;color:#111;text-transform:uppercase;letter-spacing:0.04em">${institutionName}</div>
              <div style="font-size:13px;color:#555;margin-top:2px;letter-spacing:0.08em;text-transform:uppercase">Specialization Plan — OCS Approval</div>
            </div>
            ${logoUrl ? `<div style="width:64px;flex-shrink:0"></div>` : ''}
          </div>
          <hr style="margin:0 0 14px">

          <h2 style="margin-bottom:4px;font-size:16px">${student.name}</h2>
          <p style="color:#555;font-size:12px;margin-bottom:4px">
            Student No: <strong>${student.studentNumber ?? '—'}</strong> &nbsp;|&nbsp;
            Program: <strong>${student.program ?? '—'}</strong> &nbsp;|&nbsp;
            Year Classification: <strong>${yearClass}</strong>
          </p>
          <hr style="margin:12px 0">

          <h3 style="margin:0 0 8px;font-size:13px;color:#444">Approved Specialization Courses</h3>
          <table style="width:100%;border-collapse:collapse;margin-bottom:8px">
            <thead><tr style="background:#e5e7eb">
              <th style="padding:5px 10px;border:1px solid #ddd;font-size:11px;text-align:left">Code</th>
              <th style="padding:5px 10px;border:1px solid #ddd;font-size:11px;text-align:left">Course Title</th>
              <th style="padding:5px 10px;border:1px solid #ddd;font-size:11px;text-align:center">Units</th>
              <th style="padding:5px 10px;border:1px solid #ddd;font-size:11px;text-align:center">Type</th>
            </tr></thead>
            <tbody>${courseRows || '<tr><td colspan="4" style="text-align:center;padding:8px;color:#999">No courses</td></tr>'}</tbody>
          </table>
          <div style="font-size:11px;color:#555;margin-bottom:16px">
            Total Specialization Units: <strong>${approvedRequest.totalUnits}</strong>
          </div>

          <div style="padding:10px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:4px;margin-bottom:16px">
            <p style="margin:0;font-size:12px;color:#166534">
              <strong>Status: APPROVED</strong> — This document certifies that the above specialization plan has been reviewed and approved by the Office of College Secretary.
            </p>
          </div>

          <div style="margin-top:24px;padding-top:12px;border-top:1px solid #ccc;font-size:11px;color:#555;display:flex;justify-content:space-between;align-items:flex-end">
            <div>
              <p style="margin:0">Approved by: <strong style="color:#111">${approvedBy}</strong></p>
              <p style="margin:4px 0 0">Date Approved: <strong style="color:#111">${approvedDate}</strong></p>
            </div>
            <span style="font-size:10px;color:#888">Date Generated: ${dateGenerated}</span>
          </div>
        </div>`;

      const container = document.createElement('div');
      container.innerHTML = html;
      container.style.cssText = 'position:fixed;top:-99999px;left:-99999px;background:#fff';
      document.body.appendChild(container);
      try {
        await downloadAsPdf(
          container.firstElementChild as HTMLElement ?? container,
          `Specialization_${(student.studentNumber ?? student.name).replace(/\s+/g, '_')}.pdf`,
          false
        );
      } finally {
        document.body.removeChild(container);
      }
    } catch {
      toast.error('PDF generation failed. Please try again.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const fmtDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  const getCourseName = (id: string) => {
    const c = state.courses.find(x => x.id === id);
    return c ? `${c.code} — ${c.title}` : id;
  };

  const getCourse = (id: string) => state.courses.find(x => x.id === id);

  const statusBadge = (status: string) => {
    if (status === 'pending') return <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-[10px] h-5">Pending</Badge>;
    if (status === 'approved') return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 text-[10px] h-5">Approved</Badge>;
    return <Badge className="bg-red-100 text-red-700 border-red-300 text-[10px] h-5">Denied</Badge>;
  };

  const getStatusForFlowchart = (courseId: string): 'passed' | 'in_progress' | 'failed' | 'not_taken' => {
    if (approvedRequest?.courseIds.includes(courseId)) {
      const grade = state.grades.find(g => {
        if (g.studentId !== student.id || !g.submitted) return false;
        const sec = state.sections.find(s => s.id === g.sectionId);
        return sec?.courseId === courseId;
      });
      if (!grade) {
        const enrolled = state.enrollments.find(e => {
          if (e.studentId !== student.id || e.status === 'dropped') return false;
          const sec = state.sections.find(s => s.id === e.sectionId);
          return sec?.courseId === courseId;
        });
        return enrolled ? 'in_progress' : 'not_taken';
      }
      const effective = (grade.removalSubmitted && grade.removalGrade) ? grade.removalGrade : grade.grade;
      if (!effective) return 'not_taken';
      if (FAIL_GRADES.includes(String(effective))) return 'failed';
      return 'passed';
    }
    const grade = state.grades.find(g => {
      if (g.studentId !== student.id || !g.submitted) return false;
      const sec = state.sections.find(s => s.id === g.sectionId);
      return sec?.courseId === courseId;
    });
    if (!grade) return 'not_taken';
    const effective = (grade.removalSubmitted && grade.removalGrade) ? grade.removalGrade : grade.grade;
    if (!effective) return 'not_taken';
    if (FAIL_GRADES.includes(String(effective))) return 'failed';
    return 'passed';
  };

  const approvalDeadline = state.portalSettings.specializationApprovalDeadline;

  const canApply = isJuniorOrAbove && !pendingRequest;
  const showApplyTab = (!approvedRequest && !pendingRequest) || changeMode;

  return (
    <PortalLayout title="Specialization Planner">
      <div className="max-w-4xl mx-auto space-y-4">

        {/* Status summary card */}
        <div className="rounded-md border border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5 p-4">
          <div className="flex items-start gap-3">
            <Layers size={20} className="text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground">Specialization Plan</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Select up to <strong>{maxUnits} units</strong> of Specialized courses from your college's catalog and submit for OCS approval.
                An approved plan is required before you can enlist in any Specialized course.
              </p>
              <div className="flex flex-wrap gap-3 mt-3 text-xs">
                {/* Year classification */}
                <div className={`flex items-center gap-1.5 rounded px-2 py-1 border ${isJuniorOrAbove ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                  {isJuniorOrAbove ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                  <span>Year: <strong>{yearClass}</strong></span>
                  {totalReqUnits > 0 && <span className="opacity-70">({passedUnits}/{totalReqUnits} units)</span>}
                </div>
                {/* HK/PE/NSTP */}
                {hkPeNstpRequired > 0 && (
                  <div className={`flex items-center gap-1.5 rounded px-2 py-1 border ${hkPeNstpDone ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-muted border-border text-muted-foreground'}`}>
                    {hkPeNstpDone ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    <span>HK/PE/NSTP: {hkPeNstpDone ? 'Complete' : 'Pending'}</span>
                  </div>
                )}
                {/* Deadline */}
                {approvalDeadline && (
                  <div className="flex items-center gap-1.5 rounded px-2 py-1 border border-border text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>OCS deadline: {fmtDate(approvalDeadline)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Junior standing block */}
        {!isJuniorOrAbove && (
          <div className="flex items-start gap-2.5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Junior Standing Required</p>
              <p className="text-xs mt-0.5">You are currently <strong>{yearClass}</strong> ({passedUnits}/{totalReqUnits} academic units completed). You must reach Junior standing (≥50% of required units) before submitting a specialization plan.</p>
            </div>
          </div>
        )}

        {/* Active status: pending or approved */}
        {(pendingRequest || approvedRequest) && !changeMode && (
          <div className={`portal-panel border ${pendingRequest ? 'border-amber-200' : 'border-emerald-200'}`}>
            <div className={`portal-panel-header ${pendingRequest ? 'bg-amber-500/80' : 'bg-emerald-600/80'}`}>
              {pendingRequest
                ? <><Clock className="w-4 h-4" /> Pending OCS Review</>
                : <><CheckCircle2 className="w-4 h-4" /> Approved Specialization Plan</>
              }
            </div>
            <div className="p-4 bg-background space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs text-muted-foreground">
                  {pendingRequest
                    ? `Submitted ${fmtDate(pendingRequest.requestedAt)}`
                    : `Approved ${fmtDate(approvedRequest!.processedAt)}`
                  }
                </span>
                <div className="flex items-center gap-2">
                  {(pendingRequest ?? approvedRequest)!.isChangeRequest && (
                    <Badge variant="outline" className="text-[10px] border-blue-400 text-blue-600 gap-1">
                      <RefreshCw className="w-2.5 h-2.5" /> Change Request
                    </Badge>
                  )}
                  {statusBadge(pendingRequest ? 'pending' : 'approved')}
                </div>
              </div>

              {/* Course table */}
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/60 border-b">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold">Code</th>
                      <th className="text-left px-3 py-2 font-semibold hidden sm:table-cell">Title</th>
                      <th className="text-center px-3 py-2 font-semibold">Units</th>
                      {approvedRequest && <th className="text-center px-3 py-2 font-semibold">Grade</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {(pendingRequest ?? approvedRequest)!.courseIds.map(id => {
                      const c = getCourse(id);
                      const grade = approvedRequest ? state.grades.find(g => {
                        if (g.studentId !== student.id || !g.submitted) return false;
                        const sec = state.sections.find(s => s.id === g.sectionId);
                        return sec?.courseId === id;
                      }) : undefined;
                      const effectiveGrade = grade ? ((grade.removalSubmitted && grade.removalGrade) ? grade.removalGrade : grade.grade) : null;
                      const isFailing = effectiveGrade && FAIL_GRADES.includes(String(effectiveGrade));
                      return (
                        <tr key={id} className="border-b last:border-b-0">
                          <td className="px-3 py-2 font-medium">{c?.code ?? id}</td>
                          <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">{c?.title ?? '—'}</td>
                          <td className="px-3 py-2 text-center">{c ? c.units + (c.labUnits ? `+${c.labUnits}` : '') : '—'}</td>
                          {approvedRequest && (
                            <td className="px-3 py-2 text-center">
                              {effectiveGrade
                                ? <span className={`font-semibold ${isFailing ? 'text-destructive' : 'text-emerald-600'}`}>{effectiveGrade}{isFailing && ' ⚠'}</span>
                                : <span className="text-muted-foreground text-[10px]">—</span>
                              }
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">Total: <strong>{(pendingRequest ?? approvedRequest)!.totalUnits} units</strong></p>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {pendingRequest && (
                  <Button variant="outline" size="sm" onClick={handleCancel}
                    className="text-destructive border-destructive/40 hover:bg-destructive/5 h-8 text-xs gap-1.5">
                    <XCircle className="w-3.5 h-3.5" /> Cancel Request
                  </Button>
                )}
                {approvedRequest && (
                  <Button size="sm" onClick={handleDownloadPdf} disabled={generatingPdf}
                    className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                    <FileText className="w-3.5 h-3.5" />
                    {generatingPdf ? 'Generating…' : 'Download Approval PDF'}
                  </Button>
                )}
                {approvedRequest && !pendingRequest && (
                  canChange ? (
                    <Button size="sm" variant="outline" onClick={handleStartChange}
                      className="h-8 text-xs gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5" /> Request Change
                    </Button>
                  ) : (
                    <div className="w-full space-y-1 pt-1">
                      <p className="text-xs font-medium text-destructive">Cannot change specialization:</p>
                      {blockReasons.map((r, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-xs text-destructive/80">
                          <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tabs: Apply / History / Flowchart */}
        <Tabs defaultValue={showApplyTab ? 'apply' : 'history'}>
          <TabsList className="w-full grid grid-cols-3 h-9 text-xs">
            <TabsTrigger value="apply" className="text-xs gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              {changeMode ? 'Change Plan' : 'Apply'}
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Request History
              {myRequests.length > 0 && (
                <span className="ml-1 rounded-full bg-primary/15 text-primary text-[10px] px-1.5 py-0.5 leading-none">
                  {myRequests.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="flowchart" className="text-xs gap-1.5">
              <Layers className="w-3.5 h-3.5" /> Flowchart
            </TabsTrigger>
          </TabsList>

          {/* ── APPLY TAB ── */}
          <TabsContent value="apply" className="mt-3 space-y-3">
            {/* Not junior or already pending */}
            {!canApply && !changeMode ? (
              <div className="portal-panel">
                <div className="p-6 text-center text-muted-foreground text-sm space-y-2">
                  <Layers className="w-8 h-8 mx-auto opacity-30" />
                  {pendingRequest
                    ? <p>You have a <strong>pending request</strong> under OCS review. You cannot submit a new request until it is processed.</p>
                    : <p>You must be at <strong>Junior standing</strong> to submit a specialization plan.</p>
                  }
                </div>
              </div>
            ) : (
              <div className="portal-panel">
                <div className="portal-panel-header justify-between">
                  <span className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    {changeMode ? 'Select New Specialization Courses' : 'Select Specialization Courses'}
                  </span>
                  <span className="text-xs font-normal text-primary-foreground/80">
                    {selectedUnits}{maxUnits > 0 ? ` / ${maxUnits}` : ''} units
                  </span>
                </div>
                <div className="p-4 bg-background space-y-3">
                  {changeMode && (
                    <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                      <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      <span>Requesting a change of specialization. Your current approved plan will be replaced once OCS approves this request.</span>
                    </div>
                  )}

                  {maxUnits > 0 && selectedUnits > maxUnits && (
                    <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>Selected {selectedUnits} units exceeds the {maxUnits}-unit maximum.</span>
                    </div>
                  )}

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Search course code or title…"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="pl-8 h-9 text-sm"
                    />
                  </div>

                  {allSpecCourses.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground text-sm space-y-1">
                      <Layers className="w-8 h-8 mx-auto opacity-25" />
                      <p>No Specialized courses configured for your college.</p>
                      <p className="text-xs">Contact OCS to add courses to the specialization catalog.</p>
                    </div>
                  ) : filteredCourses.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No courses match "{search}".</p>
                  ) : (
                    <div className="rounded-lg border overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/60 border-b">
                          <tr>
                            <th className="w-9 px-3 py-2"></th>
                            <th className="text-left px-3 py-2 font-semibold">Code</th>
                            <th className="text-left px-3 py-2 font-semibold hidden sm:table-cell">Title</th>
                            <th className="text-center px-3 py-2 font-semibold">Units</th>
                            <th className="text-center px-3 py-2 font-semibold hidden md:table-cell">Type</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCourses.map((course: Course) => {
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
                                  />
                                </td>
                                <td className="px-3 py-2.5 font-medium whitespace-nowrap">{course.code}</td>
                                <td className="px-3 py-2.5 text-muted-foreground hidden sm:table-cell">{course.title}</td>
                                <td className="px-3 py-2.5 text-center font-medium">
                                  {course.units}{course.labUnits ? `+${course.labUnits}` : ''}
                                </td>
                                <td className="px-3 py-2.5 text-center text-muted-foreground hidden md:table-cell">{course.type}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-1 flex-wrap">
                    <Button
                      onClick={handleSubmit}
                      disabled={submitting || selected.length === 0 || (maxUnits > 0 && selectedUnits > maxUnits) || !isJuniorOrAbove}
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
                        {selected.length} course{selected.length !== 1 ? 's' : ''} · {selectedUnits} units
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── HISTORY TAB ── */}
          <TabsContent value="history" className="mt-3">
            <div className="portal-panel">
              <div className="portal-panel-header">
                <FileText className="w-4 h-4" /> Request History
              </div>
              <div className="bg-background">
                {myRequests.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground text-sm">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-25" />
                    <p>No specialization requests yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/60 border-b">
                        <tr>
                          <th className="text-left px-3 py-2.5 font-semibold">Submitted</th>
                          <th className="text-left px-3 py-2.5 font-semibold">Courses</th>
                          <th className="text-center px-3 py-2.5 font-semibold">Units</th>
                          <th className="text-center px-3 py-2.5 font-semibold">Type</th>
                          <th className="text-center px-3 py-2.5 font-semibold">Status</th>
                          <th className="text-left px-3 py-2.5 font-semibold">OCS Response</th>
                          <th className="px-3 py-2.5 w-24"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {myRequests.map((req: SpecializationRequest) => (
                          <tr key={req.id} className="border-b last:border-b-0 hover:bg-muted/20">
                            <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{fmtDate(req.requestedAt)}</td>
                            <td className="px-3 py-2.5 max-w-[200px]">
                              <div className="space-y-0.5">
                                {req.courseIds.map(id => {
                                  const c = getCourse(id);
                                  return <div key={id} className="truncate">{c?.code ?? id}</div>;
                                })}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-center font-medium">{req.totalUnits}</td>
                            <td className="px-3 py-2.5 text-center">
                              {req.isChangeRequest
                                ? <Badge variant="outline" className="text-[10px] border-blue-400 text-blue-600">Change</Badge>
                                : <Badge variant="outline" className="text-[10px]">Initial</Badge>
                              }
                            </td>
                            <td className="px-3 py-2.5 text-center">{statusBadge(req.status)}</td>
                            <td className="px-3 py-2.5 max-w-[160px]">
                              {req.response
                                ? <span className={`text-[11px] ${req.status === 'denied' ? 'text-destructive' : 'text-muted-foreground'}`}>{req.response}</span>
                                : <span className="text-muted-foreground text-[10px]">—</span>
                              }
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              {req.status === 'approved' && (
                                <Button size="sm" variant="ghost" onClick={handleDownloadPdf}
                                  disabled={generatingPdf}
                                  className="h-7 text-[11px] gap-1 text-emerald-600 hover:text-emerald-700">
                                  <Download className="w-3 h-3" /> PDF
                                </Button>
                              )}
                              {req.status === 'pending' && (
                                <Button size="sm" variant="ghost" onClick={handleCancel}
                                  className="h-7 text-[11px] gap-1 text-destructive hover:text-destructive">
                                  <XCircle className="w-3 h-3" /> Cancel
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── FLOWCHART TAB ── */}
          <TabsContent value="flowchart" className="mt-3">
            <div className="portal-panel">
              <div className="portal-panel-header justify-between">
                <span className="flex items-center gap-2"><Layers className="w-4 h-4" /> Specialized Course Flowchart</span>
                <button onClick={() => setShowFlowchart(v => !v)} className="flex items-center gap-1 text-xs text-primary-foreground/80 hover:text-primary-foreground">
                  {showFlowchart ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {showFlowchart ? 'Hide' : 'Show'}
                </button>
              </div>
              <div className="p-4 bg-background">
                {allSpecCourses.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    <Layers className="w-8 h-8 mx-auto mb-2 opacity-25" />
                    <p>No Specialized courses configured for your college.</p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground mb-3">
                      Showing all {allSpecCourses.length} Specialized courses in the curriculum for your college.
                      Green = passed, Blue = in progress, Red = failed/retake, Gray = not yet taken.
                    </p>
                    <PlanFlowchart
                      courses={allSpecCourses}
                      getStatus={getStatusForFlowchart}
                      studentName={student.name}
                    />
                  </>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PortalLayout>
  );
}
