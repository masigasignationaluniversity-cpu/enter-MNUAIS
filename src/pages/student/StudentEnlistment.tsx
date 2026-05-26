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
  AlertTriangle, CalendarDays, CheckCircle, XCircle, Lock, Unlock, BookOpen,
  Search, Trash2, CheckSquare, RefreshCw, X, Info, Download, MessageSquare,
  ChevronUp, ChevronDown, Filter,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import type { Section, Day, Course } from '@/lib/types';
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

function ClassCard({ course, sectionCode, isLab, schedule, facultyName, enrolled, slots, consentNotes }: {
  course: Course;
  sectionCode: string;
  isLab?: boolean;
  schedule: CardSchedule;
  facultyName?: string;
  enrolled: number;
  slots: number;
  consentNotes: string[];
}) {
  const [open, setOpen] = React.useState(true);
  const prereqs = course.prerequisites?.length ? course.prerequisites.join(', ') : 'None';
  const coreqs = course.corequisites?.length ? course.corequisites.join(', ') : 'None';
  return (
    <div className="border rounded-lg flex-1 min-w-[220px] max-w-[300px] bg-background">
      <button
        type="button"
        className="w-full px-3 py-2 flex items-start justify-between gap-2 text-left hover:bg-muted/20 transition-colors rounded-t-lg"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-start gap-2">
          <BookOpen className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold text-sm leading-snug">
              {course.code} ({course.title})
            </p>
            <span className="text-xs text-muted-foreground">{course.units}{course.labUnits ? `+${course.labUnits}` : ''} units</span>
          </div>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />}
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
            {!isLab && <p>Co-Req: {coreqs} and Pre-Req: {prereqs}</p>}
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
    finalizeEnlistment, submitUnfinalizedRequest, dropUnfinalizedCourses, submitReconsiderationRequest } = useApp();
  const student = state.currentUser;
  const activeTerm = state.terms.find(t => t.isActive);
  const { toast } = useToast();

  // State
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [finalizeConfirmText, setFinalizeConfirmText] = useState('');
  const [cart, setCart] = useState<string[]>([]);
  const [search, setSearch] = useState('');       // Course code / title
  const [sectionSearch, setSectionSearch] = useState('');  // Section code
  const [statusFilter, setStatusFilter] = useState('');    // '' | 'all' | 'open'
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [pageSize, setPageSize] = useState(5);
  const [filterApplied, setFilterApplied] = useState(false);
  const [enlistWarning, setEnlistWarning] = useState<{ courseCode: string; sectionCode: string; issues: string[] } | null>(null);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [showUnfinalizedRequestDialog, setShowUnfinalizedRequestDialog] = useState(false);
  const [unfinalizedReason, setUnfinalizedReason] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [enlisting, setEnlisting] = useState<string | null>(null);
  const [showReconDialog, setShowReconDialog] = useState(false);
  const [reconReason, setReconReason] = useState('');
  const [submittingRecon, setSubmittingRecon] = useState(false);
  const [selectedPreviewId, setSelectedPreviewId] = useState<string | null>(null);
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
  }, [student?.id, activeTerm?.id]);

  useEffect(() => {
    if (!student?.id || !activeTerm?.id) return;
    localStorage.setItem(`enlistment-cart-${student.id}-${activeTerm.id}`, JSON.stringify(cart));
  }, [cart, student?.id, activeTerm?.id]);

  // Auto-remove from cart when enrolled
  useEffect(() => {
    if (!student || !activeTerm) return;
    const enrolledIds = new Set(
      state.enrollments.filter(e => e.studentId === student.id && e.termId === activeTerm.id && e.status !== 'dropped').map(e => e.sectionId)
    );
    setCart(prev => prev.filter(id => !enrolledIds.has(id)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.enrollments]);

  // Auto-drop unfinalized courses on load
  useEffect(() => {
    const term = state.terms.find(t => t.isActive);
    if (term?.unfinalizedDeadline) dropUnfinalizedCourses(term.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!student) return null;
  if (!activeTerm) {
    return (
      <PortalLayout role="student" userName={student.name}>
        <div className="text-center text-muted-foreground py-12">No active term found.</div>
      </PortalLayout>
    );
  }

  // ── Computed state ──────────────────────────────────────────────────
  const enlistmentOpen = activeTerm.controls.enlistmentOpen;
  const prerogativeOpen = activeTerm.controls.prerogativeOpen;
  const isDisqualified = student.status === 'permanently_disqualified';
  const isFinalized = !!state.finalizedEnlistments.find(f => f.studentId === student.id && f.termId === activeTerm.id);
  const finalizeButtonVisible = true; // Always show when conditions are met
  const dropDeadline = activeTerm.dropDeadline;
  const canDrop = dropDeadline ? new Date().setHours(23,59,59,999) <= new Date(dropDeadline).getTime() : enlistmentOpen;
  const pastFinalizationDeadline = (() => {
    const now = new Date();
    if (activeTerm.unfinalizedDeadline && now >= new Date(activeTerm.unfinalizedDeadline)) return true;
    if (activeTerm.finalizeWindowEnd && now >= new Date(activeTerm.finalizeWindowEnd)) return true;
    return false;
  })();

  const myEnrollments = state.enrollments.filter(e => e.studentId === student.id && e.termId === activeTerm.id && e.status !== 'dropped');
  const myEnrolledSections = myEnrollments.map(e => state.sections.find(s => s.id === e.sectionId)).filter(Boolean) as Section[];
  const availableSections = state.sections.filter(s => s.termId === activeTerm.id);
  const currentUnits = getCurrentUnits(student.id, activeTerm.id);
  const maxUnits = activeTerm.maxUnits ?? 21;

  const enrollSched = activeTerm.enrollmentSchedule;
  const today = new Date().toISOString().split('T')[0];
  const enrollSchedToday = enrollSched?.slots?.find(s => s.date === today);
  const idNum = (student.studentNumber ?? '').replace(/\D/g, '');
  const firstFour = idNum.slice(0, 4);
  const isMyEnrollDay = !!enrollSchedToday && enrollSchedToday.idPrefixes.includes(firstFour);

  // Search / filter
  const searchedSections = (filterApplied || search.trim() || sectionSearch.trim() || statusFilter)
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
    if (!enrollSched?.slots?.length) return null;
    const todaySlot = enrollSched.slots.find(s => s.date === today);
    if (!todaySlot) return 'Enrollment is not scheduled for today.';
    if (!todaySlot.idPrefixes.includes(firstFour)) return `Students with ID prefix "${firstFour}" are not scheduled today.`;
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
    return { course, faculty, enrolled: !!enrolled, isFull, hasOverlap, isCourseDuplicate, hasCartOverlap, isCartDuplicate, prereqCheck, coreqCheck, unitCheck, hasApprovedPrerog, consentBlocked };
  };

  // ── Handlers ────────────────────────────────────────────────────────
  const handleDrop = (sectionId: string) => {
    const result = dropSection(student.id, sectionId, activeTerm.id);
    toast({ title: result.success ? 'Section dropped' : 'Cannot drop', description: result.message, variant: result.success ? 'default' : 'destructive' });
  };

  const addToCart = (sectionId: string) => {
    if (isFinalized) return;
    if (!cart.includes(sectionId)) setCart(c => [...c, sectionId]);
  };

  const removeFromCart = (sectionId: string) => setCart(c => c.filter(id => id !== sectionId));

  const handleEnlist = async (sec: Section): Promise<boolean> => {
    const { isFull, hasOverlap, isCourseDuplicate, prereqCheck, coreqCheck, unitCheck, course, hasApprovedPrerog } = getSectionInfo(sec);
    if (isFinalized) { toast({ title: 'Enlistment finalized', variant: 'destructive' }); return false; }
    if (!enlistmentOpen) { toast({ title: 'Enlistment is closed', variant: 'destructive' }); return false; }
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
    if (result.success) { setCart(c => c.filter(id => id !== sec.id)); setEnlistWarning(null); }
    toast({ title: result.success ? 'Enlisted!' : 'Failed', description: result.message, variant: result.success ? 'default' : 'destructive' });
    return result.success;
  };

  const handleBulkEnlist = async () => {
    if (!enlistmentOpen) { toast({ title: 'Enlistment is closed', variant: 'destructive' }); return; }
    const schedError = checkEnrollmentSchedule();
    if (schedError) { toast({ title: 'Not your enrollment day', description: schedError, variant: 'destructive' }); return; }
    let successCount = 0; let failCount = 0;
    const toRemove: string[] = [];
    const batchEnlisted: Section[] = [];
    for (const sectionId of [...cart]) {
      const sec = state.sections.find(s => s.id === sectionId);
      if (!sec) { failCount++; continue; }
      const { isFull, hasOverlap, isCourseDuplicate, hasCartOverlap, isCartDuplicate, prereqCheck, coreqCheck, unitCheck, hasApprovedPrerog: batchPrerog } = getSectionInfo(sec);
      const course = state.courses.find(c => c.id === sec.courseId);
      const batchOverlap = batchEnlisted.some(bs => schedulesOverlap(sec.schedule, bs.schedule));
      const batchDuplicate = !!course && batchEnlisted.some(bs => bs.courseId === course.id);
      if (hasOverlap || isCourseDuplicate || hasCartOverlap || isCartDuplicate || batchOverlap || batchDuplicate || !prereqCheck.passed || !coreqCheck.passed || !unitCheck.ok || (isFull && !batchPrerog)) { failCount++; continue; }
      setEnlisting(sectionId);
      const result = await enlistSection(student.id, sectionId, activeTerm.id);
      setEnlisting(null);
      if (result.success) { successCount++; toRemove.push(sectionId); batchEnlisted.push(sec); } else { failCount++; }
    }
    setCart(c => c.filter(id => !toRemove.includes(id)));
    toast({ title: 'Bulk Enlistment Complete', description: `${successCount} enlisted${failCount > 0 ? `, ${failCount} failed` : ''}.`, variant: failCount > 0 && successCount === 0 ? 'destructive' : 'default' });
  };

  const downloadTimetable = async () => {
    const node = timetableRef.current;
    if (!node) return;
    try {
      const dataUrl = await toPng(node, { cacheBust: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `timetable-${activeTerm.name.replace(/\s+/g, '-')}.png`;
      link.href = dataUrl; link.click();
    } catch (e) { console.error('Timetable download failed:', e); }
  };

  // ── Timetable ────────────────────────────────────────────────────────
  const START_HOUR = 7; const END_HOUR = 20;
  const TOTAL_MINS = (END_HOUR - START_HOUR) * 60;
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
  const cartSectionsArr = cart.map(id => state.sections.find(s => s.id === id)).filter(Boolean) as Section[];

  const renderTimetable = () => (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        <div className="grid grid-cols-7 gap-1 mb-1">
          <div className="text-xs text-gray-400 text-right pr-2">Time</div>
          {DAYS.map(d => <div key={d} className="text-xs font-semibold text-gray-600 text-center">{DAY_LABELS[d]}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          <div className="relative" style={{ height: `${TOTAL_MINS}px` }}>
            {hours.map(h => (
              <div key={h} className="absolute right-2 text-xs text-gray-400 leading-none" style={{ top: `${(h - START_HOUR) * 60}px` }}>
                {h === 12 ? '12:00' : h < 12 ? `${h}:00` : `${h - 12}:00`}
              </div>
            ))}
          </div>
          {DAYS.map(day => (
            <div key={day} className="relative border border-gray-200 rounded bg-gray-50/50" style={{ height: `${TOTAL_MINS}px` }}>
              {hours.map(h => <div key={h} className="absolute w-full border-t border-gray-100/80" style={{ top: `${(h - START_HOUR) * 60}px` }} />)}
              {myEnrolledSections.map((sec, ci) => {
                const course = state.courses.find(c => c.id === sec.courseId);
                const color = COLORS[ci % COLORS.length];
                return (
                  <React.Fragment key={sec.id}>
                    {sec.schedule.days.includes(day) && (() => {
                      const top = toMinutes(sec.schedule.startTime) - START_HOUR * 60;
                      const height = toMinutes(sec.schedule.endTime) - toMinutes(sec.schedule.startTime);
                      return (
                        <div className={`absolute w-[95%] left-[2.5%] rounded border text-xs px-1 py-0.5 overflow-hidden ${color}`} style={{ top, height: `${height}px` }}>
                          <p className="font-bold truncate">{course?.code}</p>
                          <p className="truncate opacity-80">{sec.schedule.startTime}–{sec.schedule.endTime}</p>
                          {sec.schedule.room && <p className="truncate opacity-70">{sec.schedule.room}</p>}
                        </div>
                      );
                    })()}
                    {sec.labSchedule?.days.includes(day) && (() => {
                      const top = toMinutes(sec.labSchedule!.startTime) - START_HOUR * 60;
                      const height = toMinutes(sec.labSchedule!.endTime) - toMinutes(sec.labSchedule!.startTime);
                      return (
                        <div className={`absolute w-[88%] left-[6%] rounded border text-xs px-1 py-0.5 overflow-hidden ${color} border-dashed opacity-85`} style={{ top, height: `${height}px` }}>
                          <p className="font-bold truncate">{course?.code} Lab/Rec</p>
                          <p className="truncate opacity-80">{sec.labSchedule!.startTime}–{sec.labSchedule!.endTime}</p>
                          {sec.labSchedule!.room && <p className="truncate opacity-70">{sec.labSchedule!.room}</p>}
                        </div>
                      );
                    })()}
                  </React.Fragment>
                );
              })}
              {cartSectionsArr.map(sec => {
                const course = state.courses.find(c => c.id === sec.courseId);
                const hasConflict = myEnrolledSections.some(e => schedulesOverlap(e.schedule, sec.schedule));
                const cls = hasConflict ? 'bg-red-100/80 border-red-400 text-red-900 border-dashed' : 'bg-gray-100/90 border-gray-400 text-gray-700 border-dashed';
                return (
                  <React.Fragment key={`cart-${sec.id}`}>
                    {sec.schedule.days.includes(day) && (() => {
                      const top = toMinutes(sec.schedule.startTime) - START_HOUR * 60;
                      const height = toMinutes(sec.schedule.endTime) - toMinutes(sec.schedule.startTime);
                      return (
                        <div className={`absolute w-[95%] left-[2.5%] rounded border-2 text-xs px-1 py-0.5 overflow-hidden opacity-75 ${cls}`} style={{ top, height: `${height}px`, zIndex: 5 }}>
                          <p className="font-bold truncate">{course?.code}</p>
                          <p className="truncate opacity-80 text-[10px]">Bookmarked</p>
                        </div>
                      );
                    })()}
                    {sec.labSchedule?.days.includes(day) && (() => {
                      const top = toMinutes(sec.labSchedule!.startTime) - START_HOUR * 60;
                      const height = toMinutes(sec.labSchedule!.endTime) - toMinutes(sec.labSchedule!.startTime);
                      return (
                        <div className={`absolute w-[88%] left-[6%] rounded border-2 text-xs px-1 py-0.5 overflow-hidden opacity-65 ${cls}`} style={{ top, height: `${height}px`, zIndex: 5 }}>
                          <p className="font-bold truncate">{course?.code} Lab</p>
                          <p className="truncate opacity-80 text-[10px]">Bookmarked Lab</p>
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
          {cartSectionsArr.map(sec => {
            const course = state.courses.find(c => c.id === sec.courseId);
            return <span key={`cart-${sec.id}`} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border-2 border-dashed border-gray-400 text-gray-600 bg-gray-50"><span className="w-2 h-2 rounded-full bg-gray-400"></span>{course?.code} (Bookmarked)</span>;
          })}
        </div>
      </div>
    </div>
  );

  // ── Active Enlistment rows ───────────────────────────────────────────
  const cartRows = cart.map(id => state.sections.find(s => s.id === id)).filter(Boolean) as Section[];
  const scholasticStatus = (student as unknown as { scholasticStatus?: string }).scholasticStatus ?? 'Good Standing';

  // ── Reconsideration (PD) ─────────────────────────────────────────────
  const latestRequest = [...(state.reconsiderationRequests ?? [])]
    .filter(r => r.studentId === student.id && r.termId === activeTerm.id)
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
                <p className="text-green-100 text-xs">You are officially enrolled for {activeTerm.name}. Contact the OCS to make any changes.</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Re-Enlistment Request (after finalization deadline, not finalized, not disqualified) ─── */}
        {pastFinalizationDeadline && !isFinalized && !isDisqualified && (() => {
          const existingRequest = (state.unfinalizedRequests ?? []).find(r => r.studentId === student.id && r.termId === activeTerm.id);
          const statusStyles: Record<string, string> = { pending: 'bg-yellow-50 border-yellow-200', approved: 'bg-green-50 border-green-200', denied: 'bg-red-50 border-red-200' };
          if (existingRequest) {
            return (
              <div className={`rounded-md border ${statusStyles[existingRequest.status] ?? 'border-gray-200'}`}>
                <div className="pt-3 pb-3 px-4">
                  <p className="text-sm font-semibold">Re-Enlistment Request — {existingRequest.status.toUpperCase()}</p>
                  {existingRequest.response && <p className="text-xs mt-0.5">OCS: "{existingRequest.response}"</p>}
                </div>
              </div>
            );
          }
          return (
            <div className="rounded-md border border-orange-200 bg-orange-50">
              <div className="pt-3 pb-3 px-4 flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm text-orange-800">Need to request re-enlistment? Submit a request to the OCS.</p>
                <Button size="sm" variant="outline" className="border-orange-400 text-orange-700 hover:bg-orange-100"
                  onClick={() => setShowUnfinalizedRequestDialog(true)}>Request Re-Enlistment</Button>
              </div>
            </div>
          );
        })()}

        {/* ── Re-Enlistment Dialog ────────────────────────────────────── */}
        <Dialog open={showUnfinalizedRequestDialog} onOpenChange={v => { setShowUnfinalizedRequestDialog(v); if (!v) setUnfinalizedReason(''); }}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><MessageSquare className="w-5 h-5 text-primary" />Request Re-Enlistment</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <p className="text-sm text-muted-foreground">Explain why you were unable to finalize on time.</p>
              <div><Label>Reason <span className="text-red-500">*</span></Label>
                <Textarea rows={4} placeholder="e.g. I was unable to access the portal..." value={unfinalizedReason} onChange={e => setUnfinalizedReason(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setShowUnfinalizedRequestDialog(false); setUnfinalizedReason(''); }}>Cancel</Button>
                <Button className="flex-1 bg-primary" disabled={!unfinalizedReason.trim() || submittingRequest}
                  onClick={async () => { setSubmittingRequest(true); try { await submitUnfinalizedRequest(student.id, activeTerm.id, unfinalizedReason.trim()); setShowUnfinalizedRequestDialog(false); setUnfinalizedReason(''); toast({ title: 'Request submitted' }); } finally { setSubmittingRequest(false); } }}>
                  {submittingRequest ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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

        {/* ── Enrollment Schedule Banner ───────────────────────────────── */}
        {enrollSched?.slots?.length ? (
          <div className={`rounded-md border ${isMyEnrollDay ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
            <div className="pt-3 pb-3 px-4">
              <div className="flex items-start gap-2">
                <CalendarDays className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isMyEnrollDay ? 'text-green-600' : 'text-yellow-600'}`} />
                <div>
                  <p className={`text-sm font-semibold ${isMyEnrollDay ? 'text-green-800' : 'text-yellow-800'}`}>
                    {isMyEnrollDay ? 'Today is your enrollment day!' : 'Enrollment Schedule (by Student ID)'}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {enrollSched.slots.map(slot => (
                      <div key={slot.day} className={`text-xs px-2 py-1 rounded border ${enrollSchedToday?.day === slot.day ? 'bg-green-100 border-green-300 text-green-800 font-semibold' : 'bg-white border-gray-200 text-gray-600'}`}>
                        Day {slot.day} — {new Date(slot.date + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}: IDs {slot.idPrefixes.join(', ')}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* ── Weekly Schedule / Timetable ──────────────────────────────── */}
        <div className="rounded-md overflow-hidden border border-border">
          <div className="bg-primary text-primary-foreground px-4 py-2.5 font-bold text-sm flex items-center justify-between flex-wrap gap-2">
            <span className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4" /> Weekly Schedule
              <span className="text-xs font-normal opacity-70">{isFinalized ? '(officially enrolled)' : '(solid = enlisted, dashed = bookmarked)'}</span>
            </span>
            <Button size="sm" variant="outline" className="gap-2 h-8 text-xs bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/20" onClick={downloadTimetable}>
              <Download className="w-3 h-3" /> Download PNG
            </Button>
          </div>
          <div className="p-4 bg-background">
            <div ref={timetableRef} className="bg-white p-1">
              {myEnrolledSections.length === 0 && cartSectionsArr.length === 0
                ? <p className="text-muted-foreground text-center py-6 text-sm">No sections to display.</p>
                : renderTimetable()}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* ACTIVE ENLISTMENT                                            */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <div className="rounded-md overflow-hidden border border-border">
          {/* Header */}
          <div className="bg-primary text-primary-foreground px-4 py-2.5 font-bold text-sm flex items-center justify-between">
            <span>Active Enlistment</span>
            <div className="flex items-center gap-2">
              {enlistmentOpen && !isFinalized && !isDisqualified && (
                <Badge className="bg-primary-foreground/20 text-primary-foreground text-xs">
                  {activeTerm.name}
                </Badge>
              )}
              {isFinalized
                ? <Badge className="bg-green-400 text-white text-xs">Finalized</Badge>
                : !enlistmentOpen
                  ? <Badge className="bg-red-400 text-white text-xs">Enlistment Closed</Badge>
                  : isDisqualified
                    ? <Badge className="bg-red-400 text-white text-xs">Locked</Badge>
                    : <Badge className="bg-green-400 text-white text-xs">Enlistment Open</Badge>}
            </div>
          </div>

          {/* Active Enlistment Table */}
          <div className="overflow-x-auto bg-background">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-bold w-[55%]">Class</TableHead>
                  <TableHead className="font-bold w-[18%]">Status</TableHead>
                  <TableHead className="font-bold w-[27%]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* ── Bookmarked (cart) rows ── */}
                {cartRows.map(sec => {
                  const course = state.courses.find(c => c.id === sec.courseId);
                  const faculty = state.users.find(u => u.id === sec.facultyId);
                  const { isFull, hasApprovedPrerog: cartItemHasPrerog } = getSectionInfo(sec);
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
                        <div className="flex gap-3 flex-wrap">
                          <ClassCard
                            course={course}
                            sectionCode={sec.sectionCode}
                            schedule={sec.schedule}
                            facultyName={faculty?.name}
                            enrolled={sec.enrolled}
                            slots={sec.slots}
                            consentNotes={consentNotes}
                          />
                          {sec.labSchedule ? (
                            <ClassCard
                              course={course}
                              sectionCode={sec.sectionCode + 'L'}
                              isLab
                              schedule={sec.labSchedule}
                              facultyName={faculty?.name}
                              enrolled={sec.enrolled}
                              slots={sec.slots}
                              consentNotes={[]}
                            />
                          ) : (
                            <div className="flex-1 min-w-[200px] flex items-center justify-center text-muted-foreground italic text-sm py-4">
                              -- No associated class --
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 align-top">
                        <div className="flex flex-col gap-1">
                          <span className="italic text-sm text-muted-foreground">Bookmarked</span>
                          {isFull && !cartItemHasPrerog && <p className="text-xs text-red-500 font-medium">Section Full</p>}
                          {isFull && cartItemHasPrerog && <p className="text-xs text-green-600 font-medium">Full — Prerog ✓</p>}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 align-top">
                        <div className="flex flex-col items-start gap-2">
                          <Button size="sm"
                            className="bg-green-500 hover:bg-green-600 text-white h-7 text-xs min-w-[70px] disabled:opacity-40"
                            disabled={isEnlisting || !enlistmentOpen || isFinalized || isDisqualified}
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
                        <div className="flex gap-3 flex-wrap">
                          <ClassCard
                            course={course}
                            sectionCode={sec.sectionCode}
                            schedule={sec.schedule}
                            facultyName={faculty?.name}
                            enrolled={sec.enrolled}
                            slots={sec.slots}
                            consentNotes={consentNotes}
                          />
                          {sec.labSchedule ? (
                            <ClassCard
                              course={course}
                              sectionCode={sec.sectionCode + 'L'}
                              isLab
                              schedule={sec.labSchedule}
                              facultyName={faculty?.name}
                              enrolled={sec.enrolled}
                              slots={sec.slots}
                              consentNotes={[]}
                            />
                          ) : (
                            <div className="flex-1 min-w-[200px] flex items-center justify-center text-muted-foreground italic text-sm py-4">
                              -- No associated class --
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 align-top">
                        {isFinalized
                          ? <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">Finalized</Badge>
                          : <Badge className="bg-green-100 text-green-800 border-green-200 text-xs italic">Enlisted</Badge>}
                      </TableCell>
                      <TableCell className="py-3 align-top">
                        <Button size="sm" variant="destructive" className="h-7 text-xs min-w-[70px] disabled:opacity-40"
                          disabled={isFinalized || !canDrop}
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
          <div className="border-t bg-muted/10 px-4 py-2 flex flex-wrap gap-x-8 gap-y-1 text-xs text-muted-foreground">
            <span>Scholastic Standing: <strong>{scholasticStatus}</strong></span>
            <span>Allowed Max Units: <strong>{maxUnits}</strong></span>
            <span>Enlisted Academic Units: <strong>{currentUnits}</strong></span>
          </div>

          {/* Enlist All + Finalize buttons */}
          {(cartRows.length >= 1 || (!isFinalized && finalizeButtonVisible && myEnrolledSections.length > 0)) && (
            <div className="border-t px-4 py-3 flex gap-3 flex-wrap bg-background">
              {cartRows.length >= 1 && enlistmentOpen && !isFinalized && !isDisqualified && (
                <Button className="bg-green-600 hover:bg-green-700 text-white gap-2"
                  onClick={handleBulkEnlist}>
                  <CheckCircle className="w-4 h-4" /> Enlist All ({cartRows.length})
                </Button>
              )}
              {!isFinalized && finalizeButtonVisible && myEnrolledSections.length > 0 && !isDisqualified && (
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                  onClick={() => setShowFinalizeDialog(true)}>
                  <CheckSquare className="w-4 h-4" /> Finalize Enlistment
                </Button>
              )}
            </div>
          )}
        </div>

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
                onClick={() => setShowFilterDialog(true)}>
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

            {/* Active filter tags */}
            {(search || sectionSearch || statusFilter) && (
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="text-muted-foreground">Filters:</span>
                {search && <Badge variant="outline" className="gap-1">Code: {search} <button onClick={() => setSearch('')}><X className="w-3 h-3" /></button></Badge>}
                {sectionSearch && <Badge variant="outline" className="gap-1">Sec: {sectionSearch} <button onClick={() => setSectionSearch('')}><X className="w-3 h-3" /></button></Badge>}
                {statusFilter && statusFilter !== '__default__' && <Badge variant="outline" className="gap-1 capitalize">Status: {statusFilter} <button onClick={() => setStatusFilter('')}><X className="w-3 h-3" /></button></Badge>}
                <button className="text-red-500 hover:underline text-xs" onClick={() => { setSearch(''); setSectionSearch(''); setStatusFilter(''); setFilterApplied(false); }}>Clear all</button>
              </div>
            )}

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
                    <TableHead className="font-bold">Code</TableHead>
                    <TableHead className="font-bold">Class Details</TableHead>
                    <TableHead className="font-bold text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!filterApplied && !search.trim() ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-10 text-muted-foreground">No Data Available</TableCell></TableRow>
                  ) : searchedSections.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-10 text-muted-foreground">No Data Available</TableCell></TableRow>
                  ) : searchedSections.slice(0, pageSize).map(sec => {
                    const { course, faculty, enrolled, isFull, hasOverlap, isCourseDuplicate, hasCartOverlap, isCartDuplicate, prereqCheck, coreqCheck, unitCheck, consentBlocked, hasApprovedPrerog } = getSectionInfo(sec);
                    if (!course) return null;
                    const inCart = cart.includes(sec.id);
                    const schedStr = `${sec.schedule.days.join('')} ${sec.schedule.startTime}–${sec.schedule.endTime}`;
                    const labStr = sec.labSchedule ? ` | Lab: ${sec.labSchedule.days.join('')} ${sec.labSchedule.startTime}–${sec.labSchedule.endTime}` : '';

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

                    let actionBtn;
                    if (enrolled) {
                      actionBtn = <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">Enlisted</Badge>;
                    } else if (isFinalized) {
                      actionBtn = <Badge className="bg-gray-100 text-gray-500 border-gray-200 text-xs flex items-center gap-1"><Lock className="w-2.5 h-2.5" />Locked</Badge>;
                    } else if (isDisqualified) {
                      actionBtn = <Badge className="bg-red-100 text-red-700 border-red-200 text-xs flex items-center gap-1"><Lock className="w-2.5 h-2.5" />Blocked</Badge>;
                    } else if (inCart) {
                      actionBtn = (
                        <Button size="sm" variant="outline" className="h-7 text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
                          onClick={e => { e.stopPropagation(); removeFromCart(sec.id); }}>
                          <Trash2 className="w-3 h-3 mr-1" />Remove
                        </Button>
                      );
                    } else {
                      const hardBlocked = hasOverlap || isCourseDuplicate || hasCartOverlap || isCartDuplicate || !prereqCheck.passed || consentBlocked;
                      actionBtn = (
                        <Button size="sm" variant="outline"
                          className={`h-7 text-xs ${hardBlocked ? 'border-red-300 text-red-600 hover:bg-red-50' : (isFull && !hasApprovedPrerog) ? 'border-purple-300 text-purple-700 hover:bg-purple-50' : 'border-blue-300 text-blue-700 hover:bg-blue-50'}`}
                          onClick={e => {
                            e.stopPropagation();
                            if (hardBlocked) {
                              const issues: string[] = [];
                              if (hasOverlap) issues.push('Schedule conflict with enlisted course.');
                              if (isCourseDuplicate) issues.push('Already enlisted in a section of this course.');
                              if (hasCartOverlap) issues.push('Schedule conflict with a bookmarked section.');
                              if (isCartDuplicate) issues.push('Same course is already bookmarked.');
                              if (!prereqCheck.passed) issues.push(`Prerequisites missing: ${prereqCheck.missing.join(', ')}`);
                              if (!coreqCheck.passed) issues.push(`Corequisites missing: ${coreqCheck.missing.join(', ')}`);
                              if (consentBlocked) issues.push('Consent required (COI / Dept / OCS).');
                              showWarning(course.code, sec.sectionCode, issues);
                            } else if (isFull && hasApprovedPrerog) {
                              addToCart(sec.id);
                              toast({ title: 'Bookmarked', description: `${course.code} Sec ${sec.sectionCode} added — prerogative approved, you can enlist.` });
                            } else if (isFull) {
                              toast({ title: 'Section Full', description: 'Go to Prerogatives to request enlistment.', variant: 'default' });
                              navigate('/student/prerogatives');
                            } else if (!unitCheck.ok) {
                              toast({ title: 'Unit limit exceeded', variant: 'destructive' });
                            } else {
                              addToCart(sec.id);
                              toast({ title: 'Bookmarked', description: `${course.code} Sec ${sec.sectionCode} added to Active Enlistment.` });
                            }
                          }}>
                          {hardBlocked ? 'Cannot Add' : (isFull && !hasApprovedPrerog) ? <><Unlock className="w-3 h-3 mr-1" />Prerogs</> : 'Add'}
                        </Button>
                      );
                    }

                    return (
                      <TableRow key={sec.id} className={rowClass} onClick={() => setSelectedPreviewId(p => p === sec.id ? null : sec.id)}>
                        <TableCell>
                          <p className="font-mono font-semibold text-primary text-sm">{course.code}</p>
                          <p className="text-xs text-muted-foreground">{sec.sectionCode}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium truncate max-w-[200px]">{course.title}</p>
                          <p className="text-xs text-muted-foreground">{schedStr}{labStr}</p>
                          <p className="text-xs text-muted-foreground">{faculty?.name ?? '—'} • {sec.enrolled}/{sec.slots} slots • {course.units}{course.labUnits ? `+${course.labUnits}` : ''} units</p>
                          {isFull && <Badge className="text-[10px] bg-red-100 text-red-700 border-red-200 mt-0.5">FULL</Badge>}
                          {isFull && hasApprovedPrerog && <Badge className="text-[10px] bg-green-100 text-green-700 border-green-200 mt-0.5">Prerog Approved</Badge>}
                        </TableCell>
                        <TableCell className="text-center" onClick={e => e.stopPropagation()}>
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
                <Input className="mt-1" placeholder="" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div>
                <Label>Section</Label>
                <Input className="mt-1" placeholder="" value={sectionSearch} onChange={e => setSectionSearch(e.target.value)} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={statusFilter || '__default__'} onValueChange={v => setStatusFilter(v === '__default__' ? '' : v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__default__">--</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => { setFilterApplied(true); setShowFilterDialog(false); }}>
                  Apply Filter
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => { setSearch(''); setSectionSearch(''); setStatusFilter(''); setFilterApplied(false); }}>
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
