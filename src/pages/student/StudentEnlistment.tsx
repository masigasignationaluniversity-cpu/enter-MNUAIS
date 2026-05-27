import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertTriangle, CalendarDays, CheckCircle, XCircle, Lock, Unlock, BookOpen, AlertCircle,
  Search, Trash2, CheckSquare, RefreshCw, X, Info, Download, MessageSquare,
  ChevronUp, ChevronDown, Filter, Clock, ShoppingCart,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import type { Section, Day, Course } from '@/lib/types';
import { getScholasticStanding } from '@/lib/academic';
import { useToast } from '@/hooks/use-toast';

const DAYS: Day[] = ['M', 'T', 'W', 'Th', 'F', 'S'];
const DAY_LABELS: Record<Day, string> = { M: 'Monday', T: 'Tuesday', W: 'Wednesday', Th: 'Thursday', F: 'Friday', S: 'Saturday' };
const COLORS = [
  'bg-blue-200 border-blue-400 text-blue-900',
  'bg-green-200 border-green-400 text-green-900',
  'bg-purple-200 border-purple-400 text-purple-900',
  'bg-yellow-200 border-yellow-400 text-yellow-900',
  'bg-pink-200 border-pink-400 text-pink-900',
  'bg-indigo-200 border-indigo-400 text-indigo-900',
  'bg-orange-200 border-orange-400 text-orange-900',
  'bg-teal-200 border-teal-400 text-teal-900',
];

function toMinutes(t: string) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }
function schedulesOverlap(a: { days: Day[]; startTime: string; endTime: string }, b: { days: Day[]; startTime: string; endTime: string }) {
  return a.days.some(d => b.days.includes(d)) && toMinutes(a.startTime) < toMinutes(b.endTime) && toMinutes(a.endTime) > toMinutes(b.startTime);
}

// ── ClassCard sub-component ──────────────────────────────────────────────────
type CardSchedule = { days: Day[]; startTime: string; endTime: string; room?: string };

