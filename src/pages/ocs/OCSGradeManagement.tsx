import { useState, useMemo } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Award, BookOpen, Plus, Pencil, Trash2, Check, X, Save, Users, ClipboardList, Minus, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { GradeValue, Section } from '@/lib/types';
import { isIncEnrollmentRestricted, getPassedUnits, getYearClassification, buildProgramCourseIdSet, computeTotalRequiredUnits } from '@/lib/academic';
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
  { label: 'DRP (Dropped)', value: 'DRP' },
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
  if (courseType === 'Thesis 1' || courseType === 'Seminar') return SU_ONLY_OPTIONS;
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

const REMOVAL_ELIGIBLE: GradeValue[] = ['4', 'INC'];

function getRemovalGradeOptions(grade?: GradeValue | null): GradeValue[] {
  if (grade === '4') return ['3.0', '5'] as GradeValue[];
  if (grade === 'INC') return ['1.0', '1.25', '1.5', '1.75', '2.0', '2.25', '2.5', '2.75', '3.0', '5'] as GradeValue[];
  return [];
}

export default function OCSGradeManagement() {
  const {
    state,
    ocsUpdateGrade,
    ocsUpdateRemovalGrade,
    ocsManualEnroll,
    ocsManualAddCourse,
    ocsRemoveEnrollment,
    setStudentMaxUnitsOverride,
    setAllStudentsMaxUnitsOverride,
    checkPrerequisites,
    checkCorequisites,
    getCurrentUnits,
  } = useApp();

  // ── All hooks first ────────────────────────────────────────────────────────
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedTermId, setSelectedTermId] = useState<string>(() => state.terms.find(t => t.isActive)?.id ?? '');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editGradeValue, setEditGradeValue] = useState<GradeValue | '__none__'>('__none__');
  const [editingRemovalKey, setEditingRemovalKey] = useState<string | null>(null);
  const [editRemovalValue, setEditRemovalValue] = useState<GradeValue | '__none__'>('__none__');

  // Manual course add dialog
  const [addCourseOpen, setAddCourseOpen] = useState(false);
  const [courseSearch, setCourseSearch] = useState('');

  // All-students override
  const [bulkUnits, setBulkUnits] = useState('');
  const [overrideSearch, setOverrideSearch] = useState('');
  const [overrideStudentId, setOverrideStudentId] = useState<string | null>(null);
  const [overrideUnits, setOverrideUnits] = useState('');

  // Enlistment Control tab state
  const [enlistSearch, setEnlistSearch] = useState('');
  const [pendingAdds, setPendingAdds] = useState<string[]>([]);
  const [pendingRemoves, setPendingRemoves] = useState<string[]>([]);
  const [enlistConfirmOpen, setEnlistConfirmOpen] = useState(false);
  const [enlistApplying, setEnlistApplying] = useState(false);
  const [ocsLabPickerSection, setOcsLabPickerSection] = useState<Section | null>(null);

  const studentResults = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q || selectedStudentId) return [];
    const cu = state.currentUser;
    const ocsColByName = state.colleges.find(c => c.name === cu?.college);
    const ocsColById = state.colleges.find(c => c.id === cu?.college);
    const ocsCollegeName = (ocsColById ?? ocsColByName)?.name ?? cu?.college ?? '';
    return state.users
      .filter(u => {
        if (u.role !== 'student') return false;
        if (!u.name.toLowerCase().includes(q) && !(u.studentNumber ?? '').toLowerCase().includes(q) && !u.username.toLowerCase().includes(q)) return false;
        if (!ocsCollegeName) return true;
        const sc = state.colleges.find(c => c.id === u.college || c.name === u.college);
        return (sc?.name ?? u.college ?? '') === ocsCollegeName;
      })
      .slice(0, 10);
  }, [studentSearch, selectedStudentId, state.users, state.colleges, state.currentUser]);

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
      .filter(r => r.sec && r.course)
      // Stable sort by course code then section code — prevents rows from visibly
      // reordering/jumping whenever the underlying DB reload returns rows in a
      // different (unordered) sequence after a grade edit triggers a realtime refetch.
      .sort((a, b) => {
        const codeCompare = a.course!.code.localeCompare(b.course!.code);
        if (codeCompare !== 0) return codeCompare;
        return a.sec!.sectionCode.localeCompare(b.sec!.sectionCode);
      });
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
    const cu = state.currentUser;
    const ocsCollegeByName = state.colleges.find(c => c.name === cu?.college);
    const ocsCollegeById = state.colleges.find(c => c.id === cu?.college);
    const ocsCollegeName = (ocsCollegeById ?? ocsCollegeByName)?.name ?? cu?.college ?? '';
    return state.users.filter(u => {
      if (u.role !== 'student') return false;
      if (!u.name.toLowerCase().includes(q) && !(u.studentNumber ?? '').toLowerCase().includes(q)) return false;
      if (!ocsCollegeName) return true;
      const sc = state.colleges.find(c => c.id === u.college || c.name === u.college);
      return (sc?.name ?? u.college ?? '') === ocsCollegeName;
    }).slice(0, 8);
  }, [overrideSearch, overrideStudentId, state.users, state.colleges, state.currentUser]);

  // Enlistment Control: current non-manual active enrollments for the selected student/term
  const activeEnrollmentRows = useMemo(() => {
    if (!selectedStudentId || !selectedTermId) return [];
    return state.enrollments
      .filter(e => e.studentId === selectedStudentId && e.termId === selectedTermId && e.status !== 'dropped')
      .map(e => {
        const sec = state.sections.find(s => s.id === e.sectionId);
        const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
        return { enrollment: e, sec, course };
      })
      .filter(r => r.sec && r.course && r.sec.sectionCode !== '__MANUAL__')
      // Stable sort — keeps row order consistent across reloads/realtime refetches
      .sort((a, b) => {
        const codeCompare = a.course!.code.localeCompare(b.course!.code);
        if (codeCompare !== 0) return codeCompare;
        return a.sec!.sectionCode.localeCompare(b.sec!.sectionCode);
      });
  }, [selectedStudentId, selectedTermId, state.enrollments, state.sections, state.courses]);

  // Enlistment Control: section search results for adding
  const enlistResults = useMemo(() => {
    const q = enlistSearch.trim().toLowerCase();
    if (!q || !selectedStudentId || !selectedTermId) return [];
    const enrolledIds = new Set(
      state.enrollments
        .filter(e => e.studentId === selectedStudentId && e.termId === selectedTermId && e.status !== 'dropped')
        .map(e => e.sectionId)
    );
    return state.sections.filter(s => {
      if (s.termId !== selectedTermId) return false;
      if (s.sectionCode === '__MANUAL__') return false;
      if (s.parentSectionId) return false; // child lab/rec — chosen via lab picker after selecting lecture
      // Already enrolled (and not being removed) or already queued to add
      if ((enrolledIds.has(s.id) && !pendingRemoves.includes(s.id)) || pendingAdds.includes(s.id)) return false;
      const c = state.courses.find(cc => cc.id === s.courseId);
      if (!c) return false;
      return c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q) || s.sectionCode.toLowerCase().includes(q);
    }).slice(0, 15);
  }, [enlistSearch, selectedStudentId, selectedTermId, pendingAdds, pendingRemoves, state]);

  if (!state.currentUser) return null;

  const selectedTerm = state.terms.find(t => t.id === selectedTermId);
  const selectedStudent = selectedStudentId ? state.users.find(u => u.id === selectedStudentId) : null;

  // Resolve OCS user's college (handles stored-as-ID or stored-as-name)
  const me = state.currentUser;
  const ocsCollegeByName = state.colleges.find(c => c.name === me.college);
  const ocsCollegeById = state.colleges.find(c => c.id === me.college);
  const ocsCollegeName = (ocsCollegeById ?? ocsCollegeByName)?.name ?? me.college ?? '';

  const allStudents = state.users.filter(u => {
    if (u.role !== 'student') return false;
    if (!ocsCollegeName) return true;
    const studentCollege = state.colleges.find(c => c.id === u.college || c.name === u.college);
    const studentCollegeName = studentCollege?.name ?? u.college ?? '';
    return studentCollegeName === ocsCollegeName;
  });

  // ── Enlistment restriction checker ────────────────────────────────────────
  const getEnlistRestrictions = (sec: Section) => {
    const studentId = selectedStudentId!;
    const course = state.courses.find(c => c.id === sec.courseId);

    // Already passed
    const alreadyPassed = !!course && state.grades.some(g => {
      if (g.studentId !== studentId || !g.submitted) return false;
      const gs = state.sections.find(s => s.id === g.sectionId);
      if (!gs || gs.courseId !== course.id) return false;
      const eff = (g.removalSubmitted && g.removalGrade) ? g.removalGrade : g.grade;
      return !!(eff && !['4', '5', 'INC', 'DRP', 'F'].includes(String(eff)));
    });

    // INC restriction
    const incRestricted = !!course && isIncEnrollmentRestricted(studentId, course.id, state.grades, state.sections, state.terms);

    // Prerequisites
    const pCheck = course ? checkPrerequisites(studentId, course.id) : { passed: true, missing: [] };

    // Corequisites (using already-pending adds as cart)
    const cCheck = course ? checkCorequisites(studentId, course.id, selectedTermId, pendingAdds) : { passed: true, missing: [] };

    // Year standing
    const student = state.users.find(u => u.id === studentId);
    const prog = state.degreePrograms?.find(p => p.name === student?.program);
    const programCourseIds = buildProgramCourseIdSet(state.graduationRequirements, prog?.collegeId ?? '', prog?.id ?? '');
    const passedUnits = getPassedUnits(studentId, state.grades, state.sections, state.courses, state.enrollments, programCourseIds);
    const collegeEntry = state.colleges.find(c => c.id === prog?.collegeId || c.id === student?.college || c.name === student?.college);
    const globalReq = state.graduationRequirements.find(r => r.collegeId === 'global' && !r.programId);
    const collegeReq = prog?.id
      ? (state.graduationRequirements.find(r => r.programId === prog.id) ?? state.graduationRequirements.find(r => r.collegeId === collegeEntry?.id && !r.programId))
      : state.graduationRequirements.find(r => r.collegeId === collegeEntry?.id && !r.programId);
    const reqBasedUnits = computeTotalRequiredUnits(globalReq, collegeReq, state.courses);
    const totalProgUnits = reqBasedUnits > 0 ? reqBasedUnits : (prog?.totalUnits ?? 0);
    const yearRank: Record<string, number> = { Freshman: 0, Sophomore: 1, Junior: 2, Senior: 3 };
    const yearLevelToClass = (yl: number) => yl <= 1 ? 'Freshman' : yl === 2 ? 'Sophomore' : yl === 3 ? 'Junior' : 'Senior';
    const profileYearClass = student?.yearLevel ? yearLevelToClass(student.yearLevel) : null;
    const unitYearClass = totalProgUnits > 0 ? getYearClassification(passedUnits, totalProgUnits, prog?.degreeType) : null;
    const profileRank = profileYearClass ? (yearRank[profileYearClass] ?? 0) : -1;
    const unitRank = unitYearClass ? (yearRank[unitYearClass] ?? 0) : -1;
    const effectiveYearClass = (profileRank < 0 && unitRank < 0) ? 'Freshman'
      : (profileRank >= unitRank ? profileYearClass! : unitYearClass!);
    const yearStandingFail = !!(course?.minYearStanding && !course.isPE && !course.isNSTP &&
      (yearRank[effectiveYearClass] ?? 0) < (yearRank[course.minYearStanding] ?? 0));
    const yearStandingMsg = yearStandingFail ? `Requires ${course?.minYearStanding} standing (student is ${effectiveYearClass})` : '';

    // Min passed units
    const minUnitsFail = !!(course?.minUnitsRequired != null && !course.isPE && !course.isNSTP && passedUnits < (course.minUnitsRequired ?? 0));

    // Section full
    const isFull = sec.enrolled >= sec.slots;

    const blocked = alreadyPassed || incRestricted || !pCheck.passed || !cCheck.passed || yearStandingFail || minUnitsFail || isFull;

    return { alreadyPassed, incRestricted, prereqFail: !pCheck.passed, prereqMissing: pCheck.missing, coreqFail: !cCheck.passed, coreqMissing: cCheck.missing, yearStandingFail, yearStandingMsg, minUnitsFail, isFull, blocked };
  };


  const handleSaveGrade = (studentId: string, sectionId: string, termId: string) => {
    const gradeToSave = editGradeValue === '__none__' ? null : editGradeValue as GradeValue;
    ocsUpdateGrade(studentId, sectionId, termId, gradeToSave);
    setEditingKey(null);
    toast.success('Grade updated successfully.');
  };

  const handleSaveRemovalGrade = (studentId: string, sectionId: string, termId: string) => {
    const removalToSave = editRemovalValue === '__none__' ? null : editRemovalValue as GradeValue;
    ocsUpdateRemovalGrade(studentId, sectionId, termId, removalToSave);
    setEditingRemovalKey(null);
    toast.success('Removal grade updated.');
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

  const handleApplyEnlistmentChanges = async () => {
    if (!selectedStudentId || !selectedTermId) return;
    setEnlistApplying(true);
    let addFailed = 0, removeFailed = 0;
    for (const sectionId of pendingAdds) {
      const sec = state.sections.find(s => s.id === sectionId);
      // Skip child lab/rec sections — restrictions are checked on the parent
      if (sec?.parentSectionId) {
        const result = await ocsManualEnroll(selectedStudentId, sectionId, selectedTermId);
        if (!result.success) { addFailed++; toast.error('Add failed', { description: result.message }); }
        continue;
      }
      if (sec) {
        const r = getEnlistRestrictions(sec);
        if (r.blocked) {
          addFailed++;
          const reason = r.alreadyPassed ? 'Student already passed this course'
            : r.incRestricted ? 'Active INC restriction'
            : r.prereqFail ? `Missing prerequisites: ${r.prereqMissing.join(', ')}`
            : r.coreqFail ? `Missing corequisites: ${r.coreqMissing.join(', ')}`
            : r.yearStandingFail ? r.yearStandingMsg
            : r.minUnitsFail ? 'Minimum passed units not met'
            : 'Section is full';
          const course = state.courses.find(c => c.id === sec.courseId);
          toast.error(`${course?.code ?? sec.sectionCode}: Cannot add`, { description: reason });
          continue;
        }
      }
      const result = await ocsManualEnroll(selectedStudentId, sectionId, selectedTermId);
      if (!result.success) { addFailed++; toast.error('Add failed', { description: result.message }); }
    }
    for (const sectionId of pendingRemoves) {
      const result = ocsRemoveEnrollment(selectedStudentId, sectionId, selectedTermId);
      if (!result.success) { removeFailed++; toast.error('Remove failed', { description: result.message }); }
    }
    setPendingAdds([]);
    setPendingRemoves([]);
    setEnlistConfirmOpen(false);
    setEnlistApplying(false);
    setEnlistSearch('');
    if (addFailed === 0 && removeFailed === 0) {
      toast.success('Enrollment changes applied successfully.');
    }
  };

  // ── Shared student+term selector ──────────────────────────────────────────
  const SelectorBar = (
    <div className="px-4 py-3 flex flex-wrap gap-3 items-center border-b border-border/50">
      <div className="relative flex-1 min-w-[240px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search student by name or number..."
          value={studentSearch}
          onChange={e => { setStudentSearch(e.target.value); setSelectedStudentId(null); setPendingAdds([]); setPendingRemoves([]); setEnlistSearch(''); }}
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
      <SearchableSelect
        value={selectedTermId}
        onValueChange={v => { setSelectedTermId(v); setPendingAdds([]); setPendingRemoves([]); setEnlistSearch(''); }}
        triggerClassName="w-[200px] h-9 text-sm"
        placeholder="Select term"
        options={state.terms.map(t => ({ value: t.id, label: `${t.name}${t.isActive ? ' (Active)' : ''}` }))}
      />
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
                <TabsTrigger value="enlistment" className="flex items-center gap-1.5 text-xs">
                  <ClipboardList className="w-3.5 h-3.5" /> Enlistment Control
                  {(pendingAdds.length > 0 || pendingRemoves.length > 0) && (
                    <span className="ml-1 h-4 px-1.5 text-[10px] rounded-full flex items-center bg-primary text-primary-foreground">
                      {pendingAdds.filter(id => !state.sections.find(s => s.id === id)?.parentSectionId).length + pendingRemoves.filter(id => !state.sections.find(s => s.id === id)?.parentSectionId).length}
                    </span>
                  )}
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
                  <div className="inner-table">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted">
                          <TableHead className="text-xs font-semibold">Course</TableHead>
                          <TableHead className="text-xs font-semibold">Title</TableHead>
                          <TableHead className="text-xs font-semibold text-center">Section</TableHead>
                          <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                          <TableHead className="text-xs font-semibold text-center">Grade</TableHead>
                          {enrolledRows.some(r => r.grade?.removalGrade || REMOVAL_ELIGIBLE.includes(r.grade?.grade as GradeValue)) && (
                            <TableHead className="text-xs font-semibold text-center">Removal Grade</TableHead>
                          )}
                          <TableHead className="text-xs font-semibold text-center">Submitted</TableHead>
                          <TableHead className="text-xs font-semibold text-center">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {enrolledRows.map(({ enrollment, sec, course, grade }) => {
                          const key = enrollment.sectionId;
                          const isEditing = editingKey === key;
                          const isEditingRemovalRecord = editingRemovalKey === key;
                          const isManual = sec?.sectionCode === '__MANUAL__';
                          const hasAnyRemoval = enrolledRows.some(r => r.grade?.removalGrade || REMOVAL_ELIGIBLE.includes(r.grade?.grade as GradeValue));
                          const isEligible = REMOVAL_ELIGIBLE.includes(grade?.grade as GradeValue);
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
                                  <SearchableSelect
                                    value={editGradeValue}
                                    onValueChange={v => setEditGradeValue(v as GradeValue | '__none__')}
                                    triggerClassName="h-7 text-xs w-36 mx-auto"
                                    placeholder="Grade..."
                                    options={getGradeOptions(course?.type).map(o => ({ value: o.value, label: o.label }))}
                                  />
                                ) : (
                                  <span className={`text-sm font-semibold ${!grade?.grade ? 'text-muted-foreground italic text-xs' : ''}`}>
                                    {grade?.grade ?? '—'}
                                  </span>
                                )}
                              </TableCell>
                              {hasAnyRemoval && (
                                <TableCell className="text-center">
                                  {isEditingRemovalRecord ? (
                                    <div className="flex items-center gap-1 justify-center">
                                      <SearchableSelect
                                        value={editRemovalValue}
                                        onValueChange={v => setEditRemovalValue(v as GradeValue | '__none__')}
                                        triggerClassName="h-7 text-xs w-28 mx-auto"
                                        placeholder="Grade..."
                                        options={[
                                          { value: '__none__', label: '— Clear' },
                                          ...getRemovalGradeOptions(grade?.grade).map(g => ({ value: g, label: g })),
                                        ]}
                                      />
                                      <Button size="sm" className="h-6 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-foreground"
                                        onClick={() => handleSaveRemovalGrade(enrollment.studentId, enrollment.sectionId, enrollment.termId)}>
                                        <Check className="w-3 h-3" />
                                      </Button>
                                      <Button size="sm" variant="outline" className="h-6 px-2 text-xs"
                                        onClick={() => setEditingRemovalKey(null)}>
                                        <X className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  ) : grade?.removalGrade ? (
                                    <Badge className={`text-xs cursor-pointer ${
                                      ['1.0','1.25','1.5','1.75','2.0','2.25','2.5','2.75','3.0'].includes(grade.removalGrade)
                                        ? 'bg-green-100 text-green-800 border-green-300'
                                        : grade.removalGrade === '5'
                                        ? 'bg-red-100 text-red-800 border-red-300'
                                        : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                                    }`}
                                      onClick={() => { setEditingRemovalKey(key); setEditRemovalValue(grade.removalGrade ?? '__none__'); }}>
                                      {grade.removalGrade}
                                      {grade.removalSubmitted && <span className="ml-1 opacity-70">✓</span>}
                                    </Badge>
                                  ) : isEligible ? (
                                    <span
                                      className="text-muted-foreground text-xs cursor-pointer hover:text-foreground hover:underline transition-colors"
                                      onClick={() => { setEditingRemovalKey(key); setEditRemovalValue('__none__'); }}>
                                      — Set
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">—</span>
                                  )}
                                </TableCell>
                              )}
                              <TableCell className="text-center">
                                {grade?.submitted
                                  ? <Badge className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-300">Yes</Badge>
                                  : <Badge variant="outline" className="text-[10px]">No</Badge>}
                              </TableCell>
                              <TableCell className="text-center">
                                {isEditing ? (
                                  <div className="flex items-center gap-1 justify-center">
                                    <Button size="sm"
                                      className="h-6 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-foreground"
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
                      <div className="inner-table">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted">
                              <TableHead className="text-xs font-semibold">Course Code</TableHead>
                              <TableHead className="text-xs font-semibold">Title</TableHead>
                              <TableHead className="text-xs font-semibold text-center">Units</TableHead>
                              <TableHead className="text-xs font-semibold text-center">Grade</TableHead>
                              <TableHead className="text-xs font-semibold text-center">Removal Grade</TableHead>
                              <TableHead className="text-xs font-semibold text-center">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {manualRows.map(({ enrollment, course, grade }) => {
                              const key = enrollment.sectionId;
                              const isEditing = editingKey === key;
                              const isEditingRemoval = editingRemovalKey === key;
                              return (
                                <TableRow key={key}>
                                  <TableCell className="font-semibold text-sm">{course!.code}</TableCell>
                                  <TableCell className="text-sm">{course!.title}</TableCell>
                                  <TableCell className="text-center text-sm">{course!.units}</TableCell>
                                  {/* Regular Grade */}
                                  <TableCell className="text-center">
                                    {isEditing ? (
                                      <div className="flex items-center gap-1 justify-center">
                                        <SearchableSelect
                                          value={editGradeValue}
                                          onValueChange={v => setEditGradeValue(v as GradeValue | '__none__')}
                                          triggerClassName="h-7 text-xs w-32 mx-auto"
                                          placeholder="Grade..."
                                          options={getGradeOptions(course?.type).map(o => ({ value: o.value, label: o.label }))}
                                        />
                                        <Button size="sm" className="h-6 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-foreground"
                                          onClick={() => handleSaveGrade(enrollment.studentId, enrollment.sectionId, enrollment.termId)}>
                                          <Check className="w-3 h-3" />
                                        </Button>
                                        <Button size="sm" variant="outline" className="h-6 px-2 text-xs"
                                          onClick={() => setEditingKey(null)}>
                                          <X className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <span className={`text-sm font-semibold ${!grade?.grade ? 'text-muted-foreground italic text-xs' : ''}`}>
                                        {grade?.grade ?? '—'}
                                      </span>
                                    )}
                                  </TableCell>
                                  {/* Removal Grade */}
                                  <TableCell className="text-center">
                                    {isEditingRemoval ? (
                                      <div className="flex items-center gap-1 justify-center">
                                        <SearchableSelect
                                          value={editRemovalValue}
                                          onValueChange={v => setEditRemovalValue(v as GradeValue | '__none__')}
                                          triggerClassName="h-7 text-xs w-32 mx-auto"
                                          placeholder="Grade..."
                                          options={[
                                            { value: '__none__', label: '— Clear' },
                                            ...getRemovalGradeOptions(grade?.grade).map(g => ({ value: g, label: g })),
                                          ]}
                                        />
                                        <Button size="sm" className="h-6 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-foreground"
                                          onClick={() => handleSaveRemovalGrade(enrollment.studentId, enrollment.sectionId, enrollment.termId)}>
                                          <Check className="w-3 h-3" />
                                        </Button>
                                        <Button size="sm" variant="outline" className="h-6 px-2 text-xs"
                                          onClick={() => setEditingRemovalKey(null)}>
                                          <X className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    ) : grade?.removalGrade ? (
                                      <Badge className={`text-xs cursor-pointer ${
                                        ['1.0','1.25','1.5','1.75','2.0','2.25','2.5','2.75','3.0'].includes(grade.removalGrade as string)
                                          ? 'bg-green-100 text-green-800 border-green-300'
                                          : grade.removalGrade === '5'
                                          ? 'bg-red-100 text-red-800 border-red-300'
                                          : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                                      }`}
                                        onClick={() => { setEditingRemovalKey(key); setEditRemovalValue(grade.removalGrade ?? '__none__'); }}>
                                        {grade.removalGrade}
                                        {grade.removalSubmitted && <span className="ml-1 opacity-70">✓</span>}
                                      </Badge>
                                    ) : REMOVAL_ELIGIBLE.includes(grade?.grade as GradeValue) ? (
                                      <span
                                        className="text-muted-foreground text-xs cursor-pointer hover:text-foreground hover:underline transition-colors"
                                        onClick={() => { setEditingRemovalKey(key); setEditRemovalValue('__none__'); }}>
                                        — Set
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground text-xs">—</span>
                                    )}
                                  </TableCell>
                                  {/* Action */}
                                  <TableCell className="text-center">
                                    <div className="flex items-center gap-1 justify-center">
                                      <Button size="sm" variant="outline" className="h-6 px-2 text-xs gap-1"
                                        onClick={() => { setEditingKey(key); setEditGradeValue(grade?.grade ?? '__none__'); setEditingRemovalKey(null); }}>
                                        <Pencil className="w-3 h-3" /> Edit
                                      </Button>
                                      <Button size="sm" variant="outline"
                                        className="h-6 px-2 text-xs gap-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                                        onClick={() => handleRemove(enrollment.sectionId)}>
                                        <Trash2 className="w-3 h-3" /> Delete
                                      </Button>
                                    </div>
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

              {/* ── ENLISTMENT CONTROL ───────────────────────────────────────── */}
              <TabsContent value="enlistment" className="mt-4">
                {!selectedStudentId || !selectedTermId ? (
                  <div className="py-14 text-center">
                    <ClipboardList className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-sm font-medium text-muted-foreground">Select a student and term to manage their enlistment.</p>
                  </div>
                ) : (
                  <div className="space-y-5">

                    {/* Pending Changes Banner */}
                    {(pendingAdds.length > 0 || pendingRemoves.length > 0) && (
                      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 text-sm flex-wrap">
                          {pendingAdds.filter(id => !state.sections.find(s => s.id === id)?.parentSectionId).length > 0 && (
                            <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                              <Plus className="w-3.5 h-3.5" /> {pendingAdds.filter(id => !state.sections.find(s => s.id === id)?.parentSectionId).length} course{pendingAdds.filter(id => !state.sections.find(s => s.id === id)?.parentSectionId).length > 1 ? 's' : ''} to add
                            </span>
                          )}
                          {pendingRemoves.filter(id => !state.sections.find(s => s.id === id)?.parentSectionId).length > 0 && (
                            <span className="flex items-center gap-1.5 text-red-700 font-medium">
                              <Minus className="w-3.5 h-3.5" /> {pendingRemoves.filter(id => !state.sections.find(s => s.id === id)?.parentSectionId).length} course{pendingRemoves.filter(id => !state.sections.find(s => s.id === id)?.parentSectionId).length > 1 ? 's' : ''} to remove
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                            onClick={() => { setPendingAdds([]); setPendingRemoves([]); }}>
                            <X className="w-3 h-3" /> Clear
                          </Button>
                          <Button size="sm" className="h-7 text-xs gap-1.5 bg-primary hover:bg-primary/90"
                            onClick={() => setEnlistConfirmOpen(true)}>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Review &amp; Confirm
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Current Enrollments */}
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Current Enrollments — {state.terms.find(t => t.id === selectedTermId)?.name} ({activeEnrollmentRows.filter(r => !r.sec!.parentSectionId).length})
                      </p>
                      {activeEnrollmentRows.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-6 text-center">No active enrollments in this term.</p>
                      ) : (
                        <div className="inner-table">
                          <table className="w-full text-xs">
                            <thead className="bg-muted border-b">
                              <tr>
                                <th className="text-left px-3 py-2 font-semibold">Course</th>
                                <th className="text-left px-3 py-2 font-semibold">Section</th>
                                <th className="text-left px-3 py-2 font-semibold">Schedule</th>
                                <th className="text-center px-3 py-2 font-semibold">Status</th>
                                <th className="text-center px-3 py-2 font-semibold">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {activeEnrollmentRows
                                .filter(r => !r.sec!.parentSectionId) // only show parent (lecture) rows
                                .map(({ enrollment, sec, course }) => {
                                  const isRemoving = pendingRemoves.includes(sec!.id);
                                  const sched = sec!.schedule;
                                  const schedStr = sched?.days?.length
                                    ? `${sched.days.join('')} ${sched.startTime}–${sched.endTime}`
                                    : 'TBA';
                                  // Find enrolled child (lab/rec) if any
                                  const childRow = activeEnrollmentRows.find(r => r.sec!.parentSectionId === sec!.id);
                                  const childType = course!.type === 'Lec+Rec' ? 'Rec' : 'Lab';
                                  const isDual = course!.type === 'Lec+Lab' || course!.type === 'Lec+Rec';
                                  const childIsRemoving = childRow ? pendingRemoves.includes(childRow.sec!.id) : false;
                                  return (
                                    <>
                                      <tr key={enrollment.id} className={isRemoving ? 'bg-red-50/60' : ''}>
                                        <td className="px-3 py-2">
                                          <p className="font-semibold">{course!.code}</p>
                                          <p className="text-muted-foreground text-[10px]">{course!.title}</p>
                                        </td>
                                        <td className="px-3 py-2 font-medium">{sec!.sectionCode}</td>
                                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{schedStr}</td>
                                        <td className="px-3 py-2 text-center">
                                          {isRemoving
                                            ? <span className="text-red-600 font-semibold text-[10px]">Pending Remove</span>
                                            : statusBadge(enrollment.status)}
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                          {isRemoving ? (
                                            <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] gap-1"
                                              onClick={() => setPendingRemoves(prev => prev.filter(id => id !== sec!.id && state.sections.find(s => s.id === id)?.parentSectionId !== sec!.id))}>
                                              <X className="w-3 h-3" /> Undo
                                            </Button>
                                          ) : (
                                            <Button size="sm" variant="outline"
                                              className="h-6 px-2 text-[10px] gap-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                                              onClick={() => {
                                                const childIds = activeEnrollmentRows.filter(r => r.sec!.parentSectionId === sec!.id).map(r => r.sec!.id);
                                                setPendingRemoves(prev => [...prev, sec!.id, ...childIds.filter(id => !prev.includes(id))]);
                                              }}>
                                              <Minus className="w-3 h-3" /> Remove
                                            </Button>
                                          )}
                                        </td>
                                      </tr>
                                      {isDual && childRow && (
                                        <tr key={childRow.enrollment.id} className={isRemoving || childIsRemoving ? 'bg-red-50/40' : 'bg-muted/10'}>
                                          <td colSpan={4} className="px-3 py-1.5 pl-6 text-[10px] text-muted-foreground italic">
                                            ↳ {childType}: {childRow.sec!.sectionCode} &bull; {(() => {
                                              const cs = childRow.sec!.schedule;
                                              return cs?.days?.length ? `${cs.days.join('')} ${cs.startTime}–${cs.endTime}` : 'TBA';
                                            })()}
                                            {(isRemoving || childIsRemoving) && <span className="ml-2 text-red-500 font-semibold">(will be removed)</span>}
                                          </td>
                                          <td className="px-3 py-1.5 text-center text-muted-foreground text-[10px]">—</td>
                                        </tr>
                                      )}
                                    </>
                                  );
                                })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Add Section */}
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Add Section
                      </p>
                      <div className="relative mb-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by course code, title, or section..."
                          value={enlistSearch}
                          onChange={e => setEnlistSearch(e.target.value)}
                          className="pl-9 h-9 text-sm"
                        />
                      </div>
                      {enlistSearch.trim() && (
                        enlistResults.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-6">No available sections found.</p>
                        ) : (
                          <div className="inner-table">
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
                                {enlistResults.map(sec => {
                                  const course = state.courses.find(c => c.id === sec.courseId)!;
                                  const isPending = pendingAdds.includes(sec.id);
                                  const isFull = sec.enrolled >= sec.slots;
                                  const sched = sec.schedule;
                                  const schedStr = sched?.days?.length
                                    ? `${sched.days.join('')} ${sched.startTime}–${sched.endTime}`
                                    : 'TBA';
                                  const r = selectedStudentId ? getEnlistRestrictions(sec) : null;
                                  const isBlocked = r?.blocked ?? false;
                                  return (
                                    <tr key={sec.id} className={isPending ? 'bg-emerald-50/60' : isBlocked ? 'bg-red-50/30' : ''}>
                                      <td className="px-3 py-2">
                                        <p className="font-semibold">{course.code}</p>
                                        <p className="text-muted-foreground text-[10px]">{course.title}</p>
                                        {r?.alreadyPassed && <p className="text-[10px] text-amber-700 mt-0.5"><AlertTriangle className="w-2.5 h-2.5 inline" /> Student already passed this course</p>}
                                        {r?.incRestricted && <p className="text-[10px] text-orange-700 mt-0.5"><AlertTriangle className="w-2.5 h-2.5 inline" /> Active INC — removal exam required</p>}
                                        {r?.prereqFail && <p className="text-[10px] text-red-600 mt-0.5"><AlertTriangle className="w-2.5 h-2.5 inline" /> Missing prereqs: {r.prereqMissing.join(', ')}</p>}
                                        {r?.coreqFail && <p className="text-[10px] text-red-600 mt-0.5"><AlertTriangle className="w-2.5 h-2.5 inline" /> Coreqs needed: {r.coreqMissing.join(', ')}</p>}
                                        {r?.yearStandingFail && <p className="text-[10px] text-red-600 mt-0.5"><AlertTriangle className="w-2.5 h-2.5 inline" /> {r.yearStandingMsg}</p>}
                                        {r?.minUnitsFail && <p className="text-[10px] text-red-600 mt-0.5"><AlertTriangle className="w-2.5 h-2.5 inline" /> Min passed units not met</p>}
                                        {isFull && <p className="text-[10px] text-red-600 mt-0.5"><AlertTriangle className="w-2.5 h-2.5 inline" /> Section is full</p>}
                                      </td>
                                      <td className="px-3 py-2 font-medium">{sec.sectionCode}</td>
                                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{schedStr}</td>
                                      <td className="px-3 py-2 text-center">
                                        <span className={isFull ? 'text-red-600 font-semibold' : ''}>{sec.enrolled}/{sec.slots}</span>
                                      </td>
                                      <td className="px-3 py-2 text-center">{course.units}</td>
                                      <td className="px-3 py-2 text-center">
                                        {isPending ? (
                                          <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] border-red-300 text-red-600 hover:bg-red-50 gap-1"
                                            onClick={() => setPendingAdds(prev => prev.filter(id => id !== sec.id && state.sections.find(s => s.id === id)?.parentSectionId !== sec.id))}>
                                            <X className="w-3 h-3" /> Undo
                                          </Button>
                                        ) : isBlocked ? (
                                          <span className="text-[10px] text-red-500 font-medium">
                                            {r?.alreadyPassed ? 'Passed' : r?.incRestricted ? 'INC' : r?.prereqFail ? 'Prereq' : r?.coreqFail ? 'Coreq' : r?.yearStandingFail ? 'Standing' : r?.minUnitsFail ? 'Min Units' : 'Full'}
                                          </span>
                                        ) : (
                                          <Button size="sm" className="h-6 px-2 text-[10px] gap-1"
                                            onClick={() => {
                                              const children = state.sections.filter(s => s.parentSectionId === sec.id && s.termId === selectedTermId!);
                                              if (children.length > 0) {
                                                setPendingAdds(prev => [...prev, sec.id]);
                                                setOcsLabPickerSection(sec);
                                              } else {
                                                setPendingAdds(prev => [...prev, sec.id]);
                                              }
                                            }}>
                                            <Plus className="w-3 h-3" /> Add
                                          </Button>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )
                      )}
                    </div>

                    {/* Pending Adds Preview */}
                    {pendingAdds.length > 0 && (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 space-y-1.5">
                        <p className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wide">Queued to Add ({pendingAdds.filter(id => !state.sections.find(s => s.id === id)?.parentSectionId).length})</p>
                        {pendingAdds
                          .filter(sid => !state.sections.find(s => s.id === sid)?.parentSectionId)
                          .map(sid => {
                            const sec = state.sections.find(s => s.id === sid);
                            const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
                            if (!sec || !course) return null;
                            const childId = pendingAdds.find(id => state.sections.find(s => s.id === id)?.parentSectionId === sid);
                            const childSec = childId ? state.sections.find(s => s.id === childId) : null;
                            const isDual = course.type === 'Lec+Lab' || course.type === 'Lec+Rec';
                            const childType = course.type === 'Lec+Rec' ? 'Rec' : 'Lab';
                            return (
                              <div key={sid} className="space-y-0.5">
                                <div className="flex items-center justify-between text-xs rounded border px-2.5 py-1.5 bg-white border-emerald-200">
                                  <span><strong>{course.code}</strong> — {sec.sectionCode}</span>
                                  <button className="text-red-400 hover:text-red-600" onClick={() => setPendingAdds(prev => prev.filter(id => id !== sid && state.sections.find(s => s.id === id)?.parentSectionId !== sid))}>
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                                {isDual && childSec && (
                                  <div className="ml-4 flex items-center justify-between text-[10px] rounded border px-2.5 py-1 bg-muted border-emerald-100 text-muted-foreground">
                                    <span>↳ {childType}: {childSec.sectionCode}</span>
                                    <button className="text-blue-500 hover:text-blue-700 underline" onClick={() => setOcsLabPickerSection(sec)}>Change</button>
                                  </div>
                                )}
                                {isDual && !childSec && (
                                  <div className="ml-4 info-note info-note-warning">
                                    <AlertTriangle className="w-3 h-3" />
                                    No {childType.toLowerCase()} group selected —{' '}
                                    <button className="underline" onClick={() => setOcsLabPickerSection(sec)}>Pick group</button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    )}

                    {(pendingAdds.length > 0 || pendingRemoves.length > 0) && (
                      <div className="flex justify-end">
                        <Button className="h-8 text-xs gap-1.5" onClick={() => setEnlistConfirmOpen(true)}>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Review &amp; Confirm Changes
                        </Button>
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
              <SearchableSelect
                value={selectedTermId}
                onValueChange={setSelectedTermId}
                triggerClassName="w-[220px] h-9 text-sm"
                placeholder="Select term"
                options={state.terms.map(t => ({ value: t.id, label: `${t.name}${t.isActive ? ' (Active)' : ''}` }))}
              />
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
                  <div className="inner-table">
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
                          // Only show overrides for students in this OCS user's college
                          const sc = state.colleges.find(c => c.id === st.college || c.name === st.college);
                          if (ocsCollegeName && (sc?.name ?? st.college ?? '') !== ocsCollegeName) return null;
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

        {/* ── Enlistment Control Confirmation Dialog ───────────────────────── */}
        {enlistConfirmOpen && selectedStudent && (
          <Dialog open onOpenChange={v => { if (!v) setEnlistConfirmOpen(false); }}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5" /> Confirm Enrollment Changes
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-1">
                <p className="text-sm text-muted-foreground">
                  Applying changes for <strong>{selectedStudent.name}</strong> — <strong>{state.terms.find(t => t.id === selectedTermId)?.name}</strong>.
                  These changes are applied <strong>immediately and are finalized</strong>.
                </p>

                {/* Sections to Add */}
                {pendingAdds.filter(id => !state.sections.find(s => s.id === id)?.parentSectionId).length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide mb-1.5">
                      Adding ({pendingAdds.filter(id => !state.sections.find(s => s.id === id)?.parentSectionId).length} course{pendingAdds.filter(id => !state.sections.find(s => s.id === id)?.parentSectionId).length > 1 ? 's' : ''})
                    </p>
                    <div className="rounded-xl border border-emerald-200 overflow-hidden">
                      <table className="w-full border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-emerald-200 bg-emerald-50/60">
                            <th className="px-3 py-2 text-left font-semibold text-emerald-800">Code</th>
                            <th className="px-3 py-2 text-left font-semibold text-emerald-800">Title</th>
                            <th className="px-3 py-2 text-center font-semibold text-emerald-800">Sec</th>
                            <th className="px-3 py-2 text-center font-semibold text-emerald-800">Units</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-emerald-100">
                          {pendingAdds
                            .filter(sid => !state.sections.find(s => s.id === sid)?.parentSectionId)
                            .map(sid => {
                              const sec = state.sections.find(s => s.id === sid);
                              const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
                              if (!sec || !course) return null;
                              const childId = pendingAdds.find(id => state.sections.find(s => s.id === id)?.parentSectionId === sid);
                              const childSec = childId ? state.sections.find(s => s.id === childId) : null;
                              const childType = course.type === 'Lec+Rec' ? 'Rec' : 'Lab';
                              const isDual = course.type === 'Lec+Lab' || course.type === 'Lec+Rec';
                              return (
                                <>
                                  <tr key={sid} className="bg-white">
                                    <td className="px-3 py-2 font-bold text-primary">{course.code}</td>
                                    <td className="px-3 py-2 text-foreground">{course.title}</td>
                                    <td className="px-3 py-2 text-center font-medium">{sec.sectionCode}</td>
                                    <td className="px-3 py-2 text-center text-muted-foreground">{course.units}</td>
                                  </tr>
                                  {isDual && childSec && (
                                    <tr key={childSec.id} className="bg-emerald-50/30">
                                      <td className="px-3 py-1.5 pl-6 text-muted-foreground italic" colSpan={2}>
                                        ↳ {childType}: {childSec.sectionCode}
                                      </td>
                                      <td className="px-3 py-1.5 text-center text-muted-foreground">{childSec.sectionCode}</td>
                                      <td className="px-3 py-1.5 text-center text-muted-foreground">—</td>
                                    </tr>
                                  )}
                                  {isDual && !childSec && (
                                    <tr key={`${sid}-nolab`} className="bg-amber-50">
                                      <td colSpan={4} className="px-3 py-1.5 pl-6 text-amber-700 italic text-[10px]">
                                        <AlertTriangle className="w-3 h-3 inline mr-1" />No {childType.toLowerCase()} group selected
                                      </td>
                                    </tr>
                                  )}
                                </>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Sections to Remove */}
                {pendingRemoves.filter(id => !state.sections.find(s => s.id === id)?.parentSectionId).length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-red-700 uppercase tracking-wide mb-1.5">
                      Removing ({pendingRemoves.filter(id => !state.sections.find(s => s.id === id)?.parentSectionId).length} course{pendingRemoves.filter(id => !state.sections.find(s => s.id === id)?.parentSectionId).length > 1 ? 's' : ''})
                    </p>
                    <div className="rounded-xl border border-red-200 overflow-hidden">
                      <table className="w-full border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-red-200 bg-red-50/60">
                            <th className="px-3 py-2 text-left font-semibold text-red-800">Code</th>
                            <th className="px-3 py-2 text-left font-semibold text-red-800">Title</th>
                            <th className="px-3 py-2 text-center font-semibold text-red-800">Sec</th>
                            <th className="px-3 py-2 text-center font-semibold text-red-800">Units</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-red-100">
                          {pendingRemoves
                            .filter(sid => !state.sections.find(s => s.id === sid)?.parentSectionId)
                            .map(sid => {
                              const sec = state.sections.find(s => s.id === sid);
                              const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
                              if (!sec || !course) return null;
                              const childId = pendingRemoves.find(id => state.sections.find(s => s.id === id)?.parentSectionId === sid);
                              const childSec = childId ? state.sections.find(s => s.id === childId) : null;
                              const childType = course.type === 'Lec+Rec' ? 'Rec' : 'Lab';
                              const isDual = course.type === 'Lec+Lab' || course.type === 'Lec+Rec';
                              return (
                                <>
                                  <tr key={sid} className="bg-white">
                                    <td className="px-3 py-2 font-bold text-destructive">{course.code}</td>
                                    <td className="px-3 py-2 text-foreground">{course.title}</td>
                                    <td className="px-3 py-2 text-center font-medium">{sec.sectionCode}</td>
                                    <td className="px-3 py-2 text-center text-muted-foreground">{course.units}</td>
                                  </tr>
                                  {isDual && childSec && (
                                    <tr key={childSec.id} className="bg-red-50/30">
                                      <td className="px-3 py-1.5 pl-6 text-muted-foreground italic" colSpan={2}>
                                        ↳ {childType}: {childSec.sectionCode}
                                      </td>
                                      <td className="px-3 py-1.5 text-center text-muted-foreground">{childSec.sectionCode}</td>
                                      <td className="px-3 py-1.5 text-center text-muted-foreground">—</td>
                                    </tr>
                                  )}
                                </>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="info-note info-note-warning">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>These changes are applied immediately and enrolled directly (finalized). The student's grade records will be updated accordingly.</span>
                </div>

                <div className="flex gap-2 justify-end pt-1">
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setEnlistConfirmOpen(false)} disabled={enlistApplying}>
                    Cancel
                  </Button>
                  <Button size="sm" className="h-8 text-xs gap-1.5 bg-primary hover:bg-primary/90" onClick={handleApplyEnlistmentChanges}
                    disabled={enlistApplying || pendingAdds.some(sid => {
                      const sec = state.sections.find(s => s.id === sid);
                      if (!sec || sec.parentSectionId) return false;
                      const course = state.courses.find(c => c.id === sec.courseId);
                      if (course?.type !== 'Lec+Lab' && course?.type !== 'Lec+Rec') return false;
                      return !pendingAdds.some(id => state.sections.find(s => s.id === id)?.parentSectionId === sid);
                    })}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {enlistApplying ? 'Applying…' : 'Apply Changes'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* ── OCS Lab / Rec Group Picker ───────────────────────────────────── */}
        {ocsLabPickerSection && selectedTermId && (() => {
          const course = state.courses.find(c => c.id === ocsLabPickerSection.courseId);
          const children = state.sections.filter(s => s.parentSectionId === ocsLabPickerSection.id && s.termId === selectedTermId);
          const childType = children[0]?.sectionType === 'recitation' ? 'Recitation' : 'Lab';
          const selectedChildId = pendingAdds.find(id => state.sections.find(s => s.id === id)?.parentSectionId === ocsLabPickerSection.id);
          return (
            <Dialog open onOpenChange={v => { if (!v) setOcsLabPickerSection(null); }}>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>{course?.code} — Choose {childType} Group</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  Select a {childType.toLowerCase()} group for <strong>{ocsLabPickerSection.sectionCode}</strong> (Lecture).
                </p>
                <div className="space-y-2 mt-1">
                  {children.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No {childType.toLowerCase()} groups available for this section.</p>
                  ) : children.map(child => {
                    const isFull = child.enrolled >= child.slots;
                    const isSelected = selectedChildId === child.id;
                    const faculty = state.users.find(u => u.id === child.facultyId);
                    const sched = child.schedule;
                    const schedStr = sched?.days?.length ? `${sched.days.join('')} ${sched.startTime}–${sched.endTime}` : 'TBA';
                    return (
                      <button
                        key={child.id}
                        onClick={() => {
                          setPendingAdds(prev => [
                            ...prev.filter(id => state.sections.find(s => s.id === id)?.parentSectionId !== ocsLabPickerSection.id),
                            child.id,
                          ]);
                          setOcsLabPickerSection(null);
                        }}
                        className={`w-full text-left rounded-lg border p-3 transition-colors text-xs ${
                          isSelected
                            ? 'border-primary bg-primary/10 ring-1 ring-primary'
                            : 'border-border hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm">{child.sectionCode}</span>
                          <span className={isFull ? 'text-red-600 font-semibold' : 'text-muted-foreground'}>
                            {child.enrolled}/{child.slots} slots
                          </span>
                        </div>
                        <div className="text-muted-foreground">{schedStr}</div>
                        {faculty && <div className="text-muted-foreground">{faculty.name}</div>}
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-end pt-1">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setOcsLabPickerSection(null)}>Close</Button>
                </div>
              </DialogContent>
            </Dialog>
          );
        })()}

      </div>
    </PortalLayout>
  );
}
