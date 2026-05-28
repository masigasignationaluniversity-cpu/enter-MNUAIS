import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Users, Clock, MapPin, FlaskConical, ChevronDown } from 'lucide-react';
import { PageIntro } from '@/components/shared/PageIntro';

export default function FacultyClasses() {
  const { state, getActiveTerm } = useApp();
  const me = state.currentUser;
  const activeTerm = getActiveTerm();
  const allTerms = state.terms;
  const [selectedTermId, setSelectedTermId] = useState(activeTerm?.id ?? allTerms[0]?.id ?? '');

  if (!me) return null;

  const selectedTerm = allTerms.find(t => t.id === selectedTermId);
  const classes = state.sections.filter(s => s.facultyId === me.id && s.termId === selectedTermId);

  return (
    <PortalLayout title="My Classes">
      <div className="space-y-5">
        <PageIntro description="View your assigned sections, enrolled students, and class details per term." />
        {/* Term dropdown */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground flex-shrink-0">
            <ChevronDown size={16} />
            Term:
          </div>
          <Select value={selectedTermId} onValueChange={setSelectedTermId}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Select term..." />
            </SelectTrigger>
            <SelectContent>
              {allTerms.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  <span className="flex items-center gap-2">
                    {t.name}
                    {t.isActive && <Badge className="bg-secondary text-secondary-foreground text-xs h-4 px-1 ml-1">Active</Badge>}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!selectedTerm ? (
          <div className="portal-panel">
            <div className="portal-panel-header">My Classes</div>
            <div className="py-10 text-center bg-background">
              <p className="text-muted-foreground">Select a term to view classes.</p>
            </div>
          </div>
        ) : classes.length === 0 ? (
          <div className="portal-panel">
            <div className="portal-panel-header">My Classes</div>
            <div className="py-10 text-center bg-background">
              <p className="text-muted-foreground">No classes assigned for {selectedTerm.name}.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {classes.map(sec => {
              const course = state.courses.find(c => c.id === sec.courseId);
              const sectionEnrollments = state.enrollments
                .filter(e => e.sectionId === sec.id && e.status !== 'dropped');
              const enrolledStudents = sectionEnrollments
                .map(e => ({
                  user: state.users.find(u => u.id === e.studentId),
                  finalized: e.status === 'enrolled',
                }))
                .filter(s => !!s.user) as { user: typeof state.users[number]; finalized: boolean }[];
              const finalizedCount = sectionEnrollments.filter(e => e.status === 'enrolled').length;
              const totalCount = sectionEnrollments.length;

              return (
                <div key={sec.id} className="portal-panel">
                  <div className="portal-panel-header flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-bold">{course?.code} — Section {sec.sectionCode}</p>
                      <p className="text-xs font-normal opacity-80">{course?.title}</p>
                      <span className="inline-block mt-1 text-xs bg-primary-foreground/15 text-primary-foreground rounded px-2 py-0.5">
                        {course?.type} · {course?.units} units
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 text-xs text-primary-foreground/80">
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        {sec.schedule.days.join('')} {sec.schedule.startTime}–{sec.schedule.endTime}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin size={12} /> {sec.schedule.room}
                      </div>
                      {sec.labSchedule && (
                        <div className="flex items-center gap-1">
                          <FlaskConical size={12} />
                          {sec.labSchedule.days.join('')} {sec.labSchedule.startTime}–{sec.labSchedule.endTime} | {sec.labSchedule.room}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Users size={12} />
                        {finalizedCount}/{totalCount} finalized · {sec.slots} slots
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-background">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Students ({totalCount} enlisted · {finalizedCount} finalized)</p>
                    {enrolledStudents.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No students enlisted yet.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {enrolledStudents.map(({ user: stu, finalized }) => {
                          const initials = stu.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                          const grade = state.grades.find(g => g.studentId === stu.id && g.sectionId === sec.id);
                          return (
                            <div key={stu.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 border border-border">
                              <Avatar className="h-7 w-7 flex-shrink-0">
                                <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-foreground truncate">{stu.name}</p>
                                <p className="text-xs text-muted-foreground">{stu.studentNumber}</p>
                              </div>
                              <div className="flex flex-col items-end gap-0.5">
                                {grade?.grade && (
                                  <Badge className="text-xs bg-secondary/10 text-secondary border-secondary/30">{grade.grade}</Badge>
                                )}
                                <Badge className={`text-xs ${finalized ? 'bg-green-100 text-green-700 border-green-300' : 'bg-yellow-100 text-yellow-700 border-yellow-300'}`}>
                                  {finalized ? 'Finalized' : 'Enlisted'}
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
