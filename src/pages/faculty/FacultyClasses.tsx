import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Users, Clock, MapPin, FlaskConical, ChevronDown, Download } from 'lucide-react';
import { getPassedUnits, getYearClassification } from '@/lib/academic';

export default function FacultyClasses() {
  const { state, getActiveTerm } = useApp();
  const me = state.currentUser;
  const activeTerm = getActiveTerm();
  const allTerms = state.terms;
  const [selectedTermId, setSelectedTermId] = useState(activeTerm?.id ?? allTerms[0]?.id ?? '');

  if (!me) return null;

  const selectedTerm = allTerms.find(t => t.id === selectedTermId);
  // For Lec+Lab/Lec+Rec: the lab/rec section faculty manages that class list.
  // Lecture sections that have child lab/rec sections are excluded — the lab/rec faculty owns it.
  const classes = state.sections.filter(s => {
    if (s.facultyId !== me.id || s.termId !== selectedTermId) return false;
    const hasChildren = state.sections.some(cs => cs.parentSectionId === s.id && cs.termId === s.termId);
    return !hasChildren;
  });

  const getYearClassForStudent = (studentId: string): string => {
    const student = state.users.find(u => u.id === studentId);
    if (!student) return '—';
    const deg = state.degreePrograms.find(p => p.id === student.program || p.name === student.program);
    const totalUnits = deg?.totalUnits ?? 0;
    if (totalUnits === 0) return student.yearLevel ? `Year ${student.yearLevel}` : '—';
    const passed = getPassedUnits(studentId, state.grades, state.sections, state.courses, state.enrollments);
    return getYearClassification(passed, totalUnits, deg?.degreeType) ?? `Year ${student.yearLevel ?? 1}`;
  };

  const exportSectionCSV = (secId: string) => {
    const sec = state.sections.find(s => s.id === secId);
    if (!sec) return;
    const course = state.courses.find(c => c.id === sec.courseId);
    const enrollments = state.enrollments.filter(e => e.sectionId === secId && e.status !== 'dropped');
    const rows = [['Student Name', 'Student Number', 'Email', 'Program', 'Year Classification']];
    enrollments.forEach(e => {
      const student = state.users.find(u => u.id === e.studentId);
      if (!student) return;
      rows.push([
        student.name,
        student.studentNumber ?? '—',
        student.email ?? '—',
        student.program ?? '—',
        getYearClassForStudent(student.id),
      ]);
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Students_${course?.code ?? ''}_Sec${sec.sectionCode}.csv`.replace(/\s/g, '_');
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PortalLayout title="My Classes">
      <div className="space-y-5">
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
                      <div className="flex items-center gap-2">
                        <p className="font-bold">{course?.code} — Section {sec.sectionCode}</p>
                        {sec.parentSectionId && (
                          <span className="text-xs bg-blue-100 text-blue-700 rounded px-1.5 py-0.5 font-semibold">
                            {sec.sectionType === 'recitation' ? 'Recitation' : 'Lab'}
                          </span>
                        )}
                      </div>
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
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Students ({totalCount} enlisted · {finalizedCount} finalized)</p>
                      {enrolledStudents.length > 0 && (
                        <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={() => exportSectionCSV(sec.id)}>
                          <Download className="w-3.5 h-3.5" /> Export Students CSV
                        </Button>
                      )}
                    </div>
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

