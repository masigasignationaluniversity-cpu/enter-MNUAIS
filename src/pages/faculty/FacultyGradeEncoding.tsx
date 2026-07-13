import { useState, useMemo, useEffect } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { StatusBanner } from '@/components/shared/StatusBanner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Send, CalendarDays, BookOpen, FileSpreadsheet,
  StickyNote, CheckCircle2, ClipboardCheck, Layers, ListChecks, Users,
} from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { buildGradeSheetBlock, printGradeSheets } from '@/lib/gradeSheet';
import type { GradeValue, GradeWorkflowStatus, Section, Grade } from '@/lib/types';

const GRADES_NUMERIC: GradeValue[] = ['1.0', '1.25', '1.5', '1.75', '2.0', '2.25', '2.5', '2.75', '3.0', '4', '5', 'INC', 'DRP'];
const GRADES_THESIS: GradeValue[] = ['1.0', '1.25', '1.5', '1.75', '2.0', '2.25', '2.5', '2.75', '3.0', '4', '5', 'INC', 'DRP', 'S', 'U'];
const GRADES_THESIS1: GradeValue[] = ['S', 'U', 'DRP'];
const REMARKS_REQUIRED_GRADES: GradeValue[] = ['4', '5', 'INC', 'DRP', 'F', 'U'];
const REMARKS_MAX = 52;

function getEffectiveGrades(courseType?: string): GradeValue[] {
  if (courseType === 'Thesis 1' || courseType === 'Seminar') return GRADES_THESIS1;
  if (courseType === 'Thesis 2') return GRADES_NUMERIC;
  if (courseType === 'Thesis') return GRADES_THESIS;
  return GRADES_NUMERIC;
}

const gradeColor = (g: GradeValue | null) => {
  if (!g) return 'text-gray-400';
  if (['1.0', '1.25', '1.5', '1.75', '2.0', '2.25', '2.5', '2.75', '3.0'].includes(g)) return 'text-green-700';
  if (g === '4') return 'text-yellow-600';
  if (g === '5') return 'text-red-600';
  if (g === 'INC') return 'text-orange-600';
  if (g === 'DRP') return 'text-gray-500';
  if (g === 'S') return 'text-green-700';
  if (g === 'U') return 'text-red-600';
  return 'text-gray-700';
};

function effectiveStatus(g: Grade): GradeWorkflowStatus {
  return g.status ?? (g.submitted ? 'posted' : 'draft');
}

function statusBadge(status: GradeWorkflowStatus) {
  switch (status) {
    case 'draft': return <Badge variant="outline" className="text-yellow-700 border-yellow-300 text-[10px]">Pending</Badge>;
    case 'for_approval': return <Badge className="bg-blue-100 text-blue-800 border-0 text-[10px]">Encoded</Badge>;
    case 'approved': return <Badge className="bg-purple-100 text-purple-800 border-0 text-[10px]">Approved</Badge>;
    case 'posted': return <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[10px]">Posted</Badge>;
  }
}

function roleIds(sec: Section, key: 'encoderIds' | 'approverIds' | 'posterIds'): string[] {
  const ids = sec[key];
  return ids && ids.length > 0 ? ids : (sec.facultyId ? [sec.facultyId] : []);
}

type ActionKind = 'submit' | 'approve' | 'return_from_approval' | 'post' | 'return_from_posting';

