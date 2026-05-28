import { useState, useEffect } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { CheckCircle, XCircle, Search, AlertTriangle, Clock, RefreshCw, MessageSquare, Lock } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { PageIntro } from '@/components/shared/PageIntro';

export default function OCSChangeDrop() {
  const { state, processChangeDropRequest, loadChangeDropRequests } = useApp();
  const [search, setSearch] = useState('');
  const [selectedTermId, setSelectedTermId] = useState<string>('all');
  const [denyDialogId, setDenyDialogId] = useState<string | null>(null);
  const [denyNote, setDenyNote] = useState('');
  const [approveNoteId, setApproveNoteId] = useState<string | null>(null);
  const [approveNote, setApproveNote] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadChangeDropRequests();
  }, [loadChangeDropRequests]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadChangeDropRequests();
    setRefreshing(false);
  };

  const me = state.currentUser;
  if (!me) return null;

  const ocsCollege = me.college;

  // Request deadline lock
  const activeTerm = state.terms.find(t => t.isActive);
  const isDeadlinePassed = activeTerm?.requestDeadline
    ? new Date() > new Date(activeTerm.requestDeadline)
    : false;

  const allRequests = (state.changeDropRequests ?? [])
    .slice()
    .filter(r => {
      const student = state.users.find(u => u.id === r.studentId);
      if (!student) return false;
      if (ocsCollege) {
        const studentCollege = student.college || student.department;
        if (studentCollege && studentCollege !== ocsCollege) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return b.requestedAt.localeCompare(a.requestedAt);
    });

  const pendingCount = allRequests.filter(r => r.status === 'pending').length;

  const filtered = allRequests.filter(r => {
    const student = state.users.find(u => u.id === r.studentId);
    if (!student) return false;
    if (selectedTermId !== 'all' && r.termId !== selectedTermId) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return student.name.toLowerCase().includes(q) ||
      student.username.toLowerCase().includes(q) ||
      (student.studentNumber ?? '').toLowerCase().includes(q);
  });

  const handleApprove = async (requestId: string, note?: string) => {
    const req = allRequests.find(r => r.id === requestId);
    if (!req) return;
    setProcessingId(requestId);
    try {
      await processChangeDropRequest(requestId, 'approved', me.id, note?.trim() || undefined);
      const student = state.users.find(u => u.id === req.studentId);
      toast.success('Request Approved', { description: `${student?.name ?? 'Student'}'s enrollment has been reopened for changes.` });
    } catch {
      toast.error('Error', { description: 'Failed to approve request.' });
    } finally {
      setProcessingId(null);
      setApproveNoteId(null);
      setApproveNote('');
    }
  };

  const handleDeny = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      await processChangeDropRequest(requestId, 'denied', me.id, denyNote.trim() || undefined);
      toast.success('Request Denied', { description: 'The student has been notified.' });
    } catch {
      toast.error('Error', { description: 'Failed to deny request.' });
    } finally {
      setProcessingId(null);
      setDenyDialogId(null);
      setDenyNote('');
    }
  };

  const statusBadge = (status: string) => {
    if (status === 'pending') return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Pending</Badge>;
    if (status === 'approved') return <Badge className="bg-green-100 text-green-800 border-green-300">Approved</Badge>;
    return <Badge className="bg-red-100 text-red-800 border-red-300">Denied</Badge>;
  };

  return (
    <PortalLayout>
      <div className="space-y-6">
        <PageIntro description="Process approved change and drop requests for enrolled students." />
        <div className="flex items-center flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Change &amp; Drop After Finalization</h1>
            <p className="text-sm text-muted-foreground mt-1">Review student requests to change or drop subjects after finalizing enrollment.</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleRefresh} disabled={refreshing} style={{display:'none'}}>
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by name or student number..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
          <Select value={selectedTermId} onValueChange={setSelectedTermId}>
            <SelectTrigger className="w-48 h-9"><SelectValue placeholder="All Terms" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Terms</SelectItem>
              {state.terms.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Deadline lock banner */}
        {isDeadlinePassed && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/70 px-4 py-3 text-sm text-red-800">
            <Lock className="w-4 h-4 flex-shrink-0" />
            <strong>Request deadline has passed.</strong>&nbsp;No actions can be performed on pending Change/Drop requests.
          </div>
        )}

        {/* Pending badge */}
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-yellow-800 bg-yellow-50 border border-yellow-300 rounded-md px-3 py-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span><strong>{pendingCount}</strong> pending Change/Drop request{pendingCount > 1 ? 's' : ''} awaiting review.</span>
          </div>
        )}

        {/* Request cards */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No Change/Drop requests found. Try Refresh to load latest.</p>
            </div>
          ) : filtered.map(req => {
            const student = state.users.find(u => u.id === req.studentId);
            const term = state.terms.find(t => t.id === req.termId);
            if (!student) return null;
            return (
              <div key={req.id} className="rounded-lg border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-foreground">{student.name}</p>
                      {statusBadge(req.status)}
                      <Badge variant="outline" className="text-xs">Change &amp; Drop Request</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {student.studentNumber && <span className="mr-2">{student.studentNumber}</span>}
                      {student.program && <span className="mr-2">{student.program}</span>}
                      {term && <span>{term.name}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(req.requestedAt).toLocaleString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                    </p>
                  </div>
                  {req.status === 'pending' && !isDeadlinePassed && (
                    <div className="flex gap-2 flex-shrink-0">
                      <Button size="sm" variant="outline" className="gap-1 text-green-700 border-green-300 hover:bg-green-50"
                        disabled={processingId === req.id}
                        onClick={() => { setApproveNoteId(req.id); setApproveNote(''); }}>
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </Button>
                      <AlertDialog open={denyDialogId === req.id} onOpenChange={open => { if (!open) { setDenyDialogId(null); setDenyNote(''); } }}>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                            disabled={processingId === req.id} onClick={() => setDenyDialogId(req.id)}>
                            <XCircle className="w-3.5 h-3.5" /> Deny
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Deny Change/Drop Request</AlertDialogTitle>
                            <AlertDialogDescription>Provide an optional reason for the student.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <Textarea placeholder="Reason (optional)..." value={denyNote} onChange={e => setDenyNote(e.target.value)} rows={3} />
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => handleDeny(req.id)}>Deny Request</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>

                <div className="bg-muted/30 rounded-md px-3 py-2 text-sm">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Appeal Letter:</p>
                  <p className="text-foreground">{req.reason}</p>
                </div>

                {req.response && (
                  <div className={`rounded-md px-3 py-2 text-xs ${req.status === 'approved' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
                    <span className="font-semibold">OCS Response: </span>{req.response}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Approve with Note Dialog */}
      <Dialog open={!!approveNoteId} onOpenChange={open => { if (!open) { setApproveNoteId(null); setApproveNote(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-600" />Approve Change/Drop Request</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">Approving this will reopen the student's finalized enrollment for modification.</p>
            <div>
              <Label className="text-sm">Response to Student (optional)</Label>
              <Textarea rows={3} placeholder="e.g. Your request has been approved. Please make changes before the deadline..." value={approveNote} onChange={e => setApproveNote(e.target.value)} className="mt-1" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setApproveNoteId(null); setApproveNote(''); }}>Cancel</Button>
              <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" disabled={!!processingId}
                onClick={() => approveNoteId && handleApprove(approveNoteId, approveNote)}>
                {processingId ? 'Processing...' : 'Grant Access'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
