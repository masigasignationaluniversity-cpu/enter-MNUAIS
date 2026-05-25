import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../../components/ui/table';
import { Search, Download, FileText, ChevronDown, ChevronRight, Users } from 'lucide-react';

export default function OCSStudents() {
  const { state, getActiveTerm } = useApp();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const activeTerm = getActiveTerm();
  const dept = state.currentUser?.department ?? '';

  // Students enrolled in the active term (status=enrolled), filtered by dept
  const deptCourseIds = new Set(
    dept ? state.courses.filter(c => c.department === dept).map(c => c.id) : state.courses.map(c => c.id)
  );

  const enrolledStudentIds = activeTerm
    ? [...new Set(
        state.enrollments
          .filter(e => e.termId === activeTerm.id && e.status === 'enrolled')
          .filter(e => {
            if (!dept) return true;
            const sec = state.sections.find(s => s.id === e.sectionId);
            return sec ? deptCourseIds.has(sec.courseId) : false;
          })
          .map(e => e.studentId)
      )]
    : [];

  const students = enrolledStudentIds
    .map(id => state.users.find(u => u.id === id && u.role === 'student'))
    .filter(Boolean) as typeof state.users;

  const filtered = search
    ? students.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.studentNumber ?? '').includes(search) ||
        (s.program ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : students;

  const getStudentRows = (studentId: string) => {
    if (!activeTerm) return [];
    return state.enrollments
      .filter(e => e.studentId === studentId && e.termId === activeTerm.id && e.status === 'enrolled')
      .map(e => {
        const sec = state.sections.find(s => s.id === e.sectionId);
        const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
        const grade = state.grades.find(g => g.studentId === studentId && g.sectionId === e.sectionId && g.termId === activeTerm.id);
        return { sec, course, grade, enrollment: e };
      })
      .filter(r => r.course);
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ─── CSV Download ────────────────────────────────────────────────────────────
  const downloadCSV = () => {
    if (!activeTerm) return;
    const rows: string[][] = [
      ['Student Name', 'Student No', 'Program', 'Year', 'Course Code', 'Course Title', 'Units', 'Section', 'Grade', 'Submitted'],
    ];
    filtered.forEach(student => {
      const courseRows = getStudentRows(student.id);
      if (courseRows.length === 0) {
        rows.push([student.name, student.studentNumber ?? '', student.program ?? '', String(student.yearLevel ?? ''), '', '', '', '', '', '']);
      } else {
        courseRows.forEach((r, i) => {
          rows.push([
            i === 0 ? student.name : '',
            i === 0 ? (student.studentNumber ?? '') : '',
            i === 0 ? (student.program ?? '') : '',
            i === 0 ? String(student.yearLevel ?? '') : '',
            r.course?.code ?? '',
            r.course?.title ?? '',
            String(r.course?.units ?? ''),
            r.sec?.sectionCode ?? '',
            r.grade?.grade ?? 'N/A',
            r.grade?.submitted ? 'Yes' : 'No',
          ]);
        });
      }
    });

    const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students-grades-${activeTerm.name.replace(/\s+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── PDF via Print ───────────────────────────────────────────────────────────
  const downloadPDF = () => {
    if (!activeTerm) return;
    const rows = filtered.map(student => {
      const courseRows = getStudentRows(student.id);
      const courses = courseRows.map(r =>
        `<tr>
          <td style="padding:4px 8px;border:1px solid #ddd;font-size:11px">${r.course?.code ?? ''}</td>
          <td style="padding:4px 8px;border:1px solid #ddd;font-size:11px">${r.course?.title ?? ''}</td>
          <td style="padding:4px 8px;border:1px solid #ddd;font-size:11px;text-align:center">${r.course?.units ?? ''}</td>
          <td style="padding:4px 8px;border:1px solid #ddd;font-size:11px;text-align:center">${r.sec?.sectionCode ?? ''}</td>
          <td style="padding:4px 8px;border:1px solid #ddd;font-size:11px;text-align:center;font-weight:bold">${r.grade?.grade ?? '—'}</td>
          <td style="padding:4px 8px;border:1px solid #ddd;font-size:11px;text-align:center">${r.grade?.submitted ? 'Yes' : 'No'}</td>
        </tr>`
      ).join('');

      return `
        <div style="margin-bottom:18px;page-break-inside:avoid">
          <div style="background:#f3f4f6;padding:8px 12px;border-radius:6px 6px 0 0;border:1px solid #ddd;display:flex;justify-content:space-between">
            <span style="font-weight:700;font-size:13px">${student.name}</span>
            <span style="font-size:11px;color:#555">${student.studentNumber ?? ''} • ${student.program ?? ''} ${student.yearLevel ? `· Year ${student.yearLevel}` : ''}</span>
          </div>
          <table style="width:100%;border-collapse:collapse;border:1px solid #ddd;border-top:none">
            <thead>
              <tr style="background:#e5e7eb">
                <th style="padding:4px 8px;border:1px solid #ddd;font-size:11px;text-align:left">Code</th>
                <th style="padding:4px 8px;border:1px solid #ddd;font-size:11px;text-align:left">Course</th>
                <th style="padding:4px 8px;border:1px solid #ddd;font-size:11px;text-align:center">Units</th>
                <th style="padding:4px 8px;border:1px solid #ddd;font-size:11px;text-align:center">Section</th>
                <th style="padding:4px 8px;border:1px solid #ddd;font-size:11px;text-align:center">Grade</th>
                <th style="padding:4px 8px;border:1px solid #ddd;font-size:11px;text-align:center">Submitted</th>
              </tr>
            </thead>
            <tbody>${courses || '<tr><td colspan="6" style="text-align:center;padding:8px;color:#999">No grades recorded</td></tr>'}</tbody>
          </table>
        </div>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head>
      <title>Student Grades — ${activeTerm.name}</title>
      <style>body{font-family:Arial,sans-serif;padding:24px;color:#111}
      @media print{@page{margin:20mm}}</style>
    </head><body>
      <h2 style="margin-bottom:4px">Student Grade Summary</h2>
      <p style="color:#555;margin-bottom:16px">${activeTerm.name}${dept ? ` · ${dept} Department` : ''} · ${filtered.length} student(s)</p>
      ${rows}
    </body></html>`;

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  };

  return (
    <PortalLayout title="Students">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Students — Grade Summary
            </h2>
            <p className="text-sm text-muted-foreground">
              {activeTerm ? activeTerm.name : 'No active term'}
              {dept && <span className="ml-1">· {dept} Dept</span>}
              {' '}· {filtered.length} student(s)
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={downloadCSV} disabled={!activeTerm || filtered.length === 0} className="gap-1.5">
              <Download className="w-4 h-4" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={downloadPDF} disabled={!activeTerm || filtered.length === 0} className="gap-1.5">
              <FileText className="w-4 h-4" /> PDF
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, student no, or program…"
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {!activeTerm && (
          <Card><CardContent className="py-10 text-center text-muted-foreground">No active term.</CardContent></Card>
        )}

        {activeTerm && filtered.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="font-medium">No enrolled students found.</p>
              {search && <p className="text-sm mt-1">Try a different search term.</p>}
            </CardContent>
          </Card>
        )}

        {activeTerm && filtered.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Click a student row to expand grade details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Student No</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead className="text-center">Year</TableHead>
                    <TableHead className="text-center">Courses</TableHead>
                    <TableHead className="text-center">Units</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(student => {
                    const rows = getStudentRows(student.id);
                    const totalUnits = rows.reduce((sum, r) => sum + (r.course?.units ?? 0) + (r.course?.labUnits ?? 0), 0);
                    const isExpanded = expanded.has(student.id);
                    const isFinalized = state.finalizedEnlistments.some(
                      f => f.studentId === student.id && f.termId === activeTerm.id
                    );
                    const allGradesSubmitted = rows.length > 0 && rows.every(r => r.grade?.submitted);
                    return (
                      <>
                        {/* Summary row */}
                        <TableRow
                          key={student.id}
                          className="cursor-pointer hover:bg-muted/30"
                          onClick={() => toggleExpand(student.id)}
                        >
                          <TableCell className="text-center">
                            {isExpanded
                              ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                          </TableCell>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground font-mono">{student.studentNumber ?? '—'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{student.program ?? '—'}</TableCell>
                          <TableCell className="text-center text-sm">{student.yearLevel ?? '—'}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-xs">{rows.length}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-xs">{totalUnits}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {isFinalized && (
                                <Badge className="bg-green-100 text-green-800 text-xs">Finalized</Badge>
                              )}
                              {allGradesSubmitted && (
                                <Badge className="bg-blue-100 text-blue-800 text-xs">Grades In</Badge>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Expanded grade rows */}
                        {isExpanded && (
                          <TableRow key={`${student.id}-exp`} className="bg-muted/10">
                            <TableCell colSpan={8} className="p-0">
                              <div className="px-8 py-3">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="border-b border-border/50">
                                      <TableHead className="text-xs h-8">Course Code</TableHead>
                                      <TableHead className="text-xs h-8">Title</TableHead>
                                      <TableHead className="text-xs h-8 text-center">Units</TableHead>
                                      <TableHead className="text-xs h-8 text-center">Section</TableHead>
                                      <TableHead className="text-xs h-8 text-center">Grade</TableHead>
                                      <TableHead className="text-xs h-8 text-center">Submitted</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {rows.map(r => (
                                      <TableRow key={r.enrollment.id} className="border-b border-border/30">
                                        <TableCell className="text-xs font-mono py-2">{r.course?.code}</TableCell>
                                        <TableCell className="text-xs py-2">{r.course?.title}</TableCell>
                                        <TableCell className="text-xs text-center py-2">{r.course?.units}</TableCell>
                                        <TableCell className="text-xs text-center py-2">{r.sec?.sectionCode}</TableCell>
                                        <TableCell className="text-xs text-center py-2">
                                          {r.grade?.grade
                                            ? <Badge className={`text-xs ${r.grade.grade === '1.0' || r.grade.grade === '1.25' || r.grade.grade === '1.5' ? 'bg-green-100 text-green-800' : r.grade.grade === '5.0' || r.grade.grade === 'F' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>{r.grade.grade}</Badge>
                                            : <span className="text-muted-foreground">N/A</span>
                                          }
                                        </TableCell>
                                        <TableCell className="text-xs text-center py-2">
                                          {r.grade?.submitted
                                            ? <Badge className="bg-green-100 text-green-800 text-xs">Yes</Badge>
                                            : <Badge variant="outline" className="text-xs text-muted-foreground">No</Badge>
                                          }
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                    {rows.length === 0 && (
                                      <TableRow>
                                        <TableCell colSpan={6} className="text-xs text-center text-muted-foreground py-4">No enrolled courses found.</TableCell>
                                      </TableRow>
                                    )}
                                  </TableBody>
                                </Table>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </PortalLayout>
  );
}
