import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { ChevronDown, ChevronRight, Users, BookOpen } from 'lucide-react';
import { PageIntro } from '@/components/shared/PageIntro';

export default function OCSCourseOverview() {
  const { state, getActiveTerm } = useApp();
  const me = state.currentUser;

  const activeTerm = getActiveTerm();
  const [termFilter, setTermFilter] = useState(activeTerm?.id ?? state.terms[0]?.id ?? '');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [studentModal, setStudentModal] = useState<{ sectionId: string; sectionCode: string; courseCode: string } | null>(null);

  const selectedTerm = state.terms.find(t => t.id === termFilter);

  // Resolve all department names within the OCS user's college
  const myCollege = me?.college ?? '';
  const collegeDeptNames = myCollege
    ? state.departments
        .filter(d => {
          const col = state.colleges.find(c => c.id === d.collegeId);
          return col?.name === myCollege;
        })
        .map(d => d.name)
    : [];

  // Filter courses: show all courses belonging to any department in the OCS user's college
  const deptCourses = collegeDeptNames.length > 0
    ? state.courses.filter(c => collegeDeptNames.includes(c.department))
    : state.courses;

  // Label to display in the badge
  const collegeLabel = myCollege || null;

  // Sections for selected term, filtered to dept courses
  const deptCourseIds = new Set(deptCourses.map(c => c.id));
  const termSections = termFilter
    ? state.sections.filter(s => s.termId === termFilter && deptCourseIds.has(s.courseId))
    : [];

  // Group sections by course
  const sectionsByCourse = deptCourses
    .filter(c => termSections.some(s => s.courseId === c.id))
    .map(course => ({
      course,
      sections: termSections.filter(s => s.courseId === course.id),
    }));

  const toggleCourse = (courseId: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(courseId)) next.delete(courseId); else next.add(courseId);
      return next;
    });
  };

  const formatSchedule = (s: { days: string[]; startTime: string; endTime: string; room: string } | undefined) => {
    if (!s) return '—';
    return `${s.days.join('')} ${s.startTime}–${s.endTime} | ${s.room}`;
  };

  const fillColor = (enrolled: number, slots: number) => {
    const pct = slots > 0 ? enrolled / slots : 0;
    if (pct >= 1) return 'text-destructive font-bold';
    if (pct >= 0.9) return 'text-orange-600 font-semibold';
    if (pct >= 0.7) return 'text-yellow-600';
    return 'text-secondary';
  };

  // Students enrolled in a section
  const getEnrolledStudents = (sectionId: string) =>
    state.enrollments
      .filter(e => e.sectionId === sectionId && e.termId === termFilter && e.status !== 'dropped')
      .map(e => state.users.find(u => u.id === e.studentId))
      .filter(Boolean);

  const modalStudents = studentModal
    ? getEnrolledStudents(studentModal.sectionId)
    : [];

  return (
    <PortalLayout title="Course Overview">
      <div className="space-y-4">
        <PageIntro description="Department-level view of course enrollment counts and section capacity." />
        {/* Term Selector */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-muted-foreground">Term:</label>
          <Select value={termFilter} onValueChange={setTermFilter}>
            <SelectTrigger className="w-56 h-8 text-sm">
              <SelectValue placeholder="Select term..." />
            </SelectTrigger>
            <SelectContent>
              {state.terms.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {collegeLabel && <Badge variant="outline" className="text-xs">{collegeLabel}</Badge>}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Courses with Sections', value: sectionsByCourse.length, icon: <BookOpen size={14} /> },
            { label: 'Total Sections', value: termSections.length, icon: <Users size={14} /> },
            { label: 'Total Enrolled', value: termSections.reduce((a, s) => a + s.enrolled, 0), icon: <Users size={14} /> },
          ].map(stat => (
            <div key={stat.label} className="rounded-md border border-border overflow-hidden">
              <div className="portal-panel-header">
                <span className="text-xs font-semibold">{stat.label}</span>
                {stat.icon}
              </div>
              <div className="px-3 py-2 bg-background">
                <span className="text-xl font-bold text-secondary">{stat.value}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Courses & Sections Table */}
        {!termFilter ? (
          <p className="text-sm text-muted-foreground text-center py-8">Select a term to view courses.</p>
        ) : sectionsByCourse.length === 0 ? (
          <div className="rounded-md border border-border p-8 text-center">
            <BookOpen size={32} className="mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No sections found for {selectedTerm?.name ?? 'this term'}{myCollege ? ` in ${myCollege}` : ''}.</p>
          </div>
        ) : (
          <div className="rounded-md border border-border overflow-hidden">
            {sectionsByCourse.map(({ course, sections }, idx) => {
              const isOpen = expanded.has(course.id);
              const totalEnrolled = sections.reduce((a, s) => a + s.enrolled, 0);
              const totalSlots = sections.reduce((a, s) => a + s.slots, 0);
              return (
                <div key={course.id} className={idx > 0 ? 'border-t border-border' : ''}>
                  {/* Course Header Row */}
                  <button
                    onClick={() => toggleCourse(course.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-muted/40 hover:bg-muted/70 transition-colors text-left"
                  >
                    {isOpen ? <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" /> : <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-sm text-foreground">{course.code}</span>
                      <span className="text-sm text-muted-foreground ml-2">{course.title}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-shrink-0">
                      <span>{sections.length} section{sections.length !== 1 ? 's' : ''}</span>
                      <span className={fillColor(totalEnrolled, totalSlots)}>{totalEnrolled}/{totalSlots} enrolled</span>
                      <Badge variant="outline" className="text-xs">{course.units} units</Badge>
                    </div>
                  </button>

                  {/* Sections Table */}
                  {isOpen && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-muted/20 border-y border-border">
                            <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Section</th>
                            <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Faculty</th>
                            <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Schedule</th>
                            <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Lab Schedule</th>
                            <th className="text-center px-4 py-2 font-semibold text-muted-foreground">Slots</th>
                            <th className="text-center px-4 py-2 font-semibold text-muted-foreground">Enrolled</th>
                            <th className="text-center px-4 py-2 font-semibold text-muted-foreground">Fill %</th>
                            <th className="text-center px-4 py-2 font-semibold text-muted-foreground">Students</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sections.map((sec, si) => {
                            const faculty = state.users.find(u => u.id === sec.facultyId);
                            const pct = sec.slots > 0 ? Math.round((sec.enrolled / sec.slots) * 100) : 0;
                            return (
                              <tr key={sec.id} className={`border-b border-border/50 ${si % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}>
                                <td className="px-4 py-2.5 font-semibold text-foreground">{sec.sectionCode}</td>
                                <td className="px-4 py-2.5 text-muted-foreground">
                                    {faculty?.name ?? '—'}
                                    {sec.facultyHidden && <span className="ml-1.5 text-[10px] text-amber-600 font-medium">(hidden from students)</span>}
                                  </td>
                                <td className="px-4 py-2.5 text-muted-foreground">{formatSchedule(sec.schedule)}</td>
                                <td className="px-4 py-2.5 text-muted-foreground">{sec.labSchedule ? formatSchedule(sec.labSchedule) : '—'}</td>
                                <td className="px-4 py-2.5 text-center font-medium">{sec.slots}</td>
                                <td className={`px-4 py-2.5 text-center ${fillColor(sec.enrolled, sec.slots)}`}>{sec.enrolled}</td>
                                <td className="px-4 py-2.5 text-center">
                                  <div className="flex flex-col items-center gap-1">
                                    <span className={fillColor(sec.enrolled, sec.slots)}>{pct}%</span>
                                    <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-destructive' : pct >= 90 ? 'bg-orange-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-secondary'}`}
                                        style={{ width: `${Math.min(pct, 100)}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-xs px-2"
                                    onClick={() => setStudentModal({ sectionId: sec.id, sectionCode: sec.sectionCode, courseCode: course.code })}
                                  >
                                    <Users size={10} className="mr-1" />
                                    {sec.enrolled}
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Student List Modal */}
      <Dialog open={!!studentModal} onOpenChange={v => { if (!v) setStudentModal(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {studentModal?.courseCode} — Section {studentModal?.sectionCode}
              <span className="ml-2 text-muted-foreground font-normal">({modalStudents.length} students)</span>
            </DialogTitle>
          </DialogHeader>
          {modalStudents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No enrolled students.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 font-semibold text-muted-foreground">#</th>
                  <th className="text-left py-2 font-semibold text-muted-foreground">Student Name</th>
                  <th className="text-left py-2 font-semibold text-muted-foreground">Student No.</th>
                  <th className="text-left py-2 font-semibold text-muted-foreground">Program</th>
                </tr>
              </thead>
              <tbody>
                {modalStudents.map((student, i) => (
                  <tr key={student!.id} className="border-b border-border/50">
                    <td className="py-2 text-muted-foreground">{i + 1}</td>
                    <td className="py-2 font-medium">{student!.name}</td>
                    <td className="py-2 text-muted-foreground">{student!.studentNumber ?? '—'}</td>
                    <td className="py-2 text-muted-foreground text-xs">{student!.program ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
