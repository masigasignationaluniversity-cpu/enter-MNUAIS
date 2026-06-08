import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { Badge } from '../../components/ui/badge';
import { TermSelect } from '@/components/shared/TermSelect';
import { CalendarDays, ChevronDown } from 'lucide-react';
import type { Day } from '../../lib/types';

const DAYS: Day[] = ['M', 'T', 'W', 'Th', 'F', 'S'];
const DAY_LABELS: Record<Day, string> = { M: 'Mon', T: 'Tue', W: 'Wed', Th: 'Thu', F: 'Fri', S: 'Sat' };
const COLORS = [
  'bg-blue-100 border-blue-400 text-blue-900',
  'bg-green-100 border-green-400 text-green-900',
  'bg-purple-100 border-purple-400 text-purple-900',
  'bg-orange-100 border-orange-400 text-orange-900',
  'bg-pink-100 border-pink-400 text-pink-900',
  'bg-cyan-100 border-cyan-400 text-cyan-900',
  'bg-yellow-100 border-yellow-500 text-yellow-900',
  'bg-red-100 border-red-400 text-red-900',
];

const START_HOUR = 7;
const END_HOUR = 20;
const TOTAL_MINS = (END_HOUR - START_HOUR) * 60;

function toMinutes(time: string) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

export default function FacultyTimetable() {
  const { state, getActiveTerm } = useApp();
  const me = state.currentUser;
  const activeTerm = getActiveTerm();
  const allTerms = state.terms;
  const relevantTermIds = new Set(state.sections.filter(s => s.facultyId === me?.id).map(s => s.termId));
  const relevantTerms = allTerms.filter(t => relevantTermIds.has(t.id) || !!t.isActive);
  const [selectedTermId, setSelectedTermId] = useState(activeTerm?.id ?? relevantTerms[0]?.id ?? '');

  if (!me) return null;

  const renderTimetable = (termId: string) => {
    const sections = state.sections.filter(s => s.facultyId === me.id && s.termId === termId);
    const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

    if (sections.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>No sections assigned for this term.</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            <div className="text-xs text-muted-foreground text-right pr-2 font-medium">Time</div>
            {DAYS.map(d => (
              <div key={d} className="text-xs font-semibold text-center text-muted-foreground">{DAY_LABELS[d]}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {/* Time labels */}
            <div className="relative" style={{ height: `${TOTAL_MINS}px` }}>
              {hours.map(h => (
                <div key={h} className="absolute right-2 text-xs text-muted-foreground/70 leading-none" style={{ top: `${(h - START_HOUR) * 60}px` }}>
                  {h === 12 ? '12:00' : h < 12 ? `${h}:00` : `${h - 12}:00`}
                </div>
              ))}
            </div>

            {DAYS.map(day => (
              <div key={day} className="relative border border-border rounded bg-muted/20" style={{ height: `${TOTAL_MINS}px` }}>
                {hours.map(h => (
                  <div key={h} className="absolute w-full border-t border-border/40" style={{ top: `${(h - START_HOUR) * 60}px` }} />
                ))}

                {sections.map((sec, ci) => {
                  const course = state.courses.find(c => c.id === sec.courseId);
                  const color = COLORS[ci % COLORS.length];
                  const blocks = [];

                  if (sec.schedule.days.includes(day)) {
                    const top = toMinutes(sec.schedule.startTime) - START_HOUR * 60;
                    const height = toMinutes(sec.schedule.endTime) - toMinutes(sec.schedule.startTime);
                    const enrolled = state.enrollments.filter(e => e.sectionId === sec.id && e.status === 'enrolled').length;
                    blocks.push(
                      <div
                        key={`lec-${sec.id}`}
                        className={`absolute w-[95%] left-[2.5%] rounded border text-xs px-1 py-0.5 overflow-hidden ${color}`}
                        style={{ top, height: `${height}px` }}
                      >
                        <p className="font-bold truncate">{course?.code}</p>
                        <p className="truncate opacity-80 text-[10px]">§{sec.sectionCode}</p>
                        <p className="truncate opacity-70 text-[10px]">{sec.schedule.room}</p>
                        <p className="truncate opacity-70 text-[10px]">{enrolled} enrolled</p>
                      </div>
                    );
                  }

                  if (sec.labSchedule && sec.labSchedule.days.includes(day)) {
                    const top = toMinutes(sec.labSchedule.startTime) - START_HOUR * 60;
                    const height = toMinutes(sec.labSchedule.endTime) - toMinutes(sec.labSchedule.startTime);
                    blocks.push(
                      <div
                        key={`lab-${sec.id}`}
                        className={`absolute w-[95%] left-[2.5%] rounded border text-xs px-1 py-0.5 overflow-hidden ${color} opacity-80`}
                        style={{ top, height: `${height}px` }}
                      >
                        <p className="font-bold truncate">{course?.code} Lab</p>
                        <p className="truncate opacity-80 text-[10px]">§{sec.sectionCode}</p>
                        <p className="truncate opacity-70 text-[10px]">{sec.labSchedule.room}</p>
                      </div>
                    );
                  }

                  return blocks;
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-2">
            {sections.map((sec, ci) => {
              const course = state.courses.find(c => c.id === sec.courseId);
              const enrolled = state.enrollments.filter(e => e.sectionId === sec.id && e.status === 'enrolled').length;
              return (
                <Badge key={sec.id} className={`text-xs gap-1.5 border ${COLORS[ci % COLORS.length]}`}>
                  {course?.code} §{sec.sectionCode} — {enrolled}/{sec.slots} enrolled
                </Badge>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <PortalLayout title="My Timetable">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">My Teaching Timetable</h2>
            <p className="text-sm text-muted-foreground">All sections you handle, plotted by day and time.</p>
          </div>
        </div>

        <TermSelect terms={relevantTerms} value={selectedTermId} onValueChange={setSelectedTermId} />

        {selectedTermId && (() => {
          const term = allTerms.find(t => t.id === selectedTermId);
          if (!term) return null;
          return (
            <div className="portal-panel">
              <div className="portal-panel-header flex-wrap gap-2">
                <span className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" /> {term.name} Schedule
                </span>
              </div>
              <div className="p-4 bg-background">
                <div className="bg-white p-2">
                  {renderTimetable(term.id)}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </PortalLayout>
  );
}