function ClassCard({ course, sectionCode, isLab, schedule, facultyName, enrolled, slots, consentNotes, allCourses, isEnlistedFinalized }: {
  course: Course;
  sectionCode: string;
  isLab?: boolean;
  schedule: CardSchedule;
  facultyName?: string;
  enrolled: number;
  slots: number;
  consentNotes: string[];
  allCourses?: Course[];
  isEnlistedFinalized?: boolean;
}) {
  const [open, setOpen] = React.useState(false);

  const resolveCourseIds = (ids?: string[]) => {
    if (!ids?.length) return 'None';
    if (!allCourses?.length) return ids.join(', ');
    return ids.map(id => {
      const c = allCourses.find(x => x.id === id);
      return c ? `${c.code} (${c.title})` : id;
    }).join(', ');
  };

  const prereqs = resolveCourseIds(course.prerequisites);
  const coreqs = resolveCourseIds(course.corequisites);

  const headerBase = isEnlistedFinalized
    ? 'w-full px-3 py-2 flex items-start justify-between gap-2 text-left transition-colors rounded-t-lg bg-green-700 hover:bg-green-600'
    : 'w-full px-3 py-2 flex items-start justify-between gap-2 text-left hover:bg-muted/20 transition-colors rounded-t-lg';

  return (
    <div className="border rounded-lg flex-1 bg-background">
      <button
        type="button"
        className={headerBase}
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-start gap-2">
          <BookOpen className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isEnlistedFinalized ? 'text-green-200' : 'text-blue-500'}`} />
          <div>
            <p className={`font-bold text-sm leading-snug ${isEnlistedFinalized ? 'text-white' : ''}`}>
              {course.code} ({course.title})
            </p>
            <span className={`text-xs ${isEnlistedFinalized ? 'text-green-200' : 'text-muted-foreground'}`}>{course.units}{course.labUnits ? `+${course.labUnits}` : ''} units</span>
          </div>
        </div>
        {open
          ? <ChevronUp className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isEnlistedFinalized ? 'text-green-200' : 'text-muted-foreground'}`} />
          : <ChevronDown className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isEnlistedFinalized ? 'text-green-200' : 'text-muted-foreground'}`} />}
      </button>
      {open && (
        <>
          <hr className="border-border" />
          <div className="px-3 py-2 space-y-1.5 text-xs">
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              <p><span className="text-muted-foreground">Time:</span> ({schedule.startTime} - {schedule.endTime})</p>
              <p><span className="text-muted-foreground">Faculty:</span> {facultyName ?? 'TBA'}</p>
              <p><span className="text-muted-foreground">Days:</span> {schedule.days.length ? schedule.days.join('') : 'TBA'}</p>
              <p><span className="text-muted-foreground">Location:</span> {schedule.room ?? 'TBA'}</p>
            </div>
            {!isLab && (
              <div className="space-y-0.5">
                <p><span className="text-muted-foreground">Co-Req:</span> {coreqs}</p>
                <p><span className="text-muted-foreground">Pre-Req:</span> {prereqs}</p>
              </div>
            )}
            {consentNotes.map((note, i) => <p key={i} className="text-red-500">{note}</p>)}
            <div className="flex justify-end pt-1">
              <Badge className="bg-green-600 text-white text-xs border-0">{enrolled}/{slots}</Badge>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function StudentEnlistment() {
  const navigate = useNavigate();
  const { state, enlistSection, dropSection, checkPrerequisites, checkCorequisites, getCurrentUnits,
    finalizeEnlistment, submitReconsiderationRequest,
    submitChangeDropRequest, canStudentViewGrades } = useApp();
  const student = state.currentUser;
  const activeTerm = state.terms.find(t => t.isActive);
  const { toast } = useToast();

  // State
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [finalizeConfirmText, setFinalizeConfirmText] = useState('');
  const [cart, setCart] = useState<string[]>([]);
  const cartLoadedRef = useRef(false);
  const [search, setSearch] = useState('');       // Course code / title
  const [sectionSearch, setSectionSearch] = useState('');  // Section code
  const [statusFilter, setStatusFilter] = useState('');    // '' | 'all' | 'open'
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [pageSize, setPageSize] = useState(5);
  const [filterApplied, setFilterApplied] = useState(false);
  const [tempSearch, setTempSearch] = useState('');
  const [tempSectionSearch, setTempSectionSearch] = useState('');
  const [tempStatusFilter, setTempStatusFilter] = useState('');
  const [enlistWarning, setEnlistWarning] = useState<{ courseCode: string; sectionCode: string; issues: string[] } | null>(null);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [enlisting, setEnlisting] = useState<string | null>(null);
  const [showReconDialog, setShowReconDialog] = useState(false);
  const [reconReason, setReconReason] = useState('');
  const [submittingRecon, setSubmittingRecon] = useState(false);
  const [showLateEnlistDialog, setShowLateEnlistDialog] = useState(false);
  const [lateEnlistReason, setLateEnlistReason] = useState('');
  const [submittingLateEnlist, setSubmittingLateEnlist] = useState(false);
  const [showChangeDropDialog, setShowChangeDropDialog] = useState(false);
  const [changeDropReason, setChangeDropReason] = useState('');
  const [submittingChangeDrop, setSubmittingChangeDrop] = useState(false);
  const [selectedPreviewId, setSelectedPreviewId] = useState<string | null>(null);
  const [bulkFailures, setBulkFailures] = useState<{ code: string; section: string; reasons: string[] }[] | null>(null);
  const timetableRef = useRef<HTMLDivElement | null>(null);

  const showWarning = (courseCode: string, sectionCode: string, issues: string[]) => {
    setEnlistWarning({ courseCode, sectionCode, issues });
    setShowWarningDialog(true);
  };

  // Cart persistence
  useEffect(() => {
    if (!student?.id || !activeTerm?.id) return;
    const key = `enlistment-cart-${student.id}-${activeTerm.id}`;
    const stored = localStorage.getItem(key);
    if (stored) { try { setCart(JSON.parse(stored)); } catch { /* ignore */ } }
    cartLoadedRef.current = true;
  }, [student?.id, activeTerm?.id]);

  useEffect(() => {
    if (!student?.id || !activeTerm?.id) return;
    if (!cartLoadedRef.current) return; // prevent overwriting stored cart before load
    localStorage.setItem(`enlistment-cart-${student.id}-${activeTerm.id}`, JSON.stringify(cart));
  }, [cart, student?.id, activeTerm?.id]);

  // NOTE: Cart items are NOT auto-removed when enrolled — students can use cart as a planning list.
  //       However, stale items from other terms are pruned when the active term changes.
  useEffect(() => {
    if (!activeTerm) return;
    setCart(prev => prev.filter(id => {
      const sec = state.sections.find(s => s.id === id);
      return sec && sec.termId === activeTerm.id;
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTerm?.id]);
  //       Cart items that are already enlisted will be skipped in bulk enlist and shown as "Enrolled".

  // NOTE: dropUnfinalizedCourses is NOT called from the student portal — admin handles deadline enforcement
  // to prevent enrolled courses from being auto-dropped when a test term's deadline has passed.

  if (!student) return null;
  if (!activeTerm) {
    return (
      <PortalLayout role="student" userName={student.name}>
        <div className="text-center text-muted-foreground py-12">No active term found.</div>
      </PortalLayout>
    );
  }

  // ── Window status ───────────────────────────────────────────────────
  type WinStatus = 'open' | 'not-set' | 'upcoming' | 'ended';
  const getWindowStatus = (from?: string, until?: string): WinStatus => {
    if (!from && !until) return 'not-set';
    const now = new Date();
    if (from && now < new Date(from)) return 'upcoming';
    if (until && now > new Date(until)) return 'ended';
    return 'open';
  };
  const enlistmentWindowStatus = getWindowStatus(activeTerm.enlistmentFrom, activeTerm.enlistmentUntil);
  const enlistmentOpen = activeTerm.controls.enlistmentOpen;
  const prerogativeOpen = activeTerm.controls.prerogativeOpen;

  // ── Scholastic standing — compute from grades (same logic as StudentProfile) ──
  const viewableScholasticTerms = state.terms
    .map(t => ({
      term: t,
      result: getScholasticStanding(student.id, t.id, state.grades, state.sections, state.courses),
      canView: canStudentViewGrades(student.id, t.id),
    }))
    .filter(x => x.result !== null && x.canView);
  const latestScholastic = viewableScholasticTerms[viewableScholasticTerms.length - 1]?.result ?? null;
  const scholasticStatus = latestScholastic?.standing ?? 'Good Standing';

  // PD lock: locked if student EVER had a PD standing (any term),
  // unless they have an approved reconsideration for THIS specific term.
  const hasPDEver = student.status === 'permanently_disqualified' ||
    state.terms.some(t =>
      getScholasticStanding(student.id, t.id, state.grades, state.sections, state.courses)?.standing === 'Permanent Disqualification'
    );
  const hasApprovedReconThisTerm = (state.reconsiderationRequests ?? []).some(
    r => r.studentId === student.id && r.termId === activeTerm.id && r.status === 'approved'
  );
  const isDisqualified = hasPDEver && !hasApprovedReconThisTerm;
  // Late enlistment: OCS can approve a student to enlist even after the window has closed
  const hasApprovedLateEnlistThisTerm = (state.reconsiderationRequests ?? []).some(
    r => r.studentId === student.id && r.termId === activeTerm.id && r.requestType === 'late_enlistment' && r.status === 'approved'
  );
  // Change/Drop after finalization: OCS approves → student can re-enlist/drop
  const hasApprovedChangeDropRequest = (state.changeDropRequests ?? []).some(
    r => r.studentId === student.id && r.termId === activeTerm.id && r.status === 'approved'
  );
  // Use local date (not UTC) so it matches what the admin sets via the date picker
  const now = new Date();
  // Change/Drop window: is it currently within the configured window?
  const isChangeDropWindowOpen = (() => {
    const from = activeTerm.changeDropFrom;
    const until = activeTerm.changeDropUntil;
    if (!from && !until) return false;
    const nowTs = now.getTime();
    if (from && nowTs < new Date(from).getTime()) return false;
    if (until && nowTs > new Date(until).getTime()) return false;
    return true;
  })();
  // Late enrollment window: is it currently within the configured window?
  const isLateEnrollmentWindowOpen = (() => {
    const from = activeTerm.lateEnrollmentFrom;
    const until = activeTerm.lateEnrollmentUntil;
    if (!from && !until) return true; // no window set = always available after enlistment ends
    const nowTs = now.getTime();
    if (from && nowTs < new Date(from).getTime()) return false;
    if (until && nowTs > new Date(until).getTime()) return false;
    return true;
  })();
  // Appeal bypass: when either late enrollment or change/drop is approved, bypass ALL finalization/window guards
  // Cleared once the student re-finalizes (isFinalized becomes true again)
  const isFinalized = !!state.finalizedEnlistments.find(f => f.studentId === student.id && f.termId === activeTerm.id);
  const appealBypass = !isFinalized && (hasApprovedLateEnlistThisTerm || hasApprovedChangeDropRequest);
  // OCS-approved re-enlistment request: allows enlisting + finalizing even outside schedule/window
  const effectiveEnlistmentOpen = enlistmentOpen || appealBypass;
  const finalizeWindowStatus = getWindowStatus(activeTerm.finalizeWindowStart, activeTerm.finalizeWindowEnd);
  const finalizeButtonVisible = finalizeWindowStatus === 'open' || appealBypass;
  const dropDeadline = activeTerm.dropDeadline;
  const canDrop = hasApprovedChangeDropRequest || (dropDeadline ? new Date().setHours(23,59,59,999) <= new Date(dropDeadline).getTime() : effectiveEnlistmentOpen);

  const myEnrollments = state.enrollments.filter(e => e.studentId === student.id && e.termId === activeTerm.id && e.status !== 'dropped');
  // Deduplicate by section_id first, then by course_id — prevents double-row from same or same-named courses
  const seenSectionIds = new Set<string>();
  const seenCourseIds = new Set<string>();
  const myEnrolledSections = myEnrollments
    .map(e => state.sections.find(s => s.id === e.sectionId))
    .filter(Boolean)
    .filter(s => {
      if (seenSectionIds.has(s!.id)) return false;
      seenSectionIds.add(s!.id);
      if (seenCourseIds.has(s!.courseId)) return false; // same course enrolled twice — show only first
      seenCourseIds.add(s!.courseId);
      return true;
    }) as Section[];
  const availableSections = state.sections.filter(s => s.termId === activeTerm.id);
  const currentUnits = getCurrentUnits(student.id, activeTerm.id);
  const maxUnits = activeTerm.maxUnits ?? 21;

  const enrollSched = activeTerm.enrollmentSchedule;
  // Use local date (not UTC) so it matches what the admin sets via the date picker
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const enrollSchedToday = enrollSched?.slots?.find(s => s.date === today);
  const studentNum = student.studentNumber ?? '';
  // Match if studentNumber starts with any of the configured prefixes (supports formats like "2021-1234" or "202112345")
  const matchesEnrollPrefix = (prefixes: string[]) =>
    prefixes.length === 0 || // empty = open to all students (Day 4)
    prefixes.some(p => {
      const pt = p.trim();
      return pt && (studentNum.startsWith(pt) || studentNum.replace(/\D/g, '').startsWith(pt.replace(/\D/g, '')));
    });
  const isMyEnrollDay = !!enrollSchedToday && matchesEnrollPrefix(enrollSchedToday.idPrefixes);

  // Search / filter — results only shown after Apply is clicked (filterApplied = true)
  const searchedSections = filterApplied
    ? availableSections.filter(s => {
        const course = state.courses.find(c => c.id === s.courseId);
        if (!course) return false;
        const q = search.toLowerCase().trim();
        const matchCourse = !q || course.code.toLowerCase().includes(q) || course.title.toLowerCase().includes(q);
        const matchSection = !sectionSearch.trim() || s.sectionCode.toLowerCase().includes(sectionSearch.toLowerCase().trim());
        const matchStatus = !statusFilter || statusFilter === 'all' || (statusFilter === 'open' && s.enrolled < s.slots);
        return matchCourse && matchSection && matchStatus;
      })
    : [];

  // ── Helpers ─────────────────────────────────────────────────────────
  const checkEnrollmentSchedule = (): string | null => {
    if (hasApprovedLateEnlistThisTerm) return null; // OCS-approved late enlistment bypasses schedule
    if (hasApprovedChangeDropRequest) return null;  // OCS-approved change/drop bypasses schedule
    if (!enrollSched?.slots?.length) return null;
    const todaySlot = enrollSched.slots.find(s => s.date === today);
    if (!todaySlot) return 'Enrollment is not scheduled for today.';
    if (!matchesEnrollPrefix(todaySlot.idPrefixes)) return `Your student ID (${studentNum || 'unknown'}) is not scheduled for today. Check the schedule below.`;
    return null;
  };

  const checkOverlap = (sec: Section) =>
    myEnrolledSections.some(e =>
      schedulesOverlap(e.schedule, sec.schedule) ||
      (sec.labSchedule && schedulesOverlap(e.schedule, sec.labSchedule)) ||
      (e.labSchedule && schedulesOverlap(e.labSchedule, sec.schedule))
    );

  const getSectionInfo = (sec: Section) => {
    const course = state.courses.find(c => c.id === sec.courseId);
    const faculty = state.users.find(u => u.id === sec.facultyId);
    const enrolled = myEnrollments.find(e => e.sectionId === sec.id);
    const isFull = sec.enrolled >= sec.slots;
    const hasOverlap = !enrolled && checkOverlap(sec);
    const isCourseDuplicate = !enrolled && course
      ? myEnrollments.some(e => { const es = state.sections.find(s => s.id === e.sectionId); return es?.courseId === course.id; })
      : false;
    const cartSections = cart.filter(id => id !== sec.id).map(id => state.sections.find(s => s.id === id)).filter(Boolean) as Section[];
    const hasCartOverlap = !enrolled && cartSections.some(cs =>
      schedulesOverlap(sec.schedule, cs.schedule) ||
      (sec.labSchedule ? schedulesOverlap(sec.labSchedule, cs.schedule) : false) ||
      (cs.labSchedule ? schedulesOverlap(sec.schedule, cs.labSchedule) : false)
    );
    const isCartDuplicate = !enrolled && !!course && cartSections.some(cs => cs.courseId === course.id);
    const prereqCheck = course ? checkPrerequisites(student.id, course.id) : { passed: true, missing: [] };
    const coreqCheck = course ? checkCorequisites(student.id, course.id, activeTerm.id) : { passed: true, missing: [] };
    const unitCheck = (() => {
      if (!course || course.isPE || course.isNSTP) return { ok: true };
      const adding = course.units + (course.labUnits ?? 0);
      return { ok: currentUnits + adding <= maxUnits, adding };
    })();
    const hasApprovedPrerog = !!state.prerogatives.find(p => p.studentId === student.id && p.sectionId === sec.id && p.termId === activeTerm.id && p.status === 'approved');
    const consentRecord = state.consents.find(c => c.studentId === student.id && c.sectionId === sec.id && c.termId === activeTerm.id);
    const needsCOI = (course?.requiresCOI ?? false) && consentRecord?.coiStatus !== 'approved';
    const needsDC = (course?.requiresDeptConsent ?? false) && consentRecord?.deptConsentStatus !== 'approved';
    const needsOCS = (course?.requiresOCSConsent ?? false) && consentRecord?.ocsConsentStatus !== 'approved';
    const consentBlocked = needsCOI || needsDC || needsOCS;
    // OCS "Waiver of Pre-requisite" bypasses the prerequisite check regardless of requiresOCSConsent flag
    const hasOCSPrereqWaiver =
      consentRecord?.ocsConsentStatus === 'approved' &&
      consentRecord?.ocsConsentType === 'Waiver of Pre-requisite';
    const effectivePrereqCheck = hasOCSPrereqWaiver ? { passed: true, missing: [] } : prereqCheck;
    return { course, faculty, enrolled: !!enrolled, isFull, hasOverlap, isCourseDuplicate, hasCartOverlap, isCartDuplicate, prereqCheck: effectivePrereqCheck, coreqCheck, unitCheck, hasApprovedPrerog, consentBlocked };
  };

  // ── Handlers ────────────────────────────────────────────────────────
  const handleDrop = (sectionId: string) => {
    const result = dropSection(student.id, sectionId, activeTerm.id);
    toast({ title: result.success ? 'Section dropped' : 'Cannot drop', description: result.message, variant: result.success ? 'default' : 'destructive' });
  };

  const addToCart = (sectionId: string) => {
    if (isFinalized && !appealBypass) return;
    if (cart.includes(sectionId)) return;
    const sec = state.sections.find(s => s.id === sectionId);
    const courseId = sec?.courseId;
    // Restrict: cannot add same course code if already enlisted or already in cart
    if (courseId) {
      const alreadyEnlisted = myEnrollments.some(e => {
        const s = state.sections.find(x => x.id === e.sectionId);
        return s?.courseId === courseId;
      });
      if (alreadyEnlisted) { toast({ title: 'Already Enlisted', description: 'You are already enlisted in this course for this term.', variant: 'destructive' }); return; }
      const inCartAlready = cart.some(id => {
        const s = state.sections.find(x => x.id === id);
        return s?.courseId === courseId;
      });
      if (inCartAlready) { toast({ title: 'Already in Cart', description: 'This course is already in your cart.', variant: 'destructive' }); return; }
    }
    setCart(c => [...c, sectionId]);
  };

  const removeFromCart = (sectionId: string) => setCart(c => c.filter(id => id !== sectionId));

  const handleEnlist = async (sec: Section): Promise<boolean> => {
    const { isFull, hasOverlap, isCourseDuplicate, prereqCheck, coreqCheck, unitCheck, course, hasApprovedPrerog } = getSectionInfo(sec);
    if (isFinalized && !appealBypass) { toast({ title: 'Enlistment finalized', variant: 'destructive' }); return false; }
    if (!effectiveEnlistmentOpen) { toast({ title: 'Enlistment is closed', variant: 'destructive' }); return false; }
    const schedError = checkEnrollmentSchedule();
    if (schedError) { toast({ title: 'Not your enrollment day', description: schedError, variant: 'destructive' }); return false; }
    if (hasOverlap) { showWarning(course?.code ?? sec.sectionCode, sec.sectionCode, ['Schedule conflict with an already enlisted course.']); return false; }
    if (isCourseDuplicate) { showWarning(course?.code ?? sec.sectionCode, sec.sectionCode, ['Already enlisted in another section of this course.']); return false; }
    if (!prereqCheck.passed) { showWarning(course?.code ?? sec.sectionCode, sec.sectionCode, [`Prerequisites not satisfied — missing: ${prereqCheck.missing.join(', ')}`]); return false; }
    if (!coreqCheck.passed) { showWarning(course?.code ?? sec.sectionCode, sec.sectionCode, [`Corequisites not satisfied — must also enlist: ${coreqCheck.missing.join(', ')}`]); return false; }
    if (!unitCheck.ok) { toast({ title: 'Unit limit exceeded', description: `Would exceed your ${maxUnits} unit limit.`, variant: 'destructive' }); return false; }
    if (isFull && !hasApprovedPrerog) {
      if (prerogativeOpen) {
        toast({ title: 'Section is full', description: 'Go to Prerogatives to submit a request.', variant: 'default' });
        navigate('/student/prerogatives');
      } else {
        toast({ title: 'Section is full', description: 'Prerogatives are not currently open.', variant: 'destructive' });
      }
      return false;
    }
    setEnlisting(sec.id);
    const result = await enlistSection(student.id, sec.id, activeTerm.id);
    setEnlisting(null);
    if (result.success) { setEnlistWarning(null); } // cart kept — students keep their planning list
    toast({ title: result.success ? 'Enlisted!' : 'Failed', description: result.message, variant: result.success ? 'default' : 'destructive' });
    return result.success;
  };

  const handleBulkEnlist = async () => {
    if (!effectiveEnlistmentOpen) { toast({ title: 'Enlistment is closed', variant: 'destructive' }); return; }
    const schedError = checkEnrollmentSchedule();
    if (schedError) { toast({ title: 'Not your enrollment day', description: schedError, variant: 'destructive' }); return; }
    let successCount = 0;
    let skippedUnits = 0; // sections skipped because they would exceed unit limit
    const failures: { code: string; section: string; reasons: string[] }[] = [];
    const batchEnlisted: Section[] = [];
    // Running unit total — starts at current enlisted units and grows as we successfully enlist
    let runningUnits = currentUnits;
    // Iterate over cartRows (filtered: active term, not yet enlisted) instead of raw cart
    for (const sec of cartRows) {
      const sectionId = sec.id;
      // cartRows already excludes enrolled sections — no need for alreadyEnlisted check here
      const { isFull, hasOverlap, isCourseDuplicate, hasCartOverlap, isCartDuplicate, prereqCheck, coreqCheck, unitCheck, hasApprovedPrerog: batchPrerog } = getSectionInfo(sec);
      const course = state.courses.find(c => c.id === sec.courseId);
      const batchOverlap = batchEnlisted.some(bs =>
        schedulesOverlap(sec.schedule, bs.schedule) ||
        (sec.labSchedule ? schedulesOverlap(sec.labSchedule, bs.schedule) : false) ||
        (bs.labSchedule ? schedulesOverlap(sec.schedule, bs.labSchedule) : false)
      );
      const batchDuplicate = !!course && batchEnlisted.some(bs => bs.courseId === course.id);

      const reasons: string[] = [];
      if (isFull && !batchPrerog) reasons.push('Section is full');
      if (hasOverlap || batchOverlap) reasons.push('Schedule conflict with enrolled courses');
      if (hasCartOverlap || isCartDuplicate || batchDuplicate) reasons.push('Conflict with another bookmarked course');
      if (isCourseDuplicate) reasons.push('Already enlisted in this course');
      if (!prereqCheck.passed) reasons.push(`Prerequisites not met — missing: ${prereqCheck.missing.join(', ')}`);
      if (!coreqCheck.passed) reasons.push(`Corequisites not satisfied — must also enlist: ${coreqCheck.missing.join(', ')}`);

      // Unit check uses running total (not the stale snapshot) to prevent over-enrollment in a single batch
      const wouldExceed = maxUnits > 0 && (runningUnits + unitCheck.adding) > maxUnits;
      if (wouldExceed) {
        // Keep in cart silently — just skip; user sees it remain as "bookmarked" with the unit warning badge
        skippedUnits++;
        continue;
      }

      if (reasons.length > 0) {
        failures.push({ code: course?.code ?? sec.sectionCode, section: sec.sectionCode, reasons });
        continue;
      }
      setEnlisting(sectionId);
      const result = await enlistSection(student.id, sectionId, activeTerm.id);
      setEnlisting(null);
      if (result.success) {
        successCount++;
        runningUnits += unitCheck.adding; // track cumulative units for subsequent iterations
        batchEnlisted.push(sec);
      } else {
        failures.push({ code: course?.code ?? sec.sectionCode, section: sec.sectionCode, reasons: [result.message ?? 'Enlistment failed'] });
      }
    }
    // Cart is NOT cleared — students keep their planning list intact
    const failCount = failures.length;
    if (failCount > 0) {
      setBulkFailures(failures);
    }
    const skippedMsg = skippedUnits > 0 ? ` ${skippedUnits} skipped (unit limit — still in bin).` : '';
    toast({
      title: 'Bulk Enlistment Complete',
      description: failCount > 0
        ? `${successCount} enlisted, ${failCount} failed.${skippedMsg} See details below.`
        : `${successCount} course(s) enlisted successfully.${skippedMsg}`,
      variant: failCount > 0 && successCount === 0 ? 'destructive' : 'default',
    });
  };

  const downloadTimetable = async () => {
    const node = timetableRef.current;
    if (!node) return;
    try {
      const dataUrl = await toPng(node, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        style: { overflow: 'visible' },
      });
      const link = document.createElement('a');
      link.download = `timetable-${activeTerm.name.replace(/\s+/g, '-')}.png`;
      link.href = dataUrl; link.click();
    } catch (e) { console.error('Timetable download failed:', e); }
  };

  // ── Timetable ────────────────────────────────────────────────────────
  const START_HOUR = 7; const END_HOUR = 20;
  const TOTAL_MINS = (END_HOUR - START_HOUR) * 60;
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
  const enrolledSectionIds = new Set(myEnrolledSections.map(s => s.id));
  const enrolledCourseIds = new Set(myEnrolledSections.map(s => s.courseId));
  // Cart display arrays: active term only + exclude already-enlisted sections/courses
  const cartSectionsArr = cart
    .map(id => state.sections.find(s => s.id === id))
    .filter(Boolean)
    .filter(s => s!.termId === activeTerm.id && !enrolledSectionIds.has(s!.id) && !enrolledCourseIds.has(s!.courseId)) as Section[];

  const renderTimetable = () => (
    <div className="flex flex-col h-full">
        <div className="grid grid-cols-7 gap-0.5 mb-1 shrink-0">
          <div className="text-[10px] text-gray-400 text-right pr-1">Time</div>
          {DAYS.map(d => <div key={d} className="text-[10px] font-semibold text-gray-600 text-center">{DAY_LABELS[d]}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-0.5 flex-1 min-h-0">
          <div className="relative">
            {hours.filter((_, i) => i % 2 === 0).map(h => (
              <div key={h} className="absolute right-0.5 text-[9px] text-gray-400 leading-none" style={{ top: `${((h - START_HOUR) * 60 / TOTAL_MINS) * 100}%` }}>
                {h === 12 ? '12p' : h < 12 ? `${h}a` : `${h - 12}p`}
              </div>
            ))}
          </div>
          {DAYS.map(day => (
            <div key={day} className="relative border border-gray-200 rounded bg-gray-50/50">
              {hours.map(h => <div key={h} className="absolute w-full border-t border-gray-100/80" style={{ top: `${((h - START_HOUR) * 60 / TOTAL_MINS) * 100}%` }} />)}
              {myEnrolledSections.map((sec, ci) => {
                const course = state.courses.find(c => c.id === sec.courseId);
                const color = COLORS[ci % COLORS.length];
                return (
                  <React.Fragment key={sec.id}>
                    {sec.schedule.days.includes(day) && (() => {
                      const top = toMinutes(sec.schedule.startTime) - START_HOUR * 60;
                      const height = toMinutes(sec.schedule.endTime) - toMinutes(sec.schedule.startTime);
                      return (
                        <div className={`absolute w-[95%] left-[2.5%] rounded border text-[9px] px-0.5 py-0.5 overflow-hidden ${color}`} style={{ top: `${(top / TOTAL_MINS) * 100}%`, height: `${(height / TOTAL_MINS) * 100}%` }}>
                          <p className="font-bold truncate leading-tight">{course?.code}</p>
                          <p className="truncate opacity-80 leading-tight">{sec.schedule.startTime}–{sec.schedule.endTime}</p>
                          {sec.schedule.room && <p className="truncate opacity-70 leading-tight">{sec.schedule.room}</p>}
                        </div>
                      );
                    })()}
                    {sec.labSchedule?.days.includes(day) && (() => {
                      const top = toMinutes(sec.labSchedule!.startTime) - START_HOUR * 60;
                      const height = toMinutes(sec.labSchedule!.endTime) - toMinutes(sec.labSchedule!.startTime);
                      return (
                        <div className={`absolute w-[88%] left-[6%] rounded border text-[9px] px-0.5 py-0.5 overflow-hidden ${color} border-dashed opacity-85`} style={{ top: `${(top / TOTAL_MINS) * 100}%`, height: `${(height / TOTAL_MINS) * 100}%` }}>
                          <p className="font-bold truncate leading-tight">{course?.code} Lab</p>
                          <p className="truncate opacity-80 leading-tight">{sec.labSchedule!.startTime}–{sec.labSchedule!.endTime}</p>
                          {sec.labSchedule!.room && <p className="truncate opacity-70 leading-tight">{sec.labSchedule!.room}</p>}
                        </div>
                      );
                    })()}
                  </React.Fragment>
                );
              })}
              {!isFinalized && cartSectionsArr.map(sec => {
                const course = state.courses.find(c => c.id === sec.courseId);
                const hasConflict = myEnrolledSections.some(e => schedulesOverlap(e.schedule, sec.schedule));
                const cls = hasConflict ? 'bg-red-100/80 border-red-400 text-red-900 border-dashed' : 'bg-gray-100/90 border-gray-400 text-gray-700 border-dashed';
                return (
                  <React.Fragment key={`cart-${sec.id}`}>
                    {sec.schedule.days.includes(day) && (() => {
                      const top = toMinutes(sec.schedule.startTime) - START_HOUR * 60;
                      const height = toMinutes(sec.schedule.endTime) - toMinutes(sec.schedule.startTime);
                      return (
                        <div className={`absolute w-[95%] left-[2.5%] rounded border-2 text-[9px] px-0.5 py-0.5 overflow-hidden opacity-75 ${cls}`} style={{ top: `${(top / TOTAL_MINS) * 100}%`, height: `${(height / TOTAL_MINS) * 100}%`, zIndex: 5 }}>
                          <p className="font-bold truncate leading-tight">{course?.code}</p>
                          <p className="truncate opacity-80 text-[8px] leading-tight">{sec.schedule.startTime}–{sec.schedule.endTime}</p>
                          {sec.schedule.room && <p className="truncate opacity-70 text-[8px] leading-tight">{sec.schedule.room}</p>}
                        </div>
                      );
                    })()}
                    {sec.labSchedule?.days.includes(day) && (() => {
                      const top = toMinutes(sec.labSchedule!.startTime) - START_HOUR * 60;
                      const height = toMinutes(sec.labSchedule!.endTime) - toMinutes(sec.labSchedule!.startTime);
                      return (
                        <div className={`absolute w-[88%] left-[6%] rounded border-2 text-[9px] px-0.5 py-0.5 overflow-hidden opacity-65 ${cls}`} style={{ top: `${(top / TOTAL_MINS) * 100}%`, height: `${(height / TOTAL_MINS) * 100}%`, zIndex: 5 }}>
                          <p className="font-bold truncate leading-tight">{course?.code} Lab</p>
                          <p className="truncate opacity-80 text-[8px] leading-tight">{sec.labSchedule!.startTime}–{sec.labSchedule!.endTime}</p>
                          {sec.labSchedule!.room && <p className="truncate opacity-70 text-[8px] leading-tight">{sec.labSchedule!.room}</p>}
                        </div>
                      );
                    })()}
                  </React.Fragment>
                );
              })}
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {myEnrolledSections.map((sec, ci) => {
            const course = state.courses.find(c => c.id === sec.courseId);
            const color = COLORS[ci % COLORS.length];
            return <span key={sec.id} className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${color}`}><span className="w-2 h-2 rounded-full bg-current opacity-60"></span>{course?.code} Sec {sec.sectionCode}</span>;
          })}
          {!isFinalized && cartSectionsArr.map(sec => {
            const course = state.courses.find(c => c.id === sec.courseId);
            return <span key={`cart-${sec.id}`} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border-2 border-dashed border-gray-400 text-gray-600 bg-gray-50"><span className="w-2 h-2 rounded-full bg-gray-400"></span>{course?.code} (Bookmarked)</span>;
          })}
        </div>
      </div>
  );

  // ── Active Enlistment rows ───────────────────────────────────────────
  const cartRows = cart
    .map(id => state.sections.find(s => s.id === id))
    .filter(Boolean)
    .filter(s => s!.termId === activeTerm.id && !enrolledSectionIds.has(s!.id) && !enrolledCourseIds.has(s!.courseId)) as Section[];

  // ── Reconsideration (PD) ─────────────────────────────────────────────
  const latestRequest = [...(state.reconsiderationRequests ?? [])]
    .filter(r => r.studentId === student.id && r.termId === activeTerm.id && (!r.requestType || r.requestType === 'pd_reconsideration'))
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))[0];

  // ── Late Enlistment Request ───────────────────────────────────────────
  const latestLateRequest = [...(state.reconsiderationRequests ?? [])]
    .filter(r => r.studentId === student.id && r.termId === activeTerm.id && r.requestType === 'late_enlistment')
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))[0];

  return (
    <PortalLayout role="student" userName={student.name}>
      <div className="space-y-4">

        {/* ── Permanently Disqualified Banner ─────────────────────────── */}
        {isDisqualified && (() => {
          const noPending = !latestRequest || latestRequest.status !== 'pending';
          return (
            <>
              <div className="rounded-md border border-red-300 bg-red-50">
                <div className="pt-3 pb-3 px-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <Lock className="w-5 h-5 text-red-600 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-red-900">Enlistment Locked — Permanent Disqualification</p>
                        <p className="text-xs text-red-700 mt-0.5">You cannot enlist. Submit a reconsideration request to the OCS.</p>
                      </div>
                    </div>
                    {noPending && (
                      <Button size="sm" variant="outline" className="border-red-400 text-red-700 hover:bg-red-100"
                        onClick={() => setShowReconDialog(true)}>Request Reconsideration</Button>
                    )}
                  </div>
                </div>
              </div>
              {latestRequest?.status === 'pending' && (
                <div className="rounded-md border border-yellow-300 bg-yellow-50">
                  <div className="pt-3 pb-3 px-4 flex items-center gap-3">
                    <RefreshCw className="w-4 h-4 text-yellow-600 flex-shrink-0 animate-spin" />
                    <p className="text-sm text-yellow-800">Your reconsideration request is pending OCS review.</p>
                  </div>
                </div>
              )}
              {latestRequest?.status === 'denied' && (
                <div className="rounded-md border border-red-300 bg-red-50">
                  <div className="pt-3 pb-3 px-4 flex items-center gap-3">
                    <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-red-800">Reconsideration Request — DENIED</p>
                      {latestRequest.response && <p className="text-xs text-red-700">OCS: "{latestRequest.response}"</p>}
                    </div>
                  </div>
                </div>
              )}
              <Dialog open={showReconDialog} onOpenChange={v => { setShowReconDialog(v); if (!v) setReconReason(''); }}>
                <DialogContent className="max-w-md">
                  <DialogHeader><DialogTitle className="flex items-center gap-2"><MessageSquare className="w-5 h-5 text-primary" />Request Reconsideration</DialogTitle></DialogHeader>
                  <div className="space-y-4 mt-2">
                    <p className="text-sm text-muted-foreground">Explain your case. The OCS will review and may reinstate your privileges.</p>
                    <div><Label>Reason <span className="text-red-500">*</span></Label>
                      <Textarea rows={4} placeholder="Explain why this should be reconsidered..." value={reconReason} onChange={e => setReconReason(e.target.value)} className="mt-1" />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => { setShowReconDialog(false); setReconReason(''); }}>Cancel</Button>
                      <Button className="flex-1" disabled={!reconReason.trim() || submittingRecon}
                        onClick={async () => { setSubmittingRecon(true); await submitReconsiderationRequest(student.id, activeTerm.id, reconReason.trim()); setSubmittingRecon(false); setShowReconDialog(false); setReconReason(''); }}>
                        {submittingRecon ? 'Submitting...' : 'Submit Request'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          );
        })()}

        {/* ── Finalized Banner ─────────────────────────────────────────── */}
        {isFinalized && (
          <div className="rounded-md border border-green-800 bg-green-700">
            <div className="pt-3 pb-3 px-4 flex items-center gap-3">
              <CheckSquare className="w-5 h-5 text-white flex-shrink-0" />
              <div>
                <p className="text-white font-semibold">Enrollment Finalized — Officially Enrolled</p>
                <p className="text-green-100 text-xs">You are officially enrolled for {activeTerm.name}. Your class schedule is now locked.</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Change & Drop After Finalization Banner ───────────────────── */}
        {isFinalized && isChangeDropWindowOpen && (() => {
          const existingReq = (state.changeDropRequests ?? [])
            .filter(r => r.studentId === student.id && r.termId === activeTerm.id)
            .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))[0];
          const statusColors: Record<string, string> = {
            pending: 'bg-yellow-50 border-yellow-300',
            approved: 'bg-green-50 border-green-300',
            denied: 'bg-red-50 border-red-200',
          };
          if (existingReq?.status === 'approved') return null; // approved students see normal enlistment
          return (
            <div className={`rounded-md border p-4 space-y-3 ${existingReq ? (statusColors[existingReq.status] ?? 'bg-gray-50 border-gray-200') : 'bg-blue-50 border-blue-300'}`}>
              <div className="flex items-start gap-3">
                <MessageSquare className={`w-5 h-5 flex-shrink-0 mt-0.5 ${existingReq?.status === 'denied' ? 'text-red-600' : existingReq?.status === 'pending' ? 'text-yellow-600' : 'text-blue-600'}`} />
                <div className="flex-1">
                  <p className={`font-semibold text-sm ${existingReq?.status === 'denied' ? 'text-red-900' : existingReq?.status === 'pending' ? 'text-yellow-900' : 'text-blue-900'}`}>
                    {existingReq?.status === 'pending' ? 'Change/Drop Request — Under OCS Review'
                      : existingReq?.status === 'denied' ? 'Change/Drop Request — Denied'
                      : 'Request to Change/Drop a Course After Finalization'}
                  </p>
                  {!existingReq && (
                    <p className="text-xs text-blue-800 mt-1 leading-relaxed">
                      You have already finalized your enrollment. If you need to add, drop, or change a subject,
                      submit a <strong>Change/Drop Appeal Letter</strong> to the OCS.
                      Once approved, your enrollment will be reopened for modification.
                      {activeTerm.changeDropUntil && <span className="font-medium"> Deadline: {new Date(activeTerm.changeDropUntil).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}.</span>}
                    </p>
                  )}
                  {existingReq?.status === 'pending' && (
                    <p className="text-xs text-yellow-800 mt-1">Your appeal letter is under OCS review. Please wait for their response.</p>
                  )}
                  {existingReq?.status === 'denied' && (
                    <>
                      <p className="text-xs text-red-800 mt-1">Your request was denied by the OCS.</p>
                      {existingReq.response && <p className="text-xs text-red-700 mt-1 italic">OCS: "{existingReq.response}"</p>}
                    </>
                  )}
                </div>
                {!existingReq && (
                  <Button size="sm" className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => setShowChangeDropDialog(true)}>
                    Submit Appeal
                  </Button>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── Change/Drop Approved Banner ───────────────────────────────── */}
        {hasApprovedChangeDropRequest && (
          <div className="rounded-md border border-blue-400 bg-blue-600">
            <div className="pt-3 pb-3 px-4 flex items-center gap-3">
              <CheckSquare className="w-5 h-5 text-white flex-shrink-0" />
              <div>
                <p className="text-white font-semibold">Change/Drop Access Granted</p>
                <p className="text-blue-100 text-xs">OCS has approved your request. You may now add, drop, or change subjects and re-finalize your enrollment.</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Enlistment Window Status Banners ────────────────────────── */}
        {!isDisqualified && !isFinalized && (() => {
          if (enlistmentWindowStatus === 'not-set') {
            return (
              <div className="rounded-md border border-amber-300 bg-amber-50">
                <div className="pt-3 pb-3 px-4 flex items-center gap-3">
                  <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900">Enlistment Not Yet Scheduled</p>
                    <p className="text-xs text-amber-700 mt-0.5">No enlistment window has been set. Please wait for the University announcement.</p>
                  </div>
                </div>
              </div>
            );
          }
          if (enlistmentWindowStatus === 'upcoming' && activeTerm.enlistmentFrom) {
            return (
              <div className="rounded-md border border-blue-300 bg-blue-50">
                <div className="pt-3 pb-3 px-4 flex items-center gap-3">
                  <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900">Enlistment Not Yet Open</p>
                    <p className="text-xs text-blue-700 mt-0.5">
                      Enlistment opens on {new Date(activeTerm.enlistmentFrom).toLocaleString('en-PH', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}.
                    </p>
                  </div>
                </div>
              </div>
            );
          }
          if (enlistmentWindowStatus === 'ended' && hasApprovedLateEnlistThisTerm) {
            return (
              <div className="rounded-md border border-green-400 bg-green-50">
                <div className="pt-3 pb-3 px-4 flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-green-900">Late Enrollment Granted</p>
                    <p className="text-xs text-green-700 mt-0.5">
                      The OCS has approved your late enrollment request. You may now search for subjects, enlist, and finalize your enrollment.
                    </p>
                    {latestLateRequest?.response && (
                      <p className="text-xs text-green-800 mt-1 italic">OCS Note: "{latestLateRequest.response}"</p>
                    )}
                  </div>
                </div>
              </div>
            );
          }
          if (enlistmentWindowStatus === 'ended' && !hasApprovedLateEnlistThisTerm && isLateEnrollmentWindowOpen) {
            // 0 units: full "Request for Late Enrollment" banner with instructions
            if (currentUnits === 0) {
              const noLatePending = !latestLateRequest || latestLateRequest.status === 'denied';
              return (
                <>
                  <div className="rounded-md border border-amber-400 bg-amber-50">
                    <div className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-semibold text-amber-900">Request for Late Enrollment</p>
                          <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                            You have no enlisted subjects for this term and the enrollment period has ended.
                            If you were unable to enlist due to special circumstances, you may submit a
                            <strong> Request for Late Enrollment</strong> to the OCS.
                          </p>
                        </div>
                      </div>
                      <div className="ml-8 space-y-1.5 text-xs text-amber-800 bg-amber-100/60 rounded-md p-3 border border-amber-200">
                        <p className="font-semibold text-amber-900">How it works:</p>
                        <p>1. Write an appeal letter explaining your reason for missing enrollment.</p>
                        <p>2. Submit the letter — the OCS will review your request.</p>
                        <p>3. If approved, you will be able to add subjects and finalize your enrollment even after the deadline.</p>
                      </div>
                      {latestLateRequest?.status === 'pending' && (
                        <div className="ml-8 flex items-center gap-2 text-xs text-yellow-800">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                          Your appeal letter is currently under OCS review. Please wait for their response.
                        </div>
                      )}
                      {latestLateRequest?.status === 'denied' && (
                        <div className="ml-8 rounded bg-red-100 border border-red-200 px-3 py-2 text-xs text-red-800">
                          <p className="font-semibold">Request Denied</p>
                          {latestLateRequest.response && <p className="mt-0.5 italic">OCS: "{latestLateRequest.response}"</p>}
                          <p className="mt-0.5">You may re-submit a new appeal letter below.</p>
                        </div>
                      )}
                      {noLatePending && (
                        <div className="ml-8">
                          <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
                            onClick={() => setShowLateEnlistDialog(true)}>
                            <MessageSquare className="w-3.5 h-3.5" /> Submit Appeal Letter
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Appeal Letter Dialog */}
                  <Dialog open={showLateEnlistDialog} onOpenChange={v => { setShowLateEnlistDialog(v); if (!v) setLateEnlistReason(''); }}>
                    <DialogContent className="max-w-md">
                      <DialogHeader><DialogTitle className="flex items-center gap-2"><MessageSquare className="w-5 h-5 text-primary" />Request for Late Enrollment</DialogTitle></DialogHeader>
                      <div className="space-y-4 mt-2">
                        <div className="rounded bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-800 space-y-1">
                          <p className="font-semibold">Instructions:</p>
                          <p>Write a clear and honest appeal letter to the OCS explaining why you were unable to enlist during the regular enrollment period. Include any relevant circumstances (medical, personal, technical issues, etc.).</p>
                        </div>
                        <div>
                          <Label>Appeal Letter <span className="text-red-500">*</span></Label>
                          <Textarea rows={5} placeholder="Dear OCS, I am writing to request late enrollment for this term because..." value={lateEnlistReason} onChange={e => setLateEnlistReason(e.target.value)} className="mt-1" />
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" className="flex-1" onClick={() => { setShowLateEnlistDialog(false); setLateEnlistReason(''); }}>Cancel</Button>
                          <Button className="flex-1" disabled={!lateEnlistReason.trim() || submittingLateEnlist}
                            onClick={async () => {
                              setSubmittingLateEnlist(true);
                              await submitReconsiderationRequest(student.id, activeTerm.id, lateEnlistReason.trim(), 'late_enlistment');
                              setSubmittingLateEnlist(false);
                              setShowLateEnlistDialog(false);
                              setLateEnlistReason('');
                              toast({ title: 'Appeal letter submitted', description: 'Your request for late enrollment has been sent to the OCS for review.' });
                            }}>
                            {submittingLateEnlist ? 'Submitting...' : 'Submit Appeal Letter'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              );
            }

            // Has some units but window ended — no extra banner; re-enlistment request handles it below
            return null;
          }
          return null;
        })()}


        {/* ── Warning Dialog ───────────────────────────────────────────── */}
        <Dialog open={showWarningDialog && !!enlistWarning} onOpenChange={open => { setShowWarningDialog(open); if (!open) setEnlistWarning(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-700">
                <XCircle className="w-5 h-5" />Cannot Enlist — {enlistWarning?.courseCode} Sec {enlistWarning?.sectionCode}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2 mt-2">
              {enlistWarning?.issues.map((issue, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" /><span>{issue}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={() => { setShowWarningDialog(false); setEnlistWarning(null); }}>Dismiss</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Bulk Enlist Failures Dialog ──────────────────────────────── */}
        <Dialog open={!!bulkFailures} onOpenChange={open => { if (!open) setBulkFailures(null); }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-700">
                <XCircle className="w-5 h-5" />Enlistment Failed — {bulkFailures?.length} Course{(bulkFailures?.length ?? 0) > 1 ? 's' : ''}
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-x-auto rounded border mt-2">
              <Table>
                <TableHeader>
                  <TableRow className="bg-red-50">
                    <TableHead className="font-semibold text-red-800">Course</TableHead>
                    <TableHead className="font-semibold text-red-800">Section</TableHead>
                    <TableHead className="font-semibold text-red-800">Reason(s)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(bulkFailures ?? []).map((f, i) => (
                    <TableRow key={i} className="align-top">
                      <TableCell className="font-mono font-semibold text-primary text-sm whitespace-nowrap">{f.code}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{f.section}</TableCell>
                      <TableCell className="text-sm">
                        {f.reasons.length === 1 ? f.reasons[0] : (
                          <ul className="list-disc list-inside space-y-0.5">
                            {f.reasons.map((r, j) => <li key={j}>{r}</li>)}
                          </ul>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={() => setBulkFailures(null)}>Dismiss</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Enrollment Schedule Banner ───────────────────────────────── */}
        {enrollSched?.slots?.length ? (() => {
          const phase1 = enrollSched.slots.filter(s => (s.phase ?? 1) === 1);
          const phase2 = enrollSched.slots.filter(s => (s.phase ?? 1) === 2);
          const todayPhase = enrollSchedToday ? (enrollSchedToday.phase ?? 1) : null;
          const todayDay = enrollSchedToday?.day ?? null;
          return (
            <div className={`rounded-md border ${isMyEnrollDay ? 'bg-green-50 border-green-300' : 'bg-blue-50 border-blue-200'}`}>
              <div className="px-4 pt-3 pb-3 space-y-3">
                <div className="flex items-start gap-2">
                  <CalendarDays className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isMyEnrollDay ? 'text-green-600' : 'text-blue-600'}`} />
                  <p className={`text-sm font-semibold ${isMyEnrollDay ? 'text-green-800' : 'text-blue-800'}`}>
                    {isMyEnrollDay
                      ? `Today is your enrollment day! (${todayPhase === 1 ? 'Pre-registration' : 'General Registration'} — Day ${todayDay}${enrollSchedToday!.idPrefixes.length === 0 ? ', Open to all' : ''})`
                      : 'Enrollment Schedule (by Student ID)'}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {([{ slots: phase1, label: 'Phase 1 — Pre-registration', color: 'indigo' }, { slots: phase2, label: 'Phase 2 — General Registration', color: 'teal' }] as const).map(({ slots: phaseSlots, label, color }) => (
                    phaseSlots.length > 0 ? (
                      <div key={label} className={`rounded border ${color === 'indigo' ? 'border-indigo-200 bg-indigo-50' : 'border-teal-200 bg-teal-50'} p-2.5 space-y-1`}>
                        <p className={`text-xs font-bold ${color === 'indigo' ? 'text-indigo-700' : 'text-teal-700'}`}>{label}</p>
                        {phaseSlots.map(slot => {
                          const isToday = slot.date === today;
                          const isEligible = isToday && matchesEnrollPrefix(slot.idPrefixes);
                          return (
                            <div key={`${slot.phase}-${slot.day}`}
                              className={`text-xs px-2 py-1 rounded border flex items-center justify-between gap-2 ${isEligible ? 'bg-green-100 border-green-300 text-green-800 font-semibold' : isToday ? 'bg-yellow-100 border-yellow-300 text-yellow-800' : 'bg-white border-gray-200 text-gray-600'}`}>
                              <span>
                                <span className="font-medium">Day {slot.day}</span>
                                {' — '}{new Date(slot.date + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                              </span>
                              <span className={`text-right ${isEligible ? 'text-green-700' : ''}`}>
                                {slot.idPrefixes.length === 0 ? 'Open to all' : `IDs: ${slot.idPrefixes.join(', ')}`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : null
                  ))}
                </div>
              </div>
            </div>
          );
        })() : null}

        {/* ── Split: Weekly Schedule + Active Enlistment ───────────────── */}
        <div className="flex gap-3 items-stretch h-[calc(100vh-12rem)] min-h-[500px]">

          {/* ── Weekly Schedule / Timetable ──────────── */}
          <div className="flex-1 min-w-0 flex flex-col rounded-md overflow-hidden border border-border">
            <div className="bg-primary text-primary-foreground px-3 py-2 font-bold text-sm flex items-center justify-between gap-2 shrink-0">
              <span className="flex items-center gap-1.5 text-xs">
                <CalendarDays className="w-4 h-4" /> Weekly Schedule
                <span className="font-normal opacity-70">{isFinalized ? '(enrolled)' : '(solid=enlisted)'}</span>
              </span>
              <Button size="sm" variant="outline" className="gap-1.5 h-7 text-[10px] bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/20" onClick={downloadTimetable}>
                <Download className="w-3 h-3" /> PNG
              </Button>
            </div>
            <div className="flex-1 min-h-0 p-1.5 bg-background overflow-hidden">
              <div ref={timetableRef} className="h-full bg-white">
                {myEnrolledSections.length === 0 && cartSectionsArr.length === 0
                  ? <p className="text-muted-foreground text-center py-6 text-sm">No sections to display.</p>
                  : renderTimetable()}
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* ACTIVE ENLISTMENT                                            */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <div className="flex-1 min-w-0 flex flex-col rounded-md overflow-hidden border border-border">
          {/* Header */}
          <div className="bg-primary text-primary-foreground px-4 py-2.5 font-bold text-sm flex items-center justify-between shrink-0">
            <span>Active Enlistment</span>
            <div className="flex items-center gap-2">
              {effectiveEnlistmentOpen && (!isFinalized || appealBypass) && !isDisqualified && (
                <Badge className="bg-primary-foreground/20 text-primary-foreground text-xs">
                  {activeTerm.name}
                </Badge>
              )}
              {isFinalized && !appealBypass
                ? <Badge className="bg-green-400 text-white text-xs">Finalized</Badge>
                : isDisqualified
                  ? <Badge className="bg-red-400 text-white text-xs">Locked</Badge>
                  : !effectiveEnlistmentOpen
                    ? <Badge className="bg-red-400 text-white text-xs">
                        {enlistmentWindowStatus === 'not-set' ? 'Awaiting Announcement' :
                         enlistmentWindowStatus === 'upcoming' ? 'Not Yet Open' : 'Enlistment Closed'}
                      </Badge>
                    : <Badge className="bg-green-400 text-white text-xs">Enlistment Open</Badge>}
            </div>
          </div>

          {/* Active Enlistment Table */}
          <div className="flex-1 min-h-0 overflow-y-auto bg-background">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-bold">Class</TableHead>
                  <TableHead className="font-bold w-[130px] text-center">Status</TableHead>
                  <TableHead className="font-bold w-[130px] text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* ── Bookmarked (cart) rows ── */}
                {cartRows.map(sec => {
                  const course = state.courses.find(c => c.id === sec.courseId);
                  const faculty = state.users.find(u => u.id === sec.facultyId);
                  const { isFull, hasApprovedPrerog: cartItemHasPrerog, unitCheck } = getSectionInfo(sec);
                  if (!course) return null;
                  const isEnlisting = enlisting === sec.id;
                  const consentNotes: string[] = [];
                  if (course.requiresCOI) {
                    const prereqs = course.prerequisites ?? [];
                    consentNotes.push(prereqs.length ? 'Requires COI if you have not satisfied its prerequisites' : 'Requires COI');
                  }
                  if (course.requiresDeptConsent) consentNotes.push('Requires Department Consent');
                  if (course.requiresOCSConsent) consentNotes.push('Requires OCS Consent');
                  return (
                    <TableRow key={sec.id} className="hover:bg-muted/10 align-top">
                      <TableCell className="py-3">
                        <div className="flex gap-3 w-full">
                          <ClassCard
                            course={course}
                            sectionCode={sec.sectionCode}
                            schedule={sec.schedule}
                            facultyName={faculty?.name}
                            enrolled={sec.enrolled}
                            slots={sec.slots}
                            consentNotes={consentNotes}
                            allCourses={state.courses}
                          />
                          {sec.labSchedule && (
                            <ClassCard
                              course={course}
                              sectionCode={sec.sectionCode + 'L'}
                              isLab
                              schedule={sec.labSchedule}
                              facultyName={faculty?.name}
                              enrolled={sec.enrolled}
                              slots={sec.slots}
                              consentNotes={[]}
                              allCourses={state.courses}
                            />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 align-middle text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="italic text-sm text-muted-foreground">Bookmarked</span>
                          {isFull && !cartItemHasPrerog && <p className="text-xs text-red-500 font-medium">Section Full</p>}
                          {isFull && cartItemHasPrerog && <p className="text-xs text-green-600 font-medium">Full — Prerog ✓</p>}
                          {!unitCheck.ok && <p className="text-xs text-amber-600 font-medium">Would exceed unit limit</p>}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 align-middle text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Button size="sm"
                            className="bg-green-500 hover:bg-green-600 text-white h-7 text-xs min-w-[70px] disabled:opacity-40"
                            disabled={isEnlisting || !effectiveEnlistmentOpen || (isFinalized && !appealBypass) || isDisqualified}
                            onClick={() => handleEnlist(sec)}>
                            {isEnlisting ? '...' : 'Enlist'}
                          </Button>
                          <Button size="sm" variant="destructive" className="h-7 text-xs min-w-[70px]"
                            onClick={() => removeFromCart(sec.id)}>Remove</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {/* ── Enlisted rows ── */}
                {myEnrolledSections.map((sec, ci) => {
                  const course = state.courses.find(c => c.id === sec.courseId);
                  const faculty = state.users.find(u => u.id === sec.facultyId);
                  const color = COLORS[ci % COLORS.length];
                  if (!course) return null;
                  const consentNotes: string[] = [];
                  if (course.requiresCOI) {
                    const prereqs = course.prerequisites ?? [];
                    consentNotes.push(prereqs.length ? 'Requires COI if you have not satisfied its prerequisites' : 'Requires COI');
                  }
                  if (course.requiresDeptConsent) consentNotes.push('Requires Department Consent');
                  if (course.requiresOCSConsent) consentNotes.push('Requires OCS Consent');
                  return (
                    <TableRow key={sec.id} className={`bg-green-50/30 hover:bg-green-50/50 align-top ${color.split(' ')[0]}/5`}>
                      <TableCell className="py-3">
                        <div className="flex gap-3 w-full">
                          <ClassCard
                            course={course}
                            sectionCode={sec.sectionCode}
                            schedule={sec.schedule}
                            facultyName={faculty?.name}
                            enrolled={sec.enrolled}
                            slots={sec.slots}
                            consentNotes={consentNotes}
                            allCourses={state.courses}
                            isEnlistedFinalized={isFinalized}
                          />
                          {sec.labSchedule && (
                            <ClassCard
                              course={course}
                              sectionCode={sec.sectionCode + 'L'}
                              isLab
                              schedule={sec.labSchedule}
                              facultyName={faculty?.name}
                              enrolled={sec.enrolled}
                              slots={sec.slots}
                              consentNotes={[]}
                              allCourses={state.courses}
                              isEnlistedFinalized={isFinalized}
                            />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 align-middle text-center">
                        {isFinalized
                          ? <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">Finalized</Badge>
                          : <Badge className="bg-green-100 text-green-800 border-green-200 text-xs italic">Enlisted</Badge>}
                      </TableCell>
                      <TableCell className="py-3 align-middle text-center">
                        <Button size="sm" variant="destructive" className="h-7 text-xs min-w-[70px] disabled:opacity-40"
                          disabled={(isFinalized && !appealBypass) || !canDrop}
                          onClick={() => handleDrop(sec.id)}>Drop</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {/* ── Empty state ── */}
                {cartRows.length === 0 && myEnrolledSections.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                      No Data Available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Stats bar */}
          <div className="border-t bg-muted/10 px-4 py-2 flex flex-col gap-1.5">
            <div className="flex flex-wrap gap-x-8 gap-y-1 text-xs text-muted-foreground">
              <span>Scholastic Standing: <strong>{scholasticStatus}</strong></span>
              <span>Allowed Max Units: <strong>{maxUnits}</strong></span>
              <span className={currentUnits >= maxUnits ? 'text-destructive font-semibold' : currentUnits >= maxUnits * 0.8 ? 'text-amber-600 font-semibold' : ''}>
                Enlisted Academic Units: <strong>{currentUnits}</strong>
                {currentUnits >= maxUnits && <span className="ml-1">(Max reached)</span>}
                {currentUnits > 0 && currentUnits < maxUnits && currentUnits >= maxUnits * 0.8 && <span className="ml-1">(Near limit)</span>}
              </span>
            </div>
            {/* Unit load progress bar */}
            {maxUnits > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${currentUnits >= maxUnits ? 'bg-destructive' : currentUnits >= maxUnits * 0.8 ? 'bg-amber-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min((currentUnits / maxUnits) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{currentUnits}/{maxUnits} units</span>
              </div>
            )}
            {currentUnits >= maxUnits && (
              <p className="text-xs text-destructive font-medium flex items-center gap-1">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                You have reached the maximum unit load. Drop a course before enlisting more.
              </p>
            )}
            {currentUnits > 0 && currentUnits < maxUnits && currentUnits >= maxUnits * 0.8 && (
              <p className="text-xs text-amber-700 font-medium flex items-center gap-1">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                You are approaching the maximum unit load ({maxUnits - currentUnits} units remaining).
              </p>
            )}
          </div>

          {/* Enlist All + Finalize buttons */}
          {(() => {
            const pendingCartCount = cartRows.length; // already filtered to active term + not yet enlisted
            return (cartRows.length >= 1 || ((!isFinalized || appealBypass) && finalizeButtonVisible && myEnrolledSections.length > 0)) && (
              <div className="border-t px-4 py-3 flex gap-3 flex-wrap bg-background shrink-0">
                {pendingCartCount >= 1 && effectiveEnlistmentOpen && (!isFinalized || appealBypass) && !isDisqualified && (
                  <Button className="bg-green-600 hover:bg-green-700 text-white gap-2"
                    onClick={handleBulkEnlist}>
                    <CheckCircle className="w-4 h-4" /> Enlist All ({pendingCartCount})
                  </Button>
                )}
              {(!isFinalized || appealBypass) && finalizeButtonVisible && myEnrolledSections.length > 0 && !isDisqualified && (
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                  onClick={() => setShowFinalizeDialog(true)}>
                  <CheckSquare className="w-4 h-4" /> Finalize Enlistment
                </Button>
              )}
            </div>
          );
          })()}
        </div>
        {/* end split container */}
        </div>

        {/* ── Change/Drop Appeal Dialog ──────────────────────────────── */}
        <Dialog open={showChangeDropDialog} onOpenChange={v => { setShowChangeDropDialog(v); if (!v) setChangeDropReason(''); }}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><MessageSquare className="w-5 h-5 text-blue-600" />Change/Drop Appeal Letter</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-800 space-y-1">
                <p><strong>Purpose:</strong> Request OCS to reopen your finalized enrollment so you can add, drop, or change a subject.</p>
                <p><strong>Note:</strong> After changes are made, you must re-finalize your enrollment.</p>
              </div>
              <div><Label>Appeal Letter / Reason <span className="text-red-500">*</span></Label>
                <Textarea rows={4} placeholder="e.g. I need to drop a subject due to a schedule conflict / I missed adding a required subject..." value={changeDropReason} onChange={e => setChangeDropReason(e.target.value)} className="mt-1" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setShowChangeDropDialog(false); setChangeDropReason(''); }}>Cancel</Button>
                <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" disabled={!changeDropReason.trim() || submittingChangeDrop}
                  onClick={async () => {
                    setSubmittingChangeDrop(true);
                    try {
                      await submitChangeDropRequest(student.id, activeTerm.id, changeDropReason.trim());
                      setShowChangeDropDialog(false);
                      setChangeDropReason('');
                      toast({ title: 'Request submitted', description: 'OCS will review your appeal and notify you.' });
                    } finally { setSubmittingChangeDrop(false); }
                  }}>
                  {submittingChangeDrop ? 'Submitting...' : 'Submit Appeal'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Finalize confirmation dialog */}
        <Dialog open={showFinalizeDialog} onOpenChange={v => { setShowFinalizeDialog(v); setFinalizeConfirmText(''); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-primary">
                <CheckSquare className="w-5 h-5" /> Finalize Enlistment
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <p className="text-sm text-muted-foreground">
                This will officially enroll you in your enlisted sections for <strong>{activeTerm.name}</strong>. This action cannot be undone without OCS intervention.
              </p>
              <div className="p-3 bg-muted/20 rounded-lg text-sm space-y-1">
                {myEnrolledSections.map(sec => {
                  const course = state.courses.find(c => c.id === sec.courseId);
                  return <p key={sec.id} className="text-foreground">• {course?.code} — {course?.title} (Sec {sec.sectionCode})</p>;
                })}
                <p className="text-muted-foreground mt-2 text-xs">Total: <strong>{currentUnits}</strong> academic units</p>
              </div>
              <div>
                <Label>Type <strong>FINALIZE</strong> to confirm</Label>
                <Input className="mt-1" value={finalizeConfirmText} onChange={e => setFinalizeConfirmText(e.target.value)} placeholder="FINALIZE" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setShowFinalizeDialog(false); setFinalizeConfirmText(''); }}>Cancel</Button>
                <Button className="flex-1 bg-primary" disabled={finalizeConfirmText !== 'FINALIZE'}
                  onClick={() => { finalizeEnlistment(student.id, activeTerm.id); setShowFinalizeDialog(false); setFinalizeConfirmText(''); }}>
                  Confirm Finalization
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* SEARCH CLASS                                                 */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <div className="rounded-md overflow-hidden border border-border">
          {/* Header */}
          <div className="bg-primary text-primary-foreground px-4 py-2.5 font-bold text-sm">
            Search Class
          </div>

          <div className="p-4 space-y-3 bg-background">
            <p className="text-sm text-primary">
              Use this section to add classes on your list. All added classes will appear on the section above (Active Enlistments).
            </p>

            {/* Controls */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-8 text-sm"
                onClick={() => { setTempSearch(search); setTempSectionSearch(sectionSearch); setTempStatusFilter(statusFilter); setShowFilterDialog(true); }}>
                <Filter className="w-4 h-4" /> Open Filter/Search
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Number of items</span>
                <Select value={String(pageSize)} onValueChange={v => setPageSize(Number(v))}>
                  <SelectTrigger className="w-16 h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>



            {/* Preview conflict hint */}
            {selectedPreviewId && (() => {
              const previewSec = state.sections.find(s => s.id === selectedPreviewId);
              const previewCourse = previewSec ? state.courses.find(c => c.id === previewSec.courseId) : null;
              return (
                <div className="flex items-center gap-2 text-xs bg-primary/5 border border-primary/30 px-3 py-2 rounded-md">
                  <Info size={13} className="text-primary flex-shrink-0" />
                  <span>Previewing <strong>{previewCourse?.code}</strong> Sec <strong>{previewSec?.sectionCode}</strong> — highlighted rows show conflicts</span>
                  <button onClick={() => setSelectedPreviewId(null)} className="ml-auto text-muted-foreground hover:text-foreground"><X size={13} /></button>
                </div>
              );
            })()}

            {/* Search Results Table */}
            <div className="overflow-x-auto border rounded">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-bold w-[120px]">Code</TableHead>
                    <TableHead className="font-bold">Class Details</TableHead>
                    <TableHead className="font-bold text-center w-[110px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!filterApplied ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-10 text-muted-foreground text-sm">Use the <strong>Open Filter/Search</strong> button above to search for classes.</TableCell></TableRow>
                  ) : searchedSections.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-10 text-muted-foreground">No Data Available</TableCell></TableRow>
                  ) : searchedSections.slice(0, pageSize).map(sec => {
                    const { course, faculty, enrolled, isFull, hasOverlap, isCourseDuplicate, hasCartOverlap, isCartDuplicate, prereqCheck, coreqCheck, unitCheck, consentBlocked, hasApprovedPrerog } = getSectionInfo(sec);
                    if (!course) return null;
                    const inCart = cart.includes(sec.id);

                    const isSelectedPreview = selectedPreviewId === sec.id;
                    const previewSec = selectedPreviewId && selectedPreviewId !== sec.id ? state.sections.find(s => s.id === selectedPreviewId) : null;
                    const previewConflict = previewSec ? schedulesOverlap(sec.schedule, previewSec.schedule) : false;
                    const previewDuplicate = previewSec ? sec.courseId === previewSec.courseId : false;

                    const rowClass = isSelectedPreview ? 'bg-primary/10 cursor-pointer'
                      : previewConflict ? 'bg-orange-50 cursor-pointer'
                      : previewDuplicate ? 'bg-yellow-50 cursor-pointer'
                      : enrolled ? 'bg-green-50/50 cursor-pointer'
                      : inCart ? 'bg-orange-50/30 cursor-pointer hover:bg-orange-50/50'
                      : 'cursor-pointer hover:bg-muted/20';

                    // Resolve prereq/coreq IDs → "CODE (Title)"
                    const resolveIds = (ids?: string[]) => {
                      if (!ids?.length) return 'None';
                      return ids.map(id => { const c = state.courses.find(x => x.id === id); return c ? `${c.code} (${c.title})` : id; }).join(', ');
                    };
                    const prereqStr = resolveIds(course.prerequisites);
                    const coreqStr = resolveIds(course.corequisites);

                    let actionBtn;
                    if (enrolled) {
                      actionBtn = <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">Enlisted</Badge>;
                    } else if (isFinalized && !appealBypass) {
                      actionBtn = <Badge className="bg-gray-100 text-gray-500 border-gray-200 text-xs flex items-center gap-1"><Lock className="w-2.5 h-2.5" />Locked</Badge>;
                    } else if (isDisqualified) {
                      actionBtn = <Badge className="bg-red-100 text-red-700 border-red-200 text-xs flex items-center gap-1"><Lock className="w-2.5 h-2.5" />Blocked</Badge>;
                    } else if (inCart) {
                      actionBtn = (
                        <Button size="sm" variant="outline" className="h-8 text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
                          onClick={e => { e.stopPropagation(); removeFromCart(sec.id); }}>
                          <Trash2 className="w-3 h-3 mr-1" />Remove
                        </Button>
                      );
                    } else {
                      const hasIssues = hasOverlap || isCourseDuplicate || hasCartOverlap || isCartDuplicate || !prereqCheck.passed || !coreqCheck.passed || consentBlocked || (isFull && !hasApprovedPrerog);
                      actionBtn = (
                        <Button size="sm"
                          className={`h-8 text-xs text-white ${hasIssues ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-500 hover:bg-green-600'}`}
                          onClick={e => {
                            e.stopPropagation();
                            addToCart(sec.id);
                            toast({ title: 'Added to Cart', description: `${course.code} Sec ${sec.sectionCode} added.` });
                          }}>
                          <ShoppingCart className="w-3 h-3 mr-1" />Add to Cart
                        </Button>
                      );
                    }

                    // Day badge helper
                    const DayBadges = ({ days }: { days: string[] }) => days.length ? (
                      <div className="flex gap-1 flex-wrap">
                        {days.map(d => (
                          <span key={d} className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#8B0000] text-white text-[10px] font-bold">{d}</span>
                        ))}
                      </div>
                    ) : <span className="text-muted-foreground text-xs">TBA</span>;

                    return (
                      <TableRow key={sec.id} className={rowClass} onClick={() => setSelectedPreviewId(p => p === sec.id ? null : sec.id)}>
                        <TableCell className="align-top py-3">
                          <p className="font-bold text-[#8B0000] text-sm leading-snug">{course.code}</p>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex gap-3">
                            {/* Lecture / Main card */}
                            <div className="border rounded-md overflow-hidden flex-1 basis-0 min-w-0">
                              <div className="bg-blue-500 px-3 py-1.5 flex items-center justify-between">
                                <span className="text-white text-xs font-semibold">{sec.labSchedule ? 'Lecture / Main' : 'Class'}</span>
                                <span className="text-white text-xs font-medium">{course.units} unit{course.units !== 1 ? 's' : ''}</span>
                              </div>
                              <div className="px-3 py-2 space-y-1 text-xs">
                                <p className="font-bold text-sm">{sec.sectionCode} - ({sec.schedule.startTime} - {sec.schedule.endTime})</p>
                                <p><span className="text-muted-foreground">Faculty:</span> {faculty?.name ?? 'TBA'}</p>
                                <p><span className="text-muted-foreground">Location:</span> {sec.schedule.room ?? 'TBA'}</p>
                                <DayBadges days={sec.schedule.days} />
                                <p><span className="text-muted-foreground">Pre-Req:</span> {prereqStr}</p>
                                {course.corequisites?.length ? <p><span className="text-muted-foreground">Co-Req:</span> {coreqStr}</p> : null}
                                <div className="flex items-center justify-between pt-0.5">
                                  <div className="flex gap-1">
                                    {isFull && <Badge className="text-[10px] bg-red-100 text-red-700 border-red-200">FULL</Badge>}
                                    {isFull && hasApprovedPrerog && <Badge className="text-[10px] bg-green-100 text-green-700 border-green-200">Prerog ✓</Badge>}
                                  </div>
                                  <Badge className="bg-green-600 text-white text-xs border-0">{sec.enrolled}/{sec.slots}</Badge>
                                </div>
                              </div>
                            </div>
                            {/* Lab card or placeholder */}
                            {sec.labSchedule ? (
                              <div className="border rounded-md overflow-hidden flex-1 basis-0 min-w-0">
                                <div className="bg-blue-400 px-3 py-1.5 flex items-center justify-between">
                                  <span className="text-white text-xs font-semibold">Laboratory</span>
                                  <span className="text-white text-xs font-medium">{course.labUnits} unit{course.labUnits !== 1 ? 's' : ''}</span>
                                </div>
                                <div className="px-3 py-2 space-y-1 text-xs">
                                  <p className="font-bold text-sm">{sec.sectionCode}L - ({sec.labSchedule.startTime} - {sec.labSchedule.endTime})</p>
                                  <p><span className="text-muted-foreground">Faculty:</span> {faculty?.name ?? 'TBA'}</p>
                                  <p><span className="text-muted-foreground">Location:</span> {sec.labSchedule.room ?? 'TBA'}</p>
                                  <DayBadges days={sec.labSchedule.days} />
                                  <div className="flex justify-end pt-0.5">
                                    <Badge className="bg-green-600 text-white text-xs border-0">{sec.enrolled}/{sec.slots}</Badge>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex-1 basis-0 min-w-0 flex items-center justify-center text-xs text-muted-foreground italic border border-dashed rounded-md">
                                — No Associated Class —
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center align-top py-3" onClick={e => e.stopPropagation()}>
                          {actionBtn}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Result count */}
            {searchedSections.length > pageSize && (
              <p className="text-xs text-muted-foreground text-center">Showing {pageSize} of {searchedSections.length} results. Increase "Number of items" to see more.</p>
            )}

            {/* Footer hint */}
            <p className="text-xs italic text-center text-muted-foreground">
              No Class Results? Use the filters above to search for a class that you wish to enlist. (Tip: Be specific as possible to display an accurate result.)
            </p>
          </div>
        </div>

        {/* ── Filter/Search Dialog ─────────────────────────────────────── */}
        <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
          <DialogContent className="w-full sm:max-w-md">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Filter className="w-4 h-4 text-primary" />Filter</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>Course Code</Label>
                <Input className="mt-1" placeholder="" value={tempSearch} onChange={e => setTempSearch(e.target.value)} />
              </div>
              <div>
                <Label>Section</Label>
                <Input className="mt-1" placeholder="" value={tempSectionSearch} onChange={e => setTempSectionSearch(e.target.value)} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={tempStatusFilter || '__default__'} onValueChange={v => setTempStatusFilter(v === '__default__' ? '' : v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__default__">--</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => { setSearch(tempSearch); setSectionSearch(tempSectionSearch); setStatusFilter(tempStatusFilter); setFilterApplied(true); setShowFilterDialog(false); }}>
                  Apply Filter
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => { setTempSearch(''); setTempSectionSearch(''); setTempStatusFilter(''); setSearch(''); setSectionSearch(''); setStatusFilter(''); setFilterApplied(false); }}>
                  Clear
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </PortalLayout>
  );
}
