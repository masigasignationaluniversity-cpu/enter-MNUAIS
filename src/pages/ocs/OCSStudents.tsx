import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { isNonAcademicCourse } from '../../lib/utils';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../../components/ui/table';
import { Search, Download, FileText, Users } from 'lucide-react';
import {
  getYearClassification, getPassedUnits, getScholasticStanding,
  scholasticStandingColor, yearClassificationColor,
  getEffectiveGradeWithRules, getPrescriptionDeadlineLabel,
  type YearClassification,
} from '../../lib/academic';

export default function OCSStudents() {
  const { state, getActiveTerm, computeGWA } = useApp();

  const activeTerm = getActiveTerm();
  const dept = state.currentUser?.department ?? '';
  const ocsCollege = state.currentUser?.college ?? '';

  // All terms enrollments for a student.
  // Dropped enrollments WITHOUT a submitted grade are excluded — these are change/drop-approved
  // drops that happened before any grading, so they should not appear on the TOR.
  // Dropped enrollments WITH a submitted grade are kept to preserve grading history.
  const getStudentTermRows = (studentId: string, termId: string) => {
    // Primary: collect from enrollments
    const fromEnrollments = state.enrollments
      .filter(e => e.studentId === studentId && e.termId === termId)
      .map(e => {
        const sec = state.sections.find(s => s.id === e.sectionId);
        const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
        const grade = state.grades.find(g => g.studentId === studentId && g.sectionId === e.sectionId && g.termId === termId);
        return { sec, course, grade, enrollment: e };
      })
      .filter(r =>
        r.course && r.sec &&
        // Include all non-dropped enrollments; only include dropped if a grade was submitted
        (r.enrollment.status !== 'dropped' || r.grade?.submitted)
      );
    // Fallback: also pick up any grade records whose section isn't linked to an enrollment
    // (edge-case where enrollment was hard-deleted but grade remains)
    const enrolledSectionIds = new Set(fromEnrollments.map(r => r.sec!.id));
    const orphanGradeRows = state.grades
      .filter(g => g.studentId === studentId && g.termId === termId && !enrolledSectionIds.has(g.sectionId))
      .map(g => {
        const sec = state.sections.find(s => s.id === g.sectionId);
        const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
        return { sec, course, grade: g, enrollment: null as typeof state.enrollments[0] | null };
      })
      .filter(r => r.course && r.sec);
    return [...fromEnrollments, ...orphanGradeRows];
  };

  // Terms where the student has ANY active (non-dropped-without-grade) enrollment or a submitted grade
  const getStudentTerms = (studentId: string) =>
    state.terms.filter(t => {
      const hasActiveEnrollment = state.enrollments.some(e =>
        e.studentId === studentId && e.termId === t.id &&
        (e.status !== 'dropped' ||
          state.grades.some(g => g.studentId === studentId && g.sectionId === e.sectionId && g.termId === t.id && g.submitted))
      );
      const hasGrade = state.grades.some(g => g.studentId === studentId && g.termId === t.id && g.submitted);
      return hasActiveEnrollment || hasGrade;
    });

  // ─── Academic standing helpers ───────────────────────────────────────────────
  const getStudentYearClass = (student: typeof state.users[0]): { yearClass: YearClassification | null; passedUnits: number; totalUnits: number } => {
    const prog = state.degreePrograms.find(p => p.name === student.program);
    const totalUnits = prog?.totalUnits ?? 0;
    const passedUnits = getPassedUnits(student.id, state.grades, state.sections, state.courses, state.enrollments);
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
    const rows: string[][] = [['Term', 'Course Code', 'Course Title', 'Units', 'Grade', 'Final Grade', 'Submitted']];
    terms.forEach(term => {
      getStudentTermRows(studentId, term.id).forEach(r => {
        const origGrade = r.grade?.grade ?? 'N/A';
        const effGrade = r.grade ? getEffectiveGradeWithRules(r.grade, state.grades, state.sections, state.terms) : null;
        const finalGrade = (effGrade && effGrade !== origGrade) ? effGrade : '';
        rows.push([
          term.name,
          r.course?.code ?? '',
          r.course?.title ?? '',
          String(r.course?.units ?? ''),
          origGrade,
          finalGrade,
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
    const institutionName = state.portalSettings?.institutionName ?? 'University';
    const logoUrl = state.portalSettings?.logoUrl ?? '';
    const ocsName = state.currentUser?.name ?? '—';
    const dateGenerated = new Date().toLocaleString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

    const termBlocks = terms.map(term => {
      const rows = getStudentTermRows(studentId, term.id);
      const termGwa = perTerm.find(p => p.term.id === term.id)?.gwa;
      const courseRows = rows.map(r => {
        const originalGrade = r.grade?.grade ?? null;
        const effectiveGrade = r.grade ? getEffectiveGradeWithRules(r.grade, state.grades, state.sections, state.terms) : null;
        const wasAutoConverted = originalGrade === '4' && effectiveGrade === '5';
        const removalSubmitted = r.grade?.removalSubmitted && r.grade?.removalGrade;
        // Original grade column
        const origDisplay = originalGrade ?? '—';
        // Final grade column — only show when different from original (removal/auto-conversion happened)
        const finalChanged = removalSubmitted || wasAutoConverted;
        const finalDisplay = finalChanged
          ? (wasAutoConverted ? '5 (auto)' : (r.grade?.removalGrade ?? '—'))
          : '—';
        const gradeColor = (g: string) => {
          if (g === '5' || g === 'F' || g === '5 (auto)') return '#c00';
          if (g === '4' || g === 'INC') return '#b05000';
          if (['1.0','1.25','1.5','1.75','2.0','2.25','2.5','2.75','3.0'].includes(g)) return '#005500';
          return '#333';
        };
        return `<tr>
          <td style="padding:4px 8px;border:1px solid #ddd;font-size:11px">${r.course?.code ?? ''}</td>
          <td style="padding:4px 8px;border:1px solid #ddd;font-size:11px">${r.course?.title ?? ''}</td>
          <td style="padding:4px 8px;border:1px solid #ddd;font-size:11px;text-align:center">${r.course?.units ?? ''}</td>
          <td style="padding:4px 8px;border:1px solid #ddd;font-size:11px;text-align:center;font-weight:bold;color:${gradeColor(origDisplay)}">${origDisplay}</td>
          <td style="padding:4px 8px;border:1px solid #ddd;font-size:11px;text-align:center;font-weight:bold;color:${finalDisplay !== '—' ? gradeColor(finalDisplay) : '#aaa'}">${finalDisplay}${wasAutoConverted ? '' : ''}</td>
        </tr>`;
      }).join('');
      const totalUnits = rows.reduce((s, r) => {
        if (r.enrollment?.status === 'dropped') return s; // DRP courses don't count
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
          <span>Academic units: <strong>${totalUnits}</strong> <span style="font-size:10px;color:#999">(excl. HK/PE/NSTP)</span></span>
          ${termGwa ? `<span>Semester GWA: <strong style="color:#333">${termGwa.toFixed(2)}</strong></span>` : ''}
        </div>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head>
      <title>Grade Report — ${student.name}</title>
      <style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h2{margin-bottom:2px}@media print{@page{margin:20mm}}</style>
    </head><body>
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
        ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="width:64px;height:64px;object-fit:contain;flex-shrink:0" />` : ''}
        <div style="flex:1;text-align:center">
          <div style="font-size:15px;font-weight:bold;color:#111;text-transform:uppercase;letter-spacing:0.04em">${institutionName}</div>
          <div style="font-size:13px;color:#555;margin-top:2px;letter-spacing:0.08em;text-transform:uppercase">Transcript of Record</div>
        </div>
        ${logoUrl ? `<div style="width:64px;flex-shrink:0"></div>` : ''}
      </div>
      <hr style="margin:0 0 12px">
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
      <div style="margin-top:10px;padding:6px 10px;background:#fffbea;border:1px solid #e5e7eb;border-radius:4px;font-size:10px;color:#555;line-height:1.5">
        <strong>Note:</strong> The <em>Grade</em> column reflects the original grade as recorded for the term.
        The <em>Final Grade</em> column shows the grade after Removal or Completion of INC/4.0, as submitted by the instructor via Form 13C.
        Grades converted to 5.0 due to lapse of the one-year prescription period are marked <strong>5 (auto)</strong>.
      </div>
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

  // ─── TOR state ────────────────────────────────────────────────────────────
  const [torSearch, setTorSearch] = useState('');
  const [torStudentId, setTorStudentId] = useState<string | null>(null);

  const torSearchResults = torSearch.trim().length > 0
    ? state.users.filter(u => u.role === 'student' && (
        u.name.toLowerCase().includes(torSearch.toLowerCase()) ||
        (u.studentNumber ?? '').toLowerCase().includes(torSearch.toLowerCase())
      ))
    : [];

  const torStudent = torStudentId
    ? state.users.find(u => u.id === torStudentId)
    : (torSearchResults.length === 1 ? torSearchResults[0] : null);

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

        <div className="space-y-4">
          {/* ── Transcript of Record ──────────────────────────────────────── */}
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
                    value={torSearch}
                    onChange={e => { setTorSearch(e.target.value); setTorStudentId(null); }}
                  />
                </div>
                {torSearch.trim() && torSearchResults.length > 1 && !torStudentId && (
                  <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                    {torSearchResults.map(s => (
                      <button key={s.id} className="w-full text-left px-4 py-2.5 hover:bg-muted/40 flex items-center justify-between"
                        onClick={() => setTorStudentId(s.id)}>
                        <div>
                          <span className="font-medium text-sm">{s.name}</span>
                          <span className="ml-2 text-xs text-muted-foreground font-mono">{s.studentNumber ?? '—'}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{s.program ?? ''}</span>
                      </button>
                    ))}
                  </div>
                )}
                {torSearch.trim() && torSearchResults.length === 0 && (
                  <p className="text-sm text-muted-foreground py-2">No students found matching "{torSearch}"</p>
                )}
              </div>
            </div>

            {!torSearch.trim() && (
              <div className="portal-panel">
                <div className="py-12 text-center text-muted-foreground bg-background">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Search for a student to generate their TOR</p>
                  <p className="text-sm mt-1">Enter a student number or name above.</p>
                </div>
              </div>
            )}

            {torStudent && (() => {
              const terms = getStudentTerms(torStudent.id);
              const { gwa: cumGwa } = computeGWA(torStudent.id);
              const { yearClass: yc, passedUnits: pu, totalUnits: tu } = getStudentYearClass(torStudent);
              return (
                <div className="space-y-3">
                  <div className="portal-panel">
                    <div className="p-4 bg-background">
                      <div className="flex items-start justify-between flex-wrap gap-3">
                        <div>
                          <p className="font-semibold text-base">{torStudent.name}</p>
                          <p className="text-sm text-muted-foreground font-mono">{torStudent.studentNumber ?? '—'}</p>
                          <p className="text-sm text-muted-foreground">{torStudent.program ?? '—'}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {yc && <Badge className={`text-xs border ${yearClassificationColor(yc)}`}>{yc}</Badge>}
                            {tu > 0 && <Badge variant="outline" className="text-xs">{pu}/{tu} units passed</Badge>}
                            {cumGwa > 0 && <Badge className="text-xs bg-primary/10 text-primary border-primary/20">CUM GWA: {cumGwa.toFixed(2)}</Badge>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="gap-1.5"
                            onClick={() => downloadStudentCSV(torStudent.id)}>
                            <Download className="w-3.5 h-3.5" /> CSV
                          </Button>
                          <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                            onClick={() => downloadStudentPDF(torStudent.id)}>
                            <FileText className="w-3.5 h-3.5" /> Generate TOR PDF
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {terms.length === 0 ? (
                    <div className="portal-panel"><div className="py-8 text-center text-muted-foreground bg-background">No enrollment records found.</div></div>
                  ) : (
                    terms.map(term => {
                      const rows = getStudentTermRows(torStudent.id, term.id);
                      return (
                        <div key={term.id} className="portal-panel">
                          <div className="portal-panel-header">
                            <span>{term.name}</span>
                            {term.isActive && <Badge className="bg-green-100 text-green-800 text-xs ml-2">Active</Badge>}
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
                                {rows.map(r => {
                                  const origGrade = r.grade?.grade ?? null;
                                  const effGrade = r.grade ? getEffectiveGradeWithRules(r.grade, state.grades, state.sections, state.terms) : null;
                                  const wasAutoConverted = origGrade === '4' && effGrade === '5';
                                  const finalChanged = (r.grade?.removalSubmitted && r.grade?.removalGrade) || wasAutoConverted;
                                  const finalDisplay = finalChanged
                                    ? (wasAutoConverted ? '5 (auto)' : r.grade?.removalGrade ?? '—')
                                    : '—';
                                  const grBadge = (g: string) =>
                                    ['1.0','1.25','1.5','1.75','2.0','2.25','2.5','2.75','3.0'].includes(g) ? 'bg-green-100 text-green-800' :
                                    g === '5' || g === 'F' ? 'bg-red-100 text-red-800' :
                                    g === 'INC' || g === '4' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700';
                                  return (
                                    <TableRow key={r.enrollment?.id ?? r.grade?.id ?? r.sec?.id}>
                                      <TableCell className="text-xs font-mono py-2">{r.course?.code}</TableCell>
                                      <TableCell className="text-xs py-2">{r.course?.title}</TableCell>
                                      <TableCell className="text-xs text-center py-2">{r.course?.units}</TableCell>
                                      <TableCell className="text-xs text-center py-2">
                                        {origGrade
                                          ? <Badge className={`text-xs ${grBadge(origGrade)}`}>{origGrade}</Badge>
                                          : <span className="text-muted-foreground text-xs">N/A</span>}
                                      </TableCell>
                                      <TableCell className="text-xs text-center py-2">
                                        {finalDisplay !== '—'
                                          ? <Badge className={`text-xs ${wasAutoConverted ? 'bg-red-100 text-red-800' : grBadge(finalDisplay)}`}>{finalDisplay}</Badge>
                                          : <span className="text-muted-foreground text-xs">—</span>}
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
              );
            })()}
        </div>
      </div>
    </PortalLayout>
  );
}
