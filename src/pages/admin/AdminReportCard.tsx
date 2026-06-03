import { useState } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { isNonAcademicCourse } from '@/lib/utils';
import { getEffectiveGradeWithRules, getPassedUnits, getYearClassification } from '@/lib/academic';
import { Download, FileText, Search } from 'lucide-react';
import type { GradeValue } from '@/lib/types';

const gradeRemarks = (g: GradeValue | null) => {
  if (!g) return '—';
  if (['1.0','1.25','1.5','1.75','2.0','2.25','2.5','2.75','3.0','P','S'].includes(g)) return 'PASSED';
  if (g === '4') return 'CONDITIONAL';
  if (g === '5') return 'FAILED';
  if (g === 'INC') return 'INCOMPLETE';
  if (g === 'DRP') return 'DROPPED';
  if (g === 'F' || g === 'U') return 'FAILED';
  return g;
};

const yearClassColor = (yc: string) => {
  if (yc === '1st Year') return 'bg-blue-100 text-blue-800 border-blue-200';
  if (yc === '2nd Year') return 'bg-indigo-100 text-indigo-800 border-indigo-200';
  if (yc === '3rd Year') return 'bg-violet-100 text-violet-800 border-violet-200';
  if (yc === '4th Year') return 'bg-purple-100 text-purple-800 border-purple-200';
  return 'bg-gray-100 text-gray-700 border-gray-200';
};

const grBadge = (g: string) =>
  ['1.0','1.25','1.5','1.75','2.0','2.25','2.5','2.75','3.0','S','P'].includes(g) ? 'bg-green-100 text-green-800' :
  g === '5' || g === 'F' || g === 'U' ? 'bg-red-100 text-red-800' :
  g === 'INC' || g === '4' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700';

