import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { KeyRound, Clock, CheckCircle, Eye, EyeOff, AlertCircle } from 'lucide-react';
import type { PasswordResetTicket } from '../../lib/types';

type Filter = 'all' | 'pending' | 'resolved';

export default function AdminPasswordTickets() {
  const { getPasswordResetTickets, resolvePasswordResetTicket } = useApp();

  const [tickets, setTickets] = useState<PasswordResetTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');

  // Resolve dialog
  const [selected, setSelected] = useState<PasswordResetTicket | null>(null);
  const [newPass, setNewPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolveErr, setResolveErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPasswordResetTickets();
      setTickets(data);
    } finally {
      setLoading(false);
    }
  }, [getPasswordResetTickets]);

  useEffect(() => { load(); }, [load]);

  const filtered = tickets.filter(t => filter === 'all' ? true : t.status === filter);
  const pendingCount = tickets.filter(t => t.status === 'pending').length;

  const openResolve = (t: PasswordResetTicket) => {
    setSelected(t);
    setNewPass('');
    setShowPass(false);
    setResolveErr('');
  };

  const handleResolve = async () => {
    if (!selected) return;
    if (newPass.length < 6) { setResolveErr('Password must be at least 6 characters.'); return; }
    setResolving(true);
    setResolveErr('');
    try {
      await resolvePasswordResetTicket(selected.id, newPass, selected.username);
      setSelected(null);
      load();
    } catch (err) {
      setResolveErr(err instanceof Error ? err.message : 'Failed to resolve ticket.');
    } finally {
      setResolving(false);
    }
  };

  return (
    <PortalLayout title="Password Reset Tickets">
      <div className="space-y-4">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {pendingCount > 0 ? `${pendingCount} pending request${pendingCount > 1 ? 's' : ''}` : 'No pending requests'}
            </span>
          </div>
          <div className="flex gap-1 bg-muted p-1 rounded-lg">
            {(['all', 'pending', 'resolved'] as Filter[]).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-md text-sm font-medium capitalize transition-colors ${filter === f ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                {f}
                {f === 'pending' && pendingCount > 0 && (
                  <Badge className="ml-1.5 h-4 px-1 text-[10px] bg-destructive text-destructive-foreground">{pendingCount}</Badge>
                )}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>Refresh</Button>
        </div>

        {/* Table */}
        <div className="portal-panel">
          <div className="portal-panel-header">
            <KeyRound size={14} /> Password Reset Requests
          </div>
          <div className="bg-background">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Loading tickets…</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No {filter !== 'all' ? filter : ''} tickets found.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Username</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Submitted</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Resolved</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(t => (
                    <tr key={t.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{t.name}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{t.username}</td>
                      <td className="px-4 py-3">
                        {t.status === 'pending' ? (
                          <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 gap-1">
                            <Clock size={10} /> Pending
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-secondary border-secondary/30 bg-secondary/10 gap-1">
                            <CheckCircle size={10} /> Resolved
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(t.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{t.resolvedAt ? new Date(t.resolvedAt).toLocaleString() : '—'}</td>
                      <td className="px-4 py-3 text-right">
                        {t.status === 'pending' ? (
                          <Button size="sm" onClick={() => openResolve(t)}>Set Password</Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => openResolve(t)}>View</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Resolve / View Dialog */}
      <Dialog open={!!selected} onOpenChange={o => { if (!o) setSelected(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound size={16} className="text-primary" />
              {selected?.status === 'pending' ? 'Set New Password' : 'Ticket Details'}
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/40 rounded-lg text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Name:</span><span className="font-medium">{selected.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Username:</span><span className="font-mono">{selected.username}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Submitted:</span><span>{new Date(selected.createdAt).toLocaleString()}</span></div>
              </div>

              {selected.status === 'pending' ? (
                <>
                  <div className="space-y-1.5">
                    <Label>New Password for {selected.username}</Label>
                    <div className="relative">
                      <Input type={showPass ? 'text' : 'password'} placeholder="Enter new password (min 6 chars)" value={newPass}
                        onChange={e => { setNewPass(e.target.value); setResolveErr(''); }} className="pr-10" autoFocus />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPass(v => !v)}>
                        {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  {resolveErr && (
                    <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg px-3 py-2">
                      <AlertCircle size={13} />{resolveErr}
                    </div>
                  )}
                </>
              ) : (
                <div className="p-3 bg-secondary/10 border border-secondary/30 rounded-lg text-sm space-y-1">
                  <p className="text-muted-foreground text-xs">Password set by admin:</p>
                  <p className="font-mono font-bold text-foreground tracking-wider">{selected.newPassword ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">Resolved: {selected.resolvedAt ? new Date(selected.resolvedAt).toLocaleString() : '—'}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
            {selected?.status === 'pending' && (
              <Button onClick={handleResolve} disabled={resolving || !newPass}>
                {resolving ? 'Saving…' : 'Set Password & Resolve'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
