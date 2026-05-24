import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { BookPlus, Trash2, Search, AlertTriangle, CheckCircle, Users, Clock, MapPin } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import type { Day, Section } from '../../lib/types';

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7AM–8PM
const DAY_COLS: Day[] = ['M', 'T', 'W', 'Th', 'F', 'S'];
const DAY_LABELS: Record<Day, string> = { M: 'Mon', T: 'Tue', W: 'Wed', Th: 'Thu', F: 'Fri', S: 'Sat' };

const toMinutes = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const COLORS = [
  'bg-secondary/20 border-secondary text-secondary',
  'bg-primary/15 border-primary text-primary',
  'bg-purple-100 border-purple-400 text-purple-700',
  'bg-orange-100 border-orange-400 text-orange-700',
  'bg-blue-100 border-blue-400 text-blue-700',
  'bg-pink-100 border-pink-400 text-pink-700',
];

export default function StudentEnlistment() {
  const { state, enlistSection, dropSection, getActiveTerm, getStudentEnrollments } = useApp();
  const { toast } = useToast();
  const me = state.currentUser!;
  const activeTerm = getActiveTerm();
  const [search, setSearch] = useState('');

  const enrollments = activeTerm ? getStudentEnrollments(me.id, activeTerm.id) : [];
  const enrolledSectionIds = new Set(enrollments.map(e => e.sectionId));

  const enlistmentOpen = activeTerm?.controls.enlistmentOpen ?? false;

  const availableSections = activeTerm
    ? state.sections.filter(s => s.termId === activeTerm.id && !enrolledSectionIds.has(s.id))
    : [];

  const filteredSections = availableSections.filter(s => {
    const course = state.courses.find(c => c.id === s.courseId);
    return !search || course?.code.toLowerCase().includes(search.toLowerCase()) ||
      course?.title.toLowerCase().includes(search.toLowerCase()) ||
      s.sectionCode.toLowerCase().includes(search.toLowerCase());
  });

  const handleEnlist = (sectionId: string) => {
    if (!enlistmentOpen) {
      toast({ title: 'Enlistment is closed', variant: 'destructive' });
      return;
    }
    const result = enlistSection(me.id, sectionId, activeTerm!.id);
    if (result.success) {
      toast({ title: 'Enlisted!', description: result.message });
    } else {
      toast({ title: 'Cannot enlist', description: result.message, variant: 'destructive' });
    }
  };

  const handleDrop = (sectionId: string) => {
    dropSection(me.id, sectionId, activeTerm!.id);
    toast({ title: 'Section dropped', description: 'You have been removed from this class.' });
  };

  // Build timetable blocks
  const timetableBlocks: Array<{ sec: Section; day: Day; isLab: boolean; colorIdx: number }> = [];
  enrollments.forEach((enr, idx) => {
    const sec = state.sections.find(s => s.id === enr.sectionId);
    if (!sec) return;
    const colorIdx = idx % COLORS.length;
    sec.schedule.days.forEach(day => {
      timetableBlocks.push({ sec, day: day as Day, isLab: false, colorIdx });
    });
    sec.labSchedule?.days.forEach(day => {
      timetableBlocks.push({ sec, day: day as Day, isLab: true, colorIdx });
    });
  });

  const START_MIN = 7 * 60;
  const TOTAL_MIN = 14 * 60; // 7AM to 9PM

  return (
    <PortalLayout title="Class Enlistment">
      <div className="space-y-5">
        {!enlistmentOpen && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800">
            <AlertTriangle size={16} />
            <span className="text-sm font-medium">Enlistment is currently closed.</span>
          </div>
        )}

        <Tabs defaultValue="available">
          <TabsList className="bg-muted">
            <TabsTrigger value="available">Available Sections</TabsTrigger>
            <TabsTrigger value="timetable" className="flex items-center gap-1.5">
              My Timetable
              {enrollments.length > 0 && (
                <Badge className="bg-secondary text-secondary-foreground text-xs">{enrollments.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Available sections */}
          <TabsContent value="available">
            <div className="space-y-4">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search course code or title..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/40">
                          {['Course', 'Sec', 'Faculty', 'Schedule', 'Slots', 'Units', ''].map(h => (
                            <th key={h} className="text-left py-2.5 px-4 text-muted-foreground font-semibold text-xs uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSections.map(sec => {
                          const course = state.courses.find(c => c.id === sec.courseId);
                          const faculty = state.users.find(u => u.id === sec.facultyId);
                          const isFull = sec.enrolled >= sec.slots;

                          // Check overlap
                          const testResult = activeTerm
                            ? checkOverlap(sec, enrollments.map(e => state.sections.find(s => s.id === e.sectionId)!).filter(Boolean))
                            : false;

                          return (
                            <tr key={sec.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                              <td className="py-2.5 px-4">
                                <p className="font-semibold text-foreground">{course?.code}</p>
                                <p className="text-xs text-muted-foreground truncate max-w-36">{course?.title}</p>
                                {course?.isPE && <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-300 mt-0.5">PE</Badge>}
                                {course?.isNSTP && <Badge className="text-xs bg-purple-100 text-purple-700 border-purple-300 mt-0.5">NSTP</Badge>}
                              </td>
                              <td className="py-2.5 px-4 font-mono text-foreground">{sec.sectionCode}</td>
                              <td className="py-2.5 px-4 text-muted-foreground text-xs">{faculty?.name}</td>
                              <td className="py-2.5 px-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1"><Clock size={10} />{sec.schedule.days.join('')} {sec.schedule.startTime}–{sec.schedule.endTime}</div>
                                {sec.labSchedule && <div className="flex items-center gap-1 text-secondary mt-0.5"><MapPin size={10} />Lab: {sec.labSchedule.days.join('')} {sec.labSchedule.startTime}–{sec.labSchedule.endTime}</div>}
                              </td>
                              <td className="py-2.5 px-4">
                                <div className="flex items-center gap-1 text-sm">
                                  <Users size={12} className="text-muted-foreground" />
                                  <span className={isFull ? 'text-destructive font-bold' : 'text-foreground'}>{sec.enrolled}/{sec.slots}</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-4 text-foreground font-medium">
                                {course?.units}{course?.labUnits ? `+${course.labUnits}` : ''}
                              </td>
                              <td className="py-2.5 px-4">
                                {isFull ? (
                                  <Badge className="text-xs bg-red-100 text-red-700 border-red-300">Full</Badge>
                                ) : testResult ? (
                                  <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-300 flex items-center gap-0.5">
                                    <AlertTriangle size={10} /> Conflict
                                  </Badge>
                                ) : (
                                  <Button
                                    size="sm"
                                    className="bg-secondary hover:bg-secondary/90 h-7 text-xs gap-1"
                                    onClick={() => handleEnlist(sec.id)}
                                    disabled={!enlistmentOpen}
                                  >
                                    <BookPlus size={12} /> Enlist
                                  </Button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {filteredSections.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">No available sections found.</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Currently enlisted */}
              {enrollments.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-secondary flex items-center gap-2">
                      <CheckCircle size={16} /> My Enlisted Classes ({enrollments.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {enrollments.map(enr => {
                        const sec = state.sections.find(s => s.id === enr.sectionId);
                        const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
                        const faculty = sec ? state.users.find(u => u.id === sec.facultyId) : null;
                        return (
                          <div key={enr.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/5 border border-secondary/20 gap-3">
                            <div>
                              <p className="font-semibold text-foreground text-sm">{course?.code} — {course?.title} | Sec {sec?.sectionCode}</p>
                              <p className="text-xs text-muted-foreground">
                                {sec?.schedule.days.join('')} {sec?.schedule.startTime}–{sec?.schedule.endTime} · {sec?.schedule.room} · {faculty?.name}
                              </p>
                            </div>
                            {enlistmentOpen && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground h-7 text-xs gap-1"
                                onClick={() => handleDrop(enr.sectionId)}
                              >
                                <Trash2 size={12} /> Drop
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Timetable */}
          <TabsContent value="timetable">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Weekly Schedule — {activeTerm?.name}</CardTitle>
              </CardHeader>
              <CardContent>
                {enrollments.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No enlisted classes yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="min-w-[600px]">
                      {/* Header */}
                      <div className="grid grid-cols-7 gap-px bg-border mb-px">
                        <div className="bg-muted px-2 py-2 text-xs font-semibold text-muted-foreground">Time</div>
                        {DAY_COLS.map(d => (
                          <div key={d} className="bg-primary px-2 py-2 text-center text-xs font-bold text-primary-foreground">{DAY_LABELS[d]}</div>
                        ))}
                      </div>
                      {/* Grid rows */}
                      <div className="relative border border-border rounded-b-lg overflow-hidden">
                        {HOURS.map(hour => (
                          <div key={hour} className="grid grid-cols-7 gap-px bg-border" style={{ height: '56px' }}>
                            <div className="bg-muted flex items-start justify-end pr-2 pt-1">
                              <span className="text-xs text-muted-foreground">{hour}:00</span>
                            </div>
                            {DAY_COLS.map(day => (
                              <div key={day} className="bg-card relative" />
                            ))}
                          </div>
                        ))}
                        {/* Floating blocks */}
                        <div className="absolute inset-0 grid grid-cols-7 pointer-events-none">
                          <div /> {/* Time column */}
                          {DAY_COLS.map((day, colIdx) => (
                            <div key={day} className="relative">
                              {timetableBlocks
                                .filter(b => b.day === day)
                                .map(b => {
                                  const sched = b.isLab ? b.sec.labSchedule! : b.sec.schedule;
                                  const start = toMinutes(sched.startTime) - START_MIN;
                                  const duration = toMinutes(sched.endTime) - toMinutes(sched.startTime);
                                  const top = (start / TOTAL_MIN) * 100;
                                  const height = (duration / TOTAL_MIN) * 100;
                                  const course = state.courses.find(c => c.id === b.sec.courseId);
                                  return (
                                    <div
                                      key={`${b.sec.id}-${day}-${b.isLab}`}
                                      className={`absolute inset-x-0.5 rounded-md border ${COLORS[b.colorIdx]} px-1 py-0.5 pointer-events-auto overflow-hidden`}
                                      style={{ top: `${top}%`, height: `${height}%` }}
                                    >
                                      <p className="text-xs font-bold leading-tight truncate">{course?.code}</p>
                                      {b.isLab && <p className="text-xs leading-tight opacity-70">Lab</p>}
                                      <p className="text-xs leading-tight opacity-70 truncate">{b.sec.schedule.room}</p>
                                    </div>
                                  );
                                })}
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Legend */}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {enrollments.map((enr, idx) => {
                          const sec = state.sections.find(s => s.id === enr.sectionId);
                          const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
                          return (
                            <div key={enr.id} className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border ${COLORS[idx % COLORS.length]}`}>
                              <span className="font-semibold">{course?.code}</span>
                              <span className="opacity-70">Sec {sec?.sectionCode}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PortalLayout>
  );
}

function checkOverlap(newSec: Section, existing: Section[]): boolean {
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const overlaps = (a: { days: string[]; startTime: string; endTime: string }, b: { days: string[]; startTime: string; endTime: string }) => {
    if (!a.days.some(d => b.days.includes(d))) return false;
    return toMin(a.startTime) < toMin(b.endTime) && toMin(a.endTime) > toMin(b.startTime);
  };
  return existing.some(ex =>
    overlaps(ex.schedule, newSec.schedule) ||
    (newSec.labSchedule && overlaps(ex.schedule, newSec.labSchedule)) ||
    (ex.labSchedule && overlaps(ex.labSchedule, newSec.schedule))
  );
}