export default function AdminReportCard() {
  const { state, computeGWA } = useApp();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const searchResults = search.trim().length > 0
    ? state.users.filter(u => u.role === 'student' && u.status !== 'inactive' && (
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        (u.studentNumber ?? '').toLowerCase().includes(search.toLowerCase())
      ))
    : [];

  const student = selectedId
    ? state.users.find(u => u.id === selectedId)
    : (searchResults.length === 1 ? searchResults[0] : null);

  const getStudentTerms = (studentId: string) =>
    state.terms.filter(term =>
      state.grades.some(g => g.studentId === studentId && g.termId === term.id) ||
      state.enrollments.some(e => e.studentId === studentId && e.termId === term.id)
    ).sort((a, b) => {
      if (a.academicYear !== b.academicYear) return a.academicYear.localeCompare(b.academicYear);
      const order = ['1st', '2nd', 'Summer'];
      return order.indexOf(a.semester) - order.indexOf(b.semester);
    });

  const getTermRows = (studentId: string, termId: string) => {
    const termGrades = state.grades.filter(g => g.studentId === studentId && g.termId === termId);
    return termGrades.map(g => {
      const sec = state.sections.find(s => s.id === g.sectionId);
      const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
      return course ? { g, sec, course } : null;
    }).filter(Boolean) as Array<{ g: typeof termGrades[0]; sec: typeof state.sections[0]; course: typeof state.courses[0] }>;
  };

  const handleExportCSV = () => {
    if (!student) return;
    const terms = getStudentTerms(student.id);
    const { gwa } = computeGWA(student.id);
    const lines: string[] = ['Term,Course Code,Course Title,Units,Grade,Final Grade,Remarks'];
    terms.forEach(term => {
      getTermRows(student.id, term.id).forEach(({ course, g }) => {
        const orig = g.grade ?? 'N/A';
        const eff = getEffectiveGradeWithRules(g, state.grades, state.sections, state.terms);
        const wasConverted = g.grade === '4' && eff === '5';
        const final = (g.removalSubmitted && g.removalGrade) ? g.removalGrade : wasConverted ? '5 (auto)' : '';
        lines.push(`"${term.name}","${course.code}","${course.title}",${course.units + (course.labUnits ?? 0)},${orig},${final},${gradeRemarks(g.removalGrade ?? g.grade)}`);
      });
    });
    if (gwa > 0) lines.push(`,,,,Cumulative GWA,${gwa.toFixed(2)}`);
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `TOR_${student.studentNumber ?? student.name.replace(/\s/g, '_')}.csv` });
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const { gwa: cumGwa, perTerm } = student ? computeGWA(student.id) : { gwa: 0, perTerm: [] };
  const passedUnits = student ? getPassedUnits(student.id, state.grades, state.sections, state.courses, state.enrollments) : 0;
  const totalUnitsEarned = student ? state.grades.filter(g => g.studentId === student.id).reduce((s, g) => {
    const sec = state.sections.find(x => x.id === g.sectionId);
    const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
    return course && !isNonAcademicCourse(course) ? s + course.units + (course.labUnits ?? 0) : s;
  }, 0) : 0;
  const yc = student ? getYearClassification(passedUnits) : null;
  const terms = student ? getStudentTerms(student.id) : [];

  return (
    <PortalLayout role="admin" userName={state.currentUser?.name ?? ''}>
      <div className="space-y-4">

        {/* Search */}
        <div className="portal-panel">
          <div className="portal-panel-header">
            <FileText className="w-4 h-4" /> Generate Transcript of Record
          </div>
          <div className="p-4 bg-background space-y-3">
            <div className="relative max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by student number or name…"
                className="pl-9"
                value={search}
                onChange={e => { setSearch(e.target.value); setSelectedId(null); }}
              />
            </div>
            {search.trim() && searchResults.length > 1 && !selectedId && (
              <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                {searchResults.map(s => (
                  <button key={s.id} className="w-full text-left px-4 py-2.5 hover:bg-muted/40 flex items-center justify-between"
                    onClick={() => setSelectedId(s.id)}>
                    <div>
                      <span className="font-medium text-sm">{s.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground font-mono">{s.studentNumber ?? '—'}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{s.program ?? ''}</span>
                  </button>
                ))}
              </div>
            )}
            {search.trim() && searchResults.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">No students found matching "{search}"</p>
            )}
          </div>
        </div>

        {!search.trim() && (
          <div className="portal-panel">
            <div className="py-12 text-center text-muted-foreground bg-background">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Search for a student to view their transcript</p>
              <p className="text-sm mt-1">Enter a student number or name above.</p>
            </div>
          </div>
        )}

        {student && (
          <div className="space-y-3">
            {/* Student Header */}
            <div className="portal-panel">
              <div className="p-4 bg-background">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <p className="font-semibold text-base">{student.name}</p>
                    <p className="text-sm text-muted-foreground font-mono">{student.studentNumber ?? '—'}</p>
                    <p className="text-sm text-muted-foreground">{student.program ?? '—'}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {yc && <Badge className={`text-xs border ${yearClassColor(yc)}`}>{yc}</Badge>}
                      {totalUnitsEarned > 0 && <Badge variant="outline" className="text-xs">{passedUnits}/{totalUnitsEarned} units passed</Badge>}
                      {cumGwa > 0 && <Badge className="text-xs bg-primary/10 text-primary border-primary/20">CUM GWA: {cumGwa.toFixed(2)}</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={handleExportCSV}>
                      <Download className="w-3.5 h-3.5" /> CSV
                    </Button>
                    <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => window.print()}>
                      <FileText className="w-3.5 h-3.5" /> Print
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Per-term tables */}
            {terms.length === 0 ? (
              <div className="portal-panel"><div className="py-8 text-center text-muted-foreground bg-background">No enrollment records found.</div></div>
            ) : (
              terms.map(term => {
                const rows = getTermRows(student.id, term.id);
                const termGwa = perTerm.find(p => p.term.id === term.id)?.gwa;
                return (
                  <div key={term.id} className="portal-panel">
                    <div className="portal-panel-header">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <span>{term.name}</span>
                          {term.isActive && <Badge className="bg-green-100 text-green-800 text-xs">Active</Badge>}
                        </div>
                        {termGwa && <span className="text-xs font-semibold">Sem GWA: {termGwa.toFixed(2)}</span>}
                      </div>
                    </div>
                    <div className="p-0 bg-background overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead className="text-xs">Code</TableHead>
                            <TableHead className="text-xs">Title</TableHead>
                            <TableHead className="text-xs text-center">Units</TableHead>
                            <TableHead className="text-xs text-center">Grade</TableHead>
                            <TableHead className="text-xs text-center">Final Grade</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rows.map(({ course, g }) => {
                            const origGrade = g.grade ?? null;
                            const effGrade = getEffectiveGradeWithRules(g, state.grades, state.sections, state.terms);
                            const wasAutoConverted = origGrade === '4' && effGrade === '5';
                            const finalChanged = (g.removalSubmitted && g.removalGrade) || wasAutoConverted;
                            const finalDisplay = finalChanged
                              ? (wasAutoConverted ? '5 (auto)' : g.removalGrade ?? '—')
                              : '—';
                            return (
                              <TableRow key={g.id} className={isNonAcademicCourse(course) ? 'bg-muted/10' : ''}>
                                <TableCell className="text-xs font-mono py-2">{course.code}</TableCell>
                                <TableCell className="text-xs py-2">
                                  {course.title}
                                  {isNonAcademicCourse(course) && (
                                    <Badge className={`ml-1.5 text-[10px] ${course.isPE ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                      {course.isPE ? 'PE' : 'NSTP'}
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs text-center py-2">{course.units + (course.labUnits ?? 0)}</TableCell>
                                <TableCell className="text-xs text-center py-2">
                                  {origGrade
                                    ? <Badge className={`text-xs ${grBadge(origGrade)}`}>{origGrade}</Badge>
                                    : <span className="text-muted-foreground">N/A</span>}
                                </TableCell>
                                <TableCell className="text-xs text-center py-2">
                                  {finalDisplay !== '—'
                                    ? <Badge className={`text-xs ${wasAutoConverted ? 'bg-red-100 text-red-800' : grBadge(finalDisplay)}`}>{finalDisplay}</Badge>
                                    : <span className="text-muted-foreground">—</span>}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          {rows.length === 0 && (
                            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground text-xs py-3">No courses this term.</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
