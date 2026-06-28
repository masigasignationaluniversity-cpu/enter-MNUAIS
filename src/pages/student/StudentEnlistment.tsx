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
import { getScholasticStanding, isIncEnrollmentRestricted, getYearClassification, getPassedUnits, buildProgramCourseIdSet } from '@/lib/academic';
import { toast } from '@/components/ui/sonner';


function fmt12(t: string): string {
  if (!t) return t;
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}
function fmtSchedSimple(s?: Schedule) {
  if (!s || !s.days?.length) return 'TBA';
  return `${s.days.join('')} ${fmt12(s.startTime)}–${fmt12(s.endTime)}`;
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
<html><head><meta charset="UTF-8" /><title>Change/Add/Drop Request — ${studentName}</title>
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
    <div style="font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:.05em">Request to Change / Add / Drop Subjects</div>
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
    if (!allCourses?.length) return 'Loading...';
    const resolved = flat.map(id => {
      const c = allCourses.find(x => x.id === id);
      return c ? `${c.code} (${c.title})` : null;
    }).filter(Boolean);
    return resolved.length ? resolved.join(', ') : 'None';
  };

  const prereqs = resolveCourseIds(course.prerequisites);
  const coreqs = resolveCourseIds(course.corequisites);

  const headerBase = isEnlistedFinalized
    ? 'w-full px-3 py-2 flex items-start justify-between gap-2 text-left transition-colors rounded-t-lg bg-green-700 hover:bg-green-600'
    : 'w-full px-3 py-2 flex items-start justify-between gap-2 text-left hover:bg-muted/20 transition-colors rounded-t-lg';

  return (
    <div className="border border-black rounded-lg flex-1 bg-background">
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
              <p><span className="text-muted-foreground">Time:</span> ({fmt12(schedule.startTime)} - {fmt12(schedule.endTime)})</p>
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
            {consentNotes.length > 0 && (
              <div className="space-y-0.5 pt-0.5">
                {consentNotes.map((note, i) => (
                  <p key={i} className="text-xs text-[#7A1A2E]">{note}</p>
                ))}
              </div>
            )}
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
  const [currentPage, setCurrentPage] = useState(1);
  const [filterApplied, setFilterApplied] = useState(false);
  // Reset to page 1 whenever the filter changes or page size changes
  useEffect(() => { setCurrentPage(1); }, [search, sectionSearch, statusFilter, filterApplied, pageSize]);
  const [tempSearch, setTempSearch] = useState('');
  const [tempSectionSearch, setTempSectionSearch] = useState('');
  const [tempStatusFilter, setTempStatusFilter] = useState('');
  const [enlistWarning, setEnlistWarning] = useState<{ courseCode: string; sectionCode: string; issues: string[] } | null>(null);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ successCount: number; skippedUnits: number; failures: { code: string; section: string; reasons: string[] }[] } | null>(null);
  const [successNotif, setSuccessNotif] = useState<{ title: string; description: string } | null>(null);
  const notifySuccess = (title: string, description: string) => setSuccessNotif({ title, description });
  const [errorNotif, setErrorNotif] = useState<{ title: string; description: string; action?: { label: string; onClick: () => void } } | null>(null);
  const notifyError = (title: string, description: string, action?: { label: string; onClick: () => void }) => setErrorNotif({ title, description, action });
  const [enlisting, setEnlisting] = useState<string | null>(null);
  // Lab/Rec group picker state
  const [labPickerSec, setLabPickerSec] = useState<Section | null>(null);
  const [labPickerMode, setLabPickerMode] = useState<'cart' | 'enlist' | 'enlist-lab-only'>('cart');
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

  // Cart repair: if a child section (lab/rec) is in cart without its parent lecture, auto-add the parent.
  // This handles persisted carts from before the multi-section feature and any edge cases.
  useEffect(() => {
    if (!cartLoadedRef.current) return;
    const missingParentIds: string[] = [];
    for (const id of cart) {
      const sec = state.sections.find(s => s.id === id);
      if (sec?.parentSectionId && !cart.includes(sec.parentSectionId)) {
        const parent = state.sections.find(s => s.id === sec.parentSectionId);
        if (parent && !missingParentIds.includes(sec.parentSectionId)) {
          missingParentIds.push(sec.parentSectionId);
        }
      }
    }
    if (missingParentIds.length > 0) {
      setCart(c => [...new Set([...c, ...missingParentIds])]);
    }
  }, [cart, state.sections]);

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

  // Payment hold: only applies when the student was formally finalized in the prior term.
  // Students who were manually enrolled by OCS do NOT have a FinalizedEnlistment record,
  // so they are exempt from the payment hold.
  const priorTermsSorted = state.terms
    .filter(t => t.id !== activeTerm.id)
    .sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? ''));
  const priorTerm = priorTermsSorted[0];
  const wasFinalisedInPriorTerm = priorTerm
    ? state.finalizedEnlistments.some(fe => fe.studentId === student.id && fe.termId === priorTerm.id)
    : false;
  const priorPayment = priorTerm
    ? (state.enrollmentPayments ?? []).find(p => p.studentId === student.id && p.termId === priorTerm.id)
    : undefined;

  // Scan EVERY term for an unsettled balance — payments may be recorded under any term ID
  const heldByTerm = state.terms.find(term => {
    const payment = (state.enrollmentPayments ?? []).find(
      p => p.studentId === student.id && p.termId === term.id
    );
    // Any partial payment (amountPaid > 0 but status still 'unpaid') = hold
    if (payment && payment.status === 'unpaid' && payment.amountPaid > 0) return true;
    // For non-active terms: finalized but never fully paid = hold
    if (term.id !== activeTerm.id) {
      const wasFinalized = state.finalizedEnlistments.some(
        fe => fe.studentId === student.id && fe.termId === term.id
      );
      if (wasFinalized && (!payment || payment.status === 'unpaid')) return true;
    }
    return false;
  });
  const isPaymentHeld = !!heldByTerm;
  // Term to display in the hold banner (prefer the detected held term over the generic prior term)
  const holdDisplayTerm = heldByTerm ?? priorTerm;
  const holdDisplayPayment = heldByTerm
    ? (state.enrollmentPayments ?? []).find(p => p.studentId === student.id && p.termId === heldByTerm.id)
    : priorPayment;

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
    const now = new Date();
    const dateTimeIssued = 'Date Generated : ' + now.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
      + ' ' + now.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true });
    const prog = state.degreePrograms?.find(p => p.name === student.program);
    const totalProgramUnits = prog?.totalUnits ?? 0;
    const _pdfProgramCourseIds = buildProgramCourseIdSet(state.graduationRequirements, prog?.collegeId ?? '', prog?.id ?? '');
    const passedUnits = getPassedUnits(student.id, state.grades, state.sections, state.courses, state.enrollments, _pdfProgramCourseIds);
    const yearClass = totalProgramUnits > 0 ? getYearClassification(passedUnits, totalProgramUnits, prog?.degreeType) : '—';
    const college = state.colleges?.find(c => c.id === prog?.collegeId)?.name ?? prog?.collegeId ?? '—';

    // Fee schedule
    const fs = activeTerm.feeSchedule;
    const paymentRecord = (state.enrollmentPayments ?? []).find(p => p.studentId === student.id && p.termId === activeTerm.id);
    const paymentTxs = (state.paymentTransactions ?? []).filter(t => t.studentId === student.id && t.termId === activeTerm.id);
    const assessedByUser = paymentRecord?.processedBy
      ? state.users.find(u => u.id === paymentRecord.processedBy)
      : null;
    const isFreeTuition = paymentRecord?.freeTuition ?? false;
    const isOtherFeesSubsidy = paymentRecord?.otherFeesSubsidy ?? false;
    const effectiveOtherFeesSubsidy = isFreeTuition ? true : isOtherFeesSubsidy;
    const stCode = paymentRecord?.stCode;
    // ST-100 is a full scholarship (100% discount), distinct from RA 10931 free tuition
    const isST100 = stCode === '100';
    const isRAOnly = isFreeTuition && !isST100; // genuine RA 10931, not ST-100
    // ST Code fixed effective rates per unit
    const ST_CODE_RATES: Record<string, number> = { '33': 1000, '60': 600, '80': 300, '100': 0 };

    const fmtSched = (s?: Schedule) => {
      if (!s || !s.days?.length) return 'TBA';
      return `${s.days.join('')} ${fmt12(s.startTime)}-${fmt12(s.endTime)}${s.room ? ' ' + s.room : ''}`;
    };

    // Academic career label
    const academicCareerLabel = (() => {
      const dt = prog?.degreeType;
      if (dt === 'doctorate') return 'Doctorate';
      if (dt === 'masters') return 'Masters';
      if (dt === 'associate_certificate') return 'Certificate/Associate';
      return 'Bachelors';
    })();

    // Display: ALL enrolled non-manual sections (each gets its own row — lectures AND lab/rec)
    const enrolledSections = state.enrollments
      .filter(e => e.studentId === student.id && e.termId === activeTerm.id && e.status === 'enrolled')
      .map(e => {
        const sec = state.sections.find(s => s.id === e.sectionId);
        const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
        return { sec, course };
      })
      .filter(r => r.sec && r.course && !r.sec!.isManualGrade);

    // Total units: parents add (units + labUnits), children add just (units)
    const totalUnits = enrolledSections.reduce((s, r) => {
      if (r.sec!.parentSectionId) return s + r.course!.units; // child lab/rec
      return s + r.course!.units + (r.course!.labUnits ?? 0); // parent (embedded lab or standalone)
    }, 0);

    // Fee computation — all enrolled sections
    const allEnrolledForFees = state.enrollments
      .filter(e => e.studentId === student.id && e.termId === activeTerm.id && e.status === 'enrolled')
      .map(e => ({ sec: state.sections.find(s => s.id === e.sectionId) }))
      .filter(r => r.sec);

    let academicUnits = 0, labUnitsTotal = 0, nstpUnits = 0;
    allEnrolledForFees.forEach(r => {
      const sec = r.sec!;
      const course = state.courses.find(c => c.id === sec.courseId);
      if (!course || sec.isManualGrade) return;
      if (course.isNSTP) { nstpUnits += course.units; return; }
      if (course.isPE) return;
      // Lab/Rec: either section is explicitly typed, OR the course itself is a Lab/Recitation type
      const isLabSec = sec.sectionType === 'lab' || sec.sectionType === 'recitation'
        || course.type === 'Lab' || course.type === 'Recitation';
      if (isLabSec) {
        labUnitsTotal += course.units;
      } else {
        academicUnits += course.units;
        labUnitsTotal += course.labUnits ?? 0;
      }
    });

    const tuitionAmt   = fs ? academicUnits * fs.tuitionPerUnit : 0;
    const nstpAmt      = (fs && nstpUnits > 0) ? fs.nstpTuition : 0;
    const labFeeAmt    = fs ? labUnitsTotal * fs.labFeePerUnit : 0;
    const admissionAmt = fs?.admissionFees ?? 0;
    const entranceAmt  = fs?.entranceFees ?? 0;
    const registrationAmt = fs?.registrationFees ?? 0;
    const libraryAmt   = fs?.libraryFees ?? 0;
    const computerAmt  = fs?.computerFees ?? 0;
    const athleticAmt  = fs?.athleticFees ?? 0;
    const culturalAmt  = fs?.culturalFees ?? 0;
    const medDentalAmt = fs?.medicalDentalFees ?? 0;
    const guidanceAmt  = fs?.guidanceFees ?? 0;
    const handbookAmt  = fs?.handbookFees ?? 0;
    const schoolIdAmt  = fs?.schoolIdFees ?? 0;
    const devAmt       = fs?.developmentFees ?? 0;
    const edfAmt       = fs?.edf ?? 0;
    const changeOfMatricAmt = fs?.changeOfMatriculation ?? 0;
    const depositAmt   = fs?.depositFee ?? 0;

    const totalOtherFees = admissionAmt + entranceAmt + registrationAmt + libraryAmt + labFeeAmt +
      computerAmt + athleticAmt + culturalAmt + medDentalAmt + guidanceAmt +
      handbookAmt + schoolIdAmt + devAmt + edfAmt + changeOfMatricAmt + depositAmt;
    const totalTuition = tuitionAmt + nstpAmt;
    const totalBeforeSubsidy = totalTuition + totalOtherFees;
    const subsidyTuition = isFreeTuition ? totalTuition
      : (stCode && stCode in ST_CODE_RATES && !isFreeTuition)
        ? (stCode === '100'
            ? totalTuition
            : Math.min(tuitionAmt, academicUnits * Math.max(0, (fs?.tuitionPerUnit ?? 0) - ST_CODE_RATES[stCode])))
        : 0;
    const subsidyOther   = effectiveOtherFeesSubsidy ? totalOtherFees : (stCode === '100' && !isFreeTuition ? totalOtherFees : 0);
    const amountPayable  = Math.max(0, totalBeforeSubsidy - subsidyTuition - subsidyOther);
    const fmtPHP = (n: number) => n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // First Time to Enroll: YES if student has only 1 finalized semester (the current one), NO if 2 or more
    const enrolledSemesterCount = state.finalizedEnlistments.filter(fe => fe.studentId === student.id).length;
    const isFirstTimeEnroll = enrolledSemesterCount <= 1;

    // Course rows — each enrolled section gets its own row
    const courseRows = enrolledSections.map(r => {
      const sec = r.sec!;
      const course = r.course!;
      const isLabRec = sec.sectionType === 'lab' || sec.sectionType === 'recitation'
        || course.type === 'Lab' || course.type === 'Recitation';

      let schedRoom = fmtSched(sec.schedule);
      if (sec.labSchedule)
        schedRoom += ` / ${course.type === 'Lec+Rec' ? 'Rec' : 'Lab'}: ${fmtSched(sec.labSchedule)}`;

      // Lab fee: lab/rec sections use course.units, regular sections use course.labUnits
      const labFee = effectiveOtherFeesSubsidy ? 0
        : isLabRec ? course.units * (fs?.labFeePerUnit ?? 0)
        : (course.labUnits ?? 0) * (fs?.labFeePerUnit ?? 0);

      const rowUnits = sec.parentSectionId ? course.units : course.units + (course.labUnits ?? 0);

      return `<tr>
        <td class="lft">${course.code} ${course.title}</td>
        <td class="c">${sec.sectionCode}</td>
        <td class="c">${rowUnits}</td>
        <td>${schedRoom}</td>
        <td class="r">${fmtPHP(labFee)}</td>
      </tr>`;
    }).join('');

    const fillerRows = Array(8).fill('<tr class="fl"><td></td><td></td><td></td><td></td><td></td></tr>').join('');

    /* ── Shared header HTML (reused on both pages) ── */
    const hdrHtml = `
<div class="hdr">
  ${logoUrl
    ? `<img class="hdr-logo" src="${logoUrl}" alt="logo" />`
    : `<div class="hdr-logo-ph">&#127979;</div>`}
  <div class="hdr-text">
    <div class="hdr-inst">${instName}</div>
    <div class="hdr-form">Certificate of Registration &nbsp;&#9642;&nbsp; Form 5</div>
    <div class="hdr-date">${dateTimeIssued}</div>
  </div>
  <div style="text-align:right;color:rgba(255,255,255,0.85)">
    <div style="font-size:12px;font-weight:bold">${termName}</div>
    <div style="font-size:9px;opacity:0.75;margin-top:2px">Academic Year</div>
  </div>
