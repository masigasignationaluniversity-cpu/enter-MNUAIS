import { useState } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { isNonAcademicCourse } from '@/lib/utils';
import {
  getEffectiveGradeWithRules, getPassedUnits, getYearClassification,
  yearClassificationColor, type YearClassification,
} from '@/lib/academic';
import { Download, FileText, Search } from 'lucide-react';
import { downloadAsPdf } from '@/lib/pdfUtils';

export default function AdminReportCard() {
  const { state, computeGWA } = useApp();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ─── Row/term helpers (mirrors OCSStudents logic) ──────────────────────────
  const getStudentTermRows = (studentId: string, termId: string) => {
    const fromEnrollments = state.enrollments
      .filter(e => e.studentId === studentId && e.termId === termId)
      .map(e => {
        const sec = state.sections.find(s => s.id === e.sectionId);
        const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
        const grade = state.grades.find(g => g.studentId === studentId && g.sectionId === e.sectionId && g.termId === termId);
        return { sec, course, grade, enrollment: e };
      })
      .filter(r => r.course && r.sec && (r.enrollment.status !== 'dropped' || r.grade?.submitted));

    const enrolledSectionIds = new Set(fromEnrollments.map(r => r.sec!.id));
    const orphanGradeRows = state.grades
      .filter(g => g.studentId === studentId && g.termId === termId && !enrolledSectionIds.has(g.sectionId))
      .map(g => {
        const sec = state.sections.find(s => s.id === g.sectionId);
        const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
        return { sec, course, grade: g, enrollment: null as typeof state.enrollments[0] | null };
      })
      .filter(r => r.course && r.sec);

    const seenSec = new Map<string, typeof fromEnrollments[0] | typeof orphanGradeRows[0]>();
    for (const r of [...fromEnrollments, ...orphanGradeRows]) {
      const sid = r.sec?.id ?? '';
      const existing = seenSec.get(sid);
      if (!existing || (existing.enrollment?.status === 'dropped' && r.enrollment?.status !== 'dropped')) {
        seenSec.set(sid, r);
      }
    }
    return Array.from(seenSec.values());
  };

  const getStudentTerms = (studentId: string) =>
    state.terms.filter(t => {
      const hasActiveEnrollment = state.enrollments.some(e =>
        e.studentId === studentId && e.termId === t.id &&
        (e.status !== 'dropped' ||
          state.grades.some(g => g.studentId === studentId && g.sectionId === e.sectionId && g.termId === t.id && g.submitted))
      );
      const hasGrade = state.grades.some(g => g.studentId === studentId && g.termId === t.id && g.submitted);
      return hasActiveEnrollment || hasGrade;
    }).sort((a, b) => {
      if (a.academicYear !== b.academicYear) return a.academicYear.localeCompare(b.academicYear);
      const order = ['1st', '2nd', 'Summer'];
      return order.indexOf(a.semester) - order.indexOf(b.semester);
    });

  const getStudentYearClass = (student: typeof state.users[0]): { yearClass: YearClassification | null; passedUnits: number; totalUnits: number } => {
    const prog = state.degreePrograms.find(p => p.name === student.program);
    const totalUnits = prog?.totalUnits ?? 0;
    const passedUnits = getPassedUnits(student.id, state.grades, state.sections, state.courses, state.enrollments);
    const yearClass = totalUnits > 0 ? getYearClassification(passedUnits, totalUnits, prog?.degreeType) : null;
    return { yearClass, passedUnits, totalUnits };
  };

  // ─── Search ────────────────────────────────────────────────────────────────
  const searchResults = search.trim().length > 0
    ? state.users.filter(u => u.role === 'student' && u.status !== 'inactive' && (
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        (u.studentNumber ?? '').toLowerCase().includes(search.toLowerCase())
      ))
    : [];

  const student = selectedId
    ? state.users.find(u => u.id === selectedId)
    : (searchResults.length === 1 ? searchResults[0] : null);

  // ─── CSV Export ────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (!student) return;
    const terms = getStudentTerms(student.id);
    const { gwa } = computeGWA(student.id);
    const lines: string[] = ['Term,Course Code,Course Title,Units,Grade,Final Grade'];
    terms.forEach(term => {
      getStudentTermRows(student.id, term.id).forEach(({ course, grade: g }) => {
        if (!course) return;
        const origGrade = g?.grade ?? 'N/A';
        const effGrade = g ? getEffectiveGradeWithRules(g, state.grades, state.sections, state.terms) : null;
        const finalGrade = (effGrade && effGrade !== origGrade) ? effGrade : '';
        lines.push(`"${term.name}","${course.code}","${course.title}",${course.units + (course.labUnits ?? 0)},${origGrade},${finalGrade}`);
      });
    });
    if (gwa > 0) lines.push(`,,,,Cumulative GWA,${gwa.toFixed(2)}`);
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `TOR_${(student.studentNumber ?? student.name).replace(/\s/g, '_')}.csv`,
    });
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ─── PDF Export (mirrors OCS format) ──────────────────────────────────────
  const downloadPDF = async () => {
    if (!student) return;
    const terms = getStudentTerms(student.id);
    const { gwa: cumGwa, perTerm } = computeGWA(student.id);
    const { yearClass: yc, passedUnits: pu, totalUnits: tu } = getStudentYearClass(student);
    const yearClassDisplay = yc ?? (student.yearLevel ? `Year ${student.yearLevel}` : '—');
    const institutionName = state.portalSettings?.institutionName ?? 'University';
    const logoUrl = state.portalSettings?.logoUrl ?? '';
    const adminName = state.currentUser?.name ?? '—';
    const dateGenerated = new Date().toLocaleString('en-PH', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });

    const gradeColor = (g: string) => {
      if (g === '5' || g === 'F' || g === '5 (auto)') return '#c00';
      if (g === '4' || g === 'INC') return '#b05000';
      if (['1.0','1.25','1.5','1.75','2.0','2.25','2.5','2.75','3.0'].includes(g)) return '#005500';
      return '#333';
    };

    const termBlocks = terms.map(term => {
      const rows = getStudentTermRows(student.id, term.id);
      const termGwa = perTerm.find(p => p.term.id === term.id)?.gwa;
      const courseRows = rows.map(r => {
        const originalGrade = r.grade?.grade ?? null;
        const effectiveGrade = r.grade ? getEffectiveGradeWithRules(r.grade, state.grades, state.sections, state.terms) : null;
        const wasAutoConverted = originalGrade === '4' && effectiveGrade === '5';
        const removalSubmitted = r.grade?.removalSubmitted && r.grade?.removalGrade;
        const origDisplay = originalGrade ?? '—';
        const finalChanged = removalSubmitted || wasAutoConverted;
        const finalDisplay = finalChanged ? (wasAutoConverted ? '5 (auto)' : (r.grade?.removalGrade ?? '—')) : '—';
        return `<tr>
          <td style="padding:4px 8px;border:1px solid #ddd;font-size:11px">${r.course?.code ?? ''}</td>
          <td style="padding:4px 8px;border:1px solid #ddd;font-size:11px">${r.course?.title ?? ''}</td>
          <td style="padding:4px 8px;border:1px solid #ddd;font-size:11px;text-align:center">${r.course?.units ?? ''}</td>
          <td style="padding:4px 8px;border:1px solid #ddd;font-size:11px;text-align:center;font-weight:bold;color:${gradeColor(origDisplay)}">${origDisplay}</td>
          <td style="padding:4px 8px;border:1px solid #ddd;font-size:11px;text-align:center;font-weight:bold;color:${finalDisplay !== '—' ? gradeColor(finalDisplay) : '#aaa'}">${finalDisplay}</td>
        </tr>`;
      }).join('');
      const totalUnits = rows.reduce((s, r) => {
        if (r.enrollment?.status === 'dropped') return s;
        return s + (r.course && !isNonAcademicCourse(r.course) ? (r.course.units ?? 0) : 0);
      }, 0);
      return `
        <h3 style="margin:16px 0 4px;font-size:13px;color:#444">${term.name}</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:4px">
          <thead><tr style="background:#e5e7eb">
            <th style="padding:4px 8px;border:1px solid #ddd;font-size:11px;text-align:left">Code</th>
            <th style="padding:4px 8px;border:1px solid #ddd;font-size:11px;text-align:left">Course Title</th>
            <th style="padding:4px 8px;border:1px solid #ddd;font-size:11px;text-align:center">Units</th>
            <th style="padding:4px 8px;border:1px solid #ddd;font-size:11px;text-align:center">Grade</th>
            <th style="padding:4px 8px;border:1px solid #ddd;font-size:11px;text-align:center">Final Grade</th>
          </tr></thead>
          <tbody>${courseRows || '<tr><td colspan="5" style="text-align:center;padding:8px;color:#999">No records</td></tr>'}</tbody>
        </table>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:#555;margin-bottom:8px">
          <span>Academic units: <strong>${totalUnits}</strong></span>
          ${termGwa ? `<span>Semester GWA: <strong style="color:#333">${termGwa.toFixed(2)}</strong></span>` : ''}
        </div>`;
    }).join('');

    const html = `
      <div style="font-family:Arial,sans-serif;padding:24px;color:#111;width:760px">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
          ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="width:64px;height:64px;object-fit:contain;flex-shrink:0" />` : ''}
          <div style="flex:1;text-align:center">
            <div style="font-size:15px;font-weight:bold;color:#111;text-transform:uppercase;letter-spacing:0.04em">${institutionName}</div>
            <div style="font-size:13px;color:#555;margin-top:2px;letter-spacing:0.08em;text-transform:uppercase">Transcript of Record</div>
          </div>
          ${logoUrl ? `<div style="width:64px;flex-shrink:0"></div>` : ''}
        </div>
        <hr style="margin:0 0 12px">
        <h2 style="margin-bottom:2px">${student.name}</h2>
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
        <div style="margin-top:10px;padding:6px 10px;background:#fffbea;border:1px solid #e5e7eb;border-radius:4px;font-size:10px;color:#555;line-height:1.5">
          <strong>Note:</strong> The <em>Grade</em> column reflects the original grade as recorded for the term.
          The <em>Final Grade</em> column shows the grade after Removal or Completion of INC/4.0.
        </div>
        <div style="margin-top:24px;padding-top:12px;border-top:1px solid #ccc;font-size:11px;color:#555;display:flex;justify-content:space-between;">
          <span>Approved by: <strong style="color:#111">${adminName}</strong></span>
          <span>Date Generated: <strong style="color:#111">${dateGenerated}</strong></span>
        </div>
      </div>`;

    const container = document.createElement('div');
    container.innerHTML = html;
    container.style.cssText = 'position:fixed;top:-99999px;left:-99999px;background:#fff';
    document.body.appendChild(container);
    try {
      await downloadAsPdf(
        container.firstElementChild as HTMLElement ?? container,
        `TOR_${(student.studentNumber ?? student.name).replace(/\s+/g, '_')}.pdf`,
        false
      );
    } finally {
      document.body.removeChild(container);
    }
  };

  // ─── Derived display data ──────────────────────────────────────────────────
  const { gwa: cumGwa, perTerm } = student ? computeGWA(student.id) : { gwa: 0, perTerm: [] };
  const { yearClass: yc, passedUnits: pu, totalUnits: tu } = student
    ? getStudentYearClass(student)
    : { yearClass: null, passedUnits: 0, totalUnits: 0 };
  const terms = student ? getStudentTerms(student.id) : [];

  const grBadge = (g: string) =>
    ['1.0','1.25','1.5','1.75','2.0','2.25','2.5','2.75','3.0','S','P'].includes(g) ? 'bg-green-100 text-green-800' :
    g === '5' || g === 'F' || g === 'U' ? 'bg-red-100 text-red-800' :
    g === 'INC' || g === '4' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700';

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
                      {yc && <Badge className={`text-xs border ${yearClassificationColor(yc)}`}>{yc}</Badge>}
                      {tu > 0 && <Badge variant="outline" className="text-xs">{pu}/{tu} units passed</Badge>}
                      {cumGwa > 0 && <Badge className="text-xs bg-primary/10 text-primary border-primary/20">CUM GWA: {cumGwa.toFixed(2)}</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={handleExportCSV}>
                      <Download className="w-3.5 h-3.5" /> CSV
                    </Button>
                    <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90" onClick={downloadPDF}>
                      <FileText className="w-3.5 h-3.5" /> Download TOR PDF
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Per-term tables */}
            {terms.length === 0 ? (
              <div className="portal-panel">
                <div className="py-8 text-center text-muted-foreground bg-background">No enrollment records found.</div>
              </div>
            ) : (
              terms.map(term => {
                const rows = getStudentTermRows(student.id, term.id);
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
                          {rows.map(({ course, grade: g }) => {
                            if (!course) return null;
                            const origGrade = g?.grade ?? null;
                            const effGrade = g ? getEffectiveGradeWithRules(g, state.grades, state.sections, state.terms) : null;
                            const wasAutoConverted = origGrade === '4' && effGrade === '5';
                            const finalChanged = (g?.removalSubmitted && g?.removalGrade) || wasAutoConverted;
                            const finalDisplay = finalChanged
                              ? (wasAutoConverted ? '5 (auto)' : g?.removalGrade ?? '—')
                              : '—';
                            return (
                              <TableRow key={g?.id ?? course.id} className={isNonAcademicCourse(course) ? 'bg-muted/10' : ''}>
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
                                    : <span className="text-muted-foreground">—</span>}
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
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground text-xs py-3">No courses this term.</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              })
            )}

            {/* Cumulative footer */}
            {cumGwa > 0 && (
              <div className="portal-panel">
                <div className="px-4 py-3 bg-background flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Cumulative GWA</span>
                  <Badge className="text-sm font-semibold bg-primary/10 text-primary border-primary/20">
                    {cumGwa.toFixed(2)}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
