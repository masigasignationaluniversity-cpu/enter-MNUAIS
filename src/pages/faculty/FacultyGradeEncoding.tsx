import { useState } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Send, AlertTriangle, CheckCircle, Download, Lock, CalendarDays, BookOpen } from 'lucide-react';
import type { GradeValue } from '@/lib/types';

const GRADES: GradeValue[] = ['1.0','1.25','1.5','1.75','2.0','2.25','2.5','2.75','3.0','4','5','INC','DRP'];

const gradeColor = (g: GradeValue | null) => {
  if (!g) return 'text-gray-400';
  if (['1.0','1.25','1.5','1.75','2.0','2.25','2.5','2.75','3.0'].includes(g)) return 'text-green-700';
  if (g === '4') return 'text-yellow-600';
  if (g === '5') return 'text-red-600';
  if (g === 'INC') return 'text-orange-600';
  if (g === 'DRP') return 'text-gray-500';
  return 'text-gray-700';
};

export default function FacultyGradeEncoding() {
  const { state, submitGrade, submitGradesBatch } = useApp();
  const faculty = state.currentUser;

  const mySections = state.sections.filter(s => s.facultyId === (faculty?.id ?? ''));

  // Terms where this faculty has sections
  const myTermIds = [...new Set(mySections.map(s => s.termId))];
  const myTerms = state.terms.filter(t => myTermIds.includes(t.id))
    .sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0));

  const defaultTermId = myTerms.find(t => t.isActive)?.id ?? myTerms[0]?.id ?? '';
  const [selectedTermId, setSelectedTermId] = useState<string>(defaultTermId);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');

  if (!faculty) return null;

  // Sections for selected term
  const termSections = mySections.filter(s => s.termId === selectedTermId);

  const handleTermChange = (termId: string) => {
    setSelectedTermId(termId);
    setSelectedSectionId(''); // reset section
  };

  const handleSectionChange = (sectionId: string) => {
    setSelectedSectionId(sectionId);
  };

  const section = state.sections.find(s => s.id === selectedSectionId);
  const course = section ? state.courses.find(c => c.id === section.courseId) : null;
  const term = section ? state.terms.find(t => t.id === section.termId) : state.terms.find(t => t.id === selectedTermId);

  const gradeRecords = state.grades.filter(g => g.sectionId === selectedSectionId);
  const enrolled = state.enrollments.filter(e => e.sectionId === selectedSectionId && e.status !== 'dropped');

  const getStudent = (id: string) => state.users.find(u => u.id === id);

  const allGradesFilled = gradeRecords.length > 0 && gradeRecords.every(g => g.grade !== null);
  const allSubmitted = gradeRecords.length > 0 && gradeRecords.every(g => g.submitted);
  const anySubmitted = gradeRecords.some(g => g.submitted);

  // Grade encoding window check
  const now = new Date();
  const encodingFromDate = term?.encodingFrom ? new Date(term.encodingFrom) : null;
  const encodingUntilDate = term?.encodingUntil ? new Date(term.encodingUntil) : null;
  const beforeEncodingWindow = !!encodingFromDate && now < encodingFromDate;
  const afterEncodingWindow = !!encodingUntilDate && now > encodingUntilDate;
  const isInEncodingWindow = !beforeEncodingWindow && !afterEncodingWindow;
  const gradeOpen = (term?.controls.gradeSubmissionOpen ?? false) && isInEncodingWindow;
  // Window status for contextual messages
  const gradeWindowStatus = (() => {
    if (!term?.encodingFrom && !term?.encodingUntil) return 'not-set';
    if (beforeEncodingWindow) return 'upcoming';
    if (afterEncodingWindow) return 'ended';
    return 'open';
  })();

  const exportGradesCSV = () => {
    if (!course || !section) return;
    const rows = ['Student Name,Student Number,Grade,Submitted'];
    gradeRecords.forEach(g => {
      const student = getStudent(g.studentId);
      if (!student) return;
      rows.push(`"${student.name}","${student.studentNumber ?? ''}",${g.grade ?? 'N/A'},${g.submitted}`);
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Grades_${course.code}_Sec${section.sectionCode}_${term?.name || ''}.csv`.replace(/\s/g, '_');
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportEnlistedCSV = () => {
    if (!course || !section) return;
    const rows = ['Student Name,Student Number,Program,Year Level,Status'];
    enrolled.forEach(e => {
      const student = getStudent(e.studentId);
      if (!student) return;
      rows.push(`"${student.name}","${student.studentNumber ?? ''}","${student.program ?? ''}",${student.yearLevel ?? ''},${e.status}`);
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EnlistedStudents_${course.code}_Sec${section.sectionCode}.csv`.replace(/\s/g, '_');
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PortalLayout role="faculty" userName={faculty.name}>
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Grade Encoding</h1>
            <p className="text-muted-foreground mt-0.5">Encode and submit student grades per semester and course</p>
          </div>
          {section && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={exportEnlistedCSV}>
                <Download className="w-4 h-4" /> Enlisted CSV
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={exportGradesCSV}>
                <Download className="w-4 h-4" /> Grades CSV
              </Button>
            </div>
          )}
        </div>

        {myTerms.length === 0 ? (
          <div className="portal-panel">
            <div className="portal-panel-header">Grade Encoding</div>
            <div className="py-12 text-center text-muted-foreground bg-background">
              No sections assigned yet.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* ─── Dropdowns ─────────────────────────────────────────── */}
            <div className="portal-panel">
              <div className="portal-panel-header">Select Course</div>
              <div className="p-4 bg-background">
                <div className="flex flex-wrap gap-4 items-end">
                  {/* Term selector */}
                  <div className="space-y-1.5 min-w-[200px]">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" /> Semester / Term
                    </label>
                    <Select value={selectedTermId} onValueChange={handleTermChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select term…" />
                      </SelectTrigger>
                      <SelectContent>
                        {myTerms.map(t => (
                          <SelectItem key={t.id} value={t.id}>
                            <span className="flex items-center gap-2">
                              {t.name}
                              {t.isActive && <Badge className="bg-green-100 text-green-800 text-xs h-4 px-1.5">Active</Badge>}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Course/Section selector */}
                  <div className="space-y-1.5 min-w-[240px]">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-muted-foreground" /> Course / Section
                    </label>
                    <Select
                      value={selectedSectionId}
                      onValueChange={handleSectionChange}
                      disabled={!selectedTermId || termSections.length === 0}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={termSections.length === 0 ? 'No sections this term' : 'Select course…'} />
                      </SelectTrigger>
                      <SelectContent>
                        {termSections.map(sec => {
                          const c = state.courses.find(x => x.id === sec.courseId);
                          const enrolledCount = state.enrollments.filter(e => e.sectionId === sec.id && e.status === 'enrolled').length;
                          return (
                            <SelectItem key={sec.id} value={sec.id}>
                              <span className="flex items-center gap-2">
                                <span className="font-mono font-medium">{c?.code}</span>
                                <span className="text-muted-foreground">Sec {sec.sectionCode}</span>
                                <span className="text-xs text-muted-foreground">· {enrolledCount} enrolled</span>
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── No section selected ──────────────────────────────── */}
            {!section && selectedTermId && (
              <div className="portal-panel">
                <div className="portal-panel-header">Grade Encoding</div>
                <div className="py-12 text-center text-muted-foreground bg-background">
                  <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Select a course to begin encoding grades</p>
                  {termSections.length === 0 && <p className="text-sm mt-1">No sections assigned for this term.</p>}
                </div>
              </div>
            )}

            {/* ─── Section Details + Grade Table ───────────────────── */}
            {section && (
              <div className="space-y-4">
                {/* Section info bar */}
                <div className="rounded-md overflow-hidden border border-primary/30">
                  <div className="portal-panel-header">Section Information</div>
                  <div className="p-4 bg-primary/5">
                    <div className="flex flex-wrap gap-6">
                      <div>
                        <p className="text-xs text-muted-foreground">Course</p>
                        <p className="font-semibold">{course?.code} — {course?.title}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Section</p>
                        <p className="font-semibold">{section.sectionCode}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Semester</p>
                        <p className="font-semibold">{term?.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Enrolled</p>
                        <p className="font-semibold">{gradeRecords.length}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Grade Submission</p>
                        {gradeOpen
                          ? <Badge className="bg-green-100 text-green-800 text-xs">Open</Badge>
                          : <Badge className="bg-red-100 text-red-800 text-xs flex items-center gap-1"><Lock className="w-3 h-3" />Closed</Badge>
                        }
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-0">                    <div className="portal-panel">
                      <div className="portal-panel-header flex-wrap gap-3">
                        <span>Student Grades</span>
                        <div className="flex items-center gap-2">
                          {!allSubmitted && gradeOpen && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 gap-2 h-7 text-xs" disabled={!allGradesFilled}>
                                  <Send className="w-3.5 h-3.5" /> Submit All Grades
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Submit grades for all students?</AlertDialogTitle>
                                </AlertDialogHeader>
                                <p className="text-sm text-muted-foreground px-6">This will release grades to students. This action cannot be undone.</p>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction className="bg-primary text-white" onClick={() => submitGradesBatch(selectedSectionId)}>
                                    Submit Grades
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                          {allSubmitted && (
                            <div className="flex items-center gap-1.5 text-primary-foreground">
                              <CheckCircle className="w-4 h-4" />
                              <span className="text-xs font-medium">All grades submitted</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="p-4 bg-background">
                        {!allGradesFilled && !anySubmitted && gradeRecords.length > 0 && (
                          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4 text-sm text-yellow-800">
                            <AlertTriangle className="w-4 h-4" />
                            Please fill in all grades before submitting.
                          </div>
                        )}
                        {!gradeOpen && (
                          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4 text-sm text-red-700">
                            <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <div>
                              {gradeWindowStatus === 'not-set'
                                ? 'Grade submission window has not been scheduled. Please wait for the University announcement.'
                                : gradeWindowStatus === 'upcoming'
                                  ? `Grade encoding window has not opened yet. Opens: ${encodingFromDate?.toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                                  : gradeWindowStatus === 'ended'
                                    ? `Grade encoding window has closed. Closed: ${encodingUntilDate?.toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                                    : 'Grade submission is currently closed.'}
                            </div>
                          </div>
                        )}
                        <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/30">
                              <TableHead>#</TableHead>
                              <TableHead>Student</TableHead>
                              <TableHead>Student No.</TableHead>
                              <TableHead>Grade</TableHead>
                              <TableHead className="text-center">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {gradeRecords.map((gr, idx) => {
                              const student = getStudent(gr.studentId);
                              if (!student) return null;
                              return (
                                <TableRow key={gr.id}>
                                  <TableCell className="text-muted-foreground text-sm">{idx + 1}</TableCell>
                                  <TableCell className="font-medium">{student.name}</TableCell>
                                  <TableCell className="text-sm text-muted-foreground">{student.studentNumber}</TableCell>
                                  <TableCell>
                                    {gr.submitted ? (
                                      <span className={`font-bold text-sm ${gradeColor(gr.grade)}`}>{gr.grade ?? '—'}</span>
                                    ) : (
                                      <Select value={gr.grade ?? ''} onValueChange={val => submitGrade(gr.id, val as GradeValue)} disabled={!gradeOpen}>
                                        <SelectTrigger className="w-28 h-8"><SelectValue placeholder="Grade" /></SelectTrigger>
                                        <SelectContent>
                                          {GRADES.map(g => (
                                            <SelectItem key={g} value={g}><span className={gradeColor(g)}>{g}</span></SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {gr.submitted
                                      ? <Badge className="bg-green-100 text-green-800 text-xs">Submitted</Badge>
                                      : <Badge variant="outline" className="text-yellow-700 border-yellow-300 text-xs">Pending</Badge>}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                            {gradeRecords.length === 0 && (
                              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No enrolled students in this section.</TableCell></TableRow>
                            )}
                          </TableBody>
                        </Table>
                        </div>
                      </div>
                    </div>
                  </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
