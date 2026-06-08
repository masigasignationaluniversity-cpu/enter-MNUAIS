import { useState, useMemo } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { StatusBanner } from '@/components/shared/StatusBanner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CheckCircle2, XCircle, Clock, Layers, Search,
  AlertTriangle, Users, RefreshCw, ChevronDown, ChevronUp,
} from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import type { SpecializationRequest, SpecializationRequestStatus } from '@/lib/types';

type FilterStatus = 'all' | 'pending' | 'approved' | 'denied';

export default function OCSSpecialization() {
  const { state, processSpecializationRequest } = useApp();
  const me = state.currentUser!;

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [denyResponse, setDenyResponse] = useState('');
  const [denyingId, setDenyingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const activeTerm = state.terms.find(t => t.isActive);
  const approvalDeadline = activeTerm?.specializationApprovalUntil;
  const appDeadline = activeTerm?.specializationUntil;
  const isApprovalDeadlinePassed = approvalDeadline && new Date() > new Date(approvalDeadline);

  const fmtDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  const fmtDateTime = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '—';

  const getStudent = (studentId: string) => state.users.find(u => u.id === studentId);

  const getCourse = (id: string) => state.courses.find(x => x.id === id);
  const getCourseUnits = (id: string) => { const c = getCourse(id); return c ? c.units + (c.labUnits ?? 0) : 0; };

  const allRequests = useMemo(() => {
    const reqs = [...(state.specializationRequests ?? [])];
    reqs.sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime();
    });
    return reqs;
  }, [state.specializationRequests]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRequests.filter(req => {
      if (filterStatus !== 'all' && req.status !== filterStatus) return false;
      if (!q) return true;
      const student = state.users.find(u => u.id === req.studentId);
      const name = (student?.name ?? '').toLowerCase();
      const num = (student?.studentNumber ?? '').toLowerCase();
      const program = (student?.program ?? '').toLowerCase();
      return name.includes(q) || num.includes(q) || program.includes(q);
    });
  }, [allRequests, filterStatus, search, state.users]);

  const handleApprove = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      await processSpecializationRequest(requestId, 'approved', me.id);
      toast.success('Specialization plan approved.');
    } catch {
      toast.error('Failed to approve. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDenySubmit = async () => {
    if (!denyingId) return;
    setProcessingId(denyingId);
    try {
      await processSpecializationRequest(denyingId, 'denied', me.id, denyResponse || undefined);
      toast.success('Request denied.');
      setDenyingId(null);
      setDenyResponse('');
    } catch {
      toast.error('Failed to deny. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = allRequests.filter(r => r.status === 'pending').length;

  const statusBadge = (status: SpecializationRequestStatus) => {
    if (status === 'pending') return <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-xs">Pending</Badge>;
    if (status === 'approved') return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 text-xs">Approved</Badge>;
    return <Badge className="bg-red-100 text-red-700 border-red-300 text-xs">Denied</Badge>;
  };

  return (
    <PortalLayout title="Specialization Requests">
      <div className="space-y-4">

        {/* Deadline warnings */}
        {isApprovalDeadlinePassed && (
          <StatusBanner type="error" title="OCS Acceptance Deadline Passed" description={`Deadline was ${fmtDateTime(approvalDeadline!)}. Pending requests can no longer be processed.`} />
        )}
        {approvalDeadline && !isApprovalDeadlinePassed && (
          <StatusBanner type="deadline" title="Upcoming OCS Acceptance Deadline" description={<>OCS must process pending requests by <strong>{fmtDateTime(approvalDeadline)}</strong>.{appDeadline && <> · Student deadline: <strong>{fmtDate(appDeadline)}</strong></>}</>} />
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {(['pending', 'approved', 'denied'] as const).map(status => {
            const count = allRequests.filter(r => r.status === status).length;
            const colors = { pending: 'border-amber-200 bg-amber-50 text-amber-700', approved: 'border-emerald-200 bg-emerald-50 text-emerald-700', denied: 'border-red-200 bg-red-50 text-red-700' };
            const icons = { pending: <Clock className="w-4 h-4" />, approved: <CheckCircle2 className="w-4 h-4" />, denied: <XCircle className="w-4 h-4" /> };
            return (
              <button key={status} onClick={() => setFilterStatus(status)}
                className={`rounded-lg border p-3 text-left transition-all hover:shadow-sm ${colors[status]} ${filterStatus === status ? 'ring-2 ring-current/30' : ''}`}>
                <div className="flex items-center gap-2">{icons[status]}<span className="text-lg font-bold">{count}</span></div>
                <p className="text-xs font-medium capitalize mt-0.5">{status}</p>
              </button>
            );
          })}
        </div>

        {/* Table panel */}
        <div className="portal-panel">
          <div className="portal-panel-header">
            <Layers className="w-4 h-4" />
            Specialization Requests
            {pendingCount > 0 && <Badge className="ml-2 bg-amber-500 text-white text-xs h-5 px-1.5">{pendingCount}</Badge>}
          </div>

          {/* Filters */}
          <div className="px-4 py-3 flex flex-wrap gap-2 items-center border-b border-border/50">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input placeholder="Search by name, ID, or program..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
            </div>
            <Select value={filterStatus} onValueChange={v => setFilterStatus(v as FilterStatus)}>
              <SelectTrigger className="h-9 w-36 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Requests</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="denied">Denied</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Deny inline form */}
          {denyingId && (
            <div className="mx-4 my-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
              <p className="text-sm font-medium text-destructive">Deny Request</p>
              <Textarea placeholder="Reason for denial (optional, shown to student)..." value={denyResponse} onChange={e => setDenyResponse(e.target.value)} className="text-sm min-h-[60px]" />
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" onClick={handleDenySubmit} disabled={!!processingId} className="h-8 text-xs gap-1.5">
                  <XCircle className="w-3.5 h-3.5" /> Confirm Deny
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setDenyingId(null); setDenyResponse(''); }} className="h-8 text-xs">Cancel</Button>
              </div>
            </div>
          )}

          {/* Table */}
          {filtered.length === 0 ? (
            <div className="py-14 text-center flex flex-col items-center gap-3 text-muted-foreground">
              <Users className="w-10 h-10 opacity-20" />
              <p className="text-sm">No specialization requests found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Student</th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Program</th>
                    <th className="text-center py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Units</th>
                    <th className="text-center py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Submitted</th>
                    <th className="text-center py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="text-right py-2.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((req: SpecializationRequest) => {
                    const student = getStudent(req.studentId);
                    const totalUnits = req.courseIds.reduce((sum, id) => sum + getCourseUnits(id), 0);
                    const isExpanded = expandedId === req.id;
                    return (
                      <>
                        <tr
                          key={req.id}
                          className={`border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer ${req.status === 'pending' ? 'bg-amber-50/30' : ''}`}
                          onClick={() => setExpandedId(isExpanded ? null : req.id)}
                        >
                          <td className="py-3 px-4">
                            <div className="font-medium text-sm">{student?.name ?? req.studentId}</div>
                            {student?.studentNumber && <div className="text-xs text-muted-foreground font-mono">{student.studentNumber}</div>}
                          </td>
                          <td className="py-3 px-3 text-xs text-muted-foreground max-w-[160px] truncate">{student?.program ?? '—'}</td>
                          <td className="py-3 px-3 text-center text-xs font-medium">{totalUnits}</td>
                          <td className="py-3 px-3 text-center">
                            {req.isChangeRequest
                              ? <Badge variant="outline" className="text-[10px] border-blue-400 text-blue-600 gap-1 px-1.5"><RefreshCw className="w-2.5 h-2.5" /> Change</Badge>
                              : <span className="text-xs text-muted-foreground">Initial</span>}
                          </td>
                          <td className="py-3 px-3 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(req.requestedAt)}</td>
                          <td className="py-3 px-3 text-center">{statusBadge(req.status)}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                              {req.status === 'pending' && !isApprovalDeadlinePassed && (
                                <>
                                  <Button size="sm" onClick={() => handleApprove(req.id)} disabled={!!processingId}
                                    className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5">
                                    <CheckCircle2 className="w-3 h-3" />
                                    {processingId === req.id ? '…' : 'Approve'}
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => { setDenyingId(req.id); setDenyResponse(''); setExpandedId(req.id); }}
                                    disabled={!!processingId} className="h-7 text-xs gap-1 border-destructive/40 text-destructive hover:bg-destructive/5 px-2.5">
                                    <XCircle className="w-3 h-3" /> Deny
                                  </Button>
                                </>
                              )}
                              <button className="text-muted-foreground hover:text-foreground p-1">
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${req.id}-detail`} className={`border-b border-border/30 ${req.status === 'pending' ? 'bg-amber-50/20' : 'bg-muted/10'}`}>
                            <td colSpan={7} className="px-6 py-3">
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Courses</p>
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-muted-foreground">
                                      <th className="text-left py-1 pr-4 font-medium">Code</th>
                                      <th className="text-left py-1 pr-4 font-medium">Title</th>
                                      <th className="text-center py-1 font-medium">Units</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {req.courseIds.map(id => {
                                      const c = getCourse(id);
                                      return (
                                        <tr key={id} className="border-t border-border/30">
                                          <td className="py-1.5 pr-4 font-mono font-medium">{c?.code ?? id}</td>
                                          <td className="py-1.5 pr-4 text-muted-foreground">{c?.title ?? '—'}</td>
                                          <td className="py-1.5 text-center">{getCourseUnits(id)}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                                {req.status === 'denied' && req.response && (
                                  <div className="mt-2 text-xs text-destructive/80 bg-destructive/5 rounded px-2.5 py-1.5 border border-destructive/20">
                                    <strong>Denial reason:</strong> {req.response}
                                  </div>
                                )}
                                {req.processedAt && req.status !== 'pending' && (
                                  <p className="text-[11px] text-muted-foreground">{req.status === 'approved' ? 'Approved' : 'Denied'} {fmtDateTime(req.processedAt)}</p>
                                )}
                              </div>
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
      </div>
    </PortalLayout>
  );
}
