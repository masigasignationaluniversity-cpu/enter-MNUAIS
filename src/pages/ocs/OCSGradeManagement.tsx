import { useState, useMemo } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Award, BookOpen, Plus, Pencil, Trash2, Check, X, Save, Users } from 'lucide-react';
import type { GradeValue } from '@/lib/types';
import { toast } from '@/components/ui/sonner';

const NUMERIC_ONLY_OPTIONS: { label: string; value: GradeValue | '__none__' }[] = [
  { label: '— Not yet graded —', value: '__none__' },
  { label: '1.0 (Excellent)', value: '1.0' },
  { label: '1.25', value: '1.25' },
  { label: '1.5', value: '1.5' },
  { label: '1.75', value: '1.75' },
  { label: '2.0', value: '2.0' },
  { label: '2.25', value: '2.25' },
  { label: '2.5', value: '2.5' },
  { label: '2.75', value: '2.75' },
  { label: '3.0 (Passing)', value: '3.0' },
  { label: '4 (Conditional)', value: '4' },
  { label: '5 (Failed)', value: '5' },
  { label: 'INC (Incomplete)', value: 'INC' },
  { label: 'DRP (Dropped)', value: 'DRP' },
];

const SU_ONLY_OPTIONS: { label: string; value: GradeValue | '__none__' }[] = [
  { label: '— Not yet graded —', value: '__none__' },
  { label: 'S (Satisfactory)', value: 'S' },
  { label: 'U (Unsatisfactory)', value: 'U' },
];

const BASE_GRADE_OPTIONS: { label: string; value: GradeValue | '__none__' }[] = [
  { label: '— Not yet graded —', value: '__none__' },
  { label: '1.0 (Excellent)', value: '1.0' },
  { label: '1.25', value: '1.25' },
  { label: '1.5', value: '1.5' },
  { label: '1.75', value: '1.75' },
  { label: '2.0', value: '2.0' },
  { label: '2.25', value: '2.25' },
  { label: '2.5', value: '2.5' },
  { label: '2.75', value: '2.75' },
  { label: '3.0 (Passing)', value: '3.0' },
  { label: '4 (Conditional)', value: '4' },
  { label: '5 (Failed)', value: '5' },
  { label: 'INC (Incomplete)', value: 'INC' },
  { label: 'DRP (Dropped)', value: 'DRP' },
];

function getGradeOptions(courseType?: string): { label: string; value: GradeValue | '__none__' }[] {
  if (courseType === 'Thesis 1') return SU_ONLY_OPTIONS;
  if (courseType === 'Thesis 2') return NUMERIC_ONLY_OPTIONS;
  const isThesis = courseType === 'Thesis';
  return [
    ...BASE_GRADE_OPTIONS,
    ...(isThesis
      ? [
          { label: 'S (Satisfactory)', value: 'S' as GradeValue },
          { label: 'U (Unsatisfactory)', value: 'U' as GradeValue },
        ]
      : [
          { label: 'P (Passed)', value: 'P' as GradeValue },
          { label: 'F (Failed)', value: 'F' as GradeValue },
        ]),
  ];
}

