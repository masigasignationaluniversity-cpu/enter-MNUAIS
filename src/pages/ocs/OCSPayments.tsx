import { useState, useMemo } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, DollarSign, Search, RefreshCw, AlertTriangle, Info } from 'lucide-react';
import type { EnrollmentPaymentStatus, TermFeeSchedule } from '@/lib/types';

const fmt = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function computeFees(
  studentId: string,
  termId: string,
  feeSchedule: TermFeeSchedule | undefined,
  enrollments: { studentId: string; termId: string; sectionId: string; status: string }[],
  sections: { id: string; courseId: string }[],
  courses: { id: string; units: number; labUnits?: number; isPE?: boolean; isNSTP?: boolean }[],
) {
  if (!feeSchedule) return null;

  const enrolled = enrollments.filter(e => e.studentId === studentId && e.termId === termId && e.status === 'enrolled');
  let academicUnits = 0;
  let labUnitsTotal = 0;
  let nstpUnits = 0;

  enrolled.forEach(e => {
    const sec = sections.find(s => s.id === e.sectionId);
    const course = sec ? courses.find(c => c.id === sec.courseId) : undefined;
    if (!course) return;
    if (course.isNSTP) { nstpUnits += course.units; return; }
    if (course.isPE) return;
    academicUnits += course.units;
    labUnitsTotal += course.labUnits ?? 0;
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

type FilterStatus = 'all' | 'unpaid' | 'paid' | 'free_tuition';

export default function OCSPayments() {
  const { state, getActiveTerm, upsertEnrollmentPayment } = useApp();
  const activeTerm = getActiveTerm();
  const me = state.currentUser!;

  const [selectedTermId, setSelectedTermId] = useState(activeTerm?.id ?? state.terms[0]?.id ?? '');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [payDialog, setPayDialog] = useState<{ studentId: string; name: string; computed: ReturnType<typeof computeFees> } | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payNotes, setPayNotes] = useState('');

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

  // All finalized students for the selected term
  const finalizedStudentIds = useMemo(() => {
    return new Set(
      state.finalizedEnlistments.filter(fe => fe.termId === selectedTermId).map(fe => fe.studentId)
    );
  }, [state.finalizedEnlistments, selectedTermId]);

  const students = useMemo(() => {
    const q = search.trim().toLowerCase();
    return myStudents
      .filter(s => finalizedStudentIds.has(s.id))
      .filter(s => {
        if (!q) return true;
        return s.name.toLowerCase().includes(q) || (s.studentNumber ?? '').toLowerCase().includes(q) || (s.program ?? '').toLowerCase().includes(q);
      })
      .filter(s => {
        const payment = state.enrollmentPayments.find(p => p.studentId === s.id && p.termId === selectedTermId);
        const status: EnrollmentPaymentStatus = payment?.status ?? 'unpaid';
        if (filterStatus === 'all') return true;
        return status === filterStatus;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [myStudents, finalizedStudentIds, search, filterStatus, state.enrollmentPayments, selectedTermId]);

  const counts = useMemo(() => {
    const all = myStudents.filter(s => finalizedStudentIds.has(s.id));
    return {
      total: all.length,
      unpaid: all.filter(s => {
        const p = state.enrollmentPayments.find(x => x.studentId === s.id && x.termId === selectedTermId);
        return !p || p.status === 'unpaid';
      }).length,
      paid: all.filter(s => state.enrollmentPayments.find(x => x.studentId === s.id && x.termId === selectedTermId && x.status === 'paid')).length,
      freeTuition: all.filter(s => state.enrollmentPayments.find(x => x.studentId === s.id && x.termId === selectedTermId && x.status === 'free_tuition')).length,
    };
  }, [myStudents, finalizedStudentIds, state.enrollmentPayments, selectedTermId]);

  const handleMarkFreeTuition = async (studentId: string) => {
    setProcessingId(studentId);
    try {
      await upsertEnrollmentPayment({
        studentId, termId: selectedTermId,
        status: 'free_tuition', freeTuition: true, otherFeesSubsidy: false, amountPaid: 0,
        processedBy: me.id, processedAt: new Date().toISOString(),
      });
      toast.success('Marked as Free Tuition (RA 10931).');
    } catch { toast.error('Failed to update. Please try again.'); }
    finally { setProcessingId(null); }
  };

  const handleMarkFreeTuitionWithOtherFees = async (studentId: string) => {
    setProcessingId(studentId);
    try {
      await upsertEnrollmentPayment({
        studentId, termId: selectedTermId,
        status: 'free_tuition', freeTuition: true, otherFeesSubsidy: true, amountPaid: 0,
        processedBy: me.id, processedAt: new Date().toISOString(),
      });
      toast.success('Marked as Free Tuition + Other Fees Subsidy (RA 10931).');
    } catch { toast.error('Failed to update. Please try again.'); }
    finally { setProcessingId(null); }
  };

  const handleMarkUnpaid = async (studentId: string) => {
    setProcessingId(studentId);
    try {
      await upsertEnrollmentPayment({
        studentId, termId: selectedTermId,
        status: 'unpaid', freeTuition: false, otherFeesSubsidy: false, amountPaid: 0,
        processedBy: me.id, processedAt: new Date().toISOString(),
      });
      toast.success('Marked as unpaid.');
    } catch { toast.error('Failed. Please try again.'); }
    finally { setProcessingId(null); }
  };

  const handleOpenPayDialog = (studentId: string, name: string) => {
    const computed = computeFees(studentId, selectedTermId, feeSchedule, state.enrollments, state.sections, state.courses);
    const existing = state.enrollmentPayments.find(p => p.studentId === studentId && p.termId === selectedTermId);
    setPayAmount(existing?.amountPaid ? String(existing.amountPaid) : (computed ? String(computed.totalBeforeSubsidy) : '0'));
    setPayNotes(existing?.notes ?? '');
    setPayDialog({ studentId, name, computed });
  };

  const handleConfirmPaid = async () => {
    if (!payDialog) return;
    setProcessingId(payDialog.studentId);
    try {
      await upsertEnrollmentPayment({
        studentId: payDialog.studentId, termId: selectedTermId,
        status: 'paid', freeTuition: false, otherFeesSubsidy: false,
        amountPaid: parseFloat(payAmount) || 0,
        notes: payNotes || undefined,
        processedBy: me.id, processedAt: new Date().toISOString(),
      });
      toast.success('Payment recorded.');
      setPayDialog(null);
    } catch { toast.error('Failed. Please try again.'); }
    finally { setProcessingId(null); }
  };

  const StatusBadge = ({ studentId }: { studentId: string }) => {
    const p = state.enrollmentPayments.find(x => x.studentId === studentId && x.termId === selectedTermId);
    if (!p || p.status === 'unpaid') return <Badge className="text-[10px] bg-red-100 text-red-700 border-red-300">Unpaid</Badge>;
    if (p.status === 'free_tuition') return (
      <Badge className="text-[10px] bg-blue-100 text-blue-700 border-blue-300">
        {p.otherFeesSubsidy ? 'Free Tuition + Other Fees' : 'Free Tuition (RA 10931)'}
      </Badge>
    );
    return <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-300">Paid — {fmt(p.amountPaid)}</Badge>;
  };

  return (
    <PortalLayout>
      <div className="space-y-5">

        {/* Header */}
        <div className="portal-panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-bold text-lg text-foreground flex items-center gap-2"><DollarSign className="w-5 h-5 text-primary" /> Enrollment Payments</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Track and record student enrollment fee payments. RA 10931 — Universal Access to Quality Tertiary Education Act.</p>
          </div>
          <Select value={selectedTermId} onValueChange={setSelectedTermId}>
            <SelectTrigger className="w-48 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{state.terms.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {/* No fee schedule warning */}
        {!feeSchedule && (
          <div className="banner banner-warning flex items-start gap-2">
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
            <div>
              <span className="banner-title">Fee Schedule Not Configured</span>
              <span className="banner-desc">Admin has not set the fee schedule for this term. Go to Admin → Term Control → Fee Schedule to configure fees.</span>
            </div>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Finalized', value: counts.total, color: 'bg-primary/10 text-primary' },
            { label: 'Unpaid', value: counts.unpaid, color: 'bg-red-100 text-red-700' },
            { label: 'Paid', value: counts.paid, color: 'bg-emerald-100 text-emerald-700' },
            { label: 'Free Tuition', value: counts.freeTuition, color: 'bg-blue-100 text-blue-700' },
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
          <Select value={filterStatus} onValueChange={v => setFilterStatus(v as FilterStatus)}>
            <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({counts.total})</SelectItem>
              <SelectItem value="unpaid">Unpaid ({counts.unpaid})</SelectItem>
              <SelectItem value="paid">Paid ({counts.paid})</SelectItem>
              <SelectItem value="free_tuition">Free Tuition ({counts.freeTuition})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Student list */}
        <div className="portal-panel divide-y divide-border">
          {students.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No students found.</p>
          ) : students.map(student => {
            const payment = state.enrollmentPayments.find(p => p.studentId === student.id && p.termId === selectedTermId);
            const isProcessing = processingId === student.id;
            const computed = computeFees(student.id, selectedTermId, feeSchedule, state.enrollments, state.sections, state.courses);
            const amountPayable = computed
              ? computed.totalBeforeSubsidy - (payment?.freeTuition ? computed.tuition : 0) - (payment?.otherFeesSubsidy ? computed.otherFees : 0)
              : null;

            return (
              <div key={student.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-foreground">{student.name}</span>
                    <StatusBadge studentId={student.id} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{student.studentNumber ?? '—'} · {student.program ?? '—'}</p>
                  {computed && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {computed.academicUnits} acad. units · Total: {fmt(computed.totalBeforeSubsidy)}
                      {amountPayable !== null && amountPayable !== computed.totalBeforeSubsidy && (
                        <> · <strong>Amount Payable: {fmt(Math.max(0, amountPayable))}</strong></>
                      )}
                    </p>
                  )}
                  {payment?.notes && <p className="text-xs italic text-muted-foreground mt-0.5">"{payment.notes}"</p>}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {(!payment || payment.status === 'unpaid') && (
                    <>
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-8 text-xs"
                        disabled={isProcessing} onClick={() => handleOpenPayDialog(student.id, student.name)}>
                        {isProcessing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Mark Paid
                      </Button>
                      <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50 gap-1.5 h-8 text-xs"
                        disabled={isProcessing} onClick={() => handleMarkFreeTuition(student.id)}>
                        Free Tuition (RA 10931)
                      </Button>
                      <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50 gap-1.5 h-8 text-xs"
                        disabled={isProcessing} onClick={() => handleMarkFreeTuitionWithOtherFees(student.id)}>
                        Free Tuition + Other Fees
                      </Button>
                    </>
                  )}
                  {payment && payment.status !== 'unpaid' && (
                    <Button size="sm" variant="ghost" className="text-muted-foreground h-8 text-xs gap-1.5"
                      disabled={isProcessing} onClick={() => handleMarkUnpaid(student.id)}>
                      <XCircle className="w-3 h-3" /> Revert to Unpaid
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Mark Paid Dialog */}
        <Dialog open={!!payDialog} onOpenChange={open => { if (!open) setPayDialog(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-600" /> Record Payment</DialogTitle>
            </DialogHeader>
            {payDialog && (
              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">{payDialog.name}</p>
                {payDialog.computed && (
                  <div className="text-xs bg-muted/50 rounded-lg p-3 space-y-1">
                    <div className="flex justify-between"><span>Tuition ({payDialog.computed.academicUnits} units × {fmt(payDialog.computed.feeSchedule.tuitionPerUnit)})</span><span>{fmt(payDialog.computed.tuition)}</span></div>
                    {payDialog.computed.nstpUnits > 0 && <div className="flex justify-between"><span>NSTP Tuition</span><span>{fmt(payDialog.computed.nstpTuition)}</span></div>}
                    <div className="flex justify-between"><span>Other School Fees</span><span>{fmt(payDialog.computed.otherFees)}</span></div>
                    <div className="flex justify-between font-bold border-t pt-1 mt-1"><span>Total</span><span>{fmt(payDialog.computed.totalBeforeSubsidy)}</span></div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-xs">Amount Paid (₱)</Label>
                  <Input type="number" min={0} step="0.01" value={payAmount} onChange={e => setPayAmount(e.target.value)} className="h-9 text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Notes (optional)</Label>
                  <Input value={payNotes} onChange={e => setPayNotes(e.target.value)} placeholder="O.R. No., remarks..." className="h-9 text-sm" />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5" onClick={handleConfirmPaid} disabled={!!processingId}>
                    {processingId ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Confirm Payment
                  </Button>
                  <Button variant="ghost" className="flex-1" onClick={() => setPayDialog(null)}>Cancel</Button>
                </div>
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Info size={12} className="flex-shrink-0 mt-0.5" />
                  For RA 10931 (Free Tuition), use the "Free Tuition" button instead.
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </PortalLayout>
  );
}
