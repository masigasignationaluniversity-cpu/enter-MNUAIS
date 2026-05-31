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
import { Search, Award, UserPlus, CalendarDays, Plus, Pencil, Trash2, Check, X, BookOpen, Save } from 'lucide-react';
import type { GradeValue } from '@/lib/types';
import { toast } from '@/components/ui/sonner';

const GRADE_OPTIONS: { label: string; value: GradeValue | '__none__' }[] = [
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
  { label: 'P (Passed)', value: 'P' },
  { label: 'F (Failed)', value: 'F' },
];

export default function OCSGradeManagement() {
  const { state, ocsUpdateGrade, ocsManualEnroll, removeSection, addTerm, setStudentMaxUnitsOverride } = useApp();

  // ── All hooks first (before any early returns) ────────────────────────────
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedTermId, setSelectedTermId] = useState<string>(() => state.terms.find(t => t.isActive)?.id ?? '');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editGradeValue, setEditGradeValue] = useState<GradeValue | '__none__'>('__none__');
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [sectionSearch, setSectionSearch] = useState('');
  const [addTermOpen, setAddTermOpen] = useState(false);
  const [termForm, setTermForm] = useState({
    name: '', academicYear: '', semester: '1st' as '1st' | '2nd' | 'Mid-Term', maxUnits: '21',
  });
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

  const availableSections = useMemo(() => {
    if (!selectedTermId || !selectedStudentId) return [];
    const q = sectionSearch.trim().toLowerCase();
    const enrolledIds = new Set(
      state.enrollments
        .filter(e => e.studentId === selectedStudentId && e.termId === selectedTermId && e.status !== 'dropped')
        .map(e => e.sectionId)
    );
    return state.sections
      .filter(sec => {
        if (sec.termId !== selectedTermId) return false;
        if (enrolledIds.has(sec.id)) return false;
        if (!q) return true;
        const course = state.courses.find(c => c.id === sec.courseId);
        return (
          (course?.code.toLowerCase().includes(q) ?? false) ||
          (course?.title.toLowerCase().includes(q) ?? false) ||
          sec.sectionCode.toLowerCase().includes(q)
        );
      })
      .slice(0, 20);
  }, [selectedTermId, selectedStudentId, sectionSearch, state.sections, state.courses, state.enrollments]);

  const overrideResults = useMemo(() => {
    const q = overrideSearch.trim().toLowerCase();
    if (!q || overrideStudentId) return [];
    return state.users.filter(u => u.role === 'student' && (
      u.name.toLowerCase().includes(q) || (u.studentNumber ?? '').toLowerCase().includes(q)
    )).slice(0, 8);
  }, [overrideSearch, overrideStudentId, state.users]);

  // ── Early return after all hooks ──────────────────────────────────────────
  if (!state.currentUser) return null;

  const selectedTerm = state.terms.find(t => t.id === selectedTermId);
  const selectedStudent = selectedStudentId ? state.users.find(u => u.id === selectedStudentId) : null;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSaveGrade = (studentId: string, sectionId: string, termId: string) => {
    ocsUpdateGrade(studentId, sectionId, termId, editGradeValue === '__none__' ? null : editGradeValue as GradeValue);
    toast.success('Grade updated successfully.');
    setEditingKey(null);
  };

  const handleManualEnroll = async (sectionId: string) => {
    if (!selectedStudentId || !selectedTermId) return;
    const result = await ocsManualEnroll(selectedStudentId, sectionId, selectedTermId);
    if (result.success) {
      toast.success('Enrolled successfully.', { description: result.message });
      setAddSectionOpen(false);
      setSectionSearch('');
    } else {
      toast.error('Cannot enroll', { description: result.message });
    }
  };

  const handleRemove = (sectionId: string) => {
    if (!selectedStudentId || !selectedTermId) return;
    const result = removeSection(selectedStudentId, sectionId, selectedTermId);
    if (result.success) toast.success('Enrollment removed.');
    else toast.error('Error', { description: result.message });
  };

  const handleAddTerm = () => {
    if (!termForm.name.trim() || !termForm.academicYear.trim()) {
      toast.error('Please fill in term name and academic year.'); return;
    }
    addTerm({
      name: termForm.name.trim(), academicYear: termForm.academicYear.trim(),
      semester: termForm.semester, isActive: false,
      maxUnits: parseInt(termForm.maxUnits) || 21,
      controls: { enlistmentOpen: false, enrollmentOpen: false, ficEvalOpen: false, gradeSubmissionOpen: false, prerogativeOpen: false },
    });
    toast.success('Term added.', { description: termForm.name });
    setAddTermOpen(false);
    setTermForm({ name: '', academicYear: '', semester: '1st', maxUnits: '21' });
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
    toast.success('Override removed — student now uses the term default.');
  };

  // ── Shared student+term selector (rendered as JSX) ────────────────────────
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
                <TabsTrigger value="enrollment" className="flex items-center gap-1.5 text-xs">
                  <UserPlus className="w-3.5 h-3.5" /> Manual Enrollment
                </TabsTrigger>
                <TabsTrigger value="terms" className="flex items-center gap-1.5 text-xs">
                  <CalendarDays className="w-3.5 h-3.5" /> Term Settings
                </TabsTrigger>
              </TabsList>

              {/* ── GRADE RECORDS ─────────────────────────────────────────── */}
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
                    <p className="text-xs text-muted-foreground/60 mt-1">Use the Manual Enrollment tab to add sections.</p>
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
                          return (
                            <TableRow key={key} className={enrollment.status === 'dropped' ? 'opacity-60' : ''}>
                              <TableCell className="font-semibold text-sm">{course!.code}</TableCell>
                              <TableCell className="text-sm">{course!.title}</TableCell>
                              <TableCell className="text-center text-sm">{sec!.sectionCode}</TableCell>
                              <TableCell className="text-center">{statusBadge(enrollment.status)}</TableCell>
                              <TableCell className="text-center">
                                {isEditing ? (
                                  <Select value={editGradeValue} onValueChange={v => setEditGradeValue(v as GradeValue | '__none__')}>
                                    <SelectTrigger className="h-7 text-xs w-36 mx-auto"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {GRADE_OPTIONS.map(o => (
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
                                  <Button size="sm" variant="outline" className="h-6 px-2 text-xs gap-1"
                                    onClick={() => { setEditingKey(key); setEditGradeValue(grade?.grade ?? '__none__'); }}>
                                    <Pencil className="w-3 h-3" /> Edit
                                  </Button>
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

              {/* ── MANUAL ENROLLMENT ─────────────────────────────────────── */}
              <TabsContent value="enrollment" className="mt-4">
                {!selectedStudentId || !selectedTermId ? (
                  <div className="py-14 text-center">
                    <UserPlus className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-sm font-medium text-muted-foreground">Select a student and term to manage enrollments.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                        Enrolled Sections ({enrolledRows.length})
                      </p>
                      <Button size="sm" className="h-7 text-xs gap-1.5"
                        onClick={() => { setAddSectionOpen(true); setSectionSearch(''); }}>
                        <Plus className="w-3.5 h-3.5" /> Add Section
                      </Button>
                    </div>
                    {enrolledRows.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-10">No enrollments for this student in the selected term.</p>
                    ) : (
                      <div className="rounded-xl border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted">
                              <TableHead className="text-xs font-semibold">Course</TableHead>
                              <TableHead className="text-xs font-semibold">Title</TableHead>
                              <TableHead className="text-xs font-semibold text-center">Section</TableHead>
                              <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                              <TableHead className="text-xs font-semibold text-center">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {enrolledRows.map(({ enrollment, sec, course }) => (
                              <TableRow key={enrollment.sectionId} className={enrollment.status === 'dropped' ? 'opacity-60' : ''}>
                                <TableCell className="font-semibold text-sm">{course!.code}</TableCell>
                                <TableCell className="text-sm">{course!.title}</TableCell>
                                <TableCell className="text-center text-sm">{sec!.sectionCode}</TableCell>
                                <TableCell className="text-center">{statusBadge(enrollment.status)}</TableCell>
                                <TableCell className="text-center">
                                  {enrollment.status !== 'dropped' && (
                                    <Button size="sm" variant="outline"
                                      className="h-6 px-2 text-xs gap-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                                      onClick={() => handleRemove(enrollment.sectionId)}>
                                      <Trash2 className="w-3 h-3" /> Remove
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* ── TERM SETTINGS ─────────────────────────────────────────── */}
              <TabsContent value="terms" className="mt-4 space-y-6">
                {/* Terms list */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Academic Terms</p>
                    <Button size="sm" className="h-7 text-xs gap-1.5" onClick={() => setAddTermOpen(true)}>
                      <Plus className="w-3.5 h-3.5" /> Add Term
                    </Button>
                  </div>
                  <div className="rounded-xl border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted">
                          <TableHead className="text-xs font-semibold">Name</TableHead>
                          <TableHead className="text-xs font-semibold">A.Y.</TableHead>
                          <TableHead className="text-xs font-semibold text-center">Semester</TableHead>
                          <TableHead className="text-xs font-semibold text-center">Max Units</TableHead>
                          <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {state.terms.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8 text-sm">No terms yet.</TableCell>
                          </TableRow>
                        ) : state.terms.map(t => (
                          <TableRow key={t.id}>
                            <TableCell className="font-semibold text-sm">{t.name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{t.academicYear}</TableCell>
                            <TableCell className="text-center text-sm">{t.semester}</TableCell>
                            <TableCell className="text-center text-sm font-medium">{t.maxUnits ?? 21}</TableCell>
                            <TableCell className="text-center">
                              {t.isActive
                                ? <Badge className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-300">Active</Badge>
                                : <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Per-student max units override */}
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Per-Student Max Units Override</p>
                  <div className="rounded-xl border p-4 space-y-4">
                    <p className="text-xs text-muted-foreground">Set a custom enlistment unit limit for a specific student, overriding the term's global default set by Admin.</p>
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
                      <div className="w-48">
                        <Label className="text-xs mb-1.5 block">Term</Label>
                        <Select value={selectedTermId} onValueChange={setSelectedTermId}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select term" /></SelectTrigger>
                          <SelectContent>
                            {state.terms.map(t => (
                              <SelectItem key={t.id} value={t.id}>{t.name}{t.isActive ? ' (Active)' : ''}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                      <Button className="h-9 gap-1.5 text-sm" onClick={handleSaveOverride}>
                        <Save className="w-4 h-4" /> Save Override
                      </Button>
                    </div>

                    {selectedTerm && Object.keys(selectedTerm.studentMaxUnitsOverrides ?? {}).length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                          Overrides — {selectedTerm.name}
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
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* ── Add Section Dialog ───────────────────────────────────────────── */}
        <Dialog open={addSectionOpen} onOpenChange={v => { setAddSectionOpen(v); if (!v) setSectionSearch(''); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" /> Add Section to Enrollment
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <p className="text-sm text-muted-foreground">
                Manually enrolling <strong>{selectedStudent?.name}</strong>. No restriction checks are applied.
              </p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by course code, title, or section..."
                  value={sectionSearch} onChange={e => setSectionSearch(e.target.value)}
                  className="pl-9 h-9" autoFocus
                />
              </div>
              <div className="max-h-64 overflow-y-auto rounded-lg border">
                {availableSections.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-10">
                    {sectionSearch ? 'No matching sections found.' : 'Type to search available sections...'}
                  </p>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="bg-muted border-b sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold">Code</th>
                        <th className="text-left px-3 py-2 font-semibold">Title</th>
                        <th className="text-center px-3 py-2 font-semibold">Section</th>
                        <th className="text-center px-3 py-2 font-semibold">Slots</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {availableSections.map(sec => {
                        const course = state.courses.find(c => c.id === sec.courseId);
                        if (!course) return null;
                        return (
                          <tr key={sec.id} className="hover:bg-muted/40">
                            <td className="px-3 py-2 font-semibold">{course.code}</td>
                            <td className="px-3 py-2">{course.title}</td>
                            <td className="px-3 py-2 text-center">{sec.sectionCode}</td>
                            <td className="px-3 py-2 text-center">{sec.enrolled}/{sec.slots}</td>
                            <td className="px-3 py-2 text-right">
                              <Button size="sm" className="h-6 px-2 text-xs" onClick={() => handleManualEnroll(sec.id)}>
                                Enroll
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Add Term Dialog ──────────────────────────────────────────────── */}
        <Dialog open={addTermOpen} onOpenChange={setAddTermOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5" /> Add New Term
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <Label className="text-sm">Term Name</Label>
                <Input placeholder="e.g. First Semester 2026-2027"
                  value={termForm.name} onChange={e => setTermForm(f => ({ ...f, name: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Academic Year</Label>
                <Input placeholder="e.g. 2026-2027"
                  value={termForm.academicYear} onChange={e => setTermForm(f => ({ ...f, academicYear: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Semester</Label>
                <Select value={termForm.semester} onValueChange={v => setTermForm(f => ({ ...f, semester: v as '1st' | '2nd' | 'Mid-Term' }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1st">1st Semester</SelectItem>
                    <SelectItem value="2nd">2nd Semester</SelectItem>
                    <SelectItem value="Mid-Term">Mid-Term</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Max Units (excludes PE/NSTP)</Label>
                <Input type="number" min={1} max={40} value={termForm.maxUnits}
                  onChange={e => setTermForm(f => ({ ...f, maxUnits: e.target.value }))} className="mt-1" />
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setAddTermOpen(false)}>Cancel</Button>
                <Button className="flex-1" onClick={handleAddTerm}>Add Term</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PortalLayout>
  );
}
