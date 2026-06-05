import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useApp } from '@/contexts/AppContext';
import { type Schedule, type Day, type Section } from '@/lib/types';
import { Plus, Minus, FileText, Send, AlertTriangle, X, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { isIncEnrollmentRestricted, getScholasticStanding, getPassedUnits, getYearClassification } from '@/lib/academic';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  termId: string;
  studentId: string;
}

// ── schedule helpers ──────────────────────────────────────────────────────────
function toMin(t: string) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }

function schedOverlap(
  a: { days: Day[]; startTime: string; endTime: string },
  b: { days: Day[]; startTime: string; endTime: string },
) {
  return a.days.some(d => b.days.includes(d)) && toMin(a.startTime) < toMin(b.endTime) && toMin(a.endTime) > toMin(b.startTime);
}

function secOverlaps(
  sec: Section,
  others: Section[],
): boolean {
  for (const o of others) {
    if (!o.schedule?.days?.length || !sec.schedule?.days?.length) continue;
    if (schedOverlap(sec.schedule, o.schedule)) return true;
    if (sec.labSchedule?.days?.length && schedOverlap(sec.labSchedule, o.schedule)) return true;
    if (o.labSchedule?.days?.length && schedOverlap(sec.schedule, o.labSchedule)) return true;
  }
  return false;
}

const fmtSched = (s?: Schedule) => {
  if (!s || !s.days?.length) return 'TBA';
  return `${s.days.join('')} ${s.startTime}–${s.endTime}`;
};

// ── Timetable ────────────────────────────────────────────────────────────────
const DAYS: Day[] = ['M', 'T', 'W', 'Th', 'F', 'S'];
const START_HOUR = 7;
const END_HOUR = 21;
const TOTAL_MINS = (END_HOUR - START_HOUR) * 60;

type TimetableEntry = {
  label: string;
  color: 'blue' | 'red' | 'emerald' | 'orange';
  schedule: { days: Day[]; startTime: string; endTime: string };
  conflict?: boolean;
};

