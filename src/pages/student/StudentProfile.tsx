import { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { supabase } from '../../integrations/supabase/client';
import PortalLayout from '../../components/shared/PortalLayout';
import { Badge } from '../../components/ui/badge';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { TermSelect } from '../../components/shared/TermSelect';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { toast } from '../../components/ui/sonner';
import {
  Award, GraduationCap, TrendingUp, BookOpen, Info, ShieldCheck, AlertTriangle,
  User as UserIcon, Layers, Wallet, ClipboardList, Search, AlertCircle, Bookmark,
  Pencil, CheckCircle2, Clock, UserCog, X,
} from 'lucide-react';
import {
  getYearClassification, getPassedUnits, getScholasticStanding,
  getCompletionPercent, scholasticStandingColor, yearClassificationColor,
  buildProgramCourseIdSet, computeTotalRequiredUnits, sortTermsChronologically,
} from '../../lib/academic';
import type { Section, Term } from '../../lib/types';

// ── Shared helpers ──────────────────────────────────────────────────────────
const gwaColor = (gwa: number) => {
  if (gwa <= 1.5) return 'text-secondary';
  if (gwa <= 2.5) return 'text-foreground';
  if (gwa <= 3.0) return 'text-yellow-600';
  return 'text-destructive';
};

const gwaLabel = (gwa: number, isSenior?: boolean) => {
  if (gwa === 0) return 'N/A';
  if (isSenior) {
    if (gwa <= 1.25) return 'Summa Cum Laude';
    if (gwa <= 1.5) return 'Magna Cum Laude';
    if (gwa <= 1.75) return 'Cum Laude';
  }
  if (gwa <= 1.45) return 'University Scholar';
  if (gwa <= 1.75) return 'College Scholar';
  if (gwa <= 2.0) return 'Very Good';
  if (gwa <= 2.5) return 'Good';
  if (gwa <= 3.0) return 'Satisfactory';
  return 'Below Average';
};

function getTermHonorific(
  gwa: number,
  gradesArr: { grade: import('../../lib/types').Grade; section: import('../../lib/types').Section; course: import('../../lib/types').Course }[],
  termSemester?: string,
  hasApprovedUnderload?: boolean
): 'University Scholar' | 'College Scholar' | null {
  if (gwa <= 0) return null;
  if (termSemester === 'Mid-Term') return null;
  const unitsTaken = gradesArr
    .filter(g => !g.course.isPE && !g.course.isNSTP)
    .reduce((sum, g) => sum + g.course.units + (g.course.labUnits ?? 0), 0);
  if (unitsTaken < 15 && !hasApprovedUnderload) return null;
  const hasBelow3 = gradesArr.some(g => {
    const effective = (g.grade.removalSubmitted && g.grade.removalGrade) ? g.grade.removalGrade : g.grade.grade;
    if (!effective) return false;
    const n = parseFloat(effective as string);
    if (!isNaN(n) && n > 3.0) return true;
    if (effective === 'F' || effective === '5') return true;
    return false;
  });
  const hasINC = gradesArr.some(g => g.grade.grade === 'INC');
  if (hasBelow3 || hasINC) return null;
  if (gwa <= 1.45) return 'University Scholar';
  if (gwa <= 1.75) return 'College Scholar';
  return null;
}

const flattenIds = (ids?: string[][] | string[]): string[] => {
  if (!ids?.length) return [];
  if (typeof ids[0] === 'string') return ids as string[];
  return (ids as string[][]).flat();
};

function fmt12(t: string): string {
  if (!t) return t;
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function fmtSched(s?: { days: string[]; startTime: string; endTime: string }) {
  if (!s || !s.days?.length) return 'TBA';
  return `${s.days.join('')} ${fmt12(s.startTime)}–${fmt12(s.endTime)}`;
}

/** Split a single "name" string into First / Middle / Last — no structured name fields exist yet. */
function splitName(fullName: string): { first: string; middle: string; last: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0], middle: '', last: '' };
  if (parts.length === 2) return { first: parts[0], middle: '', last: parts[1] };
  return { first: parts[0], middle: parts.slice(1, -1).join(' '), last: parts[parts.length - 1] };
}

const fmtPHP = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }) : '-';

const InfoField = ({ label, value }: { label: string; value?: string | number | null }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="font-semibold text-foreground mt-0.5">{value || value === 0 ? value : <span className="text-muted-foreground/60 font-normal">-</span>}</p>
  </div>
);

