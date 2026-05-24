import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { CheckCircle, Clock, XCircle, FileText, Info } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import type { ConsentStatus } from '../../lib/types';

const StatusIcon = ({ s }: { s: ConsentStatus }) => {
  if (s === 'approved') return <CheckCircle size={14} className="text-green-600" />;
  if (s === 'pending') return <Clock size={14} className="text-yellow-600" />;
  if (s === 'denied') return <XCircle size={14} className="text-destructive" />;
  return <Info size={14} className="text-muted-foreground" />;
};

const StatusBadge = ({ s }: { s: ConsentStatus }) => {
  if (s === 'approved') return <Badge className="status-approved text-xs">Approved</Badge>;
  if (s === 'pending') return <Badge className="status-pending text-xs">Pending</Badge>;
  if (s === 'denied') return <Badge className="status-closed text-xs">Denied</Badge>;
  return <Badge variant="outline" className="text-xs text-muted-foreground">Not Requested</Badge>;
};

export default function StudentConsent() {
  const { state, requestConsent, getActiveTerm, getStudentEnrollments } = useApp();
  const { toast } = useToast();
  const me = state.currentUser!;
  const activeTerm = getActiveTerm();
  const enrollments = activeTerm ? getStudentEnrollments(me.id, activeTerm.id) : [];
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const getConsent = (sectionId: string) =>
    state.consents.find(c => c.studentId === me.id && c.sectionId === sectionId && c.termId === activeTerm?.id);

  const handleRequest = (sectionId: string, field: 'coiStatus' | 'deptConsentStatus' | 'ocsConsentStatus') => {
    requestConsent(me.id, sectionId, activeTerm!.id, field, reasons[`${sectionId}-${field}`]);
    toast({ title: 'Consent requested', description: 'Your request has been submitted.' });
    setReasons(prev => ({ ...prev, [`${sectionId}-${field}`]: '' }));
  };

  const consentSteps = [
    { key: 'coiStatus' as const, label: 'COI (Change of Initial Enlistment)', short: 'COI', desc: 'Request Change of Initial Enlistment if the section is outside normal load.' },
    { key: 'deptConsentStatus' as const, label: 'Department Consent', short: 'Dept', desc: 'Request consent from the department offering the course.' },
    { key: 'ocsConsentStatus' as const, label: 'OCS Consent', short: 'OCS', desc: 'Final consent from the Office of the College Secretary.' },
  ];

  return (
    <PortalLayout title="Consent Management">
      <div className="space-y-5">
        <div className="flex items-start gap-3 p-4 rounded-lg bg-accent border border-accent-foreground/10">
          <Info size={18} className="text-accent-foreground mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-accent-foreground">Consent Flow</p>
            <p className="text-xs text-accent-foreground/80 mt-0.5">
              For classes requiring consent: COI → Department Consent → OCS Consent. Each step must be approved before the next.
            </p>
          </div>
        </div>

        {enrollments.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground">No enlisted classes for the current term.</p>
            </CardContent>
          </Card>
        ) : (
          enrollments.map(enr => {
            const sec = state.sections.find(s => s.id === enr.sectionId);
            const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
            const faculty = sec ? state.users.find(u => u.id === sec.facultyId) : null;
            const consent = getConsent(enr.sectionId);

            return (
              <Card key={enr.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">{course?.code} — {course?.title}</CardTitle>
                  <CardDescription>Section {sec?.sectionCode} | {faculty?.name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {consentSteps.map((step, idx) => {
                      const status = consent?.[step.key] ?? 'not_requested';
                      const prevApproved = idx === 0 || (
                        idx === 1 ? consent?.coiStatus === 'approved' : consent?.deptConsentStatus === 'approved'
                      );
                      const canRequest = prevApproved && status === 'not_requested' || status === 'denied';

                      return (
                        <div key={step.key} className={`p-3 rounded-lg border transition-colors ${status === 'approved' ? 'border-green-300 bg-green-50' : status === 'pending' ? 'border-yellow-300 bg-yellow-50' : status === 'denied' ? 'border-red-300 bg-red-50' : 'border-border bg-muted/30'}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2">
                              <StatusIcon s={status} />
                              <div>
                                <p className="text-sm font-semibold text-foreground">{step.label}</p>
                                <p className="text-xs text-muted-foreground">{step.desc}</p>
                              </div>
                            </div>
                            <StatusBadge s={status} />
                          </div>

                          {canRequest && (
                            <div className="mt-3 space-y-2">
                              <Label className="text-xs text-muted-foreground">Reason / Justification (optional)</Label>
                              <Textarea
                                className="text-xs min-h-16"
                                placeholder="Enter your reason for requesting consent..."
                                value={reasons[`${enr.sectionId}-${step.key}`] ?? ''}
                                onChange={e => setReasons(prev => ({ ...prev, [`${enr.sectionId}-${step.key}`]: e.target.value }))}
                              />
                              <Button
                                size="sm"
                                className="bg-primary hover:bg-primary/90 gap-1.5 h-8 text-xs"
                                onClick={() => handleRequest(enr.sectionId, step.key)}
                              >
                                <FileText size={12} />
                                {status === 'denied' ? 'Re-request Consent' : `Request ${step.short} Consent`}
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </PortalLayout>
  );
}
