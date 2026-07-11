import { useState, useMemo } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, DollarSign, Search, RefreshCw, AlertTriangle, Info, Plus, Receipt, ChevronDown, ChevronUp, Tag, Banknote, Landmark, Building2 } from 'lucide-react';
import type { EnrollmentPaymentStatus, TermFeeSchedule } from '@/lib/types';

const fmt = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });

// ── ST Code tiers ────────────────────────────────────────────────────────────
const ST_CODES = [
  { code: '33',  label: 'Partial Discount – 33%',  ratePerUnit: 1000, percent: 33  },
  { code: '60',  label: 'Partial Discount – 60%',  ratePerUnit: 600,  percent: 60  },
  { code: '80',  label: 'Partial Discount – 80%',  ratePerUnit: 300,  percent: 80  },
  { code: '100', label: 'Full Discount – 100%',    ratePerUnit: 0,    percent: 100 },
] as const;

type StCodeTier = typeof ST_CODES[number];

/**
 * Given an ST code and computed fee breakdown, returns how much tuition is
 * subsidised and whether other-fees are also covered (only for 100%).
 * Fixed effective rate: 33% → ₱1,000/u · 60% → ₱600/u · 80% → ₱300/u · 100% → ₱0.
 */
function getStCodeSubsidy(
  stCode: string | undefined,
  computed: { academicUnits: number; nstpUnits: number; tuition: number; nstpTuition: number; otherFees: number; feeSchedule: TermFeeSchedule } | null,
): { tuitionSubsidy: number; otherSubsidy: number } {
  if (!stCode || !computed) return { tuitionSubsidy: 0, otherSubsidy: 0 };
  const tier = ST_CODES.find(s => s.code === stCode);
  if (!tier) return { tuitionSubsidy: 0, otherSubsidy: 0 };

  // For each academic unit, subsidy = (base rate − effective rate) per unit
  const baseTuition = computed.tuition + computed.nstpTuition; // total tuition before any discount
  let tuitionSubsidy: number;
  if (tier.code === '100') {
    tuitionSubsidy = baseTuition; // fully waived
  } else {
    // academicUnits × (baseRatePerUnit − effectiveRatePerUnit), plus NSTP is unchanged
    const perUnitSubsidy = Math.max(0, computed.feeSchedule.tuitionPerUnit - tier.ratePerUnit);
    tuitionSubsidy = Math.min(computed.tuition, computed.academicUnits * perUnitSubsidy);
  }
  const otherSubsidy = tier.code === '100' ? computed.otherFees : 0;
  return { tuitionSubsidy, otherSubsidy };
}

function computeFees(
  studentId: string,
  termId: string,
  feeSchedule: TermFeeSchedule | undefined,
  enrollments: { studentId: string; termId: string; sectionId: string; status: string }[],
  sections: { id: string; courseId: string; sectionType?: string; parentSectionId?: string; isManualGrade?: boolean }[],
  courses: { id: string; units: number; labUnits?: number; type?: string; isPE?: boolean; isNSTP?: boolean }[],
) {
  if (!feeSchedule) return null;
  const enrolled = enrollments.filter(e => e.studentId === studentId && e.termId === termId && e.status === 'enrolled');
  let academicUnits = 0, labUnitsTotal = 0, nstpUnits = 0;
  enrolled.forEach(e => {
    const sec = sections.find(s => s.id === e.sectionId);
    const course = sec ? courses.find(c => c.id === sec.courseId) : undefined;
    if (!course || sec?.isManualGrade) return;
    if (course.isNSTP) { nstpUnits += course.units; return; }
    if (course.isPE) return;
    const isLabSec = sec?.sectionType === 'lab' || sec?.sectionType === 'recitation'
      || course.type === 'Lab' || course.type === 'Recitation';
    if (isLabSec) {
      labUnitsTotal += course.units;
    } else {
      academicUnits += course.units;
      labUnitsTotal += course.labUnits ?? 0;
    }
  });
  const tuition = academicUnits * feeSchedule.tuitionPerUnit;
  const nstpTuition = nstpUnits > 0 ? feeSchedule.nstpTuition : 0;
  const labFees = labUnitsTotal * feeSchedule.labFeePerUnit;
  const otherFees =
    feeSchedule.admissionFees + feeSchedule.entranceFees + feeSchedule.registrationFees +
    feeSchedule.libraryFees + labFees + feeSchedule.computerFees + feeSchedule.athleticFees +
    feeSchedule.culturalFees + feeSchedule.medicalDentalFees + feeSchedule.guidanceFees +
    feeSchedule.handbookFees + feeSchedule.schoolIdFees + feeSchedule.developmentFees +
    feeSchedule.edf + feeSchedule.changeOfMatriculation + feeSchedule.depositFee;
  const totalBeforeSubsidy = tuition + nstpTuition + otherFees;
  return { academicUnits, labUnitsTotal, nstpUnits, tuition, nstpTuition, labFees, otherFees, totalBeforeSubsidy, feeSchedule };
}

