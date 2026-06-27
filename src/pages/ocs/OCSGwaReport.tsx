import { useState, useMemo, useEffect } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { TermSelect } from '@/components/shared/TermSelect';
import { StatusBanner } from '@/components/shared/StatusBanner';
import {
  Download, Award, Users, Search, ChevronDown, ChevronRight,
  TrendingUp, BookOpen, Building2, Star, GraduationCap,
} from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import type { Grade, Section, Course, User } from '@/lib/types';
import { getEffectiveGradeWithRules } from '@/lib/academic';

// ── Types ─────────────────────────────────────────────────────────────────────
type GradeDetail = { grade: Grade; section: Section; course: Course };
type Standing =
  | 'University Scholar'
  | 'College Scholar'
  | 'Summa Cum Laude'
  | 'Magna Cum Laude'
  | 'Cum Laude'
  | null;

type StudentRow = {
  student: User;
  termGwa: number;
  cumGwa: number;
  unitsTaken: number;
  standing: Standing;
};

type ProgramGroup = { programName: string; students: StudentRow[] };
type CollegeGroup = {
  collegeName: string;
  programs: ProgramGroup[];
  totalStudents: number;
  scholarsCount: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function getTermHonorific(
  gwa: number,
  grades: GradeDetail[],
  semester?: string,
  approvedUnderload?: boolean,
): 'University Scholar' | 'College Scholar' | null {
  if (gwa <= 0 || semester === 'Mid-Term') return null;
  const units = grades
    .filter(g => !g.course.isPE && !g.course.isNSTP)
    .reduce((s, g) => s + g.course.units + (g.course.labUnits ?? 0), 0);
  if (units < 15 && !approvedUnderload) return null;
  const hasFail = grades.some(g => {
    const eff = (g.grade.removalSubmitted && g.grade.removalGrade) ? g.grade.removalGrade : g.grade.grade;
    if (!eff) return false;
    const n = parseFloat(eff as string);
    return (!isNaN(n) && n > 3.0) || eff === 'F' || eff === '5';
  });
  const hasINC = grades.some(g => g.grade.grade === 'INC');
  if (hasFail || hasINC) return null;
  if (gwa <= 1.45) return 'University Scholar';
  if (gwa <= 1.75) return 'College Scholar';
  return null;
}

function getLatinHonors(cumGwa: number, hasINC: boolean): 'Summa Cum Laude' | 'Magna Cum Laude' | 'Cum Laude' | null {
  if (cumGwa <= 0 || hasINC) return null;
  if (cumGwa <= 1.25) return 'Summa Cum Laude';
  if (cumGwa <= 1.50) return 'Magna Cum Laude';
  if (cumGwa <= 1.75) return 'Cum Laude';
  return null;
}

const StandingBadge = ({ s }: { s: Standing }) => {
  if (!s) return <span className="text-xs text-muted-foreground">—</span>;
  if (s === 'University Scholar')
    return <Badge className="text-[10px] px-2 py-0.5 bg-yellow-100 text-yellow-800 border-yellow-300 gap-1 whitespace-nowrap"><Star className="w-3 h-3" />{s}</Badge>;
  if (s === 'College Scholar')
    return <Badge className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-800 border-blue-300 gap-1 whitespace-nowrap"><Award className="w-3 h-3" />{s}</Badge>;
  return <Badge className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-800 border-amber-300 gap-1 whitespace-nowrap"><GraduationCap className="w-3 h-3" />{s}</Badge>;
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function OCSGwaReport() {
  const { state, getStudentGrades, loadUnderloadApplications } = useApp();
  const me = state.currentUser;

  const activeTerm = state.terms.find(t => t.isActive);
  const [selectedTermId, setSelectedTermId] = useState(activeTerm?.id ?? state.terms[0]?.id ?? '');
  const [search, setSearch] = useState('');
  const [collapsedColleges, setCollapsedColleges] = useState<Set<string>>(new Set());
  const [collapsedPrograms, setCollapsedPrograms] = useState<Set<string>>(new Set());

  const selectedTerm = state.terms.find(t => t.id === selectedTermId);
  const isMidTerm = selectedTerm?.semester === 'Mid-Term';

  // Always load fresh underload applications so hasApprovedUnderload is accurate
  useEffect(() => { loadUnderloadApplications(); }, [loadUnderloadApplications]);

  // Resolve college display name from student.college
  const getCollegeName = (student: User): string => {
    if (!student.college) return 'Unassigned';
    const col = state.colleges.find(
      c => c.id === student.college || c.name === student.college || c.abbreviation === student.college,
    );
    return col?.name ?? student.college;
  };

  // ── Compute all student rows for the selected term ────────────────────────
  const allRows = useMemo<StudentRow[]>(() => {
    if (!selectedTermId) return [];
    // OCS users only see students from their own college
    const ocsCollegeName = me ? getCollegeName(me) : null;
    return state.users
      .filter(u => {
        if (u.role !== 'student' || u.status === 'inactive') return false;
        if (ocsCollegeName && ocsCollegeName !== 'Unassigned') {
          return getCollegeName(u) === ocsCollegeName;
        }
        return true;
      })
      .flatMap(student => {
        // Compute GWA WITHOUT the program-course filter.
        // computeGWA() filters by graduation requirements (programCourseIds), which can exclude
        // courses not yet mapped — making the report empty even with fully submitted grades.
        // The student-facing grades page uses the same no-filter approach.
        const computeGwaNoFilter = (termId?: string): number => {
          const gs = state.grades.filter(g =>
            g.studentId === student.id && g.submitted && g.grade !== null &&
            (termId ? g.termId === termId : true)
          );
          let tw = 0, tu = 0;
          for (const g of gs) {
            const sec = state.sections.find(s => s.id === g.sectionId);
            const course = sec ? state.courses.find(c => c.id === sec.courseId) : undefined;
            if (!course || course.isPE || course.isNSTP || /^HK\b/i.test(course.code)) continue;
            const enr = state.enrollments.find(
              e => e.studentId === student.id && e.sectionId === g.sectionId && e.termId === g.termId,
            );
            if (enr?.status === 'dropped') continue;
            const eff = getEffectiveGradeWithRules(g, state.grades, state.sections, state.terms);
            const num = parseFloat(eff as string);
            if (isNaN(num)) continue;
            tw += num * course.units;
            tu += course.units;
          }
          return tu > 0 ? Math.round((tw / tu) * 100) / 100 : 0;
        };

        const termGwa = computeGwaNoFilter(selectedTermId);
        if (termGwa <= 0) return [];                  // no submitted grades this term

        const cumGwa = computeGwaNoFilter();
        const termGrades = getStudentGrades(student.id, selectedTermId);
        // Exclude officially dropped courses so unit count is accurate for honorific standing
        const activeGrades = termGrades.filter(g => {
          const enr = state.enrollments.find(
            e => e.studentId === student.id && e.sectionId === g.grade.sectionId && e.termId === selectedTermId,
          );
          return enr?.status !== 'dropped';
        });

        const unitsTaken = activeGrades
          .filter(g => !g.course.isPE && !g.course.isNSTP)
          .reduce((s, g) => s + g.course.units + (g.course.labUnits ?? 0), 0);

        const hasApprovedUnderload = (state.underloadApplications ?? []).some(
          a => a.studentId === student.id && a.termId === selectedTermId && a.status === 'approved',
        );

        // Graduating: has a graduation application for this term
        const isGraduating = state.graduationApplications.some(
          a => a.studentId === student.id && a.termId === selectedTermId,
        ) || (student.yearLevel ?? 0) >= 4;

        const hasINCThisTerm = activeGrades.some(g => g.grade.grade === 'INC');

        let standing: Standing = null;
        if (isGraduating) {
          standing = getLatinHonors(cumGwa, hasINCThisTerm);
        }
        if (!standing && !isMidTerm) {
          standing = getTermHonorific(termGwa, activeGrades, selectedTerm?.semester, hasApprovedUnderload);
        }

        return [{ student, termGwa, cumGwa, unitsTaken, standing }];
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTermId, isMidTerm, state.users, state.grades, state.sections, state.courses,
    state.terms, state.enrollments, state.underloadApplications, state.graduationApplications]);

  // ── Filter by search ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter(({ student }) => {
      const c = getCollegeName(student).toLowerCase();
      return student.name.toLowerCase().includes(q)
        || (student.studentNumber ?? '').toLowerCase().includes(q)
        || (student.program ?? '').toLowerCase().includes(q)
        || c.includes(q);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRows, search]);

  // ── Group: college → program ──────────────────────────────────────────────
  const grouped = useMemo<CollegeGroup[]>(() => {
    const cMap = new Map<string, Map<string, StudentRow[]>>();
    for (const row of filtered) {
      const col = getCollegeName(row.student);
      const prog = row.student.program ?? 'Unassigned';
      if (!cMap.has(col)) cMap.set(col, new Map());
      const pMap = cMap.get(col)!;
      if (!pMap.has(prog)) pMap.set(prog, []);
      pMap.get(prog)!.push(row);
    }
    return Array.from(cMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([collegeName, pMap]) => {
        const programs = Array.from(pMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([programName, students]) => ({
            programName,
            students: [...students].sort((a, b) => a.termGwa - b.termGwa), // lower GWA = better
          }));
        const all = programs.flatMap(p => p.students);
        return {
          collegeName,
          programs,
          totalStudents: all.length,
          scholarsCount: all.filter(s => s.standing !== null).length,
        };
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, state.colleges]);

  // Stats
  const totalStudents = allRows.length;
  const univScholars  = allRows.filter(r => r.standing === 'University Scholar').length;
  const collegeSchol  = allRows.filter(r => r.standing === 'College Scholar').length;
  const latinHonors   = allRows.filter(r => r.standing && !['University Scholar', 'College Scholar'].includes(r.standing)).length;

  const toggleCollege = (name: string) =>
    setCollapsedColleges(prev => { const s = new Set(prev); if (s.has(name)) s.delete(name); else s.add(name); return s; });
  const toggleProgram = (key: string) =>
    setCollapsedPrograms(prev => { const s = new Set(prev); if (s.has(key)) s.delete(key); else s.add(key); return s; });

  // ── PDF generation ────────────────────────────────────────────────────────
  const generatePdf = () => {
    if (grouped.length === 0) { toast.error('No grade data available for this term.'); return; }
    const inst = state.portalSettings?.institutionName ?? 'University';
    const portal = state.portalSettings?.portalName ?? 'Academic Information System';
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true });

    const badgeCss = (s: Standing): string => {
      if (!s) return '';
      if (s === 'University Scholar') return 'background:#fef3c7;color:#92400e;border:1px solid #fcd34d;';
      if (s === 'College Scholar')    return 'background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;';
      return 'background:#fefce8;color:#713f12;border:1px solid #fde68a;'; // Latin honors
    };

    const gwaColor = (g: number) => g > 0 && g <= 1.75 ? '#1E5940' : '#222';

    let body = '';
    for (const col of grouped) {
      body += `<div class="college-block">
        <div class="col-hdr">${col.collegeName}<span class="col-stat">${col.totalStudents} students &nbsp;·&nbsp; ${col.scholarsCount} with standing</span></div>`;
      for (const prog of col.programs) {
        const progScholars = prog.students.filter(r => r.standing).length;
        body += `<div class="prog-hdr">${prog.programName}<span class="prog-stat">${prog.students.length} students${progScholars > 0 ? ` · ${progScholars} with standing` : ''}</span></div>
        <table>
          <thead><tr>
            <th style="width:28px">#</th>
            <th>Name</th>
            <th style="width:95px">Student No.</th>
            <th style="width:32px">Yr</th>
            <th style="width:42px">Units</th>
            <th style="width:60px">Term GWA</th>
            <th style="width:60px">Cum GWA</th>
            <th style="width:135px">Standing</th>
          </tr></thead>
          <tbody>
            ${prog.students.map((r, i) => `<tr class="${i % 2 ? 'alt' : ''}">
              <td class="ctr mono">${i + 1}</td>
              <td>${r.student.name}</td>
              <td class="ctr mono">${r.student.studentNumber ?? '—'}</td>
              <td class="ctr">${r.student.yearLevel ?? '—'}</td>
              <td class="ctr bold">${r.unitsTaken}</td>
              <td class="ctr bold" style="color:${gwaColor(r.termGwa)}">${r.termGwa.toFixed(2)}</td>
              <td class="ctr">${r.cumGwa.toFixed(2)}</td>
              <td class="ctr">${r.standing ? `<span class="badge" style="${badgeCss(r.standing)}">${r.standing}</span>` : '—'}</td>
            </tr>`).join('')}
          </tbody>
        </table>`;
      }
      body += '</div>';
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>GWA Report — ${selectedTerm?.name ?? ''}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;font-size:9pt;color:#222}
    @page{size:A4;margin:12mm 14mm}
    @media print{.no-print{display:none}}
    .hdr{background:linear-gradient(120deg,#7A1A2E 0%,#1E5940 100%);color:#fff;padding:14px 20px;text-align:center}
    .hdr-name{font-size:14pt;font-weight:900;letter-spacing:.02em}
    .hdr-sub{font-size:8pt;opacity:.85;margin-top:2px}
    .hdr-title{font-size:11pt;font-weight:700;margin-top:8px;text-transform:uppercase;letter-spacing:.05em}
    .hdr-term{font-size:9pt;opacity:.9;margin-top:3px}
    .meta{display:flex;justify-content:space-between;padding:6px 0 10px;font-size:7.5pt;color:#666;border-bottom:1px solid #ddd;margin-bottom:12px}
    .summary{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:14px}
    .scard{border:1px solid #ddd;border-radius:6px;padding:8px;text-align:center}
    .scard .val{font-size:16pt;font-weight:900;color:#7A1A2E}
    .scard .lbl{font-size:6.5pt;color:#777;text-transform:uppercase;letter-spacing:.04em;margin-top:2px}
    .college-block{margin-bottom:18px}
    .col-hdr{background:#7A1A2E;color:#fff;padding:7px 10px;font-size:10pt;font-weight:700;border-radius:4px 4px 0 0;margin-top:2px}
    .col-stat{font-size:7.5pt;font-weight:400;opacity:.8;float:right;margin-top:2px}
    .prog-hdr{background:#1E5940;color:#fff;padding:5px 10px;font-size:8.5pt;font-weight:600}
    .prog-stat{font-size:7pt;font-weight:400;opacity:.8;float:right;margin-top:1px}
    table{width:100%;border-collapse:collapse;font-size:8pt;margin-bottom:0}
    th{background:#222;color:#fff;padding:5px 6px;font-size:7pt;text-transform:uppercase;letter-spacing:.03em;text-align:left}
    td{padding:4px 6px;border-bottom:1px solid #eee;vertical-align:middle}
    tr.alt td{background:#f8f8f8}
    .ctr{text-align:center}
    .mono{font-family:Courier,monospace;font-size:7.5pt}
    .bold{font-weight:700}
    .badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:7pt;font-weight:700}
    .footer{margin-top:18px;border-top:1px solid #ddd;padding-top:8px;font-size:7pt;color:#999;text-align:center}
    .print-btn{position:fixed;bottom:20px;right:20px;background:#7A1A2E;color:#fff;border:none;padding:10px 22px;border-radius:6px;font-size:12px;cursor:pointer;font-weight:600}
  </style>
</head>
<body>
  <div class="hdr">
    <div class="hdr-name">${inst}</div>
    <div class="hdr-sub">Office of the College Secretary &nbsp;·&nbsp; ${portal}</div>
    <div class="hdr-title">Scholastic Standing Report</div>
    <div class="hdr-term">${selectedTerm?.name ?? ''} &nbsp;·&nbsp; AY ${selectedTerm?.academicYear ?? ''} &nbsp;·&nbsp; ${selectedTerm?.semester ?? ''} Semester</div>
  </div>

  <div class="meta">
    <span>Generated: ${dateStr} at ${timeStr}</span>
    <span>${totalStudents} students &nbsp;·&nbsp; ${univScholars} University Scholars &nbsp;·&nbsp; ${collegeSchol} College Scholars &nbsp;·&nbsp; ${latinHonors} Latin Honors &nbsp;·&nbsp; ${grouped.length} colleges</span>
  </div>

  <div class="summary">
    <div class="scard"><div class="val">${totalStudents}</div><div class="lbl">Total Students</div></div>
    <div class="scard"><div class="val" style="color:#92400e">${univScholars}</div><div class="lbl">University Scholar</div></div>
    <div class="scard"><div class="val" style="color:#1d4ed8">${collegeSchol}</div><div class="lbl">College Scholar</div></div>
    <div class="scard"><div class="val" style="color:#78350f">${latinHonors}</div><div class="lbl">Latin Honors</div></div>
    <div class="scard"><div class="val" style="color:#555">${grouped.length}</div><div class="lbl">Colleges</div></div>
  </div>

  ${body}

  <div class="footer">This is a computer-generated report from the ${inst} Academic Information System. Generated by OCS Portal on ${dateStr} at ${timeStr}.</div>

  <button class="print-btn no-print" onclick="window.print()">Print / Save as PDF</button>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (!win) { toast.error('Popup blocked — please allow popups and try again.'); return; }
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 600);
  };

  if (!me) return null;

  return (
    <PortalLayout title="GWA Report">
      <div className="space-y-5">

        {/* Controls row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <TermSelect terms={state.terms} value={selectedTermId} onValueChange={setSelectedTermId} />
          <Button
            onClick={generatePdf}
            disabled={grouped.length === 0}
            className="gap-2 flex-shrink-0 text-white"
            style={{ background: 'var(--gradient-header)' }}
          >
            <Download className="w-4 h-4" /> Download A4 PDF Report
          </Button>
        </div>

        {isMidTerm && (
          <StatusBanner
            type="warning"
            title="Mid-Term: No Honorific Scholarships"
            description="Honorific scholarships are not awarded during Mid-Term semesters. GWA data is still shown below."
          />
        )}

        {/* Summary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="dash-stat portal-panel">
            <div className="dash-stat-icon" style={{ background: 'var(--gradient-header)' }}>
              <Users className="w-5 h-5" />
            </div>
            <p className="dash-stat-value">{totalStudents}</p>
            <p className="dash-stat-label">Students with Grades</p>
          </div>
          <div className="dash-stat portal-panel">
            <div className="dash-stat-icon" style={{ background: 'linear-gradient(135deg, hsl(38 95% 50%), hsl(25 95% 50%))' }}>
              <Star className="w-5 h-5" />
            </div>
            <p className="dash-stat-value">{univScholars}</p>
            <p className="dash-stat-label">University Scholars</p>
          </div>
          <div className="dash-stat portal-panel">
            <div className="dash-stat-icon" style={{ background: 'linear-gradient(135deg, hsl(217 91% 50%), hsl(217 91% 40%))' }}>
              <Award className="w-5 h-5" />
            </div>
            <p className="dash-stat-value">{collegeSchol}</p>
            <p className="dash-stat-label">College Scholars</p>
          </div>
          <div className="dash-stat portal-panel">
            <div className="dash-stat-icon" style={{ background: 'linear-gradient(135deg, hsl(38 70% 45%), hsl(38 70% 35%))' }}>
              <GraduationCap className="w-5 h-5" />
            </div>
            <p className="dash-stat-value">{latinHonors}</p>
            <p className="dash-stat-label">Latin Honors</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name, student number, program, or college…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Grouped content */}
        {grouped.length === 0 ? (
          <div className="portal-panel">
            <div className="py-16 text-center text-muted-foreground">
              <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-25" />
              <p className="font-semibold text-sm">No grade data for this term</p>
              <p className="text-xs mt-1 opacity-70">Grades must be submitted by faculty before the GWA report populates automatically.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map(college => {
              const collapsed = collapsedColleges.has(college.collegeName);
              return (
                <div key={college.collegeName} className="portal-panel">
                  {/* College header */}
                  <button
                    className="portal-panel-header w-full text-left flex items-center gap-2"
                    onClick={() => toggleCollege(college.collegeName)}
                  >
                    <Building2 className="w-4 h-4 text-white/70 flex-shrink-0" />
                    <span className="font-bold text-white flex-1">{college.collegeName}</span>
                    <Badge className="bg-white/15 border-0 text-white text-xs">{college.totalStudents} students</Badge>
                    {college.scholarsCount > 0 && (
                      <Badge className="bg-amber-400/30 border-0 text-amber-100 text-xs">
                        {college.scholarsCount} with standing
                      </Badge>
                    )}
                    {collapsed
                      ? <ChevronRight className="w-4 h-4 text-white/60 flex-shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-white/60 flex-shrink-0" />}
                  </button>

                  {!collapsed && (
                    <div className="divide-y divide-border">
                      {college.programs.map(prog => {
                        const key = `${college.collegeName}::${prog.programName}`;
                        const pCollapsed = collapsedPrograms.has(key);
                        const progSchol = prog.students.filter(r => r.standing !== null).length;
                        return (
                          <div key={prog.programName}>
                            {/* Program header */}
                            <button
                              className="w-full text-left px-4 py-2.5 flex items-center gap-2 bg-secondary/10 hover:bg-secondary/20 transition-colors"
                              onClick={() => toggleProgram(key)}
                            >
                              <BookOpen className="w-3.5 h-3.5 text-secondary flex-shrink-0" />
                              <span className="font-semibold text-sm text-foreground flex-1">{prog.programName}</span>
                              <span className="text-xs text-muted-foreground">{prog.students.length} students</span>
                              {progSchol > 0 && (
                                <Badge className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-800 border-amber-300">
                                  {progSchol} with standing
                                </Badge>
                              )}
                              {pCollapsed
                                ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                            </button>

                            {!pCollapsed && (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="bg-muted/50 border-b border-border">
                                      <th className="px-3 py-2 text-xs font-semibold text-muted-foreground w-10 text-center">#</th>
                                      <th className="px-3 py-2 text-xs font-semibold text-muted-foreground text-left">Name</th>
                                      <th className="px-3 py-2 text-xs font-semibold text-muted-foreground w-28 text-left">Student No.</th>
                                      <th className="px-3 py-2 text-xs font-semibold text-muted-foreground w-12 text-center">Yr</th>
                                      <th className="px-3 py-2 text-xs font-semibold text-muted-foreground w-16 text-center">Units</th>
                                      <th className="px-3 py-2 text-xs font-semibold text-muted-foreground w-24 text-center">Term GWA</th>
                                      <th className="px-3 py-2 text-xs font-semibold text-muted-foreground w-24 text-center">Cum GWA</th>
                                      <th className="px-3 py-2 text-xs font-semibold text-muted-foreground w-44 text-left">Standing</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {prog.students.map((row, idx) => (
                                      <tr
                                        key={row.student.id}
                                        className={`border-b border-border/50 transition-colors hover:bg-muted/40 ${idx % 2 === 1 ? 'bg-muted/20' : ''}`}
                                      >
                                        <td className="px-3 py-2 text-center text-xs text-muted-foreground font-mono">{idx + 1}</td>
                                        <td className="px-3 py-2">
                                          <p className="font-semibold text-sm leading-tight">{row.student.name}</p>
                                        </td>
                                        <td className="px-3 py-2 text-xs text-muted-foreground font-mono">{row.student.studentNumber ?? '—'}</td>
                                        <td className="px-3 py-2 text-center text-xs">{row.student.yearLevel ?? '—'}</td>
                                        <td className="px-3 py-2 text-center text-xs font-semibold">{row.unitsTaken}</td>
                                        <td className="px-3 py-2 text-center">
                                          <span className={`font-bold text-sm ${row.termGwa <= 1.75 ? 'text-secondary' : row.termGwa <= 2.5 ? 'text-foreground' : 'text-muted-foreground'}`}>
                                            {row.termGwa.toFixed(2)}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                          <span className="font-semibold text-xs">{row.cumGwa.toFixed(2)}</span>
                                        </td>
                                        <td className="px-3 py-2">
                                          <StandingBadge s={row.standing} />
                                        </td>
                                      </tr>
                                    ))}
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
              );
            })}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
