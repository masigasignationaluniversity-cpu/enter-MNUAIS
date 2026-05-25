import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Users, Clock, MapPin, FlaskConical } from 'lucide-react';

export default function FacultyClasses() {
  const { state, getActiveTerm } = useApp();
  const me = state.currentUser;
  if (!me) return null;
  const activeTerm = getActiveTerm();
  const allTerms = state.terms;

  const getClasses = (termId: string) =>
    state.sections.filter(s => s.facultyId === me.id && s.termId === termId);

  return (
    <PortalLayout title="My Classes">
      <div className="space-y-5">
        <Tabs defaultValue={activeTerm?.id ?? allTerms[0]?.id}>
          <TabsList className="bg-muted">
            {allTerms.map(t => (
              <TabsTrigger key={t.id} value={t.id} className="flex items-center gap-1.5">
                {t.name}
                {t.isActive && <Badge className="bg-secondary text-secondary-foreground text-xs h-4 px-1">Active</Badge>}
              </TabsTrigger>
            ))}
          </TabsList>

          {allTerms.map(term => {
            const classes = getClasses(term.id);
            return (
              <TabsContent key={term.id} value={term.id}>
                {classes.length === 0 ? (
                  <Card>
                    <CardContent className="py-10 text-center">
                      <p className="text-muted-foreground">No classes assigned for {term.name}.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {classes.map(sec => {
                      const course = state.courses.find(c => c.id === sec.courseId);
                      const enrolledStudents = state.enrollments
                        .filter(e => e.sectionId === sec.id && e.status === 'enrolled')
                        .map(e => state.users.find(u => u.id === e.studentId))
                        .filter(Boolean) as typeof state.users;

                      return (
                        <Card key={sec.id}>
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                              <div>
                                <CardTitle className="text-base">{course?.code} — Section {sec.sectionCode}</CardTitle>
                                <p className="text-sm text-muted-foreground">{course?.title}</p>
                                <Badge className="mt-1.5 text-xs bg-primary/10 text-primary border-primary/30">
                                  {course?.type} · {course?.units} units
                                </Badge>
                              </div>
                              <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Clock size={12} />
                                  {sec.schedule.days.join('')} {sec.schedule.startTime}–{sec.schedule.endTime}
                                </div>
                                <div className="flex items-center gap-1">
                                  <MapPin size={12} /> {sec.schedule.room}
                                </div>
                                {sec.labSchedule && (
                                  <div className="flex items-center gap-1 text-secondary">
                                    <FlaskConical size={12} />
                                    {sec.labSchedule.days.join('')} {sec.labSchedule.startTime}–{sec.labSchedule.endTime} | {sec.labSchedule.room}
                                  </div>
                                )}
                                <div className="flex items-center gap-1">
                                  <Users size={12} />
                                  {sec.enrolled}/{sec.slots} enrolled
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Enrolled Students</p>
                            {enrolledStudents.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No students enrolled yet.</p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {enrolledStudents.map(stu => {
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
                                      {grade?.grade && (
                                        <Badge className="text-xs bg-secondary/10 text-secondary border-secondary/30">
                                          {grade.grade}
                                        </Badge>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </PortalLayout>
  );
}