/** Compute the effective amount payable for a student after all subsidies / ST code. */
function calcAmountPayable(
  computed: ReturnType<typeof computeFees>,
  payment: { freeTuition?: boolean; otherFeesSubsidy?: boolean; stCode?: string; carriedOverAmount?: number } | undefined,
): number | null {
  if (!computed) return null;
  // RA 10931 (freeTuition) takes priority over ST code
  if (payment?.freeTuition) {
    const sub = computed.tuition + computed.nstpTuition + (payment.otherFeesSubsidy ? computed.otherFees : 0);
    return Math.max(0, computed.totalBeforeSubsidy - sub) + (payment?.carriedOverAmount ?? 0);
  }
  const { tuitionSubsidy, otherSubsidy } = getStCodeSubsidy(payment?.stCode, computed);
  return Math.max(0, computed.totalBeforeSubsidy - tuitionSubsidy - otherSubsidy) + (payment?.carriedOverAmount ?? 0);
}

type FilterStatus = 'all' | 'unpaid' | 'partial' | 'paid' | 'free_tuition';

export default function OCSPayments() {
  const { state, getActiveTerm, upsertEnrollmentPayment, addPaymentTransaction, deletePaymentTransactions } = useApp();
  const activeTerm = getActiveTerm();
  const me = state.currentUser!;

  // RA 10931 only covers bachelors and associate_certificate programs (NOT masters/doctorate)
  const isRA10931Eligible = (student: { program?: string }) => {
    const prog = (state.degreePrograms ?? []).find(p => p.name === student.program || p.id === student.program);
    const dt = prog?.degreeType;
    return !dt || dt === 'bachelors' || dt === 'associate_certificate';
  };

  const [selectedTermId, setSelectedTermId] = useState(activeTerm?.id ?? state.terms[0]?.id ?? '');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());

  // Payment dialog
  const [payDialog, setPayDialog] = useState<{
    studentId: string; name: string;
    computed: ReturnType<typeof computeFees>;
    isAdditional: boolean;
    totalPayable: number;
    stCode?: string;
    tuitionSubsidy: number;
  } | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payOrNumber, setPayOrNumber] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payMethod, setPayMethod] = useState<'cash' | 'online_banking' | 'bank_deposit'>('cash');
  const [payRefCode, setPayRefCode] = useState('');

  // ST Code dialog
  const [stCodeDialog, setStCodeDialog] = useState<{
    studentId: string; name: string; currentCode?: string;
  } | null>(null);
  const [selectedStCode, setSelectedStCode] = useState('');

  const selectedTerm = state.terms.find(t => t.id === selectedTermId);
  const feeSchedule = selectedTerm?.feeSchedule;

  const ocsCollegeId = useMemo(() => {
    if (!me) return '';
    return state.colleges.find(c => c.name === me.college || c.id === me.college || c.abbreviation === me.college)?.id ?? me.college ?? '';
  }, [state.colleges, me]);

  const myStudents = useMemo(() => {
    return state.users.filter(u =>
      u.role === 'student' && (
        u.college === ocsCollegeId ||
        state.colleges.find(c => c.id === ocsCollegeId)?.name === u.college
      )
    );
  }, [state.users, state.colleges, ocsCollegeId]);

  const finalizedStudentIds = useMemo(() => {
    return new Set(state.finalizedEnlistments.filter(fe => fe.termId === selectedTermId).map(fe => fe.studentId));
  }, [state.finalizedEnlistments, selectedTermId]);

  const getEffectiveStatus = (studentId: string): FilterStatus => {
    const payment = state.enrollmentPayments.find(p => p.studentId === studentId && p.termId === selectedTermId);
    if (!payment) {
      // No record yet — infer from transaction history
      const txs = (state.paymentTransactions ?? []).filter(t => t.studentId === studentId && t.termId === selectedTermId);
      return txs.length > 0 ? 'partial' : 'unpaid';
    }
    if (payment.status !== 'unpaid') return payment.status as FilterStatus;
    // 'unpaid' status: distinguish partial (amountPaid > 0) from fully unpaid/reverted (amountPaid === 0)
    return payment.amountPaid > 0 ? 'partial' : 'unpaid';
  };

  const students = useMemo(() => {
    const q = search.trim().toLowerCase();
    return myStudents
      .filter(s => finalizedStudentIds.has(s.id))
      .filter(s => {
        if (!q) return true;
        return s.name.toLowerCase().includes(q) || (s.studentNumber ?? '').toLowerCase().includes(q) || (s.program ?? '').toLowerCase().includes(q);
      })
      .filter(s => {
        if (filterStatus === 'all') return true;
        return getEffectiveStatus(s.id) === filterStatus;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myStudents, finalizedStudentIds, search, filterStatus, state.enrollmentPayments, state.paymentTransactions, selectedTermId]);

  const counts = useMemo(() => {
    const all = myStudents.filter(s => finalizedStudentIds.has(s.id));
    return {
      total: all.length,
      unpaid: all.filter(s => getEffectiveStatus(s.id) === 'unpaid').length,
      partial: all.filter(s => getEffectiveStatus(s.id) === 'partial').length,
      paid: all.filter(s => getEffectiveStatus(s.id) === 'paid').length,
      freeTuition: all.filter(s => getEffectiveStatus(s.id) === 'free_tuition').length,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myStudents, finalizedStudentIds, state.enrollmentPayments, state.paymentTransactions, selectedTermId]);

  const generateNextOrNumber = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleMarkRA10931 = async (studentId: string) => {
    setProcessingId(studentId);
    try {
      const existing = state.enrollmentPayments.find(p => p.studentId === studentId && p.termId === selectedTermId);
      await upsertEnrollmentPayment({
        studentId, termId: selectedTermId,
        status: 'free_tuition', freeTuition: true, otherFeesSubsidy: true,
        stCode: existing?.stCode,
        amountPaid: 0,
        processedBy: me.id, processedAt: new Date().toISOString(),
        carriedOverAmount: existing?.carriedOverAmount ?? 0,
      });
      toast.success('Marked as RA 10931 — All fees waived.');
    } catch { toast.error('Failed to update. Please try again.'); }
    finally { setProcessingId(null); }
  };

  const handleMarkUnpaid = async (studentId: string) => {
    setProcessingId(studentId);
    try {
      const existing = state.enrollmentPayments.find(p => p.studentId === studentId && p.termId === selectedTermId);
      await Promise.all([
        upsertEnrollmentPayment({
          studentId, termId: selectedTermId,
          status: 'unpaid', freeTuition: false, otherFeesSubsidy: false,
          stCode: existing?.stCode,
          amountPaid: 0,
          processedBy: me.id, processedAt: new Date().toISOString(),
          carriedOverAmount: existing?.carriedOverAmount ?? 0,
        }),
        deletePaymentTransactions(studentId, selectedTermId),
      ]);
      toast.success('Reverted to unpaid. Receipts cleared.');
    } catch { toast.error('Failed. Please try again.'); }
    finally { setProcessingId(null); }
  };

  const handleOpenPayDialog = (studentId: string, name: string, isAdditional = false) => {
    const computed = computeFees(studentId, selectedTermId, feeSchedule, state.enrollments, state.sections, state.courses);
    const existing = state.enrollmentPayments.find(p => p.studentId === studentId && p.termId === selectedTermId);
    const alreadyPaid = existing?.amountPaid ?? 0;
    const totalPayable = calcAmountPayable(computed, existing) ?? 0;
    const remaining = Math.max(0, totalPayable - alreadyPaid);
    const { tuitionSubsidy } = getStCodeSubsidy(existing?.stCode, computed);
    setPayAmount(isAdditional ? String(remaining) : String(totalPayable));
    setPayOrNumber(generateNextOrNumber());
    setPayNotes('');
    setPayMethod('cash');
    setPayRefCode('');
    setPayDialog({ studentId, name, computed, isAdditional, totalPayable, stCode: existing?.stCode, tuitionSubsidy });
  };

  const handleConfirmPaid = async () => {
    if (!payDialog) return;
    const amount = parseFloat(payAmount) || 0;
    if (amount <= 0) { toast.error('Please enter a valid amount greater than 0.'); return; }
    if (!payOrNumber.trim()) { toast.error('OR Number is required.'); return; }
    if (payMethod !== 'cash' && !payRefCode.trim()) { toast.error('Reference/Transaction code is required for online/bank payments.'); return; }
    setProcessingId(payDialog.studentId);
    try {
      const tx = await addPaymentTransaction({
        studentId: payDialog.studentId,
        termId: selectedTermId,
        amount,
        notes: payNotes || undefined,
        processedBy: me.id,
        orOverride: payOrNumber.trim(),
        paymentMethod: payMethod,
        referenceCode: payMethod !== 'cash' ? payRefCode.trim() : undefined,
      });

      const existingRecord = state.enrollmentPayments.find(
        p => p.studentId === payDialog.studentId && p.termId === selectedTermId
      );
      // Use the DB-persisted amountPaid as the source of truth for accumulation
      const alreadyPaid = existingRecord?.amountPaid ?? 0;
      const totalPaid = alreadyPaid + amount;
      const totalPayable = payDialog.totalPayable;
      const status: EnrollmentPaymentStatus = totalPayable > 0 && totalPaid >= totalPayable ? 'paid' : 'unpaid';

      await upsertEnrollmentPayment({
        studentId: payDialog.studentId,
        termId: selectedTermId,
        status,
        freeTuition: existingRecord?.freeTuition ?? false,
        otherFeesSubsidy: existingRecord?.otherFeesSubsidy ?? false,
        stCode: existingRecord?.stCode,
        amountPaid: totalPaid,
        orNumber: tx.orNumber,
        notes: payNotes || undefined,
        processedBy: me.id,
        processedAt: new Date().toISOString(),
        carriedOverAmount: existingRecord?.carriedOverAmount ?? 0,
      });

      const isPartial = status === 'unpaid' && totalPaid > 0;
      toast.success(
        isPartial
          ? `Partial payment recorded — OR: ${tx.orNumber} · ₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} (₱${(totalPayable - totalPaid).toLocaleString('en-PH', { minimumFractionDigits: 2 })} remaining)`
          : `Payment confirmed — OR: ${tx.orNumber}`
      );
      setPayDialog(null);
    } catch (e) {
      console.error(e);
      toast.error('Failed. Please try again.');
    }
    finally { setProcessingId(null); }
  };

  const handleOpenStCodeDialog = (studentId: string, name: string) => {
    const existing = state.enrollmentPayments.find(p => p.studentId === studentId && p.termId === selectedTermId);
    setSelectedStCode(existing?.stCode ?? '');
    setStCodeDialog({ studentId, name, currentCode: existing?.stCode });
  };

  const handleAssignStCode = async () => {
    if (!stCodeDialog) return;
    const { studentId } = stCodeDialog;
    setProcessingId(studentId);
    try {
      const existing = state.enrollmentPayments.find(p => p.studentId === studentId && p.termId === selectedTermId);
      const code = selectedStCode || undefined;
      const isFull = code === '100';

      await upsertEnrollmentPayment({
        studentId, termId: selectedTermId,
        status: isFull ? 'free_tuition' : (existing?.status === 'free_tuition' ? 'unpaid' : (existing?.status ?? 'unpaid')),
        freeTuition: isFull ? true : (existing?.freeTuition && !code ? true : false),
        otherFeesSubsidy: isFull ? true : (existing?.otherFeesSubsidy && !code ? true : false),
        stCode: code,
        amountPaid: isFull ? 0 : (existing?.amountPaid ?? 0),
        orNumber: existing?.orNumber,
        notes: existing?.notes,
        processedBy: me.id,
        processedAt: new Date().toISOString(),
        carriedOverAmount: existing?.carriedOverAmount ?? 0,
      });

      const tier = ST_CODES.find(s => s.code === code);
      toast.success(
        code
          ? `ST Code assigned: ${tier?.label ?? code}`
          : 'ST Code cleared.'
      );
      setStCodeDialog(null);
    } catch { toast.error('Failed. Please try again.'); }
    finally { setProcessingId(null); }
  };

  // ── Sub-components ─────────────────────────────────────────────────────────

  const StatusBadge = ({ studentId }: { studentId: string }) => {
    const effective = getEffectiveStatus(studentId);
    const p = state.enrollmentPayments.find(x => x.studentId === studentId && x.termId === selectedTermId);
    if (effective === 'free_tuition') {
      return p?.stCode === '100'
        ? <Badge className="text-[10px] bg-purple-100 text-purple-700 border-purple-300">ST-100 — Full Scholarship</Badge>
        : <Badge className="text-[10px] bg-blue-100 text-blue-700 border-blue-300">RA 10931 — All Fees Waived</Badge>;
    }
    if (effective === 'paid') return <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-300">Paid — {fmt(p?.amountPaid ?? 0)}</Badge>;
    if (effective === 'partial') return <Badge className="text-[10px] bg-amber-100 text-amber-700 border-amber-300">Partial — {fmt(p?.amountPaid ?? 0)} paid</Badge>;
    return <Badge className="text-[10px] bg-red-100 text-red-700 border-red-300">Unpaid</Badge>;
  };

  const StCodeBadge = ({ stCode }: { stCode?: string }) => {
    if (!stCode) return null;
    const tier = ST_CODES.find(s => s.code === stCode);
    return (
      <Badge className="text-[10px] bg-purple-100 text-purple-700 border-purple-300 gap-1">
        <Tag className="w-2.5 h-2.5" />
        ST-{stCode}{tier ? ` (${tier.percent}%)` : ''}
      </Badge>
    );
  };

  const toggleExpand = (id: string) => {
    setExpandedStudents(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <PortalLayout>
      <div className="space-y-5">

        {/* Header */}
        <div className="portal-panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-bold text-lg text-foreground flex items-center gap-2"><DollarSign className="w-5 h-5 text-primary" /> Enrollment Payments</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Track and record student enrollment fee payments. OR numbers are auto-generated (12-character alphanumeric).</p>
          </div>
          <SearchableSelect
            value={selectedTermId}
            onValueChange={setSelectedTermId}
            triggerClassName="w-48 h-9"
            placeholder="Select term..."
            options={state.terms.map(t => ({ value: t.id, label: t.name }))}
          />
        </div>

        {!feeSchedule && (
          <div className="banner banner-warning flex items-start gap-2">
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
            <div>
              <span className="banner-title">Fee Schedule Not Configured</span>
              <span className="banner-desc"> Go to Admin → Fee Schedule to configure fees for this term.</span>
            </div>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Total', value: counts.total, color: 'bg-primary/10 text-primary' },
            { label: 'Unpaid', value: counts.unpaid, color: 'bg-red-100 text-red-700' },
            { label: 'Partial', value: counts.partial, color: 'bg-amber-100 text-amber-700' },
            { label: 'Paid', value: counts.paid, color: 'bg-emerald-100 text-emerald-700' },
            { label: 'Free / Scholar', value: counts.freeTuition, color: 'bg-blue-100 text-blue-700' },
          ].map(({ label, value, color }) => (
            <div key={label} className="portal-panel p-4 text-center">
              <div className={`text-2xl font-bold ${color} rounded-xl px-2 py-1 inline-block`}>{value}</div>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by name, student no., program..." className="pl-8 h-9 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <SearchableSelect
            value={filterStatus}
            onValueChange={v => setFilterStatus(v as FilterStatus)}
            triggerClassName="w-44 h-9"
            placeholder="Filter status..."
            options={[
              { value: 'all', label: `All (${counts.total})` },
              { value: 'unpaid', label: `Unpaid (${counts.unpaid})` },
              { value: 'partial', label: `Partial (${counts.partial})` },
              { value: 'paid', label: `Paid (${counts.paid})` },
              { value: 'free_tuition', label: `Free / Scholar (${counts.freeTuition})` },
            ]}
          />
        </div>

        {/* Student list */}
        <div className="portal-panel divide-y divide-border">
          {students.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No students found.</p>
          ) : students.map(student => {
            const payment = state.enrollmentPayments.find(p => p.studentId === student.id && p.termId === selectedTermId);
            const isProcessing = processingId === student.id;
            const computed = computeFees(student.id, selectedTermId, feeSchedule, state.enrollments, state.sections, state.courses);
            const amountPayable = calcAmountPayable(computed, payment);
            const txs = (state.paymentTransactions ?? []).filter(t => t.studentId === student.id && t.termId === selectedTermId);
            const effective = getEffectiveStatus(student.id);
            const isExpanded = expandedStudents.has(student.id);
            const remaining = amountPayable !== null ? Math.max(0, amountPayable - (payment?.amountPaid ?? 0)) : null;
            const { tuitionSubsidy } = getStCodeSubsidy(payment?.stCode, computed);

            return (
              <div key={student.id}>
                <div className="p-4 flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-foreground">{student.name}</span>
                      <StatusBadge studentId={student.id} />
                      <StCodeBadge stCode={payment?.stCode} />
                      {txs.length > 0 && (
                        <button
                          onClick={() => toggleExpand(student.id)}
                          className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Receipt className="w-3 h-3" />
                          {txs.length} receipt{txs.length > 1 ? 's' : ''}
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {student.studentNumber ?? '—'} · {student.program ?? '—'}
                    </p>
                    {computed && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {computed.academicUnits} acad. units
                        {payment?.stCode && tuitionSubsidy > 0
                          ? <> · Discounted: <strong className="text-purple-700">{fmt(amountPayable ?? 0)}</strong> <span className="text-[10px]">(–{fmt(tuitionSubsidy)} subsidy)</span></>
                          : <> · Total: {fmt(computed.totalBeforeSubsidy)}</>
                        }
                        {!!payment?.carriedOverAmount && payment.carriedOverAmount > 0 && (
                          <> · <span className="text-amber-700 font-medium">+{fmt(payment.carriedOverAmount)} carried over</span></>
                        )}
                        {effective === 'partial' && remaining !== null && remaining > 0 && (
                          <> · <strong className="text-amber-700">Remaining: {fmt(remaining)}</strong></>
                        )}
                        {effective === 'paid' && payment?.orNumber && (
                          <> · <span className="font-medium">OR: {payment.orNumber}</span></>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap items-start">
                    {(effective === 'unpaid' || effective === 'partial') && (
                      <>
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-8 text-xs"
                          disabled={isProcessing} onClick={() => handleOpenPayDialog(student.id, student.name, effective === 'partial')}>
                          {isProcessing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                          {effective === 'partial' ? 'Add Payment' : 'Mark Paid'}
                        </Button>
                        {isRA10931Eligible(student) && (
                          <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50 gap-1.5 h-8 text-xs"
                            disabled={isProcessing} onClick={() => handleMarkRA10931(student.id)}>
                            RA 10931
                          </Button>
                        )}                      </>
                    )}
                    {effective === 'paid' && (
                      <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs"
                        disabled={isProcessing} onClick={() => handleOpenPayDialog(student.id, student.name, true)}>
                        <Plus className="w-3 h-3" /> Add Payment
                      </Button>
                    )}
                    <Button size="sm" variant="outline"
                      className="border-purple-300 text-purple-700 hover:bg-purple-50 gap-1.5 h-8 text-xs"
                      disabled={isProcessing} onClick={() => handleOpenStCodeDialog(student.id, student.name)}>
                      <Tag className="w-3 h-3" /> ST Code
                    </Button>
                    {(effective === 'paid' || effective === 'partial' || effective === 'free_tuition') && (
                      <Button size="sm" variant="ghost" className="text-muted-foreground h-8 text-xs gap-1.5"
                        disabled={isProcessing} onClick={() => handleMarkUnpaid(student.id)}>
                        <XCircle className="w-3 h-3" /> Revert
                      </Button>
                    )}
                  </div>
                </div>

                {/* Transaction history (expanded) */}
                {isExpanded && txs.length > 0 && (
                  <div className="px-4 pb-3 border-t border-dashed border-border/50 bg-muted/20">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pt-2 pb-1.5">Payment Receipts</p>
                    <div className="space-y-1">
                      {txs.map((tx, i) => (
                        <div key={tx.id} className="flex items-center gap-3 text-xs flex-wrap">
                          <span className="font-mono font-semibold text-primary bg-primary/8 px-2 py-0.5 rounded text-[11px]">OR: {tx.orNumber}</span>
                          <span className="font-semibold">{fmt(tx.amount)}</span>
                          {tx.paymentMethod && tx.paymentMethod !== 'cash' && (
                            <Badge className="text-[10px] bg-blue-100 text-blue-700 border-blue-300">
                              {tx.paymentMethod === 'online_banking' ? 'Online Banking' : 'Over-the-Counter'}
                              {tx.referenceCode ? ` — ${tx.referenceCode}` : ''}
                            </Badge>
                          )}
                          <span className="text-muted-foreground">{fmtDate(tx.processedAt)}</span>
                          {tx.notes && <span className="text-muted-foreground italic">"{tx.notes}"</span>}
                          <span className="text-muted-foreground text-[10px]">#{i + 1}</span>
                        </div>
                      ))}
                    </div>
                    {txs.length > 1 && (
                      <p className="text-xs font-semibold mt-2 pt-1.5 border-t border-border/40">
                        Total Paid: {fmt(txs.reduce((s, t) => s + t.amount, 0))}
                        {amountPayable !== null && <span className="text-muted-foreground font-normal"> of {fmt(amountPayable)}</span>}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Payment Dialog ── */}
        <Dialog open={!!payDialog} onOpenChange={open => { if (!open) setPayDialog(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                {payDialog?.isAdditional ? 'Add Payment' : 'Record Payment'}
              </DialogTitle>
            </DialogHeader>
            {payDialog && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-foreground">{payDialog.name}</p>
                  {payDialog.stCode && (
                    <Badge className="text-[10px] bg-purple-100 text-purple-700 border-purple-300 gap-1">
                      <Tag className="w-2.5 h-2.5" />
                      ST-{payDialog.stCode} — {ST_CODES.find(s => s.code === payDialog.stCode)?.label}
                    </Badge>
                  )}
                </div>

                {/* Fee summary */}
                {payDialog.computed && (
                  <div className="text-xs bg-muted/50 rounded-lg p-3 space-y-1">
                    <div className="flex justify-between">
                      <span>Tuition ({payDialog.computed.academicUnits} units × {fmt(payDialog.computed.feeSchedule.tuitionPerUnit)})</span>
                      <span>{fmt(payDialog.computed.tuition)}</span>
                    </div>
                    {payDialog.computed.nstpUnits > 0 && (
                      <div className="flex justify-between"><span>NSTP Tuition</span><span>{fmt(payDialog.computed.nstpTuition)}</span></div>
                    )}
                    <div className="flex justify-between"><span>Other School Fees</span><span>{fmt(payDialog.computed.otherFees)}</span></div>
                    {payDialog.stCode && payDialog.tuitionSubsidy > 0 && (() => {
                      const tier = ST_CODES.find(s => s.code === payDialog.stCode) as StCodeTier | undefined;
                      return (
                        <div className="flex justify-between text-purple-700 border-t pt-1 mt-1">
                          <span>ST-{payDialog.stCode} Discount ({tier?.label}) — {fmt(tier?.ratePerUnit ?? 0)}/unit</span>
                          <span>({fmt(payDialog.tuitionSubsidy)})</span>
                        </div>
                      );
                    })()}
                    {(() => {
                      const existing = state.enrollmentPayments.find(p => p.studentId === payDialog.studentId && p.termId === selectedTermId);
                      const carried = existing?.carriedOverAmount ?? 0;
                      if (carried <= 0) return null;
                      return (
                        <div className="flex justify-between text-amber-700 border-t pt-1 mt-1">
                          <span>Carried Over Balance (Student Loan)</span>
                          <span>+{fmt(carried)}</span>
                        </div>
                      );
                    })()}
                    <div className="flex justify-between font-bold border-t pt-1 mt-1"><span>Total Payable (after subsidies)</span><span>{fmt(payDialog.totalPayable)}</span></div>
                    {payDialog.isAdditional && (() => {
                      const existing = state.enrollmentPayments.find(p => p.studentId === payDialog.studentId && p.termId === selectedTermId);
                      const paid = existing?.amountPaid ?? 0;
                      if (paid > 0) return (
                        <>
                          <div className="flex justify-between text-emerald-700"><span>Previously Paid</span><span>{fmt(paid)}</span></div>
                          <div className="flex justify-between font-bold text-amber-700"><span>Remaining Balance</span><span>{fmt(Math.max(0, payDialog.totalPayable - paid))}</span></div>
                        </>
                      );
                      return null;
                    })()}
                  </div>
                )}

                {/* Payment Method */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Payment Method</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { value: 'cash', label: 'Cash', icon: Banknote },
                      { value: 'online_banking', label: 'Online Banking', icon: Landmark },
                      { value: 'bank_deposit', label: 'Over-the-Counter', icon: Building2 },
                    ] as const).map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setPayMethod(value)}
                        className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-[11px] font-medium transition-colors ${
                          payMethod === value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:bg-muted/50'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* OR Number */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-primary" /> O.R. Number
                    <span className="text-[10px] font-normal text-muted-foreground">(auto-generated)</span>
                  </Label>
                  <Input
                    value={payOrNumber}
                    readOnly
                    placeholder="e.g. 2026-000001"
                    className="h-9 text-sm font-mono bg-muted cursor-not-allowed select-all"
                  />
                </div>

                {/* Reference / Transaction Code — for online/bank payments only, record purposes */}
                {payMethod !== 'cash' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5 text-primary" /> Reference / Transaction Code
                      <span className="text-[10px] font-normal text-muted-foreground">(for record purposes)</span>
                    </Label>
                    <Input
                      value={payRefCode}
                      onChange={e => setPayRefCode(e.target.value)}
                      placeholder={payMethod === 'online_banking' ? 'e.g. Online banking reference no.' : 'e.g. Bank deposit slip no.'}
                      className="h-9 text-sm font-mono"
                    />
                  </div>
                )}

                {/* Amount */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Amount Paid (₱)</Label>
                  <Input
                    type="number" min={0.01} step="0.01"
                    value={payAmount} onChange={e => setPayAmount(e.target.value)}
                    className="h-9 text-sm"
                  />
                  {parseFloat(payAmount) > 0 && parseFloat(payAmount) < payDialog.totalPayable && (() => {
                    const existing = state.enrollmentPayments.find(p => p.studentId === payDialog.studentId && p.termId === selectedTermId);
                    const alreadyPaid = existing?.amountPaid ?? 0;
                    const newTotal = alreadyPaid + (parseFloat(payAmount) || 0);
                    if (newTotal < payDialog.totalPayable) return (
                      <p className="text-[11px] text-amber-600 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> This is a partial payment. Student will remain on hold until fully paid.
                      </p>
                    );
                    return null;
                  })()}
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Notes (optional)</Label>
                  <Input value={payNotes} onChange={e => setPayNotes(e.target.value)} placeholder="Remarks..." className="h-9 text-sm" />
                </div>

                <div className="flex gap-2 pt-1">
                  <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5" onClick={handleConfirmPaid} disabled={!!processingId}>
                    {processingId ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Confirm Payment
                  </Button>
                  <Button variant="ghost" className="flex-1" onClick={() => setPayDialog(null)}>Cancel</Button>
                </div>

                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Info size={12} className="flex-shrink-0 mt-0.5" />
                  For RA 10931 students (all fees waived), use the "RA 10931" button instead.
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ── ST Code Dialog ── */}
        <Dialog open={!!stCodeDialog} onOpenChange={open => { if (!open) setStCodeDialog(null); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-purple-600" />
                Assign ST Code
              </DialogTitle>
            </DialogHeader>
            {stCodeDialog && (
              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">{stCodeDialog.name}</p>
                <p className="text-xs text-muted-foreground">
                  ST Codes apply a tuition discount using a fixed subsidized rate per unit. Other school fees are not affected (except Full Discount which also waives other fees).
                </p>

                {/* Tier selection */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Scholarship / Discount Tier</Label>
                  <div className="space-y-2">
                    {/* None option */}
                    <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedStCode === '' ? 'border-border bg-muted/60' : 'border-border/50 hover:bg-muted/30'}`}>
                      <input type="radio" name="stCode" value="" checked={selectedStCode === ''} onChange={() => setSelectedStCode('')} className="accent-purple-600" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-foreground">None / Clear</div>
                        <div className="text-[11px] text-muted-foreground">No scholarship discount applied</div>
                      </div>
                    </label>
                    {ST_CODES.map(tier => (
                      <label
                        key={tier.code}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedStCode === tier.code
                            ? 'border-purple-400 bg-purple-50'
                            : 'border-border/50 hover:bg-muted/30'
                        }`}
                      >
                        <input
                          type="radio" name="stCode" value={tier.code}
                          checked={selectedStCode === tier.code}
                          onChange={() => setSelectedStCode(tier.code)}
                          className="accent-purple-600"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">{tier.label}</span>
                            <Badge className="text-[10px] bg-purple-100 text-purple-700 border-purple-200">ST-{tier.code}</Badge>
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {tier.code === '100'
                              ? 'Free tuition + all other fees waived'
                              : `Effective rate: ₱${tier.ratePerUnit.toLocaleString()}/unit (tuition only)`}
                          </div>
                        </div>
                        <span className="text-sm font-bold text-purple-700">{tier.percent}%</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white gap-1.5"
                    onClick={handleAssignStCode}
                    disabled={!!processingId}
                  >
                    {processingId ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Tag className="w-3.5 h-3.5" />}
                    {selectedStCode === '' ? 'Clear ST Code' : `Assign ST-${selectedStCode}`}
                  </Button>
                  <Button variant="ghost" className="flex-1" onClick={() => setStCodeDialog(null)}>Cancel</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </PortalLayout>
  );
}
