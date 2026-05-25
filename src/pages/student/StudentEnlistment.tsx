import React, { useState, useEffect } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, CalendarDays, CheckCircle, XCircle, Lock, Unlock, BookOpen, ShoppingCart, Search, Trash2, CheckSquare, RefreshCw, X } from 'lucide-react';
import type { Section, Day } from '@/lib/types';
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

function toMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function schedulesOverlap(a: { days: Day[]; startTime: string; endTime: string }, b: { days: Day[]; startTime: string; endTime: string }) {
  const shared = a.days.some(d => b.days.includes(d));
  if (!shared) return false;
  return toMinutes(a.startTime) < toMinutes(b.endTime) && toMinutes(a.endTime) > toMinutes(b.startTime);
}

export default function StudentEnlistment() {
  const { state, enlistSection, dropSection, requestPrerogative, checkPrerequisites, checkCorequisites, getCurrentUnits, finalizeEnlistment, loadPrerogatives } = useApp();
  const student = state.currentUser;
  const activeTerm = state.terms.find(t => t.isActive);
  const { toast } = useToast();

  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [finalizeConfirmText, setFinalizeConfirmText] = useState('');

  const [prgSearch, setPrgSearch] = useState('');
  const [requestingPrgSectionId, setRequestingPrgSectionId] = useState<string | null>(null);
  const [prgReason, setPrgReason] = useState('');
  const [activeTab, setActiveTab] = useState('search');
  const [cart, setCart] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [enlistWarning, setEnlistWarning] = useState<{
    courseCode: string;
    sectionCode: string;
    issues: string[];
  } | null>(null);

  // Clear warning when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setEnlistWarning(null);
  };

  // Persist cart to localStorage per student+term
  useEffect(() => {
    if (!student?.id || !activeTerm?.id) return;
    const key = `enlistment-cart-${student.id}-${activeTerm.id}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try { setCart(JSON.parse(stored)); } catch { /* ignore */ }
    }
  }, [student?.id, activeTerm?.id]);

  useEffect(() => {
    if (!student?.id || !activeTerm?.id) return;
    localStorage.setItem(`enlistment-cart-${student.id}-${activeTerm.id}`, JSON.stringify(cart));
  }, [cart, student?.id, activeTerm?.id]);

  // Auto-remove from cart when a section gets enrolled (e.g. via approved prerogative)
  useEffect(() => {
    if (!student || !activeTerm) return;
    const enrolledIds = new Set(
      state.enrollments
        .filter(e => e.studentId === student.id && e.termId === activeTerm.id && e.status !== 'dropped')
        .map(e => e.sectionId)
    );
    setCart(prev => prev.filter(id => !enrolledIds.has(id)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.enrollments]);

  if (!student) return null;

  if (!activeTerm) {
    return (
      <PortalLayout role="student" userName={student.name}>
        <div className="p-6 text-center text-gray-400 py-12">No active term found.</div>
      </PortalLayout>
    );
  }

  const enlistmentOpen = activeTerm.controls.enlistmentOpen;
  const prerogativeOpen = activeTerm.controls.prerogativeOpen;

  const isFinalized = !!state.finalizedEnlistments.find(f => f.studentId === student.id && f.termId === activeTerm.id);
  const finalizeButtonVisible = !activeTerm.finalizeWindowStart || new Date() >= new Date(activeTerm.finalizeWindowStart);
  const dropDeadline = activeTerm.dropDeadline;
  const canDrop = (() => {
    if (dropDeadline) {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      return today <= new Date(dropDeadline);
    }
    return enlistmentOpen;
  })();

  const myEnrollments = state.enrollments.filter(e => e.studentId === student.id && e.termId === activeTerm.id && e.status !== 'dropped');
  const myEnrolledSections = myEnrollments.map(e => state.sections.find(s => s.id === e.sectionId)).filter(Boolean) as Section[];

  const availableSections = state.sections.filter(s => s.termId === activeTerm.id);

  // Apply search filter
  const searchedSections = search.trim()
    ? availableSections.filter(s => {
        const course = state.courses.find(c => c.id === s.courseId);
        const q = search.toLowerCase();
        return (
          course?.code.toLowerCase().includes(q) ||
          course?.title.toLowerCase().includes(q) ||
          s.sectionCode.toLowerCase().includes(q)
        );
      })
    : availableSections;

  const currentUnits = getCurrentUnits(student.id, activeTerm.id);
  const maxUnits = activeTerm.maxUnits ?? 21;

  const checkOverlap = (sec: Section) => {
    return myEnrolledSections.some(existing =>
      schedulesOverlap(existing.schedule, sec.schedule) ||
      (sec.labSchedule && schedulesOverlap(existing.schedule, sec.labSchedule)) ||
      (existing.labSchedule && schedulesOverlap(existing.labSchedule, sec.schedule))
    );
  };

  const getSectionInfo = (sec: Section) => {
    const course = state.courses.find(c => c.id === sec.courseId);
    const faculty = state.users.find(u => u.id === sec.facultyId);
    const enrolled = myEnrollments.find(e => e.sectionId === sec.id);
    const isFull = sec.enrolled >= sec.slots;
    const hasOverlap = !enrolled && checkOverlap(sec);

    // Duplicate course — same courseId already enlisted this term (different section)
    const isCourseDuplicate = !enrolled && course
      ? myEnrollments.some(e => {
          const es = state.sections.find(s => s.id === e.sectionId);
          return es?.courseId === course.id;
        })
      : false;

    const prereqCheck = course ? checkPrerequisites(student.id, course.id) : { passed: true, missing: [] };
    const coreqCheck = course ? checkCorequisites(student.id, course.id, activeTerm.id) : { passed: true, missing: [] };

    const unitCheck = (() => {
      if (!course || course.isPE || course.isNSTP) return { ok: true };
      const adding = course.units + (course.labUnits ?? 0);
      return { ok: currentUnits + adding <= maxUnits, adding };
    })();

    const existingPrerog = state.prerogatives.find(p => p.studentId === student.id && p.sectionId === sec.id && p.termId === activeTerm.id);

    // Consent requirement checks
    const consentRecord = state.consents.find(c => c.studentId === student.id && c.sectionId === sec.id && c.termId === activeTerm.id);
    const needsCOI = (course?.requiresCOI ?? false) && consentRecord?.coiStatus !== 'approved';
    const needsDC = (course?.requiresDeptConsent ?? false) && consentRecord?.deptConsentStatus !== 'approved';
    const needsOCS = (course?.requiresOCSConsent ?? false) && consentRecord?.ocsConsentStatus !== 'approved';
    const consentBlocked = needsCOI || needsDC || needsOCS;

    return { course, faculty, enrolled: !!enrolled, isFull, hasOverlap, isCourseDuplicate, prereqCheck, coreqCheck, unitCheck, existingPrerog, consentBlocked, needsCOI, needsDC, needsOCS };
  };

  // Check enrollment schedule (returns error msg or null)
  const checkEnrollmentSchedule = (): string | null => {
    const enrollSched = activeTerm.enrollmentSchedule;
    if (!enrollSched?.slots?.length) return null; // No schedule set = open to all
    const today = new Date().toISOString().split('T')[0];
    const todaySlot = enrollSched.slots.find(s => s.date === today);
    if (!todaySlot) {
      return 'Enrollment is not scheduled for today. Check your enrollment schedule.';
    }
    const idNum = (student.studentNumber ?? '').replace(/\D/g, '');
    const firstFour = idNum.slice(0, 4);
    if (!todaySlot.idPrefixes.includes(firstFour)) {
      return `Students with ID prefix "${firstFour}" are not scheduled to enroll today.`;
    }
    return null;
  };

  const handleEnlist = (sec: Section): boolean => {
    const { isFull, hasOverlap, isCourseDuplicate, prereqCheck, coreqCheck, unitCheck, course } = getSectionInfo(sec);
    if (isFinalized) {
      toast({ title: 'Enlistment finalized', description: 'Your enlistment has been finalized. No more changes are allowed.', variant: 'destructive' });
      return false;
    }
    if (!enlistmentOpen) {
      toast({ title: 'Enlistment is closed', variant: 'destructive' });
      return false;
    }

    const schedError = checkEnrollmentSchedule();
    if (schedError) {
      toast({ title: 'Not your enrollment day', description: schedError, variant: 'destructive' });
      return false;
    }

    if (hasOverlap) {
      setEnlistWarning({
        courseCode: course?.code ?? sec.sectionCode,
        sectionCode: sec.sectionCode,
        issues: ['Schedule conflict: this section overlaps with a course already in your enlisted schedule.'],
      });
      return false;
    }
    if (isCourseDuplicate) {
      setEnlistWarning({
        courseCode: course?.code ?? sec.sectionCode,
        sectionCode: sec.sectionCode,
        issues: ['Duplicate course: you are already enlisted in a section of this same course.'],
      });
      return false;
    }
    if (!prereqCheck.passed) {
      setEnlistWarning({
        courseCode: course?.code ?? sec.sectionCode,
        sectionCode: sec.sectionCode,
        issues: [`Prerequisites not satisfied — missing: ${prereqCheck.missing.join(', ')}`],
      });
      return false;
    }
    if (!coreqCheck.passed) {
      setEnlistWarning({
        courseCode: course?.code ?? sec.sectionCode,
        sectionCode: sec.sectionCode,
        issues: [`Corequisites not satisfied — you must also enlist: ${coreqCheck.missing.join(', ')}`],
      });
      return false;
    }
    if (!unitCheck.ok) {
      toast({ title: 'Unit limit exceeded', description: `Adding this course would exceed your ${maxUnits} unit limit.`, variant: 'destructive' });
      return false;
    }
    if (isFull) {
      if (prerogativeOpen) {
        toast({ title: 'Section is full', description: 'Go to the Prerogatives tab to submit a request.', variant: 'default' });
        setActiveTab('prerogatives');
      } else {
        toast({ title: 'Section is full', description: 'Prerogatives are not currently open.', variant: 'destructive' });
      }
      return false;
    }
    const result = enlistSection(student.id, sec.id, activeTerm.id);
    if (result.success) {
      setCart(c => c.filter(id => id !== sec.id)); // Remove from cart on success
      setEnlistWarning(null);
    }
    toast({ title: result.success ? 'Enlisted!' : 'Error', description: result.message, variant: result.success ? 'default' : 'destructive' });
    return result.success;
  };

  const handleBulkEnlist = () => {
    if (!enlistmentOpen) {
      toast({ title: 'Enlistment is closed', variant: 'destructive' });
      return;
    }
    const schedError = checkEnrollmentSchedule();
    if (schedError) {
      toast({ title: 'Not your enrollment day', description: schedError, variant: 'destructive' });
      return;
    }
    let successCount = 0;
    let failCount = 0;
    const toRemove: string[] = [];
    for (const sectionId of [...cart]) {
      const sec = state.sections.find(s => s.id === sectionId);
      if (!sec) { failCount++; continue; }
      const { isFull, hasOverlap, isCourseDuplicate, prereqCheck, coreqCheck, unitCheck } = getSectionInfo(sec);
      if (hasOverlap || isCourseDuplicate || !prereqCheck.passed || !coreqCheck.passed || !unitCheck.ok || isFull) {
        failCount++;
        continue;
      }
      const result = enlistSection(student.id, sectionId, activeTerm.id);
      if (result.success) {
        successCount++;
        toRemove.push(sectionId);
      } else {
        failCount++;
      }
    }
    setCart(c => c.filter(id => !toRemove.includes(id)));
    toast({
      title: `Bulk Enlistment Complete`,
      description: `${successCount} enlisted successfully${failCount > 0 ? `, ${failCount} failed` : ''}.`,
      variant: failCount > 0 && successCount === 0 ? 'destructive' : 'default',
    });
  };

  const handleDrop = (sectionId: string) => {
    const result = dropSection(student.id, sectionId, activeTerm.id);
    if (result.success) {
      toast({ title: 'Section dropped' });
    } else {
      toast({ title: 'Cannot drop', description: result.message, variant: 'destructive' });
    }
  };

  const handlePrerogative = () => {
    if (!requestingPrgSectionId || !prgReason.trim()) return;
    requestPrerogative(student.id, requestingPrgSectionId, activeTerm.id, prgReason.trim());
    toast({ title: 'Prerogative requested', description: 'Your request has been sent to the faculty for review.' });
    setRequestingPrgSectionId(null);
    setPrgReason('');
  };

  const addToCart = (sectionId: string) => {
    if (isFinalized) return;
    if (!cart.includes(sectionId)) {
      setCart(c => [...c, sectionId]);
      setEnlistWarning(null);
    }
  };

  const removeFromCart = (sectionId: string) => {
    setCart(c => c.filter(id => id !== sectionId));
  };

  // Timetable
  const START_HOUR = 7;
  const END_HOUR = 20;
  const TOTAL_MINS = (END_HOUR - START_HOUR) * 60;

  const renderTimetable = (cartSections: Section[] = []) => {
    const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
    return (
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          <div className="grid grid-cols-7 gap-1 mb-1">
            <div className="text-xs text-gray-400 text-right pr-2">Time</div>
            {DAYS.map(d => (
              <div key={d} className="text-xs font-semibold text-gray-600 text-center">{DAY_LABELS[d]}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            <div className="relative" style={{ height: `${TOTAL_MINS}px` }}>
              {hours.map(h => (
                <div key={h} className="absolute right-2 text-xs text-gray-400 leading-none" style={{ top: `${(h - START_HOUR) * 60}px` }}>
                  {h === 12 ? '12:00' : h < 12 ? `${h}:00` : `${h - 12}:00`}
                </div>
              ))}
            </div>
            {DAYS.map((day) => (
              <div key={day} className="relative border border-gray-200 rounded bg-gray-50/50" style={{ height: `${TOTAL_MINS}px` }}>
                {hours.map(h => (
                  <div key={h} className="absolute w-full border-t border-gray-100/80" style={{ top: `${(h - START_HOUR) * 60}px` }} />
                ))}
                {/* Enlisted sections (solid) */}
                {myEnrolledSections.map((sec, ci) => {
                  const course = state.courses.find(c => c.id === sec.courseId);
                  const color = COLORS[ci % COLORS.length];
                  const blocks = [];
                  if (sec.schedule.days.includes(day)) {
                    const top = toMinutes(sec.schedule.startTime) - START_HOUR * 60;
                    const height = toMinutes(sec.schedule.endTime) - toMinutes(sec.schedule.startTime);
                    blocks.push(
                      <div key={`lec-${sec.id}`} className={`absolute w-[95%] left-[2.5%] rounded border text-xs px-1 py-0.5 overflow-hidden ${color}`} style={{ top, height: `${height}px` }}>
                        <p className="font-bold truncate">{course?.code}</p>
                        <p className="truncate opacity-80">{sec.schedule.startTime}–{sec.schedule.endTime}</p>
                        {sec.schedule.room && <p className="truncate opacity-70">{sec.schedule.room}</p>}
                      </div>
                    );
                  }
                  if (sec.labSchedule && sec.labSchedule.days.includes(day)) {
                    const top = toMinutes(sec.labSchedule.startTime) - START_HOUR * 60;
                    const height = toMinutes(sec.labSchedule.endTime) - toMinutes(sec.labSchedule.startTime);
                    blocks.push(
                      <div key={`lab-${sec.id}`} className={`absolute w-[95%] left-[2.5%] rounded border text-xs px-1 py-0.5 overflow-hidden ${color} opacity-80`} style={{ top, height: `${height}px` }}>
                        <p className="font-bold truncate">{course?.code} Lab</p>
                        <p className="truncate opacity-80">{sec.labSchedule.startTime}–{sec.labSchedule.endTime}</p>
                      </div>
                    );
                  }
                  return blocks;
                })}
                {/* Cart sections (dashed overlay) */}
                {cartSections.map((sec) => {
                  const course = state.courses.find(c => c.id === sec.courseId);
                  const hasConflict = myEnrolledSections.some(existing =>
                    schedulesOverlap(existing.schedule, sec.schedule) ||
                    (sec.labSchedule && schedulesOverlap(existing.schedule, sec.labSchedule)) ||
                    (existing.labSchedule && schedulesOverlap(existing.labSchedule, sec.schedule))
                  );
                  const cartStyle = hasConflict
                    ? 'bg-red-100/80 border-red-400 text-red-900 border-dashed'
                    : 'bg-gray-100/90 border-gray-400 text-gray-700 border-dashed';
                  const blocks = [];
                  if (sec.schedule.days.includes(day)) {
                    const top = toMinutes(sec.schedule.startTime) - START_HOUR * 60;
                    const height = toMinutes(sec.schedule.endTime) - toMinutes(sec.schedule.startTime);
                    blocks.push(
                      <div key={`cart-lec-${sec.id}`} className={`absolute w-[95%] left-[2.5%] rounded border-2 text-xs px-1 py-0.5 overflow-hidden opacity-75 ${cartStyle}`} style={{ top, height: `${height}px`, zIndex: 5 }}>
                        <p className="font-bold truncate">{course?.code}</p>
                        <p className="truncate opacity-80 text-[10px]">Cart • {sec.schedule.startTime}–{sec.schedule.endTime}</p>
                      </div>
                    );
                  }
                  if (sec.labSchedule && sec.labSchedule.days.includes(day)) {
                    const top = toMinutes(sec.labSchedule.startTime) - START_HOUR * 60;
                    const height = toMinutes(sec.labSchedule.endTime) - toMinutes(sec.labSchedule.startTime);
                    blocks.push(
                      <div key={`cart-lab-${sec.id}`} className={`absolute w-[95%] left-[2.5%] rounded border-2 text-xs px-1 py-0.5 overflow-hidden opacity-75 ${cartStyle}`} style={{ top, height: `${height}px`, zIndex: 5 }}>
                        <p className="font-bold truncate">{course?.code} Lab</p>
                        <p className="truncate opacity-80 text-[10px]">Cart</p>
                      </div>
                    );
                  }
                  return blocks;
                })}
              </div>
            ))}
          </div>
          {/* Legend */}
          <div className="mt-3 flex flex-wrap gap-2">
            {myEnrolledSections.map((sec, ci) => {
              const course = state.courses.find(c => c.id === sec.courseId);
              const color = COLORS[ci % COLORS.length];
              return (
                <span key={sec.id} className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${color}`}>
                  <span className="w-2 h-2 rounded-full bg-current opacity-60"></span>
                  {course?.code} Sec {sec.sectionCode}
                </span>
              );
            })}
            {cartSections.map((sec) => {
              const course = state.courses.find(c => c.id === sec.courseId);
              const hasConflict = myEnrolledSections.some(existing =>
                schedulesOverlap(existing.schedule, sec.schedule)
              );
              return (
                <span key={`cart-${sec.id}`} className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border-2 border-dashed ${hasConflict ? 'border-red-400 text-red-700 bg-red-50' : 'border-gray-400 text-gray-600 bg-gray-50'}`}>
                  <ShoppingCart className="w-2.5 h-2.5" />
                  {course?.code} (Cart)
                </span>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Enrollment schedule info for display
  const enrollSched = activeTerm.enrollmentSchedule;
  const enrollSchedToday = enrollSched?.slots?.find(s => s.date === new Date().toISOString().split('T')[0]);
  const idNum = (student.studentNumber ?? '').replace(/\D/g, '');
  const firstFour = idNum.slice(0, 4);
  const isMyEnrollDay = !enrollSched?.slots?.length || (!!enrollSchedToday && enrollSchedToday.idPrefixes.includes(firstFour));

  return (
    <PortalLayout role="student" userName={student.name}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Enlistment</h1>
            <p className="text-gray-600 mt-1">{activeTerm.name}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              {isFinalized
                ? <Badge className="bg-green-700 text-white flex items-center gap-1"><CheckSquare className="w-3 h-3" />Enlistment Finalized</Badge>
                : enlistmentOpen
                  ? <Badge className="bg-green-100 text-green-800">Enlistment Open</Badge>
                  : <Badge className="bg-red-100 text-red-800 flex items-center gap-1"><Lock className="w-3 h-3" />Enlistment Closed</Badge>}
              {prerogativeOpen && <Badge className="bg-purple-100 text-purple-800 flex items-center gap-1"><Unlock className="w-3 h-3" />Prerogatives Open</Badge>}
              {cart.length > 0 && (
                <Badge className="bg-orange-100 text-orange-800 flex items-center gap-1">
                  <ShoppingCart className="w-3 h-3" />{cart.length} in cart
                </Badge>
              )}
              {!isFinalized && finalizeButtonVisible && (
                <>
                  <Button
                    size="sm"
                    className="bg-green-700 hover:bg-green-800 text-white gap-1.5"
                    disabled={myEnrolledSections.length === 0}
                    onClick={() => setShowFinalizeDialog(true)}
                  >
                    <CheckSquare className="w-3.5 h-3.5" /> Finalize Enlistment
                  </Button>

                  <Dialog open={showFinalizeDialog} onOpenChange={v => { setShowFinalizeDialog(v); if (!v) setFinalizeConfirmText(''); }}>
                    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <CheckSquare className="w-5 h-5 text-green-700" />
                          Finalize Your Enrollment
                        </DialogTitle>
                      </DialogHeader>

                      {/* T&C scroll box */}
                      <div className="border rounded-lg p-4 bg-muted/30 max-h-56 overflow-y-auto text-xs space-y-2 text-muted-foreground">
                        <p className="font-semibold text-foreground text-sm">TERMS AND CONDITIONS OF ENROLLMENT</p>
                        <p>By finalizing your enlistment, you acknowledge and agree to the following:</p>
                        <ol className="list-decimal list-inside space-y-1.5 ml-1">
                          <li>All enlisted courses listed below are correct and you are responsible for completing them this semester.</li>
                          <li>Your enlistment will be <span className="font-semibold text-foreground">officially converted to enrollment</span> and will be visible to your faculty members.</li>
                          <li>Changes after finalization require formal approval from the Office of the College Secretary (OCS).</li>
                          <li>You confirm that you have met all prerequisites and requisites for all enlisted courses.</li>
                          <li>Dropping any course after the official drop deadline may result in a grade of DRP or WD.</li>
                          <li>You have verified your schedule for conflicts and errors.</li>
                          <li>This action <span className="font-semibold text-foreground">cannot be undone by you</span> — only the OCS can reverse it.</li>
                        </ol>
                        <div className="pt-2 border-t border-border/50">
                          <p className="font-semibold text-foreground mb-1">Courses to be officially enrolled:</p>
                          {myEnrolledSections.map(sec => {
                            const c = state.courses.find(x => x.id === sec.courseId);
                            return (
                              <p key={sec.id} className="font-mono text-xs">
                                {c?.code} — {c?.title} ({c?.units} units) · Sec {sec.sectionCode}
                              </p>
                            );
                          })}
                          <p className="font-semibold text-foreground mt-1">Total: {currentUnits} unit(s)</p>
                        </div>
                      </div>

                      {/* Confirmation input */}
                      <div className="space-y-1.5">
                        <Label className="text-sm">
                          Type exactly to confirm:{' '}
                          <span className="font-mono font-bold text-destructive">MY ENROLLMENT IS FINAL.</span>
                        </Label>
                        <Input
                          placeholder="MY ENROLLMENT IS FINAL."
                          value={finalizeConfirmText}
                          onChange={e => setFinalizeConfirmText(e.target.value)}
                          className={`font-mono ${finalizeConfirmText === 'MY ENROLLMENT IS FINAL.' ? 'border-green-500 ring-1 ring-green-400' : ''}`}
                        />
                        {finalizeConfirmText.length > 0 && finalizeConfirmText !== 'MY ENROLLMENT IS FINAL.' && (
                          <p className="text-xs text-destructive">Text does not match. Check capitalization and the period.</p>
                        )}
                      </div>

                      <div className="flex gap-2 justify-end pt-1">
                        <Button variant="outline" onClick={() => { setShowFinalizeDialog(false); setFinalizeConfirmText(''); }}>
                          Cancel
                        </Button>
                        <Button
                          className="bg-green-700 text-white hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed gap-1.5"
                          disabled={finalizeConfirmText !== 'MY ENROLLMENT IS FINAL.' || myEnrolledSections.length === 0}
                          onClick={() => {
                            finalizeEnlistment(student.id, activeTerm.id);
                            setShowFinalizeDialog(false);
                            setFinalizeConfirmText('');
                            toast({ title: 'Enrollment finalized!', description: 'You are now officially enrolled for this term.' });
                          }}
                        >
                          <CheckSquare className="w-4 h-4" /> Confirm Enrollment
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </div>
            <p className="text-xs text-gray-500">
              Units: <span className="font-semibold text-primary">{currentUnits}</span>/{maxUnits} regular
              {dropDeadline && ` • Drop deadline: ${new Date(dropDeadline).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`}
            </p>
          </div>
        </div>

        {/* Finalized banner */}
        {isFinalized && (
          <Card className="bg-green-700 border-green-800">
            <CardContent className="pt-3 pb-3">
              <div className="flex items-center gap-3">
                <CheckSquare className="w-5 h-5 text-white flex-shrink-0" />
                <div>
                  <p className="text-white font-semibold">Enrollment Finalized — Officially Enrolled</p>
                  <p className="text-green-100 text-xs">You are officially enrolled for {activeTerm.name}. Your faculty can now see you in their class lists. Contact the OCS to make any changes.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Unit progress */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-3">
              <BookOpen className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-blue-800 font-medium">Unit Load (excl. PE/NSTP)</span>
                  <span className="text-blue-800">{currentUnits}/{maxUnits} units</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-1.5">
                  <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, (currentUnits / maxUnits) * 100)}%` }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enrollment Schedule Banner */}
        {enrollSched?.slots?.length ? (
          <Card className={`border ${isMyEnrollDay ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
            <CardContent className="pt-3 pb-3">
              <div className="flex items-start gap-2">
                <CalendarDays className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isMyEnrollDay ? 'text-green-600' : 'text-yellow-600'}`} />
                <div>
                  <p className={`text-sm font-semibold ${isMyEnrollDay ? 'text-green-800' : 'text-yellow-800'}`}>
                    {isMyEnrollDay ? '✓ Today is your enrollment day!' : 'Enrollment Schedule (by Student ID)'}
                  </p>
                  <div className="flex flex-wrap gap-3 mt-1">
                    {enrollSched.slots.map(slot => (
                      <div key={slot.day} className={`text-xs px-2 py-1 rounded border ${enrollSchedToday?.day === slot.day ? 'bg-green-100 border-green-300 text-green-800 font-semibold' : 'bg-white border-gray-200 text-gray-600'}`}>
                        Day {slot.day} — {new Date(slot.date + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}: IDs {slot.idPrefixes.join(', ')}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Persistent enlistment warning panel */}
        {enlistWarning && (
          <Card className="border-red-300 bg-red-50">
            <CardContent className="pt-3 pb-3">
              <div className="flex items-start gap-3">
                <XCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-red-800 text-sm">
                    Cannot enlist <span className="font-mono">{enlistWarning.courseCode}</span> — Sec {enlistWarning.sectionCode}
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {enlistWarning.issues.map((issue, i) => (
                      <li key={i} className="text-sm text-red-700 flex items-start gap-1.5">
                        <span className="flex-shrink-0 mt-0.5">•</span>
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  onClick={() => setEnlistWarning(null)}
                  className="text-red-400 hover:text-red-600 flex-shrink-0 p-0.5 rounded"
                  title="Dismiss"
                >
                  <X size={15} />
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Timetable — always visible above tabs */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="w-4 h-4" /> Weekly Schedule
              <span className="text-xs font-normal text-muted-foreground">
                {isFinalized ? '(officially enrolled courses)' : '(solid = enlisted, dashed = cart)'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {myEnrolledSections.length === 0 && (isFinalized || cart.length === 0)
              ? <p className="text-gray-400 text-center py-6 text-sm">No enrolled sections to display.</p>
              : renderTimetable(isFinalized ? [] : cart.map(id => state.sections.find(s => s.id === id)).filter(Boolean) as Section[])}
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="bg-gray-100 flex-wrap h-auto gap-1">
            <TabsTrigger value="search" className="flex items-center gap-1">
              <Search className="w-3 h-3" /> Search Courses ({availableSections.length})
            </TabsTrigger>
            <TabsTrigger value="cart" className="flex items-center gap-1">
              <ShoppingCart className="w-3 h-3" /> Course Bin
              {cart.length > 0 && <Badge className="ml-1 bg-orange-500 text-white text-xs px-1.5">{cart.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="my">
              My Enlisted ({myEnrolledSections.length})
              {myEnrolledSections.length > 0 && <Badge className="ml-2 bg-green-500 text-white text-xs">{myEnrolledSections.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="prerogatives">
              Prerogatives
              {state.prerogatives.filter(p => p.studentId === student.id && p.termId === activeTerm.id).length > 0 && (
                <Badge className="ml-2 bg-purple-500 text-white text-xs">
                  {state.prerogatives.filter(p => p.studentId === student.id && p.termId === activeTerm.id).length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Search Courses Tab */}
          <TabsContent value="search" className="mt-4">
            <div className="space-y-3">
              {/* Search bar */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search by course code, title, or section..."
                  className="pl-9"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <Card>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>Course</TableHead>
                        <TableHead>Sec</TableHead>
                        <TableHead>Faculty</TableHead>
                        <TableHead>Schedule</TableHead>
                        <TableHead className="text-center">Slots</TableHead>
                        <TableHead>Units</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center">Cart</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {searchedSections.map(sec => {
                        const { course, faculty, enrolled, isFull, hasOverlap, isCourseDuplicate, prereqCheck, coreqCheck, unitCheck, existingPrerog, consentBlocked, needsCOI, needsDC, needsOCS } = getSectionInfo(sec);
                        if (!course) return null;

                        const schedStr = `${sec.schedule.days.join('')} ${sec.schedule.startTime}–${sec.schedule.endTime}`;
                        const labStr = sec.labSchedule ? ` | Lab: ${sec.labSchedule.days.join('')} ${sec.labSchedule.startTime}–${sec.labSchedule.endTime}` : '';
                        const inCart = cart.includes(sec.id);

                        let cartBtn;
                        if (enrolled) {
                          cartBtn = <Badge className="text-xs bg-green-50 text-green-700 border border-green-200">Enlisted</Badge>;
                        } else if (isFinalized) {
                          cartBtn = <Badge className="text-xs bg-gray-100 text-gray-500 border border-gray-200 flex items-center gap-1"><Lock className="w-2.5 h-2.5" />Locked</Badge>;
                        } else if (inCart) {
                          cartBtn = (
                            <Button size="sm" variant="outline" className="h-7 text-xs border-orange-300 text-orange-700 hover:bg-orange-50" onClick={() => removeFromCart(sec.id)}>
                              <Trash2 className="w-3 h-3 mr-1" />Remove
                            </Button>
                          );
                        } else {
                          // Hard blockers: cannot add to cart
                          const hardBlocked = hasOverlap || isCourseDuplicate || !prereqCheck.passed || consentBlocked;
                          cartBtn = (
                            <Button
                              size="sm"
                              variant="outline"
                              className={`h-7 text-xs ${hardBlocked ? 'border-red-300 text-red-600 hover:bg-red-50' : 'border-blue-300 text-blue-700 hover:bg-blue-50'}`}
                              onClick={() => {
                                if (hardBlocked) {
                                  const issues: string[] = [];
                                  if (hasOverlap) issues.push('Schedule conflict: overlaps with a course already in your enlisted schedule.');
                                  if (isCourseDuplicate) issues.push('Duplicate course: you are already enlisted in a section of this same course.');
                                  if (!prereqCheck.passed) issues.push(`Prerequisites not satisfied — missing: ${prereqCheck.missing.join(', ')}`);
                                  if (!coreqCheck.passed) issues.push(`Corequisites not satisfied — must also enlist: ${coreqCheck.missing.join(', ')}`);
                                  if (consentBlocked) issues.push('Consent required before enlisting (COI / Dept / OCS).');
                                  setEnlistWarning({ courseCode: course?.code ?? '', sectionCode: sec.sectionCode, issues });
                                } else {
                                  addToCart(sec.id);
                                  setEnlistWarning(null);
                                }
                              }}
                              title={hardBlocked ? 'Click to see why this section cannot be added' : 'Add to Course Bin'}
                            >
                              <ShoppingCart className="w-3 h-3 mr-1" />{hardBlocked ? 'Blocked' : 'Add'}
                            </Button>
                          );
                        }

                        return (
                          <TableRow key={sec.id} className={enrolled ? 'bg-green-50/50' : inCart ? 'bg-orange-50/30' : ''}>
                            <TableCell>
                              <div>
                                <p className="font-mono font-semibold text-primary text-sm">{course.code}</p>
                                <p className="text-xs text-gray-500 max-w-[160px] truncate">{course.title}</p>
                                {course.isPE && <Badge className="text-xs bg-blue-100 text-blue-700 mt-0.5">PE</Badge>}
                                {course.isNSTP && <Badge className="text-xs bg-green-100 text-green-700 mt-0.5">NSTP</Badge>}
                                {/* prereq/coreq */}
                                {(course.prerequisites?.length || course.corequisites?.length) ? (
                                  <div className="text-xs text-gray-400 mt-0.5">
                                    {course.prerequisites?.length ? <span>Pre: {course.prerequisites.map(id => state.courses.find(c => c.id === id)?.code ?? id).join(', ')}</span> : null}
                                    {course.corequisites?.length ? <span className="ml-1">Co: {course.corequisites.map(id => state.courses.find(c => c.id === id)?.code ?? id).join(', ')}</span> : null}
                                  </div>
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono">{sec.sectionCode}</TableCell>
                            <TableCell className="text-sm text-gray-600 max-w-[120px]">
                              <span className="truncate block">{faculty?.name.split(' ').slice(-1)[0]}</span>
                            </TableCell>
                            <TableCell className="text-xs text-gray-600">
                              <div>{schedStr}</div>
                              {labStr && <div className="text-gray-400">{labStr}</div>}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`text-sm font-medium ${isFull ? 'text-red-600' : 'text-gray-700'}`}>
                                {sec.enrolled}/{sec.slots}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm">{course.units}{course.labUnits ? `+${course.labUnits}` : ''}</TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-0.5">
                                {!prereqCheck.passed && (
                                  <div className="flex items-center gap-1 text-xs text-red-600">
                                    <XCircle className="w-3 h-3" /><span>Prereq missing</span>
                                  </div>
                                )}
                                {!coreqCheck.passed && (
                                  <div className="flex items-center gap-1 text-xs text-orange-600">
                                    <AlertTriangle className="w-3 h-3" /><span>Coreq needed</span>
                                  </div>
                                )}
                                {needsCOI && <Badge className="text-xs bg-amber-100 text-amber-800 border border-amber-200">COI Required</Badge>}
                                {needsDC && <Badge className="text-xs bg-orange-100 text-orange-800 border border-orange-200">DC Required</Badge>}
                                {needsOCS && <Badge className="text-xs bg-red-100 text-red-800 border border-red-200">OCS Required</Badge>}
                                {hasOverlap && !enrolled && (
                                  <div className="flex items-center gap-1 text-xs text-orange-600">
                                    <AlertTriangle className="w-3 h-3" /><span>Conflict</span>
                                  </div>
                                )}
                                {isCourseDuplicate && (
                                  <div className="flex items-center gap-1 text-xs text-yellow-700">
                                    <AlertTriangle className="w-3 h-3" /><span>Duplicate</span>
                                  </div>
                                )}
                                {enrolled && (
                                  <div className="flex items-center gap-1 text-xs text-green-600">
                                    <CheckCircle className="w-3 h-3" /><span>Enlisted</span>
                                  </div>
                                )}
                                {isFull && !enrolled && (
                                  <div className="flex items-center gap-1 text-xs text-red-600">
                                    <span>Full</span>
                                  </div>
                                )}
                                {existingPrerog && (
                                  <Badge className={`text-xs ${existingPrerog.status === 'approved' ? 'bg-green-100 text-green-800' : existingPrerog.status === 'denied' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                    Prg: {existingPrerog.status}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">{cartBtn}</TableCell>
                          </TableRow>
                        );
                      })}
                      {searchedSections.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-gray-400 py-8">
                            {search ? 'No sections match your search.' : 'No sections available.'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Course Bin Tab */}
          <TabsContent value="cart" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-orange-600" />
                    Course Bin ({cart.length} section{cart.length !== 1 ? 's' : ''})
                  </CardTitle>
                  {cart.length > 0 && enlistmentOpen && !isFinalized && (
                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white gap-2"
                      onClick={handleBulkEnlist}
                      disabled={!isMyEnrollDay && !!enrollSched?.slots?.length}
                    >
                      <CheckCircle className="w-4 h-4" />
                      Enlist All ({cart.length})
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    <ShoppingCart className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">Your course bin is empty</p>
                    <p className="text-sm mt-1">Go to the Search tab to find and add courses to your bin.</p>
                  </div>
                ) : (
                  <>
                    {isFinalized && (
                      <div className="flex items-center gap-2 p-3 bg-green-700 text-white rounded-lg mb-4 text-sm">
                        <CheckSquare className="w-4 h-4 flex-shrink-0" />
                        Enlistment is finalized. Course bin items are for reference only.
                      </div>
                    )}
                    {!isMyEnrollDay && enrollSched?.slots?.length ? (
                      <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4 text-sm text-yellow-800">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        Today is not your enrollment day. You can still add courses to your bin and enlist on your assigned day.
                      </div>
                    ) : null}

                    <div className="space-y-3">
                      {cart.map(sectionId => {
                        const sec = state.sections.find(s => s.id === sectionId);
                        if (!sec) return null;
                        const { course, faculty, enrolled, isFull, hasOverlap, isCourseDuplicate, prereqCheck, coreqCheck, unitCheck, consentBlocked, needsCOI, needsDC, needsOCS } = getSectionInfo(sec);
                        if (!course) return null;
                        const canEnlist = enlistmentOpen && !isFinalized && !enrolled && !isFull && !hasOverlap && !isCourseDuplicate && prereqCheck.passed && coreqCheck.passed && unitCheck.ok && !consentBlocked;
                        return (
                          <Card key={sectionId} className={`border-l-4 ${enrolled ? 'border-l-green-500 bg-green-50/30' : canEnlist ? 'border-l-blue-400' : 'border-l-gray-300'}`}>
                            <CardContent className="pt-3 pb-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <p className="font-semibold text-sm">
                                    <span className="font-mono text-primary">{course.code}</span> — {course.title}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    Section {sec.sectionCode} • {faculty?.name} • {sec.enrolled}/{sec.slots} slots
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {sec.schedule.days.join('')} {sec.schedule.startTime}–{sec.schedule.endTime} • {sec.schedule.room}
                                  </p>
                                  {sec.labSchedule && (
                                    <p className="text-xs text-gray-400">Lab: {sec.labSchedule.days.join('')} {sec.labSchedule.startTime}–{sec.labSchedule.endTime}</p>
                                  )}
                                  {(course.prerequisites?.length || course.corequisites?.length) ? (
                                    <div className="text-xs text-gray-400 mt-0.5">
                                      {course.prerequisites?.length ? <span>Pre: {course.prerequisites.map(id => state.courses.find(c => c.id === id)?.code ?? id).join(', ')} </span> : null}
                                      {course.corequisites?.length ? <span>Co: {course.corequisites.map(id => state.courses.find(c => c.id === id)?.code ?? id).join(', ')}</span> : null}
                                    </div>
                                  ) : null}
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {enrolled && <Badge className="bg-green-100 text-green-800 text-xs">Already Enlisted</Badge>}
                                    {!enrolled && isFull && <Badge className="bg-red-100 text-red-800 text-xs">Section Full</Badge>}
                                    {hasOverlap && !enrolled && <Badge className="bg-orange-100 text-orange-800 text-xs">Schedule Conflict</Badge>}
                                    {isCourseDuplicate && <Badge className="bg-yellow-100 text-yellow-800 text-xs">Duplicate Course</Badge>}
                                    {!prereqCheck.passed && <Badge className="bg-red-100 text-red-800 text-xs">Prereq Missing</Badge>}
                                    {!coreqCheck.passed && <Badge className="bg-orange-100 text-orange-800 text-xs">Coreq Needed</Badge>}
                                    {!unitCheck.ok && <Badge className="bg-yellow-100 text-yellow-800 text-xs">Unit Limit</Badge>}
                                    {needsCOI && <Badge className="bg-amber-100 text-amber-800 text-xs border border-amber-200">COI Required</Badge>}
                                    {needsDC && <Badge className="bg-orange-100 text-orange-800 text-xs border border-orange-200">DC Required</Badge>}
                                    {needsOCS && <Badge className="bg-red-100 text-red-800 text-xs border border-red-200">OCS Required</Badge>}
                                  </div>
                                </div>
                                <div className="flex flex-col gap-2 items-end flex-shrink-0">
                                  <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-xs">{course.units}{course.labUnits ? `+${course.labUnits}` : ''} units</Badge>
                                  {!enrolled && enlistmentOpen && canEnlist && !isFinalized && (
                                    <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                                      onClick={() => handleEnlist(sec)}>
                                      Enlist
                                    </Button>
                                  )}
                                  {!isFinalized && (
                                    <Button size="sm" variant="outline" className="h-7 text-xs border-gray-300 text-gray-500 hover:bg-gray-50"
                                      onClick={() => removeFromCart(sectionId)}>
                                      <Trash2 className="w-3 h-3 mr-1" />Remove
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                    {cart.length > 1 && enlistmentOpen && !isFinalized && (
                      <div className="mt-4 flex justify-end">
                        <Button
                          className="bg-green-600 hover:bg-green-700 text-white gap-2"
                          onClick={handleBulkEnlist}
                        >
                          <CheckCircle className="w-4 h-4" />
                          Enlist All ({cart.length})
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* My Enlisted */}
          <TabsContent value="my" className="mt-4">
            {(() => {
              const myPrerogsActive = state.prerogatives.filter(p => p.studentId === student.id && p.termId === activeTerm.id && p.status !== 'denied');
              const pendingPrerogsWithSec = myPrerogsActive.map(p => ({
                prg: p,
                sec: state.sections.find(s => s.id === p.sectionId),
              })).filter(x => x.sec && !myEnrollments.find(e => e.sectionId === x.sec!.id));
              const totalCount = myEnrolledSections.length + pendingPrerogsWithSec.length;
              if (totalCount === 0) {
                return <p className="text-gray-400 text-center py-8">You haven't enlisted in any sections yet.</p>;
              }
              return (
                <div className="space-y-3">
                  {/* Pending prerogatives */}
                  {pendingPrerogsWithSec.map(({ prg, sec }) => {
                    const course = state.courses.find(c => c.id === sec!.courseId);
                    const faculty = state.users.find(u => u.id === sec!.facultyId);
                    const isPending = prg.status === 'pending';
                    return (
                      <Card key={prg.id} className={`border-l-4 ${isPending ? 'border-l-purple-400 bg-purple-50/30' : 'border-l-green-400 bg-green-50/30'}`}>
                        <CardContent className="pt-4 pb-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold">{course?.code} — {course?.title}</p>
                                <Badge className={`text-xs ${isPending ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-green-100 text-green-800 border border-green-200'}`}>
                                  {isPending ? 'Pending Prerogative' : 'Prerogative Approved'}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-500">Section {sec!.sectionCode} • {faculty?.name}</p>
                              <p className="text-xs text-gray-500 mt-1">{sec!.schedule.days.join('/')} {sec!.schedule.startTime}–{sec!.schedule.endTime} • {sec!.schedule.room}</p>
                              <p className="text-xs italic text-gray-400 mt-1">Request: "{prg.reason}"</p>
                              {isPending && <p className="text-xs text-purple-600 mt-1">Awaiting faculty decision. You will be auto-enlisted if approved.</p>}
                              {prg.status === 'approved' && <p className="text-xs text-green-600 mt-1">Approved! Enlistment being processed...</p>}
                            </div>
                            <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-xs flex-shrink-0">
                              {course?.units}{course?.labUnits ? `+${course.labUnits}` : ''} units
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {/* Enlisted sections */}
                  {myEnrolledSections.map((sec, ci) => {
                    const course = state.courses.find(c => c.id === sec.courseId);
                    const faculty = state.users.find(u => u.id === sec.facultyId);
                    const color = COLORS[ci % COLORS.length];
                    return (
                      <Card key={sec.id} className={`border-l-4 ${color.split(' ')[2]?.replace('text-', 'border-') ?? 'border-primary'}`}>
                        <CardContent className="pt-4 pb-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold">{course?.code} — {course?.title}</p>
                              <p className="text-sm text-gray-500">Section {sec.sectionCode} • {faculty?.name}</p>
                              <p className="text-xs text-gray-500 mt-1">{sec.schedule.days.join('/')} {sec.schedule.startTime}–{sec.schedule.endTime} • {sec.schedule.room}</p>
                              {sec.labSchedule && (
                                <p className="text-xs text-gray-400">Lab: {sec.labSchedule.days.join('/')} {sec.labSchedule.startTime}–{sec.labSchedule.endTime} • {sec.labSchedule.room}</p>
                              )}
                              {(course?.prerequisites?.length || course?.corequisites?.length) ? (
                                <div className="text-xs text-gray-400 mt-0.5">
                                  {course?.prerequisites?.length ? <span>Pre: {course.prerequisites.map(id => state.courses.find(c => c.id === id)?.code ?? id).join(', ')} </span> : null}
                                  {course?.corequisites?.length ? <span>Co: {course.corequisites.map(id => state.courses.find(c => c.id === id)?.code ?? id).join(', ')}</span> : null}
                                </div>
                              ) : null}
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Badge className="bg-green-100 text-green-800 text-xs">{course?.units}{course?.labUnits ? `+${course.labUnits}` : ''} units</Badge>
                              {canDrop && !isFinalized && (
                                <Button size="sm" variant="outline" className="h-7 text-xs border-red-300 text-red-600 hover:bg-red-50" onClick={() => handleDrop(sec.id)}>Drop</Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              );
            })()}
          </TabsContent>

          {/* Prerogatives */}
          <TabsContent value="prerogatives" className="mt-4">
            <div className="space-y-5">
              {/* Info banner */}
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-start gap-2">
                    <Unlock className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-purple-800">
                      <p className="font-medium">How Prerogatives Work</p>
                      <p className="text-xs text-purple-600 mt-0.5">
                        Search for a course below. If a section is full, you can submit a prerogative request.
                        The faculty-in-charge will approve or deny it. If approved, you will be automatically enlisted.
                        {!prerogativeOpen && <span className="ml-1 font-semibold text-red-600">Prerogatives are currently closed.</span>}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Search + Request Section */}
              <div>
                <div className="relative mb-3">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search full sections by course code, title, or section..."
                    className="pl-9"
                    value={prgSearch}
                    onChange={e => setPrgSearch(e.target.value)}
                  />
                </div>
                {prgSearch.trim() && (() => {
                  const q = prgSearch.toLowerCase();
                  const filtered = availableSections.filter(s => {
                    const course = state.courses.find(c => c.id === s.courseId);
                    return course?.code.toLowerCase().includes(q) || course?.title.toLowerCase().includes(q) || s.sectionCode.toLowerCase().includes(q);
                  });
                  if (filtered.length === 0) return <p className="text-center text-gray-400 py-4 text-sm">No sections found.</p>;
                  return (
                    <Card>
                      <CardContent className="p-0 overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50">
                              <TableHead>Course</TableHead>
                              <TableHead>Sec</TableHead>
                              <TableHead>Faculty</TableHead>
                              <TableHead>Schedule</TableHead>
                              <TableHead className="text-center">Slots</TableHead>
                              <TableHead>Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filtered.map(sec => {
                              const course = state.courses.find(c => c.id === sec.courseId);
                              const fac = state.users.find(u => u.id === sec.facultyId);
                              const isFull = sec.enrolled >= sec.slots;
                              const alreadyEnlisted = !!myEnrollments.find(e => e.sectionId === sec.id);
                              const existingPrerog = state.prerogatives.find(p => p.studentId === student.id && p.sectionId === sec.id && p.termId === activeTerm.id);
                              const isRequesting = requestingPrgSectionId === sec.id;
                              if (!course) return null;
                              return (
                                <React.Fragment key={sec.id}>
                                  <TableRow key={sec.id} className={isFull ? 'bg-red-50/30' : ''}>
                                    <TableCell>
                                      <p className="font-mono font-semibold text-primary text-sm">{course.code}</p>
                                      <p className="text-xs text-gray-500 max-w-[150px] truncate">{course.title}</p>
                                    </TableCell>
                                    <TableCell className="font-mono">{sec.sectionCode}</TableCell>
                                    <TableCell className="text-sm text-gray-600">
                                      <span className="truncate block max-w-[110px]">{fac?.name.split(' ').slice(-1)[0]}</span>
                                    </TableCell>
                                    <TableCell className="text-xs text-gray-600">
                                      {sec.schedule.days.join('')} {sec.schedule.startTime}–{sec.schedule.endTime}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <span className={`text-sm font-semibold ${isFull ? 'text-red-600' : 'text-gray-700'}`}>
                                        {sec.enrolled}/{sec.slots}
                                      </span>
                                      {isFull && <p className="text-xs text-red-500">FULL</p>}
                                    </TableCell>
                                    <TableCell>
                                      {alreadyEnlisted ? (
                                        <Badge className="bg-green-100 text-green-800 text-xs">Already Enlisted</Badge>
                                      ) : existingPrerog ? (
                                        <Badge className={`text-xs ${existingPrerog.status === 'approved' ? 'bg-green-100 text-green-800' : existingPrerog.status === 'denied' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                          Request {existingPrerog.status.toUpperCase()}
                                        </Badge>
                                      ) : !isFull ? (
                                        <Badge className="bg-blue-50 text-blue-700 text-xs border border-blue-200">Has slots — use Search</Badge>
                                      ) : prerogativeOpen ? (
                                        <Button size="sm" className="h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white gap-1"
                                          onClick={() => { setRequestingPrgSectionId(isRequesting ? null : sec.id); setPrgReason(''); }}>
                                          <Unlock className="w-3 h-3" />
                                          {isRequesting ? 'Cancel' : 'Request'}
                                        </Button>
                                      ) : (
                                        <Badge className="bg-gray-100 text-gray-500 text-xs">Closed</Badge>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                  {isRequesting && (
                                    <TableRow key={`${sec.id}-form`} className="bg-purple-50">
                                      <TableCell colSpan={6} className="py-3 px-4">
                                        <div className="space-y-2">
                                          <Label className="text-sm font-medium text-purple-800">Reason for Prerogative Request *</Label>
                                          <Textarea
                                            rows={2}
                                            className="text-sm"
                                            placeholder="e.g. This is the only available section that fits my schedule..."
                                            value={prgReason}
                                            onChange={e => setPrgReason(e.target.value)}
                                          />
                                          <div className="flex gap-2">
                                            <Button size="sm" className="bg-purple-700 hover:bg-purple-800 text-white gap-1 h-8"
                                              disabled={!prgReason.trim()}
                                              onClick={handlePrerogative}>
                                              <Unlock className="w-3 h-3" /> Submit Request
                                            </Button>
                                            <Button size="sm" variant="outline" className="h-8"
                                              onClick={() => { setRequestingPrgSectionId(null); setPrgReason(''); }}>
                                              Cancel
                                            </Button>
                                          </div>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  );
                })()}
              </div>

              {/* My Prerogative Requests */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                    <Unlock className="w-4 h-4 text-purple-600" /> My Requests
                  </h3>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => loadPrerogatives()}>
                    <RefreshCw className="w-3 h-3" /> Refresh
                  </Button>
                </div>
                {state.prerogatives.filter(p => p.studentId === student.id && p.termId === activeTerm.id).length === 0 ? (
                  <Card className="bg-gray-50 border-dashed">
                    <CardContent className="pt-6 pb-6 text-center">
                      <Unlock className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                      <p className="text-gray-400 text-sm">No prerogative requests yet.</p>
                      <p className="text-xs text-gray-400 mt-1">Search for a full section above to submit a request.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {state.prerogatives
                      .filter(p => p.studentId === student.id && p.termId === activeTerm.id)
                      .map(prg => {
                        const sec = state.sections.find(s => s.id === prg.sectionId);
                        const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
                        const fac = sec ? state.users.find(u => u.id === sec.facultyId) : null;
                        const statusMap: Record<string, string> = {
                          pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                          approved: 'bg-green-100 text-green-800 border-green-200',
                          denied: 'bg-red-100 text-red-800 border-red-200',
                        };
                        return (
                          <Card key={prg.id} className="portal-card">
                            <CardContent className="pt-4 pb-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-semibold">{course?.code} — {course?.title}</p>
                                  <p className="text-sm text-gray-500">Section {sec?.sectionCode} • FIC: {fac?.name}</p>
                                  <p className="text-xs text-gray-500">Slots: {sec?.enrolled}/{sec?.slots}</p>
                                  <p className="text-xs italic text-gray-600 mt-1">"{prg.reason}"</p>
                                  <p className="text-xs text-gray-400 mt-1">Requested: {prg.requestedAt}</p>
                                  {prg.processedAt && <p className="text-xs text-gray-400">Processed: {prg.processedAt}</p>}
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  <Badge className={`text-xs border ${statusMap[prg.status]}`}>{prg.status.toUpperCase()}</Badge>
                                  {prg.status === 'approved' && myEnrollments.find(e => e.sectionId === prg.sectionId) && (
                                    <p className="text-xs text-green-600 font-medium">Auto-enlisted</p>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Prerogative Request Dialog */}
        {/* Dialog removed - requests are now submitted inline in the Prerogatives tab */}
      </div>
    </PortalLayout>
  );
}
