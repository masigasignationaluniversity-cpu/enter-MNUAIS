import { useState, useMemo } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CheckCircle2, XCircle, Clock, FileText, Search,
  AlertTriangle, Users, RefreshCw, Info,
} from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import type { UnderloadApplication, UnderloadApplicationStatus } from '@/lib/types';

type FilterStatus = 'all' | 'pending' | 'approved' | 'denied';

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '—';

export default function OCSUnderload() {
  const { state, processUnderloadApplication, loadUnderloadApplications } = useApp();
  const me = state.currentUser!;

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [denyResponse, setDenyResponse] = useState('');
  const [denyingId, setDenyingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const activeTerm = state.terms.find(t => t.isActive);
  const underloadUntil = activeTerm?.underloadUntil;
  const underloadFrom = activeTerm?.underloadFrom;
  const now = new Date();
  const isWindowOpen = underloadFrom && underloadUntil
    ? now >= new Date(underloadFrom) && now <= new Date(underloadUntil)
    : false;
  const isWindowPast = underloadUntil ? now > new Date(underloadUntil) : false;

  // Filter to active term and OCS college's students only
  const ocsCollegeId = useMemo(() => {
    return state.colleges.find(c =>
      c.name === me.college || c.id === me.college || c.abbreviation === me.college
    )?.id ?? me.college ?? '';
  }, [state.colleges, me.college]);

  const myStudents = useMemo(() => {
    return new Set(
      state.users.filter(u => u.role === 'student' && (
        u.college === ocsCollegeId ||
        state.colleges.find(c => c.id === ocsCollegeId)?.name === u.college
      )).map(u => u.id)
    );
  }, [state.users, state.colleges, ocsCollegeId]);

  const allApplications = useMemo(() => {
    const apps = [...(state.underloadApplications ?? [])]
      .filter(a => a.termId === activeTerm?.id && myStudents.has(a.studentId));
    apps.sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime();
    });
    return apps;
  }, [state.underloadApplications, activeTerm?.id, myStudents]);

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

  const handleApprove = async (appId: string) => {
    setProcessingId(appId);
    try {
      await processUnderloadApplication(appId, 'approved', me.id);
      toast.success('Underload application approved.');
    } catch {
      toast.error('Failed to approve. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeny = async (appId: string) => {
    setDenyingId(appId);
    setDenyResponse('');
  };

  const handleConfirmDeny = async () => {
    if (!denyingId) return;
    setProcessingId(denyingId);
    try {
      await processUnderloadApplication(denyingId, 'denied', me.id, denyResponse || undefined);
      toast.success('Application denied.');
      setDenyingId(null);
      setDenyResponse('');
    } catch {
      toast.error('Failed to deny. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUnderloadApplications();
    setRefreshing(false);
    toast.success('Applications refreshed.');
  };

  const pendingCount = allApplications.filter(a => a.status === 'pending').length;

  const StatusBadge = ({ status }: { status: UnderloadApplicationStatus }) => {
    if (status === 'approved') return <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-300"><CheckCircle2 className="w-3 h-3 mr-1" />Approved</Badge>;
    if (status === 'denied') return <Badge className="text-xs bg-red-100 text-red-700 border-red-300"><XCircle className="w-3 h-3 mr-1" />Denied</Badge>;
    return <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-300"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
  };

  return (
    <PortalLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileText className="w-6 h-6 text-orange-600" />
              Underload Applications
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Review and process underload applications for {activeTerm?.name ?? 'active term'}.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Window status */}
        <div className={`rounded-lg border px-4 py-3 flex items-start gap-3 text-sm ${
          isWindowOpen ? 'border-green-300 bg-green-50 text-green-800' :
          isWindowPast ? 'border-gray-200 bg-gray-50 text-gray-600' :
          'border-orange-200 bg-orange-50 text-orange-700'
        }`}>
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            {!underloadFrom && !underloadUntil ? (
              <p><strong>No underload window set</strong> for this term. Configure one in Admin → Term Control.</p>
            ) : isWindowOpen ? (
              <p><strong>Window is open</strong> — students may submit underload applications until <strong>{fmtDate(underloadUntil)}</strong>.</p>
            ) : isWindowPast ? (
              <p><strong>Window closed</strong> — it was open from {fmtDate(underloadFrom)} to {fmtDate(underloadUntil)}.</p>
            ) : (
              <p><strong>Window not yet open</strong> — opens {fmtDate(underloadFrom)}, closes {fmtDate(underloadUntil)}.</p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {(['pending', 'approved', 'denied'] as const).map(s => {
            const count = allApplications.filter(a => a.status === s).length;
            const color = s === 'pending' ? 'text-amber-700 bg-amber-50 border-amber-200' : s === 'approved' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-red-700 bg-red-50 border-red-200';
            return (
              <div key={s} className={`portal-panel border rounded-lg p-3 text-center ${color}`}>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs capitalize">{s}</p>
              </div>
            );
          })}
        </div>

        {pendingCount > 0 && (
          <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span><strong>{pendingCount}</strong> application{pendingCount !== 1 ? 's' : ''} awaiting review.</span>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search by name or student number..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterStatus} onValueChange={v => setFilterStatus(v as FilterStatus)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({allApplications.length})</SelectItem>
              <SelectItem value="pending">Pending ({allApplications.filter(a => a.status === 'pending').length})</SelectItem>
              <SelectItem value="approved">Approved ({allApplications.filter(a => a.status === 'approved').length})</SelectItem>
              <SelectItem value="denied">Denied ({allApplications.filter(a => a.status === 'denied').length})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Applications list */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No applications found.</p>
            <p className="text-sm mt-1">
              {filterStatus === 'pending' ? 'No pending underload applications.' : 'Try adjusting your filters.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(app => {
              const student = state.users.find(u => u.id === app.studentId);
              const isDenying = denyingId === app.id;
              const isProcessing = processingId === app.id;
              const enrolledUnits = state.enrollments.filter(e =>
                e.studentId === app.studentId && e.termId === app.termId
              ).reduce((sum, e) => {
                const sec = state.sections.find(s => s.id === e.sectionId);
                const course = state.courses.find(c => c.id === sec?.courseId);
                return sum + (course?.units ?? 0) + (course?.labUnits ?? 0);
              }, 0);

              return (
                <div key={app.id} className="portal-panel border rounded-lg">
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-foreground">{student?.name ?? 'Unknown Student'}</p>
                          <Badge variant="outline" className="text-xs">{student?.studentNumber ?? '—'}</Badge>
                          <StatusBadge status={app.status} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{student?.program ?? '—'} · {enrolledUnits} units enlisted</p>
                        <p className="text-xs text-muted-foreground">Submitted: {fmtDate(app.requestedAt)}</p>
                      </div>
                    </div>

                    <div className="bg-muted/30 rounded-md px-3 py-2 text-sm text-foreground border">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Student's Reason:</p>
                      <p className="leading-relaxed">{app.reason}</p>
                    </div>

                    {app.status !== 'pending' && (
                      <div className={`rounded-md px-3 py-2 text-xs border ${app.status === 'approved' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                        <p className="font-semibold">{app.status === 'approved' ? 'Approved' : 'Denied'} by OCS</p>
                        {app.processedAt && <p className="mt-0.5">Processed: {fmtDate(app.processedAt)}</p>}
                        {app.response && <p className="mt-0.5 italic">"{app.response}"</p>}
                      </div>
                    )}

                    {app.status === 'pending' && !isDenying && (
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 flex-1"
                          disabled={isProcessing} onClick={() => handleApprove(app.id)}>
                          {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 gap-1.5 flex-1"
                          disabled={isProcessing} onClick={() => handleDeny(app.id)}>
                          <XCircle className="w-3.5 h-3.5" /> Deny
                        </Button>
                      </div>
                    )}

                    {app.status === 'pending' && isDenying && (
                      <div className="space-y-2 border border-red-200 rounded-md p-3 bg-red-50">
                        <p className="text-xs font-semibold text-red-800">Add a response (optional):</p>
                        <Textarea
                          className="text-xs"
                          rows={3}
                          placeholder="Reason for denial (shown to student)..."
                          value={denyResponse}
                          onChange={e => setDenyResponse(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white flex-1 gap-1.5"
                            disabled={isProcessing} onClick={handleConfirmDeny}>
                            {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                            Confirm Deny
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setDenyingId(null)} className="flex-1">
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