function MiniTimetable({ entries }: { entries: TimetableEntry[] }) {
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
  const colorMap = {
    blue: 'bg-blue-500 text-white border-blue-600',
    red: 'bg-red-400 text-white border-red-600 line-through opacity-60',
    emerald: 'bg-emerald-500 text-white border-emerald-600',
    orange: 'bg-orange-500 text-white border-orange-600',
  };
  return (
    <div className="rounded-lg border overflow-hidden bg-white select-none">
      {/* Day headers */}
      <div className="grid border-b" style={{ gridTemplateColumns: '32px repeat(6, 1fr)' }}>
        <div className="h-6 border-r bg-muted/50" />
        {DAYS.map(d => (
          <div key={d} className="h-6 text-center text-[10px] font-semibold border-r last:border-r-0 flex items-center justify-center bg-muted/50 text-muted-foreground">
            {d}
          </div>
        ))}
      </div>
      {/* Grid */}
      <div className="relative" style={{ gridTemplateColumns: '32px repeat(6, 1fr)', height: `${TOTAL_MINS * 0.55}px` }}>
        {/* Time labels + horizontal lines */}
        <div className="absolute inset-0">
          {hours.map(h => {
            const top = ((h - START_HOUR) * 60 / TOTAL_MINS) * 100;
            return (
              <div key={h} className="absolute w-full flex items-start" style={{ top: `${top}%` }}>
                <div className="w-8 text-[8px] text-muted-foreground text-right pr-1 leading-none">
                  {h > 12 ? `${h - 12}p` : h === 12 ? '12p' : `${h}a`}
                </div>
                <div className="flex-1 border-t border-gray-100" />
              </div>
            );
          })}
        </div>
        {/* Day columns */}
        <div className="absolute inset-0 grid" style={{ gridTemplateColumns: '32px repeat(6, 1fr)' }}>
          <div className="border-r border-transparent" />
          {DAYS.map((day, di) => (
            <div key={day} className={`relative h-full ${di < 5 ? 'border-r border-gray-100' : ''}`}>
              {entries.map((entry, ei) => {
                if (!entry.schedule.days.includes(day)) return null;
                const top = (toMin(entry.schedule.startTime) - START_HOUR * 60) / TOTAL_MINS * 100;
                const height = (toMin(entry.schedule.endTime) - toMin(entry.schedule.startTime)) / TOTAL_MINS * 100;
                if (top < 0 || top > 100) return null;
                return (
                  <div
                    key={`${ei}-${day}`}
                    className={`absolute left-0.5 right-0.5 rounded text-[8px] font-medium px-0.5 py-px overflow-hidden border ${colorMap[entry.color]} ${entry.conflict ? 'ring-2 ring-red-600' : ''}`}
                    style={{ top: `${top}%`, height: `${Math.max(height, 3)}%` }}
                    title={entry.label}
                  >
                    {entry.label}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function StudentChangeDropModal({ open, onOpenChange, termId, studentId }: Props) {
  const { state, submitChangeDropRequest, checkPrerequisites, checkCorequisites, getCurrentUnits } = useApp();

  const [addSections, setAddSections] = useState<string[]>([]);
  const [dropSections, setDropSections] = useState<string[]>([]);
  const [courseSearch, setCourseSearch] = useState('');
  const [statement, setStatement] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'add' | 'drop' | 'review'>('add');

  const activeTerm = state.terms.find(t => t.id === termId);
  const student = state.users.find(u => u.id === studentId);
  const maxUnits = activeTerm?.studentMaxUnitsOverrides?.[studentId] ?? activeTerm?.maxUnits ?? 21;

  // Enrolled sections (not dropped) — base for the term
  const enrolledSections = useMemo(() =>
    state.enrollments
      .filter(e => e.studentId === studentId && e.termId === termId && e.status === 'enrolled')
      .map(e => state.sections.find(s => s.id === e.sectionId))
      .filter(Boolean) as Section[],
    [state.enrollments, state.sections, studentId, termId]
  );

  // Enrolled rows for the Drop tab
  const enrolledRows = useMemo(() =>
    state.enrollments
      .filter(e => e.studentId === studentId && e.termId === termId && e.status === 'enrolled')
      .map(e => {
        const sec = state.sections.find(s => s.id === e.sectionId);
        const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
        return { enrollment: e, sec, course };
      })
      .filter(r => r.sec && r.course),
    [state.enrollments, state.sections, state.courses, studentId, termId]
  );

  // ── Scholastic standing check ─────────────────────────────────────────────
  const isPD = useMemo(() => {
    if (student?.status === 'permanently_disqualified') return true;
    return state.terms.some(t =>
      getScholasticStanding(studentId, t.id, state.grades, state.sections, state.courses)?.standing === 'Permanent Disqualification'
    );
  }, [student, state.terms, state.grades, state.sections, state.courses, studentId]);

  // ── Year classification ───────────────────────────────────────────────────
  const { yearClass } = useMemo(() => {
    const prog = state.degreePrograms.find(p => p.name === (student as { program?: string })?.program);
    const totalProgramUnits = prog?.totalUnits ?? 0;
    const pu = getPassedUnits(studentId, state.grades, state.sections, state.courses, state.enrollments);
    return { yearClass: totalProgramUnits > 0 ? getYearClassification(pu, totalProgramUnits) : null };
  }, [studentId, state.grades, state.sections, state.courses, state.enrollments, state.degreePrograms, student]);

  // ── Unit calculations ─────────────────────────────────────────────────────
  const baseUnits = getCurrentUnits(studentId, termId);
  const droppingUnits = useMemo(() => dropSections.reduce((sum, sid) => {
    const sec = state.sections.find(s => s.id === sid);
    const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
    if (!course || course.isPE || course.isNSTP) return sum;
    return sum + (course.units ?? 0) + (course.labUnits ?? 0);
  }, 0), [dropSections, state.sections, state.courses]);

  const addingUnits = useMemo(() => addSections.reduce((sum, sid) => {
    const sec = state.sections.find(s => s.id === sid);
    const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
    if (!course || course.isPE || course.isNSTP) return sum;
    return sum + (course.units ?? 0) + (course.labUnits ?? 0);
  }, 0), [addSections, state.sections, state.courses]);

  const projectedUnits = baseUnits - droppingUnits + addingUnits;
  const overload = projectedUnits > maxUnits;

  // ── Sections effective after applying drops + adds (for conflict checks) ──
  const effectiveSections = useMemo(() => {
    // enrolled, minus those being dropped, plus those being added
    const base = enrolledSections.filter(s => !dropSections.includes(s.id));
    const added = addSections.map(id => state.sections.find(s => s.id === id)).filter(Boolean) as Section[];
    return [...base, ...added];
  }, [enrolledSections, dropSections, addSections, state.sections]);

  // ── Restriction check per section ────────────────────────────────────────
  const getRestrictions = useMemo(() => {
    const yearRank: Record<string, number> = { Freshman: 0, Sophomore: 1, Junior: 2, Senior: 3 };

    return (sec: Section): {
      scheduleConflict: boolean;
      conflictsWith: string[]; // course codes it conflicts with
      prereqFail: boolean;
      prereqMissing: string[];
      coreqFail: boolean;
      coreqMissing: string[];
      unitExceeds: boolean;
      incRestricted: boolean;
      yearStandingFail: boolean;
      yearStandingMsg: string;
      alreadyPassed: boolean;
      blocked: boolean;
      hasWarning: boolean;
    } => {
      const course = state.courses.find(c => c.id === sec.courseId);

      // — schedule: check vs enrolled-not-dropping + already-selected-to-add (other than this one)
      const others = [
        ...enrolledSections.filter(s => s.id !== sec.id && !dropSections.includes(s.id)),
        ...addSections.filter(id => id !== sec.id).map(id => state.sections.find(s => s.id === id)).filter(Boolean) as Section[],
      ];
      const scheduleConflict = secOverlaps(sec, others);
      const conflictsWith: string[] = [];
      if (scheduleConflict) {
        for (const o of others) {
          const oc = state.courses.find(c => c.id === o.courseId);
          const isConflict = (o.schedule?.days?.length && sec.schedule?.days?.length && schedOverlap(sec.schedule, o.schedule)) ||
            (sec.labSchedule?.days?.length && o.schedule?.days?.length && schedOverlap(sec.labSchedule, o.schedule)) ||
            (o.labSchedule?.days?.length && sec.schedule?.days?.length && schedOverlap(sec.schedule, o.labSchedule));
          if (isConflict && oc) conflictsWith.push(oc.code);
        }
      }

      // — prereq / coreq
      const pCheck = course ? checkPrerequisites(studentId, course.id) : { passed: true, missing: [] };
      const cCheck = course ? checkCorequisites(studentId, course.id, termId, addSections) : { passed: true, missing: [] };

      // — unit limit (excluding PE/NSTP)
      const adding = course && !course.isPE && !course.isNSTP ? (course.units ?? 0) + (course.labUnits ?? 0) : 0;
      const unitExceeds = !course?.isPE && !course?.isNSTP && (projectedUnits + adding > maxUnits) && !addSections.includes(sec.id);

      // — INC restriction
      const incRestricted = !!course && isIncEnrollmentRestricted(studentId, course.id, state.grades, state.sections, state.terms);

      // — year standing
      let yearStandingFail = false, yearStandingMsg = '';
      if (course?.minYearStanding && !course.isPE && !course.isNSTP && yearClass) {
        if ((yearRank[yearClass] ?? 0) < (yearRank[course.minYearStanding] ?? 0)) {
          yearStandingFail = true;
          yearStandingMsg = `Requires ${course.minYearStanding} standing (you are ${yearClass})`;
        }
      }

      // — already passed
      const alreadyPassed = !!course && state.grades.some(g => {
        if (g.studentId !== studentId || !g.submitted) return false;
        const gs = state.sections.find(s => s.id === g.sectionId);
        if (!gs || gs.courseId !== course.id) return false;
        const eff = (g.removalSubmitted && g.removalGrade) ? g.removalGrade : g.grade;
        return !!(eff && !['4', '5', 'INC', 'DRP', 'F'].includes(String(eff)));
      });

      const blocked = scheduleConflict || incRestricted || alreadyPassed
        || (!pCheck.passed)         // missing prerequisites — hard block
        || (!cCheck.passed)         // missing corequisites (not satisfied by addSections) — hard block
        || yearStandingFail         // insufficient year standing — hard block
        || (unitExceeds && !addSections.includes(sec.id));
      const hasWarning = blocked; // anything blocked is also a warning

      return {
        scheduleConflict, conflictsWith,
        prereqFail: !pCheck.passed, prereqMissing: pCheck.missing,
        coreqFail: !cCheck.passed, coreqMissing: cCheck.missing,
        unitExceeds, incRestricted, yearStandingFail, yearStandingMsg,
        alreadyPassed, blocked, hasWarning,
      };
    };
  }, [enrolledSections, dropSections, addSections, state, studentId, termId, projectedUnits, maxUnits, yearClass, checkPrerequisites, checkCorequisites]);

  // ── Search results ────────────────────────────────────────────────────────
  const searchResults = useMemo(() => {
    const q = courseSearch.trim().toLowerCase();
    if (!q) return [];
    return state.sections
      .filter(sec => {
        if (sec.termId !== termId) return false;
        const course = state.courses.find(c => c.id === sec.courseId);
        if (!course) return false;
        // Specialized courses cannot be added via Change & Drop
        if (course.category === 'Specialized') return false;
        if (
          !course.code.toLowerCase().includes(q) &&
          !course.title.toLowerCase().includes(q) &&
          !sec.sectionCode.toLowerCase().includes(q)
        ) return false;
        // Skip if already enrolled (unless being dropped)
        const enrolledInCourse = state.enrollments.some(
          e => e.studentId === studentId && e.termId === termId && e.status !== 'dropped' &&
          state.sections.find(s => s.id === e.sectionId)?.courseId === course.id
        );
        const isDropping = dropSections.some(
          sid => state.sections.find(s => s.id === sid)?.courseId === course.id
        );
        if (enrolledInCourse && !isDropping) return false;
        // Skip if already selected (different section of same course)
        const alreadySelectedCourse = addSections.some(
          sid => sid !== sec.id && state.sections.find(s => s.id === sid)?.courseId === course.id
        );
        return !alreadySelectedCourse;
      })
      .slice(0, 25);
  }, [courseSearch, state, termId, studentId, addSections, dropSections]);

  // ── Timetable entries ─────────────────────────────────────────────────────
  const timetableEntries = useMemo((): TimetableEntry[] => {
    const entries: TimetableEntry[] = [];
    // Enrolled (not dropping) — blue
    for (const enr of enrolledSections) {
      if (dropSections.includes(enr.id)) continue;
      const course = state.courses.find(c => c.id === enr.courseId);
      if (enr.schedule?.days?.length) {
        const addedConflict = addSections.some(aid => {
          const as = state.sections.find(s => s.id === aid);
          return as && (schedOverlap(enr.schedule!, as.schedule!) ||
            (as.labSchedule?.days?.length && schedOverlap(enr.schedule!, as.labSchedule)));
        });
        entries.push({ label: course?.code ?? enr.sectionCode, color: 'blue', schedule: enr.schedule, conflict: addedConflict });
      }
    }
    // Dropping — red (strikethrough)
    for (const sid of dropSections) {
      const sec = state.sections.find(s => s.id === sid);
      const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
      if (sec?.schedule?.days?.length) {
        entries.push({ label: course?.code ?? sec.sectionCode, color: 'red', schedule: sec.schedule });
      }
    }
    // Adding — emerald (or orange if conflict)
    for (const sid of addSections) {
      const sec = state.sections.find(s => s.id === sid);
      const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
      if (sec?.schedule?.days?.length) {
        const r = getRestrictions(sec);
        entries.push({ label: course?.code ?? sec.sectionCode, color: r.scheduleConflict ? 'orange' : 'emerald', schedule: sec.schedule, conflict: r.scheduleConflict });
      }
    }
    return entries;
  }, [enrolledSections, dropSections, addSections, state, getRestrictions]);

  const toggleAdd = (sectionId: string) => {
    const sec = state.sections.find(s => s.id === sectionId);
    if (!sec) return;
    if (addSections.includes(sectionId)) {
      setAddSections(prev => prev.filter(id => id !== sectionId));
      return;
    }
    const r = getRestrictions(sec);
    if (r.scheduleConflict) {
      toast.error('Schedule conflict', { description: `This section overlaps with ${r.conflictsWith.join(', ')}.` });
      return;
    }
    if (r.alreadyPassed) {
      toast.error('Already passed', { description: 'You have already passed this course.' });
      return;
    }
    if (r.incRestricted) {
      toast.error('INC restriction', { description: 'You have an active INC in this course. Complete the removal exam first.' });
      return;
    }
    if (r.prereqFail) {
      toast.error('Prerequisites not met', { description: `You must first complete: ${r.prereqMissing.join(', ')}.` });
      return;
    }
    if (r.coreqFail) {
      toast.error('Corequisites not satisfied', { description: `You must also add: ${r.coreqMissing.join(', ')}.` });
      return;
    }
    if (r.yearStandingFail) {
      toast.error('Year standing requirement not met', { description: r.yearStandingMsg });
      return;
    }
    if (r.unitExceeds) {
      toast.error('Unit limit exceeded', { description: `Adding this course would exceed the ${maxUnits}-unit limit.` });
      return;
    }
    setAddSections(prev => [...prev, sectionId]);
  };

  const toggleDrop = (sectionId: string) =>
    setDropSections(prev =>
      prev.includes(sectionId) ? prev.filter(id => id !== sectionId) : [...prev, sectionId]
    );

  const reset = () => {
    setAddSections([]);
    setDropSections([]);
    setCourseSearch('');
    setStatement('');
    setConfirmed(false);
    setActiveTab('add');
  };

  // PDF generation
  const generatePDF = () => {
    const ps = state.portalSettings;
    const instName = ps?.institutionName || ps?.portalName || 'University';
    const logoUrl = ps?.logoUrl ?? '';
    const dateStr = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });

    const addRows = addSections.map(sid => {
      const sec = state.sections.find(s => s.id === sid);
      const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
      return { sec, course };
    }).filter(r => r.sec && r.course);

    const dropRows = dropSections.map(sid => {
      const sec = state.sections.find(s => s.id === sid);
      const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
      return { sec, course };
    }).filter(r => r.sec && r.course);

    const rs = 'border:1px solid #000;padding:4px 8px;font-size:10px';
    const th = 'border:1px solid #000;padding:4px 8px;font-size:10px;background:#e5e7eb;text-align:left';
    const tHead = `<tr><th style="${th}">Code</th><th style="${th}">Title</th><th style="${th};width:40px;text-align:center">Units</th><th style="${th};width:65px;text-align:center">Section</th><th style="${th}">Schedule</th></tr>`;
    const mkRows = (rows: typeof addRows) => rows.map((r, i) =>
      `<tr style="${i % 2 ? 'background:#f9fafb' : ''}"><td style="${rs}">${r.course!.code}</td><td style="${rs}">${r.course!.title}</td><td style="${rs};text-align:center">${r.course!.units}</td><td style="${rs};text-align:center">${r.sec!.sectionCode}</td><td style="${rs};font-size:9.5px">${fmtSched(r.sec!.schedule)}</td></tr>`
    ).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Change/Drop Request</title>
<style>@page{size:A4 portrait;margin:16mm 18mm}body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0;font-size:11px}.d{border-top:1.5px solid #333;margin:10px 0 5px}.sl{font-size:10.5px;font-weight:bold;text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head>
<body>
<div style="display:flex;align-items:center;gap:10px;justify-content:center;margin-bottom:6px">
  ${logoUrl ? `<img src="${logoUrl}" style="width:50px;height:50px;border-radius:50%;object-fit:cover;border:1px solid #ccc"/>` : ''}
  <div style="text-align:center"><div style="font-size:13px;font-weight:bold;text-transform:uppercase">${instName}</div><div style="font-size:10px;margin-top:2px">Office of the College Secretary</div></div>
</div>
<div style="text-align:center;margin:6px 0 12px">
  <div style="font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:.05em">Request to Change / Drop Subjects</div>
  <div style="font-size:9.5px;color:#555;margin-top:3px">${activeTerm?.name ?? ''} &bull; Date Filed: ${dateStr}</div>
</div>
<table style="border-collapse:collapse;width:100%;margin-bottom:10px">
  <tr><td style="font-size:10px;width:22%;padding:2px 0"><b>Student Name:</b></td><td style="font-size:10px;padding:2px 0">${student?.name ?? ''}</td><td style="font-size:10px;width:18%;padding:2px 0"><b>Student No.:</b></td><td style="font-size:10px;padding:2px 0">${(student as { studentNumber?: string })?.studentNumber ?? ''}</td></tr>
  <tr><td style="font-size:10px;padding:2px 0"><b>Program:</b></td><td style="font-size:10px;padding:2px 0" colspan="3">${(student as { program?: string })?.program ?? ''}</td></tr>
  <tr><td style="font-size:10px;padding:2px 0"><b>Academic Term:</b></td><td style="font-size:10px;padding:2px 0" colspan="3">${activeTerm?.name ?? ''}</td></tr>
</table>
${addRows.length > 0 ? `<div class="d"></div><div class="sl">Courses to Add (Change)</div><table style="border-collapse:collapse;width:100%;margin-bottom:10px">${tHead}${mkRows(addRows)}</table>` : ''}
${dropRows.length > 0 ? `<div class="d"></div><div class="sl">Courses to Drop</div><table style="border-collapse:collapse;width:100%;margin-bottom:10px">${tHead}${mkRows(dropRows)}</table>` : ''}
<div class="d"></div><div class="sl">Statement / Reason</div>
<div style="font-size:10px;border:1px solid #ccc;padding:8px;min-height:48px;margin-bottom:12px">${(statement || '').replace(/\n/g, '<br/>')}</div>
<div style="font-size:9px;border:1px solid #aaa;padding:7px;background:#f3f4f6;margin-bottom:14px"><b>DECLARATION:</b> I hereby certify that the information above is true and correct. I understand that this request is subject to OCS review and approval.</div>
<div style="display:flex;justify-content:space-between;margin-top:36px">
  <div style="border-top:1px solid #000;width:210px;padding-top:3px;font-size:9px">Student Signature over Printed Name / Date</div>
  <div style="border-top:1px solid #000;width:180px;padding-top:3px;font-size:9px">OCS Staff Signature / Date Processed</div>
  <div style="border-top:1px solid #000;width:130px;padding-top:3px;font-size:9px">Status: &nbsp;[&nbsp;] Approved &nbsp; [&nbsp;] Denied</div>
</div>
</body></html>`;

    const win = window.open('', '_blank', 'width=820,height=960');
    if (win) { win.document.write(html); win.document.close(); win.onload = () => win.print(); }
  };

  const handleSubmit = async () => {
    if (!statement.trim()) { toast.error('Please write a statement/reason.'); return; }
    if (!confirmed) { toast.error('Please confirm the declaration.'); return; }
    if (addSections.length === 0 && dropSections.length === 0) {
      toast.error('Please select at least one course to add or drop.');
      return;
    }
    // Final guard: validate ALL selected courses to add
    for (const sid of addSections) {
      const sec = state.sections.find(s => s.id === sid);
      if (!sec) continue;
      const r = getRestrictions(sec);
      const course = state.courses.find(c => c.id === sec.courseId);
      const code = course?.code ?? sec.sectionCode;
      if (r.scheduleConflict) {
        toast.error(`${code}: Schedule conflict`, { description: `Conflicts with ${r.conflictsWith.join(', ')}.` }); return;
      }
      if (r.prereqFail) {
        toast.error(`${code}: Prerequisites not met`, { description: `Missing: ${r.prereqMissing.join(', ')}.` }); return;
      }
      if (r.coreqFail) {
        toast.error(`${code}: Corequisites not satisfied`, { description: `Must also add: ${r.coreqMissing.join(', ')}.` }); return;
      }
      if (r.yearStandingFail) {
        toast.error(`${code}: Year standing requirement not met`, { description: r.yearStandingMsg }); return;
      }
      if (r.incRestricted) {
        toast.error(`${code}: INC restriction`, { description: 'Complete removal exam first.' }); return;
      }
      if (r.alreadyPassed) {
        toast.error(`${code}: Already passed`, { description: 'You have already passed this course.' }); return;
      }
      if (r.unitExceeds) {
        toast.error(`${code}: Unit limit exceeded`, { description: `Would exceed the ${maxUnits}-unit maximum.` }); return;
      }
    }
    setSubmitting(true);
    try {
      await submitChangeDropRequest(studentId, termId, statement.trim(), addSections, dropSections);
      toast.success('Request submitted!', { description: 'OCS will review your Change/Drop request.' });
      reset();
      onOpenChange(false);
      setTimeout(() => generatePDF(), 400);
    } catch {
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const addRowsForReview = addSections.map(sid => {
    const sec = state.sections.find(s => s.id === sid);
    const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
    return { sid, sec, course };
  }).filter(r => r.sec && r.course);

  const dropRowsForReview = dropSections.map(sid => {
    const sec = state.sections.find(s => s.id === sid);
    const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
    return { sid, sec, course };
  }).filter(r => r.sec && r.course);

  // Detect any conflicts in currently selected-to-add
  // Track any selected-to-add section that has a hard block (schedule conflict, prereq, coreq, standing, etc.)
  const addConflicts = useMemo(() => addSections.filter(sid => {
    const sec = state.sections.find(s => s.id === sid);
    return sec && getRestrictions(sec).blocked;
  }), [addSections, state.sections, getRestrictions]);

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b">
          <DialogTitle className="text-base">Request to Change / Drop Subjects</DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">{activeTerm?.name} — Select courses to add or drop, write your statement, then submit.</p>
        </DialogHeader>

        {/* Unit progress bar */}
        <div className="px-6 py-2 border-b bg-muted/30 flex items-center gap-4 text-xs flex-wrap">
          <span className="text-muted-foreground">Units: <span className="font-semibold text-foreground">{baseUnits}</span></span>
          {droppingUnits > 0 && <span className="text-red-600 font-medium">− {droppingUnits} dropping</span>}
          {addingUnits > 0 && <span className="text-emerald-600 font-medium">+ {addingUnits} adding</span>}
          <span className={`font-bold ${overload ? 'text-red-600' : 'text-foreground'}`}>
            Projected: {projectedUnits} / {maxUnits}
          </span>
          {overload && <Badge className="text-[10px] bg-red-100 text-red-800 border-red-300">Over limit</Badge>}
          {addConflicts.length > 0 && <Badge className="text-[10px] bg-orange-100 text-orange-800 border-orange-300">Issues detected!</Badge>}
          {isPD && <Badge className="text-[10px] bg-red-100 text-red-800 border-red-300">PD — enrollment restricted</Badge>}
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          <Tabs value={activeTab} onValueChange={v => setActiveTab(v as typeof activeTab)}>
            <TabsList className="w-full justify-start gap-1">
              <TabsTrigger value="add" className="gap-1.5 text-xs">
                <Plus className="w-3.5 h-3.5" />
                Change / Add
                {addSections.length > 0 && (
                  <span className={`ml-1 h-4 px-1.5 text-[10px] rounded-full flex items-center ${addConflicts.length > 0 ? 'bg-orange-500 text-white' : 'bg-primary text-primary-foreground'}`}>{addSections.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="drop" className="gap-1.5 text-xs">
                <Minus className="w-3.5 h-3.5" />
                Drop
                {dropSections.length > 0 && (
                  <span className="ml-1 h-4 px-1.5 text-[10px] bg-destructive text-destructive-foreground rounded-full flex items-center">{dropSections.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="review" className="gap-1.5 text-xs">
                <FileText className="w-3.5 h-3.5" />
                Statement &amp; Submit
              </TabsTrigger>
            </TabsList>

            {/* ── CHANGE / ADD TAB ── */}
            <TabsContent value="add" className="mt-4 space-y-3">
              {/* Timetable */}
              {timetableEntries.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    Schedule Preview
                    <div className="flex items-center gap-2 ml-2 font-normal">
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" /> Enrolled</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Adding</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" /> Dropping</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-orange-500 inline-block" /> Conflict</span>
                    </div>
                  </div>
                  <MiniTimetable entries={timetableEntries} />
                </div>
              )}

              {/* Selected to add */}
              {addSections.length > 0 && (
                <div className={`rounded-lg border p-3 ${addConflicts.length > 0 ? 'border-orange-300 bg-orange-50' : 'border-emerald-200 bg-emerald-50'}`}>
                  <p className={`text-[11px] font-semibold mb-2 ${addConflicts.length > 0 ? 'text-orange-800' : 'text-emerald-800'}`}>
                    Selected to Add ({addSections.length}){addConflicts.length > 0 && ' — issues detected'}
                  </p>
                  <div className="space-y-1.5">
                    {addSections.map(sid => {
                      const sec = state.sections.find(s => s.id === sid);
                      const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
                      if (!sec || !course) return null;
                      const r = getRestrictions(sec);
                      return (
                        <div key={sid} className={`flex items-center justify-between rounded border px-2.5 py-1.5 text-xs ${r.scheduleConflict ? 'bg-orange-100 border-orange-300' : 'bg-white border-emerald-200'}`}>
                          <span>
                            <strong>{course.code}</strong> — {sec.sectionCode} &bull; {fmtSched(sec.schedule)}
                            {r.scheduleConflict && <span className="ml-2 text-orange-700 font-semibold">Conflicts with {r.conflictsWith.join(', ')}</span>}
                          </span>
                          <button type="button" onClick={() => toggleAdd(sid)} className="ml-2 text-red-400 hover:text-red-600">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-blue-500" />
                <span><strong>Specialized courses</strong> cannot be added via Change &amp; Drop. Use the <strong>Specialization Planner</strong> module to submit or change your specialization plan.</span>
              </div>

              <Input
                placeholder="Search course code or title (e.g. NRC, Math 11)..."
                value={courseSearch}
                onChange={e => setCourseSearch(e.target.value)}
                className="text-sm"
              />

              {courseSearch.trim() ? (
                searchResults.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No available sections found for "{courseSearch}".</p>
                ) : (
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted border-b">
                        <tr>
                          <th className="text-left px-3 py-2 font-semibold">Course</th>
                          <th className="text-left px-3 py-2 font-semibold">Section</th>
                          <th className="text-left px-3 py-2 font-semibold">Schedule</th>
                          <th className="text-center px-3 py-2 font-semibold">Slots</th>
                          <th className="text-center px-3 py-2 font-semibold">Units</th>
                          <th className="px-3 py-2 w-20"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {searchResults.map(sec => {
                          const course = state.courses.find(c => c.id === sec.courseId)!;
                          const r = getRestrictions(sec);
                          const isSelected = addSections.includes(sec.id);
                          const isFull = sec.enrolled >= sec.slots;

                          const rowBg = isSelected
                            ? (r.scheduleConflict ? 'bg-orange-50' : 'bg-emerald-50')
                            : r.blocked ? 'bg-red-50/40' : r.hasWarning ? 'bg-amber-50/60' : '';

                          return (
                            <tr key={sec.id} className={rowBg}>
                              <td className="px-3 py-2.5">
                                <p className="font-semibold">{course.code}</p>
                                <p className="text-muted-foreground">{course.title}</p>
                                {r.scheduleConflict && (
                                  <p className="text-red-600 text-[10px] mt-0.5 font-semibold">
                                    <AlertTriangle className="w-2.5 h-2.5 inline" /> Schedule conflict with {r.conflictsWith.join(', ')}
                                  </p>
                                )}
                                {r.prereqFail && (
                                  <p className="text-amber-600 text-[10px] mt-0.5">
                                    <AlertTriangle className="w-2.5 h-2.5 inline" /> Prereq: {r.prereqMissing.join(', ')}
                                  </p>
                                )}
                                {r.coreqFail && (
                                  <p className="text-amber-600 text-[10px] mt-0.5">
                                    <AlertTriangle className="w-2.5 h-2.5 inline" /> Coreq: {r.coreqMissing.join(', ')}
                                  </p>
                                )}
                                {r.incRestricted && (
                                  <p className="text-red-600 text-[10px] mt-0.5">
                                    <AlertTriangle className="w-2.5 h-2.5 inline" /> INC restriction — complete removal exam first
                                  </p>
                                )}
                                {r.yearStandingFail && (
                                  <p className="text-amber-600 text-[10px] mt-0.5">
                                    <AlertTriangle className="w-2.5 h-2.5 inline" /> {r.yearStandingMsg}
                                  </p>
                                )}
                                {r.alreadyPassed && (
                                  <p className="text-red-600 text-[10px] mt-0.5">
                                    <AlertTriangle className="w-2.5 h-2.5 inline" /> Already passed this course
                                  </p>
                                )}
                                {r.unitExceeds && !isSelected && (
                                  <p className="text-red-600 text-[10px] mt-0.5">
                                    <AlertTriangle className="w-2.5 h-2.5 inline" /> Would exceed unit limit
                                  </p>
                                )}
                              </td>
                              <td className="px-3 py-2.5 font-medium">{sec.sectionCode}</td>
                              <td className="px-3 py-2.5 whitespace-nowrap text-[11px]">
                                <div>{fmtSched(sec.schedule)}</div>
                                {sec.labSchedule?.days?.length ? <div className="text-muted-foreground">Lab: {fmtSched(sec.labSchedule)}</div> : null}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <span className={isFull ? 'text-red-600 font-semibold' : ''}>{sec.enrolled}/{sec.slots}</span>
                              </td>
                              <td className="px-3 py-2.5 text-center">{course.units}</td>
                              <td className="px-3 py-2.5 text-center">
                                {isSelected ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 px-2 text-[10px] border-red-300 text-red-600 hover:bg-red-50"
                                    onClick={() => toggleAdd(sec.id)}
                                  >
                                    Remove
                                  </Button>
                                ) : r.blocked ? (
                                  <span className="text-[10px] text-red-500 font-medium">
                                    {r.scheduleConflict ? 'Conflict' : r.alreadyPassed ? 'Passed' : r.incRestricted ? 'INC' : r.prereqFail ? 'Prereq' : r.coreqFail ? 'Coreq' : r.yearStandingFail ? 'Standing' : 'Blocked'}
                                  </span>
                                ) : (
                                  <Button
                                    size="sm"
                                    className="h-6 px-2 text-[10px]"
                                    onClick={() => toggleAdd(sec.id)}
                                    disabled={overload && !course?.isPE && !course?.isNSTP}
                                  >
                                    Select
                                  </Button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                <p className="text-xs text-muted-foreground text-center py-8">Type a course code or title to search available sections.</p>
              )}
            </TabsContent>

            {/* ── DROP TAB ── */}
            <TabsContent value="drop" className="mt-4 space-y-3">
              {enrolledRows.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No enrolled courses found for this term.</p>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted border-b">
                      <tr>
                        <th className="w-10 px-3 py-2"></th>
                        <th className="text-left px-3 py-2 font-semibold">Course</th>
                        <th className="text-left px-3 py-2 font-semibold">Section</th>
                        <th className="text-left px-3 py-2 font-semibold">Schedule</th>
                        <th className="text-center px-3 py-2 font-semibold">Units</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {enrolledRows.map(({ enrollment, sec, course }) => {
                        const checked = dropSections.includes(enrollment.sectionId);
                        return (
                          <tr key={enrollment.id} className={checked ? 'bg-red-50' : ''}>
                            <td className="px-3 py-2.5 text-center">
                              <Checkbox checked={checked} onCheckedChange={() => toggleDrop(enrollment.sectionId)} />
                            </td>
                            <td className="px-3 py-2.5">
                              <p className="font-semibold">{course!.code}</p>
                              <p className="text-muted-foreground">{course!.title}</p>
                            </td>
                            <td className="px-3 py-2.5">{sec!.sectionCode}</td>
                            <td className="px-3 py-2.5 whitespace-nowrap">{fmtSched(sec!.schedule)}</td>
                            <td className="px-3 py-2.5 text-center">{course!.units}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {dropSections.length > 0 && (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>You have selected <strong>{dropSections.length}</strong> course(s) to drop. A grade of <strong>DRP</strong> will be recorded once approved by OCS.</span>
                </div>
              )}
            </TabsContent>

            {/* ── STATEMENT & SUBMIT TAB ── */}
            <TabsContent value="review" className="mt-4 space-y-4">
              {addSections.length === 0 && dropSections.length === 0 && (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  No courses selected. Use the Change/Add or Drop tabs to select courses first.
                </div>
              )}
              {addConflicts.length > 0 && (
                <div className="text-xs text-red-700 bg-red-50 border border-red-300 rounded-lg p-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span><strong>Requirement issues</strong> detected in selected courses. Go back to the Change/Add tab and remove the highlighted courses before submitting.</span>
                </div>
              )}

              {(addRowsForReview.length > 0 || dropRowsForReview.length > 0) && (
                <div className="rounded-lg border p-3 space-y-2.5 bg-muted/20">
                  {addRowsForReview.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-emerald-800 mb-1.5">Courses to Add ({addRowsForReview.length})</p>
                      <div className="space-y-1">
                        {addRowsForReview.map(r => {
                          const rest = getRestrictions(r.sec!);
                          return (
                            <div key={r.sid} className={`text-xs border rounded px-2.5 py-1.5 flex items-center gap-2 ${rest.scheduleConflict ? 'bg-orange-50 border-orange-300' : 'bg-emerald-50 border-emerald-200'}`}>
                              {rest.scheduleConflict
                                ? <AlertTriangle className="w-3 h-3 text-orange-600 shrink-0" />
                                : <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />}
                              <strong>{r.course!.code}</strong> — {r.sec!.sectionCode} &bull; {fmtSched(r.sec!.schedule)}
                              {rest.scheduleConflict && <span className="text-orange-700 font-semibold">Conflict!</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {dropRowsForReview.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-red-800 mb-1.5">Courses to Drop ({dropRowsForReview.length})</p>
                      <div className="space-y-1">
                        {dropRowsForReview.map(r => (
                          <div key={r.sid} className="text-xs bg-red-50 border border-red-200 rounded px-2.5 py-1.5 flex items-center gap-2">
                            <Minus className="w-3 h-3 text-red-600 shrink-0" />
                            <strong>{r.course!.code}</strong> — {r.sec!.sectionCode} &bull; {fmtSched(r.sec!.schedule)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Statement / Reason <span className="text-red-500">*</span></label>
                <Textarea
                  rows={4}
                  placeholder="State your reason for this request..."
                  value={statement}
                  onChange={e => setStatement(e.target.value)}
                  className="text-sm resize-none"
                />
              </div>

              <div className="text-xs border rounded-lg p-3 bg-muted/20 space-y-1.5">
                <p className="font-semibold text-foreground">Terms and Conditions</p>
                <ul className="space-y-1 text-muted-foreground leading-relaxed">
                  <li>• All dropping and change requests shall be reflected in the student's official academic record.</li>
                  <li>• A grade of DRP (Dropped) shall be recorded for officially dropped courses.</li>
                  <li>• This request is subject to OCS review and approval.</li>
                  <li>• Once approved, changes will be automatically reflected in your enrollment record.</li>
                  <li>• Submission of false or misleading information may result in disciplinary action.</li>
                </ul>
              </div>

              <div className="flex items-start gap-2">
                <Checkbox id="cd-confirm" checked={confirmed} onCheckedChange={v => setConfirmed(!!v)} />
                <label htmlFor="cd-confirm" className="text-xs cursor-pointer leading-relaxed">
                  I have read and agree to the Terms and Conditions above, and I declare that all information I provided is true and correct.
                </label>
              </div>

              <div className="flex gap-2 justify-end pt-1">
                <Button
                  type="button"
                  size="sm"
                  className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={!confirmed || !statement.trim() || (addSections.length === 0 && dropSections.length === 0) || submitting || addConflicts.length > 0}
                  onClick={handleSubmit}
                >
                  <Send className="w-3.5 h-3.5" />
                  {submitting ? 'Submitting…' : 'Submit Request'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
