import { useState, useMemo, useEffect } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { StatusBanner } from '@/components/shared/StatusBanner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { TermSelect } from '@/components/shared/TermSelect';
import {
  CheckCircle2, XCircle, Clock, HandCoins, Search,
  AlertTriangle, Users, RefreshCw, ArrowRightCircle,
} from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { sortTermsChronologically } from '@/lib/academic';
import type { StudentLoanApplication, StudentLoanStatus } from '@/lib/types';

type FilterStatus = 'all' | 'pending' | 'approved' | 'denied';

const fmt = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '—';

export default function OCSStudentLoans() {
  const { state, processStudentLoanApplication, loadStudentLoanApplications } = useApp();
  const me = state.currentUser;

  const activeTerm = state.terms.find(t => t.isActive);
  const [selectedTermId, setSelectedTermId] = useState(activeTerm?.id ?? state.terms[0]?.id ?? '');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [denyResponse, setDenyResponse] = useState('');
  const [denyingId, setDenyingId] = useState<string | null>(null);

  useEffect(() => { loadStudentLoanApplications(); }, [loadStudentLoanApplications]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(loadStudentLoanApplications, 30000);
    return () => clearInterval(interval);
  }, [loadStudentLoanApplications]);

  const ocsCollegeId = useMemo(() => {
    if (!me) return '';
    return state.colleges.find(c =>
      c.name === me.college || c.id === me.college || c.abbreviation === me.college
    )?.id ?? me.college ?? '';
  }, [state.colleges, me]);

  const myStudents = useMemo(() => {
    return new Set(
      state.users.filter(u => {
        if (u.role !== 'student') return false;
        if (!ocsCollegeId) return true;
        return (
          u.college === ocsCollegeId ||
          state.colleges.find(c => c.id === ocsCollegeId)?.name === u.college
        );
      }).map(u => u.id)
    );
  }, [state.users, state.colleges, ocsCollegeId]);

  const relevantTermIds = useMemo(() => new Set(
    (state.studentLoanApplications ?? [])
      .filter(a => myStudents.has(a.studentId))
      .map(a => a.termId)
  ), [state.studentLoanApplications, myStudents]);
  const relevantTerms = state.terms.filter(t => relevantTermIds.has(t.id) || !!t.isActive);

  const allApplications = useMemo(() => {
    const apps = [...(state.studentLoanApplications ?? [])]
      .filter(a => a.termId === selectedTermId && myStudents.has(a.studentId));
    apps.sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime();
    });
    return apps;
  }, [state.studentLoanApplications, selectedTermId, myStudents]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allApplications.filter(app => {
      if (filterStatus !== 'all' && app.status !== filterStatus) return false;
      if (!q) return true;
      const student = state.users.find(u => u.id === app.studentId);
      const name = (student?.name ?? '').toLowerCase();
      const num = (student?.studentNumber ?? '').toLowerCase();
      const program = (student?.program ?? '').toLowerCase();
      return name.includes(q) || num.includes(q) || program.includes(q);
    });
  }, [allApplications, filterStatus, search, state.users]);

  // Succeeding term (for messaging in the UI, computed against the selected term)
  const succeedingTerm = useMemo(() => {
    const sorted = sortTermsChronologically(state.terms);
    const idx = sorted.findIndex(t => t.id === selectedTermId);
    return idx >= 0 ? sorted[idx + 1] : undefined;
  }, [state.terms, selectedTermId]);

  const handleApprove = async (appId: string) => {
    setProcessingId(appId);
    try {
      await processStudentLoanApplication(appId, 'approved', me.id);
      toast.success(
        succeedingTerm
          ? `Loan approved — balance carried to ${succeedingTerm.name}.`
          : 'Loan approved — hold lifted. No succeeding term exists yet to carry the balance into.'
      );
    } catch {
      toast.error('Failed to approve. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeny = (appId: string) => {
    setDenyingId(appId);
    setDenyResponse('');
  };

  const handleConfirmDeny = async () => {
    if (!denyingId) return;
    setProcessingId(denyingId);
    try {
      await processStudentLoanApplication(denyingId, 'denied', me.id, denyResponse || undefined);
      toast.success('Application denied.');
      setDenyingId(null);
      setDenyResponse('');
    } catch {
      toast.error('Failed to deny. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = allApplications.filter(a => a.status === 'pending').length;

  const StatusBadge = ({ status }: { status: StudentLoanStatus }) => {
    if (status === 'approved') return (
      <Badge className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 border-emerald-300 gap-1">
        <CheckCircle2 className="w-3 h-3" />Approved
      </Badge>
    );
    if (status === 'denied') return (
      <Badge className="text-[10px] px-2 py-0.5 bg-red-100 text-red-700 border-red-300 gap-1">
        <XCircle className="w-3 h-3" />Denied
      </Badge>
    );
    return (
      <Badge className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 border-amber-300 gap-1">
        <Clock className="w-3 h-3" />Pending
      </Badge>
    );
  };

  if (!me) return null;

  const statConfigs = [
    {
      key: 'pending' as const,
      label: 'Pending',
      icon: <Clock className="w-5 h-5" />,
      style: { background: 'linear-gradient(135deg, hsl(38 95% 50%), hsl(25 95% 50%))' },
    },
    {
      key: 'approved' as const,
      label: 'Approved',
      icon: <CheckCircle2 className="w-5 h-5" />,
      style: { background: 'var(--gradient-header)' },
    },
    {
      key: 'denied' as const,
      label: 'Denied',
      icon: <XCircle className="w-5 h-5" />,
      style: { background: 'linear-gradient(135deg, hsl(0 70% 55%), hsl(0 70% 45%))' },
    },
  ];

  return (
    <PortalLayout>
      <div className="space-y-5">

        {/* Controls bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <TermSelect terms={relevantTerms} value={selectedTermId} onChange={setSelectedTermId} />
          </div>
        </div>

        <StatusBanner
          type="info"
          title="About Student Loans"
          description={
            succeedingTerm
              ? <>Approving a loan lifts the student's enrollment hold immediately. The unpaid balance is carried forward and added on top of fees due in <strong>{succeedingTerm.name}</strong>.</>
              : 'Approving a loan lifts the student\'s enrollment hold immediately. The unpaid balance will be carried forward once a succeeding term is created.'
          }
        />

        {/* Pending alert */}
        {pendingCount > 0 && (
          <StatusBanner
            type="warning"
            title={`${pendingCount} loan application${pendingCount !== 1 ? 's' : ''} awaiting review`}
            description="Review and process all pending student loan applications below."
          />
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4">
          {statConfigs.map(({ key, label, icon, style }) => (
            <div key={key} className="dash-stat portal-panel">
              <div className="dash-stat-icon" style={style}>{icon}</div>
              <p className="dash-stat-value">{allApplications.filter(a => a.status === key).length}</p>
              <p className="dash-stat-label">{label}</p>
            </div>
          ))}
        </div>

        {/* Filters panel */}
        <div className="portal-panel">
          <div className="portal-panel-header">
            <Search className="w-4 h-4 text-muted-foreground" />
            <span>Filter Applications</span>
          </div>
          <div className="p-4 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9 text-sm" placeholder="Search by name, student number, or program..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <SearchableSelect
              value={filterStatus}
              onValueChange={v => setFilterStatus(v as FilterStatus)}
              triggerClassName="w-44 text-sm"
              placeholder="Filter status..."
              options={[
                { value: 'all', label: `All (${allApplications.length})` },
                { value: 'pending', label: `Pending (${allApplications.filter(a => a.status === 'pending').length})` },
                { value: 'approved', label: `Approved (${allApplications.filter(a => a.status === 'approved').length})` },
                { value: 'denied', label: `Denied (${allApplications.filter(a => a.status === 'denied').length})` },
              ]}
            />
          </div>
        </div>

        {/* Applications list */}
        {filtered.length === 0 ? (
          <div className="portal-panel">
            <div className="py-16 text-center text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-25" />
              <p className="font-semibold text-sm">No applications found</p>
              <p className="text-xs mt-1 opacity-70">
                {filterStatus === 'pending' ? 'No pending student loan applications for this term.' : 'Try adjusting your search or filter.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(app => {
              const student = state.users.find(u => u.id === app.studentId);
              const isDenying = denyingId === app.id;
              const isProcessing = processingId === app.id;
              const carriedTerm = app.carriedToTermId ? state.terms.find(t => t.id === app.carriedToTermId) : undefined;

              return (
                <div key={app.id} className="portal-panel">
                  {/* Card header */}
                  <div className="portal-panel-header">
                    <div className="flex items-center gap-2 flex-1 flex-wrap">
                      <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-bold text-foreground">{student?.name ?? 'Unknown Student'}</span>
                      <span className="text-muted-foreground text-xs font-normal">{student?.studentNumber ?? '—'}</span>
                    </div>
                    <StatusBadge status={app.status} />
                  </div>

                  {/* Card body */}
                  <div className="p-4 space-y-3">
                    {/* Meta info */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{student?.program ?? '—'}</span>
                      <span className="font-semibold text-foreground">Loan amount: {fmt(app.amount)}</span>
                      <span>Submitted: {fmtDate(app.requestedAt)}</span>
                    </div>

                    {/* Reason */}
                    <div className="banner banner-notice">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm bg-slate-100 text-slate-500">
                        <HandCoins size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="banner-title">Student's Reason</span>
                        <span className="banner-desc">{app.reason}</span>
                      </div>
                    </div>

                    {/* Decision */}
                    {app.status !== 'pending' && (
                      <div className={`banner ${app.status === 'approved' ? 'banner-success' : 'banner-error'}`}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${app.status === 'approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                          {app.status === 'approved' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="banner-title">{app.status === 'approved' ? 'Approved by OCS' : 'Denied by OCS'}</span>
                          {app.processedAt && <span className="banner-desc">Processed: {fmtDate(app.processedAt)}</span>}
                          {app.status === 'approved' && (
                            <span className="banner-desc flex items-center gap-1">
                              <ArrowRightCircle className="w-3 h-3" />
                              {carriedTerm ? <>Balance of {fmt(app.amount)} carried to <strong>{carriedTerm.name}</strong>.</> : 'No succeeding term existed yet — balance not yet carried forward.'}
                            </span>
                          )}
                          {app.response && <span className="banner-desc italic">"{app.response}"</span>}
                        </div>
                      </div>
                    )}

                    {/* Approve / Deny actions */}
                    {app.status === 'pending' && !isDenying && (
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                          disabled={isProcessing}
                          onClick={() => handleApprove(app.id)}
                        >
                          {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-red-300 text-red-600 hover:bg-red-50 gap-1.5"
                          disabled={isProcessing}
                          onClick={() => handleDeny(app.id)}
                        >
                          <XCircle className="w-3.5 h-3.5" /> Deny
                        </Button>
                      </div>
                    )}

                    {/* Deny confirmation form */}
                    {app.status === 'pending' && isDenying && (
                      <div className="banner banner-error flex-col items-stretch gap-2 pt-1">
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={15} className="flex-shrink-0" />
                          <span className="banner-title">Confirm Denial</span>
                        </div>
                        <Textarea
                          className="text-xs bg-white border-red-200 focus:ring-red-300"
                          rows={3}
                          placeholder="Reason for denial (optional — shown to student)..."
                          value={denyResponse}
                          onChange={e => setDenyResponse(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white gap-1.5"
                            disabled={isProcessing}
                            onClick={handleConfirmDeny}
                          >
                            {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                            Confirm Deny
                          </Button>
                          <Button size="sm" variant="ghost" className="flex-1" onClick={() => setDenyingId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
