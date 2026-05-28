import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { Search, AlertTriangle, Info, CheckCircle, FileText } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import type { GradeValue } from '../../lib/types';

const REMOVAL_ELIGIBLE: GradeValue[] = ['4', 'INC'];

const getRemovalOptions = (grade: GradeValue): GradeValue[] => {
  if (grade === '4') return ['3.0', '5'] as GradeValue[];
  return ['1.0', '1.25', '1.5', '1.75', '2.0', '2.25', '2.5', '2.75', '3.0', '5'] as GradeValue[];
};

export default function FacultyRemovalGrades() {
  const { state, submitRemovalGradeFinal } = useApp();
  const me = state.currentUser;

  const [searchTermId, setSearchTermId] = useState(() => state.terms.find(t => t.isActive)?.id ?? '');
  const [searchSectionId, setSearchSectionId] = useState('');
  const [searchStudentNo, setSearchStudentNo] = useState('');
  const [foundGradeId, setFoundGradeId] = useState<string | null>(null);
  const [searchError, setSearchError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newGrade, setNewGrade] = useState<GradeValue | ''>('');
  const [remarks, setRemarks] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [remarksByGradeId, setRemarksByGradeId] = useState<Record<string, string>>({});
  const [histStudentNo, setHistStudentNo] = useState('');
  const [histFilter, setHistFilter] = useState('');

  if (!me) return null;

  const mySections = state.sections.filter(s => s.facultyId === me.id);
  const myTermIds = [...new Set(mySections.map(s => s.termId))];
  const myTerms = state.terms
    .filter(t => myTermIds.includes(t.id))
    .sort((a, b) => b.academicYear.localeCompare(a.academicYear));

  const sectionsInTerm = mySections.filter(s => s.termId === searchTermId);
  const currentTerm = state.terms.find(t => t.id === searchTermId);

  const foundGrade = foundGradeId ? state.grades.find(g => g.id === foundGradeId) ?? null : null;
  const foundStudent = foundGrade ? state.users.find(u => u.id === foundGrade.studentId) : null;
  const foundSection = foundGrade ? mySections.find(s => s.id === foundGrade.sectionId) : null;
  const foundCourse = foundSection ? state.courses.find(c => c.id === foundSection.courseId) : null;
  const gradeType = foundGrade?.grade === 'INC' ? 'Completion Grade' : 'Removal Grade';

  // Transaction history: all removal-submitted grades in my sections
  const allSubmittedRemovals = mySections.flatMap(sec =>
    state.grades.filter(g => g.sectionId === sec.id && g.removalSubmitted && g.removalGrade)
  );
  const filteredHistory = histFilter
    ? allSubmittedRemovals.filter(g => {
        const student = state.users.find(u => u.id === g.studentId);
        return (student?.studentNumber ?? '').replace(/[-\s]/g, '').includes(histFilter.replace(/[-\s]/g, ''));
      })
    : allSubmittedRemovals;

  const handleSearch = () => {
    setSearchError('');
    setFoundGradeId(null);
    if (!searchTermId || !searchSectionId || !searchStudentNo.trim()) {
      setSearchError('Please fill in all search fields.');
      return;
    }
    const normalizedInput = searchStudentNo.trim().replace(/[-\s]/g, '');
    const student = state.users.find(u =>
      u.role === 'student' && (u.studentNumber ?? '').replace(/[-\s]/g, '') === normalizedInput
    );
    if (!student) { setSearchError('Student not found.'); return; }
    const gradeRecord = state.grades.find(g => g.studentId === student.id && g.sectionId === searchSectionId);
    if (!gradeRecord) { setSearchError('No grade record found for this student in the selected class.'); return; }
    if (!gradeRecord.grade || !REMOVAL_ELIGIBLE.includes(gradeRecord.grade as GradeValue)) {
      setSearchError(`This student's grade (${gradeRecord.grade ?? 'N/A'}) is not eligible for removal/completion.`);
      return;
    }
    setFoundGradeId(gradeRecord.id);
  };

  const handleDialogSubmit = () => {
    if (!foundGrade || !newGrade || confirmText !== 'CONFIRM') return;
    submitRemovalGradeFinal(foundGrade.id, newGrade as GradeValue);
    setRemarksByGradeId(prev => ({ ...prev, [foundGrade.id]: remarks }));
    toast.success('Grade submitted!', { description: 'The removal/completion grade has been recorded.' });
    setDialogOpen(false);
    setNewGrade('');
    setRemarks('');
    setConfirmText('');
  };

  const generateForm13C = (g: typeof allSubmittedRemovals[0]) => {
    const student = state.users.find(u => u.id === g.studentId);
    const sec = mySections.find(s => s.id === g.sectionId);
    const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
    const term = sec ? state.terms.find(t => t.id === sec.termId) : null;
    const logoUrl = state.portalSettings?.logoUrl ?? '';
    const instName = state.portalSettings?.institutionName ?? 'University of the Philippines Los Baños';
    const type = g.grade === 'INC' ? 'Completion' : 'Removal';
    const units = (course?.units ?? 0) + (course?.labUnits ?? 0);
    const ayMatch = term?.name?.match(/\((\d{4}-\d{4})\)/);
    const ay = ayMatch ? ayMatch[1] : (term?.academicYear ?? '');
    const semesterName = term?.name?.replace(/\s*\([^)]*\)/, '').trim() ?? '';
    const dateOfCompletion = g.removalPostedAt
      ? new Date(g.removalPostedAt).toLocaleString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
      : '';
    const facultyName = me?.name ?? '';
    // Department head: find dept_head user whose department matches the course's department
    const deptHeadUser = state.users.find(u => u.role === 'department_head' && u.department === course?.department);
    const deptChairName = deptHeadUser?.name ?? '';
    // College: derive from course dept → college chain; fall back to dept head's stored college
    const courseDept = state.departments.find(d => d.name === course?.department);
    const courseCollege = courseDept ? state.colleges.find(c => c.id === courseDept.collegeId) : null;
    const collegeDisplay = courseCollege?.name ?? deptHeadUser?.college ?? student?.college ?? '';

    // Determine term checkbox
    const semLower = semesterName.toLowerCase();
    const chk1s = semLower.includes('first') || semLower.includes('1s') ? '&#9745;' : '&#9744;';
    const chk2s = semLower.includes('second') || semLower.includes('2s') ? '&#9745;' : '&#9744;';
    const chkMY = semLower.includes('mid') || semLower.includes('summer') || semLower.includes('my') ? '&#9745;' : '&#9744;';

    const buildCopy = (copyFor: string) => `
      <div class="copy">
        <div class="copy-inner">
          <div class="top-bar">
            <span>Form 13C</span>
            <span>Copy for ${copyFor}</span>
          </div>
          <div class="title-block">
            ${logoUrl ? `<img src="${logoUrl}" alt="" class="logo" />` : '<div class="logo-placeholder"></div>'}
            <div class="title-text">
              <div class="inst-name">${instName}</div>
              <div class="form-title">REPORT OF GRADE FOR COMPLETION or REMOVAL</div>
            </div>
            <div class="logo-spacer"></div>
          </div>
          <div class="fields">
            <div class="field-row">
              <div class="field-item grow"><span class="flabel">Name:</span><span class="fval">${(student?.name ?? '').toUpperCase()}</span><div class="fline"></div></div>
              <div class="field-item w240"><span class="flabel">Student Number:</span><span class="fval">${student?.studentNumber ?? ''}</span><div class="fline"></div></div>
            </div>
            <div class="field-row">
              <div class="field-item grow"><span class="flabel">Degree Program:</span><span class="fval">${student?.program ?? ''}</span><div class="fline"></div></div>
              <div class="field-item w240"><span class="flabel">College:</span><span class="fval">${collegeDisplay}</span><div class="fline"></div></div>
            </div>
            <div class="field-row">
              <div class="field-item w160"><span class="flabel">Course Code:</span><span class="fval">${course?.code ?? ''}</span><div class="fline"></div></div>
              <div class="field-item w90"><span class="flabel">Units:</span><span class="fval">${units}</span><div class="fline"></div></div>
              <div class="field-item grow term-field"><span class="flabel">Term:</span><span class="fval">&nbsp;${chk1s}1S&nbsp;&nbsp;${chk2s}2S&nbsp;&nbsp;${chkMY}MY</span><div class="fline"></div></div>
            </div>
            <div class="field-row">
              <div class="field-item grow"><span class="flabel">Course Title:</span><span class="fval">${course?.title ?? ''}</span><div class="fline"></div></div>
              <div class="field-item w200"><span class="flabel">Academic Year:</span><span class="fval">${ay}</span><div class="fline"></div></div>
            </div>
          </div>
          <table class="grade-table">
            <thead>
              <tr>
                <th style="width:30%">Original Grade</th>
                <th style="width:40%">Completion/Removal Grade</th>
                <th style="width:30%">Date of Completion</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${g.grade ?? ''}</td>
                <td>${g.removalGrade ?? ''}</td>
                <td>${dateOfCompletion}</td>
              </tr>
            </tbody>
          </table>
          <div class="sig-row">
            <div class="sig-field">
              <div class="sig-name">${facultyName}</div>
              <div class="sig-line"></div>
              <div class="sig-label">Name &amp; Signature of Instructor</div>
            </div>
            <div class="sig-field narrow">
              <div class="sig-name"></div>
              <div class="sig-line"></div>
              <div class="sig-label">Date</div>
            </div>
            <div class="sig-field">
              <div class="sig-name">${deptChairName}</div>
              <div class="sig-line"></div>
              <div class="sig-label">Name &amp; Signature of Dept/Unit Chair</div>
            </div>
            <div class="sig-field narrow">
              <div class="sig-name"></div>
              <div class="sig-line"></div>
              <div class="sig-label">Date</div>
            </div>
          </div>
        </div>
      </div>`;

    const html = `<!DOCTYPE html><html><head>
      <title>Form 13C – ${student?.name ?? ''}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Times New Roman', Times, serif; font-size: 11px; color: #000; background: #fff; }
        .page { display: flex; flex-direction: column; height: 277mm; }
        .copy { flex: 1; display: flex; flex-direction: column; padding: 8px 24px 6px; overflow: hidden; }
        .copy-inner { flex: 1; display: flex; flex-direction: column; }
        .cut-line { border-top: 2px dashed #888; margin: 0 4px; flex-shrink: 0; }
        /* Top bar */
        .top-bar { display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 3px; }
        /* Title */
        .title-block { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 6px; }
        .logo { width: 46px; height: 46px; object-fit: contain; flex-shrink: 0; }
        .logo-placeholder { width: 46px; height: 46px; flex-shrink: 0; }
        .logo-spacer { width: 46px; flex-shrink: 0; }
        .title-text { text-align: center; flex: 1; }
        .inst-name { font-size: 12px; font-weight: bold; }
        .form-title { font-size: 11px; font-weight: bold; text-transform: uppercase; margin-top: 1px; }
        /* Fields */
        .fields { margin-bottom: 4px; }
        .field-row { display: flex; gap: 10px; margin-bottom: 3px; align-items: flex-end; }
        .field-item { display: flex; align-items: flex-end; gap: 3px; flex-shrink: 0; position: relative; padding-bottom: 1px; }
        .field-item.grow { flex: 1; }
        .field-item.w240 { width: 240px; }
        .field-item.w200 { width: 200px; }
        .field-item.w160 { width: 160px; }
        .field-item.w90 { width: 90px; }
        .flabel { font-size: 10px; white-space: nowrap; flex-shrink: 0; }
        .fval { font-size: 10px; font-weight: bold; flex: 1; padding-left: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .fline { position: absolute; bottom: 0; left: 0; right: 0; border-bottom: 1px solid #000; }
        .term-field .fval { font-weight: normal; }
        /* Grade table */
        .grade-table { width: 100%; border-collapse: collapse; margin: 4px 0; }
        .grade-table th { border: 1px solid #000; padding: 3px 8px; font-size: 10px; font-weight: bold; text-align: left; }
        .grade-table td { border: 1px solid #000; padding: 3px 8px; font-size: 10.5px; height: 28px; }
        /* Signatures */
        .sig-row { display: flex; gap: 14px; margin-top: auto; padding-top: 8px; }
        .sig-field { flex: 1; }
        .sig-field.narrow { flex: 0 0 72px; }
        .sig-name { font-size: 9.5px; text-align: center; min-height: 20px; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 1px; }
        .sig-line { border-top: 1px solid #000; margin-bottom: 2px; }
        .sig-label { font-size: 9px; text-align: center; }
        @media print {
          @page { size: A4; margin: 10mm 12mm; }
          .page { height: 277mm; }
        }
      </style>
    </head><body>
      <div class="page">
        ${buildCopy('OUR')}
        <div class="cut-line"></div>
        ${buildCopy('College')}
        <div class="cut-line"></div>
        ${buildCopy('Student')}
      </div>
    </body></html>`;

    const win = window.open('', '_blank');
    if (!win) { toast.error('Popup blocked. Please allow popups for this site.'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  };

  return (
    <PortalLayout title="Removal/Completion of Grades">
      <div className="space-y-6">

        {/* Instruction banner */}
        <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4 text-sm text-blue-900">
          <div className="flex items-center gap-2 font-semibold mb-2">
            <Info size={16} className="text-blue-600" /> Instructions
          </div>
          <ul className="list-disc list-inside space-y-1 text-blue-800 text-xs leading-relaxed">
            <li>This module is for submitting grades for students who received a grade of <strong>4.00 (Conditional Failure)</strong> or <strong>INC (Incomplete)</strong>.</li>
            <li>Search for the student using their <strong>Term/Semester</strong>, <strong>Class</strong>, and <strong>Student Number</strong> (no dashes/hyphens).</li>
            <li>Select the appropriate replacement grade from the dropdown. <strong>Once submitted, changes cannot be made through this system.</strong></li>
            <li>For grade <strong>4.00</strong>: The student may receive a grade of <strong>3.0</strong> (passing) or <strong>5</strong> (failing).</li>
            <li>For grade <strong>INC</strong>: The student may receive any passing grade (1.0–3.0) or <strong>5</strong> (failing).</li>
            <li>Contact the Registrar's Office if corrections are needed after submission.</li>
          </ul>
        </div>

        {/* Search Student */}
        <div className="rounded-md border border-border overflow-hidden">
          <div className="px-4 py-3 bg-background border-b border-border">
            <h3 className="font-bold text-[#8B0000] text-sm">Search Student</h3>
          </div>
          <div className="p-4 bg-background">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div>
                <Label className="text-xs font-medium">
                  Term/Semester of Incurred 4.00/INC Grades <span className="text-red-500">*</span>
                </Label>
                <Select value={searchTermId} onValueChange={v => { setSearchTermId(v); setSearchSectionId(''); setFoundGradeId(null); setSearchError(''); }}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="--" /></SelectTrigger>
                  <SelectContent>
                    {myTerms.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium">
                  Class <span className="text-red-500">*</span>
                </Label>
                <Select value={searchSectionId} onValueChange={v => { setSearchSectionId(v); setFoundGradeId(null); setSearchError(''); }} disabled={!searchTermId}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="e.g. CMSC 12 - A1" /></SelectTrigger>
                  <SelectContent>
                    {sectionsInTerm.map(sec => {
                      const course = state.courses.find(c => c.id === sec.courseId);
                      return <SelectItem key={sec.id} value={sec.id}>{course?.code} - {sec.sectionCode}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium">
                  Student No. <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="e.g. 2025-12345"
                    value={searchStudentNo}
                    onChange={e => setSearchStudentNo(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  />
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white shrink-0 w-9 h-9 p-0" onClick={handleSearch}>
                    <Search size={16} />
                  </Button>
                </div>
              </div>
            </div>
            {searchError && (
              <div className="mt-3 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
                <AlertTriangle size={14} /> {searchError}
              </div>
            )}
          </div>
        </div>

        {/* Student Details */}
        <div className="rounded-md border border-border overflow-hidden">
          <div className="px-4 py-3 bg-background border-b border-border">
            <h3 className="font-bold text-[#8B0000] text-sm">Student Details</h3>
          </div>
          <div className="p-4 bg-background">
            {!foundGrade ? (
              <p className="text-sm text-muted-foreground italic">Search for a student to view their details.</p>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-1.5 text-sm">
                  <p><span className="text-muted-foreground">Student Name:</span>{'  '}<strong>{foundStudent?.name?.toUpperCase() ?? '—'}</strong></p>
                  <p><span className="text-muted-foreground">Student ID:</span>{'  '}<strong>{foundStudent?.studentNumber ?? '—'}</strong></p>
                  <p><span className="text-muted-foreground">Program:</span>{'  '}<strong>{foundStudent?.program ?? '—'}</strong></p>
                  <p><span className="text-muted-foreground">Term:</span>{'  '}<strong>{currentTerm?.name ?? '—'}</strong></p>
                  <p><span className="text-muted-foreground">Course Code:</span>{'  '}<strong>{foundCourse?.code} – {foundCourse?.title}</strong></p>
                  <p><span className="text-muted-foreground">Section:</span>{'  '}<strong>{foundSection?.sectionCode ?? '—'}</strong></p>
                  <p><span className="text-muted-foreground">Grade:</span>{'  '}<strong>{foundGrade.grade ?? '—'}</strong></p>
                  <p><span className="text-muted-foreground">Remarks:</span>{'  '}<strong>{foundGrade.remarks ?? '—'}</strong></p>
                </div>
                {foundGrade.removalSubmitted ? (
                  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
                    <CheckCircle size={14} /> Removal/Completion grade already submitted: <strong>{foundGrade.removalGrade}</strong>
                  </div>
                ) : (
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => { setNewGrade(''); setRemarks(''); setConfirmText(''); setDialogOpen(true); }}
                  >
                    Remove/Complete Grade
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Removal/Completion Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md p-0 overflow-hidden">
            <DialogHeader>
              <DialogTitle className="bg-[#8B0000] text-white text-center px-6 py-3 text-base font-bold">
                Removal/Completion
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 p-6">
              <div className="text-sm">
                <p className="font-semibold">Please review the details below carefully before submitting.</p>
                <p className="text-red-600 italic text-xs mt-0.5">Important: Once submitted, changes may not be allowed.</p>
              </div>
              <div>
                <Label className="text-xs font-semibold">Grade Type: <span className="text-red-500">*</span></Label>
                <Input className="mt-1 bg-muted cursor-not-allowed" value={gradeType} readOnly />
              </div>
              <div>
                <Label className="text-xs font-semibold">Grade: <span className="text-red-500">*</span></Label>
                <Select value={newGrade} onValueChange={v => setNewGrade(v as GradeValue)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {foundGrade && getRemovalOptions(foundGrade.grade as GradeValue).map(g => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Remarks (Optional):</Label>
                <Textarea className="mt-1" rows={3} value={remarks} onChange={e => setRemarks(e.target.value)} />
              </div>
              <div className="rounded border border-red-200 bg-red-50 p-3 text-center text-xs space-y-1">
                <p className="font-medium text-foreground">Do you confirm that the data provided is correct?</p>
                <p className="text-foreground">If yes, please type <strong>"CONFIRM"</strong> to submit:</p>
                <p className="text-red-600 font-bold">ONCE SUBMITTED, CHANGES VIA THIS SYSTEM ARE NOT ALLOWED.</p>
                <Input
                  className="mt-1 text-center"
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={!newGrade || confirmText !== 'CONFIRM'}
                  onClick={handleDialogSubmit}
                >
                  Submit
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Transaction History */}
        <div className="portal-panel">
          <div className="bg-[#2e6b4f] text-white px-4 py-3 font-bold text-sm tracking-wide">
            TRANSACTION HISTORY
          </div>
          <div className="p-4 bg-background border-b border-border flex items-end gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Student No.</Label>
              <Input className="mt-1 w-40 h-8 text-sm" value={histStudentNo} onChange={e => setHistStudentNo(e.target.value)} />
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-8 text-sm" onClick={() => setHistFilter(histStudentNo)}>
              Apply Filter
            </Button>
          </div>
          {filteredHistory.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm bg-background">
              No submitted removal/completion grades yet.
            </div>
          ) : (
            <div className="overflow-x-auto bg-background">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left font-bold text-xs">STUDENT NO.</th>
                    <th className="px-4 py-3 text-left font-bold text-xs">TERM – AY</th>
                    <th className="px-4 py-3 text-left font-bold text-xs">COURSE CODE – TITLE</th>
                    <th className="px-4 py-3 text-left font-bold text-xs">GRADE</th>
                    <th className="px-4 py-3 text-left font-bold text-xs">REMARKS</th>
                    <th className="px-4 py-3 text-left font-bold text-xs">GRADE TYPE</th>
                    <th className="px-4 py-3 text-left font-bold text-xs">DATE POSTED</th>
                    <th className="px-4 py-3 text-left font-bold text-xs">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((g, idx) => {
                    const student = state.users.find(u => u.id === g.studentId);
                    const sec = mySections.find(s => s.id === g.sectionId);
                    const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
                    const term = sec ? state.terms.find(t => t.id === sec.termId) : null;
                    const type = g.grade === 'INC' ? 'Completion Grade' : 'Removal Grade';
                    return (
                      <tr key={g.id} className={`border-b border-border last:border-0 ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}>
                        <td className="px-4 py-3">{student?.studentNumber ?? '—'}</td>
                        <td className="px-4 py-3 text-xs">{term?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-xs">{course?.code} – {course?.title}</td>
                        <td className="px-4 py-3 font-bold">{g.removalGrade}</td>
                        <td className="px-4 py-3 text-xs">{remarksByGradeId[g.id] ?? g.remarks ?? '—'}</td>
                        <td className="px-4 py-3 text-xs">{type}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {g.removalPostedAt
                            ? new Date(g.removalPostedAt).toLocaleString('en-PH', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true })
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 text-xs h-7 px-2.5"
                            onClick={() => generateForm13C(g)}
                          >
                            <FileText size={12} /> Form 13C
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </PortalLayout>
  );
}
