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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  Search, Download, FileText, Users, BookOpen, ChevronDown, ChevronUp,
  GraduationCap, UserX, UserCheck, UserMinus,
} from 'lucide-react';
import { downloadAsPdf } from '@/lib/pdfUtils';
import { toast } from '@/components/ui/sonner';
import {
  getYearClassification, getPassedUnits, getScholasticStanding,
  scholasticStandingColor, yearClassificationColor,
  getEffectiveGradeWithRules, getPrescriptionDeadlineLabel,
  type YearClassification,
} from '../../lib/academic';

export default function OCSStudents() {
  const { state, getActiveTerm, computeGWA, updateUser } = useApp();

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
      const courseRows = rows.map(r => {
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
          if (['1.0','1.25','1.5','1.75','2.0','2.25','2.5','2.75','3.0'].includes(g)) return '#005500';
          return '#333';
        };
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
          <span>Approved by: <strong style="color:#111">${ocsName}</strong></span>
          <span>Date Generated: <strong style="color:#111">${dateGenerated}</strong></span>
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

  // ─── Deactivated tab state ────────────────────────────────────────────────
  const [deactivateSearch, setDeactivateSearch] = useState('');
  const [deactivateTargetId, setDeactivateTargetId] = useState<string | null>(null);
  const [reactivateTargetId, setReactivateTargetId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

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

  // ─── Deactivated accounts ─────────────────────────────────────────────────
  // All non-admin users in this college (all roles)
  const allUsersInCollege = state.users.filter(u => u.role !== 'admin' && studentInMyCollege(u));
  const deactivatedUsers = allUsersInCollege.filter(u => u.status === 'inactive');
  const activeUsersInCollege = allUsersInCollege.filter(u => u.status !== 'inactive');

  const roleLabel = (role: typeof state.users[0]['role']) => {
    if (role === 'student') return 'Student';
    if (role === 'faculty') return 'Faculty';
    if (role === 'ocs') return 'OCS Staff';
    if (role === 'department_head') return 'Dept. Head';
    return role;
  };

  const roleColor = (role: typeof state.users[0]['role']) => {
    if (role === 'student') return 'bg-blue-100 text-blue-700 border-blue-200';
    if (role === 'faculty') return 'bg-violet-100 text-violet-700 border-violet-200';
    if (role === 'ocs') return 'bg-amber-100 text-amber-700 border-amber-200';
    if (role === 'department_head') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    return 'bg-muted text-muted-foreground';
  };

  const deactQ = deactivateSearch.trim().toLowerCase();
  const filteredDeactivated = deactQ
    ? deactivatedUsers.filter(u =>
        u.name.toLowerCase().includes(deactQ) ||
        (u.studentNumber ?? '').toLowerCase().includes(deactQ) ||
        (u.employeeId ?? '').toLowerCase().includes(deactQ) ||
        (u.program ?? '').toLowerCase().includes(deactQ) ||
        (u.department ?? '').toLowerCase().includes(deactQ) ||
        roleLabel(u.role).toLowerCase().includes(deactQ)
      )
    : deactivatedUsers;

  const handleDeactivate = async (userId: string) => {
    setProcessingId(userId);
    try {
      await updateUser(userId, { status: 'inactive' });
      toast.success('Account deactivated. The user will no longer be able to log in.');
    } catch {
      toast.error('Failed to deactivate account.');
    } finally {
      setProcessingId(null);
      setDeactivateTargetId(null);
    }
  };

  const handleReactivate = async (userId: string) => {
    setProcessingId(userId);
    try {
      await updateUser(userId, { status: 'active' });
      toast.success('Account reactivated successfully.');
    } catch {
      toast.error('Failed to reactivate account.');
    } finally {
      setProcessingId(null);
      setReactivateTargetId(null);
    }
  };

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
            <TabsTrigger value="deactivated" className="gap-1.5">
              <UserMinus className="w-3.5 h-3.5" /> Deactivated Accounts
              {deactivatedUsers.length > 0 && (
                <Badge className="ml-1 bg-red-100 text-red-700 border-0 text-[10px] px-1.5 py-0 h-4">{deactivatedUsers.length}</Badge>
              )}
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
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs gap-1 px-2 border-red-200 text-red-600 hover:bg-red-50"
                                      onClick={() => setDeactivateTargetId(student.id)}
                                    >
                                      <UserX className="w-3 h-3" /> Deactivate
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

          {/* ── Tab 3: Deactivated Accounts ──────────────────────── */}
          <TabsContent value="deactivated" className="mt-0">
            <div className="portal-panel">
              <div className="portal-panel-header">
                <UserMinus className="w-4 h-4" />
                Deactivated Accounts
                <Badge className="ml-2 bg-red-500/80 text-white text-xs h-5 px-1.5">{deactivatedUsers.length}</Badge>
              </div>
              <div className="px-4 py-3 border-b border-border/50">
                <div className="relative max-w-sm">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input placeholder="Search by name, ID, role, program, or department…" className="pl-8 h-9 text-sm"
                    value={deactivateSearch} onChange={e => setDeactivateSearch(e.target.value)} />
                </div>
              </div>
              {filteredDeactivated.length === 0 ? (
                <div className="py-16 text-center flex flex-col items-center gap-3 text-muted-foreground">
                  <UserCheck className="w-10 h-10 opacity-20" />
                  <p className="font-semibold text-sm">
                    {deactQ ? `No deactivated accounts match "${deactQ}"` : 'No deactivated accounts'}
                  </p>
                  <p className="text-xs opacity-70">All accounts in your college are currently active.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left py-2.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">User</th>
                        <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Role</th>
                        <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Info</th>
                        <th className="text-center py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                        <th className="text-right py-2.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDeactivated.map(user => (
                        <tr key={user.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors bg-red-50/30">
                          <td className="py-3 px-4">
                            <div className="font-medium text-sm">{user.name}</div>
                            <div className="text-xs text-muted-foreground font-mono">{user.username}</div>
                          </td>
                          <td className="py-3 px-3">
                            <Badge className={`text-[10px] border ${roleColor(user.role)}`}>{roleLabel(user.role)}</Badge>
                          </td>
                          <td className="py-3 px-3 text-xs text-muted-foreground max-w-[180px] truncate">
                            {user.studentNumber ?? user.employeeId ?? user.program ?? user.department ?? '—'}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <Badge className="text-xs bg-red-100 text-red-700 border-red-300 gap-1">
                              <UserX className="w-3 h-3" /> Inactive
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1.5 px-2.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                              disabled={processingId === user.id}
                              onClick={() => setReactivateTargetId(user.id)}
                            >
                              <UserCheck className="w-3 h-3" /> Reactivate
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Active accounts — all roles — deactivate from here */}
            <div className="portal-panel mt-4">
              <div className="portal-panel-header">
                <Users className="w-4 h-4" />
                Active Accounts — All Roles
                <Badge className="ml-2 bg-emerald-500/80 text-white text-xs h-5 px-1.5">{activeUsersInCollege.length}</Badge>
              </div>
              <p className="px-4 py-2 text-xs text-muted-foreground border-b border-border/40">
                Deactivating an account prevents the user from logging in. All records are preserved and the account can be reactivated at any time.
              </p>
              {activeUsersInCollege.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground text-sm">No active accounts found.</div>
              ) : (
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
                      <tr className="border-b border-border">
                        <th className="text-left py-2.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">User</th>
                        <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Role</th>
                        <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Info</th>
                        <th className="text-right py-2.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeUsersInCollege.map(user => (
                        <tr key={user.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                          <td className="py-2.5 px-4">
                            <div className="font-medium text-sm">{user.name}</div>
                            <div className="text-xs text-muted-foreground font-mono">{user.username}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge className={`text-[10px] border ${roleColor(user.role)}`}>{roleLabel(user.role)}</Badge>
                          </td>
                          <td className="py-2.5 px-3 text-xs text-muted-foreground max-w-[200px] truncate">
                            {user.studentNumber ?? user.employeeId ?? user.program ?? user.department ?? '—'}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1 px-2.5 border-red-200 text-red-600 hover:bg-red-50"
                              disabled={processingId === user.id}
                              onClick={() => setDeactivateTargetId(user.id)}
                            >
                              <UserX className="w-3 h-3" /> Deactivate
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Deactivate confirmation dialog */}
      <AlertDialog open={!!deactivateTargetId} onOpenChange={open => { if (!open) setDeactivateTargetId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <UserX className="w-4 h-4 text-destructive" /> Deactivate Account
            </AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const s = state.users.find(u => u.id === deactivateTargetId);
                return s
                  ? `Deactivate the account of ${s.name} (${s.studentNumber ?? s.employeeId ?? s.username})? They will no longer be able to log in. All records are preserved and the account can be reactivated.`
                  : 'Deactivate this account?';
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deactivateTargetId && handleDeactivate(deactivateTargetId)}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reactivate confirmation dialog */}
      <AlertDialog open={!!reactivateTargetId} onOpenChange={open => { if (!open) setReactivateTargetId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" /> Reactivate Account
            </AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const s = state.users.find(u => u.id === reactivateTargetId);
                return s
                  ? `Reactivate the account of ${s.name} (${s.studentNumber ?? s.username})? They will be able to log in again.`
                  : 'Reactivate this account?';
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => reactivateTargetId && handleReactivate(reactivateTargetId)}
            >
              Reactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PortalLayout>
  );
}