export default function FacultyGradeEncoding() {
  const {
    state, saveGradeDraft, submitGradesForApproval, returnGradesToEncoding,
    approveGradesForPosting, postGrades, addGradeNote,
  } = useApp();
  const faculty = state.currentUser;

  // Sections where this faculty holds ANY grading role (encoder/approver/poster).
  // Lecture sections with child lab/rec sections are excluded — grading happens at the child level.
  const mySections = state.sections.filter(s => {
    if (!faculty) return false;
    if (s.sectionCode === '__MANUAL__') return false;
    const hasChildren = state.sections.some(cs => cs.parentSectionId === s.id && cs.termId === s.termId);
    if (hasChildren) return false;
    return roleIds(s, 'encoderIds').includes(faculty.id)
      || roleIds(s, 'approverIds').includes(faculty.id)
      || roleIds(s, 'posterIds').includes(faculty.id);
  });

  const myTermIds = [...new Set(mySections.map(s => s.termId))];
  const myTerms = state.terms.filter(t => myTermIds.includes(t.id))
    .sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0));
  const defaultTermId = myTerms.find(t => t.isActive)?.id ?? myTerms[0]?.id ?? '';

  const [selectedTermId, setSelectedTermId] = useState<string>(defaultTermId);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'encoding' | 'approval' | 'posting'>('encoding');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [remarksDraft, setRemarksDraft] = useState<Record<string, string>>({});
  const [actionDialog, setActionDialog] = useState<{ type: ActionKind; gradeIds: string[] } | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});

  // Reset selection state when switching section or tab
  useEffect(() => { setSelectedIds(new Set()); }, [selectedSectionId, activeTab]);

  const termSections = mySections.filter(s => s.termId === selectedTermId);
  const section = state.sections.find(s => s.id === selectedSectionId) ?? null;
  const course = section ? state.courses.find(c => c.id === section.courseId) : null;
  const term = section ? state.terms.find(t => t.id === section.termId) : state.terms.find(t => t.id === selectedTermId);

  const getStudent = (id: string) => state.users.find(u => u.id === id);

  const postingType = section?.postingType ?? 'batch';
  const myEncoder = section && faculty ? roleIds(section, 'encoderIds').includes(faculty.id) : false;
  const myApprover = section && faculty ? roleIds(section, 'approverIds').includes(faculty.id) : false;
  const myPoster = section && faculty ? roleIds(section, 'posterIds').includes(faculty.id) : false;

  // Grade encoding window check (unchanged from before)
  const now = new Date();
  const encodingFromDate = term?.encodingFrom ? new Date(term.encodingFrom) : null;
  const encodingUntilDate = term?.encodingUntil ? new Date(term.encodingUntil) : null;
  const beforeEncodingWindow = !!encodingFromDate && now < encodingFromDate;
  const afterEncodingWindow = !!encodingUntilDate && now > encodingUntilDate;
  const isInEncodingWindow = !beforeEncodingWindow && !afterEncodingWindow;
  const gradeOpen = (term?.controls.gradeSubmissionOpen ?? false) && isInEncodingWindow;
  const gradeWindowStatus = (() => {
    if (!term?.encodingFrom && !term?.encodingUntil) return 'not-set';
    if (beforeEncodingWindow) return 'upcoming';
    if (afterEncodingWindow) return 'ended';
    return 'open';
  })();

  const rosterRows = useMemo(() => {
    if (!section) return [];
    return state.grades
      .filter(g => g.sectionId === section.id)
      .map(g => ({ grade: g, student: getStudent(g.studentId) }))
      .filter((r): r is { grade: Grade; student: NonNullable<ReturnType<typeof getStudent>> } => !!r.student)
      .sort((a, b) => a.student.name.localeCompare(b.student.name));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.grades, state.users, section?.id]);

  const encodedCount = rosterRows.filter(r => r.grade.grade !== null).length;

  const tabActionableRows = useMemo(() => {
    if (activeTab === 'encoding') return rosterRows.filter(r => effectiveStatus(r.grade) === 'draft');
    if (activeTab === 'approval') return rosterRows.filter(r => effectiveStatus(r.grade) === 'for_approval');
    return rosterRows.filter(r => effectiveStatus(r.grade) === 'approved');
  }, [rosterRows, activeTab]);

  const canCheckEncodingRow = (g: Grade) => {
    if (effectiveStatus(g) !== 'draft') return false;
    if (!g.grade) return false;
    if (REMARKS_REQUIRED_GRADES.includes(g.grade)) {
      const val = remarksDraft[g.id] ?? g.remarks ?? '';
      if (!val.trim()) return false;
    }
    return true;
  };

  const canCheck = (row: { grade: Grade }) => {
    if (activeTab === 'encoding') return canCheckEncodingRow(row.grade);
    return true; // approval/posting rows are always checkable once they're in the actionable list
  };

  const checkableActionableIds = tabActionableRows.filter(canCheck).map(r => r.grade.id);
  const allChecked = checkableActionableIds.length > 0 && checkableActionableIds.every(id => selectedIds.has(id));

  const toggleAll = () => {
    setSelectedIds(prev => {
      if (allChecked) return new Set();
      return new Set(checkableActionableIds);
    });
  };

  const toggleRow = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const handleGradeChange = (gradeId: string, newGrade: GradeValue) => {
    const row = rosterRows.find(r => r.grade.id === gradeId);
    const remarks = remarksDraft[gradeId] ?? row?.grade.remarks ?? '';
    saveGradeDraft(gradeId, newGrade, remarks || undefined);
    // De-select if the new grade now requires remarks that aren't filled in
    if (REMARKS_REQUIRED_GRADES.includes(newGrade) && !remarks.trim()) {
      setSelectedIds(prev => { const n = new Set(prev); n.delete(gradeId); return n; });
    }
  };

  const handleRemarksChange = (gradeId: string, value: string) => {
    if (value.length > REMARKS_MAX) return;
    setRemarksDraft(prev => ({ ...prev, [gradeId]: value }));
  };

  const handleRemarksBlur = (gradeId: string) => {
    const row = rosterRows.find(r => r.grade.id === gradeId);
    if (!row) return;
    const value = remarksDraft[gradeId];
    if (value === undefined) return;
    saveGradeDraft(gradeId, row.grade.grade, value || undefined);
    if (!(REMARKS_REQUIRED_GRADES.includes(row.grade.grade as GradeValue) && !value.trim())) {
      // remarks now satisfied — nothing to do, checkbox becomes selectable naturally
    } else {
      setSelectedIds(prev => { const n = new Set(prev); n.delete(gradeId); return n; });
    }
  };

  // ── Action dropdown → confirm dialog ────────────────────────────────────
  const handleActionSelect = (action: string) => {
    if (selectedIds.size === 0) {
      toast.error('No students selected', { description: 'Select at least one student first.' });
      return;
    }
    const ids = [...selectedIds];
    if (action === 'post' && postingType === 'batch') {
      const allApprovedIds = tabActionableRows.map(r => r.grade.id);
      const sameSet = ids.length === allApprovedIds.length && allApprovedIds.every(id => ids.includes(id));
      if (!sameSet) {
        toast.error('Batch Post requires all grades at once', { description: 'This class uses Batch Post — you must select and post all approved student grades together.' });
        return;
      }
    }
    setActionDialog({ type: action as ActionKind, gradeIds: ids });
    setConfirmText('');
  };

  const actionLabel: Record<ActionKind, string> = {
    submit: 'Submit for Approval',
    approve: 'Approve for Posting',
    return_from_approval: 'Return to Encoding',
    post: 'Post Grades',
    return_from_posting: 'Return to Encoding',
  };

  const handleConfirmAction = () => {
    if (!actionDialog || confirmText !== 'CONFIRM') return;
    const { type, gradeIds } = actionDialog;
    if (type === 'submit') { submitGradesForApproval(gradeIds); toast.success('Grades submitted for approval.'); }
    else if (type === 'approve') { approveGradesForPosting(gradeIds); toast.success('Grades approved for posting.'); }
    else if (type === 'return_from_approval') { returnGradesToEncoding(gradeIds); toast.success('Grades returned to encoding.'); }
    else if (type === 'post') { postGrades(gradeIds); toast.success('Grades posted — now visible to students.'); }
    else if (type === 'return_from_posting') { returnGradesToEncoding(gradeIds); toast.success('Grades returned to encoding.'); }
    setActionDialog(null);
    setConfirmText('');
    setSelectedIds(new Set());
  };

  // ── Notes ────────────────────────────────────────────────────────────────
  const handleAddNote = (gradeId: string) => {
    if (!faculty) return;
    const text = (noteDraft[gradeId] ?? '').trim();
    if (!text) return;
    addGradeNote(gradeId, faculty.id, faculty.name, text);
    setNoteDraft(prev => ({ ...prev, [gradeId]: '' }));
    toast.success('Note added.');
  };

  // ── Grade Sheet PDF (simple, clean format matching official Grade Sheet) ──
  const generateGradeSheet = (sec: Section) => {
    const c = state.courses.find(x => x.id === sec.courseId);
    const t = state.terms.find(x => x.id === sec.termId);
    const inst = state.portalSettings?.institutionName || state.portalSettings?.portalName || 'University';
    const block = buildGradeSheetBlock(sec, c, t, {
      users: state.users, colleges: state.colleges, degreePrograms: state.degreePrograms,
      graduationRequirements: state.graduationRequirements, grades: state.grades, sections: state.sections,
      courses: state.courses, enrollments: state.enrollments, terms: state.terms,
      finalizedEnlistments: state.finalizedEnlistments, specializationRequests: state.specializationRequests ?? [],
      geElectiveRequests: state.geElectiveRequests ?? [], institutionName: inst,
    });
    const opened = printGradeSheets(`Grade Sheet — ${c?.code} ${sec.sectionCode}`, block);
    if (!opened) toast.error('Popup blocked — allow popups and try again.');
  };

  // ── Tab content renderer ────────────────────────────────────────────────
  const renderTabTable = (tab: 'encoding' | 'approval' | 'posting') => {
    const isEncoding = tab === 'encoding';
    const roleAllowed = tab === 'encoding' ? myEncoder : tab === 'approval' ? myApprover : myPoster;
    return (
      <div className="space-y-3">
        {!roleAllowed && (
          <StatusBanner type="info" title="View Only" description="You are not assigned this role for this class — you can view progress here, but cannot take action." />
        )}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs text-muted-foreground">
            {tab === 'encoding' && `${encodedCount} / ${rosterRows.length} encoded`}
            {tab === 'approval' && `${rosterRows.filter(r => effectiveStatus(r.grade) === 'for_approval').length} awaiting approval`}
            {tab === 'posting' && `${rosterRows.filter(r => effectiveStatus(r.grade) === 'approved').length} approved, ready to post`}
          </p>
          {roleAllowed && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
              <Select value="" onValueChange={handleActionSelect}>
                <SelectTrigger className="w-48 h-8 text-xs">
                  <SelectValue placeholder="Choose action..." />
                </SelectTrigger>
                <SelectContent>
                  {tab === 'encoding' && <SelectItem value="submit">Submit for Approval</SelectItem>}
                  {tab === 'approval' && <SelectItem value="approve">Approve for Posting</SelectItem>}
                  {tab === 'approval' && <SelectItem value="return_from_approval">Return to Encoding</SelectItem>}
                  {tab === 'posting' && <SelectItem value="post">Post</SelectItem>}
                  {tab === 'posting' && <SelectItem value="return_from_posting">Return to Encoding</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-10">
                  {roleAllowed && checkableActionableIds.length > 0 && (
                    <Checkbox checked={allChecked} onCheckedChange={toggleAll} />
                  )}
                </TableHead>
                <TableHead>#</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Student No.</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rosterRows.map((row, idx) => {
                const g = row.grade;
                const status = effectiveStatus(g);
                const isRowActionable = tabActionableRows.some(r => r.grade.id === g.id);
                const isEditable = isEncoding && roleAllowed && status === 'draft';
                const checkable = roleAllowed && isRowActionable && canCheck(row);
                const remarksVal = remarksDraft[g.id] ?? g.remarks ?? '';
                const noteCount = g.notes?.length ?? 0;
                return (
                  <TableRow key={g.id} className={g.grade === 'DRP' ? 'opacity-60 bg-gray-50' : ''}>
                    <TableCell>
                      {checkable && (
                        <Checkbox checked={selectedIds.has(g.id)} onCheckedChange={() => toggleRow(g.id)} />
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{idx + 1}</TableCell>
                    <TableCell className="font-medium text-sm">{row.student.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{row.student.studentNumber}</TableCell>
                    <TableCell>
                      {isEditable ? (
                        <SearchableSelect
                          value={g.grade ?? ''}
                          onValueChange={val => handleGradeChange(g.id, val as GradeValue)}
                          disabled={!gradeOpen}
                          triggerClassName="w-28 h-8"
                          placeholder="Grade"
                          options={getEffectiveGrades(course?.type).map(gv => ({ value: gv, label: gv }))}
                        />
                      ) : (
                        <span className={`font-bold text-sm ${gradeColor(g.grade)}`}>{status === 'draft' ? (g.grade ?? '—') : (g.grade ?? '—')}</span>
                      )}
                    </TableCell>
                    <TableCell className="min-w-[160px]">
                      {isEditable ? (
                        <div className="space-y-0.5">
                          <Input
                            value={remarksVal}
                            onChange={e => handleRemarksChange(g.id, e.target.value)}
                            onBlur={() => handleRemarksBlur(g.id)}
                            placeholder={g.grade && REMARKS_REQUIRED_GRADES.includes(g.grade) ? 'Required remarks...' : 'Optional remarks...'}
                            maxLength={REMARKS_MAX}
                            className="h-8 text-xs"
                          />
                          <p className="text-[10px] text-muted-foreground text-right">{remarksVal.length}/{REMARKS_MAX}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">{g.remarks || '—'}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">{statusBadge(status)}</TableCell>
                    <TableCell className="text-center">
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="relative inline-flex items-center justify-center w-7 h-7 rounded-md hover:bg-muted transition-colors">
                            <StickyNote className="w-3.5 h-3.5 text-muted-foreground" />
                            {noteCount > 0 && (
                              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{noteCount}</span>
                            )}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 space-y-2">
                          <p className="text-xs font-semibold">Notes — {row.student.name}</p>
                          <div className="max-h-40 overflow-y-auto space-y-1.5">
                            {(g.notes ?? []).length === 0 && <p className="text-xs text-muted-foreground italic">No notes yet.</p>}
                            {(g.notes ?? []).map(n => (
                              <div key={n.id} className="text-xs bg-muted/50 rounded p-1.5">
                                <p className="font-medium">{n.authorName}</p>
                                <p className="text-muted-foreground">{n.text}</p>
                                <p className="text-[10px] text-muted-foreground/70">{new Date(n.createdAt).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                              </div>
                            ))}
                          </div>
                          <Textarea
                            rows={2}
                            className="text-xs"
                            placeholder="Type your note..."
                            value={noteDraft[g.id] ?? ''}
                            onChange={e => setNoteDraft(prev => ({ ...prev, [g.id]: e.target.value }))}
                          />
                          <Button size="sm" className="w-full h-7 text-xs" onClick={() => handleAddNote(g.id)}>Add</Button>
                        </PopoverContent>
                      </Popover>
                    </TableCell>
                  </TableRow>
                );
              })}
              {rosterRows.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No enrolled students in this section.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  if (!faculty) return null;

  return (
    <PortalLayout role="faculty" userName={faculty.name}>
      <div className="space-y-5">
        <div className="flex items-center flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Student Grades</h1>
            <p className="text-muted-foreground mt-0.5">Encode, review, approve, and post student grades per class.</p>
          </div>
        </div>

        {myTerms.length === 0 ? (
          <div className="portal-panel">
            <div className="portal-panel-header">Student Grades</div>
            <div className="py-12 text-center text-muted-foreground bg-background">No classes assigned yet.</div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="portal-panel">
              <div className="portal-panel-header">Select Term</div>
              <div className="p-4 bg-background">
                <div className="space-y-1.5 max-w-xs">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" /> Semester / Term
                  </label>
                  <SearchableSelect
                    value={selectedTermId}
                    onValueChange={v => { setSelectedTermId(v); setSelectedSectionId(''); }}
                    triggerClassName="w-full"
                    placeholder="Select term..."
                    options={myTerms.map(t => ({ value: t.id, label: `${t.name}${t.isActive ? ' (Active)' : ''}` }))}
                  />
                </div>
              </div>
            </div>

            {/* ── Overview Table ─────────────────────────────────────── */}
            <div className="portal-panel">
              <div className="portal-panel-header">
                <BookOpen className="w-4 h-4 text-white/80" /> My Classes
              </div>
              <div className="overflow-x-auto bg-background">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Course</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead className="text-center">Enrolled</TableHead>
                      <TableHead className="text-center">Posting Type</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {termSections.map(sec => {
                      const c = state.courses.find(x => x.id === sec.courseId);
                      // Exclude grade rows whose student was deleted — keeps "Enrolled"/"Unfinished"
                      // counts and Grade Sheet availability accurate.
                      const secGrades = state.grades.filter(g => g.sectionId === sec.id && state.users.some(u => u.id === g.studentId));
                      const unfinished = secGrades.filter(g => effectiveStatus(g) !== 'posted').length;
                      const completed = unfinished === 0 && secGrades.length > 0;
                      const secPostingType = sec.postingType ?? 'batch';
                      const canGenerateSheet = secPostingType === 'partial' || completed;
                      const schedStr = sec.schedule?.days?.length ? `${sec.schedule.days.join('')} ${sec.schedule.startTime}–${sec.schedule.endTime}` : 'TBA';
                      const isActive = sec.id === selectedSectionId;
                      return (
                        <TableRow
                          key={sec.id}
                          className={`cursor-pointer ${isActive ? 'bg-primary/5' : 'hover:bg-muted/20'}`}
                          onClick={() => { setSelectedSectionId(sec.id); setActiveTab('encoding'); }}
                        >
                          <TableCell className="font-mono font-medium text-sm">{c?.code}</TableCell>
                          <TableCell className="text-sm">{sec.sectionCode}</TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{schedStr}</TableCell>
                          <TableCell className="text-center text-sm">{secGrades.length}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-[10px] gap-1">
                              {secPostingType === 'batch' ? <Layers className="w-2.5 h-2.5" /> : <ListChecks className="w-2.5 h-2.5" />}
                              {secPostingType === 'batch' ? 'Batch' : 'Partial'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {completed
                              ? <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[10px]">Completed</Badge>
                              : <Badge className="bg-amber-100 text-amber-800 border-0 text-[10px]">Unfinished ({unfinished})</Badge>}
                          </TableCell>
                          <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                            <Button
                              size="sm" variant="outline" className="h-7 text-xs gap-1"
                              disabled={!canGenerateSheet}
                              onClick={() => generateGradeSheet(sec)}
                            >
                              <FileSpreadsheet className="w-3 h-3" /> Grade Sheet
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {termSections.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No classes assigned for this term.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* ── Grade Encoding & Submission Panel ──────────────────── */}
            {section && (
              <div className="space-y-4">
                <div className="rounded-md overflow-hidden border border-primary/30">
                  <div className="portal-panel-header flex-wrap gap-2">
                    <span>Grade Encoding &amp; Submission</span>
                  </div>
                  <div className="p-4 bg-primary/5">
                    <div className="flex flex-wrap gap-6 items-center">
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
                        <p className="text-xs text-muted-foreground">My Roles</p>
                        <div className="flex gap-1 mt-0.5">
                          {myEncoder && <Badge className="bg-blue-100 text-blue-800 border-0 text-[10px]">Encoder</Badge>}
                          {myApprover && <Badge className="bg-purple-100 text-purple-800 border-0 text-[10px]">Approver</Badge>}
                          {myPoster && <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[10px]">Poster</Badge>}
                          {!myEncoder && !myApprover && !myPoster && <span className="text-xs text-muted-foreground">None</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {!gradeOpen && gradeWindowStatus === 'upcoming' && (
                  <StatusBanner type="deadline" title="Grade Encoding Window Not Yet Open" description={<>Grade encoding opens on <strong>{encodingFromDate?.toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>.</>} />
                )}
                {!gradeOpen && gradeWindowStatus === 'not-set' && (
                  <StatusBanner type="warning" title="Grade Encoding Not Yet Scheduled" description="Grade submission window has not been scheduled. Please wait for the announcement." />
                )}
                {!gradeOpen && (gradeWindowStatus === 'ended' || gradeWindowStatus === 'open') && (
                  <StatusBanner type="error" title={gradeWindowStatus === 'ended' ? 'Grade Encoding Window Closed' : 'Grade Submission Closed'} description={gradeWindowStatus === 'ended' ? `Closed: ${encodingUntilDate?.toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}` : 'Grade submission is currently closed.'} />
                )}

                <div className="portal-panel">
                  <div className="p-4 bg-background">
                    <Tabs value={activeTab} onValueChange={v => setActiveTab(v as typeof activeTab)}>
                      <TabsList>
                        <TabsTrigger value="encoding" className="gap-1.5"><ClipboardCheck className="w-3.5 h-3.5" /> Encoding</TabsTrigger>
                        <TabsTrigger value="approval" className="gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> For Approval</TabsTrigger>
                        <TabsTrigger value="posting" className="gap-1.5"><Send className="w-3.5 h-3.5" /> For Posting</TabsTrigger>
                      </TabsList>
                      <TabsContent value="encoding">{renderTabTable('encoding')}</TabsContent>
                      <TabsContent value="approval">{renderTabTable('approval')}</TabsContent>
                      <TabsContent value="posting">{renderTabTable('posting')}</TabsContent>
                    </Tabs>
                  </div>
                </div>
              </div>
            )}

            {!section && (
              <div className="portal-panel">
                <div className="py-12 text-center text-muted-foreground bg-background">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Select a class from the list above to begin.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Confirm Action Dialog ────────────────────────────────────── */}
      <Dialog open={!!actionDialog} onOpenChange={v => { if (!v) { setActionDialog(null); setConfirmText(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{actionDialog ? actionLabel[actionDialog.type] : ''}</DialogTitle>
          </DialogHeader>
          {actionDialog && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This will apply to <strong>{actionDialog.gradeIds.length}</strong> student{actionDialog.gradeIds.length !== 1 ? 's' : ''} in <strong>{course?.code} — Sec {section?.sectionCode}</strong>.
              </p>
              <div className="max-h-40 overflow-y-auto rounded-lg border divide-y">
                {actionDialog.gradeIds.map(id => {
                  const row = rosterRows.find(r => r.grade.id === id);
                  if (!row) return null;
                  return (
                    <div key={id} className="flex items-center justify-between px-3 py-1.5 text-xs">
                      <span>{row.student.name}</span>
                      <span className={`font-bold ${gradeColor(row.grade.grade)}`}>{row.grade.grade ?? '—'}</span>
                    </div>
                  );
                })}
              </div>
              <div className="info-note info-note-error flex-col text-center space-y-1">
                <p className="font-medium">Please review the details above carefully before submitting.</p>
                <p>If yes, please type <strong>"CONFIRM"</strong> to submit:</p>
                {actionDialog.type === 'post' && <p className="font-bold">ONCE POSTED, GRADES CANNOT BE RETURNED TO ENCODING.</p>}
                <Input className="mt-1 text-center" value={confirmText} onChange={e => setConfirmText(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setActionDialog(null); setConfirmText(''); }}>Cancel</Button>
                <Button className="bg-primary text-primary-foreground" disabled={confirmText !== 'CONFIRM'} onClick={handleConfirmAction}>
                  Submit
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
