import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { StatusBanner } from '@/components/shared/StatusBanner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AppDialog } from '@/components/ui/app-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertTriangle, CalendarDays, CheckCircle, XCircle, Lock, Unlock, BookOpen, AlertCircle,
  Search, Trash2, CheckSquare, RefreshCw, Download, MessageSquare,
  ChevronUp, ChevronDown, Filter, Clock, ShoppingCart, FileText, Printer,
} from 'lucide-react';
import { StudentChangeDropModal } from './StudentChangeDropModal';
import type { Section, Day, Course, Schedule, ChangeDropRequest } from '@/lib/types';
import { getScholasticStanding, isIncEnrollmentRestricted, getYearClassification, getPassedUnits } from '@/lib/academic';
import { toast } from '@/components/ui/sonner';


function fmtSchedSimple(s?: Schedule) {
  if (!s || !s.days?.length) return 'TBA';
  return `${s.days.join('')} ${s.startTime}–${s.endTime}`;
}

type PdfState = {
  sections: { id: string; courseId: string; sectionCode: string; schedule?: Schedule }[];
  courses: { id: string; code: string; title: string; units: number }[];
  portalSettings?: { institutionName?: string; portalName?: string; logoUrl?: string };
};

function generateChangeDropFormPDF(
  req: ChangeDropRequest,
  studentName: string,
  studentNumber: string | undefined,
  studentProgram: string | undefined,
  termName: string,
  st: PdfState,
) {
  const ps = st.portalSettings;
  const instName = ps?.institutionName || ps?.portalName || 'University';
  const logoUrl = ps?.logoUrl ?? '';
  const processedDate = req.processedAt
    ? new Date(req.processedAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
  const isDenied = req.status === 'denied';
  const statusLabel = isDenied ? 'DENIED' : 'APPROVED';
  const statusColor = isDenied ? 'color:#b91c1c;font-weight:bold' : 'color:#15803d;font-weight:bold';
  const dateLabel = isDenied ? 'Date Processed' : 'Date Approved';

  const addRows = (req.addSections ?? []).map(sid => {
    const sec = st.sections.find(s => s.id === sid);
    const course = sec ? st.courses.find(c => c.id === sec.courseId) : null;
    return { sec, course };
  }).filter(r => r.sec && r.course);

  const dropRows = (req.dropSections ?? []).map(sid => {
    const sec = st.sections.find(s => s.id === sid);
    const course = sec ? st.courses.find(c => c.id === sec.courseId) : null;
    return { sec, course };
  }).filter(r => r.sec && r.course);

  const rowStyle = 'border:1px solid #000;padding:4px 8px;font-size:10px';
  const thStyle = 'border:1px solid #000;padding:4px 8px;font-size:10px;background:#e5e7eb;text-align:left';
  const tableHeader = `<tr><th style="${thStyle}">Course Code</th><th style="${thStyle}">Course Title</th><th style="${thStyle};width:40px;text-align:center">Units</th><th style="${thStyle};width:65px;text-align:center">Section</th><th style="${thStyle}">Schedule</th></tr>`;

  const mkRows = (rows: typeof addRows) => rows.map((r, i) =>
    `<tr style="${i % 2 ? 'background:#f9fafb' : ''}">
      <td style="${rowStyle}">${r.course!.code}</td>
      <td style="${rowStyle}">${r.course!.title}</td>
      <td style="${rowStyle};text-align:center">${r.course!.units}</td>
      <td style="${rowStyle};text-align:center">${r.sec!.sectionCode}</td>
      <td style="${rowStyle};font-size:9.5px">${fmtSchedSimple(r.sec!.schedule as Schedule | undefined)}</td>
    </tr>`
  ).join('');

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8" /><title>Change/Drop Request — ${studentName}</title>
<style>
  @page { size: A4 portrait; margin: 16mm 18mm; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; font-size: 11px; }
  .divider { border-top: 1.5px solid #333; margin: 10px 0 5px; }
  .section-label { font-size: 10.5px; font-weight: bold; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 4px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
  <div style="display:flex;align-items:center;gap:10px;justify-content:center;margin-bottom:6px">
    ${logoUrl ? `<img src="${logoUrl}" style="width:50px;height:50px;border-radius:50%;object-fit:cover;border:1px solid #ccc" />` : ''}
    <div style="text-align:center">
      <div style="font-size:13px;font-weight:bold;text-transform:uppercase">${instName}</div>
      <div style="font-size:10px;margin-top:2px">Office of the College Secretary</div>
    </div>
  </div>
  <div style="text-align:center;margin:6px 0 12px">
    <div style="font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:.05em">Request to Change / Drop Subjects</div>
    <div style="font-size:9.5px;color:#555;margin-top:3px">${termName} &bull; ${dateLabel}: ${processedDate}</div>
  </div>
  <table style="border-collapse:collapse;width:100%;margin-bottom:10px">
    <tr><td style="font-size:10px;width:22%;padding:2px 0"><b>Student Name:</b></td><td style="font-size:10px;padding:2px 0">${studentName}</td>
        <td style="font-size:10px;width:18%;padding:2px 0"><b>Student No.:</b></td><td style="font-size:10px;padding:2px 0">${studentNumber ?? ''}</td></tr>
    <tr><td style="font-size:10px;padding:2px 0"><b>Program:</b></td><td style="font-size:10px;padding:2px 0" colspan="3">${studentProgram ?? ''}</td></tr>
    <tr><td style="font-size:10px;padding:2px 0"><b>Academic Term:</b></td><td style="font-size:10px;padding:2px 0" colspan="3">${termName}</td></tr>
    <tr><td style="font-size:10px;padding:2px 0"><b>Status:</b></td><td style="font-size:10px;padding:2px 0;${statusColor}" colspan="3">${statusLabel}</td></tr>
  </table>
  ${addRows.length > 0 ? `<div class="divider"></div><div class="section-label">Courses Added (Change)</div><table style="border-collapse:collapse;width:100%;margin-bottom:10px">${tableHeader}${mkRows(addRows)}</table>` : ''}
  ${dropRows.length > 0 ? `<div class="divider"></div><div class="section-label">Courses Dropped</div><table style="border-collapse:collapse;width:100%;margin-bottom:10px">${tableHeader}${mkRows(dropRows)}</table>` : ''}
  <div class="divider"></div>
  <div class="section-label">Statement / Reason</div>
  <div style="font-size:10px;border:1px solid #ccc;padding:8px;min-height:40px;margin-bottom:12px">${(req.reason || '').replace(/\n/g, '<br/>')}</div>
  ${isDenied && req.response ? `<div class="divider"></div><div class="section-label" style="color:#b91c1c">OCS Denial Note</div><div style="font-size:10px;border:1px solid #fca5a5;padding:8px;background:#fff1f2;margin-bottom:12px">${req.response.replace(/\n/g, '<br/>')}</div>` : ''}
  <div style="display:flex;justify-content:space-between;margin-top:36px">
    <div style="border-top:1px solid #000;width:210px;padding-top:3px;font-size:9px">Student Signature over Printed Name / Date</div>
    <div style="border-top:1px solid #000;width:180px;padding-top:3px;font-size:9px">OCS Staff Signature / Date Processed</div>
    <div style="border-top:1px solid #000;width:130px;padding-top:3px;font-size:9px;${statusColor}">Status: ${statusLabel}</div>
  </div>
</body></html>`;

  const win = window.open('', '_blank', 'width=820,height=960');
  if (win) { win.document.write(html); win.document.close(); win.onload = () => win.print(); }
}

const DAYS: Day[] = ['M', 'T', 'W', 'Th', 'F', 'S'];const DAY_LABELS: Record<Day, string> = { M: 'Monday', T: 'Tuesday', W: 'Wednesday', Th: 'Thursday', F: 'Friday', S: 'Saturday' };
const COLORS = [
  'bg-blue-200 border-blue-400 text-blue-900',
  'bg-green-200 border-green-400 text-green-900',
  'bg-purple-200 border-purple-400 text-purple-900',
  'bg-yellow-200 border-yellow-400 text-yellow-900',
  'bg-pink-200 border-pink-400 text-pink-900',
  'bg-indigo-200 border-indigo-400 text-indigo-900',
  'bg-orange-200 border-orange-400 text-orange-900',
  'bg-teal-200 border-teal-400 text-teal-900',
];

function toMinutes(t: string) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }
function schedulesOverlap(a: { days: Day[]; startTime: string; endTime: string }, b: { days: Day[]; startTime: string; endTime: string }) {
  return a.days.some(d => b.days.includes(d)) && toMinutes(a.startTime) < toMinutes(b.endTime) && toMinutes(a.endTime) > toMinutes(b.startTime);
}

// ── Helpers ──────────────────────────────────────────────────────────────────
// Flatten string[][] (grouped prereqs) or legacy string[] to a flat array of IDs
const flattenIds = (ids?: string[][] | string[]): string[] => {
  if (!ids?.length) return [];
  if (typeof ids[0] === 'string') return ids as string[];
  return (ids as string[][]).flat();
};

// ── ClassCard sub-component ──────────────────────────────────────────────────
type CardSchedule = { days: Day[]; startTime: string; endTime: string; room?: string };

function ClassCard({ course, sectionCode, isLab, schedule, facultyName, enrolled, slots, consentNotes, allCourses, isEnlistedFinalized, open, onToggle }: {
  course: Course;
  sectionCode: string;
  isLab?: boolean;
  schedule: CardSchedule;
  facultyName?: string;
  enrolled: number;
  slots: number;
  consentNotes: string[];
  allCourses?: Course[];
  isEnlistedFinalized?: boolean;
  open: boolean;
  onToggle: () => void;
}) {

  const resolveCourseIds = (ids?: string[][] | string[]) => {
    const flat = flattenIds(ids);
    if (!flat.length) return 'None';
    if (!allCourses?.length) return flat.join(', ');
    return flat.map(id => {
      const c = allCourses.find(x => x.id === id);
      return c ? `${c.code} (${c.title})` : id;
    }).join(', ');
  };

  const prereqs = resolveCourseIds(course.prerequisites);
  const coreqs = resolveCourseIds(course.corequisites);

  const headerBase = isEnlistedFinalized
    ? 'w-full px-3 py-2 flex items-start justify-between gap-2 text-left transition-colors rounded-t-lg bg-green-700 hover:bg-green-600'
    : 'w-full px-3 py-2 flex items-start justify-between gap-2 text-left hover:bg-muted/20 transition-colors rounded-t-lg';

  return (
    <div className="border rounded-lg flex-1 bg-background">
      <button
        type="button"
        className={headerBase}
        onClick={() => onToggle()}
      >
        <div className="flex items-start gap-2">
          <BookOpen className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isEnlistedFinalized ? 'text-green-200' : 'text-blue-500'}`} />
          <div>
            <p className={`font-bold text-sm leading-snug ${isEnlistedFinalized ? 'text-white' : ''}`}>
              {course.code} ({course.title})
            </p>
            <span className={`text-xs ${isEnlistedFinalized ? 'text-green-200' : 'text-muted-foreground'}`}>{course.units}{course.labUnits ? `+${course.labUnits}` : ''} units</span>
          </div>
        </div>
        {open
          ? <ChevronUp className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isEnlistedFinalized ? 'text-green-200' : 'text-muted-foreground'}`} />
          : <ChevronDown className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isEnlistedFinalized ? 'text-green-200' : 'text-muted-foreground'}`} />}
      </button>
      {open && (
        <>
          <hr className="border-border" />
          <div className="px-3 py-2 space-y-1.5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5">
              <p><span className="text-muted-foreground">Time:</span> ({schedule.startTime} - {schedule.endTime})</p>
              <p><span className="text-muted-foreground">Faculty:</span> {facultyName ?? 'TBA'}</p>
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-muted-foreground">Days:</span>
                {schedule.days.length
                  ? schedule.days.map(d => (
                    <span key={d} className="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1 rounded text-[10px] font-bold bg-primary text-primary-foreground">{d}</span>
                  ))
                  : <span>TBA</span>}
              </div>
              <p><span className="text-muted-foreground">Location:</span> {schedule.room ?? 'TBA'}</p>
            </div>
            {!isLab && (
              <div className="space-y-0.5">
                <p><span className="text-muted-foreground">Co-Req:</span> {coreqs}</p>
                <p><span className="text-muted-foreground">Pre-Req:</span> {prereqs}</p>
              </div>
            )}
            {consentNotes.map((note, i) => <p key={i} className="text-red-500">{note}</p>)}
            <div className="flex justify-end pt-1">
              <Badge className="bg-green-600 text-white text-xs border-0">{enrolled}/{slots}</Badge>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function StudentEnlistment() {
  const navigate = useNavigate();
  const { state, enlistSection, dropSection, removeSection, checkPrerequisites, checkCorequisites, getCurrentUnits,
    finalizeEnlistment, submitReconsiderationRequest, submitUnderloadApplication,
    canStudentViewGrades } = useApp();
  const student = state.currentUser;
  const activeTerm = state.terms.find(t => t.isActive);

  // State
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [finalizeConfirmText, setFinalizeConfirmText] = useState('');
  const [cart, setCart] = useState<string[]>([]);
  const cartLoadedRef = useRef(false);
  const [search, setSearch] = useState('');       // Course code / title
  const [sectionSearch, setSectionSearch] = useState('');  // Section code
  const [statusFilter, setStatusFilter] = useState('');    // '' | 'all' | 'open'
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [pageSize, setPageSize] = useState(5);
  const [filterApplied, setFilterApplied] = useState(false);
  const [tempSearch, setTempSearch] = useState('');
  const [tempSectionSearch, setTempSectionSearch] = useState('');
  const [tempStatusFilter, setTempStatusFilter] = useState('');
  const [enlistWarning, setEnlistWarning] = useState<{ courseCode: string; sectionCode: string; issues: string[] } | null>(null);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [enlisting, setEnlisting] = useState<string | null>(null);
  const [openCardIds, setOpenCardIds] = useState<Set<string>>(new Set());
  const toggleCard = (id: string) => setOpenCardIds(prev => {
    const n = new Set(prev);
    if (n.has(id)) { n.delete(id); } else { n.add(id); }
    return n;
  });
  const [showReconDialog, setShowReconDialog] = useState(false);
  const [reconReason, setReconReason] = useState('');
  const [submittingRecon, setSubmittingRecon] = useState(false);
  const [showLateEnlistDialog, setShowLateEnlistDialog] = useState(false);
  const [lateEnlistReason, setLateEnlistReason] = useState('');
  const [submittingLateEnlist, setSubmittingLateEnlist] = useState(false);
  const [showUnderloadDialog, setShowUnderloadDialog] = useState(false);
  const [underloadReason, setUnderloadReason] = useState('');
  const [submittingUnderload, setSubmittingUnderload] = useState(false);
  const [showChangeDropModal, setShowChangeDropModal] = useState(false);
  const [bulkFailures, setBulkFailures] = useState<{ code: string; section: string; reasons: string[] }[] | null>(null);

  const showWarning = (courseCode: string, sectionCode: string, issues: string[]) => {
    setEnlistWarning({ courseCode, sectionCode, issues });
    setShowWarningDialog(true);
  };

  // Cart persistence — synced to Supabase profiles for cross-device support (localStorage as fallback)
  useEffect(() => {
    if (!student?.id || !activeTerm?.id) return;
    const lsKey = `enlistment-cart-${student.id}-${activeTerm.id}`;
    // Try DB first, fall back to localStorage
    supabase
      .from('profiles')
      .select('cart_data')
      .eq('local_id', student.id)
      .maybeSingle()
      .then(({ data }) => {
        const dbCart = (data?.cart_data as Record<string, string[]> | null)?.[activeTerm.id];
        if (dbCart && dbCart.length > 0) {
          setCart(dbCart);
        } else {
          const stored = localStorage.getItem(lsKey);
          if (stored) { try { setCart(JSON.parse(stored)); } catch { /* ignore */ } }
        }
        cartLoadedRef.current = true;
      });
  }, [student?.id, activeTerm?.id]);

  useEffect(() => {
    if (!student?.id || !activeTerm?.id) return;
    if (!cartLoadedRef.current) return;
    // Save to localStorage immediately (fast, offline-safe)
    localStorage.setItem(`enlistment-cart-${student.id}-${activeTerm.id}`, JSON.stringify(cart));
    // Save to Supabase for cross-device sync (cart_data is a JSON object keyed by termId)
    supabase.from('profiles').select('cart_data').eq('local_id', student.id).maybeSingle()
      .then(({ data }) => {
        const existing = (data?.cart_data as Record<string, string[]> | null) ?? {};
        const merged = { ...existing, [activeTerm.id]: cart };
        supabase.from('profiles').update({ cart_data: merged }).eq('local_id', student.id)
          .then(({ error }) => { if (error) console.error('Cart sync DB error:', error.message); });
      });
  }, [cart, student?.id, activeTerm?.id]);

  // NOTE: Cart items are NOT auto-removed when enrolled — students can use cart as a planning list.
  //       However, stale items from other terms are pruned when the active term changes.
  useEffect(() => {
    if (!activeTerm) return;
    setCart(prev => prev.filter(id => {
      const sec = state.sections.find(s => s.id === id);
      return sec && sec.termId === activeTerm.id;
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTerm?.id]);
  //       Cart items that are already enlisted will be skipped in bulk enlist and shown as "Enrolled".

  // NOTE: dropUnfinalizedCourses is NOT called from the student portal — admin handles deadline enforcement
  // to prevent enrolled courses from being auto-dropped when a test term's deadline has passed.

  // ── Plan of Study course IDs (for POS warning) ────────────────────────────
  const posAllCourseIds = useMemo(() => {
    if (!student) return new Set<string>();
    const req = state.graduationRequirements;
    const globalReq = req.find(r => r.collegeId === 'global' && !r.programId);
    // If global requirements not configured/loaded yet, skip warning entirely
    if (!globalReq) return new Set<string>();
    // Mirror StudentPlanOfStudy's collegeReq lookup exactly
    const collegeEntry = state.colleges.find(c => c.id === student.college || c.name === student.college);
    const collegeId = collegeEntry?.id ?? '';
    const prog = (state.degreePrograms ?? []).find(p => p.name === student.program || p.id === student.program);
    let collegeReq = prog?.id ? req.find(r => r.programId === prog.id) : undefined;
    if (!collegeReq) collegeReq = req.find(r => r.collegeId === collegeId && !r.programId);
    const approvedSpec = (state.specializationRequests ?? []).find(r => r.studentId === student.id && r.status === 'approved');
    const approvedGe = (state.geElectiveRequests ?? []).find(r => r.studentId === student.id && r.status === 'approved');
    return new Set<string>([
      ...(globalReq.requiredGeCourseIds ?? []),
      ...(globalReq.requiredHkPeNstpCourseIds ?? []),
      ...(collegeReq?.requiredMajorCourseIds ?? []),
      ...(collegeReq?.requiredGeCourseIds ?? []),
      ...(collegeReq?.requiredThesisCourseIds ?? []),
      ...(approvedSpec?.courseIds ?? []),
      ...(approvedGe?.courseIds ?? []),
    ]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.graduationRequirements, state.degreePrograms, state.colleges, state.specializationRequests, state.geElectiveRequests, student?.college, student?.program, student?.id]);

  if (!student) return null;
  if (!activeTerm) {
    return (
      <PortalLayout role="student" userName={student.name}>
        <div className="text-center text-muted-foreground py-12">No active term found.</div>
      </PortalLayout>
    );
  }

  // ── Window status ───────────────────────────────────────────────────
  type WinStatus = 'open' | 'not-set' | 'upcoming' | 'ended';
  const getWindowStatus = (from?: string, until?: string): WinStatus => {
    if (!from && !until) return 'not-set';
    const now = new Date();
    if (from && now < new Date(from)) return 'upcoming';
    if (until && now > new Date(until)) return 'ended';
    return 'open';
  };
  const enlistmentWindowStatus = getWindowStatus(activeTerm.enlistmentFrom, activeTerm.enlistmentUntil);
  const enlistmentOpen = activeTerm.controls.enlistmentOpen;
  const prerogativeOpen = activeTerm.controls.prerogativeOpen;

  // ── Scholastic standing — compute from grades (same logic as StudentProfile) ──
  const viewableScholasticTerms = state.terms
    .map(t => ({
      term: t,
      result: getScholasticStanding(student.id, t.id, state.grades, state.sections, state.courses),
      canView: canStudentViewGrades(student.id, t.id),
    }))
    .filter(x => x.result !== null && x.canView);
  const latestScholastic = viewableScholasticTerms[viewableScholasticTerms.length - 1]?.result ?? null;
  const scholasticStatus = latestScholastic?.standing ?? 'Good Standing';

  // PD lock: locked if student EVER had a PD standing (any term),
  // unless they have an approved PD-reconsideration for THIS specific term.
  const hasPDEver = student.status === 'permanently_disqualified' ||
    // Cross-check with the already-computed viewable standing (same logic as profile)
    latestScholastic?.standing === 'Permanent Disqualification' ||
    // Also scan all terms (catches non-viewable terms too)
    state.terms.some(t =>
      getScholasticStanding(student.id, t.id, state.grades, state.sections, state.courses)?.standing === 'Permanent Disqualification'
    );
  const hasApprovedReconThisTerm = (state.reconsiderationRequests ?? []).some(
    r => r.studentId === student.id &&
         r.termId === activeTerm.id &&
         // Only PD reconsideration requests lift the PD lock — NOT late enlistment or other types
         (!r.requestType || r.requestType === 'pd_reconsideration') &&
         r.status === 'approved'
  );
  const isDisqualified = hasPDEver && !hasApprovedReconThisTerm;
  // Late enlistment: OCS can approve a student to enlist even after the window has closed
  const hasApprovedLateEnlistThisTerm = (state.reconsiderationRequests ?? []).some(
    r => r.studentId === student.id && r.termId === activeTerm.id && r.requestType === 'late_enlistment' && r.status === 'approved'
  );
  // Change/Drop after finalization: OCS approves → student can re-enlist/drop
  // Old-style approved = OCS reopened finalization so student can re-enlist
  const hasApprovedChangeDropRequest = (state.changeDropRequests ?? []).some(
    r => r.studentId === student.id && r.termId === activeTerm.id && r.status === 'approved' &&
      r.addSections === undefined && r.dropSections === undefined
  );
  // Use local date (not UTC) so it matches what the admin sets via the date picker
  const now = new Date();
  const enrollSched = activeTerm.enrollmentSchedule;
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const studentNum = student.studentNumber ?? '';
  // Match if studentNumber starts with any of the configured prefixes (supports "2021-1234" or "202112345")
  const matchesEnrollPrefix = (prefixes: string[]) =>
    prefixes.length === 0 ||
    prefixes.some(p => {
      const pt = p.trim();
      return pt && (studentNum.startsWith(pt) || studentNum.replace(/\D/g, '').startsWith(pt.replace(/\D/g, '')));
    });
  // Check if current time is within the slot's start/end window (no times = all day)
  const isTimeInWindow = (slot: { startTime?: string; endTime?: string }) => {
    if (!slot.startTime && !slot.endTime) return true;
    if (slot.startTime && currentTime < slot.startTime) return false;
    if (slot.endTime && currentTime > slot.endTime) return false;
    return true;
  };
  const enrollSchedToday = enrollSched?.slots?.find(s => s.date === today && (s.phase as number) !== 3);
  const isMyEnrollDay = !!enrollSchedToday && matchesEnrollPrefix(enrollSchedToday.idPrefixes) && isTimeInWindow(enrollSchedToday);
  // Phase 3 = Change of Matriculation Period: date-based, open to ALL students
  const phase3SlotToday = enrollSched?.slots?.find(s => (s.phase as number) === 3 && s.date === today);
  const isPhase3Today = !!phase3SlotToday && isTimeInWindow(phase3SlotToday);
  // Change/Drop window: is it currently within the configured window?
  const isChangeDropWindowOpen = (() => {
    const from = activeTerm.changeDropFrom;
    const until = activeTerm.changeDropUntil;
    if (!from && !until) return false;
    const nowTs = now.getTime();
    if (from && nowTs < new Date(from).getTime()) return false;
    if (until && nowTs > new Date(until).getTime()) return false;
    return true;
  })();
  // Late enrollment window: is it currently within the configured window?
  const isLateEnrollmentWindowOpen = (() => {
    const from = activeTerm.lateEnrollmentFrom;
    const until = activeTerm.lateEnrollmentUntil;
    if (!from && !until) return true; // no window set = always available after enlistment ends
    const nowTs = now.getTime();
    if (from && nowTs < new Date(from).getTime()) return false;
    if (until && nowTs > new Date(until).getTime()) return false;
    return true;
  })();
  // Underload application window
  const isUnderloadWindowOpen = (() => {
    const from = activeTerm.underloadFrom;
    const until = activeTerm.underloadUntil;
    if (!from && !until) return false; // no window set = not available
    const nowTs = now.getTime();
    if (from && nowTs < new Date(from).getTime()) return false;
    if (until && nowTs > new Date(until).getTime()) return false;
    return true;
  })();
  // My underload application for the active term (latest one)
  const myUnderloadApp = (state.underloadApplications ?? [])
    .filter(a => a.studentId === student.id && a.termId === activeTerm.id)
    .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())[0];
  // Appeal bypass: when either late enrollment or change/drop is approved, bypass ALL finalization/window guards
  // Cleared once the student re-finalizes (isFinalized becomes true again)
  const isFinalized = !!state.finalizedEnlistments.find(f => f.studentId === student.id && f.termId === activeTerm.id);
  const appealBypass = !isFinalized && (hasApprovedLateEnlistThisTerm || hasApprovedChangeDropRequest);
  // OCS-approved re-enlistment request: allows enlisting + finalizing even outside schedule/window
  // Also open when it's the student's scheduled enrollment day OR Phase 3 is active
  const effectiveEnlistmentOpen = enlistmentOpen || enlistmentWindowStatus === 'open' || isMyEnrollDay || isPhase3Today || appealBypass;
  const finalizeWindowStatus = getWindowStatus(activeTerm.finalizeWindowStart, activeTerm.finalizeWindowEnd);
  const finalizeButtonVisible = finalizeWindowStatus === 'open' || appealBypass;
  // Drop: allowed during open enlistment (not yet finalized), or with approved change/drop/late request
  const canDrop = !isFinalized || hasApprovedChangeDropRequest || hasApprovedLateEnlistThisTerm;

  // ── Enrollment Form PDF (TOR-style) ───────────────────────────────────────
  const generateEnrollmentFormPdf = () => {
    const ps = state.portalSettings;
    const instName = ps.institutionName || ps.portalName || 'University';
    const logoUrl = ps.logoUrl ?? '';
    const termName = activeTerm.name;
    const dateIssued = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
    const passedUnits = getPassedUnits(student.id, state.grades, state.sections, state.courses, state.enrollments);
    const prog = state.degreePrograms?.find(p => p.name === student.program);
    const totalProgramUnits = prog?.totalUnits ?? 0;
    const yearClass = totalProgramUnits > 0 ? getYearClassification(passedUnits, totalProgramUnits) : '—';

    const fmtSched = (s?: Schedule) => {
      if (!s || !s.days?.length) return 'TBA';
      return `${s.days.join('')} ${s.startTime}–${s.endTime}`;
    };

    const enrolledSections = state.enrollments
      .filter(e => e.studentId === student.id && e.termId === activeTerm.id && e.status === 'enrolled')
      .map(e => {
        const sec = state.sections.find(s => s.id === e.sectionId);
        const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
        const faculty = sec ? state.users.find(u => u.id === sec.facultyId) : null;
        return { sec, course, faculty };
      })
      .filter(r => r.sec && r.course);

    const totalUnits = enrolledSections.reduce((s, r) => s + (r.course?.units ?? 0), 0);

    const courseRows = enrolledSections.map((r, i) => `
      <tr style="${i % 2 === 1 ? 'background:#f9f9f9' : ''}">
        <td style="border:1px solid #000;padding:4px 7px;font-size:10px;font-family:Arial">${r.course!.code}</td>
        <td style="border:1px solid #000;padding:4px 7px;font-size:10px;font-family:Arial">${r.course!.title}</td>
        <td style="border:1px solid #000;padding:4px 7px;font-size:10px;text-align:center;font-family:Arial">${r.course!.units}</td>
        <td style="border:1px solid #000;padding:4px 7px;font-size:10px;text-align:center;font-family:Arial">${r.sec!.sectionCode}</td>
        <td style="border:1px solid #000;padding:4px 7px;font-size:9.5px;font-family:Arial">${fmtSched(r.sec!.schedule)}${r.sec!.labSchedule ? `<br/><span style="color:#555;font-size:8.5px">Lab: ${fmtSched(r.sec!.labSchedule)}</span>` : ''}</td>
        <td style="border:1px solid #000;padding:4px 7px;font-size:9.5px;font-family:Arial">${r.sec!.schedule.room || '—'}${r.sec!.labSchedule?.room ? `<br/><span style="color:#555;font-size:8.5px">Lab: ${r.sec!.labSchedule.room}</span>` : ''}</td>
        <td style="border:1px solid #000;padding:4px 7px;font-size:9.5px;font-family:Arial">${r.sec!.facultyHidden ? 'To be Announced' : (r.faculty?.name ?? 'TBA')}${r.sec!.labSchedule ? `<br/><span style="color:#555;font-size:8.5px">Lab: ${r.sec!.facultyHidden ? 'To be Announced' : (r.faculty?.name ?? 'TBA')}</span>` : ''}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8" />
<style>
  @page { size: A4 portrait; margin: 14mm 16mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 10px; }

  /* ── Header band ── */
  .hdr-band {
    background: linear-gradient(120deg, #7A1A2E 0%, #1E5940 100%);
    padding: 10px 14px;
    display: flex; align-items: center; gap: 12px;
    margin-bottom: 0;
  }
  .logo { width: 52px; height: 52px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(255,255,255,0.4); flex-shrink: 0; }
  .hdr-center { flex: 1; text-align: center; }
  .hdr-inst { font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.06em; color: #fff; }
  .hdr-office { font-size: 9.5px; color: rgba(255,255,255,0.8); margin-top: 2px; letter-spacing: 0.04em; }
  .hdr-doctype { font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; color: #fff; margin-top: 4px; border-top: 1px solid rgba(255,255,255,0.35); padding-top: 4px; }

  /* ── Sub-header ── */
  .subhdr { background: #f5f5f5; border-bottom: 2px solid #7A1A2E; padding: 4px 10px; display: flex; justify-content: space-between; align-items: center; font-size: 8.5px; color: #444; }
  .subhdr .form-ref { font-weight: bold; color: #7A1A2E; }

  /* ── Student info grid ── */
  .info { border: 1px solid #999; margin: 8px 0 10px; }
  .info-row { display: flex; border-bottom: 1px solid #ccc; }
  .info-row:last-child { border-bottom: none; }
  .info-cell { padding: 5px 10px; flex: 1; border-right: 1px solid #ccc; }
  .info-cell:last-child { border-right: none; }
  .lbl { font-size: 7.5px; color: #7A1A2E; text-transform: uppercase; letter-spacing: 0.06em; font-weight: bold; }
  .val { font-size: 11px; font-weight: bold; margin-top: 2px; color: #111; }
  .val.enrolled { color: #1E5940; }

  /* ── Table ── */
  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  thead tr { background: #1a1a1a; }
  th { border: 1px solid #333; padding: 5px 7px; font-size: 8px; font-weight: bold; text-align: center; color: #fff; text-transform: uppercase; letter-spacing: 0.04em; }
  th:first-child, th:nth-child(2) { text-align: left; }
  td { border: 1px solid #ccc; padding: 4px 7px; font-size: 9.5px; color: #111; vertical-align: top; }
  tr:nth-child(even) td { background: #f9f9f9; }
  .total-row td { font-weight: bold; background: #f0f0f0; border-top: 2px solid #7A1A2E; font-size: 10px; }

  /* ── Signatures ── */
  .sigs { display: flex; gap: 14px; margin-top: 14px; }
  .sb { flex: 1; text-align: center; }
  .sn { font-size: 10px; font-weight: bold; min-height: 18px; color: #7A1A2E; }
  .sl { border-top: 1px solid #333; margin: 5px 0 2px; }
  .sd { font-size: 7.5px; text-transform: uppercase; letter-spacing: 0.04em; color: #555; }

  /* ── T&C ── */
  .tnc { font-size: 7px; color: #333; border: 0.5px solid #ccc; padding: 6px 10px; margin-top: 10px; background: #fafafa; line-height: 1.5; }
  .tnc-title { font-size: 7.5px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; color: #7A1A2E; margin-bottom: 4px; }
  .tnc-section { margin-bottom: 5px; }
  .tnc-section-title { font-weight: bold; text-transform: uppercase; font-size: 7px; margin-bottom: 2px; color: #1E5940; }
  .tnc-list { margin: 0; padding-left: 13px; }
  .tnc-list li { margin-bottom: 1.5px; }

  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head><body>

  <div class="hdr-band">
    ${logoUrl ? `<img class="logo" src="${logoUrl}" alt="Logo" />` : ''}
    <div class="hdr-center">
      <div class="hdr-inst">${instName}</div>
      <div class="hdr-office">Office of the University Registrar</div>
      <div class="hdr-doctype">Certificate of Enrollment</div>
    </div>
    ${logoUrl ? `<div style="width:52px;flex-shrink:0"></div>` : ''}
  </div>

  <div class="subhdr">
    <span class="form-ref">AIS Enrollment Form &nbsp;·&nbsp; ${termName}</span>
    <span>Date Issued: <strong>${dateIssued}</strong></span>
  </div>

  <div class="info">
    <div class="info-row">
      <div class="info-cell"><div class="lbl">Student Name</div><div class="val">${student.name.toUpperCase()}</div></div>
      <div class="info-cell"><div class="lbl">Student Number</div><div class="val">${student.studentNumber ?? '—'}</div></div>
      <div class="info-cell"><div class="lbl">Date Issued</div><div class="val">${dateIssued}</div></div>
    </div>
    <div class="info-row">
      <div class="info-cell"><div class="lbl">Program / Course</div><div class="val">${student.program ?? '—'}</div></div>
      <div class="info-cell"><div class="lbl">Year Level</div><div class="val">${yearClass}</div></div>
      <div class="info-cell"><div class="lbl">Enrollment Status</div><div class="val enrolled">Officially Enrolled</div></div>
    </div>
  </div>

  <table>
    <thead><tr>
      <th>Code</th><th>Course Title</th><th>Units</th><th>Section</th><th>Schedule</th><th>Room</th><th>Instructor</th>
    </tr></thead>
    <tbody>
      ${courseRows}
      <tr class="total-row">
        <td colspan="2" style="text-align:right;padding-right:10px">Total Academic Units</td>
        <td style="text-align:center">${totalUnits}</td>
        <td colspan="4"></td>
      </tr>
    </tbody>
  </table>

  <div class="sigs">
    <div class="sb">
      <div class="sn">${student.name}</div>
      <div class="sl"></div>
      <div class="sd">Student's Signature &amp; Date</div>
    </div>
    <div class="sb">
      <div class="sn"></div>
      <div class="sl"></div>
      <div class="sd">College Dean / Academic Adviser</div>
    </div>
    <div class="sb">
      <div class="sn"></div>
      <div class="sl"></div>
      <div class="sd">University Registrar</div>
    </div>
  </div>

  <div class="tnc">
    <div class="tnc-title">Terms and Conditions of Enrollment</div>
    <div class="tnc-section">
      <div class="tnc-section-title">I. Grading System</div>
      <ol class="tnc-list">
        <li>Grades shall be reported using the following numerical scale: 1.0 (Excellent), 1.25, 1.5, 1.75, 2.0 (Very Good), 2.25, 2.5, 2.75, 3.0 (Passing), 4.0 (Conditional Failure), and 5.0 (Failure). A grade of INC (Incomplete) or DRP (Dropped) may also be recorded under specific circumstances.</li>
        <li>A passing grade is 3.0 or better. A grade of 4.0 is a conditional failure; the student must remove this grade within one (1) academic year. A grade of 5.0 is a final failure with no removal privilege.</li>
        <li>A student who fails to submit the required coursework for a legitimate reason may be given a grade of INC. The INC must be completed within one (1) academic year; otherwise, it shall be converted to 5.0.</li>
        <li>Final grades, once submitted by the instructor and officially received by the University Registrar, are considered final and may not be changed except through proper petition supported by sufficient justification and approved by the University Registrar.</li>
        <li>The General Weighted Average (GWA) is computed using only academic units (excluding PE/NSTP). Only final passing grades count toward academic units earned. INC and 4.0 grades are included after removal; 5.0 grades earn no units.</li>
      </ol>
    </div>
    <div class="tnc-section">
      <div class="tnc-section-title">II. Request for Dropping and Change of Course</div>
      <ol class="tnc-list">
        <li>A student may drop a course during the officially designated Change/Drop period. No course may be dropped after this period without a written petition approved by the Dean and the University Registrar.</li>
        <li>Dropping a course after the permitted period, without official approval, shall result in a grade of 5.0 for that course.</li>
        <li>A Change/Drop request after finalization of enrollment must be submitted through the Academic Information System within the Change/Drop window. The request is subject to review and approval by the Office of the University Registrar (OCS).</li>
        <li>Approved Change/Drop requests reopen the student's enrollment for modification. The student must re-finalize enrollment after completing all changes. Failure to re-finalize within the prescribed period shall nullify the approved request.</li>
        <li>A student may not drop a course if it is a co-requisite or prerequisite that another enrolled course depends on, without also dropping the dependent course.</li>
        <li>All dropping and change requests shall be reflected in the student's official academic record. A grade of DRP shall be recorded for officially dropped courses.</li>
      </ol>
    </div>
    <div class="tnc-section">
      <div class="tnc-section-title">III. Removal and Completion of Grades (INC / 4.0)</div>
      <ol class="tnc-list">
        <li>A student who receives a grade of 4.0 or INC has one (1) academic year, equivalent to three (3) consecutive terms, from the term the grade was incurred, to remove or complete the grade through examination or submission of required coursework.</li>
        <li>The removal or completion examination shall be administered by the original course instructor. In the absence of the instructor, the Department Chair or designated faculty member shall administer the examination.</li>
        <li>A student with an INC or 4.0 grade is NOT permitted to re-enroll in the same course during the entire prescription period. Re-enrollment in the course is only allowed once the grade has been officially removed or after the prescription period has lapsed.</li>
        <li>Failure to remove a grade of 4.0 or complete an INC within the prescribed one-year prescription period shall result in an automatic final grade of 5.0 (Failure). This conversion is irreversible.</li>
        <li>The instructor must submit the removal or completion grade via the official Form 13C (Report of Removal/Completion of Grade) through the AIS within the allowable period. The completed form, duly signed and received by the Office of the University Registrar, shall form part of the student's permanent academic record.</li>
        <li>This certificate is a computer-generated document. To be valid, it must bear the original signature of the student and the signature and dry seal of the University Registrar. Any unauthorized alteration renders this document null and void.</li>
      </ol>
    </div>
  </div>

</body></html>`;
    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.print(); }, 600);
  };

  // ── Underload Approval Document (OCS-style) ───────────────────────────────
  const generateUnderloadApprovalDoc = (app: typeof myUnderloadApp) => {
    if (!app || app.status !== 'approved') return;
    const ps = state.portalSettings;
    const instName = ps.institutionName || ps.portalName || 'University';
    const logoUrl = ps.logoUrl ?? '';
    const termName = activeTerm.name;
    const dateIssued = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
    const approvedDate = app.processedAt
      ? new Date(app.processedAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
      : dateIssued;
    const processor = app.processedBy
      ? (state.users.find(u => u.id === app.processedBy || u.username === app.processedBy)?.name ?? app.processedBy)
      : 'Office of the College Secretary';

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8" />
<style>
  @page { size: A4 portrait; margin: 18mm 20mm; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .hdr { display: flex; align-items: center; gap: 12px; justify-content: center; margin-bottom: 6px; }
  .logo { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 1.5px solid #ccc; }
  .hdr-text { text-align: center; }
  .inst { font-size: 15px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; }
  .sub { font-size: 10px; color: #444; margin-top: 1px; }
  .doc-title { font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 3px; color: #4a0000; }
  hr { border: none; border-top: 2.5px solid #4a0000; margin: 7px 0 4px; }
  .ref-line { display: flex; justify-content: space-between; font-size: 9px; color: #555; margin-bottom: 12px; }
  .info { border: 1px solid #999; margin-bottom: 14px; }
  .info-row { display: flex; }
  .info-row + .info-row { border-top: 1px solid #ccc; }
  .info-cell { padding: 6px 12px; flex: 1; }
  .info-cell + .info-cell { border-left: 1px solid #ccc; }
  .lbl { font-size: 8px; color: #666; text-transform: uppercase; letter-spacing: 0.04em; }
  .val { font-size: 11.5px; font-weight: bold; margin-top: 2px; }
  .body-text { font-size: 11px; line-height: 1.7; margin-bottom: 12px; }
  .reason-box { border: 1px solid #ccc; background: #fafafa; padding: 10px 14px; font-size: 11px; font-style: italic; margin: 10px 0 14px; line-height: 1.6; }
  .status-badge { display: inline-block; background: #006600; color: #fff; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.08em; padding: 3px 10px; border-radius: 3px; margin-bottom: 12px; }
  .response-box { border-left: 3px solid #4a0000; padding: 6px 12px; font-size: 10.5px; color: #333; margin-bottom: 14px; background: #fff8f8; }
  .sigs { display: flex; gap: 20px; margin-top: 28px; }
  .sb { flex: 1; text-align: center; }
  .sn { font-size: 11px; font-weight: bold; min-height: 22px; }
  .sl { border-top: 1px solid #000; margin: 6px 0 2px; }
  .sd { font-size: 8px; text-transform: uppercase; letter-spacing: 0.04em; color: #444; }
  .footer { font-size: 7.5px; color: #777; text-align: center; margin-top: 28px; border-top: 0.5px solid #bbb; padding-top: 6px; }
</style>
</head><body>
  <div class="hdr">
    ${logoUrl ? `<img class="logo" src="${logoUrl}" alt="Logo" />` : ''}
    <div class="hdr-text">
      <div class="inst">${instName}</div>
      <div class="sub">Office of the College Secretary</div>
      <div class="doc-title">Underload Application Approval</div>
    </div>
  </div>
  <hr />
  <div class="ref-line">
    <span>AIS Document · Underload Clearance</span>
    <span>${termName}</span>
  </div>

  <div class="info">
    <div class="info-row">
      <div class="info-cell"><div class="lbl">Student Name</div><div class="val">${student.name.toUpperCase()}</div></div>
      <div class="info-cell"><div class="lbl">Student Number</div><div class="val">${student.studentNumber ?? '—'}</div></div>
      <div class="info-cell"><div class="lbl">Date Issued</div><div class="val">${dateIssued}</div></div>
    </div>
    <div class="info-row">
      <div class="info-cell"><div class="lbl">Program / Course</div><div class="val">${student.program ?? '—'}</div></div>
      <div class="info-cell"><div class="lbl">Academic Term</div><div class="val">${termName}</div></div>
      <div class="info-cell"><div class="lbl">Units Enlisted</div><div class="val">${currentUnits} academic unit${currentUnits !== 1 ? 's' : ''}</div></div>
    </div>
  </div>

  <div class="status-badge">APPROVED</div>

  <div class="body-text">
    This is to certify that the underload application of <strong>${student.name.toUpperCase()}</strong>,
    enrolled in <strong>${student.program ?? '—'}</strong> for <strong>${termName}</strong>,
    has been reviewed and <strong>approved</strong> by the Office of the College Secretary on <strong>${approvedDate}</strong>.
    The student is officially recognized as an underload enrollee and remains eligible for scholastic standing evaluation
    for this term.
  </div>

  <div class="lbl" style="margin-bottom:4px;">Reason Submitted by Student</div>
  <div class="reason-box">${app.reason || '—'}</div>

  ${app.response ? `<div class="lbl" style="margin-bottom:4px;">OCS Remarks</div><div class="response-box">${app.response}</div>` : ''}

  <div class="sigs">
    <div class="sb">
      <div class="sn">${student.name}</div>
      <div class="sl"></div>
      <div class="sd">Student's Signature &amp; Date</div>
    </div>
    <div class="sb">
      <div class="sn">${processor}</div>
      <div class="sl"></div>
      <div class="sd">College Secretary / OCS</div>
    </div>
  </div>
  <div class="footer">
    This document is computer-generated. It is valid only when bearing the signature of the authorized OCS officer and the official dry seal of the Office of the College Secretary.
    Any unauthorized alteration renders this document null and void. · Issued: ${dateIssued}
  </div>
</body></html>`;
    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.print(); }, 600);
  };

 const myEnrollments = state.enrollments.filter(e => e.studentId === student.id && e.termId === activeTerm.id && e.status !== 'dropped');
  // Deduplicate by section_id first, then by course_id — prevents double-row from same or same-named courses
  const seenSectionIds = new Set<string>();
  const seenCourseIds = new Set<string>();
  const myEnrolledSections = myEnrollments
    .map(e => state.sections.find(s => s.id === e.sectionId))
    .filter(Boolean)
    .filter(s => {
      if (s!.sectionCode === '__MANUAL__') return false; // hide OCS manual grade entries
      if (seenSectionIds.has(s!.id)) return false;
      seenSectionIds.add(s!.id);
      if (seenCourseIds.has(s!.courseId)) return false; // same course enrolled twice — show only first
      seenCourseIds.add(s!.courseId);
      return true;
    }) as Section[];
  const availableSections = state.sections.filter(s => s.termId === activeTerm.id && s.sectionCode !== '__MANUAL__');
  const currentUnits = getCurrentUnits(student.id, activeTerm.id);
  const maxUnits = activeTerm.studentMaxUnitsOverrides?.[student.id] ?? activeTerm.maxUnits ?? 21;
  // PE/NSTP units already enlisted — capped at 6 per semester (separate pool)
  const myPeNstpUnits = myEnrolledSections.reduce((acc, s) => {
    const c = state.courses.find(x => x.id === s.courseId);
    return c && (c.isPE || c.isNSTP) ? acc + c.units + (c.labUnits ?? 0) : acc;
  }, 0);

  // Search / filter — results only shown after Apply is clicked (filterApplied = true)
  const searchedSections = filterApplied
    ? availableSections.filter(s => {
        const course = state.courses.find(c => c.id === s.courseId);
        if (!course) return false;
        const q = search.toLowerCase().trim();
        const matchCourse = !q || course.code.toLowerCase().includes(q); // course code only (no title match)
        const matchSection = !sectionSearch.trim() || s.sectionCode.toLowerCase().includes(sectionSearch.toLowerCase().trim());
        const matchStatus = !statusFilter || statusFilter === 'all' || (statusFilter === 'open' && s.enrolled < s.slots);
        return matchCourse && matchSection && matchStatus;
      })
    : [];

  // ── Helpers ─────────────────────────────────────────────────────────
  const checkEnrollmentSchedule = (): string | null => {
    if (hasApprovedLateEnlistThisTerm) return null; // OCS-approved late enlistment bypasses schedule
    if (hasApprovedChangeDropRequest) return null;  // OCS-approved change/drop bypasses schedule
    if (!enrollSched?.slots?.length) return null;
    if (isPhase3Today) return null; // Phase 3 (Change of Matriculation) is open to all students
    // Check if Phase 3 date exists for today but time hasn't started yet
    if (phase3SlotToday && !isPhase3Today) {
      if (phase3SlotToday.startTime && currentTime < phase3SlotToday.startTime)
        return `Change of Matriculation period opens at ${phase3SlotToday.startTime} today.`;
      if (phase3SlotToday.endTime && currentTime > phase3SlotToday.endTime)
        return `Change of Matriculation period closed at ${phase3SlotToday.endTime} today.`;
    }
    const todaySlot = enrollSched.slots.find(s => s.date === today && (s.phase as number) !== 3);
    if (!todaySlot) return 'Enrollment is not scheduled for today.';
    if (!matchesEnrollPrefix(todaySlot.idPrefixes)) return `Your student ID (${studentNum || 'unknown'}) is not scheduled for today. Check the schedule below.`;
    // Time-based messages
    if (todaySlot.startTime && currentTime < todaySlot.startTime) return `Enrollment for today opens at ${todaySlot.startTime}. Please come back later.`;
    if (todaySlot.endTime && currentTime > todaySlot.endTime) return `Enrollment for today closed at ${todaySlot.endTime}.`;
    return null;
  };

  const checkOverlap = (sec: Section) =>
    myEnrolledSections.some(e =>
      schedulesOverlap(e.schedule, sec.schedule) ||
      (sec.labSchedule && schedulesOverlap(e.schedule, sec.labSchedule)) ||
      (e.labSchedule && schedulesOverlap(e.labSchedule, sec.schedule))
    );

  const getSectionInfo = (sec: Section) => {
    const course = state.courses.find(c => c.id === sec.courseId);
    const faculty = state.users.find(u => u.id === sec.facultyId);
    const enrolled = myEnrollments.find(e => e.sectionId === sec.id);
    const isFull = sec.enrolled >= sec.slots;
    const hasOverlap = !enrolled && checkOverlap(sec);
    const isCourseDuplicate = !enrolled && course
      ? myEnrollments.some(e => { const es = state.sections.find(s => s.id === e.sectionId); return es?.courseId === course.id; })
      : false;
    const cartSections = cart.filter(id => id !== sec.id).map(id => state.sections.find(s => s.id === id)).filter(Boolean) as Section[];
    const hasCartOverlap = !enrolled && cartSections.some(cs =>
      schedulesOverlap(sec.schedule, cs.schedule) ||
      (sec.labSchedule ? schedulesOverlap(sec.labSchedule, cs.schedule) : false) ||
      (cs.labSchedule ? schedulesOverlap(sec.schedule, cs.labSchedule) : false)
    );
    const isCartDuplicate = !enrolled && !!course && cartSections.some(cs => cs.courseId === course.id);
    const prereqCheck = course ? checkPrerequisites(student.id, course.id) : { passed: true, missing: [] };
    const coreqCheck = course ? checkCorequisites(student.id, course.id, activeTerm.id, cart) : { passed: true, missing: [] };
    const unitCheck = (() => {
      if (!course) return { ok: true, adding: 0, isPeNstp: false };
      const adding = course.units + (course.labUnits ?? 0);
      if (course.isPE || course.isNSTP) {
        // PE/NSTP: separate 6-unit pool (does not count toward maxUnits)
        const cartPeNstpUnits = cartSections.reduce((acc, s) => {
          const c = state.courses.find(x => x.id === s.courseId);
          return c && (c.isPE || c.isNSTP) ? acc + c.units + (c.labUnits ?? 0) : acc;
        }, 0);
        return { ok: myPeNstpUnits + cartPeNstpUnits + adding <= 6, adding, isPeNstp: true };
      }
      return { ok: currentUnits + adding <= maxUnits, adding, isPeNstp: false };
    })();
    const hasApprovedPrerog = !!state.prerogatives.find(p => p.studentId === student.id && p.sectionId === sec.id && p.termId === activeTerm.id && p.status === 'approved');
    const consentRecord = state.consents.find(c => c.studentId === student.id && c.sectionId === sec.id && c.termId === activeTerm.id);
    const needsCOI = (course?.requiresCOI ?? false) && consentRecord?.coiStatus !== 'approved';
    const needsDC = (course?.requiresDeptConsent ?? false) && consentRecord?.deptConsentStatus !== 'approved';
    const needsOCS = (course?.requiresOCSConsent ?? false) && consentRecord?.ocsConsentStatus !== 'approved';
    const consentBlocked = needsCOI || needsDC || needsOCS;
    // OCS "Waiver of Pre-requisite" bypasses the prerequisite check regardless of requiresOCSConsent flag
    const hasOCSPrereqWaiver =
      consentRecord?.ocsConsentStatus === 'approved' &&
      consentRecord?.ocsConsentType === 'Waiver of Pre-requisite';
    const effectivePrereqCheck = hasOCSPrereqWaiver ? { passed: true, missing: [] } : prereqCheck;
    // INC restriction: student cannot re-enroll in a course where they have an active uncompleted INC
    const incRestricted = !enrolled && !!course && isIncEnrollmentRestricted(
      student.id, course.id, state.grades, state.sections, state.terms
    );
    // Specialization restriction: Specialized courses require an approved plan containing this course
    const specializationBlocked = !enrolled && !!course &&
      course.category === 'Specialized' &&
      !(state.specializationRequests ?? []).find(
        r => r.studentId === student.id && r.status === 'approved' && r.courseIds.includes(course.id)
      );
    // GE Elective restriction: Elective GE courses require an approved GE Elective plan containing this course
    const geElectiveBlocked = !enrolled && !!course &&
      course.category === 'Elective GE' &&
      !(state.geElectiveRequests ?? []).find(
        r => r.studentId === student.id && r.status === 'approved' && r.courseIds.includes(course.id)
      );
    return { course, faculty, enrolled: !!enrolled, isFull, hasOverlap, isCourseDuplicate, hasCartOverlap, isCartDuplicate, prereqCheck: effectivePrereqCheck, coreqCheck, unitCheck, hasApprovedPrerog, consentBlocked, incRestricted, specializationBlocked, geElectiveBlocked };
  };

  // ── Finalization validation ────────────────────────────────────────────────
  const totalEnrolledAcademicUnits = myEnrolledSections.reduce((sum, sec) => {
    const course = state.courses.find(c => c.id === sec.courseId);
    if (!course || course.isPE || course.isNSTP) return sum;
    return sum + course.units + (course.labUnits ?? 0);
  }, 0);
  const finalizeIssues: { courseCode: string; problem: string }[] = !isFinalized
    ? [
        // Per-section: prerequisites, corequisites, schedule overlaps, INC restriction
        ...myEnrolledSections.flatMap(sec => {
          const info = getSectionInfo(sec);
          const issues: { courseCode: string; problem: string }[] = [];
          const code = info.course?.code ?? sec.sectionCode;
          if (!info.prereqCheck.passed) issues.push({ courseCode: code, problem: `Missing prerequisite: ${info.prereqCheck.missing.join(', ')}` });
          if (!info.coreqCheck.passed) issues.push({ courseCode: code, problem: `Missing corequisite: ${info.coreqCheck.missing.join(', ')}` });
          if (info.hasOverlap) issues.push({ courseCode: code, problem: 'Schedule conflict with another enlisted course' });
          if (info.incRestricted) issues.push({ courseCode: code, problem: 'INC restriction — complete removal exam first' });
          return issues;
        }),
        // Unit limit: only block if total EXCEEDS max (equal is allowed)
        ...(totalEnrolledAcademicUnits > maxUnits
          ? [{ courseCode: 'Unit Limit', problem: `Total enrolled units (${totalEnrolledAcademicUnits}) exceed the maximum unit load of ${maxUnits} units` }]
          : []),
      ]
    : [];

  // ── Handlers ────────────────────────────────────────────────────────
  const handleDrop = (sectionId: string) => {
    const result = dropSection(student.id, sectionId, activeTerm.id);
    if (result.success) toast.success('Section dropped', { description: result.message });
    else toast.error('Cannot drop', { description: result.message });
  };

  // Pre-finalization removal (no DRP grade)
  const handleRemove = (sectionId: string) => {
    const result = removeSection(student.id, sectionId, activeTerm.id);
    if (result.success) toast.success('Course removed', { description: result.message });
    else toast.error('Cannot remove', { description: result.message });
  };

  const addToCart = (sectionId: string) => {
    if (isFinalized && !appealBypass) return;
    if (cart.includes(sectionId)) return;
    const sec = state.sections.find(s => s.id === sectionId);
    const courseId = sec?.courseId;
    const course = courseId ? state.courses.find(c => c.id === courseId) : undefined;
    // Specialization restriction
    if (course?.category === 'Specialized') {
      const approvedSpec = (state.specializationRequests ?? []).find(
        r => r.studentId === student.id && r.status === 'approved' && r.courseIds.includes(course.id)
      );
      if (!approvedSpec) {
        toast.error('Specialization Plan Required', { description: `${course.code} is a Specialized course. Submit an approved Specialization Plan via the Specialization Planner first.` });
        return;
      }
    }
    // Restrict: cannot add same course code if already enlisted or already in cart
    if (courseId) {
      const alreadyEnlisted = myEnrollments.some(e => {
        const s = state.sections.find(x => x.id === e.sectionId);
        return s?.courseId === courseId;
      });
      if (alreadyEnlisted) { toast.error('Already Enlisted', { description: 'You are already enlisted in this course for this term.' }); return; }
      const inCartAlready = cart.some(id => {
        const s = state.sections.find(x => x.id === id);
        return s?.courseId === courseId;
      });
      if (inCartAlready) { toast.error('Already in Cart', { description: 'This course is already in your cart.' }); return; }
    }
    setCart(c => [...c, sectionId]);
  };

  const removeFromCart = (sectionId: string) => setCart(c => c.filter(id => id !== sectionId));

  // Core enlistment action (called after all checks pass)
  const performEnlist = async (sec: Section): Promise<boolean> => {
    setEnlisting(sec.id);
    const result = await enlistSection(student.id, sec.id, activeTerm.id, cart);
    setEnlisting(null);
    if (result.success) { setEnlistWarning(null); }
    if (result.success) toast.success('Enlisted!', { description: result.message });
    else toast.error('Enlistment failed', { description: result.message });
    return result.success;
  };

  const handleEnlist = async (sec: Section): Promise<boolean> => {
    const { isFull, hasOverlap, isCourseDuplicate, prereqCheck, coreqCheck, unitCheck, course, hasApprovedPrerog, specializationBlocked, geElectiveBlocked } = getSectionInfo(sec);
    if (isFinalized && !appealBypass) { toast.error('Enlistment finalized'); return false; }
    if (!effectiveEnlistmentOpen) { toast.error('Enlistment is closed'); return false; }
    const schedError = checkEnrollmentSchedule();
    if (schedError) { toast.error('Not your enrollment day', { description: schedError }); return false; }
    if (specializationBlocked) { toast.error('Specialization Plan Required', { description: `${course?.code ?? 'This course'} is a Specialized course. Submit an approved Specialization Plan via the Specialization Planner before enlisting.` }); return false; }
    if (geElectiveBlocked) { toast.error('GE Elective Plan Required', { description: `${course?.code ?? 'This course'} is an Elective GE course. Submit an approved GE Elective Plan via the GE Electives module before enlisting.` }); return false; }
    if (hasOverlap) { showWarning(course?.code ?? sec.sectionCode, sec.sectionCode, ['Schedule conflict with an already enlisted course.']); return false; }
    if (isCourseDuplicate) { showWarning(course?.code ?? sec.sectionCode, sec.sectionCode, ['Already enlisted in another section of this course.']); return false; }
    if (!prereqCheck.passed) { showWarning(course?.code ?? sec.sectionCode, sec.sectionCode, [`Prerequisites not satisfied — missing: ${prereqCheck.missing.join(', ')}`]); return false; }
    if (!coreqCheck.passed) { showWarning(course?.code ?? sec.sectionCode, sec.sectionCode, [`Corequisites not satisfied — must also enlist: ${coreqCheck.missing.join(', ')}`]); return false; }
    if (!unitCheck.ok) { toast.error('Unit limit exceeded', { description: unitCheck.isPeNstp ? 'Would exceed the 6-unit PE/NSTP limit per semester.' : `Would exceed your ${maxUnits} unit limit.` }); return false; }
    if (isFull && !hasApprovedPrerog) {
      if (prerogativeOpen) {
        toast.success('Section is full', { description: 'Go to Prerogatives to submit a request.' });
        navigate('/student/prerogatives');
      } else {
        toast.error('Section is full', { description: 'Prerogatives are not currently open.' });
      }
      return false;
    }
    // POS hard block: course must be in the student's Plan of Study
    if (posAllCourseIds.size > 0 && course && !posAllCourseIds.has(course.id)) {
      toast.error('Not in Your Plan of Study', { description: `${course.code} is not part of your Plan of Study. Contact your OCS to update your plan before enlisting.` });
      return false;
    }
    return performEnlist(sec);
  };

  const handleBulkEnlist = async () => {
    if (!effectiveEnlistmentOpen) { toast.error('Enlistment is closed'); return; }
    const schedError = checkEnrollmentSchedule();
    if (schedError) { toast.error('Not your enrollment day', { description: schedError }); return; }
    let successCount = 0;
    let skippedUnits = 0; // sections skipped because they would exceed unit limit
    const failures: { code: string; section: string; reasons: string[] }[] = [];
    const batchEnlisted: Section[] = [];
    // Running unit totals — grow as we successfully enlist
    let runningUnits = currentUnits;
    let runningPeNstpUnits = myPeNstpUnits; // separate 6-unit PE/NSTP pool
    // Iterate over cartRows (filtered: active term, not yet enlisted) instead of raw cart
    for (const sec of cartRows) {
      const sectionId = sec.id;
      // cartRows already excludes enrolled sections — no need for alreadyEnlisted check here
      const { isFull, hasOverlap, isCourseDuplicate, hasCartOverlap, isCartDuplicate, prereqCheck, coreqCheck, unitCheck, hasApprovedPrerog: batchPrerog, specializationBlocked: batchSpecBlocked, geElectiveBlocked: batchGeBlocked } = getSectionInfo(sec);
      const course = state.courses.find(c => c.id === sec.courseId);
      const batchOverlap = batchEnlisted.some(bs =>
        schedulesOverlap(sec.schedule, bs.schedule) ||
        (sec.labSchedule ? schedulesOverlap(sec.labSchedule, bs.schedule) : false) ||
        (bs.labSchedule ? schedulesOverlap(sec.schedule, bs.labSchedule) : false)
      );
      const batchDuplicate = !!course && batchEnlisted.some(bs => bs.courseId === course.id);

      const reasons: string[] = [];
      if (batchSpecBlocked) reasons.push('No approved Specialization Plan for this course — submit via Specialization Planner');
      if (batchGeBlocked) reasons.push('No approved GE Elective Plan for this course — submit via GE Electives module');
      if (posAllCourseIds.size > 0 && course && !posAllCourseIds.has(course.id)) reasons.push('Course is not in your Plan of Study — contact OCS to update your plan');
      if (isFull && !batchPrerog) reasons.push('Section is full');
      if (hasOverlap || batchOverlap) reasons.push('Schedule conflict with enrolled courses');
      if (hasCartOverlap || isCartDuplicate || batchDuplicate) reasons.push('Conflict with another bookmarked course');
      if (isCourseDuplicate) reasons.push('Already enlisted in this course');
      if (!prereqCheck.passed) reasons.push(`Prerequisites not met — missing: ${prereqCheck.missing.join(', ')}`);
      if (!coreqCheck.passed) reasons.push(`Corequisites not satisfied — must also enlist: ${coreqCheck.missing.join(', ')}`);

      // Unit check: regular max units OR PE/NSTP 6-unit pool
      const wouldExceed = unitCheck.isPeNstp
        ? (runningPeNstpUnits + unitCheck.adding) > 6
        : maxUnits > 0 && (runningUnits + unitCheck.adding) > maxUnits;
      if (wouldExceed) {
        // Keep in cart silently — just skip; user sees it remain as "bookmarked" with the unit warning badge
        skippedUnits++;
        continue;
      }

      if (reasons.length > 0) {
        failures.push({ code: course?.code ?? sec.sectionCode, section: sec.sectionCode, reasons });
        continue;
      }
      setEnlisting(sectionId);
      const result = await enlistSection(student.id, sectionId, activeTerm.id, cart);
      setEnlisting(null);
      if (result.success) {
        successCount++;
        if (unitCheck.isPeNstp) runningPeNstpUnits += unitCheck.adding;
        else runningUnits += unitCheck.adding;
        batchEnlisted.push(sec);
      } else {
        failures.push({ code: course?.code ?? sec.sectionCode, section: sec.sectionCode, reasons: [result.message ?? 'Enlistment failed'] });
      }
    }
    // Cart is NOT cleared — students keep their planning list intact
    const failCount = failures.length;
    if (failCount > 0) {
      setBulkFailures(failures);
    }
    if (successCount > 0) {
      const skippedMsg = skippedUnits > 0 ? ` ${skippedUnits} skipped (unit limit).` : '';
      toast.success(`${successCount} course${successCount > 1 ? 's' : ''} enlisted!`, { description: `Enlistment complete.${skippedMsg}` });
    }
  };

  // ── Timetable ────────────────────────────────────────────────────────
  const enrolledSectionIds = new Set(myEnrolledSections.map(s => s.id));
  const enrolledCourseIds = new Set(myEnrolledSections.map(s => s.courseId));
  // Cart display arrays: active term only + exclude already-enlisted sections/courses
  const cartSectionsArr = cart
    .map(id => state.sections.find(s => s.id === id))
    .filter(Boolean)
    .filter(s => s!.termId === activeTerm.id && !enrolledSectionIds.has(s!.id) && !enrolledCourseIds.has(s!.courseId)) as Section[];

  // Compute dynamic time range from actual section data
  const allTimedSections = [...myEnrolledSections, ...cartSectionsArr];
  const timedEntries = allTimedSections.flatMap(s => {
    const entries = [];
    if (s.schedule?.startTime && s.schedule?.endTime && s.schedule.days?.length) entries.push({ start: s.schedule.startTime, end: s.schedule.endTime });
    if (s.labSchedule?.startTime && s.labSchedule?.endTime && s.labSchedule.days?.length) entries.push({ start: s.labSchedule.startTime, end: s.labSchedule.endTime });
    return entries;
  });
  const START_HOUR = timedEntries.length ? Math.max(6, Math.floor(Math.min(...timedEntries.map(e => toMinutes(e.start))) / 60) - 1) : 7;
  const END_HOUR = timedEntries.length ? Math.min(22, Math.ceil(Math.max(...timedEntries.map(e => toMinutes(e.end))) / 60) + 1) : 9;
  const TOTAL_MINS = (END_HOUR - START_HOUR) * 60;
  const HOUR_PX = 52;
  const GRID_HEIGHT = (END_HOUR - START_HOUR) * HOUR_PX;
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

  const renderTimetable = () => (
    <div className="flex flex-col">
        {timedEntries.length > 0 && (
          <>
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          <div className="text-[10px] text-gray-400 text-right pr-1">Time</div>
          {DAYS.map(d => <div key={d} className="text-[10px] font-semibold text-gray-600 text-center">{DAY_LABELS[d]}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-0.5" style={{ height: GRID_HEIGHT }}>
          <div className="relative">
            {hours.filter((_, i) => i % 2 === 0).map(h => (
              <div key={h} className="absolute right-0.5 text-[9px] text-gray-400 leading-none" style={{ top: `${((h - START_HOUR) * 60 / TOTAL_MINS) * 100}%` }}>
                {h === 12 ? '12p' : h < 12 ? `${h}a` : `${h - 12}p`}
              </div>
            ))}
          </div>
          {DAYS.map(day => (
            <div key={day} className="relative border border-gray-200 rounded bg-gray-50/50">
              {hours.map(h => <div key={h} className="absolute w-full border-t border-gray-100/80" style={{ top: `${((h - START_HOUR) * 60 / TOTAL_MINS) * 100}%` }} />)}
              {myEnrolledSections.map((sec, ci) => {
                const course = state.courses.find(c => c.id === sec.courseId);
                const color = COLORS[ci % COLORS.length];
                return (
                  <React.Fragment key={sec.id}>
                    {sec.schedule.days.includes(day) && (() => {
                      const top = toMinutes(sec.schedule.startTime) - START_HOUR * 60;
                      const height = toMinutes(sec.schedule.endTime) - toMinutes(sec.schedule.startTime);
                      return (
                        <div className={`absolute w-[95%] left-[2.5%] rounded border text-[9px] px-0.5 py-0.5 overflow-hidden ${color}`} style={{ top: `${(top / TOTAL_MINS) * 100}%`, height: `${(height / TOTAL_MINS) * 100}%` }}>
                          <p className="font-bold truncate leading-tight">{course?.code}</p>
                          <p className="truncate opacity-80 leading-tight">{sec.schedule.startTime}–{sec.schedule.endTime}</p>
                          {sec.schedule.room && <p className="truncate opacity-70 leading-tight">{sec.schedule.room}</p>}
                        </div>
                      );
                    })()}
                    {sec.labSchedule?.days.includes(day) && (() => {
                      const top = toMinutes(sec.labSchedule!.startTime) - START_HOUR * 60;
                      const height = toMinutes(sec.labSchedule!.endTime) - toMinutes(sec.labSchedule!.startTime);
                      return (
                        <div className={`absolute w-[88%] left-[6%] rounded border text-[9px] px-0.5 py-0.5 overflow-hidden ${color} border-dashed opacity-85`} style={{ top: `${(top / TOTAL_MINS) * 100}%`, height: `${(height / TOTAL_MINS) * 100}%` }}>
                          <p className="font-bold truncate leading-tight">{course?.code} Lab</p>
                          <p className="truncate opacity-80 leading-tight">{sec.labSchedule!.startTime}–{sec.labSchedule!.endTime}</p>
                          {sec.labSchedule!.room && <p className="truncate opacity-70 leading-tight">{sec.labSchedule!.room}</p>}
                        </div>
                      );
                    })()}
                  </React.Fragment>
                );
              })}
              {!isFinalized && cartSectionsArr.map(sec => {
                const course = state.courses.find(c => c.id === sec.courseId);
                const hasConflict = myEnrolledSections.some(e => schedulesOverlap(e.schedule, sec.schedule));
                const cls = hasConflict ? 'bg-red-100/80 border-red-400 text-red-900 border-dashed' : 'bg-gray-100/90 border-gray-400 text-gray-700 border-dashed';
                return (
                  <React.Fragment key={`cart-${sec.id}`}>
                    {sec.schedule.days.includes(day) && (() => {
                      const top = toMinutes(sec.schedule.startTime) - START_HOUR * 60;
                      const height = toMinutes(sec.schedule.endTime) - toMinutes(sec.schedule.startTime);
                      return (
                        <div className={`absolute w-[95%] left-[2.5%] rounded border-2 text-[9px] px-0.5 py-0.5 overflow-hidden opacity-75 ${cls}`} style={{ top: `${(top / TOTAL_MINS) * 100}%`, height: `${(height / TOTAL_MINS) * 100}%`, zIndex: 5 }}>
                          <p className="font-bold truncate leading-tight">{course?.code}</p>
                          <p className="truncate opacity-80 text-[8px] leading-tight">{sec.schedule.startTime}–{sec.schedule.endTime}</p>
                          {sec.schedule.room && <p className="truncate opacity-70 text-[8px] leading-tight">{sec.schedule.room}</p>}
                        </div>
                      );
                    })()}
                    {sec.labSchedule?.days.includes(day) && (() => {
                      const top = toMinutes(sec.labSchedule!.startTime) - START_HOUR * 60;
                      const height = toMinutes(sec.labSchedule!.endTime) - toMinutes(sec.labSchedule!.startTime);
                      return (
                        <div className={`absolute w-[88%] left-[6%] rounded border-2 text-[9px] px-0.5 py-0.5 overflow-hidden opacity-65 ${cls}`} style={{ top: `${(top / TOTAL_MINS) * 100}%`, height: `${(height / TOTAL_MINS) * 100}%`, zIndex: 5 }}>
                          <p className="font-bold truncate leading-tight">{course?.code} Lab</p>
                          <p className="truncate opacity-80 text-[8px] leading-tight">{sec.labSchedule!.startTime}–{sec.labSchedule!.endTime}</p>
                          {sec.labSchedule!.room && <p className="truncate opacity-70 text-[8px] leading-tight">{sec.labSchedule!.room}</p>}
                        </div>
                      );
                    })()}
                  </React.Fragment>
                );
              })}
            </div>
          ))}
        </div>
          </>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          {myEnrolledSections.map((sec, ci) => {
            const course = state.courses.find(c => c.id === sec.courseId);
            const color = COLORS[ci % COLORS.length];
            return <span key={sec.id} className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${color}`}><span className="w-2 h-2 rounded-full bg-current opacity-60"></span>{course?.code} Sec {sec.sectionCode}</span>;
          })}
          {!isFinalized && cartSectionsArr.map(sec => {
            const course = state.courses.find(c => c.id === sec.courseId);
            return <span key={`cart-${sec.id}`} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border-2 border-dashed border-gray-400 text-gray-600 bg-gray-50"><span className="w-2 h-2 rounded-full bg-gray-400"></span>{course?.code} (Bookmarked)</span>;
          })}
        </div>
      </div>
  );

  // ── Active Enlistment rows ───────────────────────────────────────────
  const cartRows = cart
    .map(id => state.sections.find(s => s.id === id))
    .filter(Boolean)
    .filter(s => s!.termId === activeTerm.id && !enrolledSectionIds.has(s!.id) && !enrolledCourseIds.has(s!.courseId)) as Section[];

  // ── Reconsideration (PD) ─────────────────────────────────────────────
  const latestRequest = [...(state.reconsiderationRequests ?? [])]
    .filter(r => r.studentId === student.id && r.termId === activeTerm.id && (!r.requestType || r.requestType === 'pd_reconsideration'))
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))[0];

  // ── Late Enlistment Request ───────────────────────────────────────────
  const latestLateRequest = [...(state.reconsiderationRequests ?? [])]
    .filter(r => r.studentId === student.id && r.termId === activeTerm.id && r.requestType === 'late_enlistment')
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))[0];

  return (
    <PortalLayout role="student" userName={student.name}>
      <div className="space-y-4">

        {/* ── Permanently Disqualified Banner ─────────────────────────── */}
        {isDisqualified && (() => {
          const noPending = !latestRequest || latestRequest.status !== 'pending';
          return (
            <>
              <div className="rounded-xl border border-red-200 bg-red-50/70">
                <div className="pt-3 pb-3 px-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <Lock className="w-5 h-5 text-red-600 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-red-900">Enlistment Locked — Permanent Disqualification</p>
                        <p className="text-xs text-red-700 mt-0.5">You cannot enlist. Submit a reconsideration request to the OCS.</p>
                      </div>
                    </div>
                    {noPending && (
                      <Button size="sm" variant="outline" className="border-red-400 text-red-700 hover:bg-red-100"
                        onClick={() => setShowReconDialog(true)}>Request Reconsideration</Button>
                    )}
                  </div>
                </div>
              </div>
              {latestRequest?.status === 'pending' && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70">
                  <div className="pt-3 pb-3 px-4 flex items-center gap-3">
                    <RefreshCw className="w-4 h-4 text-yellow-600 flex-shrink-0 animate-spin" />
                    <p className="text-sm text-yellow-800">Your reconsideration request is pending OCS review.</p>
                  </div>
                </div>
              )}
              {latestRequest?.status === 'denied' && (
                <div className="rounded-xl border border-red-200 bg-red-50/70">
                  <div className="pt-3 pb-3 px-4 flex items-center gap-3">
                    <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-red-800">Reconsideration Request — DENIED</p>
                      {latestRequest.response && <p className="text-xs text-red-700">OCS: "{latestRequest.response}"</p>}
                    </div>
                  </div>
                </div>
              )}
              <Dialog open={showReconDialog} onOpenChange={v => { setShowReconDialog(v); if (!v) setReconReason(''); }}>
                <DialogContent className="max-w-md">
                  <DialogHeader><DialogTitle className="flex items-center gap-2"><MessageSquare className="w-5 h-5 text-primary" />Request Reconsideration</DialogTitle></DialogHeader>
                  <div className="space-y-4 mt-2">
                    <p className="text-sm text-muted-foreground">Explain your case. The OCS will review and may reinstate your privileges.</p>
                    <div><Label>Reason <span className="text-red-500">*</span></Label>
                      <Textarea rows={4} placeholder="Explain why this should be reconsidered..." value={reconReason} onChange={e => setReconReason(e.target.value)} className="mt-1" />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => { setShowReconDialog(false); setReconReason(''); }}>Cancel</Button>
                      <Button className="flex-1" disabled={!reconReason.trim() || submittingRecon}
                        onClick={async () => { setSubmittingRecon(true); await submitReconsiderationRequest(student.id, activeTerm.id, reconReason.trim()); setSubmittingRecon(false); setShowReconDialog(false); setReconReason(''); }}>
                        {submittingRecon ? 'Submitting...' : 'Submit Request'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          );
        })()}

        {/* ── Finalized Banner ─────────────────────────────────────────── */}
        {isFinalized && (
          <div className="rounded-md border border-green-800 bg-green-700">
            <div className="pt-3 pb-3 px-4 flex items-center gap-3">
              <CheckSquare className="w-5 h-5 text-white flex-shrink-0" />
              <div className="flex-1">
                <p className="text-white font-semibold">Enrollment Finalized — Officially Enrolled</p>
                <p className="text-green-100 text-xs">You are officially enrolled for {activeTerm.name}. Your class schedule is now locked.</p>
              </div>
              {state.portalSettings.showEnrollmentFormPdf && (
                <Button
                  size="sm"
                  className="bg-white/20 hover:bg-white/30 text-white border border-white/30 gap-1.5 flex-shrink-0"
                  onClick={generateEnrollmentFormPdf}
                >
                  <FileText className="w-3.5 h-3.5" /> Download Enrollment Form
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ── Change & Drop After Finalization Banner ───────────────────── */}
        {isFinalized && isChangeDropWindowOpen && (() => {
          const existingReq = (state.changeDropRequests ?? [])
            .filter(r => r.studentId === student.id && r.termId === activeTerm.id)
            .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))[0];

          const canSubmitNew = !existingReq || existingReq.status !== 'pending';
          const isNewStyleApproved = existingReq?.status === 'approved' &&
            (existingReq.addSections !== undefined || existingReq.dropSections !== undefined);

          // Old-style approved: student can re-enlist freely (handled by hasApprovedChangeDropRequest)
          if (hasApprovedChangeDropRequest) return null;

          if (existingReq?.status === 'pending') {
            return (
              <div className="mx-0 mb-3 rounded-md border border-amber-300 bg-amber-50 p-3.5">
                <p className="text-amber-800 text-sm font-semibold">Change/Drop Request Under Review</p>
                <p className="text-amber-700 text-xs mt-1">
                  Your request has been submitted and is awaiting OCS review.
                  {activeTerm.changeDropUntil && <span className="font-medium"> Deadline: {new Date(activeTerm.changeDropUntil).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}.</span>}
                </p>
              </div>
            );
          }

          if (isNewStyleApproved) {
            return (
              <div className="mx-0 mb-3 rounded-md border border-emerald-300 bg-emerald-50 p-3.5">
                <p className="text-emerald-800 text-sm font-semibold">Change/Drop Request Approved</p>
                <p className="text-emerald-700 text-xs mt-1">Your requested changes have been applied to your enrollment record.</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 text-xs h-7 gap-1.5 border-emerald-400 text-emerald-700 hover:bg-emerald-100"
                  onClick={() => generateChangeDropFormPDF(
                    existingReq,
                    student.name,
                    student.studentNumber,
                    (student as { program?: string }).program,
                    activeTerm.name,
                    state,
                  )}
                >
                  <Download className="w-3 h-3" />
                  Download Change/Drop Form
                </Button>
              </div>
            );
          }

          if (existingReq?.status === 'denied') {
            return (
              <div className="mx-0 mb-3 rounded-md border border-red-300 bg-red-50 p-3.5">
                <p className="text-red-800 text-sm font-semibold">Change/Drop Request Denied</p>
                {existingReq.response && <p className="text-red-700 text-xs mt-1">OCS note: {existingReq.response}</p>}
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 text-xs h-7 gap-1.5 border-red-400 text-red-700 hover:bg-red-100"
                  onClick={() => generateChangeDropFormPDF(
                    existingReq,
                    student.name,
                    student.studentNumber,
                    (student as { program?: string }).program,
                    activeTerm.name,
                    state,
                  )}
                >
                  <Download className="w-3 h-3" />
                  Download Denied Copy
                </Button>
              </div>
            );
          }

          if (canSubmitNew) {
            return (
              <div className="mx-0 mb-3 rounded-md border border-blue-300 bg-blue-50 p-3.5">
                <p className="text-blue-900 text-sm font-semibold">Change / Drop Subjects</p>
                <p className="text-blue-700 text-xs mt-1">
                  You have already finalized your enrollment. To add, drop, or change a subject, submit a Change/Drop request to OCS.
                  {activeTerm.changeDropUntil && <span className="font-medium"> Deadline: {new Date(activeTerm.changeDropUntil).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}.</span>}
                </p>
                <Button size="sm" className="mt-2 text-xs h-7 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => setShowChangeDropModal(true)}>
                  Request Change / Drop
                </Button>
              </div>
            );
          }

          return null;
        })()}

        {/* ── Change/Drop Approved Banner ───────────────────────────────── */}
        {hasApprovedChangeDropRequest && (
          <div className="rounded-md border border-blue-400 bg-blue-600">
            <div className="pt-3 pb-3 px-4 flex items-center gap-3">
              <CheckSquare className="w-5 h-5 text-white flex-shrink-0" />
              <div>
                <p className="text-white font-semibold">Change/Drop Access Granted</p>
                <p className="text-blue-100 text-xs">OCS has approved your request. You may now add, drop, or change subjects and re-finalize your enrollment.</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Underload Application Banner ──────────────────────────────── */}
        {(() => {
          // Show underload notice after the enrollment schedule has passed and student has low units
          const allSlots2 = enrollSched?.slots ?? [];
          const lastDate2 = [...allSlots2].map(s => s.date).filter(Boolean).sort().pop();
          const schedPassed = !!lastDate2 && today > lastDate2;
          return (schedPassed || !enrollSched?.slots?.length) && activeTerm.semester !== 'Mid-Term' && currentUnits > 0 && currentUnits < 15 && isUnderloadWindowOpen;
        })() && (
          <div className="rounded-xl border border-orange-300 bg-orange-50/70">
            <div className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-orange-900">Underload Notice</p>
                  <p className="text-xs text-orange-800 mt-1 leading-relaxed">
                    You are currently enlisted in <strong>{currentUnits} academic units</strong>, which is below the minimum of{' '}
                    <strong>15 units</strong> required to qualify for College or University Scholar standing.
                    If you have a valid reason for an underload, you may submit an application to the OCS.
                  </p>
                </div>
              </div>
              {!myUnderloadApp && (
                <div className="ml-8">
                  <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white gap-1.5"
                    onClick={() => setShowUnderloadDialog(true)}>
                    <FileText className="w-3.5 h-3.5" /> Submit Underload Application
                  </Button>
                </div>
              )}
              {myUnderloadApp?.status === 'pending' && (
                <div className="ml-8 flex items-center gap-2 text-xs text-orange-800">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                  Your underload application is under OCS review. Please wait for their response.
                </div>
              )}
              {myUnderloadApp?.status === 'approved' && (
                <div className="ml-8 space-y-2">
                  <div className="rounded bg-green-100 border border-green-200 px-3 py-2 text-xs text-green-800">
                    <p className="font-semibold flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Application Approved</p>
                    <p className="mt-0.5">Your underload has been approved. You remain eligible for scholastic standing evaluation.</p>
                    {myUnderloadApp.response && <p className="mt-0.5 italic">OCS: "{myUnderloadApp.response}"</p>}
                  </div>
                  <Button size="sm" variant="outline"
                    className="gap-1.5 border-green-400 text-green-800 hover:bg-green-50"
                    onClick={() => generateUnderloadApprovalDoc(myUnderloadApp)}>
                    <Printer className="w-3.5 h-3.5" /> View Approval Document
                  </Button>
                </div>
              )}
              {myUnderloadApp?.status === 'denied' && (
                <div className="ml-8 space-y-2">
                  <div className="rounded bg-red-100 border border-red-200 px-3 py-2 text-xs text-red-800">
                    <p className="font-semibold">Application Denied</p>
                    {myUnderloadApp.response && <p className="mt-0.5 italic">OCS: "{myUnderloadApp.response}"</p>}
                    <p className="mt-0.5">You may re-submit a new application.</p>
                  </div>
                  <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white gap-1.5"
                    onClick={() => setShowUnderloadDialog(true)}>
                    <FileText className="w-3.5 h-3.5" /> Re-submit Application
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Enlistment Window Status Banners ────────────────────────── */}
        {!isDisqualified && !isFinalized && (() => {
          // Schedule-based approach: no enlistmentFrom/Until window anymore
          // If enlistment is open via toggle, or it's the student's scheduled day → no closed banner
          if (enlistmentOpen || isMyEnrollDay || isPhase3Today || appealBypass) return null;

          // OCS approved late enrollment: show granted banner
          if (hasApprovedLateEnlistThisTerm) {
            return (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70">
                <div className="pt-3 pb-3 px-4 flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-green-900">Late Enrollment Granted</p>
                    <p className="text-xs text-green-700 mt-0.5">
                      The OCS has approved your late enrollment request. You may now search for subjects, enlist, and finalize your enrollment.
                    </p>
                    {latestLateRequest?.response && (
                      <p className="text-xs text-green-800 mt-1 italic">OCS Note: "{latestLateRequest.response}"</p>
                    )}
                  </div>
                </div>
              </div>
            );
          }

          // No schedule set yet
          if (!enrollSched?.slots?.length) {
            return (
              <StatusBanner type="warning" title="Enrollment Schedule Not Yet Posted" description="The enrollment schedule has not been configured yet. Please wait for the University announcement." />
            );
          }

          // Schedule exists but not the student's day — determine if it has fully passed
          const allSlots = enrollSched.slots;
          const lastDate = [...allSlots].map(s => s.date).filter(Boolean).sort().pop();
          const scheduleFullyPassed = !!lastDate && today > lastDate;

          if (scheduleFullyPassed && isLateEnrollmentWindowOpen) {
            if (currentUnits === 0) {
              const noLatePending = !latestLateRequest || latestLateRequest.status === 'denied';
              return (
                <>
                  <div className="rounded-xl border border-amber-300 bg-amber-50/70">
                    <div className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-semibold text-amber-900">Request for Late Enrollment</p>
                          <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                            You have no enlisted subjects for this term and the enrollment period has ended.
                            If you were unable to enlist due to special circumstances, you may submit a
                            <strong> Request for Late Enrollment</strong> to the OCS.
                          </p>
                        </div>
                      </div>
                      <div className="ml-8 space-y-1.5 text-xs text-amber-800 bg-amber-100/60 rounded-md p-3 border border-amber-200">
                        <p className="font-semibold text-amber-900">How it works:</p>
                        <p>1. Write an appeal letter explaining your reason for missing enrollment.</p>
                        <p>2. Submit the letter — the OCS will review your request.</p>
                        <p>3. If approved, you will be able to add subjects and finalize your enrollment even after the deadline.</p>
                      </div>
                      {latestLateRequest?.status === 'pending' && (
                        <div className="ml-8 flex items-center gap-2 text-xs text-yellow-800">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                          Your appeal letter is currently under OCS review. Please wait for their response.
                        </div>
                      )}
                      {latestLateRequest?.status === 'denied' && (
                        <div className="ml-8 rounded bg-red-100 border border-red-200 px-3 py-2 text-xs text-red-800">
                          <p className="font-semibold">Request Denied</p>
                          {latestLateRequest.response && <p className="mt-0.5 italic">OCS: "{latestLateRequest.response}"</p>}
                          <p className="mt-0.5">You may re-submit a new appeal letter below.</p>
                        </div>
                      )}
                      {noLatePending && (
                        <div className="ml-8">
                          <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
                            onClick={() => setShowLateEnlistDialog(true)}>
                            <MessageSquare className="w-3.5 h-3.5" /> Submit Appeal Letter
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Appeal Letter Dialog */}
                  <Dialog open={showLateEnlistDialog} onOpenChange={v => { setShowLateEnlistDialog(v); if (!v) setLateEnlistReason(''); }}>
                    <DialogContent className="max-w-md">
                      <DialogHeader><DialogTitle className="flex items-center gap-2"><MessageSquare className="w-5 h-5 text-primary" />Request for Late Enrollment</DialogTitle></DialogHeader>
                      <div className="space-y-4 mt-2">
                        <div className="rounded-lg bg-sky-50/70 border border-sky-200 px-3 py-2 text-xs text-sky-800 space-y-1">
                          <p className="font-semibold">Instructions:</p>
                          <p>Write a clear and honest appeal letter to the OCS explaining why you were unable to enlist during the regular enrollment period. Include any relevant circumstances (medical, personal, technical issues, etc.).</p>
                        </div>
                        <div>
                          <Label>Appeal Letter <span className="text-red-500">*</span></Label>
                          <Textarea rows={5} placeholder="Dear OCS, I am writing to request late enrollment for this term because..." value={lateEnlistReason} onChange={e => setLateEnlistReason(e.target.value)} className="mt-1" />
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" className="flex-1" onClick={() => { setShowLateEnlistDialog(false); setLateEnlistReason(''); }}>Cancel</Button>
                          <Button className="flex-1" disabled={!lateEnlistReason.trim() || submittingLateEnlist}
                            onClick={async () => {
                              setSubmittingLateEnlist(true);
                              await submitReconsiderationRequest(student.id, activeTerm.id, lateEnlistReason.trim(), 'late_enlistment');
                              setSubmittingLateEnlist(false);
                              setShowLateEnlistDialog(false);
                              setLateEnlistReason('');
                              toast.success('Appeal letter submitted', { description: 'Your request for late enrollment has been sent to the OCS for review.' });
                            }}>
                            {submittingLateEnlist ? 'Submitting...' : 'Submit Appeal Letter'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              );
            }
            // Has some units but schedule passed — no extra banner
            return null;
          }

          return null;
        })()}


        {/* ── Warning Dialog ───────────────────────────────────────────── */}
        <AppDialog
          open={showWarningDialog && !!enlistWarning}
          onOpenChange={open => { setShowWarningDialog(open); if (!open) setEnlistWarning(null); }}
          intent="danger"
          title={`Cannot Enlist — ${enlistWarning?.courseCode ?? ''} Sec ${enlistWarning?.sectionCode ?? ''}`}
          confirmLabel="Dismiss"
          onConfirm={() => { setShowWarningDialog(false); setEnlistWarning(null); }}
        >
          <div className="space-y-2">
            {enlistWarning?.issues.map((issue, i) => (
              <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl bg-destructive/5 border border-destructive/20 text-sm text-destructive dark:text-red-400">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{issue}</span>
              </div>
            ))}
          </div>
        </AppDialog>

        {/* ── Bulk Enlist Failures Dialog ──────────────────────────────── */}
        <AppDialog
          open={!!bulkFailures}
          onOpenChange={open => { if (!open) setBulkFailures(null); }}
          intent="danger"
          title={`Enlistment Failed — ${bulkFailures?.length ?? 0} Course${(bulkFailures?.length ?? 0) > 1 ? 's' : ''}`}
          description="The following courses could not be enlisted. Please review the reasons below."
          confirmLabel="Dismiss"
          onConfirm={() => setBulkFailures(null)}
          maxWidth="max-w-2xl"
        >
          <div className="overflow-x-auto rounded-xl border border-border mt-1">
            <Table>
              <TableHeader>
                <TableRow className="bg-destructive/5">
                  <TableHead className="font-semibold text-destructive">Course</TableHead>
                  <TableHead className="font-semibold text-destructive">Section</TableHead>
                  <TableHead className="font-semibold text-destructive">Reason(s)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(bulkFailures ?? []).map((f, i) => (
                  <TableRow key={i} className="align-top">
                    <TableCell className="font-mono font-semibold text-primary text-sm whitespace-nowrap">{f.code}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{f.section}</TableCell>
                    <TableCell className="text-sm">
                      {f.reasons.length === 1 ? f.reasons[0] : (
                        <ul className="list-disc list-inside space-y-0.5">
                          {f.reasons.map((r, j) => <li key={j}>{r}</li>)}
                        </ul>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </AppDialog>

        {/* ── Enrollment Schedule Banner ───────────────────────────────── */}
        {enrollSched?.slots?.length ? (() => {
          const phase1 = enrollSched.slots.filter(s => (s.phase ?? 1) === 1);
          const phase2 = enrollSched.slots.filter(s => (s.phase ?? 1) === 2);
          const phase3 = enrollSched.slots.filter(s => (s.phase as number) === 3);
          const todayPhase = enrollSchedToday ? (enrollSchedToday.phase ?? 1) : isPhase3Today ? 3 : null;
          const todayDay = enrollSchedToday?.day ?? null;
          const bannerOpen = isMyEnrollDay || isPhase3Today;
          return (
            <div className={`rounded-md border ${bannerOpen ? 'bg-green-50 border-green-300' : 'bg-blue-50 border-blue-200'}`}>
              <div className="px-4 pt-3 pb-3 space-y-3">
                <div className="flex items-start gap-2">
                  <CalendarDays className={`w-4 h-4 flex-shrink-0 mt-0.5 ${bannerOpen ? 'text-green-600' : 'text-blue-600'}`} />
                  <p className={`text-sm font-semibold ${bannerOpen ? 'text-green-800' : 'text-blue-800'}`}>
                    {isPhase3Today
                      ? 'Today is a Change of Matriculation Period — Enrollment open to all students!'
                      : isMyEnrollDay
                        ? `Today is your enrollment day! (${todayPhase === 1 ? 'Phase 1 — Pre-registration' : 'Phase 2 — General Registration'} — Day ${todayDay}${enrollSchedToday!.idPrefixes.length === 0 ? ', Open to all' : ''})`
                        : 'Enrollment Schedule'}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { slots: phase1, label: 'Phase 1 — Pre-registration', color: 'indigo' },
                    { slots: phase2, label: 'Phase 2 — General Registration', color: 'teal' },
                  ].map(({ slots: phaseSlots, label, color }) => (
                    phaseSlots.length > 0 ? (
                      <div key={label} className={`rounded border ${color === 'indigo' ? 'border-indigo-200 bg-indigo-50' : 'border-teal-200 bg-teal-50'} p-2.5 space-y-1`}>
                        <p className={`text-xs font-bold ${color === 'indigo' ? 'text-indigo-700' : 'text-teal-700'}`}>{label}</p>
                        {phaseSlots.map(slot => {
                          const isToday = slot.date === today;
                          const isEligible = isToday && matchesEnrollPrefix(slot.idPrefixes);
                          return (
                            <div key={`${slot.phase}-${slot.day}`}
                              className={`text-xs px-2 py-1 rounded border flex items-center justify-between gap-2 ${isEligible ? 'bg-green-100 border-green-300 text-green-800 font-semibold' : isToday ? 'bg-yellow-100 border-yellow-300 text-yellow-800' : 'bg-white border-gray-200 text-gray-600'}`}>
                              <span>
                                <span className="font-medium">Day {slot.day}</span>
                                {' — '}{new Date(slot.date + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                                {(slot.startTime || slot.endTime) && (
                                  <span className="ml-1 opacity-75">
                                    {slot.startTime && slot.endTime ? `· ${slot.startTime}–${slot.endTime}` : slot.startTime ? `· from ${slot.startTime}` : `· until ${slot.endTime}`}
                                  </span>
                                )}
                              </span>
                              <span className={`text-right ${isEligible ? 'text-green-700' : ''}`}>
                                {slot.idPrefixes.length === 0 ? 'Open to all' : `IDs: ${slot.idPrefixes.join(', ')}`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : null
                  ))}
                  {phase3.length > 0 && (
                    <div className="rounded border border-amber-200 bg-amber-50 p-2.5 space-y-1 sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-amber-700">Phase 3 — Change of Matriculation Period</p>
                        <span className="text-xs text-amber-600 bg-amber-100 border border-amber-300 rounded px-1.5 py-0.5">Open to all students</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1">
                        {phase3.map(slot => {
                          const isToday = slot.date === today;
                          return (
                            <div key={`3-${slot.day}`}
                              className={`text-xs px-2 py-1 rounded border flex items-center justify-between gap-2 ${isToday ? 'bg-green-100 border-green-300 text-green-800 font-semibold' : 'bg-white border-gray-200 text-gray-600'}`}>
                              <span>
                                <span className="font-medium">Date {slot.day}</span>
                                {' — '}{slot.date ? new Date(slot.date + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : 'TBA'}
                                {(slot.startTime || slot.endTime) && (
                                  <span className="ml-1 opacity-75">
                                    {slot.startTime && slot.endTime ? `· ${slot.startTime}–${slot.endTime}` : slot.startTime ? `· from ${slot.startTime}` : `· until ${slot.endTime}`}
                                  </span>
                                )}
                              </span>
                              {isToday && <span className="text-green-700 font-semibold">Today</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })() : null}

        {/* ── Weekly Schedule / Timetable ─────────────────────────────── */}
        <div className="flex flex-col portal-panel">
            <div className="portal-panel-header shrink-0">
              <span className="flex items-center gap-1.5 text-xs">
                <CalendarDays className="w-4 h-4" /> Weekly Schedule
                <span className="font-normal opacity-70">{isFinalized ? '(enrolled)' : '(solid=enlisted)'}</span>
              </span>
            </div>
            <div className="p-1.5 bg-background overflow-x-auto">
              <div>
                {myEnrolledSections.length === 0 && cartSectionsArr.length === 0
                  ? <p className="text-muted-foreground text-center py-6 text-sm">No sections to display.</p>
                  : renderTimetable()}
              </div>
            </div>
          </div>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* ACTIVE ENLISTMENT                                            */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col portal-panel">
          {/* Header */}
          <div className="portal-panel-header shrink-0">
            <span>Active Enlistment</span>
            <div className="flex items-center gap-2">
              {effectiveEnlistmentOpen && (!isFinalized || appealBypass) && !isDisqualified && (
                <Badge className="bg-primary-foreground/20 text-primary-foreground text-xs">
                  {activeTerm.name}
                </Badge>
              )}
              {isFinalized && !appealBypass
                ? <Badge className="bg-green-400 text-white text-xs">Finalized</Badge>
                : isDisqualified
                  ? <Badge className="bg-red-400 text-white text-xs">Locked</Badge>
                  : !effectiveEnlistmentOpen
                    ? <Badge className="bg-red-400 text-white text-xs">
                        {!enrollSched?.slots?.length ? 'Awaiting Schedule' : 'Not Your Day'}
                      </Badge>
                    : <Badge className="bg-green-400 text-white text-xs">Enlistment Open</Badge>}
            </div>
          </div>

          {/* Active Enlistment Table */}
          <div className="overflow-y-auto bg-background">
            <div className="overflow-x-auto min-w-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-bold">Class</TableHead>
                  <TableHead className="font-bold w-[100px] text-center hidden md:table-cell">Status</TableHead>
                  <TableHead className="font-bold w-[100px] text-center hidden md:table-cell">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* ── Bookmarked (cart) rows ── */}
                {cartRows.map(sec => {
                  const course = state.courses.find(c => c.id === sec.courseId);
                  const faculty = state.users.find(u => u.id === sec.facultyId);
                  const facultyDisplayName = sec.facultyHidden ? 'To be Announced' : (faculty?.name ?? 'TBA');
                  const { isFull, hasApprovedPrerog: cartItemHasPrerog, unitCheck } = getSectionInfo(sec);
                  if (!course) return null;
                  const isEnlisting = enlisting === sec.id;
                  const consentNotes: string[] = [];
                  if (course.requiresCOI) {
                    const prereqs = course.prerequisites ?? [];
                    consentNotes.push(prereqs.length ? 'Requires COI if you have not satisfied its prerequisites' : 'Requires COI');
                  }
                  if (course.requiresDeptConsent) consentNotes.push('Requires Department Consent');
                  if (course.requiresOCSConsent) consentNotes.push('Requires OCS Consent');
                  return (
                    <TableRow key={sec.id} className="hover:bg-muted/10 align-top">
                      <TableCell className="py-3">
                        <div className="flex flex-col md:flex-row gap-2 md:gap-3 w-full">
                          <ClassCard
                            course={course}
                            sectionCode={sec.sectionCode}
                            schedule={sec.schedule}
                            facultyName={facultyDisplayName}
                            enrolled={sec.enrolled}
                            slots={sec.slots}
                            consentNotes={consentNotes}
                            allCourses={state.courses}
                            open={openCardIds.has(sec.id)}
                            onToggle={() => toggleCard(sec.id)}
                          />
                          {sec.labSchedule && (
                            <ClassCard
                              course={course}
                              sectionCode={sec.sectionCode + 'L'}
                              isLab
                              schedule={sec.labSchedule}
                              facultyName={facultyDisplayName}
                              enrolled={sec.enrolled}
                              slots={sec.slots}
                              consentNotes={[]}
                              allCourses={state.courses}
                              open={openCardIds.has(sec.id + '-lab')}
                              onToggle={() => toggleCard(sec.id + '-lab')}
                            />
                          )}
                        </div>
                        {/* Mobile-only status + actions */}
                        <div className="flex items-center justify-between mt-2 md:hidden">
                          <div className="flex flex-col gap-0.5">
                            <span className="italic text-sm text-muted-foreground">Bookmarked</span>
                            {isFull && !cartItemHasPrerog && <p className="text-xs text-red-500 font-medium">Section Full</p>}
                            {!unitCheck.ok && <p className="text-xs text-amber-600 font-medium">Would exceed unit limit</p>}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm"
                              className="bg-green-500 hover:bg-green-600 text-white h-7 text-xs disabled:opacity-40"
                              disabled={isEnlisting || !effectiveEnlistmentOpen || (isFinalized && !appealBypass) || isDisqualified}
                              onClick={() => handleEnlist(sec)}>
                              {isEnlisting ? '...' : 'Enlist'}
                            </Button>
                            <Button size="sm" variant="destructive" className="h-7 text-xs"
                              onClick={() => removeFromCart(sec.id)}>Remove</Button>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 align-middle text-center hidden md:table-cell">
                        <div className="flex flex-col items-center gap-1">
                          <span className="italic text-sm text-muted-foreground">Bookmarked</span>
                          {isFull && !cartItemHasPrerog && <p className="text-xs text-red-500 font-medium">Section Full</p>}
                          {isFull && cartItemHasPrerog && <p className="text-xs text-green-600 font-medium">Full — Prerog ✓</p>}
                          {!unitCheck.ok && <p className="text-xs text-amber-600 font-medium">Would exceed unit limit</p>}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 align-middle text-center hidden md:table-cell">
                        <div className="flex flex-col items-center gap-2">
                          <Button size="sm"
                            className="bg-green-500 hover:bg-green-600 text-white h-7 text-xs min-w-[70px] disabled:opacity-40"
                            disabled={isEnlisting || !effectiveEnlistmentOpen || (isFinalized && !appealBypass) || isDisqualified}
                            onClick={() => handleEnlist(sec)}>
                            {isEnlisting ? '...' : 'Enlist'}
                          </Button>
                          <Button size="sm" variant="destructive" className="h-7 text-xs min-w-[70px]"
                            onClick={() => removeFromCart(sec.id)}>Remove</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {/* ── Enlisted rows ── */}
                {myEnrolledSections.map((sec, ci) => {
                  const course = state.courses.find(c => c.id === sec.courseId);
                  const faculty = state.users.find(u => u.id === sec.facultyId);
                  const facultyDisplayName = sec.facultyHidden ? 'To be Announced' : (faculty?.name ?? 'TBA');
                  const color = COLORS[ci % COLORS.length];
                  if (!course) return null;
                  const consentNotes: string[] = [];
                  if (course.requiresCOI) {
                    const prereqs = course.prerequisites ?? [];
                    consentNotes.push(prereqs.length ? 'Requires COI if you have not satisfied its prerequisites' : 'Requires COI');
                  }
                  if (course.requiresDeptConsent) consentNotes.push('Requires Department Consent');
                  if (course.requiresOCSConsent) consentNotes.push('Requires OCS Consent');
                  return (
                    <TableRow key={sec.id} className={`bg-green-50/30 hover:bg-green-50/50 align-top ${color.split(' ')[0]}/5`}>
                      <TableCell className="py-3">
                        <div className="flex flex-col md:flex-row gap-2 md:gap-3 w-full">
                          <ClassCard
                            course={course}
                            sectionCode={sec.sectionCode}
                            schedule={sec.schedule}
                            facultyName={facultyDisplayName}
                            enrolled={sec.enrolled}
                            slots={sec.slots}
                            consentNotes={consentNotes}
                            allCourses={state.courses}
                            isEnlistedFinalized={isFinalized}
                            open={openCardIds.has(sec.id)}
                            onToggle={() => toggleCard(sec.id)}
                          />
                          {sec.labSchedule && (
                            <ClassCard
                              course={course}
                              sectionCode={sec.sectionCode + 'L'}
                              isLab
                              schedule={sec.labSchedule}
                              facultyName={facultyDisplayName}
                              enrolled={sec.enrolled}
                              slots={sec.slots}
                              consentNotes={[]}
                              allCourses={state.courses}
                              isEnlistedFinalized={isFinalized}
                              open={openCardIds.has(sec.id + '-lab')}
                              onToggle={() => toggleCard(sec.id + '-lab')}
                            />
                          )}
                        </div>
                        {/* Mobile-only status + action */}
                        <div className="flex items-center justify-between mt-2 md:hidden">
                          {isFinalized
                            ? <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">Finalized</Badge>
                            : <Badge className="bg-green-100 text-green-800 border-green-200 text-xs italic">Enlisted</Badge>}
                          {!isFinalized && (
                            <Button size="sm" variant="destructive" className="h-7 text-xs"
                              onClick={() => handleRemove(sec.id)}>Remove</Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 align-middle text-center hidden md:table-cell">
                        {isFinalized
                          ? <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">Finalized</Badge>
                          : <Badge className="bg-green-100 text-green-800 border-green-200 text-xs italic">Enlisted</Badge>}
                      </TableCell>
                      <TableCell className="py-3 align-middle text-center hidden md:table-cell">
                        {!isFinalized
                          ? <Button size="sm" variant="destructive" className="h-7 text-xs min-w-[70px]"
                              onClick={() => handleRemove(sec.id)}>Remove</Button>
                          : null}
                      </TableCell>
                    </TableRow>
                  );
                })}

                {/* ── Empty state ── */}
                {cartRows.length === 0 && myEnrolledSections.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                      No Data Available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          </div>

          {/* Stats bar */}
          <div className="border-t bg-muted/10 px-4 py-2 flex flex-col gap-1.5">
            <div className="flex flex-wrap gap-x-8 gap-y-1 text-xs text-muted-foreground">
              <span>Scholastic Standing: <strong>{scholasticStatus}</strong></span>
              <span>Allowed Max Units: <strong>{maxUnits}</strong></span>
              <span className={currentUnits >= maxUnits ? 'text-destructive font-semibold' : currentUnits >= maxUnits * 0.8 ? 'text-amber-600 font-semibold' : ''}>
                Enlisted Academic Units: <strong>{currentUnits}</strong>
                {currentUnits >= maxUnits && <span className="ml-1">(Max reached)</span>}
                {currentUnits > 0 && currentUnits < maxUnits && currentUnits >= maxUnits * 0.8 && <span className="ml-1">(Near limit)</span>}
              </span>
            </div>
            {/* Unit load progress bar */}
            {maxUnits > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${currentUnits >= maxUnits ? 'bg-destructive' : currentUnits >= maxUnits * 0.8 ? 'bg-amber-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min((currentUnits / maxUnits) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{currentUnits}/{maxUnits} units</span>
              </div>
            )}
            {currentUnits >= maxUnits && (
              <p className="text-xs text-destructive font-medium flex items-center gap-1">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                You have reached the maximum unit load. Drop a course before enlisting more.
              </p>
            )}
            {currentUnits > 0 && currentUnits < maxUnits && currentUnits >= maxUnits * 0.8 && (
              <p className="text-xs text-amber-700 font-medium flex items-center gap-1">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                You are approaching the maximum unit load ({maxUnits - currentUnits} units remaining).
              </p>
            )}
          </div>

          {/* Enlist All + Finalize buttons */}
          {(() => {
            const pendingCartCount = cartRows.length; // already filtered to active term + not yet enlisted
            return (cartRows.length >= 1 || ((!isFinalized || appealBypass) && finalizeButtonVisible && myEnrolledSections.length > 0)) && (
              <div className="border-t px-4 py-3 flex gap-3 flex-wrap bg-background shrink-0">
                {pendingCartCount >= 1 && effectiveEnlistmentOpen && (!isFinalized || appealBypass) && !isDisqualified && (
                  <Button className="bg-green-600 hover:bg-green-700 text-white gap-2"
                    onClick={handleBulkEnlist}>
                    <CheckCircle className="w-4 h-4" /> Enlist All ({pendingCartCount})
                  </Button>
                )}
              {(!isFinalized || appealBypass) && finalizeButtonVisible && myEnrolledSections.length > 0 && !isDisqualified && (
                <Button
                  className={`gap-2 ${finalizeIssues.length > 0 ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-primary hover:bg-primary/90 text-primary-foreground'}`}
                  onClick={() => setShowFinalizeDialog(true)}>
                  {finalizeIssues.length > 0
                    ? <><AlertTriangle className="w-4 h-4" /> Finalize ({finalizeIssues.length} issue{finalizeIssues.length > 1 ? 's' : ''})</>
                    : <><CheckSquare className="w-4 h-4" /> Finalize Enlistment</>}
                </Button>
              )}
            </div>
          );
          })()}
        </div>

        {/* ── Change/Drop Modal ──────────────────────────────────────── */}
        <StudentChangeDropModal
          open={showChangeDropModal}
          onOpenChange={setShowChangeDropModal}
          termId={activeTerm.id}
          studentId={student.id}
        />

        {/* Finalize confirmation dialog */}
        <AppDialog
          open={showFinalizeDialog}
          onOpenChange={v => { setShowFinalizeDialog(v); setFinalizeConfirmText(''); }}
          intent="warning"
          title="Finalize Enlistment"
          description={<>This will officially enroll you in your enlisted sections for <strong>{activeTerm.name}</strong>. This action cannot be undone without OCS intervention.</>}
          confirmLabel="Confirm Finalization"
          onConfirm={() => { finalizeEnlistment(student.id, activeTerm.id); setShowFinalizeDialog(false); setFinalizeConfirmText(''); }}
          disabled={finalizeConfirmText !== 'MY ENROLLMENT IS FINAL' || finalizeIssues.length > 0}
          maxWidth="max-w-lg"
        >
          <div className="space-y-3">
            <div className="inner-table text-sm">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted/40 text-xs text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">Code</th>
                    <th className="px-3 py-2 text-left font-medium">Course Title</th>
                    <th className="px-3 py-2 text-center font-medium">Sec</th>
                    <th className="px-3 py-2 text-center font-medium">Units</th>
                  </tr>
                </thead>
                <tbody>
                  {myEnrolledSections.map((sec, i) => {
                    const course = state.courses.find(c => c.id === sec.courseId);
                    return (
                      <tr key={sec.id} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/10'}>
                        <td className="px-3 py-1.5 font-mono text-xs font-semibold text-primary whitespace-nowrap">{course?.code}</td>
                        <td className="px-3 py-1.5 text-xs text-foreground">{course?.title}</td>
                        <td className="px-3 py-1.5 text-xs text-center text-muted-foreground">{sec.sectionCode}</td>
                        <td className="px-3 py-1.5 text-xs text-center text-muted-foreground">{(course?.units ?? 0) + (course?.labUnits ?? 0)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/20">
                    <td colSpan={3} className="px-3 py-1.5 text-xs text-muted-foreground text-right font-medium">Total academic units</td>
                    <td className="px-3 py-1.5 text-xs text-center font-bold text-foreground">{currentUnits}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {/* Validation issues */}
            {finalizeIssues.length > 0 && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 space-y-1.5">
                <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Cannot finalize — resolve the following issues first:
                </p>
                {finalizeIssues.map((issue, i) => (
                  <div key={i} className="text-xs text-destructive flex items-start gap-1.5 pl-1">
                    <span className="font-semibold shrink-0">{issue.courseCode}:</span>
                    <span>{issue.problem}</span>
                  </div>
                ))}
              </div>
            )}
            <div>
              <Label>Type <strong>MY ENROLLMENT IS FINAL</strong> to confirm</Label>
              <Input className="mt-1" value={finalizeConfirmText} onChange={e => setFinalizeConfirmText(e.target.value)} placeholder="MY ENROLLMENT IS FINAL" />
            </div>
          </div>
        </AppDialog>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* SEARCH CLASS                                                 */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <div className="portal-panel">
          {/* Header */}
          <div className="portal-panel-header">
            Search Class
          </div>

          <div className="p-4 space-y-3 bg-background">
            <p className="text-sm text-primary">
              Use this section to add classes on your list. All added classes will appear on the section above (Active Enlistments).
            </p>

            {/* Controls */}
            <div className="flex items-center flex-wrap gap-3">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-8 text-sm"
                onClick={() => { setTempSearch(search); setTempSectionSearch(sectionSearch); setTempStatusFilter(statusFilter); setShowFilterDialog(true); }}>
                <Filter className="w-4 h-4" /> Open Filter/Search
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Number of items</span>
                <Select value={String(pageSize)} onValueChange={v => setPageSize(Number(v))}>
                  <SelectTrigger className="w-16 h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>



            {/* Search Results Table */}
            <div className="overflow-x-auto border rounded">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-bold">Class Details</TableHead>
                    <TableHead className="font-bold text-center w-[100px] hidden md:table-cell">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!filterApplied ? (
                    <TableRow><TableCell colSpan={2} className="text-center py-10 text-muted-foreground text-sm">Use the <strong>Open Filter/Search</strong> button above to search for classes.</TableCell></TableRow>
                  ) : searchedSections.length === 0 ? (
                    <TableRow><TableCell colSpan={2} className="text-center py-10 text-muted-foreground">No Data Available</TableCell></TableRow>
                  ) : searchedSections.slice(0, pageSize).map(sec => {
                    const { course, faculty, enrolled, isFull, hasOverlap, isCourseDuplicate, hasCartOverlap, isCartDuplicate, prereqCheck, coreqCheck, unitCheck, consentBlocked, hasApprovedPrerog, incRestricted, specializationBlocked } = getSectionInfo(sec);
                    if (!course) return null;
                    const inCart = cart.includes(sec.id);

                    const rowClass = enrolled ? 'bg-green-50/50 cursor-pointer'
                      : inCart ? 'bg-orange-50/30 cursor-pointer hover:bg-orange-50/50'
                      : 'cursor-pointer hover:bg-muted/20';

                    // Resolve prereq/coreq IDs → "CODE (Title)"
                    const resolveIds = (ids?: string[][] | string[]) => {
                      const flat = flattenIds(ids);
                      if (!flat.length) return 'None';
                      return flat.map(id => { const c = state.courses.find(x => x.id === id); return c ? `${c.code} (${c.title})` : id; }).join(', ');
                    };
                    const prereqStr = resolveIds(course.prerequisites);
                    const coreqStr = resolveIds(course.corequisites);

                    let actionBtn;
                    if (enrolled) {
                      actionBtn = <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">Enlisted</Badge>;
                    } else if (isFinalized && !appealBypass) {
                      actionBtn = <Badge className="bg-gray-100 text-gray-500 border-gray-200 text-xs flex items-center gap-1"><Lock className="w-2.5 h-2.5" />Locked</Badge>;
                    } else if (isDisqualified) {
                      actionBtn = <Badge className="bg-red-100 text-red-700 border-red-200 text-xs flex items-center gap-1"><Lock className="w-2.5 h-2.5" />Blocked</Badge>;
                    } else if (incRestricted) {
                      actionBtn = <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs flex items-center gap-1"><Lock className="w-2.5 h-2.5" />INC — Cannot Re-enroll</Badge>;
                    } else if (specializationBlocked) {
                      actionBtn = <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs flex items-center gap-1"><Lock className="w-2.5 h-2.5" />No Specialization Plan</Badge>;
                    } else if (inCart) {
                      actionBtn = (
                        <Button size="sm" variant="outline" className="h-8 text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
                          onClick={e => { e.stopPropagation(); removeFromCart(sec.id); }}>
                          <Trash2 className="w-3 h-3 mr-1" />Remove
                        </Button>
                      );
                    } else {
                      const hasIssues = hasOverlap || isCourseDuplicate || hasCartOverlap || isCartDuplicate || !prereqCheck.passed || !coreqCheck.passed || consentBlocked || (isFull && !hasApprovedPrerog);
                      actionBtn = (
                        <Button size="sm"
                          className={`h-8 text-xs text-white ${hasIssues ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-500 hover:bg-green-600'}`}
                          onClick={e => {
                            e.stopPropagation();
                            addToCart(sec.id);
                            toast.success('Added to Cart', { description: `${course.code} Sec ${sec.sectionCode} added.` });
                          }}>
                          <ShoppingCart className="w-3 h-3 mr-1" />Add to Cart
                        </Button>
                      );
                    }

                    // Day badge helper
                    const DayBadges = ({ days }: { days: string[] }) => days.length ? (
                      <div className="flex gap-1 flex-wrap">
                        {days.map(d => (
                          <span key={d} className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#8B0000] text-white text-[10px] font-bold">{d}</span>
                        ))}
                      </div>
                    ) : <span className="text-muted-foreground text-xs">TBA</span>;

                    return (
                      <TableRow key={sec.id} className={rowClass}>
                        <TableCell className="py-3">
                          <p className="font-bold text-[#8B0000] text-sm leading-snug mb-2">{course.code} — {course.title}</p>
                          <div className={`grid gap-2 ${sec.labSchedule ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                            {/* Lecture / Main card */}
                            <div className="border rounded-md overflow-hidden">
                              <div className="bg-blue-500 px-3 py-1.5 flex items-center justify-between">
                                <span className="text-white text-xs font-semibold">{sec.labSchedule ? 'Lecture / Main' : 'Class'}</span>
                                <span className="text-white text-xs font-medium">{course.units} unit{course.units !== 1 ? 's' : ''}</span>
                              </div>
                              <div className="px-3 py-2 space-y-1 text-xs">
                                <p className="font-bold text-sm">{sec.sectionCode} - {sec.schedule.days.length ? `(${sec.schedule.startTime} - ${sec.schedule.endTime})` : 'Flexible Schedule'}</p>
                                <p><span className="text-muted-foreground">Faculty:</span> {sec.facultyHidden ? 'To be Announced' : (faculty?.name ?? 'TBA')}</p>
                                <p><span className="text-muted-foreground">Location:</span> {sec.schedule.room ?? 'TBA'}</p>
                                <DayBadges days={sec.schedule.days} />
                                <p><span className="text-muted-foreground">Pre-Req:</span> {prereqStr}</p>
                                {course.corequisites?.length ? <p><span className="text-muted-foreground">Co-Req:</span> {coreqStr}</p> : null}
                                <div className="flex items-center justify-between pt-0.5">
                                  <div className="flex gap-1">
                                    {isFull && <Badge className="text-[10px] bg-red-100 text-red-700 border-red-200">FULL</Badge>}
                                    {isFull && hasApprovedPrerog && <Badge className="text-[10px] bg-green-100 text-green-700 border-green-200">Prerog ✓</Badge>}
                                  </div>
                                  <Badge className="bg-green-600 text-white text-xs border-0">{sec.enrolled}/{sec.slots}</Badge>
                                </div>
                              </div>
                            </div>
                            {/* Lab card */}
                            {sec.labSchedule && (
                              <div className="border rounded-md overflow-hidden">
                                <div className="bg-blue-400 px-3 py-1.5 flex items-center justify-between">
                                  <span className="text-white text-xs font-semibold">Laboratory</span>
                                </div>
                                <div className="px-3 py-2 space-y-1 text-xs">
                                  <p className="font-bold text-sm">{sec.sectionCode}L - ({sec.labSchedule.startTime} - {sec.labSchedule.endTime})</p>
                                  <p><span className="text-muted-foreground">Faculty:</span> {sec.facultyHidden ? 'To be Announced' : (faculty?.name ?? 'TBA')}</p>
                                  <p><span className="text-muted-foreground">Location:</span> {sec.labSchedule.room ?? 'TBA'}</p>
                                  <DayBadges days={sec.labSchedule.days} />
                                  <div className="flex justify-end pt-0.5">
                                    <Badge className="bg-green-600 text-white text-xs border-0">{sec.enrolled}/{sec.slots}</Badge>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          {/* Mobile-only action */}
                          <div className="mt-2 flex justify-end md:hidden" onClick={e => e.stopPropagation()}>
                            {actionBtn}
                          </div>
                        </TableCell>
                        <TableCell className="text-center align-top py-3 hidden md:table-cell" onClick={e => e.stopPropagation()}>
                          {actionBtn}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Result count */}
            {searchedSections.length > pageSize && (
              <p className="text-xs text-muted-foreground text-center">Showing {pageSize} of {searchedSections.length} results. Increase "Number of items" to see more.</p>
            )}

            {/* Footer hint */}
            <p className="text-xs italic text-center text-muted-foreground">
              No Class Results? Use the filters above to search for a class that you wish to enlist. (Tip: Be specific as possible to display an accurate result.)
            </p>
          </div>
        </div>

        {/* ── Filter/Search Dialog ─────────────────────────────────────── */}
        <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
          <DialogContent className="w-full sm:max-w-md">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Filter className="w-4 h-4 text-primary" />Filter</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>Course Code</Label>
                <Input className="mt-1" placeholder="" value={tempSearch} onChange={e => setTempSearch(e.target.value)} />
              </div>
              <div>
                <Label>Section</Label>
                <Input className="mt-1" placeholder="" value={tempSectionSearch} onChange={e => setTempSectionSearch(e.target.value)} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={tempStatusFilter || '__default__'} onValueChange={v => setTempStatusFilter(v === '__default__' ? '' : v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__default__">--</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => { setSearch(tempSearch); setSectionSearch(tempSectionSearch); setStatusFilter(tempStatusFilter); setFilterApplied(true); setShowFilterDialog(false); }}>
                  Apply Filter
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => { setTempSearch(''); setTempSectionSearch(''); setTempStatusFilter(''); setSearch(''); setSectionSearch(''); setStatusFilter(''); setFilterApplied(false); }}>
                  Clear
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Underload Application Dialog ────────────────────────────── */}
        <Dialog open={showUnderloadDialog} onOpenChange={v => { setShowUnderloadDialog(v); if (!v) setUnderloadReason(''); }}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-orange-600" />Underload Application</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="rounded-lg bg-orange-50/70 border border-orange-200 px-3 py-2 text-xs text-orange-800 space-y-1">
                <p className="font-semibold">What is an Underload Application?</p>
                <p>If you have fewer than 15 academic units enlisted due to valid reasons, you may request an underload. If approved, you will remain eligible for honorific scholarship evaluation (College/University Scholar) for this term.</p>
              </div>
              <div>
                <Label>Reason for Underload <span className="text-red-500">*</span></Label>
                <Textarea rows={4} placeholder="State the reason why you are taking fewer than 15 academic units this term..." value={underloadReason} onChange={e => setUnderloadReason(e.target.value)} className="mt-1" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setShowUnderloadDialog(false); setUnderloadReason(''); }}>Cancel</Button>
                <Button className="flex-1 bg-orange-600 hover:bg-orange-700 text-white" disabled={!underloadReason.trim() || submittingUnderload}
                  onClick={async () => {
                    setSubmittingUnderload(true);
                    await submitUnderloadApplication(student.id, activeTerm.id, underloadReason.trim());
                    setSubmittingUnderload(false);
                    setShowUnderloadDialog(false);
                    setUnderloadReason('');
                    toast.success('Underload application submitted', { description: 'Your application has been sent to the OCS for review.' });
                  }}>
                  {submittingUnderload ? 'Submitting...' : 'Submit Application'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </PortalLayout>
  );
}