const InfoCard = ({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {action}
    </div>
    <div className="rounded-xl border border-border bg-muted/20 p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
      {children}
    </div>
  </div>
);

const EditField = ({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) => (
  <div>
    <p className="text-xs text-muted-foreground mb-1">{label}{required && <span className="text-destructive"> *</span>}</p>
    <Input value={value} onChange={e => onChange(e.target.value)} className="h-9" />
  </div>
);

type TabKey = 'info' | 'classes' | 'grades' | 'financial' | 'record';

export default function StudentProfile() {
  const { state, computeGWA, canStudentViewGrades, getStudentGrades, checkPrerequisites, updateUser } = useApp();
  const me = state.currentUser;
  const [tab, setTab] = useState<TabKey>('info');
  const [classesSubTab, setClassesSubTab] = useState<'current' | 'history'>('current');
  const [historyTermId, setHistoryTermId] = useState('');
  const [finSearch, setFinSearch] = useState('');
  const [cart, setCart] = useState<string[]>([]);

  // Editable sections: Additional Information + Contact and Address — synced to admin portal
  const [editingAdditional, setEditingAdditional] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  const [additionalForm, setAdditionalForm] = useState({
    preferredName: '', indigenousGroup: '', religion: '', genderIdentity: '', disability: '',
  });
  const [contactForm, setContactForm] = useState({
    houseNoStreet: '', barangay: '', cityMunicipality: '', presentAddress: '', presentAddressTel: '', countryOfCitizenship: '',
  });
  const [savingAdditional, setSavingAdditional] = useState(false);
  const [savingContact, setSavingContact] = useState(false);

  // ── Fetch cart (bookmarked sections) for current term — same source StudentEnlistment uses ──
  useEffect(() => {
    const termId = state.terms.find(t => t.isActive)?.id;
    if (!me?.id || !termId) return;
    supabase.from('profiles').select('cart_data').eq('local_id', me.id).maybeSingle()
      .then(({ data }) => {
        const dbCart = (data?.cart_data as Record<string, string[]> | null)?.[termId];
        setCart(dbCart ?? []);
      });
  }, [me?.id, state.terms]);

  if (!me) return null;

  const startEditAdditional = () => {
    setAdditionalForm({
      preferredName: me.preferredName ?? '',
      indigenousGroup: me.indigenousGroup ?? '',
      religion: me.religion ?? '',
      genderIdentity: me.genderIdentity ?? '',
      disability: me.disability ?? '',
    });
    setEditingAdditional(true);
  };

  const startEditContact = () => {
    setContactForm({
      houseNoStreet: me.houseNoStreet ?? '',
      barangay: me.barangay ?? '',
      cityMunicipality: me.cityMunicipality ?? '',
      presentAddress: me.presentAddress ?? '',
      presentAddressTel: me.presentAddressTel ?? '',
      countryOfCitizenship: me.countryOfCitizenship ?? '',
    });
    setEditingContact(true);
  };

  const saveAdditional = async () => {
    setSavingAdditional(true);
    try {
      await updateUser(me.id, additionalForm);
      toast.success('Additional Information updated.');
      setEditingAdditional(false);
    } catch {
      toast.error('Failed to save changes. Please try again.');
    } finally {
      setSavingAdditional(false);
    }
  };

  const saveContact = async () => {
    if (!contactForm.presentAddress.trim()) { toast.error('Present address is required.'); return; }
    if (!contactForm.presentAddressTel.trim()) { toast.error('Present address contact number is required.'); return; }
    setSavingContact(true);
    try {
      await updateUser(me.id, contactForm);
      toast.success('Contact and Address updated.');
      setEditingContact(false);
    } catch {
      toast.error('Failed to save changes. Please try again.');
    } finally {
      setSavingContact(false);
    }
  };

  const { gwa: overallGWA, perTerm } = computeGWA(me.id);
  const initials = me.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const activeTerm = state.terms.find(t => t.isActive);
  const isMidTerm = activeTerm?.semester === 'Mid-Term';

  // ── Year classification ────────────────────────────────────────────────────
  const degreeProgram = state.degreePrograms.find(p => p.name === me.program || p.id === me.program);
  const degreeType = degreeProgram?.degreeType;
  const isGradProgram = degreeType === 'masters' || degreeType === 'doctorate';
  const meCollegeId = (() => {
    if (!me.college) return '';
    const byId = state.colleges.find(c => c.id === me.college);
    if (byId) return byId.id;
    const byName = state.colleges.find(c => c.name === me.college);
    return byName?.id ?? me.college;
  })();
  const globalReq = state.graduationRequirements.find(r => r.collegeId === 'global' && !r.programId);
  const collegeReq = degreeProgram?.id
    ? (state.graduationRequirements.find(r => r.programId === degreeProgram.id)
        ?? state.graduationRequirements.find(r => r.collegeId === meCollegeId && !r.programId))
    : state.graduationRequirements.find(r => r.collegeId === meCollegeId && !r.programId);
  const reqBasedUnits = computeTotalRequiredUnits(globalReq, collegeReq, state.courses);
  const totalProgramUnits = reqBasedUnits > 0 ? reqBasedUnits : (degreeProgram?.totalUnits ?? 0);
  const programCourseIds = buildProgramCourseIdSet(state.graduationRequirements, degreeProgram?.collegeId ?? '', degreeProgram?.id ?? me.program ?? '');
  const passedUnits = getPassedUnits(me.id, state.grades, state.sections, state.courses, state.enrollments, programCourseIds);
  const rawYearClass = totalProgramUnits > 0 ? getYearClassification(passedUnits, totalProgramUnits, degreeType) : null;
  const yearClass = isGradProgram ? null : rawYearClass;
  const isSeniorStudent = yearClass === 'Senior' || (!isGradProgram && me.yearLevel != null && me.yearLevel >= 4);
  const completionPct = totalProgramUnits > 0 ? getCompletionPercent(passedUnits, totalProgramUnits) : 0;
  const classificationLabel = isGradProgram
    ? (degreeType === 'masters' ? "Master's Student" : 'Doctoral Student')
    : (yearClass ? `Continuing ${yearClass === 'Freshman' ? 'First' : yearClass === 'Sophomore' ? 'Second' : yearClass === 'Junior' ? 'Third' : 'Fourth'} Year` : 'Continuing Student');

  // ── Academic record summary ────────────────────────────────────────────────
  const allEnrollments = state.enrollments.filter(e => e.studentId === me.id && e.status === 'enrolled');
  const totalEnrolledUnits = allEnrollments.reduce((sum, enr) => {
    const sec = state.sections.find(s => s.id === enr.sectionId);
    const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
    if (!course || course.isPE || course.isNSTP) return sum;
    return sum + course.units;
  }, 0);
  const termsEnrolled = [...new Set(allEnrollments.map(e => state.sections.find(s => s.id === e.sectionId)?.termId).filter(Boolean))].length;

  // ── Scholastic standing per term ───────────────────────────────────────────
  const scholasticPerTerm = state.terms
    .map(term => ({
      term,
      result: getScholasticStanding(me.id, term.id, state.grades, state.sections, state.courses),
      canView: canStudentViewGrades(me.id, term.id),
    }))
    .filter(x => x.result !== null && x.canView);
  const latestScholastic = scholasticPerTerm[scholasticPerTerm.length - 1]?.result ?? null;

  // ── Classes (read-only) ────────────────────────────────────────────────────
  const sortedTerms = sortTermsChronologically(state.terms);
  const pastTerms = sortedTerms.filter(t => !t.isActive).reverse();

  type ClassStatus = 'finalized' | 'enlisted' | 'bookmarked' | 'manual';

  const buildClassRows = (termId: string) => {
    const isCurrentTerm = termId === activeTerm?.id;
    const isFinalizedTerm = state.finalizedEnlistments.some(fe => fe.studentId === me.id && fe.termId === termId);
    const enrollments = state.enrollments.filter(e => e.studentId === me.id && e.termId === termId && e.status !== 'dropped');
    const enrolledLectureSections = enrollments
      .map(e => state.sections.find(s => s.id === e.sectionId))
      .filter((s): s is Section => !!s && !s.parentSectionId);
    // Bookmarked (cart) lecture sections not yet enlisted — only relevant for the current term
    const bookmarkedLectureSections = isCurrentTerm
      ? cart
          .map(id => state.sections.find(s => s.id === id))
          .filter((s): s is Section => !!s && !s.parentSectionId && !enrolledLectureSections.some(e => e.id === s.id))
      : [];
    const lectureSections = [...enrolledLectureSections, ...bookmarkedLectureSections];

    const statusOf = (sec: Section): ClassStatus => {
      if (sec.isManualGrade) return 'manual';
      const enr = enrollments.find(e => e.sectionId === sec.id);
      if (!enr) return 'bookmarked';
      if (enr.status === 'enrolled') return isFinalizedTerm ? 'finalized' : 'manual';
      return 'enlisted';
    };

    return lectureSections.map(sec => {
      const course = state.courses.find(c => c.id === sec.courseId);
      const childEnrolled = enrollments
        .map(e => state.sections.find(s => s.id === e.sectionId))
        .find((s): s is Section => !!s && s.parentSectionId === sec.id)
        ?? (isCurrentTerm
          ? cart.map(id => state.sections.find(s => s.id === id)).find((s): s is Section => !!s && s.parentSectionId === sec.id)
          : undefined);
      // Schedule/prereq conflict checks (informational — read-only view)
      const hasScheduleConflict = lectureSections.some(other => {
        if (other.id === sec.id) return false;
        const a = sec.schedule, b = other.schedule;
        return a.days.some(d => b.days.includes(d)) &&
          (() => { const tm = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
            return tm(a.startTime) < tm(b.endTime) && tm(a.endTime) > tm(b.startTime); })();
      });
      const prereqCheck = course ? checkPrerequisites(me.id, course.id) : { passed: true, missing: [] };
      const hasPrereqConflict = !prereqCheck.passed;
      const status = statusOf(sec);
      return { sec, course, childEnrolled, hasScheduleConflict, hasPrereqConflict, status };
    });
  };

  const currentClassRows = activeTerm ? buildClassRows(activeTerm.id) : [];
  const historyClassRows = historyTermId ? buildClassRows(historyTermId) : [];

  const resolvePrereqStr = (course?: { prerequisites?: string[][] | string[] }) => {
    const flat = flattenIds(course?.prerequisites);
    if (!flat.length) return 'None';
    const resolved = flat.map(id => state.courses.find(c => c.id === id)?.code).filter(Boolean);
    return resolved.length ? resolved.join(', ') : 'None';
  };

  // ── Financial Account (read-only, real payment data) ──────────────────────
  const computeStudentTermBill = (term: Term) => {
    const fs = term.feeSchedule;
    if (!fs) return null;
    const enrolled = state.enrollments.filter(e => e.studentId === me.id && e.termId === term.id && e.status === 'enrolled');
    let academicUnits = 0, labUnitsTotal = 0, nstpUnits = 0;
    enrolled.forEach(e => {
      const sec = state.sections.find(s => s.id === e.sectionId);
      const course = sec ? state.courses.find(c => c.id === sec.courseId) : undefined;
      if (!course || sec?.isManualGrade) return;
      if (course.isNSTP) { nstpUnits += course.units; return; }
      if (course.isPE) return;
      const isLabSec = sec?.sectionType === 'lab' || sec?.sectionType === 'recitation' || course.type === 'Lab' || course.type === 'Recitation';
      if (isLabSec) labUnitsTotal += course.units;
      else { academicUnits += course.units; labUnitsTotal += course.labUnits ?? 0; }
    });
    const tuition = academicUnits * fs.tuitionPerUnit;
    const nstpTuition = nstpUnits > 0 ? fs.nstpTuition : 0;
    const labFees = labUnitsTotal * fs.labFeePerUnit;
    const otherFees = fs.admissionFees + fs.entranceFees + fs.registrationFees + fs.libraryFees +
      labFees + fs.computerFees + fs.athleticFees + fs.culturalFees + fs.medicalDentalFees +
      fs.guidanceFees + fs.handbookFees + fs.schoolIdFees + fs.developmentFees + fs.edf +
      fs.changeOfMatriculation + fs.depositFee;
    const totalBeforeSubsidy = tuition + nstpTuition + otherFees;
    const payment = (state.enrollmentPayments ?? []).find(p => p.studentId === me.id && p.termId === term.id);
    let payable = totalBeforeSubsidy;
    let billTypeSuffix = '';
    if (payment?.freeTuition) {
      const sub = tuition + nstpTuition + (payment.otherFeesSubsidy ? otherFees : 0);
      payable = Math.max(0, totalBeforeSubsidy - sub);
      billTypeSuffix = ' (RA 10931)';
    } else if (payment?.stCode) {
      const rateMap: Record<string, number> = { '33': 1000, '60': 600, '80': 300, '100': 0 };
      const rate = rateMap[payment.stCode];
      if (payment.stCode === '100') {
        payable = 0;
        billTypeSuffix = ' (ST-100)';
      } else if (rate !== undefined) {
        const perUnitSubsidy = Math.max(0, fs.tuitionPerUnit - rate);
        const tuitionSubsidy = Math.min(tuition, academicUnits * perUnitSubsidy);
        payable = Math.max(0, totalBeforeSubsidy - tuitionSubsidy);
        billTypeSuffix = ` (ST-${payment.stCode})`;
      }
    }
    payable += payment?.carriedOverAmount ?? 0;
    const settled = payment?.amountPaid ?? 0;
    const balance = Math.max(0, payable - settled);
    const txs = (state.paymentTransactions ?? []).filter(t => t.studentId === me.id && t.termId === term.id);
    const reference = payment?.orNumber ?? txs[0]?.orNumber ?? '-';
    return { total: payable, settled, balance, reference, billType: `Matriculation Bill${billTypeSuffix}` };
  };

  const financialRows = sortedTerms
    // Only show terms where the student has finalized their enlistment — no bill exists until then
    .filter(term => state.finalizedEnlistments.some(fe => fe.studentId === me.id && fe.termId === term.id))
    .map(term => ({ term, bill: computeStudentTermBill(term) }))
    .filter((r): r is { term: Term; bill: NonNullable<ReturnType<typeof computeStudentTermBill>> } => !!r.bill)
    .filter(r => {
      const q = finSearch.trim().toLowerCase();
      if (!q) return true;
      return r.term.name.toLowerCase().includes(q) || r.bill.reference.toLowerCase().includes(q);
    })
    .reverse();

  // ── Student Record: Hold Notice (reuses the same payment-hold scan as Enlistment) ──
  const priorTermsSorted = state.terms
    .filter(t => t.id !== activeTerm?.id)
    .sort((a, b) => (b as { startDate?: string }).startDate?.localeCompare((a as { startDate?: string }).startDate ?? '') ?? 0);
  const priorTerm = priorTermsSorted[0];
  const heldByTerm = activeTerm ? state.terms.find(term => {
    const payment = (state.enrollmentPayments ?? []).find(p => p.studentId === me.id && p.termId === term.id);
    const isCurrentTerm = term.id === activeTerm.id;
    const studentFinalisedThisTerm = state.finalizedEnlistments.some(fe => fe.studentId === me.id && fe.termId === term.id);
    const hasApprovedLoan = (state.studentLoanApplications ?? []).some(l => l.studentId === me.id && l.termId === term.id && l.status === 'approved');
    if (hasApprovedLoan) return false;
    if (payment && payment.status === 'unpaid' && payment.amountPaid > 0) {
      if (isCurrentTerm && studentFinalisedThisTerm) return false;
      return true;
    }
    if (!isCurrentTerm && studentFinalisedThisTerm && (!payment || payment.status === 'unpaid')) return true;
    return false;
  }) : undefined;
  const holdDisplayTerm = heldByTerm ?? priorTerm;
  const holdBill = holdDisplayTerm ? computeStudentTermBill(holdDisplayTerm) : null;

  const { first, middle, last } = splitName(me.name);
  const collegeFullName = state.colleges.find(c => c.id === me.college || c.name === me.college)?.name ?? me.college;

  const navItems: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: 'info', label: 'Student Information', icon: UserIcon },
    { key: 'classes', label: 'Classes', icon: BookOpen },
    { key: 'grades', label: 'Grades', icon: Award },
    { key: 'financial', label: 'Financial Account', icon: Wallet },
    { key: 'record', label: 'Student Record', icon: ClipboardList },
  ];

  return (
    <PortalLayout title="My Profile">
      <div className="rounded-xl overflow-hidden border border-border bg-background">
        {/* ── Hero banner ─────────────────────────────────────────────── */}
        <div className="relative bg-primary pt-8 pb-16 px-8">
          <Avatar className="h-24 w-24 border-4 border-background shadow-lg absolute -bottom-10 left-8">
            <AvatarFallback className="bg-muted text-muted-foreground text-2xl font-bold">{initials}</AvatarFallback>
          </Avatar>
        </div>
        <div className="pt-12 pb-5 px-8 flex flex-wrap items-start justify-between gap-3 border-b border-border">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{me.name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{me.studentNumber ?? me.username}</p>
          </div>
          <p className="text-sm text-muted-foreground mt-2">{classificationLabel}</p>
        </div>

        {/* ── Sidebar + Content ───────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row">
          <div className="lg:w-64 flex-shrink-0 p-4 space-y-1 border-b lg:border-b-0 lg:border-r border-border bg-muted/10">
            {navItems.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  tab === key ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground/70 hover:bg-muted'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 min-w-0 p-6 space-y-6">

            {/* ══════════════ STUDENT INFORMATION ══════════════ */}
            {tab === 'info' && (
              <div className="space-y-6">
                <InfoCard title="Profile Information">
                  <InfoField label="First Name" value={first} />
                  <InfoField label="Middle Name" value={middle} />
                  <InfoField label="Last Name" value={last} />
                  <InfoField label="Civil Status" value={me.civilStatus} />
                  <InfoField label="Birthday" value={fmtDate(me.birthday)} />
                  <InfoField label="Generational Suffix" value={me.generationalSuffix} />
                  <InfoField label="Sex assigned at Birth" value={me.sex} />
                  <InfoField label="Email" value={me.email} />
                </InfoCard>

                <InfoCard
                  title="Additional Information"
                  action={!editingAdditional ? (
                    <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={startEditAdditional}>
                      <Pencil className="w-3 h-3" /> Edit
                    </Button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => setEditingAdditional(false)} disabled={savingAdditional}>
                        <X className="w-3 h-3" /> Cancel
                      </Button>
                      <Button size="sm" className="h-7 gap-1 text-xs" onClick={saveAdditional} disabled={savingAdditional}>
                        <CheckCircle2 className="w-3 h-3" /> {savingAdditional ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  )}
                >
                  {editingAdditional ? (
                    <>
                      <EditField label="Preferred Name" value={additionalForm.preferredName} onChange={v => setAdditionalForm(f => ({ ...f, preferredName: v }))} />
                      <EditField label="Indigenous Group" value={additionalForm.indigenousGroup} onChange={v => setAdditionalForm(f => ({ ...f, indigenousGroup: v }))} />
                      <EditField label="Religion" value={additionalForm.religion} onChange={v => setAdditionalForm(f => ({ ...f, religion: v }))} />
                      <EditField label="Gender Identity" value={additionalForm.genderIdentity} onChange={v => setAdditionalForm(f => ({ ...f, genderIdentity: v }))} />
                      <EditField label="Disability" value={additionalForm.disability} onChange={v => setAdditionalForm(f => ({ ...f, disability: v }))} />
                    </>
                  ) : (
                    <>
                      <InfoField label="Preferred Name" value={me.preferredName} />
                      <InfoField label="Indigenous Group" value={me.indigenousGroup} />
                      <InfoField label="Religion" value={me.religion} />
                      <InfoField label="Gender Identity" value={me.genderIdentity} />
                      <InfoField label="Disability" value={me.disability} />
                    </>
                  )}
                </InfoCard>

                <InfoCard
                  title="Contact and Address"
                  action={!editingContact ? (
                    <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={startEditContact}>
                      <Pencil className="w-3 h-3" /> Edit
                    </Button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => setEditingContact(false)} disabled={savingContact}>
                        <X className="w-3 h-3" /> Cancel
                      </Button>
                      <Button size="sm" className="h-7 gap-1 text-xs" onClick={saveContact} disabled={savingContact}>
                        <CheckCircle2 className="w-3 h-3" /> {savingContact ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  )}
                >
                  {editingContact ? (
                    <>
                      <EditField label="House No./Blk/Lot" value={contactForm.houseNoStreet} onChange={v => setContactForm(f => ({ ...f, houseNoStreet: v }))} />
                      <EditField label="Barangay" value={contactForm.barangay} onChange={v => setContactForm(f => ({ ...f, barangay: v }))} />
                      <EditField label="City/Municipality" value={contactForm.cityMunicipality} onChange={v => setContactForm(f => ({ ...f, cityMunicipality: v }))} />
                      <EditField label="Present Address" value={contactForm.presentAddress} onChange={v => setContactForm(f => ({ ...f, presentAddress: v }))} required />
                      <EditField label="Contact No." value={contactForm.presentAddressTel} onChange={v => setContactForm(f => ({ ...f, presentAddressTel: v }))} required />
                      <EditField label="Country of Citizenship" value={contactForm.countryOfCitizenship} onChange={v => setContactForm(f => ({ ...f, countryOfCitizenship: v }))} />
                    </>
                  ) : (
                    <>
                      <InfoField label="House No./Blk/Lot" value={me.houseNoStreet} />
                      <InfoField label="Barangay" value={me.barangay} />
                      <InfoField label="City/Municipality" value={me.cityMunicipality} />
                      <InfoField label="Present Address" value={me.presentAddress} />
                      <InfoField label="Contact No." value={me.presentAddressTel} />
                      <InfoField label="Country of Citizenship" value={me.countryOfCitizenship} />
                    </>
                  )}
                </InfoCard>
              </div>
            )}

            {/* ══════════════ CLASSES (read-only) ══════════════ */}
            {tab === 'classes' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex rounded-full border border-border p-1 bg-muted/30">
                    <button
                      onClick={() => setClassesSubTab('current')}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${classesSubTab === 'current' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
                    >
                      Current Class
                    </button>
                    <button
                      onClick={() => setClassesSubTab('history')}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${classesSubTab === 'history' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
                    >
                      History
                    </button>
                  </div>
                  {classesSubTab === 'history' && (
                    <TermSelect terms={pastTerms} value={historyTermId} onValueChange={setHistoryTermId} className="!gap-2" />
                  )}
                </div>

                <p className="text-sm font-semibold text-foreground">{classesSubTab === 'current' ? 'Current Class' : 'Past Classes'}</p>

                <div className="rounded-xl border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="w-1/2">Lecture</TableHead>
                        <TableHead className="w-1/3">Laboratory</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(classesSubTab === 'current' ? currentClassRows : historyClassRows).length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-10">
                          {classesSubTab === 'history' && !historyTermId ? 'Select a semester to view past classes.' : 'No Data Available'}
                        </TableCell></TableRow>
                      ) : (classesSubTab === 'current' ? currentClassRows : historyClassRows).map(({ sec, course, childEnrolled, hasScheduleConflict, hasPrereqConflict, status }) => {
                        const hasConflict = hasScheduleConflict || hasPrereqConflict;
                        const statusBadge = {
                          finalized: <Badge className="bg-secondary text-secondary-foreground text-[10px] gap-1"><CheckCircle2 className="w-2.5 h-2.5" />Finalized</Badge>,
                          enlisted: <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px] gap-1"><Clock className="w-2.5 h-2.5" />Enlisted</Badge>,
                          bookmarked: <Badge variant="outline" className="text-[10px] gap-1"><Bookmark className="w-2.5 h-2.5" />Bookmarked</Badge>,
                          manual: <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[10px] gap-1"><UserCog className="w-2.5 h-2.5" />Added by OCS</Badge>,
                        }[status];
                        return (
                          <TableRow key={sec.id} className={hasConflict ? 'bg-destructive/5' : status === 'bookmarked' ? 'bg-muted/20' : ''}>
                            <TableCell className={hasConflict ? 'text-destructive' : ''}>
                              <p className="font-bold text-sm">{course?.code} {sec.sectionCode !== '__MANUAL__' && <span className="font-normal text-muted-foreground">{sec.sectionCode}</span>}</p>
                              <p className="text-xs mt-1 flex items-center gap-1"><ClipboardList className="w-3 h-3" />{sec.sectionCode === '__MANUAL__' ? 'Manually added' : fmtSched(sec.schedule)}</p>
                              <p className="text-xs mt-0.5 flex items-center gap-1 opacity-80">
                                <AlertCircle className="w-3 h-3" /> Prerequisite: {resolvePrereqStr(course)}
                              </p>
                            </TableCell>
                            <TableCell>
                              {childEnrolled ? (
                                <>
                                  <p className="font-bold text-sm">{course?.code} <span className="font-normal text-muted-foreground">{childEnrolled.sectionCode}</span></p>
                                  <p className="text-xs mt-1 flex items-center gap-1"><ClipboardList className="w-3 h-3" />{fmtSched(childEnrolled.schedule)}</p>
                                  <p className="text-xs mt-0.5 flex items-center gap-1 opacity-80">
                                    <AlertCircle className="w-3 h-3" /> Prerequisite: {resolvePrereqStr(course)}
                                  </p>
                                </>
                              ) : (
                                <span className="text-sm text-muted-foreground">None</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right space-y-1">
                              {hasScheduleConflict && <Badge className="bg-destructive text-destructive-foreground text-[10px] gap-1"><AlertTriangle className="w-2.5 h-2.5" />Schedule Conflict</Badge>}
                              {hasPrereqConflict && <Badge className="bg-destructive text-destructive-foreground text-[10px] gap-1 block w-fit ml-auto"><AlertTriangle className="w-2.5 h-2.5" />Prereq Conflict</Badge>}
                              {statusBadge}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* ══════════════ GRADES (unchanged content, relocated) ══════════════ */}
            {tab === 'grades' && (
              <div className="space-y-5">
                {/* Stat Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Subjects Enrolled', value: allEnrollments.length, icon: BookOpen },
                    { label: 'Terms Enrolled', value: termsEnrolled, icon: GraduationCap },
                    { label: 'Units Enrolled', value: totalEnrolledUnits, icon: TrendingUp },
                    { label: 'Units Passed', value: passedUnits, icon: Award },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="portal-panel">
                      <div className="portal-panel-header">
                        <span className="text-xs font-bold leading-tight">{label}</span>
                        <Icon size={14} />
                      </div>
                      <div className="px-3 py-3 bg-background flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Icon size={16} className="text-primary" />
                        </div>
                        <p className="text-2xl font-bold text-foreground">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  <div className="lg:col-span-2 space-y-5">
                    {totalProgramUnits > 0 ? (
                      <div className="portal-panel">
                        <div className="portal-panel-header">
                          <GraduationCap size={14} /> {isGradProgram ? 'Degree Progress' : 'Year Classification'}
                        </div>
                        <div className="p-4 bg-background space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              {isGradProgram ? (
                                <p className="text-3xl font-bold text-foreground">{(completionPct * 100).toFixed(1)}%</p>
                              ) : (
                                <p className="text-3xl font-bold text-foreground">{yearClass}</p>
                              )}
                              <p className="text-sm text-muted-foreground mt-1">
                                <span className="font-semibold text-foreground">{passedUnits}</span> passed units out of{' '}
                                <span className="font-semibold text-foreground">{totalProgramUnits}</span> required
                                {!isGradProgram && <span className="ml-2 font-bold text-primary">({(completionPct * 100).toFixed(1)}% complete)</span>}
                              </p>
                            </div>
                            {!isGradProgram && yearClass && (
                              <Badge className={`text-base px-4 py-1.5 border ${yearClassificationColor(yearClass)}`}>{yearClass}</Badge>
                            )}
                            {isGradProgram && (
                              <Badge className="text-base px-4 py-1.5 border bg-primary/10 text-primary border-primary/30">
                                {degreeType === 'masters' ? "Master's" : 'Doctorate'}
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-2">
                            <div className="relative w-full bg-muted rounded-full h-4 overflow-hidden">
                              <div className="h-4 rounded-full bg-primary transition-all" style={{ width: `${(completionPct * 100).toFixed(1)}%` }} />
                              {!isGradProgram && (degreeType === 'associate_certificate' ? [50] : [25, 50, 75]).map(pct => (
                                <div key={pct} className="absolute top-0 h-full w-px bg-border/60" style={{ left: `${pct}%` }} />
                              ))}
                            </div>
                            {!isGradProgram && (
                              degreeType === 'associate_certificate' ? (
                                <div className="grid grid-cols-2 text-xs text-muted-foreground">
                                  <span className="font-medium">Freshman<br />&lt;50%</span>
                                  <span className="text-right font-medium">Sophomore<br />≥50%</span>
                                </div>
                              ) : (
                                <div className="grid grid-cols-4 text-xs text-muted-foreground">
                                  <span className="font-medium">Freshman<br />&lt;25%</span>
                                  <span className="text-center font-medium">Sophomore<br />25–50%</span>
                                  <span className="text-center font-medium">Junior<br />50–75%</span>
                                  <span className="text-right font-medium">Senior<br />≥75%</span>
                                </div>
                              )
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
                            Classification is based on the percentage of total program units satisfactorily completed (grade ≤ 3.0). PE and NSTP are excluded.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="portal-panel">
                        <div className="portal-panel-header">
                          <GraduationCap size={14} /> Year Classification
                        </div>
                        <div className="p-4 bg-background flex items-center gap-3 text-muted-foreground">
                          <Info size={16} className="flex-shrink-0" />
                          <p className="text-sm">Year classification is unavailable until your program's total required units are configured by admin.</p>
                        </div>
                      </div>
                    )}

                    {scholasticPerTerm.length > 0 && (
                      <div className="portal-panel">
                        <div className="portal-panel-header">
                          <ShieldCheck size={14} /> Scholastic Standing
                        </div>
                        <div className="p-4 bg-background space-y-3">
                          {latestScholastic && (
                            <div className={`flex items-center gap-4 p-4 rounded-xl border ${scholasticStandingColor(latestScholastic.standing)}`}>
                              {latestScholastic.standing === 'Good Standing'
                                ? <ShieldCheck size={22} className="flex-shrink-0" />
                                : <AlertTriangle size={22} className="flex-shrink-0" />}
                              <div className="flex-1">
                                <p className="font-bold text-lg">{latestScholastic.standing}</p>
                                <p className="text-sm mt-0.5 opacity-80">
                                  {latestScholastic.failedUnits > 0
                                    ? `${latestScholastic.failedUnits} of ${latestScholastic.totalAcademicUnits} academic units below 3.0 (${(latestScholastic.failedPercent * 100).toFixed(0)}% failed)`
                                    : `All ${latestScholastic.totalAcademicUnits} academic units passed this term`}
                                </p>
                              </div>
                              <Badge className="text-xs opacity-80 border-current">Latest</Badge>
                            </div>
                          )}
                          <div className="space-y-2">
                            {scholasticPerTerm.map(({ term, result }) => {
                              if (!result) return null;
                              return (
                                <div key={term.id} className="flex items-center justify-between px-4 py-3 rounded-lg bg-muted/40 border border-border">
                                  <div>
                                    <p className="font-medium">{term.name}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      Failed: {result.failedUnits}/{result.totalAcademicUnits} units ({(result.failedPercent * 100).toFixed(0)}%)
                                    </p>
                                  </div>
                                  <Badge className={`text-xs border ${scholasticStandingColor(result.standing)}`}>{result.standing}</Badge>
                                </div>
                              );
                            })}
                          </div>
                          <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
                            INC and DRP grades are excluded. Grade 4 counts as failing until the completion exam is passed (3.0) or failed (5.0).
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="portal-panel">
                      <div className="portal-panel-header">
                        <Award size={14} /> GWA Per Semester
                      </div>
                      <div className="p-4 bg-background">
                        {perTerm.length === 0 ? (
                          <p className="text-muted-foreground py-6 text-center">No graded terms yet.</p>
                        ) : (
                          <div className="space-y-3">
                            {perTerm.map(({ term, gwa }) => {
                              const canView = canStudentViewGrades(me.id, term.id);
                              const standing = scholasticPerTerm.find(s => s.term.id === term.id)?.result ?? null;
                              const termGrades = getStudentGrades(me.id, term.id);
                              const hasApprovedUnderload = (state.underloadApplications ?? []).some(
                                a => a.studentId === me.id && a.termId === term.id && a.status === 'approved'
                              );
                              const honorific = canView ? getTermHonorific(gwa, termGrades, term.semester, hasApprovedUnderload) : null;
                              return (
                                <div key={term.id} className="flex items-center justify-between px-4 py-3 rounded-lg bg-muted/40 border border-border">
                                  <div className="flex items-center gap-3">
                                    <GraduationCap size={18} className={term.isActive ? 'text-secondary' : 'text-muted-foreground'} />
                                    <div>
                                      <p className="font-semibold">{term.name}</p>
                                      <p className="text-xs text-muted-foreground">AY {term.academicYear}</p>
                                      {standing && (
                                        <Badge className={`mt-1 text-xs border ${scholasticStandingColor(standing.standing)}`}>{standing.standing}</Badge>
                                      )}
                                    </div>
                                  </div>
                                  {canView ? (
                                    <div className="text-right">
                                      <p className={`text-2xl font-bold ${gwaColor(gwa)}`}>{gwa.toFixed(2)}</p>
                                      {honorific ? (
                                        <Badge className={`text-xs mt-0.5 ${honorific === 'University Scholar' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 'bg-blue-100 text-blue-800 border-blue-300'} border`}>
                                          {honorific}
                                        </Badge>
                                      ) : (
                                        <p className="text-xs text-muted-foreground">
                                          {term.semester === 'Mid-Term' ? (
                                            gwa <= 1.5 ? 'Excellent' : gwa <= 2.0 ? 'Very Good' : gwa <= 2.5 ? 'Good' : gwa <= 3.0 ? 'Satisfactory' : 'Below Average'
                                          ) : gwaLabel(gwa)}
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    <Badge variant="outline" className="text-muted-foreground">Pending</Badge>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="portal-panel">
                      <div className="portal-panel-header">
                        <TrendingUp size={14} /> Cumulative GWA
                      </div>
                      <div className="p-4 bg-background space-y-4">
                        <div className="text-center py-4 border border-border rounded-xl bg-muted/20">
                          <p className={`text-6xl font-bold ${gwaColor(overallGWA)}`}>
                            {overallGWA > 0 ? overallGWA.toFixed(2) : '—'}
                          </p>
                          <p className={`text-base font-semibold mt-2 ${gwaColor(overallGWA)}`}>
                            {overallGWA > 0 ? gwaLabel(overallGWA, isSeniorStudent) : 'Not yet available'}
                          </p>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Passed units</span>
                            <span className="font-semibold">{passedUnits}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Graded terms</span>
                            <span className="font-semibold">{perTerm.length}</span>
                          </div>
                          {totalProgramUnits > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Completion</span>
                              <span className="font-semibold">{(completionPct * 100).toFixed(1)}%</span>
                            </div>
                          )}
                        </div>
                        <div className="p-3 rounded-lg bg-muted/40 flex items-start gap-2">
                          <Info size={13} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-muted-foreground">
                            Removal grades (if submitted) are used. PE and NSTP excluded. Formula: Σ(Grade × Units) / Σ(Units)
                          </p>
                        </div>
                      </div>
                    </div>

                    {!isMidTerm && (
                      <div className="portal-panel">
                        <div className="portal-panel-header">
                          <ShieldCheck size={14} /> Honorific Scholarships
                        </div>
                        <div className="p-4 bg-background space-y-4">
                          <div className="space-y-3">
                            <div className="p-3 info-note info-note-warning">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 border text-xs">University Scholar</Badge>
                                <span className="text-xs text-muted-foreground">President's List</span>
                              </div>
                              <p className="text-xs text-amber-800">GWA of <strong>1.45 or better</strong> at end of semester.</p>
                            </div>
                            <div className="p-3 info-note info-note-info">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className="bg-blue-100 text-blue-800 border-blue-300 border text-xs">College Scholar</Badge>
                                <span className="text-xs text-muted-foreground">Dean's List</span>
                              </div>
                              <p className="text-xs text-blue-800">GWA of <strong>1.46–1.75</strong> at end of semester (not University Scholar).</p>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1.5 pt-1 border-t border-border">
                            <p className="font-semibold text-foreground">Requirements:</p>
                            <p>1. At least <strong>15 units</strong> of academic credit taken the previous semester.</p>
                            <p>2. <strong>No grade below 3.00</strong> in any subject.</p>
                            <p>3. No <strong>INC</strong> grade (must be completed by end of semester).</p>
                            <p className="italic text-muted-foreground pt-1">These scholarships do not entitle holders to tuition waivers or discounts. Effectivity is for the semester the GWA is obtained.</p>
                          </div>
                          {isSeniorStudent && (
                            <div className="pt-2 border-t border-border">
                              <p className="text-xs font-semibold text-foreground mb-2">Latin Honors (at graduation, Senior year):</p>
                              <div className="space-y-1.5">
                                {[
                                  { label: 'Summa Cum Laude', range: 'GWA ≤ 1.25', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
                                  { label: 'Magna Cum Laude', range: 'GWA ≤ 1.50', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
                                  { label: 'Cum Laude', range: 'GWA ≤ 1.75', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
                                ].map(({ label, range, color }) => (
                                  <div key={label} className="flex items-center gap-2">
                                    <Badge className={`text-xs border flex-shrink-0 ${color}`}>{label}</Badge>
                                    <span className="text-xs text-muted-foreground">{range}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════ FINANCIAL ACCOUNT ══════════════ */}
            {tab === 'financial' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">Financial Account</p>
                  <div className="relative w-full max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search" className="pl-9 h-9" value={finSearch} onChange={e => setFinSearch(e.target.value)} />
                  </div>
                </div>
                <div className="rounded-xl border border-border overflow-hidden overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead>Semester</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Bill Type</TableHead>
                        <TableHead className="text-right">Total Bill Amount</TableHead>
                        <TableHead className="text-right">Settled Amount</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {financialRows.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">No Data Available</TableCell></TableRow>
                      ) : financialRows.map(({ term, bill }) => (
                        <TableRow key={term.id}>
                          <TableCell>
                            <p className="font-medium">{term.semester === '1st' ? 'First Semester' : term.semester === '2nd' ? 'Second Semester' : term.semester}</p>
                            <p className="text-xs text-muted-foreground">A.Y. {term.academicYear}</p>
                          </TableCell>
                          <TableCell className="text-xs font-mono">{bill.reference}</TableCell>
                          <TableCell className="text-sm">{bill.billType}</TableCell>
                          <TableCell className="text-right font-medium">{fmtPHP(bill.total)}</TableCell>
                          <TableCell className="text-right">{fmtPHP(bill.settled)}</TableCell>
                          <TableCell className={`text-right font-semibold ${bill.balance > 0 ? 'text-destructive' : 'text-secondary'}`}>{fmtPHP(bill.balance)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* ══════════════ STUDENT RECORD ══════════════ */}
            {tab === 'record' && (
              <div className="space-y-6">
                <InfoCard title="Active Student Record">
                  <InfoField label="Student Number" value={me.studentNumber} />
                  <InfoField label="Classification" value={classificationLabel} />
                  <InfoField label="Degree Program" value={degreeProgram?.name ?? me.program} />
                  <InfoField label="Department/Unit" value={me.department || 'None'} />
                  <InfoField label="College" value={collegeFullName} />
                </InfoCard>

                <div>
                  <p className="text-sm font-semibold text-foreground mb-2">Inactive Student Record</p>
                  <div className="rounded-xl border border-border bg-muted/20 p-4 text-center text-sm text-muted-foreground">None</div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-foreground mb-2">Hold Notice ({heldByTerm ? 1 : 0})</p>
                  <div className="rounded-xl border border-border bg-muted/20 p-4">
                    {heldByTerm && holdDisplayTerm ? (
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
                          <div>
                            <p className="font-semibold text-foreground">Unsettled Account Balance</p>
                            <p className="text-xs text-muted-foreground">{holdDisplayTerm.name}{holdBill ? ` — Balance: ${fmtPHP(holdBill.balance)}` : ''}</p>
                          </div>
                        </div>
                        <Badge className="bg-destructive text-destructive-foreground text-xs">Negative Hold</Badge>
                      </div>
                    ) : (
                      <p className="text-center text-sm text-muted-foreground">None</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Layers className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <p>
                    <strong className="text-foreground">Positive holds</strong> are holds that serve as a <em>warning</em> on your account, but still allow you to enlist in classes during enlistment;{' '}
                    <strong className="text-foreground">Negative holds</strong> on the other hand, are holds that <em>prohibit a student from enlisting</em> until it is resolved.
                  </p>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
