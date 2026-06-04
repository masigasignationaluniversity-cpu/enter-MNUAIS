import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter as ADF, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../components/ui/alert-dialog';
import { KeyRound, Clock, CheckCircle, Copy, AlertCircle, Trash2 } from 'lucide-react';
import { toast } from '../../components/ui/sonner';
import type { PasswordResetTicket } from '../../lib/types';

type Filter = 'all' | 'pending' | 'approved';

export default function AdminPasswordTickets() {
  const { getPasswordResetTickets, approvePasswordResetTicket, deleteAllPasswordTickets } = useApp();

  const [tickets, setTickets] = useState<PasswordResetTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('pending');
  const [deleting, setDeleting] = useState(false);

  const [selected, setSelected] = useState<PasswordResetTicket | null>(null);
  const [approving, setApproving] = useState(false);
  const [approveErr, setApproveErr] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setTickets(await getPasswordResetTickets()); }
    finally { setLoading(false); }
  }, [getPasswordResetTickets]);

  useEffect(() => { load(); }, [load]);

  const filtered = tickets.filter(t => filter === 'all' ? true : t.status === filter);
  const pendingCount = tickets.filter(t => t.status === 'pending').length;

  const openApprove = (t: PasswordResetTicket) => {
    setSelected(t); setGeneratedPassword(''); setApproveErr(''); setCopied(false);
  };

  const handleApprove = async () => {
    if (!selected) return;
    setApproving(true); setApproveErr('');
    try {
      const { generatedPassword: pw } = await approvePasswordResetTicket(selected.id, selected.username);
      setGeneratedPassword(pw); load();
    } catch (err) {
      setApproveErr(err instanceof Error ? err.message : 'Failed to approve ticket.');
    } finally { setApproving(false); }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedPassword);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteAll = async () => {
    setDeleting(true);
    try {
      await deleteAllPasswordTickets();
      await load(); // Re-fetch to confirm actual DB state
      toast.success('All tickets deleted.');
    } catch (err) {
      toast.error('Failed to delete tickets.', { description: err instanceof Error ? err.message : undefined });
    } finally { setDeleting(false); }
  };

  return (
    <PortalLayout title="Password Reset Tickets">
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm text-muted-foreground">
            Review and approve user password reset requests. The system generates a new password on approval.
          </p>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-muted p-1 rounded-lg">
              {(['pending', 'approved', 'all'] as Filter[]).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium capitalize transition-colors ${filter === f ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                  {f}
                  {f === 'pending' && pendingCount > 0 && (
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">{pendingCount}</span>
                  )}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>Refresh</Button>
            {tickets.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10" disabled={deleting}>
                    <Trash2 className="w-3.5 h-3.5" /> Delete All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete all tickets?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all {tickets.length} password reset ticket{tickets.length !== 1 ? 's' : ''}. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <ADF>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={handleDeleteAll}>
                      Delete All
                    </AlertDialogAction>
                  </ADF>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        <div className="portal-panel">
          <div className="portal-panel-header">
            <KeyRound size={14} /> Password Reset Requests
            <Badge className="ml-auto bg-primary-foreground/15 text-primary-foreground border-0 text-xs">{filtered.length}</Badge>
          </div>
          <div className="bg-background">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No {filter !== 'all' ? filter : ''} requests found.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ticket No.</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Username</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Submitted</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(t => (
                    <tr key={t.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-foreground text-xs">{t.ticketNumber ?? '—'}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{t.name}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{t.username}</td>
                      <td className="px-4 py-3">
                        {t.status === 'pending' ? (
                          <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 gap-1">
                            <Clock size={10} /> Pending
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-secondary border-secondary/30 bg-secondary/10 gap-1">
                            <CheckCircle size={10} /> Approved
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(t.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        {t.status === 'pending'
                          ? <Button size="sm" onClick={() => openApprove(t)}>Approve</Button>
                          : <Button size="sm" variant="outline" onClick={() => openApprove(t)}>View</Button>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={o => { if (!o) setSelected(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound size={16} className="text-primary" />
              {selected?.status === 'pending' ? 'Approve Password Reset' : 'Ticket Details'}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/40 rounded-lg text-sm space-y-1.5">
                <div className="flex justify-between"><span className="text-muted-foreground">Ticket:</span><span className="font-mono font-bold">{selected.ticketNumber}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Name:</span><span className="font-medium">{selected.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Username:</span><span className="font-mono">{selected.username}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Submitted:</span><span className="text-xs">{new Date(selected.createdAt).toLocaleString()}</span></div>
              </div>
              {selected.status === 'approved' && !generatedPassword && (
                <div className="p-3 bg-secondary/10 border border-secondary/30 rounded-lg space-y-1">
                  <p className="text-xs text-muted-foreground">System-generated password:</p>
                  <p className="font-mono font-bold text-foreground tracking-wider">{selected.newPassword ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">Approved: {selected.resolvedAt ? new Date(selected.resolvedAt).toLocaleString() : '—'}</p>
                </div>
              )}
              {selected.status === 'pending' && !generatedPassword && (
                <p className="text-sm text-muted-foreground">
                  Approving will generate a new password for <strong>{selected.username}</strong> and update their account immediately.
                </p>
              )}
              {generatedPassword && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-secondary text-sm font-medium">
                    <CheckCircle size={14} /> Password generated and applied!
                  </div>
                  <div className="p-3 bg-secondary/10 border border-secondary/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">New password for {selected.username}:</p>
                    <div className="flex items-center gap-2">
                      <p className="font-mono font-bold text-foreground tracking-wider flex-1">{generatedPassword}</p>
                      <button onClick={handleCopy} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded">
                        <Copy size={14} />
                      </button>
                    </div>
                    {copied && <p className="text-xs text-secondary mt-1">Copied!</p>}
                  </div>
                  <p className="text-xs text-muted-foreground">Communicate this password to the user. They should change it after signing in.</p>
                </div>
              )}
              {approveErr && (
                <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg px-3 py-2">
                  <AlertCircle size={13} />{approveErr}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
            {selected?.status === 'pending' && !generatedPassword && (
              <Button onClick={handleApprove} disabled={approving}>
                {approving ? 'Generating…' : 'Approve & Generate Password'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
