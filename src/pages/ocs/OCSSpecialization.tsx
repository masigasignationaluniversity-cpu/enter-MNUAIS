import { useState, useMemo } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CheckCircle2, XCircle, Clock, Layers, Search, ChevronRight,
  AlertTriangle, Users, RefreshCw,
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

  const approvalDeadline = state.portalSettings.specializationApprovalDeadline;
  const isApprovalDeadlinePassed = approvalDeadline && new Date() > new Date(approvalDeadline);

  const fmtDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '—';

  const getStudent = (studentId: string) =>
    state.users.find(u => u.id === studentId);

  const getCourseName = (id: string) => {
    const c = state.courses.find(x => x.id === id);
    return c ? `${c.code} — ${c.title}` : id;
  };

  const getCourseUnits = (id: string) => {
    const c = state.courses.find(x => x.id === id);
    return c ? c.units + (c.labUnits ?? 0) : 0;
  };

  // All requests, sorted: pending first, then by date desc
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

        {/* Deadline warning */}
        {isApprovalDeadlinePassed && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm text-destructive">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>The OCS approval deadline has passed ({fmtDate(approvalDeadline!)}). Pending requests can no longer be processed.</span>
          </div>
        )}
        {approvalDeadline && !isApprovalDeadlinePassed && (
          <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span>Approval deadline: <strong>{fmtDate(approvalDeadline)}</strong></span>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {(['pending', 'approved', 'denied'] as const).map(status => {
            const count = allRequests.filter(r => r.status === status).length;
            const colors = {
              pending: 'border-amber-200 bg-amber-50 text-amber-700',
              approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
              denied: 'border-red-200 bg-red-50 text-red-700',
            };
            const icons = {
              pending: <Clock className="w-4 h-4" />,
              approved: <CheckCircle2 className="w-4 h-4" />,
              denied: <XCircle className="w-4 h-4" />,
            };
            return (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`rounded-lg border p-3 text-left transition-all hover:shadow-sm ${colors[status]} ${filterStatus === status ? 'ring-2 ring-current/30' : ''}`}
              >
                <div className="flex items-center gap-2">
                  {icons[status]}
                  <span className="text-lg font-bold">{count}</span>
                </div>
                <p className="text-xs font-medium capitalize mt-0.5">{status}</p>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="portal-panel">
          <div className="portal-panel-header">
            <Layers className="w-4 h-4" />
            Specialization Requests
            {pendingCount > 0 && (
              <Badge className="ml-2 bg-amber-500 text-white text-xs h-5 px-1.5">{pendingCount}</Badge>
            )}
          </div>
          <div className="p-4 bg-background space-y-3">
            {/* Filter row */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search by student name, ID, or program..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
              </div>
              <Select value={filterStatus} onValueChange={v => setFilterStatus(v as FilterStatus)}>
                <SelectTrigger className="h-9 w-36 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Requests</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="denied">Denied</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Deny dialog */}
            {denyingId && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
                <p className="text-sm font-medium text-destructive">Deny Request</p>
                <Textarea
                  placeholder="Reason for denial (optional, will be shown to student)..."
                  value={denyResponse}
                  onChange={e => setDenyResponse(e.target.value)}
                  className="text-sm min-h-[70px]"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleDenySubmit}
                    disabled={!!processingId}
                    className="h-8 text-xs gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Confirm Deny
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setDenyingId(null); setDenyResponse(''); }} className="h-8 text-xs">
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Request list */}
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground flex flex-col items-center gap-3">
                <Users className="w-10 h-10 opacity-20" />
                <p className="text-sm">No specialization requests found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((req: SpecializationRequest) => {
                  const student = getStudent(req.studentId);
                  const totalUnits = req.courseIds.reduce((sum, id) => sum + getCourseUnits(id), 0);
                  return (
                    <div
                      key={req.id}
                      className={`rounded-lg border p-4 space-y-3 ${req.status === 'pending' ? 'border-amber-200 bg-amber-50/40' : 'bg-muted/20'}`}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{student?.name ?? req.studentId}</span>
                            {student?.studentNumber && (
                              <span className="text-xs text-muted-foreground font-mono">{student.studentNumber}</span>
                            )}
                            {req.isChangeRequest && (
                              <Badge variant="outline" className="text-[10px] border-blue-400 text-blue-600 gap-1">
                                <RefreshCw className="w-2.5 h-2.5" /> Change Request
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {student?.program ?? '—'} · Submitted {fmtDate(req.requestedAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {statusBadge(req.status)}
                          <span className="text-xs text-muted-foreground font-medium">{totalUnits} units</span>
                        </div>
                      </div>

                      {/* Course list */}
                      <div className="rounded-md border bg-background/60 p-2.5 space-y-0.5">
                        {req.courseIds.map(id => (
                          <div key={id} className="flex items-center gap-1.5 text-xs text-foreground">
                            <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                            <span>{getCourseName(id)}</span>
                            <span className="text-muted-foreground">({getCourseUnits(id)} units)</span>
                          </div>
                        ))}
                      </div>

                      {/* Response if denied */}
                      {req.status === 'denied' && req.response && (
                        <div className="text-xs text-destructive/80 bg-destructive/5 rounded px-2.5 py-1.5 border border-destructive/20">
                          <strong>Denial reason:</strong> {req.response}
                        </div>
                      )}

                      {/* Processed info */}
                      {req.processedAt && req.status !== 'pending' && (
                        <p className="text-[11px] text-muted-foreground">
                          {req.status === 'approved' ? 'Approved' : 'Denied'} {fmtDate(req.processedAt)}
                        </p>
                      )}

                      {/* Actions for pending */}
                      {req.status === 'pending' && !denyingId && !isApprovalDeadlinePassed && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(req.id)}
                            disabled={!!processingId}
                            className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {processingId === req.id ? 'Approving…' : 'Approve'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setDenyingId(req.id); setDenyResponse(''); }}
                            disabled={!!processingId}
                            className="h-8 text-xs gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/5"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Deny
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
