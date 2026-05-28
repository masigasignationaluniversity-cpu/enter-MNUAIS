import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';

import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../../components/ui/table';
import { Search, Download, FileText, ChevronDown, ChevronRight, Users, UserSearch, ShieldCheck } from 'lucide-react';
import {
  getYearClassification, getPassedUnits, getScholasticStanding,
  scholasticStandingColor, yearClassificationColor,
  type YearClassification,
} from '../../lib/academic';

export default function OCSStudents() {
  const { state, getActiveTerm, computeGWA } = useApp();
  const [search, setSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [listExpanded, setListExpanded] = useState<Set<string>>(new Set());
  const [allTermsSearch, setAllTermsSearch] = useState('');

  const activeTerm = getActiveTerm();
  const dept = state.currentUser?.department ?? '';
  const ocsCollege = state.currentUser?.college ?? '';

  // All students enrolled in active term — no dept/course filter so we see ALL their subjects
  const enrolledStudentIds = activeTerm
    ? [...new Set(
        state.enrollments
          .filter(e => e.termId === activeTerm.id && e.status === 'enrolled')
          .map(e => e.studentId)
      )]
    : [];

  const allStudents = enrolledStudentIds
    .map(id => state.users.find(u => u.id === id && u.role === 'student'))
    .filter(Boolean)
    .filter(s => {
      const filterKey = ocsCollege || dept;
      if (!filterKey) return true;
      const studentKey = s.college || s.department;
      return !studentKey || studentKey === filterKey;
    }) as typeof state.users;

  // Search Tab — search all students across all terms by student no or name
  const searchResults = search.trim().length > 0
    ? state.users
        .filter(u => u.role === 'student' && (
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          (u.studentNumber ?? '').toLowerCase().includes(search.toLowerCase())
        ))
    : [];

  const selectedStudent = selectedStudentId
    ? state.users.find(u => u.id === selectedStudentId)
    : (searchResults.length === 1 ? searchResults[0] : null);

  // All terms enrollments for the selected student
  const getStudentTermRows = (studentId: string, termId: string) => {
    return state.enrollments
      .filter(e => e.studentId === studentId && e.termId === termId && e.status === 'enrolled')
      .map(e => {
        const sec = state.sections.find(s => s.id === e.sectionId);
        const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
        const grade = state.grades.find(g => g.studentId === studentId && g.sectionId === e.sectionId && g.termId === termId);
        return { sec, course, grade, enrollment: e };
      })
      .filter(r => r.course);
  };

  // Terms where the student has enrollments
  const getStudentTerms = (studentId: string) =>
    state.terms.filter(t =>
      state.enrollments.some(e => e.studentId === studentId && e.termId === t.id && e.status === 'enrolled')
    );

  // List tab helpers
  const getActiveTermRows = (studentId: string) => {
    if (!activeTerm) return [];
    return getStudentTermRows(studentId, activeTerm.id);
  };

  const filteredList = allTermsSearch
    ? allStudents.filter(s =>
        s.name.toLowerCase().includes(allTermsSearch.toLowerCase()) ||
        (s.studentNumber ?? '').includes(allTermsSearch) ||
        (s.program ?? '').toLowerCase().includes(allTermsSearch.toLowerCase())
      )
    : allStudents;

  const toggleListExpand = (id: string) =>
    setListExpanded(prev => { const n = new Set(prev); if (n.has(id)) { n.delete(id); } else { n.add(id); } return n; });

  // ─── Academic standing helpers ───────────────────────────────────────────────
  const getStudentYearClass = (student: typeof state.users[0]): { yearClass: YearClassification | null; passedUnits: number; totalUnits: number } => {
    const prog = state.degreePrograms.find(p => p.name === student.program);
    const totalUnits = prog?.totalUnits ?? 0;
    const passedUnits = getPassedUnits(student.id, state.grades, state.sections, state.courses);
    const yearClass = totalUnits > 0 ? getYearClassification(passedUnits, totalUnits) : null;
    return { yearClass, passedUnits, totalUnits };
  };

  const getStudentLatestStanding = (studentId: string) => {
    const terms = getStudentTerms(studentId);
    for (let i = terms.length - 1; i >= 0; i--) {
      const result = getScholasticStanding(studentId, terms[i].id, state.grades, state.sections, state.courses);
      if (result) return result;
    }
    return null;
  };

  // ─── Download for selected student ──────────────────────────────────────────
  const downloadStudentCSV = (studentId: string) => {
    const student = state.users.find(u => u.id === studentId);
    if (!student) return;
    const terms = getStudentTerms(studentId);
    const rows: string[][] = [['Term', 'Course Code', 'Course Title', 'Units', 'Section', 'Grade', 'Submitted']];
    terms.forEach(term => {
      getStudentTermRows(studentId, term.id).forEach(r => {
        rows.push([
          term.name,
          r.course?.code ?? '',
          r.course?.title ?? '',
          String(r.course?.units ?? ''),
          r.sec?.sectionCode ?? '',
          r.grade?.grade ?? 'N/A',
          r.grade?.submitted ? 'Yes' : 'No',
        ]);
      });
    });
    const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grades-${(student.studentNumber ?? student.name).replace(/\s+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadStudentPDF = (studentId: string) => {
    const student = state.users.find(u => u.id === studentId);
    if (!student) return;
    const terms = getStudentTerms(studentId);
    const { gwa: cumGwa, perTerm } = computeGWA(studentId);
    const { yearClass: yc, passedUnits: pu, totalUnits: tu } = getStudentYearClass(student);
    const yearClassDisplay = yc ?? (student.yearLevel ? `Year ${student.yearLevel}` : '—');
    const ocsName = state.currentUser?.name ?? '—';
    const dateGenerated = new Date().toLocaleString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

    const termBlocks = terms.map(term => {
      const rows = getStudentTermRows(studentId, term.id);
      const termGwa = perTerm.find(p => p.term.id === term.id)?.gwa;
      const courseRows = rows.map(r =>
        `<tr>
          <td style="padding:4px 8px;border:1px solid #ddd;font-size:11px">${r.course?.code ?? ''}</td>
          <td style="padding:4px 8px;border:1px solid #ddd;font-size:11px">${r.course?.title ?? ''}</td>
          <td style="padding:4px 8px;border:1px solid #ddd;font-size:11px;text-align:center">${r.course?.units ?? ''}</td>
          <td style="padding:4px 8px;border:1px solid #ddd;font-size:11px;text-align:center">${r.sec?.sectionCode ?? ''}</td>
          <td style="padding:4px 8px;border:1px solid #ddd;font-size:11px;text-align:center;font-weight:bold;color:${r.grade?.grade ? (r.grade.grade === '5' || r.grade.grade === 'F' ? '#c00' : '#006') : '#999'}">${r.grade?.grade ?? '—'}</td>
          <td style="padding:4px 8px;border:1px solid #ddd;font-size:11px;text-align:center;font-weight:bold;color:${r.grade?.removalGrade ? (r.grade.removalGrade === '5' || r.grade.removalGrade === 'F' ? '#c00' : '#006') : '#999'}">${r.grade?.removalGrade ?? '—'}</td>
        </tr>`
      ).join('');
      const totalUnits = rows.reduce((s, r) => s + (r.course?.units ?? 0), 0);
      return `
        <h3 style="margin:16px 0 4px;font-size:13px;color:#444">${term.name}${term.isActive ? ' (Active)' : ''}</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:4px">
          <thead><tr style="background:#e5e7eb">
            <th style="padding:4px 8px;border:1px solid #ddd;font-size:11px;text-align:left">Code</th>
            <th style="padding:4px 8px;border:1px solid #ddd;font-size:11px;text-align:left">Course Title</th>
            <th style="padding:4px 8px;border:1px solid #ddd;font-size:11px;text-align:center">Units</th>
            <th style="padding:4px 8px;border:1px solid #ddd;font-size:11px;text-align:center">Sec</th>
            <th style="padding:4px 8px;border:1px solid #ddd;font-size:11px;text-align:center">Grade</th>
            <th style="padding:4px 8px;border:1px solid #ddd;font-size:11px;text-align:center">Removal Grade</th>
          </tr></thead>
          <tbody>${courseRows || '<tr><td colspan="6" style="text-align:center;padding:8px;color:#999">No records</td></tr>'}</tbody>
        </table>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:#555;margin-bottom:8px">
          <span>Total units: <strong>${totalUnits}</strong></span>
          ${termGwa ? `<span>Semester GWA: <strong style="color:#333">${termGwa.toFixed(2)}</strong></span>` : ''}
        </div>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head>
      <title>Grade Report — ${student.name}</title>
      <style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h2{margin-bottom:2px}@media print{@page{margin:20mm}}</style>
    </head><body>
      <h2>${student.name}</h2>
      <p style="color:#555;font-size:12px;margin-bottom:4px">
        Student No: <strong>${student.studentNumber ?? '—'}</strong> &nbsp;|&nbsp;
        Program: <strong>${student.program ?? '—'}</strong> &nbsp;|&nbsp;
        Year Classification: <strong>${yearClassDisplay}${tu > 0 ? ` (${pu}/${tu} units)` : ''}</strong>
      </p>
      <hr style="margin:12px 0">
      ${termBlocks || '<p style="color:#999">No enrollment records found.</p>'}
      ${cumGwa > 0 ? `<div style="margin-top:12px;padding:8px 12px;background:#f3f4f6;border:1px solid #ddd;border-radius:4px;font-size:12px">
        <strong>Cumulative GWA: ${cumGwa.toFixed(2)}</strong>
      </div>` : ''}
      <div style="margin-top:24px;padding-top:12px;border-top:1px solid #ccc;font-size:11px;color:#555;display:flex;justify-content:space-between;">
        <span>Approved by: <strong style="color:#111">${ocsName}</strong></span>
        <span>Date Generated: <strong style="color:#111">${dateGenerated}</strong></span>
      </div>
    </body></html>`;

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  };

  // ─── Bulk CSV / PDF (all list tab students) ──────────────────────────────────
  const downloadAllCSV = () => {
    if (!activeTerm) return;
    const rows: string[][] = [['Student Name', 'Student No', 'Program', 'Year', 'Course Code', 'Course Title', 'Units', 'Section', 'Grade', 'Submitted']];
    filteredList.forEach(student => {
      const courseRows = getActiveTermRows(student.id);
      if (courseRows.length === 0) {
        rows.push([student.name, student.studentNumber ?? '', student.program ?? '', String(student.yearLevel ?? ''), '', '', '', '', '', '']);
      } else {
        courseRows.forEach((r, i) => {
          rows.push([i === 0 ? student.name : '', i === 0 ? (student.studentNumber ?? '') : '', i === 0 ? (student.program ?? '') : '', i === 0 ? String(student.yearLevel ?? '') : '', r.course?.code ?? '', r.course?.title ?? '', String(r.course?.units ?? ''), r.sec?.sectionCode ?? '', r.grade?.grade ?? 'N/A', r.grade?.submitted ? 'Yes' : 'No']);
        });
      }
    });
    const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students-grades-${(activeTerm?.name ?? 'all').replace(/\s+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PortalLayout title="Students">
      <div className="space-y-4">
        <div className="flex items-center flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Students — Grade Summary
            </h2>
            <p className="text-sm text-muted-foreground">
              {activeTerm ? activeTerm.name : 'No active term'}
              {dept && <span className="ml-1">· {dept} Dept</span>}
            </p>
          </div>
        </div>

        <Tabs defaultValue="search">
          <TabsList className="bg-muted">
            <TabsTrigger value="search" className="flex items-center gap-1.5">
              <UserSearch className="w-3.5 h-3.5" /> Student Search
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> All Enrolled
              {allStudents.length > 0 && <Badge className="ml-1 bg-primary/20 text-primary text-xs">{allStudents.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Student Search ────────────────────────────────────── */}
          <TabsContent value="search" className="mt-4 space-y-4">
            <div className="portal-panel">
              <div className="portal-panel-header">
                <UserSearch className="w-4 h-4" /> Search Student
              </div>
              <div className="p-4 bg-background space-y-3">
                <div className="relative max-w-md">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by student number or name…"
                    className="pl-9"
                    value={search}
                    onChange={e => { setSearch(e.target.value); setSelectedStudentId(null); }}
                  />
                </div>

                {/* Search results list */}
                {search.trim() && searchResults.length > 1 && !selectedStudentId && (
                  <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                    {searchResults.map(s => (
                      <button
                        key={s.id}
                        className="w-full text-left px-4 py-2.5 hover:bg-muted/40 flex items-center justify-between"
                        onClick={() => setSelectedStudentId(s.id)}
                      >
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

            {/* Selected / matched student detail */}
            {selectedStudent && (() => {
              const terms = getStudentTerms(selectedStudent.id);
              const { yearClass, passedUnits: sPassedUnits, totalUnits: sTotalUnits } = getStudentYearClass(selectedStudent);
              const latestStanding = getStudentLatestStanding(selectedStudent.id);
              return (
                <div className="space-y-3">
                  {/* Student info card */}
                  <div className="rounded-md overflow-hidden border border-primary/30 bg-primary/5">
                    <div className="pt-4 pb-4 px-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <h3 className="text-lg font-bold">{selectedStudent.name}</h3>
                          <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
                            <span>Student No: <strong className="text-foreground font-mono">{selectedStudent.studentNumber ?? '—'}</strong></span>
                            <span>Program: <strong className="text-foreground">{selectedStudent.program ?? '—'}</strong></span>
                            <span>Year Classification: <strong className="text-foreground">{yearClass ?? (selectedStudent.yearLevel ? `Year ${selectedStudent.yearLevel}` : '—')}</strong></span>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {yearClass && (
                              <Badge className={`text-xs border ${yearClassificationColor(yearClass)}`}>
                                {yearClass}
                                {sTotalUnits > 0 && <span className="ml-1 opacity-80">({sPassedUnits}/{sTotalUnits} units)</span>}
                              </Badge>
                            )}
                            {latestStanding && (
                              <Badge className={`text-xs border flex items-center gap-1 ${scholasticStandingColor(latestStanding.standing)}`}>
                                <ShieldCheck className="w-3 h-3" /> {latestStanding.standing}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="gap-1.5"
                            onClick={() => downloadStudentCSV(selectedStudent.id)}>
                            <Download className="w-3.5 h-3.5" /> CSV
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1.5"
                            onClick={() => downloadStudentPDF(selectedStudent.id)}>
                            <FileText className="w-3.5 h-3.5" /> PDF
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Grade tables per term */}
                  {terms.length === 0 ? (
                    <div className="portal-panel">
                      <div className="py-8 text-center text-muted-foreground bg-background">No enrollment records found.</div>
                    </div>
                  ) : (
                    terms.map(term => {
                      const rows = getStudentTermRows(selectedStudent.id, term.id);
                      const totalUnits = rows.reduce((s, r) => s + (r.course?.units ?? 0), 0);
                      const standing = getScholasticStanding(selectedStudent.id, term.id, state.grades, state.sections, state.courses);
                      return (
                        <div key={term.id} className="portal-panel">
                          <div className="portal-panel-header">
                            <div className="flex items-center flex-wrap gap-2">
                              <span>{term.name}</span>
                              {term.isActive && <Badge className="bg-green-100 text-green-800 text-xs">Active</Badge>}
                              <Badge variant="outline" className="text-xs">{totalUnits} units</Badge>
                              {standing && (
                                <Badge className={`text-xs border ${scholasticStandingColor(standing.standing)}`}>
                                  {standing.standing}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="p-0 bg-background">
                            <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/30">
                                  <TableHead className="text-xs">Course Code</TableHead>
                                  <TableHead className="text-xs">Title</TableHead>
                                  <TableHead className="text-xs text-center">Units</TableHead>
                                  <TableHead className="text-xs text-center">Section</TableHead>
                                  <TableHead className="text-xs text-center">Grade</TableHead>
                                  <TableHead className="text-xs text-center">Submitted</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {rows.map(r => (
                                  <TableRow key={r.enrollment.id}>
                                    <TableCell className="text-xs font-mono py-2">{r.course?.code}</TableCell>
                                    <TableCell className="text-xs py-2">{r.course?.title}</TableCell>
                                    <TableCell className="text-xs text-center py-2">{r.course?.units}</TableCell>
                                    <TableCell className="text-xs text-center py-2">{r.sec?.sectionCode}</TableCell>
                                    <TableCell className="text-xs text-center py-2">
                                      {r.grade?.grade
                                        ? <Badge className={`text-xs ${['1.0','1.25','1.5','1.75','2.0','2.25','2.5','2.75','3.0'].includes(r.grade.grade) ? 'bg-green-100 text-green-800' : r.grade.grade === '5' || r.grade.grade === 'F' ? 'bg-red-100 text-red-800' : r.grade.grade === 'INC' || r.grade.grade === '4' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700'}`}>{r.grade.grade}</Badge>
                                        : <span className="text-muted-foreground text-xs">N/A</span>
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
                                    <TableCell colSpan={6} className="text-center text-muted-foreground text-xs py-4">No courses enrolled this term.</TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })()}

            {!search.trim() && (
              <div className="portal-panel">
                <div className="py-12 text-center text-muted-foreground bg-background">
                  <UserSearch className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Search for a student</p>
                  <p className="text-sm mt-1">Enter a student number or name to view their grade record.</p>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── Tab 2: All Enrolled ──────────────────────────────────────── */}
          <TabsContent value="list" className="mt-4 space-y-3">
            <div className="flex items-center flex-wrap gap-3">
              <div className="relative max-w-sm flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Filter by name, student no, or program…"
                  className="pl-9"
                  value={allTermsSearch}
                  onChange={e => setAllTermsSearch(e.target.value)}
                />
              </div>
              <Button variant="outline" size="sm" onClick={downloadAllCSV} disabled={!activeTerm || filteredList.length === 0} className="gap-1.5">
                <Download className="w-4 h-4" /> Export All CSV
              </Button>
            </div>

            {!activeTerm && (
              <div className="portal-panel"><div className="py-10 text-center text-muted-foreground bg-background">No active term.</div></div>
            )}

            {activeTerm && filteredList.length === 0 && (
              <div className="portal-panel">
                <div className="py-10 text-center text-muted-foreground bg-background">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="font-medium">No enrolled students found.</p>
                </div>
              </div>
            )}

            {activeTerm && filteredList.length > 0 && (
              <div className="portal-panel">
                <div className="p-0 overflow-x-auto bg-background">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="w-8"></TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>Student No</TableHead>
                        <TableHead>Program</TableHead>
                        <TableHead className="text-center">Year Class</TableHead>
                        <TableHead className="text-center">Standing</TableHead>
                        <TableHead className="text-center">Courses</TableHead>
                        <TableHead className="text-center">Units</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center">Export</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredList.map(student => {
                        const rows = getActiveTermRows(student.id);
                        const totalUnits = rows.reduce((sum, r) => sum + (r.course?.units ?? 0), 0);
                        const isExpanded = listExpanded.has(student.id);
                        const isFinalized = activeTerm && state.finalizedEnlistments.some(f => f.studentId === student.id && f.termId === activeTerm.id);
                        const allGradesSubmitted = rows.length > 0 && rows.every(r => r.grade?.submitted);
                        const { yearClass } = getStudentYearClass(student);
                        const latestStanding = activeTerm
                          ? getScholasticStanding(student.id, activeTerm.id, state.grades, state.sections, state.courses)
                          : null;
                        return (
                          <>
                            <TableRow key={student.id} className="cursor-pointer hover:bg-muted/30" onClick={() => toggleListExpand(student.id)}>
                              <TableCell className="text-center">{isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}</TableCell>
                              <TableCell className="font-medium text-sm">{student.name}</TableCell>
                              <TableCell className="text-sm text-muted-foreground font-mono">{student.studentNumber ?? '—'}</TableCell>
                              <TableCell className="text-sm text-muted-foreground max-w-[140px] truncate">{student.program ?? '—'}</TableCell>
                              <TableCell className="text-center">
                                {yearClass
                                  ? <Badge className={`text-xs border ${yearClassificationColor(yearClass)}`}>{yearClass}</Badge>
                                  : <span className="text-xs text-muted-foreground">Year {student.yearLevel ?? '—'}</span>
                                }
                              </TableCell>
                              <TableCell className="text-center">
                                {latestStanding
                                  ? <Badge className={`text-xs border ${scholasticStandingColor(latestStanding.standing)}`}>{latestStanding.standing}</Badge>
                                  : <span className="text-xs text-muted-foreground">—</span>
                                }
                              </TableCell>
                              <TableCell className="text-center"><Badge variant="outline" className="text-xs">{rows.length}</Badge></TableCell>
                              <TableCell className="text-center"><Badge variant="outline" className="text-xs">{totalUnits}</Badge></TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  {isFinalized && <Badge className="bg-green-100 text-green-800 text-xs">Finalized</Badge>}
                                  {allGradesSubmitted && <Badge className="bg-blue-100 text-blue-800 text-xs">Grades In</Badge>}
                                </div>
                              </TableCell>
                              <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                                <div className="flex gap-1 justify-center">
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => downloadStudentCSV(student.id)} title="Download CSV">
                                    <Download className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => downloadStudentPDF(student.id)} title="Download PDF">
                                    <FileText className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                            {isExpanded && (
                              <TableRow key={`${student.id}-exp`} className="bg-muted/10">
                                <TableCell colSpan={10} className="p-0">
                                  <div className="px-8 py-3">
                                    <Table>
                                      <TableHeader>
                                        <TableRow className="border-b border-border/50">
                                          <TableHead className="text-xs h-8">Code</TableHead>
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
                                                ? <Badge className={`text-xs ${['1.0','1.25','1.5'].includes(r.grade.grade) ? 'bg-green-100 text-green-800' : r.grade.grade === '5' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>{r.grade.grade}</Badge>
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
                                          <TableRow><TableCell colSpan={6} className="text-xs text-center text-muted-foreground py-4">No enrolled courses.</TableCell></TableRow>
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
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PortalLayout>
  );
}
