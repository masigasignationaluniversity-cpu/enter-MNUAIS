import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { KeyRound, CheckCircle, MailCheck } from 'lucide-react';
import type { PasswordResetTicket } from '../../lib/types';

type Filter = 'all' | 'pending' | 'resolved';

export default function AdminPasswordTickets() {
  const { getPasswordResetTickets } = useApp();

  const [tickets, setTickets] = useState<PasswordResetTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');

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

  return (
    <PortalLayout title="Password Reset Log">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            System auto-generates and emails a new password when users submit a request.
          </p>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-muted p-1 rounded-lg">
              {(['all', 'pending', 'resolved'] as Filter[]).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-md text-sm font-medium capitalize transition-colors ${filter === f ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                  {f}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>Refresh</Button>
          </div>
        </div>

        {/* Table */}
        <div className="portal-panel">
          <div className="portal-panel-header">
            <KeyRound size={14} /> Password Reset Requests
          </div>
          <div className="bg-background">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No {filter !== 'all' ? filter : ''} reset requests found.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Username</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Requested</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(t => (
                    <tr key={t.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{t.name}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{t.username}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-secondary border-secondary/30 bg-secondary/10 gap-1">
                          <CheckCircle size={10} /> Email Sent
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(t.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs">
                        {t.resolvedAt ? (
                          <span className="flex items-center gap-1 text-secondary">
                            <MailCheck size={13} /> {new Date(t.resolvedAt).toLocaleString()}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