</div>`;

    /* ── Compact student strip (reused on page 2) ── */
    const studentStripHtml = `
<div class="info-row" style="background:#fff5f5;border:1px solid #e0c8c8;margin-bottom:6px;border-radius:2px">
  <div class="info-cell" style="flex:0.7"><div class="ic-label">Student No.</div><div class="ic-val">${student.studentNumber ?? '—'}</div></div>
  <div class="info-cell" style="flex:2.2"><div class="ic-label">Name</div><div class="ic-val">${student.name.toUpperCase()}</div></div>
  <div class="info-cell" style="flex:1.5"><div class="ic-label">Degree Program</div><div class="ic-val-sm">${student.program ?? '—'}</div></div>
  <div class="info-cell" style="flex:1"><div class="ic-label">College</div><div class="ic-val-sm">${college}</div></div>
  <div class="info-cell"><div class="ic-label">Year Level</div><div class="ic-val-sm">${yearClass}</div></div>
</div>`;

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/>
<style>
  @page { size: A4 portrait; margin: 7mm 9mm; }
  * { box-sizing:border-box; margin:0; padding:0; font-family:Arial,Helvetica,sans-serif !important; }
  body { font-size:13px; color:#111; background:#fff;
         -webkit-print-color-adjust:exact; print-color-adjust:exact; }

  /* ── PAGE BREAK ── */
  .page { page-break-after: always; }
  .page:last-child { page-break-after: avoid; }

  /* ── HEADER ── */
  .hdr { background:#7B1113; color:#fff; display:flex; align-items:center;
          gap:10px; padding:5px 8px; margin-bottom:5px; }
  .hdr-logo { width:40px; height:40px; border-radius:50%; object-fit:cover;
               border:2px solid rgba(255,255,255,0.6); flex-shrink:0; }
  .hdr-logo-ph { width:40px; height:40px; border-radius:50%; background:rgba(255,255,255,0.15);
                  flex-shrink:0; display:flex; align-items:center; justify-content:center;
                  font-size:16px; color:rgba(255,255,255,0.5); }
  .hdr-text { flex:1; }
  .hdr-inst { font-size:13px; font-weight:bold; letter-spacing:0.05em; text-transform:uppercase; }
  .hdr-form { font-size:13px; opacity:0.85; margin-top:1px; letter-spacing:0.08em; text-transform:uppercase; }
  .hdr-date { font-size:10px; opacity:0.75; margin-top:3px; }

  /* ── BOX ── */
  .box { border:1px solid #aaa; }

  /* ── INFO STRIP ── */
  .info-row { display:flex; border-bottom:0.75px solid #bbb; background:#fafafa; }
  .info-cell { padding:3px 5px; border-right:0.75px solid #bbb; flex:1; min-width:0; }
  .info-cell:last-child { border-right:none; }
  .ic-label { font-size:9px; font-weight:bold; text-transform:uppercase; letter-spacing:0.04em; color:#666; }
  .ic-val { font-size:13px; font-weight:bold; color:#111; line-height:1.3; word-wrap:break-word; margin-top:1px; }
  .ic-val-sm { font-size:13px; font-weight:bold; color:#111; line-height:1.3; word-wrap:break-word; margin-top:1px; }
  .ic-val-xs { font-size:11px; color:#111; line-height:1.3; margin-top:1px; }

  /* ── SECTION HEADER ── */
  .sec-hdr { background:#7B1113; color:#fff; padding:3px 6px;
              font-size:10px; font-weight:bold; text-transform:uppercase;
              letter-spacing:0.08em; margin-bottom:0; }
  .sec-hdr-light { background:#ececec; border-bottom:0.75px solid #bbb;
                    padding:2px 5px; font-size:9px; font-weight:bold;
                    text-transform:uppercase; letter-spacing:0.06em; color:#444; }

  /* ── COURSE TABLE ── */
  table.ct { width:100%; border-collapse:collapse; }
  table.ct thead th { border:0.5px solid #bbb; padding:3px 4px; font-size:10px; font-weight:bold;
                       text-transform:uppercase; text-align:center; background:#f5f5f5; color:#444; white-space:nowrap; }
  table.ct thead th.lft { text-align:left; }
  table.ct tbody td { border:0.5px solid #ddd; padding:2.5px 4px; font-size:13px; vertical-align:top;
                       word-wrap:break-word; word-break:break-word; }
  table.ct tbody tr:nth-child(even) td { background:#fafafa; }
  table.ct tbody td.c { text-align:center; white-space:nowrap; }
  table.ct tbody td.r { text-align:right; white-space:nowrap; }
  table.ct tr.nf td { font-size:10px; text-align:center; color:#888; font-style:italic; padding:2px; }
  table.ct tr.fl td { height:10px; border-color:#eee; }

  /* ── FEE TABLE ── */
  table.ft { width:100%; border-collapse:collapse; }
  table.ft thead th { border:0.5px solid #bbb; padding:3px 5px; font-size:10px; font-weight:bold;
                       text-transform:uppercase; background:#f5f5f5; color:#444; }
  table.ft thead th.r { text-align:right; }
  table.ft tbody td { border:0.5px solid #ddd; padding:2px 5px; font-size:13px; color:#222; }
  table.ft tbody tr:nth-child(even) td { background:#fafafa; }
  table.ft tbody td.r { text-align:right; white-space:nowrap; font-family:monospace !important; }
  table.ft tr.sep td { border-top:1px solid #999; font-weight:bold; background:#f0f0f0 !important; }
  table.ft tr.sep td.r { font-family:monospace !important; }
  table.ft tr.sub td { color:#555; font-size:11px; padding-left:14px; }
  table.ft tr.sub td.r { font-family:monospace !important; }
  table.ft tr.payable td { background:#7B1113 !important; color:#fff !important;
                             font-weight:bold; font-size:13px; border-color:#5a0d0e; }
  table.ft tr.payable td.r { font-family:monospace !important; }

  /* ── CHIPS ── */
  .or-chip { background:#1e3a5f; color:#fff; border-radius:2px; padding:1px 5px;
              font-weight:bold; font-size:11px; white-space:nowrap; }
  .paid-chip { background:#2e7d32; color:#fff; border-radius:2px; padding:1px 5px; font-size:11px; font-weight:bold; }
  .partial-chip { background:#e65100; color:#fff; border-radius:2px; padding:1px 5px; font-size:11px; font-weight:bold; }
  .ra-badge { background:#e8f5e9; border:0.75px solid #388e3c; border-radius:2px; padding:3px 6px;
               font-size:11px; font-weight:bold; color:#1b5e20; margin-bottom:5px;
               display:flex; align-items:center; gap:4px; }
  .blank-field { display:inline-block; border-bottom:0.5px solid #888; }

  /* ── SIGNATURE BLOCK ── */
  .sig-block { flex:1; padding:4px 6px; border-right:0.75px solid #ddd; }
  .sig-block:last-child { border-right:none; }
  .sig-line { border-bottom:0.5px solid #666; margin:18px 0 2px; }
  .sig-caption { font-size:10px; color:#555; text-align:center; }

  /* ── PLEDGE ── */
  .pledge { padding:5px 6px; font-size:10px; line-height:1.55; }

  @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style>
</head><body>

<!-- ══════════════════════════════════════════════
     PAGE 1 — ENROLLED CLASSES
════════════════════════════════════════════════ -->
<div class="page">

  ${hdrHtml}

  <div class="box">

    <!-- INFO ROW 1 -->
    <div class="info-row">
      <div class="info-cell" style="flex:0.85">
        <div class="ic-label">Student No.</div>
        <div class="ic-val">${student.studentNumber ?? '—'}</div>
      </div>
      <div class="info-cell" style="flex:2.2">
        <div class="ic-label">Name</div>
        <div class="ic-val">${student.name.toUpperCase()}</div>
      </div>
      <div class="info-cell" style="flex:1.4">
        <div class="ic-label">College</div>
        <div class="ic-val-sm">${college}</div>
      </div>
      <div class="info-cell" style="flex:1.5">
        <div class="ic-label">Degree Program</div>
        <div class="ic-val-sm">${student.program ?? '—'}</div>
      </div>
      <div class="info-cell" style="flex:0.85">
        <div class="ic-label">Term &amp; S.Y.</div>
        <div class="ic-val-sm">${termName}</div>
      </div>
    </div>

    <!-- INFO ROW 2 -->
    <div class="info-row">
      <div class="info-cell" style="flex:1">
        <div class="ic-label">Academic Career</div>
        <div class="ic-val-sm">${academicCareerLabel}</div>
      </div>
      <div class="info-cell" style="flex:0.6">
        <div class="ic-label">Year Level</div>
        <div class="ic-val-sm">${yearClass}</div>
      </div>
      <div class="info-cell" style="flex:1.1">
        <div class="ic-label">Registration Status</div>
        <div class="ic-val-xs" style="min-height:12px;font-weight:bold;color:${amountPayable === 0 || (paymentRecord?.amountPaid ?? 0) >= amountPayable ? '#1b5e20' : '#b71c1c'}">
          ${amountPayable === 0 || (paymentRecord?.amountPaid ?? 0) >= amountPayable
            ? 'Registered (Fully Cleared)'
            : 'Provisionally Registered (In Progress)'}
        </div>
      </div>
      <div class="info-cell" style="flex:0.75">
        <div class="ic-label">Graduating This Term?</div>
        <div class="ic-val-xs" style="margin-top:3px">&#9633; YES &nbsp; &#9633; NO</div>
      </div>
      <div class="info-cell" style="flex:0.6">
        <div class="ic-label">Employed?</div>
        <div class="ic-val-xs" style="margin-top:3px">
          ${student.isEmployed ? '&#9745; YES &nbsp; &#9633; NO' : '&#9633; YES &nbsp; &#9745; NO'}
        </div>
      </div>
      <div class="info-cell" style="flex:1">
        <div class="ic-label">Country of Citizenship</div>
        <div class="ic-val-xs">${student.countryOfCitizenship ?? 'Philippines'}</div>
      </div>
      <div class="info-cell" style="flex:0.6">
        <div class="ic-label">Sex</div>
        <div class="ic-val-xs" style="min-height:12px">${student.sex ?? ''}</div>
      </div>
      <div class="info-cell">
        <div class="ic-label">Civil Status</div>
        <div class="ic-val-xs" style="min-height:12px">${student.civilStatus ?? ''}</div>
      </div>
    </div>

    <!-- COURSE TABLE SECTION -->
    <div class="sec-hdr">Enrolled Classes — ${termName}</div>

    <table class="ct">
      <thead><tr>
        <th class="lft" style="width:34%">Subject</th>
        <th style="width:12%">Section</th>
        <th style="width:5%">Units</th>
        <th class="lft" style="width:41%">Schedule &amp; Room</th>
        <th style="width:8%">Lab Fee</th>
      </tr></thead>
      <tbody>
        ${courseRows}
        <tr class="nf"><td colspan="5">&#8213; nothing follows &#8213;</td></tr>
        ${fillerRows}
      </tbody>
    </table>

    <!-- TOTAL + RA 10931 -->
    <div style="display:flex;border-top:0.75px solid #bbb">
      <div style="flex:1;padding:3px 6px;border-right:0.75px solid #bbb">
        <div class="ic-label">Remaining semesters to avail Free Tuition (RA 10931):</div>
        <div style="min-height:10px"></div>
      </div>
      <div style="padding:3px 8px;display:flex;align-items:center;gap:4px;background:#fff5f5">
        <span style="font-size:9px;font-weight:bold;color:#555">Total Units:</span>
        <span style="font-size:13px;font-weight:bold;color:#7B1113">${totalUnits}.00</span>
      </div>
    </div>

    <!-- ADVISER + PROGRAM + FIRST TIME -->
    <div style="display:flex;border-top:0.75px solid #bbb">
      <div style="flex:1.2;padding:4px 6px;border-right:0.75px solid #bbb">
        <div class="ic-label">Academic Program</div>
        <div style="font-size:13px;font-weight:bold;margin-top:2px;line-height:1.3;word-wrap:break-word">${student.program ?? '—'}</div>
      </div>
      <div style="flex:1;padding:4px 6px;border-right:0.75px solid #bbb">
        <div class="ic-label" style="margin-bottom:16px">Signature &amp; Printed Name of Adviser</div>
        <div style="border-bottom:0.5px solid #888;margin-bottom:1px"></div>
        <div class="ic-label">Printed Name</div>
      </div>
      <div style="flex:0.6;padding:4px 6px;border-right:0.75px solid #bbb">
        <div class="ic-label">First Time to Enroll in University?</div>
        <div style="font-size:9px;margin-top:5px">
          ${isFirstTimeEnroll ? '&#9745; YES' : '&#9633; YES'}<br>
          ${isFirstTimeEnroll ? '&#9633; NO' : '&#9745; NO'}
        </div>
      </div>
      <div style="flex:0.7;padding:4px 6px">
        <div class="ic-label">Reasons for Underloading</div>
        <div style="min-height:22px;font-size:11px">${myUnderloadApp?.reason ? myUnderloadApp.reason.replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''}</div>
      </div>
    </div>

    <!-- ADDRESS + CONTACTS -->
    <div style="padding:4px 6px;border-top:0.75px solid #bbb">
      <div style="display:flex;gap:12px;margin-bottom:2px">
        <div style="flex:2">
          <div class="ic-label">Present Address</div>
          <div style="border-bottom:0.5px solid #aaa;margin:2px 0 0;min-height:14px;font-size:11px">${student.presentAddress ? student.presentAddress.replace(/</g,'&lt;').replace(/>/g,'&gt;') : ''}</div>
        </div>
        <div style="flex:0.7">
          <div class="ic-label">Tel. No.</div>
          <div style="border-bottom:0.5px solid #aaa;margin:2px 0 0;min-height:14px;font-size:11px">${student.presentAddressTel ?? ''}</div>
        </div>
      </div>
      <div style="display:flex;gap:12px;margin-top:4px;margin-bottom:2px">
        <div style="flex:2">
          <div class="ic-label">Employer / Name &amp; Address</div>
          <div style="border-bottom:0.5px solid #aaa;margin:2px 0 0;min-height:14px;font-size:11px">${student.isEmployed && student.employer ? student.employer.replace(/</g,'&lt;').replace(/>/g,'&gt;') : ''}</div>
        </div>
        <div style="flex:0.7">
          <div class="ic-label">Tel. No.</div>
          <div style="border-bottom:0.5px solid #aaa;margin:2px 0 0;min-height:14px;font-size:11px">${student.isEmployed ? (student.employerTel ?? '') : ''}</div>
        </div>
      </div>
      <div style="display:flex;gap:12px;margin-top:4px">
        <div style="flex:2">
          <div class="ic-label">Emergency Contact Person</div>
          <div style="border-bottom:0.5px solid #aaa;margin:2px 0 0;min-height:14px;font-size:11px">${student.emergencyContact ? student.emergencyContact.replace(/</g,'&lt;').replace(/>/g,'&gt;') : ''}</div>
        </div>
        <div style="flex:0.7">
          <div class="ic-label">Tel. No.</div>
          <div style="border-bottom:0.5px solid #aaa;margin:2px 0 0;min-height:14px;font-size:11px">${student.emergencyContactTel ?? ''}</div>
        </div>
      </div>
    </div>

    <!-- PLEDGE -->
    <div class="pledge" style="border-top:0.75px solid #bbb">
      <div style="font-size:9px;font-weight:bold;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;color:#7B1113">
        Student Pledge &amp; Data Privacy
      </div>
      <div style="margin-bottom:3px">All information provided above is true and correct.</div>
      <div style="margin-bottom:3px">In consideration of my admission to ${instName} and of the privileges of a student in this institution, I hereby promise and pledge to abide by and comply with all the rules and regulations laid down by competent authority in the University System and in the College or School in which I am enrolled.</div>
      <div>I have read and understood the Privacy Notice for Students and hereby consent to the processing of my personal and sensitive personal information by the University for academic and administrative purposes.</div>
      <div style="display:flex;gap:10px;margin-top:10px">
        <div style="flex:1">
          <div style="border-bottom:0.5px solid #555;margin-bottom:2px"></div>
          <div style="font-size:6px;color:#555;text-align:center">Signature of Student &amp; Date</div>
        </div>
        <div style="flex:1">
          <div style="border-bottom:0.5px solid #555;margin-bottom:2px"></div>
          <div style="font-size:6px;color:#555;text-align:center">Parent / Guardian Signature (if below 18) &amp; Date</div>
        </div>
      </div>
    </div>

  </div><!-- /box -->
</div><!-- /page 1 -->


<!-- ══════════════════════════════════════════════
     PAGE 2 — FEES, PAYMENT & CERTIFICATION
════════════════════════════════════════════════ -->
<div class="page">

  ${hdrHtml}
  ${studentStripHtml}

  <!-- TWO COLUMNS: Fee table (left) + Payment & Certification (right) -->
  <div style="display:flex;gap:6px">

    <!-- LEFT: Fee Assessment -->
    <div style="flex:1;min-width:0">
      <div class="sec-hdr" style="margin-bottom:0">Fee Assessment</div>
      <table class="ft">
        <thead><tr>
          <th>Item</th>
          <th class="r">Amount (&#8369;)</th>
        </tr></thead>
        <tbody>
          <tr><td>Tuition for Academic Courses (${academicUnits} units × &#8369;${fs?.tuitionPerUnit ?? 0}/u)</td><td class="r">${fmtPHP(tuitionAmt)}</td></tr>
          <tr><td>NSTP Tuition</td><td class="r">${fmtPHP(nstpAmt)}</td></tr>
          <tr><td>Laboratory Fees</td><td class="r">${fmtPHP(labFeeAmt)}</td></tr>
          <tr><td>Admission Fees</td><td class="r">${fmtPHP(admissionAmt)}</td></tr>
          <tr><td>Entrance Fees</td><td class="r">${fmtPHP(entranceAmt)}</td></tr>
          <tr><td>Registration Fees</td><td class="r">${fmtPHP(registrationAmt)}</td></tr>
          <tr><td>Library Fees</td><td class="r">${fmtPHP(libraryAmt)}</td></tr>
          <tr><td>Computer Fees</td><td class="r">${fmtPHP(computerAmt)}</td></tr>
          <tr><td>Athletic Fees</td><td class="r">${fmtPHP(athleticAmt)}</td></tr>
          <tr><td>Cultural Fees</td><td class="r">${fmtPHP(culturalAmt)}</td></tr>
          <tr><td>Medical &amp; Dental Fees</td><td class="r">${fmtPHP(medDentalAmt)}</td></tr>
          <tr><td>Guidance Fees</td><td class="r">${fmtPHP(guidanceAmt)}</td></tr>
          <tr><td>Handbook Fees</td><td class="r">${fmtPHP(handbookAmt)}</td></tr>
          <tr><td>School ID Fees</td><td class="r">${fmtPHP(schoolIdAmt)}</td></tr>
          <tr><td>Development Fees</td><td class="r">${fmtPHP(devAmt)}</td></tr>
          <tr><td>EDF</td><td class="r">${fmtPHP(edfAmt)}</td></tr>
          <tr><td>Change of Matriculation</td><td class="r">${fmtPHP(changeOfMatricAmt)}</td></tr>
          <tr><td>Deposit Fee</td><td class="r">${fmtPHP(depositAmt)}</td></tr>
          <tr class="sep"><td>Total Tuition</td><td class="r">${fmtPHP(totalTuition)}</td></tr>
          <tr class="sep"><td>Total Other School Fees</td><td class="r">${fmtPHP(totalOtherFees)}</td></tr>
          <tr class="sub"><td>Less: Scholarship / Privilege</td><td class="r">(${fmtPHP(0)})</td></tr>
          <tr class="sub"><td>Less: Tuition Subsidy ${isST100 ? '(ST-100 Full Scholarship)' : isRAOnly ? '(RA 10931)' : (stCode ? `(ST-${stCode})` : '')}</td><td class="r">(${fmtPHP(subsidyTuition)})</td></tr>
          <tr class="sub"><td>Less: Other Fees Subsidy ${isST100 ? '(ST-100 / Full Discount)' : (isRAOnly ? '(RA 10931 / Full Discount)' : '')}</td><td class="r">(${fmtPHP(subsidyOther)})</td></tr>
          <tr class="sub"><td>Less: Loan</td><td class="r">(${fmtPHP(0)})</td></tr>
          <tr class="payable"><td>&#9658; AMOUNT PAYABLE</td><td class="r">&#8369; ${fmtPHP(amountPayable)}</td></tr>
        </tbody>
      </table>
    </div>

    <!-- RIGHT: Payment Details + Certification -->
    <div style="flex:0 0 200px;min-width:0;display:flex;flex-direction:column;gap:6px">

      <!-- Payment Details -->
      <div style="border:1px solid #aaa;border-radius:2px;overflow:hidden">
        <div class="sec-hdr">Payment Details</div>
        <div style="padding:5px 6px">
          ${isST100 ? `<div class="ra-badge" style="background:#f5f3ff;border-color:#7c3aed;color:#4c1d95">&#10003; ST-100 — Full Scholarship (100% Discount)</div>` : isRAOnly ? `<div class="ra-badge">&#10003; RA 10931 — Free Tuition &amp; Other School Fees Subsidy</div>` : (stCode ? `<div class="ra-badge" style="background:#f5f3ff;border-color:#7c3aed;color:#4c1d95">&#10003; ST-${stCode} Scholarship Discount Applied</div>` : '')}
          ${paymentTxs.length > 0 ? `
          ${paymentTxs.map((t, i) => `
          <div style="display:flex;gap:4px;align-items:center;margin-bottom:2px;font-size:9px">
            <span class="or-chip">OR: ${t.orNumber}</span>
            <span style="font-weight:bold">&#8369;${t.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
            ${i === paymentTxs.length - 1 && paymentRecord?.status === 'paid'
              ? `<span class="paid-chip">&#10003; PAID</span>`
              : (i === paymentTxs.length - 1 ? `<span class="partial-chip">PARTIAL</span>` : '')}
          </div>
          <div style="font-size:10px;color:#666;margin-bottom:3px">${new Date(t.processedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</div>`).join('')}
          <div style="border-top:0.5px solid #ddd;padding-top:3px;margin-top:2px;font-size:13px">
            <div>Amount Paid: <strong>&#8369;${(paymentRecord?.amountPaid ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong></div>
            ${amountPayable > 0 && (paymentRecord?.amountPaid ?? 0) < amountPayable
              ? `<div style="color:#c62828">Balance: <strong>&#8369;${(amountPayable - (paymentRecord?.amountPaid ?? 0)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong></div>`
              : ''}
          </div>
          ` : `
          <div style="font-size:11px;color:#777;margin-bottom:3px">For Cashier's use:</div>
          <div style="font-size:13px;margin-bottom:3px">
            O.R. No. <span class="blank-field" style="min-width:90px"></span>
          </div>
          <div style="font-size:13px;margin-bottom:3px">
            Date <span class="blank-field" style="min-width:100px"></span>
          </div>
          <div style="font-size:13px;margin-bottom:3px">
            Amount &#8369; <span class="blank-field" style="min-width:85px"></span>
          </div>
          <div style="font-size:13px;margin-bottom:3px">
            Cashier: <span class="blank-field" style="min-width:80px"></span>
          </div>
          <div style="font-size:13px">
            Mode: <span class="blank-field" style="min-width:85px"></span>
          </div>
          `}
        </div>
      </div>

      <!-- Certification -->
      <div style="border:1px solid #aaa;border-radius:2px;overflow:hidden;flex:1">
        <div class="sec-hdr">Certification</div>
        <div style="padding:5px 6px">
          <div style="display:flex;gap:5px;margin-bottom:5px;padding-bottom:4px;border-bottom:0.5px solid #ddd">
            <div style="flex:1">
              <div class="ic-label">Scholarship / Privileges</div>
              <div style="font-size:13px;font-weight:bold;color:#1b5e20;min-height:11px">${isST100 ? 'ST-100 Full Scholarship' : isRAOnly ? 'RA 10931' : (stCode ? `ST-${stCode} Discount` : '')}</div>
            </div>
            <div style="flex:0.8;border-left:0.5px solid #ddd;padding-left:5px">
              <div class="ic-label">ST Code</div>
              <div style="font-size:13px;font-weight:bold;color:#6b21a8;min-height:11px">${paymentRecord?.stCode ? `ST-${paymentRecord.stCode}` : ''}</div>
            </div>
          </div>

          <div style="margin-bottom:4px">
            <div style="border-bottom:0.5px solid #777;margin-bottom:2px;margin-top:16px"></div>
            <div style="display:flex;justify-content:space-between;align-items:baseline">
              <div class="sig-caption" style="font-size:10px;color:#555">Certified By</div>
              <div style="font-size:10px;font-weight:bold;color:#7B1113">${assessedByUser?.name ?? ''}</div>
            </div>
          </div>
          <div style="margin-bottom:4px">
            <div style="border-bottom:0.5px solid #777;margin-bottom:2px;margin-top:16px"></div>
            <div class="sig-caption">Advised By</div>
          </div>
          <div style="margin-bottom:4px">
            <div style="border-bottom:0.5px solid #777;margin-bottom:2px;margin-top:16px"></div>
            <div class="sig-caption">Form 5 Issued By</div>
          </div>
          <div style="margin-bottom:4px">
            <div style="border-bottom:0.5px solid #777;margin-bottom:2px;margin-top:16px"></div>
            <div class="sig-caption">Assessed By</div>
          </div>
          <div style="font-size:9px;color:#888;text-align:right;margin-top:6px;padding-top:3px;border-top:0.5px solid #eee">${dateTimeIssued}</div>
        </div>
      </div>

    </div><!-- /right col -->
  </div><!-- /two columns -->

</div><!-- /page 2 -->

</body></html>`;
    const w = window.open('', '_blank', 'width=860,height=1100');
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
      // Allow lecture + lab/rec of same course to both appear
      if (s!.sectionType === 'lab' || s!.sectionType === 'recitation' || !!s!.parentSectionId) return true;
      if (seenCourseIds.has(s!.courseId)) return false; // same course enrolled twice — show only first
      seenCourseIds.add(s!.courseId);
      return true;
    }) as Section[];
  // Exclude lab/recitation child sections from the main list — they only appear via the lab picker dialog
  const availableSections = state.sections.filter(s =>
    s.termId === activeTerm.id &&
    s.sectionCode !== '__MANUAL__' &&
    // Hide child sections (those with a parentSectionId) from the main browse list
    !s.parentSectionId
  );
  const currentUnits = getCurrentUnits(student.id, activeTerm.id);
  const maxUnits = activeTerm.studentMaxUnitsOverrides?.[student.id] ?? activeTerm.maxUnits ?? 21;
  // PE/NSTP units already enlisted — capped at 6 per semester (separate pool)
  const myPeNstpUnits = myEnrolledSections.reduce((acc, s) => {
    if (s.parentSectionId) return acc; // skip child sections — units counted via parent lecture
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
    myEnrolledSections.some(e => {
      // Skip overlap check for parent ↔ child pairs (lecture + its lab/rec are intentionally paired)
      if (e.id === sec.parentSectionId || e.parentSectionId === sec.id) return false;
      return schedulesOverlap(e.schedule, sec.schedule) ||
        (sec.labSchedule && schedulesOverlap(e.schedule, sec.labSchedule)) ||
        (e.labSchedule && schedulesOverlap(e.labSchedule, sec.schedule));
    });

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
    // Exclude parent↔child pairs from overlap/duplicate checks (lecture + its lab group are intentionally paired)
    const unrelatedCartSections = cartSections.filter(cs =>
      cs.parentSectionId !== sec.id && cs.id !== sec.parentSectionId
    );
    const hasCartOverlap = !enrolled && unrelatedCartSections.some(cs =>
      schedulesOverlap(sec.schedule, cs.schedule) ||
      (sec.labSchedule ? schedulesOverlap(sec.labSchedule, cs.schedule) : false) ||
      (cs.labSchedule ? schedulesOverlap(sec.schedule, cs.labSchedule) : false)
    );
    const isCartDuplicate = !enrolled && !!course && unrelatedCartSections.some(cs => cs.courseId === course.id);
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
    // Consent lookup: first try this specific section; for child (lab/rec) sections, fall back to parent lecture's consent (matches enlistSection behavior)
    const consentRecord = state.consents.find(c => c.studentId === student.id && c.sectionId === sec.id && c.termId === activeTerm.id)
      ?? (sec.parentSectionId
        ? state.consents.find(c => c.studentId === student.id && c.sectionId === sec.parentSectionId && c.termId === activeTerm.id)
        : undefined);
    // OCS "Waiver of Pre-requisite" bypasses the prerequisite check
    const hasOCSPrereqWaiver =
      consentRecord?.ocsConsentStatus === 'approved' &&
      consentRecord?.ocsConsentType === 'Waiver of Pre-requisite';
    const effectivePrereqCheck = hasOCSPrereqWaiver ? { passed: true, missing: [] } : prereqCheck;
    const prereqUnsatisfied = !effectivePrereqCheck.passed || !coreqCheck.passed;
    // Always-required consents + conditional consents (only when prerequisites/co-requisites not satisfied)
    const needsCOI = ((course?.requiresCOI ?? false) || (prereqUnsatisfied && (course?.coiIfUnsatisfied ?? false))) && consentRecord?.coiStatus !== 'approved';
    const needsDC = ((course?.requiresDeptConsent ?? false) || (prereqUnsatisfied && (course?.deptConsentIfUnsatisfied ?? false))) && consentRecord?.deptConsentStatus !== 'approved';
    const needsOCS = ((course?.requiresOCSConsent ?? false) || (prereqUnsatisfied && (course?.ocsConsentIfUnsatisfied ?? false))) && consentRecord?.ocsConsentStatus !== 'approved';
    const consentBlocked = needsCOI || needsDC || needsOCS;
    // INC restriction: student cannot re-enroll in a course where they have an active uncompleted INC
    const incRestricted = !enrolled && !!course && isIncEnrollmentRestricted(
      student.id, course.id, state.grades, state.sections, state.terms
    );
    // GE Elective restriction: Elective GE courses require an approved GE Elective plan containing this course
    const geElectiveBlocked = !enrolled && !!course &&
      course.category === 'Elective GE' &&
      !(state.geElectiveRequests ?? []).find(
        r => r.studentId === student.id && r.status === 'approved' && r.courseIds.includes(course.id)
      );
    // Year standing restriction: course requires minimum year classification
    const _prog = state.degreePrograms?.find(p => p.name === student.program);
    const _yearStandingProgramCourseIds = buildProgramCourseIdSet(state.graduationRequirements, _prog?.collegeId ?? '', _prog?.id ?? '');
    const _passedUnits = getPassedUnits(student.id, state.grades, state.sections, state.courses, state.enrollments, _yearStandingProgramCourseIds);
    const yearStandingBlocked = !enrolled && !!course && !!course.minYearStanding && !course.isPE && !course.isNSTP && (() => {
      const _yearRank: Record<string, number> = { Freshman: 0, Sophomore: 1, Junior: 2, Senior: 3 };
      const _yearLevelToClass = (yl: number) => yl <= 1 ? 'Freshman' : yl === 2 ? 'Sophomore' : yl === 3 ? 'Junior' : 'Senior';
      const _profileYearClass = student.yearLevel ? _yearLevelToClass(student.yearLevel) : null;
      const _totalProgUnits = _prog?.totalUnits ?? 0;
      const _unitYearClass = _totalProgUnits > 0 ? getYearClassification(_passedUnits, _totalProgUnits, _prog?.degreeType) : null;
      const _profileRank = _profileYearClass ? (_yearRank[_profileYearClass] ?? 0) : -1;
      const _unitRank = _unitYearClass ? (_yearRank[_unitYearClass] ?? 0) : -1;
      // Default to Freshman when no data — ensures restrictions are always enforced
      const _effectiveClass = (_profileRank < 0 && _unitRank < 0)
        ? 'Freshman'
        : (_profileRank >= _unitRank ? _profileYearClass! : _unitYearClass!);
      return (_yearRank[_effectiveClass] ?? 0) < (_yearRank[course.minYearStanding] ?? 0);
    })();
    // Min passed units restriction: course requires a minimum number of passed units
    const minUnitsBlocked = !enrolled && !!course && course.minUnitsRequired != null && !course.isPE && !course.isNSTP
      && _passedUnits < (course.minUnitsRequired ?? 0);
    return { course, faculty, enrolled: !!enrolled, isFull, hasOverlap, isCourseDuplicate, hasCartOverlap, isCartDuplicate, prereqCheck: effectivePrereqCheck, coreqCheck, unitCheck, hasApprovedPrerog, consentBlocked, incRestricted, geElectiveBlocked, yearStandingBlocked, minUnitsBlocked };
  };

  // ── Finalization validation ────────────────────────────────────────────────
  const totalEnrolledAcademicUnits = myEnrolledSections.reduce((sum, sec) => {
    const course = state.courses.find(c => c.id === sec.courseId);
    if (!course || course.isPE || course.isNSTP) return sum;
    if (sec.parentSectionId) return sum; // skip child sections — units counted via parent lecture
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
        // Orphan child sections: lab/rec enrolled without its parent lecture
        ...(() => {
          const enrolledLectureIds = new Set(myEnrolledSections.filter(s => !s.parentSectionId).map(s => s.id));
          return myEnrolledSections
            .filter(s => !!s.parentSectionId && !enrolledLectureIds.has(s.parentSectionId!))
            .map(child => {
              const course = state.courses.find(c => c.id === child.courseId);
              return { courseCode: course?.code ?? child.sectionCode, problem: 'Lab/Rec section enrolled without its lecture — contact OCS to correct your enrollment.' };
            });
        })(),
      ]
    : [];

  // ── Handlers ────────────────────────────────────────────────────────
  const handleDrop = (sectionId: string) => {
    const result = dropSection(student.id, sectionId, activeTerm.id);
    if (result.success) notifySuccess('Section Dropped', result.message ?? 'Section removed from your enrollment.');
    else notifyError('Cannot Drop', result.message ?? 'Cannot drop this section.');
  };

  // Pre-finalization removal (no DRP grade)
  const handleRemove = (sectionId: string) => {
    const result = removeSection(student.id, sectionId, activeTerm.id);
    if (result.success) notifySuccess('Course Removed', result.message ?? 'Course removed from your enlistment.');
    else notifyError('Cannot Remove', result.message ?? 'Cannot remove this course.');
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
        notifyError('Specialization Plan Required', `${course.code} is a Specialized course. Submit an approved Specialization Plan via the Specialization Planner first.`);
        return;
      }
    }
    // Restrict: cannot add same course code if already enlisted or already in cart
    if (courseId) {
      const alreadyEnlisted = myEnrollments.some(e => {
        const s = state.sections.find(x => x.id === e.sectionId);
        return s?.courseId === courseId && (s?.sectionType !== 'lab' && s?.sectionType !== 'recitation');
      });
      if (alreadyEnlisted) { notifyError('Already Enlisted', 'You are already enlisted in this course for this term.'); return; }
      const inCartAlready = cart.some(id => {
        const s = state.sections.find(x => x.id === id);
        return s?.courseId === courseId && (s?.sectionType !== 'lab' && s?.sectionType !== 'recitation');
      });
      if (inCartAlready) { notifyError('Already in Cart', 'This course is already in your cart.'); return; }
    }
    // If this section has child lab/rec groups, open the lab picker
    const childSectionsOfCart = state.sections.filter(s => s.parentSectionId === sectionId && s.termId === activeTerm?.id);
    if (childSectionsOfCart.length > 0) {
      setLabPickerSec(sec!);
      setLabPickerMode('cart');
      return;
    }
    setCart(c => [...c, sectionId]);
    notifySuccess('Added to Cart', `${course?.code ?? sectionId} Sec ${sec?.sectionCode ?? ''} added to your cart.`);
  };

  const removeFromCart = (sectionId: string) => {
    // Also remove any linked child sections (lab/rec) from cart
    setCart(c => c.filter(id => {
      if (id === sectionId) return false;
      const cs = state.sections.find(s => s.id === id);
      return cs?.parentSectionId !== sectionId;
    }));
  };

  // Core enlistment action (called after all checks pass)
  const performEnlist = async (sec: Section): Promise<boolean> => {
    setEnlisting(sec.id);
    const result = await enlistSection(student.id, sec.id, activeTerm.id, cart);
    setEnlisting(null);
    if (result.success) {
      setEnlistWarning(null);
      const course = state.courses.find(c => c.id === sec.courseId);
      notifySuccess('Enlisted!', `${course?.code ?? sec.sectionCode} Sec ${sec.sectionCode} added to your enlistment.`);
    } else {
      const course = state.courses.find(c => c.id === sec.courseId);
      showWarning(course?.code ?? sec.sectionCode, sec.sectionCode, [result.message ?? 'Enlistment failed. Please try again.']);
    }
    return result.success;
  };

  const handleEnlist = async (sec: Section): Promise<boolean> => {
    if (isPaymentHeld) { toast.error('Enrollment on hold', { description: `Unpaid fees from ${holdDisplayTerm?.name ?? 'a prior term'}. Settle your account at the OCS first.` }); return false; }
    const { isFull, hasOverlap, isCourseDuplicate, prereqCheck, coreqCheck, unitCheck, course, hasApprovedPrerog, consentBlocked, geElectiveBlocked, yearStandingBlocked, minUnitsBlocked } = getSectionInfo(sec);
    if (isFinalized && !appealBypass) { toast.error('Enlistment finalized'); return false; }
    if (!effectiveEnlistmentOpen) { toast.error('Enlistment is closed'); return false; }
    const schedError = checkEnrollmentSchedule();
    if (schedError) { toast.error('Not your enrollment day', { description: schedError }); return false; }
    // ── Run ALL validation checks BEFORE handling child sections ──
    if (geElectiveBlocked) { notifyError('GE Elective Plan Required', `${course?.code ?? 'This course'} is an Elective GE course. Submit an approved GE Elective Plan via the GE Electives module before enlisting.`); return false; }
    if (consentBlocked) { showWarning(course?.code ?? sec.sectionCode, sec.sectionCode, ['This course requires an approved consent (COI / Dept / OCS) before enlisting.']); return false; }
    if (yearStandingBlocked) { showWarning(course?.code ?? sec.sectionCode, sec.sectionCode, [`This course requires at least ${course?.minYearStanding} year standing.`]); return false; }
    if (minUnitsBlocked) { showWarning(course?.code ?? sec.sectionCode, sec.sectionCode, [`This course requires at least ${course?.minUnitsRequired} passed units.`]); return false; }
    if (hasOverlap) { showWarning(course?.code ?? sec.sectionCode, sec.sectionCode, ['Schedule conflict with an already enlisted course.']); return false; }
    if (isCourseDuplicate) { showWarning(course?.code ?? sec.sectionCode, sec.sectionCode, ['Already enlisted in another section of this course.']); return false; }
    if (!prereqCheck.passed) { showWarning(course?.code ?? sec.sectionCode, sec.sectionCode, [`Prerequisites not satisfied — missing: ${prereqCheck.missing.join(', ')}`]); return false; }
    if (!coreqCheck.passed) { showWarning(course?.code ?? sec.sectionCode, sec.sectionCode, [`Corequisites not satisfied — must also enlist: ${coreqCheck.missing.join(', ')}`]); return false; }
    if (!unitCheck.ok) { notifyError('Unit Limit Exceeded', unitCheck.isPeNstp ? 'Would exceed the 6-unit PE/NSTP limit per semester.' : `Would exceed your ${maxUnits} unit limit.`); return false; }
    if (isFull && !hasApprovedPrerog) {
      if (prerogativeOpen) {
        notifyError(
          'Section is Full',
          'This section has no available slots. You may submit a Prerogative Request to request a seat.',
          { label: 'Go to Prerogatives', onClick: () => { setErrorNotif(null); navigate('/student/prerogatives'); } }
        );
      } else {
        notifyError('Section is Full', 'This section has no available slots and Prerogative requests are not currently open.');
      }
      return false;
    }
    // POS hard block: course must be in the student's Plan of Study (PE/NSTP are always open — exempt)
    if (posAllCourseIds.size > 0 && course && !posAllCourseIds.has(course.id) && !course.isPE && !course.isNSTP) {
      notifyError('Not in Your Plan of Study', `${course.code} is not part of your Plan of Study. Contact your OCS to update your plan before enlisting.`);
      return false;
    }
    // ── Handle child lab/rec groups (after all validation passes) ──
    const childSectionsOfLec = state.sections.filter(s => s.parentSectionId === sec.id && s.termId === activeTerm.id);
    if (childSectionsOfLec.length > 0) {
        const cartChildId = cart.find(id => childSectionsOfLec.some(cs => cs.id === id));
        if (cartChildId) {
          const cartChild = state.sections.find(s => s.id === cartChildId)!;
          const childType = cartChild.sectionType === 'recitation' ? 'Recitation' : 'Lab';
          const isLabFull = cartChild.enrolled >= cartChild.slots;
          const labHasPrerog = !!state.prerogatives.find(p => p.studentId === student.id && p.sectionId === cartChild.id && p.termId === activeTerm.id && p.status === 'approved');
          if (isLabFull && !labHasPrerog) {
            notifyError(`${childType} Group is Full`, `${cartChild.sectionCode} has no available slots. Please select a different ${childType.toLowerCase()} group.`);
            return false;
          }
          // Check the child section's schedule for conflicts with already enlisted sections
          const childHasOverlap = myEnrolledSections.some(e => {
            if (e.id === cartChild.parentSectionId || e.parentSectionId === cartChild.id) return false;
            return schedulesOverlap(e.schedule, cartChild.schedule);
          });
          if (childHasOverlap) {
            showWarning(course?.code ?? sec.sectionCode, cartChild.sectionCode, [`${childType} group schedule conflicts with an already enlisted course.`]);
            return false;
          }
          // Enlist lecture, then lab
          const r1 = await performEnlist(sec);
          if (r1) {
            const labResult = await performEnlist(cartChild);
            if (!labResult) {
              // Lab failed after lecture succeeded — open picker to choose another group
              setLabPickerSec(sec);
              setLabPickerMode('enlist-lab-only');
            }
          }
          return r1;
        }
        // No lab picked yet — open picker
        setLabPickerSec(sec);
        setLabPickerMode('enlist');
        return false;
    }
    return performEnlist(sec);
  };

  const handleBulkEnlist = async () => {
    if (isPaymentHeld) { toast.error('Enrollment on hold', { description: `Unpaid fees from ${holdDisplayTerm?.name ?? 'a prior term'}. Settle your account at the OCS first.` }); return; }
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
      // Skip child sections (lab/rec) whose parent lecture is also in the cart —
      // they will be auto-enlisted when the parent is processed below.
      if (sec.parentSectionId && cart.includes(sec.parentSectionId)) continue;
      // cartRows already excludes enrolled sections — no need for alreadyEnlisted check here
      const { isFull, hasOverlap, isCourseDuplicate, prereqCheck, coreqCheck, unitCheck, hasApprovedPrerog: batchPrerog, consentBlocked: batchConsentBlocked, geElectiveBlocked: batchGeBlocked, yearStandingBlocked: batchYearBlocked, minUnitsBlocked: batchMinUnitsBlocked } = getSectionInfo(sec);
      const course = state.courses.find(c => c.id === sec.courseId);
      const batchOverlap = batchEnlisted.some(bs =>
        // Skip overlap check for parent↔child pairs (lecture + its lab are intentionally paired)
        bs.parentSectionId === sec.id || bs.id === sec.parentSectionId ? false :
        schedulesOverlap(sec.schedule, bs.schedule) ||
        (sec.labSchedule ? schedulesOverlap(sec.labSchedule, bs.schedule) : false) ||
        (bs.labSchedule ? schedulesOverlap(sec.schedule, bs.labSchedule) : false)
      );
      const batchDuplicate = !!course && batchEnlisted.some(bs =>
        bs.courseId === course.id &&
        bs.parentSectionId !== sec.id &&
        bs.id !== sec.parentSectionId
      );

      const reasons: string[] = [];
      if (batchGeBlocked) reasons.push('No approved GE Elective Plan for this course — submit via GE Electives module');
      if (batchConsentBlocked) reasons.push('This course requires an approved consent (COI / Dept Consent / OCS Consent) before enlisting');
      if (batchYearBlocked) reasons.push(`This course requires at least ${course?.minYearStanding} year standing — your current classification does not meet the requirement`);
      if (batchMinUnitsBlocked) reasons.push(`This course requires at least ${course?.minUnitsRequired} passed units — you have not completed the minimum unit requirement`);
      if (posAllCourseIds.size > 0 && course && !posAllCourseIds.has(course.id) && !course.isPE && !course.isNSTP) reasons.push('Course is not in your Plan of Study — contact OCS to update your plan');
      if (isFull && !batchPrerog) reasons.push('Section is full');
      if (hasOverlap || batchOverlap) reasons.push('Schedule conflict with an enrolled or already-enlisted course');
      if (batchDuplicate) reasons.push('Already enlisted in another section of this course this batch');
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
      // Block Lec+Lab/Rec courses if no lab/rec group is in the cart
      const childSectionsForBatch = state.sections.filter(s => s.parentSectionId === sec.id && s.termId === activeTerm.id);
      const cartChildId = cart.find(id => {
        const cs = state.sections.find(s => s.id === id);
        return cs?.parentSectionId === sec.id;
      });
      if (childSectionsForBatch.length > 0 && !cartChildId) {
        const childTypeBatch = childSectionsForBatch[0]?.sectionType === 'recitation' ? 'Recitation' : 'Lab';
        failures.push({ code: course?.code ?? sec.sectionCode, section: sec.sectionCode, reasons: [`No ${childTypeBatch} group selected — open this course and pick a ${childTypeBatch.toLowerCase()} group before enlisting`] });
        continue;
      }
      // Pre-check for Lec+Lab/Rec: if the paired cart child (lab/rec) is full, block the lecture too
      if (cartChildId) {
        const cartChildPre = state.sections.find(s => s.id === cartChildId);
        if (cartChildPre) {
          if (cartChildPre.enrolled >= cartChildPre.slots) {
            const labHasPrerogPre = !!state.prerogatives.find(p => p.studentId === student.id && p.sectionId === cartChildId && p.termId === activeTerm.id && p.status === 'approved');
            if (!labHasPrerogPre) {
              const childTypePre = cartChildPre.sectionType === 'recitation' ? 'Recitation' : 'Lab';
              failures.push({ code: course?.code ?? sec.sectionCode, section: sec.sectionCode, reasons: [`${childTypePre} group ${cartChildPre.sectionCode} is full — lecture cannot be enlisted without a ${childTypePre.toLowerCase()} group`] });
              continue;
            }
          }
          // Check child section schedule conflict against enrolled and already batch-enlisted sections
          const childScheduleConflict = (
            myEnrolledSections.some(e => {
              if (e.id === cartChildPre.parentSectionId || e.parentSectionId === cartChildPre.id) return false;
              return schedulesOverlap(e.schedule, cartChildPre.schedule);
            }) ||
            batchEnlisted.some(bs => {
              if (bs.parentSectionId === cartChildPre.id || bs.id === cartChildPre.parentSectionId) return false;
              return schedulesOverlap(bs.schedule, cartChildPre.schedule);
            })
          );
          if (childScheduleConflict) {
            const childTypeSched = cartChildPre.sectionType === 'recitation' ? 'Recitation' : 'Lab';
            failures.push({ code: course?.code ?? sec.sectionCode, section: sec.sectionCode, reasons: [`${childTypeSched} group ${cartChildPre.sectionCode} schedule conflicts with an enrolled or already-enlisted course`] });
            continue;
          }
        }
      }
      setEnlisting(sectionId);
      const result = await enlistSection(student.id, sectionId, activeTerm.id, cart);
      setEnlisting(null);
      if (result.success) {
        successCount++;
        if (unitCheck.isPeNstp) runningPeNstpUnits += unitCheck.adding;
        else runningUnits += unitCheck.adding;
        batchEnlisted.push(sec);
        // For Lec+Lab/Lec+Rec courses: also enlist the paired child section that's in the cart
        if (cartChildId) {
          const cartChild = state.sections.find(s => s.id === cartChildId);
          if (cartChild) {
            const isLabFull = cartChild.enrolled >= cartChild.slots;
            const labHasPrerog = !!state.prerogatives.find(p => p.studentId === student.id && p.sectionId === cartChildId && p.termId === activeTerm.id && p.status === 'approved');
            if (!isLabFull || labHasPrerog) {
              setEnlisting(cartChildId);
              const childResult = await enlistSection(student.id, cartChildId, activeTerm.id, cart);
              setEnlisting(null);
              if (childResult.success) {
                batchEnlisted.push(cartChild);
              } else {
                failures.push({ code: course?.code ?? cartChild.sectionCode, section: cartChild.sectionCode, reasons: [childResult.message ?? 'Lab/Rec enlistment failed'] });
              }
            } else {
              const childType = cartChild.sectionType === 'recitation' ? 'Recitation' : 'Lab';
              failures.push({ code: course?.code ?? cartChild.sectionCode, section: cartChild.sectionCode, reasons: [`${childType} group is full`] });
            }
          }
        }
      } else {
        failures.push({ code: course?.code ?? sec.sectionCode, section: sec.sectionCode, reasons: [result.message ?? 'Enlistment failed'] });
      }
    }
    // Cart is NOT cleared — students keep their planning list intact
    if (successCount > 0) {
      const skippedMsg = skippedUnits > 0 ? ` ${skippedUnits} skipped (unit limit).` : '';
      notifySuccess(
        `${successCount} Course${successCount !== 1 ? 's' : ''} Enlisted`,
        `Enlistment complete.${skippedMsg}`
      );
    }
    if (failures.length > 0) {
      setBulkResult({ successCount, skippedUnits, failures });
    }
  };

  // ── Timetable ────────────────────────────────────────────────────────
  const enrolledSectionIds = new Set(myEnrolledSections.map(s => s.id));
  const enrolledCourseIds = new Set(myEnrolledSections.map(s => s.courseId));
  // Cart display arrays: active term only + exclude already-enlisted sections/courses.
  // For child sections (lab/rec) we skip the courseId check — their parent lecture may be
  // enrolled under the same courseId, but the child still needs to be independently enlisted.
  const cartSectionsArr = cart
    .map(id => state.sections.find(s => s.id === id))
    .filter(Boolean)
    .filter(s =>
      s!.termId === activeTerm.id &&
      !enrolledSectionIds.has(s!.id) &&
      (!s!.parentSectionId ? !enrolledCourseIds.has(s!.courseId) : true)
    ) as Section[];

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
              {myEnrolledSections.filter(s => !s.parentSectionId).map((sec, ci) => {
                const course = state.courses.find(c => c.id === sec.courseId);
                const color = COLORS[ci % COLORS.length];
                const enrolledChild = myEnrolledSections.find(s => s.parentSectionId === sec.id);
                return (
                  <span key={sec.id} className="contents">
                    {sec.schedule.days.includes(day) && (() => {
                      const top = toMinutes(sec.schedule.startTime) - START_HOUR * 60;
                      const height = toMinutes(sec.schedule.endTime) - toMinutes(sec.schedule.startTime);
                      return (
                        <div className={`absolute w-[95%] left-[2.5%] rounded border text-[9px] px-0.5 py-0.5 overflow-hidden ${color}`} style={{ top: `${(top / TOTAL_MINS) * 100}%`, height: `${(height / TOTAL_MINS) * 100}%` }}>
                          <p className="font-bold truncate leading-tight">{course?.code}</p>
                          <p className="truncate opacity-80 leading-tight">{fmt12(sec.schedule.startTime)}–{fmt12(sec.schedule.endTime)}</p>
                          {sec.schedule.room && <p className="truncate opacity-70 leading-tight">{sec.schedule.room}</p>}
                        </div>
                      );
                    })()}
                    {sec.labSchedule?.days.includes(day) && (() => {
                      const top = toMinutes(sec.labSchedule!.startTime) - START_HOUR * 60;
                      const height = toMinutes(sec.labSchedule!.endTime) - toMinutes(sec.labSchedule!.startTime);
                      return (
                        <div className={`absolute w-[88%] left-[6%] rounded border text-[9px] px-0.5 py-0.5 overflow-hidden ${color} border-dashed opacity-85`} style={{ top: `${(top / TOTAL_MINS) * 100}%`, height: `${(height / TOTAL_MINS) * 100}%` }}>
                          <p className="font-bold truncate leading-tight">{course?.code} {course?.type === 'Lec+Rec' ? 'Rec' : 'Lab'}</p>
                          <p className="truncate opacity-80 leading-tight">{fmt12(sec.labSchedule!.startTime)}–{fmt12(sec.labSchedule!.endTime)}</p>
                          {sec.labSchedule!.room && <p className="truncate opacity-70 leading-tight">{sec.labSchedule!.room}</p>}
                        </div>
                      );
                    })()}
                    {enrolledChild && enrolledChild.schedule.days.includes(day) && (() => {
                      const top = toMinutes(enrolledChild.schedule.startTime) - START_HOUR * 60;
                      const height = toMinutes(enrolledChild.schedule.endTime) - toMinutes(enrolledChild.schedule.startTime);
                      const childLabel = enrolledChild.sectionType === 'recitation' ? 'Rec' : 'Lab';
                      return (
                        <div className={`absolute w-[88%] left-[6%] rounded border text-[9px] px-0.5 py-0.5 overflow-hidden ${color} border-dashed opacity-85`} style={{ top: `${(top / TOTAL_MINS) * 100}%`, height: `${(height / TOTAL_MINS) * 100}%` }}>
                          <p className="font-bold truncate leading-tight">{course?.code} {childLabel}</p>
                          <p className="truncate opacity-80 leading-tight">{fmt12(enrolledChild.schedule.startTime)}–{fmt12(enrolledChild.schedule.endTime)}</p>
                          {enrolledChild.schedule.room && <p className="truncate opacity-70 leading-tight">{enrolledChild.schedule.room}</p>}
                        </div>
                      );
                    })()}
                  </span>
                );
              })}
              {!isFinalized && cartSectionsArr.filter(s => !s.parentSectionId).map(sec => {
                const course = state.courses.find(c => c.id === sec.courseId);
                const hasConflict = myEnrolledSections.some(e => schedulesOverlap(e.schedule, sec.schedule));
                const cls = hasConflict ? 'bg-red-100/80 border-red-400 text-red-900 border-dashed' : 'bg-gray-100/90 border-gray-400 text-gray-700 border-dashed';
                const cartChild = cart.map(id => state.sections.find(s => s.id === id)).find(s => s?.parentSectionId === sec.id);
                return (
                  <span key={`cart-${sec.id}`} className="contents">
                    {sec.schedule.days.includes(day) && (() => {
                      const top = toMinutes(sec.schedule.startTime) - START_HOUR * 60;
                      const height = toMinutes(sec.schedule.endTime) - toMinutes(sec.schedule.startTime);
                      return (
                        <div className={`absolute w-[95%] left-[2.5%] rounded border-2 text-[9px] px-0.5 py-0.5 overflow-hidden opacity-75 ${cls}`} style={{ top: `${(top / TOTAL_MINS) * 100}%`, height: `${(height / TOTAL_MINS) * 100}%`, zIndex: 5 }}>
                          <p className="font-bold truncate leading-tight">{course?.code}</p>
                          <p className="truncate opacity-80 text-[8px] leading-tight">{fmt12(sec.schedule.startTime)}–{fmt12(sec.schedule.endTime)}</p>
                          {sec.schedule.room && <p className="truncate opacity-70 text-[8px] leading-tight">{sec.schedule.room}</p>}
                        </div>
                      );
                    })()}
                    {sec.labSchedule?.days.includes(day) && (() => {
                      const top = toMinutes(sec.labSchedule!.startTime) - START_HOUR * 60;
                      const height = toMinutes(sec.labSchedule!.endTime) - toMinutes(sec.labSchedule!.startTime);
                      return (
                        <div className={`absolute w-[88%] left-[6%] rounded border-2 text-[9px] px-0.5 py-0.5 overflow-hidden opacity-65 ${cls}`} style={{ top: `${(top / TOTAL_MINS) * 100}%`, height: `${(height / TOTAL_MINS) * 100}%`, zIndex: 5 }}>
                          <p className="font-bold truncate leading-tight">{course?.code} {course?.type === 'Lec+Rec' ? 'Rec' : 'Lab'}</p>
                          <p className="truncate opacity-80 text-[8px] leading-tight">{fmt12(sec.labSchedule!.startTime)}–{fmt12(sec.labSchedule!.endTime)}</p>
                          {sec.labSchedule!.room && <p className="truncate opacity-70 text-[8px] leading-tight">{sec.labSchedule!.room}</p>}
                        </div>
                      );
                    })()}
                    {cartChild && cartChild.schedule.days.includes(day) && (() => {
                      const top = toMinutes(cartChild.schedule.startTime) - START_HOUR * 60;
                      const height = toMinutes(cartChild.schedule.endTime) - toMinutes(cartChild.schedule.startTime);
                      const childLabel = cartChild.sectionType === 'recitation' ? 'Rec' : 'Lab';
                      return (
                        <div className={`absolute w-[88%] left-[6%] rounded border-2 text-[9px] px-0.5 py-0.5 overflow-hidden opacity-65 ${cls}`} style={{ top: `${(top / TOTAL_MINS) * 100}%`, height: `${(height / TOTAL_MINS) * 100}%`, zIndex: 5 }}>
                          <p className="font-bold truncate leading-tight">{course?.code} {childLabel}</p>
                          <p className="truncate opacity-80 text-[8px] leading-tight">{fmt12(cartChild.schedule.startTime)}–{fmt12(cartChild.schedule.endTime)}</p>
                          {cartChild.schedule.room && <p className="truncate opacity-70 text-[8px] leading-tight">{cartChild.schedule.room}</p>}
                        </div>
                      );
                    })()}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
          </>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          {myEnrolledSections.filter(s => !s.parentSectionId).map((sec, ci) => {
            const course = state.courses.find(c => c.id === sec.courseId);
            const color = COLORS[ci % COLORS.length];
            const enrolledChild = myEnrolledSections.find(s => s.parentSectionId === sec.id);
            const childTypeName = enrolledChild?.sectionType === 'recitation' ? 'Rec' : 'Lab';
            return (
              <span key={sec.id} className="contents">
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${color}`}><span className="w-2 h-2 rounded-full bg-current opacity-60"></span>{course?.code} Sec {sec.sectionCode}</span>
                {enrolledChild && <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${color}`}><span className="w-2 h-2 rounded-full bg-current opacity-60"></span>{course?.code} {childTypeName} {enrolledChild.sectionCode}</span>}
              </span>
            );
          })}
          {!isFinalized && cartSectionsArr.filter(s => !s.parentSectionId).map(sec => {
            const course = state.courses.find(c => c.id === sec.courseId);
            const cartChild = cartSectionsArr.find(s => s.parentSectionId === sec.id);
            const childTypeName = cartChild?.sectionType === 'recitation' ? 'Rec' : 'Lab';
            return (
              <span key={`cart-${sec.id}`} className="contents">
                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border-2 border-dashed border-gray-400 text-gray-600 bg-gray-50"><span className="w-2 h-2 rounded-full bg-gray-400"></span>{course?.code} (Bookmarked)</span>
                {cartChild && <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border-2 border-dashed border-gray-400 text-gray-600 bg-gray-50"><span className="w-2 h-2 rounded-full bg-gray-400"></span>{course?.code} {childTypeName} (Bookmarked)</span>}
              </span>
            );
          })}
        </div>
      </div>
  );

  // ── Active Enlistment rows ───────────────────────────────────────────
  // Collect parent IDs of any orphaned children:
  // A child is "orphaned" when its parent lecture is NOT in cart AND NOT already enrolled.
  // (If the parent IS enrolled, the child appears directly as its own row below.)
  const orphanedParentIds = new Set(
    cart
      .map(id => state.sections.find(s => s.id === id))
      .filter((s): s is Section =>
        !!s?.parentSectionId &&
        !cart.includes(s.parentSectionId!) &&
        !enrolledSectionIds.has(s.parentSectionId!)
      )
      .map(s => s.parentSectionId!)
  );
  const cartRows = [
    // Regular cart sections that are not children of another UNENROLLED cart section
    ...cart
      .map(id => state.sections.find(s => s.id === id))
      .filter(Boolean)
      .filter(s =>
        s!.termId === activeTerm.id &&
        !enrolledSectionIds.has(s!.id) &&
        // For child sections (lab/rec): skip courseId check — their parent lecture shares the
        // same courseId but may already be enrolled. Show the child independently so it can
        // still be enlisted.
        (!s!.parentSectionId ? !enrolledCourseIds.has(s!.courseId) : true) &&
        // Hide a child section only when its parent is in cart AND the parent is NOT yet
        // enrolled (the parent row already represents the lecture+lab pair in the table).
        // If the parent IS enrolled, show the child as its own row so the student can enlist it.
        !(s!.parentSectionId && (
          (cart.includes(s!.parentSectionId!) && !enrolledSectionIds.has(s!.parentSectionId!)) ||
          orphanedParentIds.has(s!.parentSectionId!)
        ))
      ) as Section[],
    // Orphaned parent sections: their child is in cart but they aren't (and aren't enrolled) —
    // add the parent as a row so the student sees the full picture.
    ...Array.from(orphanedParentIds)
      .map(id => state.sections.find(s => s.id === id))
      .filter((s): s is Section => !!s && s.termId === activeTerm.id && !enrolledSectionIds.has(s.id) && !enrolledCourseIds.has(s.courseId)),
  ];

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

        {/* ── Payment Hold Banner ─────────────────────────────────────── */}
        {isPaymentHeld && holdDisplayTerm && (
          <div className="rounded-xl border-2 border-amber-400 bg-amber-50 overflow-hidden">
            {/* Top accent bar */}
            <div className="bg-amber-400 px-4 py-1.5 flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-amber-900" />
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">Enrollment Hold — Unsettled Account</span>
            </div>
            <div className="p-4 flex flex-col sm:flex-row sm:items-start gap-4">
              {/* Icon */}
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center">
                <Lock className="w-5 h-5 text-amber-700" />
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-amber-900 text-base">Your enrollment is currently on hold.</p>
                <p className="text-sm text-amber-800 mt-1">
                  You have an unpaid balance from <strong>{holdDisplayTerm.name}</strong>.
                  {holdDisplayPayment && holdDisplayPayment.amountPaid > 0 && (
                    <span className="ml-1">
                      You have partially paid <strong>₱{holdDisplayPayment.amountPaid.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong> — please settle the remaining balance.
                    </span>
                  )}
                </p>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 bg-amber-100 border border-amber-300 rounded-md px-3 py-1 text-xs font-semibold text-amber-800">
                    <Lock className="w-3 h-3" /> Enlistment Locked
                  </span>
                  <span className="text-xs text-amber-700">Visit the OCS to settle your account and have your hold lifted.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Permanently Disqualified Banner ─────────────────────────── */}
        {isDisqualified && (() => {
          const noPending = !latestRequest || latestRequest.status !== 'pending';
          return (
            <>
              <StatusBanner type="error" title="Enlistment Locked — Permanent Disqualification"
                description="You cannot enlist. Submit a reconsideration request to the OCS.">
                {noPending && (
                  <Button size="sm" variant="outline" className="border-red-400 text-red-700 hover:bg-red-100"
                    onClick={() => setShowReconDialog(true)}>Request Reconsideration</Button>
                )}
              </StatusBanner>
              {latestRequest?.status === 'pending' && (
                <StatusBanner type="warning" title="Reconsideration Request Pending"
                  description="Your reconsideration request is pending OCS review." />
              )}
              {latestRequest?.status === 'denied' && (
                <StatusBanner type="error" title="Reconsideration Request — Denied"
                  description={latestRequest.response ? `OCS: "${latestRequest.response}"` : undefined} />
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
          <div className="rounded-xl overflow-hidden border-2 border-emerald-500 bg-emerald-50">
            <div className="bg-emerald-600 px-4 py-1.5 flex items-center gap-2">
              <CheckSquare size={13} className="text-emerald-100" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-100 leading-none">
                Enrollment Finalized — Officially Enrolled
              </span>
            </div>
            <div className="px-4 py-3 flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 border-2 border-emerald-300 text-emerald-700 flex items-center justify-center">
                <CheckSquare size={15} />
              </div>
              <div className="flex-1 min-w-0 text-sm text-emerald-800">
                <span className="leading-relaxed">
                  You are officially enrolled for <strong>{activeTerm.name}</strong>. Your class schedule is now locked.
                </span>
                {state.portalSettings.showEnrollmentFormPdf && (
                  <div className="mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 border-emerald-500 text-emerald-700 hover:bg-emerald-100"
                      onClick={generateEnrollmentFormPdf}
                    >
                      <FileText className="w-3.5 h-3.5" /> Download Enrollment Form
                    </Button>
                  </div>
                )}
              </div>
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
              <StatusBanner type="warning" title="Change/Add/Drop Request Under Review" className="mb-3"
                description={<>Your request has been submitted and is awaiting OCS review.{activeTerm.changeDropUntil && <strong> Deadline: {new Date(activeTerm.changeDropUntil).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}.</strong>}</>} />
            );
          }

          if (isNewStyleApproved) {
            return (
              <StatusBanner type="success" title="Change/Add/Drop Request Approved" className="mb-3"
                description="Your requested changes have been applied to your enrollment record.">
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-1 text-xs h-7 gap-1.5 border-emerald-400 text-emerald-700 hover:bg-emerald-100"
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
                  Download Change/Add/Drop Form
                </Button>
              </StatusBanner>
            );
          }

          if (existingReq?.status === 'denied') {
            return (
              <StatusBanner type="error" title="Change/Add/Drop Request Denied" className="mb-3"
                description={existingReq.response ? `OCS note: ${existingReq.response}` : undefined}>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-1 text-xs h-7 gap-1.5 border-red-400 text-red-700 hover:bg-red-100"
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
              </StatusBanner>
            );
          }

          if (canSubmitNew) {
            return (
              <StatusBanner type="info" title="Change / Add / Drop Subjects" className="mb-3"
                description={<>You have already finalized your enrollment. To add, drop, or change a subject, submit a Change/Add/Drop request to OCS.{activeTerm.changeDropUntil && <strong> Deadline: {new Date(activeTerm.changeDropUntil).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}.</strong>}</>}>
                <Button size="sm" className="mt-1 text-xs h-7 bg-sky-600 hover:bg-sky-700 text-white"
                  onClick={() => setShowChangeDropModal(true)}>
                  Request Change / Add / Drop
                </Button>
              </StatusBanner>
            );
          }

          return null;
        })()}

        {/* ── Change/Drop Approved Banner ───────────────────────────────── */}
        {hasApprovedChangeDropRequest && (
          <StatusBanner type="open" title="Change/Add/Drop Access Granted"
            description="OCS has approved your request. You may now add, drop, or change subjects and re-finalize your enrollment." />
        )}

        {/* ── Underload Application Banner ──────────────────────────────── */}
        {(() => {
          // Show if: not mid-term AND (underload window open with low units, OR student has an existing application)
          // No schedPassed gate: Honorific Scholarship students may need to apply even during enrollment period.
          // The underload window (configured by admin) is the correct gate, not the schedule.
          const windowCondition = currentUnits > 0 && currentUnits < 15 && isUnderloadWindowOpen;
          return activeTerm.semester !== 'Mid-Term' && (windowCondition || !!myUnderloadApp);
        })() && (
          <StatusBanner
            type={myUnderloadApp?.status === 'approved' ? 'success' : myUnderloadApp?.status === 'denied' ? 'error' : 'deadline'}
            title={myUnderloadApp?.status === 'approved' ? 'Underload Permit Approved' : myUnderloadApp?.status === 'denied' ? 'Underload Application Denied' : 'Underload Notice'}
            description={
              myUnderloadApp?.status === 'approved'
                ? <>Your underload application has been <strong>approved</strong> by the OCS. You remain eligible for scholastic standing evaluation for this term.</>
                : myUnderloadApp?.status === 'denied'
                ? <>Your underload application was <strong>denied</strong> by the OCS.{myUnderloadApp.response && <span className="italic"> OCS: &ldquo;{myUnderloadApp.response}&rdquo;</span>}{isUnderloadWindowOpen ? ' You may re-submit a new application below.' : ''}</>
                : myUnderloadApp?.status === 'pending'
                ? <>Your underload application is currently <strong>under OCS review</strong>. You will be notified once a decision is made.</>
                : <>You are currently enlisted in <strong>{currentUnits} academic units</strong>, which is below the minimum of <strong>15 units</strong> required to qualify for College or University Scholar standing. If you have a valid reason for an underload, you may submit an application to the OCS.</>
            }>
            <div className="space-y-2">
              {/* Submit button — only when window is open and no existing non-denied app */}
              {!myUnderloadApp && isUnderloadWindowOpen && (
                <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white gap-1.5"
                  onClick={() => setShowUnderloadDialog(true)}>
                  <FileText className="w-3.5 h-3.5" /> Submit Underload Application
                </Button>
              )}
              {/* Approved: show permit download */}
              {myUnderloadApp?.status === 'approved' && (
                <Button size="sm" variant="outline" className="gap-1.5 border-orange-400 text-orange-800 hover:bg-orange-100"
                  onClick={() => generateUnderloadApprovalDoc(myUnderloadApp)}>
                  <Printer className="w-3.5 h-3.5" /> View Approval Document
                </Button>
              )}
              {/* Denied: allow re-submit only if window is still open */}
              {myUnderloadApp?.status === 'denied' && isUnderloadWindowOpen && (
                <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white gap-1.5"
                  onClick={() => setShowUnderloadDialog(true)}>
                  <FileText className="w-3.5 h-3.5" /> Re-submit Application
                </Button>
              )}
            </div>
          </StatusBanner>
        )}

        {/* ── Enlistment Window Status Banners ────────────────────────── */}
        {!isDisqualified && !isFinalized && (() => {
          // Schedule-based approach: no enlistmentFrom/Until window anymore
          // If enlistment is open via toggle, or it's the student's scheduled day → no closed banner
          if (enlistmentOpen || isMyEnrollDay || isPhase3Today || appealBypass) return null;

          // OCS approved late enrollment: show granted banner
          if (hasApprovedLateEnlistThisTerm) {
            return (
              <StatusBanner type="open" title="Late Enrollment Granted"
                description={<>The OCS has approved your late enrollment request. You may now search for subjects, enlist, and finalize your enrollment.{latestLateRequest?.response && <span className="italic"> OCS Note: "{latestLateRequest.response}"</span>}</>} />
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
                  <StatusBanner type="warning" title="Request for Late Enrollment"
                    description={<>You have no enlisted subjects for this term and the enrollment period has ended. If you were unable to enlist due to special circumstances, you may submit a <strong>Request for Late Enrollment</strong> to the OCS.</>}>
                    <div className="space-y-1.5">
                      <div className="text-xs text-amber-800 bg-amber-100/60 rounded-md p-3 border border-amber-200 space-y-1">
                        <p className="font-semibold text-amber-900">How it works:</p>
                        <p>1. Write an appeal letter explaining your reason for missing enrollment.</p>
                        <p>2. Submit the letter — the OCS will review your request.</p>
                        <p>3. If approved, you will be able to add subjects and finalize your enrollment even after the deadline.</p>
                      </div>
                      {latestLateRequest?.status === 'pending' && (
                        <div className="flex items-center gap-2 text-xs text-amber-800">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                          Your appeal letter is currently under OCS review. Please wait for their response.
                        </div>
                      )}
                      {latestLateRequest?.status === 'denied' && (
                        <p className="text-xs text-amber-800">
                          <strong>Request Denied.</strong>
                          {latestLateRequest.response && <span className="italic"> OCS: "{latestLateRequest.response}"</span>} You may re-submit a new appeal letter below.
                        </p>
                      )}
                      {noLatePending && (
                        <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
                          onClick={() => setShowLateEnlistDialog(true)}>
                          <MessageSquare className="w-3.5 h-3.5" /> Submit Appeal Letter
                        </Button>
                      )}
                    </div>
                  </StatusBanner>
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


        {/* ── Lab / Rec Group Picker Dialog ────────────────────────────── */}
        {labPickerSec && (() => {
          const lecCourse = state.courses.find(c => c.id === labPickerSec.courseId);
          const childSections = state.sections.filter(s => s.parentSectionId === labPickerSec.id && s.termId === activeTerm?.id);
          const childType = childSections[0]?.sectionType === 'recitation' ? 'Recitation' : 'Lab';
          return (
            <Dialog open onOpenChange={v => { if (!v) setLabPickerSec(null); }}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{lecCourse?.code} — Choose {childType} Group</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  {labPickerMode === 'enlist-lab-only'
                    ? <>You are already enlisted in <span className="font-semibold">{labPickerSec.sectionCode}</span> (Lecture). Please select a {childType.toLowerCase()} group to complete your enrollment.</>
                    : <>You are enlisting in <span className="font-semibold">{labPickerSec.sectionCode}</span> (Lecture). Please select a {childType.toLowerCase()} group below.</>}
                </p>
                <div className="space-y-2 mt-1">
                  {childSections.map(child => {
                    const faculty = state.users.find(u => u.id === child.facultyId);
                    const isFull = child.enrolled >= child.slots;
                    const fmtDays = child.schedule.days.join('');
                    const fmtTime = child.schedule.startTime && child.schedule.endTime
                      ? `${fmt12(child.schedule.startTime)} – ${fmt12(child.schedule.endTime)}`
                      : 'TBA';
                    return (
                      <button
                        key={child.id}
                        disabled={isFull && labPickerMode !== 'cart'}
                        className={`w-full text-left rounded-lg border p-3 transition-colors ${isFull && labPickerMode !== 'cart' ? 'opacity-40 cursor-not-allowed bg-muted/30' : isFull ? 'bg-red-50/40 hover:bg-red-100/50 cursor-pointer border-red-200' : 'hover:border-primary hover:bg-primary/5 cursor-pointer bg-background'}`}
                        onClick={async () => {
                          if (labPickerMode === 'cart') {
                            setLabPickerSec(null);
                            setCart(c => [...c, labPickerSec.id, child.id]);
                            notifySuccess('Added to Cart', `${lecCourse?.code} Sec ${labPickerSec.sectionCode} + ${childType} ${child.sectionCode} added to your cart.`);
                          } else if (labPickerMode === 'enlist-lab-only') {
                            // Lecture already enlisted — validate child schedule before enlisting lab
                            const childOverlap = myEnrolledSections.some(e => {
                              if (e.id === child.parentSectionId || e.parentSectionId === child.id) return;
                              return schedulesOverlap(e.schedule, child.schedule);
                            });
                            setLabPickerSec(null);
                            if (childOverlap) {
                              showWarning(lecCourse?.code ?? child.sectionCode, child.sectionCode, [`${childType} group schedule conflicts with an already enlisted course.`]);
                              return;
                            }
                            const r2 = await performEnlist(child);
                            if (!r2) showWarning(lecCourse?.code ?? child.sectionCode, child.sectionCode, ['Lab enlistment failed']);
                            else notifySuccess('Enlisted!', `${childType} ${child.sectionCode} added to your enlistment.`);
                          } else {
                            // 'enlist' mode — run ALL lecture + child validation before enlisting
                            const { isFull: lecFull, hasOverlap, isCourseDuplicate, prereqCheck, coreqCheck, unitCheck, course: lecInfo, hasApprovedPrerog, consentBlocked, geElectiveBlocked, yearStandingBlocked, minUnitsBlocked } = getSectionInfo(labPickerSec);
                            const lecCode = lecInfo?.code ?? labPickerSec.sectionCode;
                            if (geElectiveBlocked) { setLabPickerSec(null); notifyError('GE Elective Plan Required', `${lecCode} is an Elective GE course. Submit an approved GE Elective Plan via the GE Electives module before enlisting.`); return; }
                            if (consentBlocked) { setLabPickerSec(null); showWarning(lecCode, labPickerSec.sectionCode, ['This course requires an approved consent (COI / Dept / OCS) before enlisting.']); return; }
                            if (yearStandingBlocked) { setLabPickerSec(null); showWarning(lecCode, labPickerSec.sectionCode, [`This course requires at least ${lecInfo?.minYearStanding} year standing.`]); return; }
                            if (minUnitsBlocked) { setLabPickerSec(null); showWarning(lecCode, labPickerSec.sectionCode, [`This course requires at least ${lecInfo?.minUnitsRequired} passed units.`]); return; }
                            if (hasOverlap) { setLabPickerSec(null); showWarning(lecCode, labPickerSec.sectionCode, ['Schedule conflict with an already enlisted course.']); return; }
                            if (isCourseDuplicate) { setLabPickerSec(null); showWarning(lecCode, labPickerSec.sectionCode, ['Already enlisted in another section of this course.']); return; }
                            if (!prereqCheck.passed) { setLabPickerSec(null); showWarning(lecCode, labPickerSec.sectionCode, [`Prerequisites not satisfied — missing: ${prereqCheck.missing.join(', ')}`]); return; }
                            if (!coreqCheck.passed) { setLabPickerSec(null); showWarning(lecCode, labPickerSec.sectionCode, [`Corequisites not satisfied — must also enlist: ${coreqCheck.missing.join(', ')}`]); return; }
                            if (!unitCheck.ok) { setLabPickerSec(null); notifyError('Unit Limit Exceeded', unitCheck.isPeNstp ? 'Would exceed the 6-unit PE/NSTP limit per semester.' : `Would exceed your ${maxUnits} unit limit.`); return; }
                            if (lecFull && !hasApprovedPrerog) { setLabPickerSec(null); notifyError('Section is Full', 'This section has no available slots.'); return; }
                            if (posAllCourseIds.size > 0 && lecInfo && !posAllCourseIds.has(lecInfo.id) && !lecInfo.isPE && !lecInfo.isNSTP) { setLabPickerSec(null); notifyError('Not in Your Plan of Study', `${lecCode} is not part of your Plan of Study. Contact your OCS to update your plan before enlisting.`); return; }
                            // Also check child section schedule conflict
                            const childOverlap = myEnrolledSections.some(e => {
                              if (e.id === child.parentSectionId || e.parentSectionId === child.id) return;
                              return schedulesOverlap(e.schedule, child.schedule);
                            });
                            if (childOverlap) { setLabPickerSec(null); showWarning(lecCode, child.sectionCode, [`${childType} group schedule conflicts with an already enlisted course.`]); return; }
                            // All validations passed — enlist lecture then lab
                            setLabPickerSec(null);
                            const r1 = await performEnlist(labPickerSec);
                            if (r1) {
                              const r2 = await performEnlist(child);
                              if (r2) notifySuccess('Enlisted!', `${lecInfo?.code} Sec ${labPickerSec.sectionCode} + ${childType} ${child.sectionCode} added to your enlistment.`);
                              else showWarning(lecCode, child.sectionCode, ['Lab enlistment failed']);
                            } else {
                              showWarning(lecCode, labPickerSec.sectionCode, ['Enlistment failed']);
                            }
                          }
                        }}>
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span className="font-semibold font-mono text-sm">{child.sectionCode}</span>
                            {faculty && <span className="text-xs text-muted-foreground ml-2">{faculty.name}</span>}
                          </div>
                          <div className="text-right text-xs text-muted-foreground shrink-0">
                            <div>{fmtDays} {fmtTime}</div>
                            <div>{child.schedule.room}</div>
                            <div className={isFull ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                              {child.enrolled}/{child.slots} {isFull ? '— Full' : 'slots'}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </DialogContent>
            </Dialog>
          );
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

        {/* ── Success Notification Dialog ───────────────────────────── */}
        <AppDialog
          open={!!successNotif}
          onOpenChange={open => { if (!open) setSuccessNotif(null); }}
          intent="success"
          title={successNotif?.title ?? ''}
          confirmLabel="OK"
          onConfirm={() => setSuccessNotif(null)}
        >
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-green-50 border border-green-200 text-sm text-green-800 dark:bg-green-950/30 dark:border-green-800 dark:text-green-300">
            <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-600 dark:text-green-400" />
            <span>{successNotif?.description}</span>
          </div>
        </AppDialog>

        {/* ── Error Notification Dialog ─────────────────────────────── */}
        <AppDialog
          open={!!errorNotif}
          onOpenChange={open => { if (!open) setErrorNotif(null); }}
          intent={errorNotif?.action ? 'warning' : 'danger'}
          title={errorNotif?.title ?? ''}
          cancelLabel={errorNotif?.action ? 'Dismiss' : undefined}
          confirmLabel={errorNotif?.action ? errorNotif.action.label : 'OK'}
          onConfirm={() => { if (errorNotif?.action) { errorNotif.action.onClick(); } else { setErrorNotif(null); } }}
        >
          <div className={`flex items-start gap-2 p-2.5 rounded-xl text-sm ${errorNotif?.action ? 'bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-700 dark:text-amber-300' : 'bg-destructive/5 border border-destructive/20 text-destructive dark:text-red-400'}`}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorNotif?.description}</span>
          </div>
        </AppDialog>

        {/* ── Bulk Enlist Result Dialog ─────────────────────────────── */}
        <AppDialog
          open={!!bulkResult}
          onOpenChange={open => { if (!open) setBulkResult(null); }}
          intent="danger"
          title={`Enlistment Failed — ${bulkResult?.failures.length ?? 0} Course${(bulkResult?.failures.length ?? 0) !== 1 ? 's' : ''}`}
          description="The following courses could not be enlisted. Please review the reasons below."
          confirmLabel="Dismiss"
          onConfirm={() => setBulkResult(null)}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-3">
            {(bulkResult?.failures.length ?? 0) > 0 && (
              <div className="overflow-x-auto rounded-xl border border-destructive/30">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-destructive/5">
                      <TableHead className="font-semibold text-destructive">Course</TableHead>
                      <TableHead className="font-semibold text-destructive">Section</TableHead>
                      <TableHead className="font-semibold text-destructive">Reason(s)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(bulkResult?.failures ?? []).map((f, i) => (
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
            )}
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
                  // Check if all lab/rec groups for this Lec+Lab/Rec course are full
                  const cartChildGroups = state.sections.filter(s => s.parentSectionId === sec.id && s.termId === activeTerm?.id);
                  const allCartLabGroupsFull = cartChildGroups.length > 0 && cartChildGroups.every(cs => cs.enrolled >= cs.slots);
                  const cartChildTypeName = cartChildGroups[0]?.sectionType === 'recitation' ? 'Recitation' : 'Lab';
                  if (!course) return null;
                  const isEnlisting = enlisting === sec.id;
                  const consentNotes: string[] = [];
                  if (course.requiresCOI) consentNotes.push('Requires COI');
                  if (course.requiresDeptConsent) consentNotes.push('Requires Department Consent');
                  if (course.requiresOCSConsent) consentNotes.push('Requires OCS Consent');
                  if (course.coiIfUnsatisfied && !(course.requiresCOI)) consentNotes.push('Requires COI if you have not satisfied its prerequisites or co-requisites');
                  if (course.deptConsentIfUnsatisfied && !(course.requiresDeptConsent)) consentNotes.push('Requires Department Consent if prerequisites/co-requisites not satisfied');
                  if (course.ocsConsentIfUnsatisfied && !(course.requiresOCSConsent)) consentNotes.push('Requires OCS Consent if prerequisites/co-requisites not satisfied');
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
                          {/* New multi-section: show linked lab/rec child sections in cart */}
                          {(() => {
                            const childId = cart.find(id => {
                              const cs = state.sections.find(s => s.id === id);
                              return cs?.parentSectionId === sec.id;
                            });
                            if (!childId) return null;
                            const child = state.sections.find(s => s.id === childId);
                            if (!child) return null;
                            const childFaculty = state.users.find(u => u.id === child.facultyId);
                            const childFacultyName = childFaculty?.name ?? 'TBA';
                            return (
                              <ClassCard
                                course={course}
                                sectionCode={child.sectionCode}
                                isLab={child.sectionType === 'lab' || child.sectionType === 'recitation'}
                                schedule={child.schedule}
                                facultyName={childFacultyName}
                                enrolled={child.enrolled}
                                slots={child.slots}
                                consentNotes={[]}
                                allCourses={state.courses}
                                open={openCardIds.has(child.id)}
                                onToggle={() => toggleCard(child.id)}
                              />
                            );
                          })()}
                        </div>
                        {/* Mobile-only status + actions */}
                        <div className="flex items-center justify-between mt-2 md:hidden">
                          <div className="flex flex-col gap-0.5">
                            <span className="italic text-sm text-muted-foreground">Bookmarked</span>
                            {isFull && !cartItemHasPrerog && <p className="text-xs text-red-500 font-medium">Section Full</p>}
                            {allCartLabGroupsFull && <p className="text-xs text-red-500 font-medium">All {cartChildTypeName} Groups Full</p>}
                            {!unitCheck.ok && <p className="text-xs text-amber-600 font-medium">Would exceed unit limit</p>}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm"
                              className="bg-green-500 hover:bg-green-600 text-white h-7 text-xs disabled:opacity-40"
                              disabled={isEnlisting || !effectiveEnlistmentOpen || (isFinalized && !appealBypass) || isDisqualified || isPaymentHeld}
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
                          {allCartLabGroupsFull && <p className="text-xs text-red-500 font-medium">All {cartChildTypeName} Groups Full</p>}
                          {!unitCheck.ok && <p className="text-xs text-amber-600 font-medium">Would exceed unit limit</p>}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 align-middle text-center hidden md:table-cell">
                        <div className="flex flex-col items-center gap-2">
                          <Button size="sm"
                            className="bg-green-500 hover:bg-green-600 text-white h-7 text-xs min-w-[70px] disabled:opacity-40"
                            disabled={isEnlisting || !effectiveEnlistmentOpen || (isFinalized && !appealBypass) || isDisqualified || isPaymentHeld}
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
                  // Child sections: if parent lecture IS enrolled, hide — shown as sub-card under parent.
                  // If parent lecture is NOT enrolled (orphan child), show a warning row.
                  if (sec.parentSectionId) {
                    const parentEnrolled = myEnrolledSections.some(l => l.id === sec.parentSectionId);
                    if (parentEnrolled) return null; // shown under its parent row
                    // Orphan child — render a warning row
                    const orphanCourse = state.courses.find(c => c.id === sec.courseId);
                    return (
                      <TableRow key={sec.id} className="bg-destructive/5 align-top">
                        <TableCell className="py-3" colSpan={4}>
                          <div className="flex items-start gap-2 p-2 rounded-lg border border-destructive/30 bg-destructive/5">
                            <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-semibold text-destructive">{orphanCourse?.code ?? sec.sectionCode} — Sec {sec.sectionCode} (Lab/Rec only — Lecture not enlisted)</p>
                              <p className="text-xs text-muted-foreground mt-0.5">This lab or recitation section is enrolled without its parent lecture. Contact OCS to correct your enrollment before finalizing.</p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }
                  const course = state.courses.find(c => c.id === sec.courseId);
                  const faculty = state.users.find(u => u.id === sec.facultyId);
                  const facultyDisplayName = sec.facultyHidden ? 'To be Announced' : (faculty?.name ?? 'TBA');
                  const color = COLORS[ci % COLORS.length];
                  if (!course) return null;
                  const consentNotes: string[] = [];
                  if (course.requiresCOI) consentNotes.push('Requires COI');
                  if (course.requiresDeptConsent) consentNotes.push('Requires Department Consent');
                  if (course.requiresOCSConsent) consentNotes.push('Requires OCS Consent');
                  if (course.coiIfUnsatisfied && !(course.requiresCOI)) consentNotes.push('Requires COI if you have not satisfied its prerequisites or co-requisites');
                  if (course.deptConsentIfUnsatisfied && !(course.requiresDeptConsent)) consentNotes.push('Requires Department Consent if prerequisites/co-requisites not satisfied');
                  if (course.ocsConsentIfUnsatisfied && !(course.requiresOCSConsent)) consentNotes.push('Requires OCS Consent if prerequisites/co-requisites not satisfied');
                  // Find linked lab/rec child enrolled section
                  const enrolledChild = myEnrolledSections.find(s => s.parentSectionId === sec.id);
                  // Check if there are available child sections the student should pick
                  const availableChildSections = state.sections.filter(s => s.parentSectionId === sec.id && s.termId === activeTerm?.id);
                  const allLabsFull = availableChildSections.length > 0 && availableChildSections.every(cs => cs.enrolled >= cs.slots);
                  const missingLabEnrollment = availableChildSections.length > 0 && !enrolledChild && !allLabsFull;
                  const childTypeName = availableChildSections[0]?.sectionType === 'recitation' ? 'Recitation' : 'Lab';
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
                          {/* New multi-section: enrolled lab/rec child as sub-card */}
                          {enrolledChild && (() => {
                            const childFaculty = state.users.find(u => u.id === enrolledChild.facultyId);
                            return (
                              <ClassCard
                                course={course}
                                sectionCode={enrolledChild.sectionCode}
                                isLab={enrolledChild.sectionType === 'lab'}
                                schedule={enrolledChild.schedule}
                                facultyName={childFaculty?.name ?? 'TBA'}
                                enrolled={enrolledChild.enrolled}
                                slots={enrolledChild.slots}
                                consentNotes={[]}
                                allCourses={state.courses}
                                isEnlistedFinalized={isFinalized}
                                open={openCardIds.has(enrolledChild.id)}
                                onToggle={() => toggleCard(enrolledChild.id)}
                              />
                            );
                          })()}
                          {/* Missing lab/rec enrollment — prompt student to pick a group */}
                          {missingLabEnrollment && !isFinalized && effectiveEnlistmentOpen && (
                            <div className="border-2 border-dashed border-amber-400 rounded-md overflow-hidden flex flex-col items-center justify-center p-4 gap-2 bg-amber-50/40 min-h-[100px]">
                              <p className="text-xs text-amber-700 font-semibold text-center">No {childTypeName} group selected</p>
                              <Button size="sm" className="h-7 text-xs bg-amber-500 hover:bg-amber-600 text-white"
                                onClick={() => { setLabPickerSec(sec); setLabPickerMode('enlist-lab-only'); }}>
                                Select {childTypeName} Group
                              </Button>
                            </div>
                          )}
                          {missingLabEnrollment && (isFinalized || !effectiveEnlistmentOpen) && (
                            <div className="border-2 border-dashed border-red-300 rounded-md overflow-hidden flex flex-col items-center justify-center p-4 gap-1 bg-red-50/40 min-h-[100px]">
                              <p className="text-xs text-red-600 font-semibold text-center">No {childTypeName} group enlisted</p>
                              <p className="text-[10px] text-red-400 text-center">Contact OCS for assistance</p>
                            </div>
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
                {pendingCartCount >= 1 && effectiveEnlistmentOpen && (!isFinalized || appealBypass) && !isDisqualified && !isPaymentHeld && (
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
            {/* OCS-style enrollment table */}
            {(() => {
              const lectureRows = myEnrolledSections.filter(s => !s.parentSectionId);
              const childRows   = myEnrolledSections.filter(s => !!s.parentSectionId);
              const enrolledLectureIds = new Set(lectureRows.map(s => s.id));
              // Build display list: each lecture immediately followed by its lab/rec child
              const displayRows: { sec: Section; isChild: boolean; isOrphan?: boolean }[] = [];
              for (const lecSec of lectureRows) {
                displayRows.push({ sec: lecSec, isChild: false });
                const child = childRows.find(s => s.parentSectionId === lecSec.id);
                if (child) displayRows.push({ sec: child, isChild: true });
              }
              // Orphan children: child enrolled without its parent lecture — mark as orphan
              for (const child of childRows) {
                if (!displayRows.find(r => r.sec.id === child.id)) {
                  const parentMissing = !enrolledLectureIds.has(child.parentSectionId!);
                  displayRows.push({ sec: child, isChild: true, isOrphan: parentMissing });
                }
              }
              return (
                <div className="rounded-xl border border-border overflow-hidden text-sm">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground tracking-wide">Code</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground tracking-wide">Course Title</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground tracking-wide">Sec</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground tracking-wide">Units</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {displayRows.map(({ sec, isChild, isOrphan }) => {
                        const course = state.courses.find(c => c.id === sec.courseId);
                        const totalUnits = (course?.units ?? 0) + (course?.labUnits ?? 0);
                        return (
                          <tr key={sec.id} className={isOrphan ? 'bg-destructive/5' : isChild ? 'bg-muted/15' : 'bg-background'}>
                            <td className={`px-3 py-2 font-mono text-xs font-bold whitespace-nowrap ${isOrphan ? 'text-destructive' : isChild ? 'pl-6 text-primary/60' : 'text-primary'}`}>
                              {course?.code}
                            </td>
                            <td className={`px-3 py-2 text-xs ${isOrphan ? 'text-destructive' : isChild ? 'text-muted-foreground italic' : 'text-foreground'}`}>
                              {course?.title}{isOrphan ? ' — Lecture not enlisted' : ''}
                            </td>
                            <td className="px-3 py-2 text-xs text-center font-medium text-muted-foreground">{sec.sectionCode}</td>
                            <td className="px-3 py-2 text-xs text-center text-muted-foreground">
                              {(isChild || isOrphan) ? '—' : totalUnits}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-border bg-muted/25">
                        <td colSpan={3} className="px-3 py-2 text-xs text-right text-muted-foreground font-medium">Total academic units</td>
                        <td className="px-3 py-2 text-xs text-center font-bold text-foreground">{currentUnits}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              );
            })()}
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
                <span className="text-xs text-muted-foreground">Per page</span>
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
                  ) : searchedSections.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(sec => {
                    const { course, faculty, enrolled, isFull, hasOverlap, isCourseDuplicate, hasCartOverlap, isCartDuplicate, prereqCheck, coreqCheck, unitCheck, consentBlocked, hasApprovedPrerog, incRestricted, geElectiveBlocked } = getSectionInfo(sec);
                    if (!course) return null;
                    const inCart = cart.includes(sec.id);
                    const childSections = state.sections.filter(s => s.parentSectionId === sec.id && s.termId === activeTerm?.id);
                    const hasChildSections = childSections.length > 0;
                    const childTypeName = childSections[0]?.sectionType === 'recitation' ? 'Recitation' : 'Lab';
                    const allGroupsFull = hasChildSections && childSections.every(cs => cs.enrolled >= cs.slots);

                    const rowClass = enrolled ? 'bg-green-50/50 cursor-pointer'
                      : inCart ? 'bg-orange-50/30 cursor-pointer hover:bg-orange-50/50'
                      : 'cursor-pointer hover:bg-muted/20';

                    // Resolve prereq/coreq IDs → "CODE (Title)"
                    const resolveIds = (ids?: string[][] | string[]) => {
                      const flat = flattenIds(ids);
                      if (!flat.length) return 'None';
                      const resolved = flat.map(id => { const c = state.courses.find(x => x.id === id); return c ? `${c.code} (${c.title})` : null; }).filter(Boolean);
                      return resolved.length ? resolved.join(', ') : 'None';
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
                    } else if (inCart) {
                      actionBtn = (
                        <Button size="sm" variant="outline" className="h-8 text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
                          onClick={e => { e.stopPropagation(); removeFromCart(sec.id); }}>
                          <Trash2 className="w-3 h-3 mr-1" />Remove
                        </Button>
                      );
                    } else if (hasChildSections) {
                      // Inline lab picker handles adding to cart — no separate button needed
                      actionBtn = allGroupsFull
                        ? <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">All {childTypeName} groups full</Badge>
                        : <span className="text-xs text-muted-foreground italic whitespace-nowrap">Pick a {childTypeName} group →</span>;
                    } else {
                      const hasIssues = hasOverlap || isCourseDuplicate || hasCartOverlap || isCartDuplicate || !prereqCheck.passed || !coreqCheck.passed || consentBlocked || (isFull && !hasApprovedPrerog);
                      actionBtn = (
                        <Button size="sm"
                          className={`h-8 text-xs text-white bg-green-500 hover:bg-green-600`}
                          onClick={e => {
                            e.stopPropagation();
                            addToCart(sec.id);
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
                          <div className={`grid gap-2 ${sec.labSchedule || hasChildSections ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                            {/* Lecture / Main card */}
                            <div className="border border-black rounded-md overflow-hidden">
                              <div className="bg-blue-500 px-3 py-1.5 flex items-center justify-between">
                                <span className="text-white text-xs font-semibold">{sec.labSchedule || hasChildSections ? 'Lecture / Main' : 'Class'}</span>
                                <span className="text-white text-xs font-medium">{course.units} unit{course.units !== 1 ? 's' : ''}</span>
                              </div>
                              <div className="px-3 py-2 space-y-1 text-xs">
                                <p className="font-bold text-sm">{sec.sectionCode} - {sec.schedule.days.length ? `(${fmt12(sec.schedule.startTime)} - ${fmt12(sec.schedule.endTime)})` : 'Flexible Schedule'}</p>
                                <p><span className="text-muted-foreground">Faculty:</span> {sec.facultyHidden ? 'To be Announced' : (faculty?.name ?? 'TBA')}</p>
                                <p><span className="text-muted-foreground">Location:</span> {sec.schedule.room ?? 'TBA'}</p>
                                <DayBadges days={sec.schedule.days} />
                                <p><span className="text-muted-foreground">Pre-Req:</span> {prereqStr}</p>
                                {course.corequisites?.length ? <p><span className="text-muted-foreground">Co-Req:</span> {coreqStr}</p> : null}
                                {(course.requiresCOI || course.requiresDeptConsent || course.requiresOCSConsent || course.coiIfUnsatisfied || course.deptConsentIfUnsatisfied || course.ocsConsentIfUnsatisfied) && (
                                  <div className="space-y-0.5 pt-0.5">
                                    {course.requiresCOI && <p className="text-xs text-[#7A1A2E]">Requires COI</p>}
                                    {course.requiresDeptConsent && <p className="text-xs text-[#7A1A2E]">Requires Department Consent</p>}
                                    {course.requiresOCSConsent && <p className="text-xs text-[#7A1A2E]">Requires OCS Consent</p>}
                                    {course.coiIfUnsatisfied && !course.requiresCOI && <p className="text-xs text-[#7A1A2E]">Requires COI if prerequisites/co-requisites not satisfied</p>}
                                    {course.deptConsentIfUnsatisfied && !course.requiresDeptConsent && <p className="text-xs text-[#7A1A2E]">Requires Dept Consent if prerequisites/co-requisites not satisfied</p>}
                                    {course.ocsConsentIfUnsatisfied && !course.requiresOCSConsent && <p className="text-xs text-[#7A1A2E]">Requires OCS Consent if prerequisites/co-requisites not satisfied</p>}
                                  </div>
                                )}
                                <div className="flex items-center justify-between pt-0.5">
                                  <div className="flex gap-1 flex-wrap">
                                    {isFull && <Badge className="text-[10px] bg-red-100 text-red-700 border-red-200">FULL</Badge>}
                                    {isFull && hasApprovedPrerog && <Badge className="text-[10px] bg-green-100 text-green-700 border-green-200">Prerog ✓</Badge>}
                                    {allGroupsFull && <Badge className="text-[10px] bg-red-100 text-red-700 border-red-200">All {childTypeName} groups full</Badge>}
                                  </div>
                                  <Badge className="bg-green-600 text-white text-xs border-0">{sec.enrolled}/{sec.slots}</Badge>
                                </div>
                              </div>
                            </div>
                            {/* Inline child lab/rec group picker — always shown; full groups selectable like full lecture sections */}
                            {hasChildSections && (
                              <div className="border border-black rounded-md overflow-hidden">
                                <div className="bg-blue-500 px-3 py-1.5">
                                  <span className="text-white text-xs font-semibold">Select {childTypeName} Group</span>
                                </div>
                                <div className="divide-y">
                                  {childSections.map(child => {
                                    const childFaculty = state.users.find(u => u.id === child.facultyId);
                                    const isSelected = cart.includes(child.id);
                                    const isChildFull = child.enrolled >= child.slots;
                                    return (
                                      <button key={child.id}
                                        disabled={!!(isFinalized && !appealBypass)}
                                        className={`w-full text-left px-3 py-2 text-xs transition-colors ${isSelected ? 'bg-orange-50 ring-inset ring-1 ring-orange-400' : isChildFull ? 'bg-red-50/40 hover:bg-red-100/50' : 'hover:bg-muted/30'}`}
                                        onClick={e => {
                                          e.stopPropagation();
                                          if (isSelected) {
                                            // Deselect: remove lecture + this lab
                                            removeFromCart(sec.id);
                                          } else {
                                            // Select: add lecture + this lab (replacing any prev lab)
                                            setCart(c => [
                                              ...c.filter(id => id !== sec.id && !childSections.some(cs => cs.id === id)),
                                              sec.id,
                                              child.id,
                                            ]);
                                            notifySuccess('Added to Cart', `${course.code} Sec ${sec.sectionCode} + ${childTypeName} ${child.sectionCode} added to your cart.`);
                                          }
                                        }}>
                                        <div className="flex justify-between items-start gap-2">
                                          <div className="space-y-0.5">
                                            <p className="font-bold">{child.sectionCode}</p>
                                            <p><span className="text-muted-foreground">Faculty:</span> {child.facultyHidden ? 'To be Announced' : (childFaculty?.name ?? 'TBA')}</p>
                                            <p><span className="text-muted-foreground">Location:</span> {child.schedule.room ?? 'TBA'}</p>
                                            <DayBadges days={child.schedule.days} />
                                            {child.schedule.days.length > 0 && (
                                              <p>{fmt12(child.schedule.startTime)} – {fmt12(child.schedule.endTime)}</p>
                                            )}
                                          </div>
                                          <div className="flex flex-col items-end gap-1 shrink-0">
                                            <Badge className={`text-xs border-0 ${isChildFull ? 'bg-red-500 text-white' : 'bg-green-600 text-white'}`}>{child.enrolled}/{child.slots}{isChildFull ? ' — FULL' : ''}</Badge>
                                            {isSelected && <Badge className="bg-orange-500 text-white text-[10px] border-0">Selected</Badge>}
                                          </div>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            {/* Legacy lab card */}
                            {sec.labSchedule && !hasChildSections && (
                              <div className="border border-black rounded-md overflow-hidden">
                                <div className="bg-blue-500 px-3 py-1.5 flex items-center justify-between">
                                  <span className="text-white text-xs font-semibold">{course?.type === 'Lec+Rec' ? 'Recitation Section' : 'Laboratory'}</span>
                                </div>
                                <div className="px-3 py-2 space-y-1 text-xs">
                                  <p className="font-bold text-sm">{sec.sectionCode}{course?.type === 'Lec+Rec' ? 'R' : 'L'} - ({fmt12(sec.labSchedule.startTime)} - {fmt12(sec.labSchedule.endTime)})</p>
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

            {/* Pagination tabs */}
            {filterApplied && searchedSections.length > pageSize && (() => {
              const totalPages = Math.ceil(searchedSections.length / pageSize);
              const delta = 2;
              const range: (number | '…')[] = [];
              let prev = 0;
              for (let i = 1; i <= totalPages; i++) {
                if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
                  if (prev && i - prev > 1) range.push('…');
                  range.push(i);
                  prev = i;
                }
              }
              return (
                <div className="flex items-center justify-center gap-1 pt-2 pb-1">
                  {currentPage > 1 && (
                    <button
                      onClick={() => setCurrentPage(p => p - 1)}
                      className="min-w-[32px] h-8 px-2 rounded text-sm font-medium border border-border bg-background text-foreground hover:bg-muted transition-colors"
                    >
                      ‹
                    </button>
                  )}
                  {range.map((p, idx) =>
                    p === '…' ? (
                      <span key={`ellipsis-${idx}`} className="px-2 text-sm text-muted-foreground">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p as number)}
                        className={`min-w-[32px] h-8 px-2 rounded text-sm font-medium border transition-colors ${
                          p === currentPage
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background text-foreground border-border hover:bg-muted'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                  {currentPage < totalPages && (
                    <button
                      onClick={() => setCurrentPage(p => p + 1)}
                      className="min-w-[32px] h-8 px-2 rounded text-sm font-medium border border-border bg-background text-foreground hover:bg-muted transition-colors"
                    >
                      ›
                    </button>
                  )}
                </div>
              );
            })()}

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
