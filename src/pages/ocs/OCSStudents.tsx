import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { isNonAcademicCourse } from '../../lib/utils';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../../components/ui/table';
import {
  Search, Download, FileText, Users, BookOpen, ChevronDown, ChevronUp,
  GraduationCap,
} from 'lucide-react';
import { downloadAsPdf } from '@/lib/pdfUtils';
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
  const ocsCollegeName = (() => {
    if (!ocsCollege) return '';
    const byId = state.colleges.find(c => c.id === ocsCollege);
    const byName = state.colleges.find(c => c.name === ocsCollege);
    return (byId ?? byName)?.name ?? ocsCollege;
  })();

  const studentInMyCollege = (u: typeof state.users[0]) => {
    if (!ocsCollegeName) return true;
    const sc = state.colleges.find(c => c.id === u.college || c.name === u.college);
    return (sc?.name ?? u.college ?? '') === ocsCollegeName;
  };

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
    // Deduplicate by sectionId — non-dropped takes priority over dropped
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
    const yearClass = totalUnits > 0 ? getYearClassification(passedUnits, totalUnits, prog?.degreeType) : null;
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
    const { yearClass: yc, passedUnits: pu, totalUnits: tu } = getStudentYearClass(student);
    const yearClassDisplay = yc ?? (student.yearLevel ? `Year ${student.yearLevel}` : '—');
    const { gwa: cumGwa } = computeGWA(studentId);
    const infoRows = [
      ['Student Name', student.name],
      ['Student Number', student.studentNumber ?? '—'],
      ['Program', student.program ?? '—'],
      ['Year Classification', `${yearClassDisplay}${tu > 0 ? ` (${pu}/${tu} units)` : ''}`],
      ['Cumulative GWA', cumGwa > 0 ? cumGwa.toFixed(2) : '—'],
      [],
    ];
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
    const allRows = [...infoRows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')), ...rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(','))];
    const blob = new Blob([allRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grades-${(student.studentNumber ?? student.name).replace(/\s+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadStudentPDF = async (studentId: string) => {
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
      const courseRows = rows.map((r, i) => {
        const originalGrade = r.grade?.grade ?? null;
        const effectiveGrade = r.grade ? getEffectiveGradeWithRules(r.grade, state.grades, state.sections, state.terms) : null;
        const wasAutoConverted = originalGrade === '4' && effectiveGrade === '5';
        const removalSubmitted = r.grade?.removalSubmitted && r.grade?.removalGrade;
        const origDisplay = originalGrade ?? '—';
        const finalChanged = removalSubmitted || wasAutoConverted;
        const finalDisplay = finalChanged
          ? (wasAutoConverted ? '5 (auto)' : (r.grade?.removalGrade ?? '—'))
          : '—';
        const gradeColor = (g: string) => {
          if (g === '5' || g === 'F' || g === '5 (auto)') return '#c00';
          if (g === '4' || g === 'INC') return '#b05000';
          if (['1.0','1.25','1.5','1.75','2.0','2.25','2.5','2.75','3.0'].includes(g)) return '#1E5940';
          return '#333';
        };
        const isDropped = r.enrollment?.status === 'dropped';
        return `<tr style="background:${i % 2 === 0 ? '#fff' : '#f7f8fa'}${isDropped ? ';opacity:0.7' : ''}">
          <td style="padding:4px 8px;border:1px solid #ddd;font-size:10px;color:#555">${r.course?.code ?? ''}</td>
          <td style="padding:4px 8px;border:1px solid #ddd;font-size:10px;color:#222">${r.course?.title ?? ''}${isDropped ? ' <em style="color:#999;font-size:9px">(Dropped)</em>' : ''}</td>
          <td style="padding:4px 8px;border:1px solid #ddd;font-size:10px;text-align:center;color:#555">${r.course?.units ?? ''}</td>
          <td style="padding:4px 8px;border:1px solid #ddd;font-size:10px;text-align:center;font-weight:bold;color:${gradeColor(origDisplay)}">${origDisplay}</td>
          <td style="padding:4px 8px;border:1px solid #ddd;font-size:10px;text-align:center;font-weight:bold;color:${finalDisplay !== '—' ? gradeColor(finalDisplay) : '#bbb'}">${finalDisplay}</td>
        </tr>`;
      }).join('');
      const totalUnits = rows.reduce((s, r) => {
        if (r.enrollment?.status === 'dropped') return s;
        return s + (r.course && !isNonAcademicCourse(r.course) ? (r.course.units ?? 0) : 0);
      }, 0);
      return `
        <div style="margin-bottom:16px">
          <div style="background:linear-gradient(120deg,#5a1320 0%,#1a4a30 100%);padding:5px 10px;display:flex;justify-content:space-between;align-items:center;margin-bottom:0;border-radius:3px 3px 0 0">
            <span style="font-size:11px;font-weight:bold;color:#fff;letter-spacing:0.03em;text-transform:uppercase">${term.name}</span>
            ${termGwa ? `<span style="font-size:10px;color:rgba(255,255,255,0.85)">Sem GWA: <strong style="color:#fff">${termGwa.toFixed(2)}</strong></span>` : '<span></span>'}
          </div>
          <table style="width:100%;border-collapse:collapse;border:1px solid #ddd;border-top:none">
            <thead><tr style="background:#2d2d2d">
              <th style="padding:4px 8px;border:1px solid #555;font-size:9px;text-align:left;color:#fff;font-weight:bold;text-transform:uppercase;letter-spacing:0.04em">Code</th>
              <th style="padding:4px 8px;border:1px solid #555;font-size:9px;text-align:left;color:#fff;font-weight:bold;text-transform:uppercase;letter-spacing:0.04em">Course Title</th>
              <th style="padding:4px 8px;border:1px solid #555;font-size:9px;text-align:center;color:#fff;font-weight:bold;text-transform:uppercase;letter-spacing:0.04em">Units</th>
              <th style="padding:4px 8px;border:1px solid #555;font-size:9px;text-align:center;color:#fff;font-weight:bold;text-transform:uppercase;letter-spacing:0.04em">Grade</th>
              <th style="padding:4px 8px;border:1px solid #555;font-size:9px;text-align:center;color:#fff;font-weight:bold;text-transform:uppercase;letter-spacing:0.04em">Final Grade</th>
            </tr></thead>
            <tbody>${courseRows || '<tr><td colspan="5" style="text-align:center;padding:8px;color:#999;font-size:10px">No records</td></tr>'}</tbody>
          </table>
          <div style="background:#f5f5f5;border:1px solid #ddd;border-top:none;padding:4px 10px;display:flex;justify-content:flex-end;gap:24px;font-size:10px;color:#444">
            <span>Academic units: <strong style="color:#222">${totalUnits}</strong></span>
          </div>
        </div>`;
    }).join('');

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;background:#fff;color:#111;width:760px;padding:0">

        <!-- Header Band -->
        <div style="background:linear-gradient(120deg,#7A1A2E 0%,#1E5940 100%);padding:14px 20px;display:flex;align-items:center;gap:14px">
          ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="width:56px;height:56px;object-fit:contain;border-radius:50%;border:2px solid rgba(255,255,255,0.4);flex-shrink:0" />` : ''}
          <div style="flex:1;text-align:center">
            <div style="font-size:15px;font-weight:bold;color:#fff;text-transform:uppercase;letter-spacing:0.06em">${institutionName}</div>
            <div style="font-size:10px;color:rgba(255,255,255,0.8);margin-top:2px;letter-spacing:0.04em">Office of the University Registrar</div>
            <div style="font-size:12px;font-weight:bold;color:#fff;margin-top:5px;text-transform:uppercase;letter-spacing:0.12em;border-top:1px solid rgba(255,255,255,0.35);padding-top:5px">Official Transcript of Records</div>
          </div>
          ${logoUrl ? `<div style="width:56px;flex-shrink:0"></div>` : ''}
        </div>

        <!-- Sub-header -->
        <div style="background:#f5f0f1;border-bottom:2px solid #7A1A2E;padding:5px 20px;display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:9px;font-weight:bold;color:#7A1A2E;letter-spacing:0.04em;text-transform:uppercase">Academic Information System · Student Record</span>
          <span style="font-size:9px;color:#555">Date Generated: <strong style="color:#222">${dateGenerated}</strong></span>
        </div>

        <!-- Student Info Grid -->
        <div style="margin:12px 20px 10px;border:1px solid #bbb">
          <div style="display:flex;border-bottom:1px solid #ccc">
            <div style="flex:2;padding:6px 12px;border-right:1px solid #ccc">
              <div style="font-size:7.5px;color:#7A1A2E;text-transform:uppercase;letter-spacing:0.06em;font-weight:bold">Student Name</div>
              <div style="font-size:13px;font-weight:bold;margin-top:2px;color:#111">${student.name.toUpperCase()}</div>
            </div>
            <div style="flex:1;padding:6px 12px;border-right:1px solid #ccc">
              <div style="font-size:7.5px;color:#7A1A2E;text-transform:uppercase;letter-spacing:0.06em;font-weight:bold">Student Number</div>
              <div style="font-size:12px;font-weight:bold;margin-top:2px">${student.studentNumber ?? '—'}</div>
            </div>
            <div style="flex:1;padding:6px 12px">
              <div style="font-size:7.5px;color:#7A1A2E;text-transform:uppercase;letter-spacing:0.06em;font-weight:bold">Year Classification</div>
              <div style="font-size:12px;font-weight:bold;margin-top:2px">${yearClassDisplay}${tu > 0 ? ` <span style="font-size:9px;color:#666">(${pu}/${tu} units)</span>` : ''}</div>
            </div>
          </div>
          <div style="display:flex">
            <div style="flex:2;padding:6px 12px;border-right:1px solid #ccc">
              <div style="font-size:7.5px;color:#7A1A2E;text-transform:uppercase;letter-spacing:0.06em;font-weight:bold">Program / Course</div>
              <div style="font-size:11px;font-weight:bold;margin-top:2px">${student.program ?? '—'}</div>
            </div>
            <div style="flex:1;padding:6px 12px;border-right:1px solid #ccc">
              <div style="font-size:7.5px;color:#7A1A2E;text-transform:uppercase;letter-spacing:0.06em;font-weight:bold">Cumulative GWA</div>
              <div style="font-size:12px;font-weight:bold;margin-top:2px;color:${cumGwa > 0 && cumGwa <= 1.75 ? '#1E5940' : cumGwa > 3 ? '#c00' : '#222'}">${cumGwa > 0 ? cumGwa.toFixed(2) : '—'}</div>
            </div>
            <div style="flex:1;padding:6px 12px">
              <div style="font-size:7.5px;color:#7A1A2E;text-transform:uppercase;letter-spacing:0.06em;font-weight:bold">Approved By</div>
              <div style="font-size:11px;font-weight:bold;margin-top:2px">${ocsName}</div>
            </div>
          </div>
        </div>

        <!-- Divider -->
        <div style="margin:0 20px 12px;border-top:1px dashed #ccc"></div>

        <!-- Grade Note -->
        <div style="margin:0 20px 10px;padding:5px 10px;background:#fffbea;border:1px solid #e5c000;border-left:3px solid #b08000;font-size:9px;color:#555;border-radius:2px">
          <strong>Note:</strong> The <em>Grade</em> column reflects the original grade as recorded for the term. The <em>Final Grade</em> column shows the grade after Removal or Completion of INC/4.0, or automatic conversion.
        </div>

        <!-- Term Blocks -->
        <div style="margin:0 20px">
          ${termBlocks || '<p style="color:#999;text-align:center;padding:20px">No enrollment records found.</p>'}
        </div>

        ${cumGwa > 0 ? `
        <!-- Cumulative GWA Banner -->
        <div style="margin:12px 20px;padding:10px 14px;background:linear-gradient(120deg,#f5f0f1,#f0f5f1);border:1px solid #bbb;border-left:4px solid #7A1A2E;display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:11px;color:#555">Cumulative General Weighted Average</span>
          <span style="font-size:16px;font-weight:bold;color:#7A1A2E">${cumGwa.toFixed(2)}</span>
        </div>` : ''}

        <!-- Signature Block -->
        <div style="margin:20px 20px 0;padding-top:14px;border-top:2px solid #7A1A2E;display:flex;gap:20px">
          <div style="flex:1;text-align:center">
            <div style="font-size:11px;font-weight:bold;min-height:18px;color:#7A1A2E">${ocsName}</div>
            <div style="border-top:1px solid #333;margin:5px 0 2px"></div>
            <div style="font-size:8px;text-transform:uppercase;letter-spacing:0.04em;color:#555">OCS Officer / Registrar</div>
          </div>
          <div style="flex:1;text-align:center">
            <div style="font-size:11px;font-weight:bold;min-height:18px"></div>
            <div style="border-top:1px solid #333;margin:5px 0 2px"></div>
            <div style="font-size:8px;text-transform:uppercase;letter-spacing:0.04em;color:#555">College Dean / Director</div>
          </div>
          <div style="flex:1;text-align:center">
            <div style="font-size:11px;font-weight:bold;min-height:18px"></div>
            <div style="border-top:1px solid #333;margin:5px 0 2px"></div>
            <div style="font-size:8px;text-transform:uppercase;letter-spacing:0.04em;color:#555">University Registrar</div>
          </div>
        </div>

        <!-- Footer -->
        <div style="margin:14px 20px 12px;padding:5px 10px;background:#f5f0f1;border:0.5px solid #ccc;font-size:8px;color:#666;text-align:center;line-height:1.5">
          This document is computer-generated by the Academic Information System (AIS). It is valid only when bearing the original signature of the University Registrar and the official dry seal.
          Any unauthorized alteration renders this document null and void. &nbsp;·&nbsp; Generated: ${dateGenerated}
        </div>

      </div>`;

    // Mount a hidden container, capture, then remove
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

  // ─── TOR state ────────────────────────────────────────────────────────────
  const [torSearch, setTorSearch] = useState('');
  const [torStudentId, setTorStudentId] = useState<string | null>(null);
  const [enrollSearch, setEnrollSearch] = useState('');
  const [expandedEnrolledId, setExpandedEnrolledId] = useState<string | null>(null);

  const torSearchResults = torSearch.trim().length > 0
    ? state.users.filter(u => u.role === 'student' &&
        studentInMyCollege(u) &&
        (u.name.toLowerCase().includes(torSearch.toLowerCase()) ||
         (u.studentNumber ?? '').toLowerCase().includes(torSearch.toLowerCase()))
      )
    : [];

  const torStudent = torStudentId
    ? state.users.find(u => u.id === torStudentId)
    : (torSearchResults.length === 1 ? torSearchResults[0] : null);

  return (
    <PortalLayout title="Students">
      <div className="space-y-4">
        <Tabs defaultValue="enrolled">
          <TabsList className="mb-2">
            <TabsTrigger value="enrolled" className="gap-1.5">
              <GraduationCap className="w-3.5 h-3.5" /> Currently Enrolled
            </TabsTrigger>
            <TabsTrigger value="tor" className="gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Transcript of Record
            </TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Currently Enrolled ────────────────────────── */}
          <TabsContent value="enrolled" className="mt-0">
        <div className="space-y-4">
          {activeTerm && (() => {
            const enrolledStudents = state.users.filter(u =>
              u.role === 'student' &&
              studentInMyCollege(u) &&
              u.status !== 'inactive' &&
              state.enrollments.some(e => e.studentId === u.id && e.termId === activeTerm.id && e.status === 'enrolled')
            );
            const q = enrollSearch.trim().toLowerCase();
            const filtered = q
              ? enrolledStudents.filter(u =>
                  u.name.toLowerCase().includes(q) ||
                  (u.studentNumber ?? '').toLowerCase().includes(q) ||
                  (u.program ?? '').toLowerCase().includes(q)
                )
              : enrolledStudents;

            return (
              <div className="portal-panel">
                <div className="portal-panel-header">
                  <GraduationCap className="w-4 h-4" />
                  Currently Enrolled — {activeTerm.name}
                  <Badge className="ml-2 bg-emerald-500 text-white text-xs h-5 px-1.5">{enrolledStudents.length}</Badge>
                </div>
                <div className="px-4 py-3 border-b border-border/50">
                  <div className="relative max-w-sm">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input placeholder="Search by name, ID, or program…" className="pl-8 h-9 text-sm"
                      value={enrollSearch} onChange={e => setEnrollSearch(e.target.value)} />
                  </div>
                </div>
                {filtered.length === 0 ? (
                  <div className="py-12 text-center flex flex-col items-center gap-3 text-muted-foreground">
                    <Users className="w-10 h-10 opacity-20" />
                    <p className="text-sm">{q ? `No students found for "${q}"` : 'No students currently enrolled this term.'}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="text-left py-2.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Student</th>
                          <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Program</th>
                          <th className="text-center py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Units</th>
                          <th className="text-right py-2.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map(student => {
                          const enrollments = state.enrollments.filter(
                            e => e.studentId === student.id && e.termId === activeTerm.id && e.status === 'enrolled'
                          );
                          const totalUnits = enrollments.reduce((sum, e) => {
                            const sec = state.sections.find(s => s.id === e.sectionId);
                            const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
                            return sum + (course ? (course.units + (course.labUnits ?? 0)) : 0);
                          }, 0);
                          const isExpanded = expandedEnrolledId === student.id;
                          return (
                            <>
                              <tr key={student.id}
                                className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                                <td className="py-3 px-4">
                                  <div className="font-medium text-sm">{student.name}</div>
                                  {student.studentNumber && <div className="text-xs text-muted-foreground font-mono">{student.studentNumber}</div>}
                                </td>
                                <td className="py-3 px-3 text-xs text-muted-foreground max-w-[180px] truncate">{student.program ?? '—'}</td>
                                <td className="py-3 px-3 text-center">
                                  <Badge variant="outline" className="text-xs font-medium">{totalUnits} units</Badge>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <Button size="sm" variant="outline"
                                      className="h-7 text-xs gap-1.5 px-2.5"
                                      onClick={() => setExpandedEnrolledId(isExpanded ? null : student.id)}>
                                      <BookOpen className="w-3 h-3" />
                                      Courses
                                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr key={`${student.id}-courses`} className="bg-muted/10 border-b border-border/30">
                                  <td colSpan={4} className="px-6 py-3">
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="text-muted-foreground border-b border-border/40">
                                          <th className="text-left py-1.5 pr-4 font-semibold">Code</th>
                                          <th className="text-left py-1.5 pr-4 font-semibold">Course Title</th>
                                          <th className="text-left py-1.5 pr-4 font-semibold">Section</th>
                                          <th className="text-center py-1.5 font-semibold">Units</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {enrollments.map(e => {
                                          const sec = state.sections.find(s => s.id === e.sectionId);
                                          const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
                                          if (!course || !sec) return null;
                                          return (
                                            <tr key={e.id} className="border-t border-border/20">
                                              <td className="py-1.5 pr-4 font-mono font-medium">{course.code}</td>
                                              <td className="py-1.5 pr-4 text-muted-foreground">{course.title}</td>
                                              <td className="py-1.5 pr-4 text-muted-foreground">{sec.sectionCode}</td>
                                              <td className="py-1.5 text-center font-medium">{course.units + (course.labUnits ?? 0)}</td>
                                            </tr>
                                          );
                                        })}
                                        {enrollments.length === 0 && (
                                          <tr><td colSpan={4} className="py-3 text-center text-muted-foreground">No courses found.</td></tr>
                                        )}
                                      </tbody>
                                    </table>
                                  </td>
                                </tr>
                              )}
                            </>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
          </TabsContent>

          {/* ── Tab 2: Transcript of Record ──────────────────────── */}
          <TabsContent value="tor" className="mt-0">
          <div className="space-y-4">
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
                            <FileText className="w-3.5 h-3.5" /> Download TOR PDF
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
          </TabsContent>
        </Tabs>
      </div>
    </PortalLayout>
  );
}