export default function OCSGradeManagement() {
  const {
    state,
    ocsUpdateGrade,
    ocsManualAddCourse,
    ocsRemoveEnrollment,
    setStudentMaxUnitsOverride,
    setAllStudentsMaxUnitsOverride,
  } = useApp();

  // ── All hooks first ────────────────────────────────────────────────────────
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedTermId, setSelectedTermId] = useState<string>(() => state.terms.find(t => t.isActive)?.id ?? '');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editGradeValue, setEditGradeValue] = useState<GradeValue | '__none__'>('__none__');

  // Manual course add dialog
  const [addCourseOpen, setAddCourseOpen] = useState(false);
  const [courseSearch, setCourseSearch] = useState('');

  // All-students override
  const [bulkUnits, setBulkUnits] = useState('');
  const [overrideSearch, setOverrideSearch] = useState('');
  const [overrideStudentId, setOverrideStudentId] = useState<string | null>(null);
  const [overrideUnits, setOverrideUnits] = useState('');

  const studentResults = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q || selectedStudentId) return [];
    return state.users
      .filter(u => u.role === 'student' && (
        u.name.toLowerCase().includes(q) ||
        (u.studentNumber ?? '').toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q)
      ))
      .slice(0, 10);
  }, [studentSearch, selectedStudentId, state.users]);

  const enrolledRows = useMemo(() => {
    if (!selectedStudentId || !selectedTermId) return [];
    return state.enrollments
      .filter(e => e.studentId === selectedStudentId && e.termId === selectedTermId)
      .map(e => {
        const sec = state.sections.find(s => s.id === e.sectionId);
        const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
        const grade = state.grades.find(g =>
          g.studentId === selectedStudentId && g.sectionId === e.sectionId && g.termId === selectedTermId
        );
        return { enrollment: e, sec, course, grade };
      })
      .filter(r => r.sec && r.course);
  }, [selectedStudentId, selectedTermId, state.enrollments, state.sections, state.courses, state.grades]);

  const manualRows = useMemo(() =>
    enrolledRows.filter(r => r.sec?.sectionCode === '__MANUAL__'),
    [enrolledRows]
  );

  const availableCourses = useMemo(() => {
    if (!selectedTermId || !selectedStudentId) return [];
    const q = courseSearch.trim().toLowerCase();
    const alreadyAddedCourseIds = new Set(
      enrolledRows
        .filter(r => r.sec?.sectionCode === '__MANUAL__')
        .map(r => r.course!.id)
    );
    return state.courses
      .filter(c => {
        if (alreadyAddedCourseIds.has(c.id)) return false;
        if (!q) return true;
        return c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q);
      })
      .slice(0, 20);
  }, [selectedTermId, selectedStudentId, courseSearch, state.courses, enrolledRows]);

  const overrideResults = useMemo(() => {
    const q = overrideSearch.trim().toLowerCase();
    if (!q || overrideStudentId) return [];
    return state.users.filter(u => u.role === 'student' && (
      u.name.toLowerCase().includes(q) || (u.studentNumber ?? '').toLowerCase().includes(q)
    )).slice(0, 8);
  }, [overrideSearch, overrideStudentId, state.users]);

  if (!state.currentUser) return null;

  const selectedTerm = state.terms.find(t => t.id === selectedTermId);
  const selectedStudent = selectedStudentId ? state.users.find(u => u.id === selectedStudentId) : null;
  const allStudents = state.users.filter(u => u.role === 'student');

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSaveGrade = (studentId: string, sectionId: string, termId: string) => {
    const gradeToSave = editGradeValue === '__none__' ? null : editGradeValue as GradeValue;
    ocsUpdateGrade(studentId, sectionId, termId, gradeToSave);
    setEditingKey(null);

    // Auto-remove manual enrollment when grade is INC or 4
    const row = enrolledRows.find(r => r.enrollment.sectionId === sectionId);
    const isManual = row?.sec?.sectionCode === '__MANUAL__';
    if (isManual && (gradeToSave === 'INC' || gradeToSave === '4')) {
      ocsRemoveEnrollment(studentId, sectionId, termId);
      toast.success('Grade saved. Enrollment auto-removed (INC/4 grade).', {
        description: 'The course was removed from the student\'s manual enrollment record.',
      });
    } else {
      toast.success('Grade updated successfully.');
    }
  };

  const handleManualAddCourse = async (courseId: string) => {
    if (!selectedStudentId || !selectedTermId) return;
    const result = await ocsManualAddCourse(selectedStudentId, courseId, selectedTermId);
    if (result.success) {
      toast.success('Course added.', { description: result.message });
      setAddCourseOpen(false);
      setCourseSearch('');
    } else {
      toast.error('Cannot add course', { description: result.message });
    }
  };

  const handleRemove = (sectionId: string) => {
    if (!selectedStudentId || !selectedTermId) return;
    const result = ocsRemoveEnrollment(selectedStudentId, sectionId, selectedTermId);
    if (result.success) toast.success('Course and grade record removed.');
    else toast.error('Error', { description: result.message });
  };

  const handleBulkOverride = () => {
    if (!selectedTermId) { toast.error('Select a term.'); return; }
    const units = parseInt(bulkUnits);
    if (isNaN(units) || units < 1) { toast.error('Enter a valid unit limit (minimum 1).'); return; }
    setAllStudentsMaxUnitsOverride(selectedTermId, units);
    toast.success(`Max units set to ${units} for all ${allStudents.length} students.`);
    setBulkUnits('');
  };

  const handleSaveOverride = () => {
    if (!overrideStudentId || !selectedTermId) { toast.error('Select a student and term.'); return; }
    const units = parseInt(overrideUnits);
    if (isNaN(units) || units < 1) { toast.error('Enter a valid unit limit (minimum 1).'); return; }
    setStudentMaxUnitsOverride(selectedTermId, overrideStudentId, units);
    toast.success('Max units override saved.');
    setOverrideStudentId(null); setOverrideSearch(''); setOverrideUnits('');
  };

  const handleRemoveOverride = (studentId: string) => {
    if (!selectedTermId) return;
    setStudentMaxUnitsOverride(selectedTermId, studentId, null);
    toast.success('Override removed.');
  };

  // ── Shared student+term selector ──────────────────────────────────────────
  const SelectorBar = (
    <div className="px-4 py-3 flex flex-wrap gap-3 items-center border-b border-border/50">
      <div className="relative flex-1 min-w-[240px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search student by name or number..."
          value={studentSearch}
          onChange={e => { setStudentSearch(e.target.value); setSelectedStudentId(null); }}
          className="pl-9 h-9"
        />
        {studentResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-xl z-50 max-h-52 overflow-y-auto">
            {studentResults.map(u => (
              <button key={u.id} type="button"
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted/60 flex items-center gap-2 border-b border-border/30 last:border-0"
                onClick={() => { setSelectedStudentId(u.id); setStudentSearch(u.name); }}>
                <span className="font-semibold">{u.name}</span>
                {u.studentNumber && <span className="text-muted-foreground text-xs">{u.studentNumber}</span>}
                {u.program && <span className="text-muted-foreground text-xs ml-auto">{u.program}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
      <Select value={selectedTermId} onValueChange={setSelectedTermId}>
        <SelectTrigger className="w-[200px] h-9 text-sm"><SelectValue placeholder="Select term" /></SelectTrigger>
        <SelectContent>
          {state.terms.map(t => (
            <SelectItem key={t.id} value={t.id}>{t.name}{t.isActive ? ' (Active)' : ''}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedStudent && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-sm">
          <span className="font-semibold text-primary">{selectedStudent.name}</span>
          {selectedStudent.studentNumber && (
            <span className="text-muted-foreground text-xs">{selectedStudent.studentNumber}</span>
          )}
          <button type="button" onClick={() => { setSelectedStudentId(null); setStudentSearch(''); }}>
            <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
          </button>
        </div>
      )}
    </div>
  );

  const statusBadge = (status: string) => (
    <Badge className={`text-[10px] ${
      status === 'dropped' ? 'bg-red-100 text-red-800 border-red-300' :
      status === 'enrolled' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
      'bg-amber-100 text-amber-800 border-amber-300'
    }`}>{status}</Badge>
  );

  return (
    <PortalLayout>
      <div className="p-6 space-y-5">

        {/* ── Grade & Enrollment Panel ────────────────────────────────────── */}
        <div className="portal-panel">
          <div className="portal-panel-header">
            <Award className="w-4 h-4" /> Grade &amp; Enrollment Management
          </div>

          {SelectorBar}

          <div className="p-4">
            <Tabs defaultValue="grades">
              <TabsList className="w-full justify-start gap-1">
                <TabsTrigger value="grades" className="flex items-center gap-1.5 text-xs">
                  <Award className="w-3.5 h-3.5" /> Grade Records
                </TabsTrigger>
                <TabsTrigger value="manual" className="flex items-center gap-1.5 text-xs">
                  <BookOpen className="w-3.5 h-3.5" /> Manual Courses
                </TabsTrigger>
              </TabsList>

              {/* ── GRADE RECORDS ────────────────────────────────────────── */}
              <TabsContent value="grades" className="mt-4">
                {!selectedStudentId || !selectedTermId ? (
                  <div className="py-14 text-center">
                    <Award className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-sm font-medium text-muted-foreground">Select a student and term to view and edit grade records.</p>
                  </div>
                ) : enrolledRows.length === 0 ? (
                  <div className="py-14 text-center">
                    <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-sm font-medium text-muted-foreground">No enrollments found for this student in the selected term.</p>
                  </div>
                ) : (
                  <div className="rounded-xl border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted">
                          <TableHead className="text-xs font-semibold">Course</TableHead>
                          <TableHead className="text-xs font-semibold">Title</TableHead>
                          <TableHead className="text-xs font-semibold text-center">Section</TableHead>
                          <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                          <TableHead className="text-xs font-semibold text-center">Grade</TableHead>
                          <TableHead className="text-xs font-semibold text-center">Submitted</TableHead>
                          <TableHead className="text-xs font-semibold text-center">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {enrolledRows.map(({ enrollment, sec, course, grade }) => {
                          const key = enrollment.sectionId;
                          const isEditing = editingKey === key;
                          const isManual = sec?.sectionCode === '__MANUAL__';
                          return (
                            <TableRow key={key} className={enrollment.status === 'dropped' ? 'opacity-60' : ''}>
                              <TableCell className="font-semibold text-sm">{course!.code}</TableCell>
                              <TableCell className="text-sm">{course!.title}</TableCell>
                              <TableCell className="text-center text-sm">
                                {isManual
                                  ? <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700">Manual</Badge>
                                  : sec!.sectionCode}
                              </TableCell>
                              <TableCell className="text-center">{statusBadge(enrollment.status)}</TableCell>
                              <TableCell className="text-center">
                                {isEditing ? (
                                  <Select value={editGradeValue} onValueChange={v => setEditGradeValue(v as GradeValue | '__none__')}>
                                    <SelectTrigger className="h-7 text-xs w-36 mx-auto"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {getGradeOptions(course?.type).map(o => (
                                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <span className={`text-sm font-semibold ${!grade?.grade ? 'text-muted-foreground italic text-xs' : ''}`}>
                                    {grade?.grade ?? '—'}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {grade?.submitted
                                  ? <Badge className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-300">Yes</Badge>
                                  : <Badge variant="outline" className="text-[10px]">No</Badge>}
                              </TableCell>
                              <TableCell className="text-center">
                                {isEditing ? (
                                  <div className="flex items-center gap-1 justify-center">
                                    <Button size="sm"
                                      className="h-6 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                      onClick={() => handleSaveGrade(enrollment.studentId, enrollment.sectionId, enrollment.termId)}>
                                      <Check className="w-3 h-3" />
                                    </Button>
                                    <Button size="sm" variant="outline" className="h-6 px-2 text-xs"
                                      onClick={() => setEditingKey(null)}>
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 justify-center">
                                    <Button size="sm" variant="outline" className="h-6 px-2 text-xs gap-1"
                                      onClick={() => { setEditingKey(key); setEditGradeValue(grade?.grade ?? '__none__'); }}>
                                      <Pencil className="w-3 h-3" /> Edit
                                    </Button>
                                    {isManual && (
                                      <Button size="sm" variant="outline"
                                        className="h-6 px-2 text-xs gap-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                                        onClick={() => handleRemove(enrollment.sectionId)}>
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              {/* ── MANUAL COURSES ──────────────────────────────────────────── */}
              <TabsContent value="manual" className="mt-4">
                {!selectedStudentId || !selectedTermId ? (
                  <div className="py-14 text-center">
                    <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-sm font-medium text-muted-foreground">Select a student and term to manage manual grade entries.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                          Manual Grade Entries ({manualRows.length})
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                          Courses added directly — no section or faculty assigned
                        </p>
                      </div>
                      <Button size="sm" className="h-7 text-xs gap-1.5"
                        onClick={() => { setAddCourseOpen(true); setCourseSearch(''); }}>
                        <Plus className="w-3.5 h-3.5" /> Add Course
                      </Button>
                    </div>

                    {manualRows.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-10">
                        No manual courses added for this student in the selected term.
                      </p>
                    ) : (
                      <div className="rounded-xl border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted">
                              <TableHead className="text-xs font-semibold">Course Code</TableHead>
                              <TableHead className="text-xs font-semibold">Title</TableHead>
                              <TableHead className="text-xs font-semibold text-center">Units</TableHead>
                              <TableHead className="text-xs font-semibold text-center">Grade</TableHead>
                              <TableHead className="text-xs font-semibold text-center">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {manualRows.map(({ enrollment, course, grade }) => {
                              const key = enrollment.sectionId;
                              const isEditing = editingKey === key;
                              return (
                                <TableRow key={key}>
                                  <TableCell className="font-semibold text-sm">{course!.code}</TableCell>
                                  <TableCell className="text-sm">{course!.title}</TableCell>
                                  <TableCell className="text-center text-sm">{course!.units}</TableCell>
                                  <TableCell className="text-center">
                                    {isEditing ? (
                                      <Select value={editGradeValue} onValueChange={v => setEditGradeValue(v as GradeValue | '__none__')}>
                                        <SelectTrigger className="h-7 text-xs w-36 mx-auto"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          {getGradeOptions(course?.type).map(o => (
                                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      <span className={`text-sm font-semibold ${!grade?.grade ? 'text-muted-foreground italic text-xs' : ''}`}>
                                        {grade?.grade ?? '—'}
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {isEditing ? (
                                      <div className="flex items-center gap-1 justify-center">
                                        <Button size="sm"
                                          className="h-6 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                          onClick={() => handleSaveGrade(enrollment.studentId, enrollment.sectionId, enrollment.termId)}>
                                          <Check className="w-3 h-3" />
                                        </Button>
                                        <Button size="sm" variant="outline" className="h-6 px-2 text-xs"
                                          onClick={() => setEditingKey(null)}>
                                          <X className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1 justify-center">
                                        <Button size="sm" variant="outline" className="h-6 px-2 text-xs gap-1"
                                          onClick={() => { setEditingKey(key); setEditGradeValue(grade?.grade ?? '__none__'); }}>
                                          <Pencil className="w-3 h-3" /> Edit
                                        </Button>
                                        <Button size="sm" variant="outline"
                                          className="h-6 px-2 text-xs gap-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                                          onClick={() => handleRemove(enrollment.sectionId)}>
                                          <Trash2 className="w-3 h-3" /> Delete
                                        </Button>
                                      </div>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* ── Max Units Override Panel ─────────────────────────────────────── */}
        <div className="portal-panel">
          <div className="portal-panel-header">
            <Users className="w-4 h-4" /> Enlistment Max Units Override
          </div>
          <div className="p-4 space-y-5">

            {/* Term selector */}
            <div className="flex items-center gap-3 flex-wrap">
              <Label className="text-xs font-semibold">Term:</Label>
              <Select value={selectedTermId} onValueChange={setSelectedTermId}>
                <SelectTrigger className="w-[220px] h-9 text-sm"><SelectValue placeholder="Select term" /></SelectTrigger>
                <SelectContent>
                  {state.terms.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}{t.isActive ? ' (Active)' : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTerm && (
                <span className="text-xs text-muted-foreground">
                  Term default: <strong>{selectedTerm.maxUnits ?? 21} units</strong>
                </span>
              )}
            </div>

            {/* Bulk override — all students */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-[11px] font-semibold text-primary uppercase tracking-wide mb-1">Apply Override to All Students</p>
              <p className="text-xs text-muted-foreground mb-3">Set the same max enlistment units for every student in the selected term at once.</p>
              <div className="flex items-end gap-3 flex-wrap">
                <div className="w-36">
                  <Label className="text-xs mb-1.5 block">Max Units</Label>
                  <Input
                    type="number" min={1} max={40} value={bulkUnits}
                    onChange={e => setBulkUnits(e.target.value)}
                    className="h-9 text-sm"
                    placeholder={String(selectedTerm?.maxUnits ?? 21)}
                  />
                </div>
                <Button className="h-9 gap-1.5 text-sm" onClick={handleBulkOverride} disabled={!selectedTermId}>
                  <Users className="w-4 h-4" /> Apply to All ({allStudents.length})
                </Button>
              </div>
            </div>

            {/* Per-student override */}
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Per-Student Override</p>
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[220px]">
                  <Label className="text-xs mb-1.5 block">Student</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search student..."
                      value={overrideSearch}
                      onChange={e => { setOverrideSearch(e.target.value); setOverrideStudentId(null); }}
                      className="pl-9 h-9 text-sm"
                    />
                    {overrideResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-xl z-50">
                        {overrideResults.map(u => (
                          <button key={u.id} type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted/60 border-b border-border/30 last:border-0"
                            onClick={() => {
                              setOverrideStudentId(u.id);
                              setOverrideSearch(u.name);
                              setOverrideUnits(String(selectedTerm?.studentMaxUnitsOverrides?.[u.id] ?? ''));
                            }}>
                            {u.name}
                            {u.studentNumber && <span className="text-muted-foreground text-xs ml-2">({u.studentNumber})</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="w-28">
                  <Label className="text-xs mb-1.5 block">Max Units</Label>
                  <Input
                    type="number" min={1} max={40} value={overrideUnits}
                    onChange={e => setOverrideUnits(e.target.value)}
                    className="h-9 text-sm"
                    placeholder={String(selectedTerm?.maxUnits ?? 21)}
                  />
                </div>
                <Button variant="outline" className="h-9 gap-1.5 text-sm" onClick={handleSaveOverride}>
                  <Save className="w-4 h-4" /> Save
                </Button>
              </div>

              {/* Override list */}
              {selectedTerm && Object.keys(selectedTerm.studentMaxUnitsOverrides ?? {}).length > 0 && (
                <div className="mt-4">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Current Overrides — {selectedTerm.name}
                  </p>
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted">
                          <TableHead className="text-xs font-semibold">Student</TableHead>
                          <TableHead className="text-xs font-semibold text-center">Override</TableHead>
                          <TableHead className="text-xs font-semibold text-center">Term Default</TableHead>
                          <TableHead className="text-xs font-semibold text-center">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(selectedTerm.studentMaxUnitsOverrides ?? {}).map(([sid, units]) => {
                          const st = state.users.find(u => u.id === sid);
                          if (!st) return null;
                          return (
                            <TableRow key={sid}>
                              <TableCell className="text-sm">
                                <p className="font-semibold">{st.name}</p>
                                {st.studentNumber && <p className="text-xs text-muted-foreground">{st.studentNumber}</p>}
                              </TableCell>
                              <TableCell className="text-center font-bold text-primary text-sm">{units} units</TableCell>
                              <TableCell className="text-center text-muted-foreground text-sm">{selectedTerm.maxUnits ?? 21} units</TableCell>
                              <TableCell className="text-center">
                                <Button size="sm" variant="outline"
                                  className="h-6 px-2 text-xs gap-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                                  onClick={() => handleRemoveOverride(sid)}>
                                  <X className="w-3 h-3" /> Remove
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Add Course Dialog ────────────────────────────────────────────── */}
        <Dialog open={addCourseOpen} onOpenChange={v => { setAddCourseOpen(v); if (!v) setCourseSearch(''); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" /> Add Manual Grade Course
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <p className="text-sm text-muted-foreground">
                Adding to <strong>{selectedStudent?.name}</strong> — {selectedTerm?.name}.
                No section or faculty will be assigned.
              </p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by course code or title..."
                  value={courseSearch} onChange={e => setCourseSearch(e.target.value)}
                  className="pl-9 h-9" autoFocus
                />
              </div>
              <div className="max-h-64 overflow-y-auto rounded-lg border">
                {availableCourses.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-10">
                    {courseSearch ? 'No matching courses found.' : 'Type to search available courses...'}
                  </p>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="bg-muted border-b sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold">Code</th>
                        <th className="text-left px-3 py-2 font-semibold">Title</th>
                        <th className="text-center px-3 py-2 font-semibold">Units</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {availableCourses.map(course => (
                        <tr key={course.id} className="hover:bg-muted/40">
                          <td className="px-3 py-2 font-semibold">{course.code}</td>
                          <td className="px-3 py-2">{course.title}</td>
                          <td className="px-3 py-2 text-center">{course.units}</td>
                          <td className="px-3 py-2 text-right">
                            <Button size="sm" className="h-6 px-2 text-xs" onClick={() => handleManualAddCourse(course.id)}>
                              Add
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </PortalLayout>
  );
}
