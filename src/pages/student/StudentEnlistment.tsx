import { useState } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, CalendarDays, CheckCircle, XCircle, Clock, Lock, Unlock, BookOpen, Info } from 'lucide-react';
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
  const { state, enlistSection, dropSection, requestPrerogative, checkPrerequisites, checkCorequisites, getCurrentUnits } = useApp();
  const student = state.currentUser;
  const activeTerm = state.terms.find(t => t.isActive);
  const { toast } = useToast();

  const [prgSection, setPrgSection] = useState<Section | null>(null);
  const [prgReason, setPrgReason] = useState('');

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
  const dropDeadline = activeTerm.dropDeadline;
  const canDrop = enlistmentOpen || (dropDeadline ? new Date() <= new Date(dropDeadline) : false);

  const myEnrollments = state.enrollments.filter(e => e.studentId === student.id && e.termId === activeTerm.id && e.status !== 'dropped');
  const myEnrolledSections = myEnrollments.map(e => state.sections.find(s => s.id === e.sectionId)).filter(Boolean) as Section[];

  const availableSections = state.sections.filter(s => s.termId === activeTerm.id);
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

    const prereqCheck = course ? checkPrerequisites(student.id, course.id) : { passed: true, missing: [] };
    const coreqCheck = course ? checkCorequisites(student.id, course.id, activeTerm.id) : { passed: true, missing: [] };

    const unitCheck = (() => {
      if (!course || course.isPE || course.isNSTP) return { ok: true };
      const adding = course.units + (course.labUnits ?? 0);
      return { ok: currentUnits + adding <= maxUnits, adding };
    })();

    const existingPrerog = state.prerogatives.find(p => p.studentId === student.id && p.sectionId === sec.id && p.termId === activeTerm.id);

    return { course, faculty, enrolled: !!enrolled, isFull, hasOverlap, prereqCheck, coreqCheck, unitCheck, existingPrerog };
  };

  const handleEnlist = (sec: Section) => {
    const { isFull, hasOverlap, prereqCheck, coreqCheck, unitCheck } = getSectionInfo(sec);
    if (!enlistmentOpen) return toast({ title: 'Enlistment is closed', variant: 'destructive' });
    if (hasOverlap) return toast({ title: 'Schedule conflict', description: 'This section overlaps with your current schedule.', variant: 'destructive' });
    if (!prereqCheck.passed) return toast({ title: 'Prerequisites not satisfied', description: `Missing: ${prereqCheck.missing.join(', ')}`, variant: 'destructive' });
    if (!coreqCheck.passed) return toast({ title: 'Corequisites not satisfied', description: `Must also enlist: ${coreqCheck.missing.join(', ')}`, variant: 'destructive' });
    if (!unitCheck.ok) return toast({ title: 'Unit limit exceeded', description: `Adding this course would exceed your ${maxUnits} unit limit.`, variant: 'destructive' });
    if (isFull) {
      if (prerogativeOpen) {
        setPrgSection(sec);
      } else {
        toast({ title: 'Section is full', description: 'Prerogatives are not currently open.', variant: 'destructive' });
      }
      return;
    }
    const result = enlistSection(student.id, sec.id, activeTerm.id);
    toast({ title: result.success ? 'Enlisted!' : 'Error', description: result.message, variant: result.success ? 'default' : 'destructive' });
  };

  const handleDrop = (sectionId: string) => {
    dropSection(student.id, sectionId, activeTerm.id);
    toast({ title: 'Section dropped' });
  };

  const handlePrerogative = () => {
    if (!prgSection || !prgReason.trim()) return;
    requestPrerogative(student.id, prgSection.id, activeTerm.id, prgReason.trim());
    toast({ title: 'Prerogative requested', description: 'Your request has been sent to the faculty for review.' });
    setPrgSection(null);
    setPrgReason('');
  };

  // Timetable
  const START_HOUR = 7;
  const END_HOUR = 20;
  const TOTAL_MINS = (END_HOUR - START_HOUR) * 60;

  const renderTimetable = () => {
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
            {DAYS.map((day, di) => (
              <div key={day} className="relative border border-gray-200 rounded bg-gray-50/50" style={{ height: `${TOTAL_MINS}px` }}>
                {hours.map(h => (
                  <div key={h} className="absolute w-full border-t border-gray-100/80" style={{ top: `${(h - START_HOUR) * 60}px` }} />
                ))}
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
              </div>
            ))}
          </div>
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
          </div>
        </div>
      </div>
    );
  };

  return (
    <PortalLayout role="student" userName={student.name}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Enlistment</h1>
            <p className="text-gray-600 mt-1">{activeTerm.name}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              {enlistmentOpen
                ? <Badge className="bg-green-100 text-green-800">Enlistment Open</Badge>
                : <Badge className="bg-red-100 text-red-800 flex items-center gap-1"><Lock className="w-3 h-3" />Enlistment Closed</Badge>}
              {prerogativeOpen && <Badge className="bg-purple-100 text-purple-800 flex items-center gap-1"><Unlock className="w-3 h-3" />Prerogatives Open</Badge>}
            </div>
            <p className="text-xs text-gray-500">
              Units: <span className="font-semibold text-primary">{currentUnits}</span>/{maxUnits} regular
              {dropDeadline && ` • Drop deadline: ${new Date(dropDeadline).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`}
            </p>
          </div>
        </div>

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

        <Tabs defaultValue="available">
          <TabsList className="bg-gray-100">
            <TabsTrigger value="available">Available Sections ({availableSections.length})</TabsTrigger>
            <TabsTrigger value="my">
              My Enlisted ({myEnrolledSections.length})
              {myEnrolledSections.length > 0 && <Badge className="ml-2 bg-green-500 text-white text-xs">{myEnrolledSections.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="timetable">Timetable</TabsTrigger>
            <TabsTrigger value="prerogatives">
              Prerogatives
              {state.prerogatives.filter(p => p.studentId === student.id && p.termId === activeTerm.id).length > 0 && (
                <Badge className="ml-2 bg-purple-500 text-white text-xs">
                  {state.prerogatives.filter(p => p.studentId === student.id && p.termId === activeTerm.id).length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Available Sections */}
          <TabsContent value="available" className="mt-4">
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
                      <TableHead className="text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {availableSections.map(sec => {
                      const { course, faculty, enrolled, isFull, hasOverlap, prereqCheck, coreqCheck, unitCheck, existingPrerog } = getSectionInfo(sec);
                      if (!course) return null;

                      const schedStr = `${sec.schedule.days.join('')} ${sec.schedule.startTime}–${sec.schedule.endTime}`;
                      const labStr = sec.labSchedule ? ` | Lab: ${sec.labSchedule.days.join('')} ${sec.labSchedule.startTime}–${sec.labSchedule.endTime}` : '';

                      let actionBtn;
                      if (enrolled) {
                        actionBtn = canDrop ? (
                          <Button size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 h-7 text-xs" onClick={() => handleDrop(sec.id)}>Drop</Button>
                        ) : (
                          <Badge className="bg-green-100 text-green-800 text-xs">Enlisted</Badge>
                        );
                      } else if (!prereqCheck.passed) {
                        actionBtn = <Button size="sm" disabled className="h-7 text-xs bg-gray-200 text-gray-500" title={`Prereq: ${prereqCheck.missing.join(', ')}`}>No Prereq</Button>;
                      } else if (!coreqCheck.passed) {
                        actionBtn = <Button size="sm" disabled className="h-7 text-xs bg-gray-200 text-gray-500" title={`Coreq: ${coreqCheck.missing.join(', ')}`}>No Coreq</Button>;
                      } else if (!unitCheck.ok) {
                        actionBtn = <Button size="sm" disabled className="h-7 text-xs bg-gray-200 text-gray-500" title="Exceeds unit limit">Over Limit</Button>;
                      } else if (hasOverlap) {
                        actionBtn = <Button size="sm" disabled className="h-7 text-xs bg-orange-200 text-orange-800">Conflict</Button>;
                      } else if (isFull) {
                        if (existingPrerog) {
                          const prgColor = existingPrerog.status === 'approved' ? 'bg-green-100 text-green-800' : existingPrerog.status === 'denied' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800';
                          actionBtn = <Badge className={`text-xs ${prgColor}`}>Prg: {existingPrerog.status}</Badge>;
                        } else if (prerogativeOpen && enlistmentOpen) {
                          actionBtn = <Button size="sm" variant="outline" className="h-7 text-xs border-purple-300 text-purple-700 hover:bg-purple-50" onClick={() => setPrgSection(sec)}>Request Prg</Button>;
                        } else {
                          actionBtn = <Button size="sm" disabled className="h-7 text-xs bg-gray-200 text-gray-500">Full</Button>;
                        }
                      } else if (!enlistmentOpen) {
                        actionBtn = <Button size="sm" disabled className="h-7 text-xs"><Lock className="w-3 h-3 mr-1" />Closed</Button>;
                      } else {
                        actionBtn = <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => handleEnlist(sec)}>Enlist</Button>;
                      }

                      return (
                        <TableRow key={sec.id} className={enrolled ? 'bg-green-50/50' : ''}>
                          <TableCell>
                            <div>
                              <p className="font-mono font-semibold text-primary text-sm">{course.code}</p>
                              <p className="text-xs text-gray-500 max-w-[160px] truncate">{course.title}</p>
                              {course.isPE && <Badge className="text-xs bg-blue-100 text-blue-700 mt-0.5">PE</Badge>}
                              {course.isNSTP && <Badge className="text-xs bg-green-100 text-green-700 mt-0.5">NSTP</Badge>}
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
                                  <XCircle className="w-3 h-3" /><span>Prereq: {prereqCheck.missing.join(', ')}</span>
                                </div>
                              )}
                              {!coreqCheck.passed && (
                                <div className="flex items-center gap-1 text-xs text-orange-600">
                                  <AlertTriangle className="w-3 h-3" /><span>Coreq needed</span>
                                </div>
                              )}
                              {hasOverlap && !enrolled && (
                                <div className="flex items-center gap-1 text-xs text-orange-600">
                                  <AlertTriangle className="w-3 h-3" /><span>Conflict</span>
                                </div>
                              )}
                              {enrolled && (
                                <div className="flex items-center gap-1 text-xs text-green-600">
                                  <CheckCircle className="w-3 h-3" /><span>Enlisted</span>
                                </div>
                              )}
                              {!prereqCheck.passed && (
                                <p className="text-xs text-gray-400 max-w-[120px] truncate" title={prereqCheck.missing.join(', ')}>
                                  {prereqCheck.missing.join(', ')}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{actionBtn}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* My Enlisted */}
          <TabsContent value="my" className="mt-4">
            {myEnrolledSections.length === 0 ? (
              <p className="text-gray-400 text-center py-8">You haven't enlisted in any sections yet.</p>
            ) : (
              <div className="space-y-3">
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
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge className="bg-green-100 text-green-800 text-xs">{course?.units}{course?.labUnits ? `+${course.labUnits}` : ''} units</Badge>
                            {canDrop && (
                              <Button size="sm" variant="outline" className="h-7 text-xs border-red-300 text-red-600 hover:bg-red-50" onClick={() => handleDrop(sec.id)}>Drop</Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Timetable */}
          <TabsContent value="timetable" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><CalendarDays className="w-4 h-4" /> Weekly Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                {myEnrolledSections.length === 0
                  ? <p className="text-gray-400 text-center py-8">No enlisted sections to display.</p>
                  : renderTimetable()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Prerogatives */}
          <TabsContent value="prerogatives" className="mt-4">
            <div className="space-y-3">
              {state.prerogatives.filter(p => p.studentId === student.id && p.termId === activeTerm.id).length === 0 ? (
                <Card className="bg-gray-50 border-dashed">
                  <CardContent className="pt-6 pb-6 text-center">
                    <Unlock className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-400">No prerogative requests yet.</p>
                    <p className="text-xs text-gray-400 mt-1">When a section is full and prerogatives are open, you can request to join.</p>
                  </CardContent>
                </Card>
              ) : (
                state.prerogatives.filter(p => p.studentId === student.id && p.termId === activeTerm.id).map(prg => {
                  const sec = state.sections.find(s => s.id === prg.sectionId);
                  const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
                  const faculty = sec ? state.users.find(u => u.id === sec.facultyId) : null;
                  const statusMap: Record<string, string> = {
                    pending: 'bg-yellow-100 text-yellow-800',
                    approved: 'bg-green-100 text-green-800',
                    denied: 'bg-red-100 text-red-800',
                  };
                  return (
                    <Card key={prg.id} className="portal-card">
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">{course?.code} — {course?.title}</p>
                            <p className="text-sm text-gray-500">Section {sec?.sectionCode} • {faculty?.name}</p>
                            <p className="text-xs italic text-gray-600 mt-1">"{prg.reason}"</p>
                            <p className="text-xs text-gray-400 mt-1">Requested: {prg.requestedAt}</p>
                            {prg.processedAt && <p className="text-xs text-gray-400">Processed: {prg.processedAt}</p>}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge className={`text-xs ${statusMap[prg.status]}`}>{prg.status.toUpperCase()}</Badge>
                            {prg.status === 'approved' && !myEnrollments.find(e => e.sectionId === prg.sectionId) && (
                              <p className="text-xs text-green-600 font-medium">✓ Auto-enlisted</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Prerogative Request Dialog */}
        {prgSection && (
          <Dialog open onOpenChange={v => !v && (setPrgSection(null), setPrgReason(''))}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Unlock className="w-5 h-5 text-purple-600" /> Request Prerogative
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg text-sm">
                  <p className="font-medium">{state.courses.find(c => c.id === prgSection.courseId)?.code} — {state.courses.find(c => c.id === prgSection.courseId)?.title}</p>
                  <p className="text-gray-500">Section {prgSection.sectionCode} • {prgSection.enrolled}/{prgSection.slots} slots (FULL)</p>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex gap-2 text-xs text-blue-800">
                  <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  Your request will be reviewed by the Faculty-in-Charge. If approved, you will be automatically enlisted.
                </div>
                <div>
                  <Label>Reason for Prerogative Request *</Label>
                  <Textarea
                    className="mt-1"
                    rows={3}
                    placeholder="e.g. This is the only available section that fits my schedule..."
                    value={prgReason}
                    onChange={e => setPrgReason(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => { setPrgSection(null); setPrgReason(''); }}>Cancel</Button>
                  <Button className="flex-1 bg-purple-700 hover:bg-purple-800 text-white" disabled={!prgReason.trim()} onClick={handlePrerogative}>
                    Submit Request
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </PortalLayout>
  );
}
