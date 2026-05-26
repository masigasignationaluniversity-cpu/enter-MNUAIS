import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { Search, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import type { GradeValue } from '../../lib/types';

const REMOVAL_ELIGIBLE: GradeValue[] = ['4', 'INC'];

const getRemovalOptions = (grade: GradeValue): GradeValue[] => {
  if (grade === '4') return ['3.0', '5'] as GradeValue[];
  return ['1.0', '1.25', '1.5', '1.75', '2.0', '2.25', '2.5', '2.75', '3.0', '5'] as GradeValue[];
};

export default function FacultyRemovalGrades() {
  const { state, submitRemovalGradeFinal } = useApp();
  const { toast } = useToast();
  const me = state.currentUser;

  // All hooks must be before any early return
  const [searchTermId, setSearchTermId] = useState('');
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
    toast({ title: 'Grade submitted!', description: 'The removal/completion grade has been recorded.' });
    setDialogOpen(false);
    setNewGrade('');
    setRemarks('');
    setConfirmText('');
    // Keep foundGrade visible but as submitted view
  };

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

  return (
    <PortalLayout title="Removal/Completion of Grades">
      <div className="space-y-6">

        {/* Page header */}
        <div className="bg-[#8B0000] text-white text-center px-4 py-3 rounded-md font-bold text-sm tracking-wide">
          SUBMISSION OF GRADES FOR REMOVAL OF "4.00" AND COMPLETION OF "INC" GRADES
        </div>

        {/* Instruction banner */}
        <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
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
        <div className="rounded-md overflow-hidden border border-border">
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
