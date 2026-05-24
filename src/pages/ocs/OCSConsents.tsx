import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { CheckCircle, XCircle, Clock, User } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import type { ConsentStatus } from '../../lib/types';

const statusBadge = (status: ConsentStatus) => {
  switch (status) {
    case 'approved': return <Badge className="status-approved text-xs">Approved</Badge>;
    case 'denied': return <Badge className="status-closed text-xs">Denied</Badge>;
    case 'pending': return <Badge className="status-pending text-xs">Pending</Badge>;
    default: return <Badge variant="outline" className="text-xs text-muted-foreground">Not Requested</Badge>;
  }
};

export default function OCSConsents() {
  const { state, updateConsentStatus, getActiveTerm } = useApp();
  const { toast } = useToast();
  const activeTerm = getActiveTerm();

  const termConsents = state.consents.filter(c => c.termId === activeTerm?.id);
  const pending = termConsents.filter(c => c.ocsConsentStatus === 'pending');
  const processed = termConsents.filter(c => c.ocsConsentStatus === 'approved' || c.ocsConsentStatus === 'denied');

  const handleAction = (consentId: string, status: 'approved' | 'denied') => {
    updateConsentStatus(consentId, 'ocsConsentStatus', status);
    toast({ title: `Consent ${status}`, description: `The OCS consent has been ${status}.` });
  };

  const ConsentRow = ({ c }: { c: typeof state.consents[0] }) => {
    const student = state.users.find(u => u.id === c.studentId);
    const sec = state.sections.find(s => s.id === c.sectionId);
    const course = sec ? state.courses.find(co => co.id === sec.courseId) : null;
    const faculty = sec ? state.users.find(u => u.id === sec.facultyId) : null;

    return (
      <div className="p-4 rounded-lg border border-border bg-card hover:bg-muted/20 transition-colors">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User size={16} className="text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">{student?.name}</p>
              <p className="text-xs text-muted-foreground">{student?.studentNumber} — {student?.program}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {course?.code} — {course?.title} | Sec {sec?.sectionCode} | {faculty?.name}
              </p>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  COI: {statusBadge(c.coiStatus)}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  Dept: {statusBadge(c.deptConsentStatus)}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  OCS: {statusBadge(c.ocsConsentStatus)}
                </div>
              </div>
            </div>
          </div>
          {c.ocsConsentStatus === 'pending' && (
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-secondary hover:bg-secondary/90 gap-1 h-8"
                onClick={() => handleAction(c.id, 'approved')}
              >
                <CheckCircle size={13} /> Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground gap-1 h-8"
                onClick={() => handleAction(c.id, 'denied')}
              >
                <XCircle size={13} /> Deny
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <PortalLayout title="OCS Consent Management">
      <div className="space-y-5">
        <Tabs defaultValue="pending">
          <TabsList className="bg-muted">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock size={14} /> Pending ({pending.length})
            </TabsTrigger>
            <TabsTrigger value="processed" className="flex items-center gap-2">
              <CheckCircle size={14} /> Processed ({processed.length})
            </TabsTrigger>
            <TabsTrigger value="all">All ({termConsents.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Pending OCS Consents</CardTitle></CardHeader>
              <CardContent>
                {pending.length === 0
                  ? <p className="text-sm text-muted-foreground py-6 text-center">No pending OCS consents.</p>
                  : <div className="space-y-3">{pending.map(c => <ConsentRow key={c.id} c={c} />)}</div>
                }
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="processed">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Processed Consents</CardTitle></CardHeader>
              <CardContent>
                {processed.length === 0
                  ? <p className="text-sm text-muted-foreground py-6 text-center">No processed consents.</p>
                  : <div className="space-y-3">{processed.map(c => <ConsentRow key={c.id} c={c} />)}</div>
                }
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="all">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">All Consents</CardTitle></CardHeader>
              <CardContent>
                {termConsents.length === 0
                  ? <p className="text-sm text-muted-foreground py-6 text-center">No consent records.</p>
                  : <div className="space-y-3">{termConsents.map(c => <ConsentRow key={c.id} c={c} />)}</div>
                }
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PortalLayout>
  );
}
