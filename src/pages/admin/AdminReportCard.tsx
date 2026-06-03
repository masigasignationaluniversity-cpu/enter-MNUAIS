import { useState } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { isNonAcademicCourse } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Download, Printer, GraduationCap } from 'lucide-react';
import type { GradeValue } from '@/lib/types';

const gradeColor = (g: GradeValue | null) => {
  if (!g) return 'text-gray-400';
  if (['1.0','1.25','1.5','1.75','2.0','2.25','2.5','2.75','3.0','P','S'].includes(g)) return 'text-green-700 font-semibold';
  if (g === '4') return 'text-yellow-600 font-semibold';
  if (['5','F','U'].includes(g)) return 'text-red-600 font-semibold';
  if (['INC','DRP'].includes(g)) return 'text-orange-600 font-semibold';
  return 'text-gray-700';
};

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

export default function AdminReportCard() {
  const { state, computeGWA } = useApp();
  const students = state.users.filter(u => u.role === 'student' && u.status !== 'inactive');
  const [selectedStudent, setSelectedStudent] = useState<string>('');

  const student = state.users.find(u => u.id === selectedStudent);

  const termData = student ? state.terms.map(term => {
    const termGrades = state.grades.filter(g => g.studentId === student.id && g.termId === term.id);
    const rows = termGrades.map(g => {
      const section = state.sections.find(s => s.id === g.sectionId);
      const course = section ? state.courses.find(c => c.id === section.courseId) : null;
      return course && section ? { g, section, course } : null;
    }).filter(Boolean) as Array<{ g: typeof termGrades[0]; section: typeof state.sections[0]; course: typeof state.courses[0] }>;
    return { term, rows };
  }).filter(td => td.rows.length > 0) : [];

  const { gwa, perTerm } = student ? computeGWA(student.id) : { gwa: 0, perTerm: [] };

  const getTermGWA = (termId: string) => perTerm.find(p => p.term.id === termId)?.gwa;

  const honorsLabel = (g: number) => {
    if (g <= 0) return '';
    if (g <= 1.2) return 'Summa Cum Laude';
    if (g <= 1.45) return 'Magna Cum Laude';
    if (g <= 1.75) return 'Cum Laude';
    if (g <= 2.0) return 'Excellent';
    if (g <= 2.5) return 'Very Good';
    if (g <= 3.0) return 'Good';
    return '';
  };

  const handleExportCSV = () => {
    if (!student || !termData.length) return;
    const rows: string[] = ['Term,Course Code,Course Title,Type,Units,Grade,Remarks'];
    termData.forEach(({ term, rows: termRows }) => {
      termRows.forEach(({ course, g }) => {
        rows.push(`"${term.name}","${course.code}","${course.title}","${course.type}",${course.units + (course.labUnits ?? 0)},${g.grade ?? 'N/A'},${gradeRemarks(g.grade)}`);
      });
    });
    if (gwa > 0) rows.push(`,,,,Cumulative GWA,${gwa},${honorsLabel(gwa)}`);
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ReportCard_${student.studentNumber || student.name.replace(/\s/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => window.print();

  return (
    <PortalLayout role="admin" userName={state.currentUser?.name ?? ''}>
      <div className="p-6 space-y-6">
        <div className="flex items-center flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-primary" /> Report Card Generator
            </h1>
            <p className="text-gray-600 mt-1">Generate academic report cards per student</p>
          </div>
        </div>

        <div className="portal-panel">
          <div className="portal-panel-header">Select Student</div>
          <div className="p-4 bg-background">
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger className="w-full max-w-sm">
                <SelectValue placeholder="— Select a student —" />
              </SelectTrigger>
              <SelectContent>
                {students.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} — {s.studentNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {student && (
          <div className="space-y-4 print-area">
            {/* Header */}
            <div className="rounded-md overflow-hidden border-2 border-primary/20">
              <div className="pt-6 px-6 pb-4 bg-background">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Official Report Card</div>
                    <h2 className="text-2xl font-bold text-gray-900">{student.name}</h2>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1 mt-2 text-sm">
                      <div><span className="text-gray-500">Student No.:</span> <span className="font-medium">{student.studentNumber}</span></div>
                      <div><span className="text-gray-500">Program:</span> <span className="font-medium">{student.program}</span></div>
                      <div><span className="text-gray-500">Year Level:</span> <span className="font-medium">Year {student.yearLevel}</span></div>
                      <div><span className="text-gray-500">Status:</span> <Badge className="text-xs bg-green-100 text-green-800">{student.status === 'transferred' ? 'Transferred' : 'Active'}</Badge></div>
                    </div>
                    {gwa > 0 && (
                      <div className="mt-3 p-2 bg-primary/10 rounded-lg inline-block">
                        <span className="text-sm text-gray-600">Cumulative GWA: </span>
                        <span className="font-bold text-primary text-lg">{gwa.toFixed(2)}</span>
                        {honorsLabel(gwa) && <Badge className="ml-2 bg-primary/20 text-primary text-xs">{honorsLabel(gwa)}</Badge>}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 print:hidden">
                    <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCSV}>
                      <Download className="w-4 h-4" /> CSV
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2" onClick={handlePrint}>
                      <Printer className="w-4 h-4" /> Print
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {termData.length === 0 ? (
              <p className="text-gray-400 text-center py-12">No grade records found for this student.</p>
            ) : (
              termData.map(({ term, rows }) => {
                const tgwa = getTermGWA(term.id);
                const regularRows = rows.filter(r => !isNonAcademicCourse(r.course));
                const specialRows = rows.filter(r => isNonAcademicCourse(r.course));
                const totalUnits = regularRows.reduce((s, r) => s + r.course.units + (r.course.labUnits ?? 0), 0);

                return (
                  <div key={term.id} className="portal-panel">
                    <div className="portal-panel-header">
                      <div className="flex items-center justify-between">
                        <div>
                          <span>{term.name}</span>
                          <p className="text-xs text-gray-500">A.Y. {term.academicYear} • {term.semester} Semester</p>
                        </div>
                        {tgwa && (
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Term GWA (excl. HK/PE/NSTP)</p>
                            <p className="text-lg font-bold text-primary">{tgwa.toFixed(2)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="p-4 bg-background">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead className="text-xs">Code</TableHead>
                            <TableHead className="text-xs">Course Title</TableHead>
                            <TableHead className="text-xs">Type</TableHead>
                            <TableHead className="text-xs text-center">Units</TableHead>
                            <TableHead className="text-xs text-center">Grade</TableHead>
                            <TableHead className="text-xs text-center">Removal</TableHead>
                            <TableHead className="text-xs">Remarks</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {regularRows.map(({ course, g }) => (
                            <TableRow key={g.id}>
                              <TableCell className="font-mono text-xs font-medium">{course.code}</TableCell>
                              <TableCell className="text-sm">{course.title}</TableCell>
                              <TableCell><Badge variant="outline" className="text-xs">{course.type}</Badge></TableCell>
                              <TableCell className="text-center text-sm">{course.units + (course.labUnits ?? 0)}</TableCell>
                              <TableCell className={`text-center text-sm ${gradeColor(g.grade)}`}>{g.grade ?? '—'}</TableCell>
                              <TableCell className={`text-center text-sm ${g.removalGrade ? gradeColor(g.removalGrade) : 'text-gray-400'}`}>{g.removalGrade ?? '—'}</TableCell>
                              <TableCell><span className={`text-xs ${gradeColor(g.removalGrade ?? g.grade)}`}>{gradeRemarks(g.removalGrade ?? g.grade)}</span></TableCell>
                            </TableRow>
                          ))}
                          {specialRows.length > 0 && (
                            <>
                              <TableRow><TableCell colSpan={7} className="py-1"><Separator /></TableCell></TableRow>
                              {specialRows.map(({ course, g }) => (
                                <TableRow key={g.id} className="bg-gray-50/50">
                                  <TableCell className="font-mono text-xs font-medium text-gray-500">{course.code}</TableCell>
                                  <TableCell className="text-sm text-gray-500">{course.title} {course.isPE ? <Badge className="text-xs bg-blue-100 text-blue-700 ml-1">PE</Badge> : <Badge className="text-xs bg-green-100 text-green-700 ml-1">NSTP</Badge>}</TableCell>
                                  <TableCell><Badge variant="outline" className="text-xs">{course.type}</Badge></TableCell>
                                  <TableCell className="text-center text-sm text-gray-500">{course.units}</TableCell>
                                  <TableCell className={`text-center text-sm ${gradeColor(g.grade)}`}>{g.grade ?? '—'}</TableCell>
                                  <TableCell className="text-center text-gray-400">—</TableCell>
                                  <TableCell><span className="text-xs text-gray-500">{gradeRemarks(g.grade)}</span></TableCell>
                                </TableRow>
                              ))}
                            </>
                          )}
                        </TableBody>
                      </Table>
                      <div className="mt-3 flex justify-end">
                        <span className="text-xs text-gray-500">Total Units: <span className="font-semibold">{totalUnits}</span></span>
                      </div>
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
