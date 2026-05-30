import { useState, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useApp } from '@/contexts/AppContext';
import { type Schedule } from '@/lib/types';
import { Plus, Minus, FileText, Send, AlertTriangle, X, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  termId: string;
  studentId: string;
}

const fmtSched = (s?: Schedule) => {
  if (!s || !s.days?.length) return 'TBA';
  return `${s.days.join('')} ${s.startTime}–${s.endTime}`;
};

export function StudentChangeDropModal({ open, onOpenChange, termId, studentId }: Props) {
  const { state, submitChangeDropRequest, checkPrerequisites, checkCorequisites, getCurrentUnits } = useApp();

  const [addSections, setAddSections] = useState<string[]>([]);
  const [dropSections, setDropSections] = useState<string[]>([]);
  const [courseSearch, setCourseSearch] = useState('');
  const [statement, setStatement] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'add' | 'drop' | 'review'>('add');
  const pdfRef = useRef<HTMLDivElement>(null);

  const activeTerm = state.terms.find(t => t.id === termId);
  const student = state.users.find(u => u.id === studentId);
  const maxUnits = activeTerm?.maxUnits ?? 21;

  // Current enrolled sections (for Drop tab)
  const enrolledRows = useMemo(() =>
    state.enrollments
      .filter(e => e.studentId === studentId && e.termId === termId && e.status === 'enrolled')
      .map(e => {
        const sec = state.sections.find(s => s.id === e.sectionId);
        const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
        return { enrollment: e, sec, course };
      })
      .filter(r => r.sec && r.course),
    [state.enrollments, state.sections, state.courses, studentId, termId]
  );

  // Available sections for the Add tab (after search)
  const searchResults = useMemo(() => {
    const q = courseSearch.trim().toLowerCase();
    if (!q) return [];
    return state.sections
      .filter(sec => {
        if (sec.termId !== termId) return false;
        const course = state.courses.find(c => c.id === sec.courseId);
        if (!course) return false;
        if (
          !course.code.toLowerCase().includes(q) &&
          !course.title.toLowerCase().includes(q) &&
          !sec.sectionCode.toLowerCase().includes(q)
        ) return false;
        // Skip if already in addSections (same section)
        if (addSections.includes(sec.id)) return true; // keep so they show as selected
        // Skip if already enrolled in this course (unless being dropped)
        const enrolledInCourse = state.enrollments.some(
          e => e.studentId === studentId && e.termId === termId && e.status !== 'dropped' &&
          state.sections.find(s => s.id === e.sectionId)?.courseId === course.id
        );
        const isDropping = dropSections.some(
          sid => state.sections.find(s => s.id === sid)?.courseId === course.id
        );
        if (enrolledInCourse && !isDropping) return false;
        // Skip if already selected to add (different section of same course)
        const alreadySelectedCourse = addSections.some(
          sid => sid !== sec.id && state.sections.find(s => s.id === sid)?.courseId === course.id
        );
        return !alreadySelectedCourse;
      })
      .slice(0, 20);
  }, [courseSearch, state, termId, studentId, addSections, dropSections]);

  // Unit calculations
  const baseUnits = getCurrentUnits(studentId, termId);
  const droppingUnits = dropSections.reduce((sum, sid) => {
    const sec = state.sections.find(s => s.id === sid);
    const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
    if (!course || course.isPE || course.isNSTP) return sum;
    return sum + (course.units ?? 0) + (course.labUnits ?? 0);
  }, 0);
  const addingUnits = addSections.reduce((sum, sid) => {
    const sec = state.sections.find(s => s.id === sid);
    const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
    if (!course || course.isPE || course.isNSTP) return sum;
    return sum + (course.units ?? 0) + (course.labUnits ?? 0);
  }, 0);
  const projectedUnits = baseUnits - droppingUnits + addingUnits;
  const overload = projectedUnits > maxUnits;

  const toggleAdd = (sectionId: string) =>
    setAddSections(prev =>
      prev.includes(sectionId) ? prev.filter(id => id !== sectionId) : [...prev, sectionId]
    );
  const toggleDrop = (sectionId: string) =>
    setDropSections(prev =>
      prev.includes(sectionId) ? prev.filter(id => id !== sectionId) : [...prev, sectionId]
    );

  const reset = () => {
    setAddSections([]);
    setDropSections([]);
    setCourseSearch('');
    setStatement('');
    setConfirmed(false);
    setActiveTab('add');
  };

  // PDF generation — opens a printable HTML page in a new window
  const generatePDF = () => {
    const ps = state.portalSettings;
    const instName = ps?.institutionName || ps?.portalName || 'University';
    const logoUrl = ps?.logoUrl ?? '';
    const dateStr = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });

    const addRows = addSections.map(sid => {
      const sec = state.sections.find(s => s.id === sid);
      const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
      return { sec, course };
    }).filter(r => r.sec && r.course);

    const dropRows = dropSections.map(sid => {
      const sec = state.sections.find(s => s.id === sid);
      const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
      return { sec, course };
    }).filter(r => r.sec && r.course);

    const rowStyle = 'border:1px solid #000;padding:4px 8px;font-size:10px';
    const mkAddRows = addRows.map((r, i) =>
      `<tr style="${i % 2 ? 'background:#f9fafb' : ''}">
        <td style="${rowStyle}">${r.course!.code}</td>
        <td style="${rowStyle}">${r.course!.title}</td>
        <td style="${rowStyle};text-align:center">${r.course!.units}</td>
        <td style="${rowStyle};text-align:center">${r.sec!.sectionCode}</td>
        <td style="${rowStyle};font-size:9.5px">${fmtSched(r.sec!.schedule)}</td>
      </tr>`
    ).join('');
    const mkDropRows = dropRows.map((r, i) =>
      `<tr style="${i % 2 ? 'background:#f9fafb' : ''}">
        <td style="${rowStyle}">${r.course!.code}</td>
        <td style="${rowStyle}">${r.course!.title}</td>
        <td style="${rowStyle};text-align:center">${r.course!.units}</td>
        <td style="${rowStyle};text-align:center">${r.sec!.sectionCode}</td>
        <td style="${rowStyle};font-size:9.5px">${fmtSched(r.sec!.schedule)}</td>
      </tr>`
    ).join('');

    const thStyle = 'border:1px solid #000;padding:4px 8px;font-size:10px;background:#e5e7eb;text-align:left';
    const tableHeader = `<tr><th style="${thStyle}">Course Code</th><th style="${thStyle}">Course Title</th><th style="${thStyle};width:40px;text-align:center">Units</th><th style="${thStyle};width:65px;text-align:center">Section</th><th style="${thStyle}">Schedule</th></tr>`;

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8" /><title>Change/Drop Request — ${student?.name ?? ''}</title>
<style>
  @page { size: A4 portrait; margin: 16mm 18mm; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; font-size: 11px; }
  .divider { border-top: 1.5px solid #333; margin: 10px 0 5px; }
  .section-label { font-size: 10.5px; font-weight: bold; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 4px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head><body>
  <div style="display:flex;align-items:center;gap:10px;justify-content:center;margin-bottom:6px">
    ${logoUrl ? `<img src="${logoUrl}" style="width:50px;height:50px;border-radius:50%;object-fit:cover;border:1px solid #ccc" />` : ''}
    <div style="text-align:center">
      <div style="font-size:13px;font-weight:bold;text-transform:uppercase">${instName}</div>
      <div style="font-size:10px;margin-top:2px">Office of the College Secretary</div>
    </div>
  </div>
  <div style="text-align:center;margin:6px 0 12px">
    <div style="font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:.05em">Request to Change / Drop Subjects</div>
    <div style="font-size:9.5px;color:#555;margin-top:3px">${activeTerm?.name ?? ''} &bull; Date Filed: ${dateStr}</div>
  </div>

  <table style="border-collapse:collapse;width:100%;margin-bottom:10px">
    <tr>
      <td style="font-size:10px;width:22%;padding:2px 0"><b>Student Name:</b></td>
      <td style="font-size:10px;padding:2px 0">${student?.name ?? ''}</td>
      <td style="font-size:10px;width:18%;padding:2px 0"><b>Student No.:</b></td>
      <td style="font-size:10px;padding:2px 0">${student?.studentNumber ?? ''}</td>
    </tr>
    <tr>
      <td style="font-size:10px;padding:2px 0"><b>Program:</b></td>
      <td style="font-size:10px;padding:2px 0" colspan="3">${(student as { program?: string })?.program ?? ''}</td>
    </tr>
    <tr>
      <td style="font-size:10px;padding:2px 0"><b>Academic Term:</b></td>
      <td style="font-size:10px;padding:2px 0" colspan="3">${activeTerm?.name ?? ''}</td>
    </tr>
  </table>

  ${addRows.length > 0 ? `
  <div class="divider"></div>
  <div class="section-label">Courses to Add (Change)</div>
  <table style="border-collapse:collapse;width:100%;margin-bottom:10px">${tableHeader}${mkAddRows}</table>` : ''}

  ${dropRows.length > 0 ? `
  <div class="divider"></div>
  <div class="section-label">Courses to Drop</div>
  <table style="border-collapse:collapse;width:100%;margin-bottom:10px">${tableHeader}${mkDropRows}</table>` : ''}

  <div class="divider"></div>
  <div class="section-label">Statement / Reason</div>
  <div style="font-size:10px;border:1px solid #ccc;padding:8px;min-height:48px;margin-bottom:12px">${(statement || '').replace(/\n/g, '<br/>')}</div>

  <div style="font-size:9px;border:1px solid #aaa;padding:7px;background:#f3f4f6;margin-bottom:14px">
    <b>DECLARATION:</b> I hereby certify that the information above is true and correct. I understand that this request is subject to OCS review and approval. I accept that once approved, the changes will be reflected in my official enrollment record. Submission of false information may result in disciplinary action.
  </div>

  <div style="display:flex;justify-content:space-between;margin-top:36px">
    <div style="border-top:1px solid #000;width:210px;padding-top:3px;font-size:9px">Student Signature over Printed Name / Date</div>
    <div style="border-top:1px solid #000;width:180px;padding-top:3px;font-size:9px">OCS Staff Signature / Date Processed</div>
    <div style="border-top:1px solid #000;width:130px;padding-top:3px;font-size:9px">
      Status: &nbsp;[&nbsp;] Approved &nbsp; [&nbsp;] Denied
    </div>
  </div>
</body></html>`;

    const win = window.open('', '_blank', 'width=820,height=960');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.onload = () => win.print();
    }
  };

  const handleSubmit = async () => {
    if (!statement.trim()) { toast.error('Please write a statement/reason.'); return; }
    if (!confirmed) { toast.error('Please confirm the declaration.'); return; }
    if (addSections.length === 0 && dropSections.length === 0) {
      toast.error('Please select at least one course to add or drop.');
      return;
    }
    setSubmitting(true);
    try {
      await submitChangeDropRequest(studentId, termId, statement.trim(), addSections, dropSections);
      toast.success('Request submitted!', { description: 'OCS will review your Change/Drop request.' });
      reset();
      onOpenChange(false);
      setTimeout(() => generatePDF(), 400); // auto-download PDF after dialog closes
    } catch {
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const addRowsForReview = addSections.map(sid => {
    const sec = state.sections.find(s => s.id === sid);
    const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
    return { sid, sec, course };
  }).filter(r => r.sec && r.course);

  const dropRowsForReview = dropSections.map(sid => {
    const sec = state.sections.find(s => s.id === sid);
    const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
    return { sid, sec, course };
  }).filter(r => r.sec && r.course);

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <DialogTitle className="text-base">Request to Change / Drop Subjects</DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">{activeTerm?.name} — Select courses to add or drop, write your statement, then submit.</p>
        </DialogHeader>

        {/* Unit progress bar */}
        <div className="px-6 py-2 border-b bg-muted/30 flex items-center gap-4 text-xs">
          <span className="text-muted-foreground">Enrolled units: <span className="font-semibold text-foreground">{baseUnits}</span></span>
          {droppingUnits > 0 && <span className="text-red-600 font-medium">− {droppingUnits} dropping</span>}
          {addingUnits > 0 && <span className="text-emerald-600 font-medium">+ {addingUnits} adding</span>}
          <span className={`font-bold ${overload ? 'text-red-600' : 'text-foreground'}`}>
            → Projected: {projectedUnits} / {maxUnits} units
          </span>
          {overload && <Badge className="text-[10px] bg-red-100 text-red-800 border-red-300">Over limit</Badge>}
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4" ref={pdfRef}>
          <Tabs value={activeTab} onValueChange={v => setActiveTab(v as typeof activeTab)}>
            <TabsList className="w-full justify-start gap-1">
              <TabsTrigger value="add" className="gap-1.5 text-xs">
                <Plus className="w-3.5 h-3.5" />
                Change / Add
                {addSections.length > 0 && (
                  <span className="ml-1 h-4 px-1.5 text-[10px] bg-primary text-primary-foreground rounded-full flex items-center">{addSections.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="drop" className="gap-1.5 text-xs">
                <Minus className="w-3.5 h-3.5" />
                Drop
                {dropSections.length > 0 && (
                  <span className="ml-1 h-4 px-1.5 text-[10px] bg-destructive text-destructive-foreground rounded-full flex items-center">{dropSections.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="review" className="gap-1.5 text-xs">
                <FileText className="w-3.5 h-3.5" />
                Statement &amp; Submit
              </TabsTrigger>
            </TabsList>

            {/* ── CHANGE / ADD TAB ── */}
            <TabsContent value="add" className="mt-4 space-y-3">
              <Input
                placeholder="Search course code or title (e.g. NRC, Math 11)..."
                value={courseSearch}
                onChange={e => setCourseSearch(e.target.value)}
                className="text-sm"
              />

              {/* Selected to add */}
              {addSections.length > 0 && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-[11px] font-semibold text-emerald-800 mb-2">Selected to Add ({addSections.length})</p>
                  <div className="space-y-1.5">
                    {addSections.map(sid => {
                      const sec = state.sections.find(s => s.id === sid);
                      const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
                      if (!sec || !course) return null;
                      return (
                        <div key={sid} className="flex items-center justify-between bg-white rounded border border-emerald-200 px-2.5 py-1.5 text-xs">
                          <span><strong>{course.code}</strong> — {sec.sectionCode} &bull; {fmtSched(sec.schedule)}</span>
                          <button type="button" onClick={() => toggleAdd(sid)} className="ml-2 text-red-400 hover:text-red-600">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {courseSearch.trim() ? (
                searchResults.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No available sections found for "{courseSearch}".</p>
                ) : (
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted border-b">
                        <tr>
                          <th className="text-left px-3 py-2 font-semibold">Course</th>
                          <th className="text-left px-3 py-2 font-semibold">Section</th>
                          <th className="text-left px-3 py-2 font-semibold">Schedule</th>
                          <th className="text-center px-3 py-2 font-semibold">Slots</th>
                          <th className="text-center px-3 py-2 font-semibold">Units</th>
                          <th className="px-3 py-2 w-20"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {searchResults.map(sec => {
                          const course = state.courses.find(c => c.id === sec.courseId)!;
                          const prereq = checkPrerequisites(studentId, sec.courseId);
                          const coreq = checkCorequisites(studentId, sec.courseId, termId);
                          const isSelected = addSections.includes(sec.id);
                          const isFull = sec.enrolled >= sec.slots;
                          const hasWarning = !prereq.passed || !coreq.passed;
                          return (
                            <tr key={sec.id} className={isSelected ? 'bg-emerald-50' : hasWarning ? 'bg-amber-50/60' : ''}>
                              <td className="px-3 py-2.5">
                                <p className="font-semibold">{course.code}</p>
                                <p className="text-muted-foreground">{course.title}</p>
                                {!prereq.passed && (
                                  <p className="text-amber-600 text-[10px] mt-0.5">
                                    <AlertTriangle className="w-2.5 h-2.5 inline" /> Prereq: {prereq.missing.join(', ')}
                                  </p>
                                )}
                                {!coreq.passed && (
                                  <p className="text-amber-600 text-[10px] mt-0.5">
                                    <AlertTriangle className="w-2.5 h-2.5 inline" /> Coreq: {coreq.missing.join(', ')}
                                  </p>
                                )}
                              </td>
                              <td className="px-3 py-2.5 font-medium">{sec.sectionCode}</td>
                              <td className="px-3 py-2.5 whitespace-nowrap">{fmtSched(sec.schedule)}</td>
                              <td className="px-3 py-2.5 text-center">
                                <span className={isFull ? 'text-red-600 font-semibold' : ''}>{sec.enrolled}/{sec.slots}</span>
                              </td>
                              <td className="px-3 py-2.5 text-center">{course.units}</td>
                              <td className="px-3 py-2.5 text-center">
                                <Button
                                  size="sm"
                                  variant={isSelected ? 'outline' : 'default'}
                                  className={`h-6 px-2 text-[10px] ${isSelected ? 'border-red-300 text-red-600 hover:bg-red-50' : ''}`}
                                  onClick={() => toggleAdd(sec.id)}
                                >
                                  {isSelected ? 'Remove' : 'Select'}
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                <p className="text-xs text-muted-foreground text-center py-8">Type a course code or title to search available sections.</p>
              )}
            </TabsContent>

            {/* ── DROP TAB ── */}
            <TabsContent value="drop" className="mt-4 space-y-3">
              {enrolledRows.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No enrolled courses found for this term.</p>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted border-b">
                      <tr>
                        <th className="w-10 px-3 py-2"></th>
                        <th className="text-left px-3 py-2 font-semibold">Course</th>
                        <th className="text-left px-3 py-2 font-semibold">Section</th>
                        <th className="text-left px-3 py-2 font-semibold">Schedule</th>
                        <th className="text-center px-3 py-2 font-semibold">Units</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {enrolledRows.map(({ enrollment, sec, course }) => {
                        const checked = dropSections.includes(enrollment.sectionId);
                        return (
                          <tr key={enrollment.id} className={checked ? 'bg-red-50' : ''}>
                            <td className="px-3 py-2.5 text-center">
                              <Checkbox checked={checked} onCheckedChange={() => toggleDrop(enrollment.sectionId)} />
                            </td>
                            <td className="px-3 py-2.5">
                              <p className="font-semibold">{course!.code}</p>
                              <p className="text-muted-foreground">{course!.title}</p>
                            </td>
                            <td className="px-3 py-2.5">{sec!.sectionCode}</td>
                            <td className="px-3 py-2.5 whitespace-nowrap">{fmtSched(sec!.schedule)}</td>
                            <td className="px-3 py-2.5 text-center">{course!.units}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {dropSections.length > 0 && (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>You have selected <strong>{dropSections.length}</strong> course(s) to drop. A grade of <strong>DRP</strong> will be recorded for officially dropped courses once approved by OCS.</span>
                </div>
              )}
            </TabsContent>

            {/* ── STATEMENT & SUBMIT TAB ── */}
            <TabsContent value="review" className="mt-4 space-y-4">
              {addSections.length === 0 && dropSections.length === 0 && (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  No courses selected. Use the Change/Add or Drop tabs to select courses first.
                </div>
              )}

              {/* Summary */}
              {(addRowsForReview.length > 0 || dropRowsForReview.length > 0) && (
                <div className="rounded-lg border p-3 space-y-2.5 bg-muted/20">
                  {addRowsForReview.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-emerald-800 mb-1.5">Courses to Add ({addRowsForReview.length})</p>
                      <div className="space-y-1">
                        {addRowsForReview.map(r => (
                          <div key={r.sid} className="text-xs bg-emerald-50 border border-emerald-200 rounded px-2.5 py-1.5 flex items-center gap-2">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                            <strong>{r.course!.code}</strong> — {r.sec!.sectionCode} &bull; {fmtSched(r.sec!.schedule)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {dropRowsForReview.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-red-800 mb-1.5">Courses to Drop ({dropRowsForReview.length})</p>
                      <div className="space-y-1">
                        {dropRowsForReview.map(r => (
                          <div key={r.sid} className="text-xs bg-red-50 border border-red-200 rounded px-2.5 py-1.5 flex items-center gap-2">
                            <Minus className="w-3 h-3 text-red-600 shrink-0" />
                            <strong>{r.course!.code}</strong> — {r.sec!.sectionCode} &bull; {fmtSched(r.sec!.schedule)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Statement */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Statement / Reason <span className="text-red-500">*</span></label>
                <Textarea
                  rows={4}
                  placeholder="State your reason for this request (e.g., schedule conflict, wrong subject enlisted, medical reason, etc.)..."
                  value={statement}
                  onChange={e => setStatement(e.target.value)}
                  className="text-sm resize-none"
                />
              </div>

              {/* Terms & Conditions */}
              <div className="text-xs border rounded-lg p-3 bg-muted/20 space-y-1.5">
                <p className="font-semibold text-foreground">Terms and Conditions</p>
                <ul className="space-y-1 text-muted-foreground leading-relaxed">
                  <li>• All dropping and change requests shall be reflected in the student's official academic record.</li>
                  <li>• A grade of DRP (Dropped) shall be recorded for officially dropped courses.</li>
                  <li>• This request is subject to OCS review and approval. Filing a request does not guarantee approval.</li>
                  <li>• Once approved, the changes will be automatically reflected in your enrollment record without requiring re-finalization.</li>
                  <li>• Submission of false or misleading information may result in disciplinary action.</li>
                </ul>
              </div>

              {/* Confirm */}
              <div className="flex items-start gap-2">
                <Checkbox id="cd-confirm" checked={confirmed} onCheckedChange={v => setConfirmed(!!v)} />
                <label htmlFor="cd-confirm" className="text-xs cursor-pointer leading-relaxed">
                  I have read and agree to the Terms and Conditions above, and I declare that all information I provided is true and correct.
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={generatePDF}
                  disabled={addSections.length === 0 && dropSections.length === 0}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Preview PDF
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={!confirmed || !statement.trim() || (addSections.length === 0 && dropSections.length === 0) || submitting}
                  onClick={handleSubmit}
                >
                  <Send className="w-3.5 h-3.5" />
                  {submitting ? 'Submitting…' : 'Submit Request'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
