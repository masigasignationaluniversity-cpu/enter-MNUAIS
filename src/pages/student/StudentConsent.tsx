import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { CheckCircle, Clock, XCircle, FileText, Info, Search } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import type { ConsentStatus } from '../../lib/types';

const StatusBadge = ({ s }: { s: ConsentStatus }) => {
  if (s === 'approved') return <Badge className="bg-green-100 text-green-800 border-green-200 gap-1"><CheckCircle className="w-3 h-3" />Approved</Badge>;
  if (s === 'pending') return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
  if (s === 'denied') return <Badge className="bg-red-100 text-red-800 border-red-200 gap-1"><XCircle className="w-3 h-3" />Denied</Badge>;
  return <Badge variant="outline" className="text-muted-foreground text-xs">Not Requested</Badge>;
};

type ConsentField = 'coiStatus' | 'deptConsentStatus' | 'ocsConsentStatus';

interface ConsentTab {
  key: ConsentField;
  label: string;
  short: string;
  desc: string;
  requiresField: 'requiresCOI' | 'requiresDeptConsent' | 'requiresOCSConsent';
  color: string;
}

const TABS: ConsentTab[] = [
  {
    key: 'coiStatus',
    label: 'COI',
    short: 'COI',
    desc: 'Consent of Instructor — required by the faculty teaching the section.',
    requiresField: 'requiresCOI',
    color: 'text-amber-700',
  },
  {
    key: 'deptConsentStatus',
    label: 'Dept Consent',
    short: 'DC',
    desc: 'Department Consent — required by the department offering the course.',
    requiresField: 'requiresDeptConsent',
    color: 'text-orange-700',
  },
  {
    key: 'ocsConsentStatus',
    label: 'OCS Consent',
    short: 'OCS',
    desc: 'OCS Consent — final approval by the Office of the College Secretary.',
    requiresField: 'requiresOCSConsent',
    color: 'text-red-700',
  },
];

export default function StudentConsent() {
  const { state, requestConsent, getActiveTerm } = useApp();
  const { toast } = useToast();
  const [search, setSearch] = useState<Record<string, string>>({ coiStatus: '', deptConsentStatus: '', ocsConsentStatus: '' });
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [applying, setApplying] = useState<Record<string, boolean>>({});

  const me = state.currentUser;
  if (!me) return null;
  const activeTerm = getActiveTerm();

  const getConsent = (sectionId: string) =>
    state.consents.find(c => c.studentId === me.id && c.sectionId === sectionId && c.termId === activeTerm?.id);

  const handleRequest = (sectionId: string, field: ConsentField) => {
    if (!activeTerm) return;
    requestConsent(me.id, sectionId, activeTerm.id, field, reasons[`${sectionId}-${field}`]);
    toast({ title: 'Consent requested', description: 'Your request has been submitted for review.' });
    setReasons(prev => ({ ...prev, [`${sectionId}-${field}`]: '' }));
    setApplying(prev => ({ ...prev, [`${sectionId}-${field}`]: false }));
  };

  const renderTab = (tab: ConsentTab) => {
    const q = search[tab.key] ?? '';

    // All sections in the active term whose course requires this consent
    const relevantSections = activeTerm
      ? state.sections
          .filter(sec => sec.termId === activeTerm.id)
          .filter(sec => {
            const course = state.courses.find(c => c.id === sec.courseId);
            return course?.[tab.requiresField] === true;
          })
          .filter(sec => {
            if (!q) return true;
            const course = state.courses.find(c => c.id === sec.courseId);
            return (
              course?.code.toLowerCase().includes(q.toLowerCase()) ||
              course?.title.toLowerCase().includes(q.toLowerCase()) ||
              sec.sectionCode.toLowerCase().includes(q.toLowerCase())
            );
          })
      : [];

    return (
      <div className="space-y-4">
        {/* Info */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/50 border border-accent-foreground/10">
          <Info className="w-4 h-4 text-accent-foreground mt-0.5 flex-shrink-0" />
          <p className="text-sm text-accent-foreground/80">{tab.desc}</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={`Search courses requiring ${tab.short}…`}
            className="pl-9"
            value={q}
            onChange={e => setSearch(prev => ({ ...prev, [tab.key]: e.target.value }))}
          />
        </div>

        {/* Section list */}
        {!activeTerm ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No active term.</CardContent></Card>
        ) : relevantSections.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <p className="font-medium">No courses found requiring {tab.short}.</p>
              {q && <p className="text-sm mt-1">Try a different search term.</p>}
            </CardContent>
          </Card>
        ) : (
          relevantSections.map(sec => {
            const course = state.courses.find(c => c.id === sec.courseId);
            const faculty = state.users.find(u => u.id === sec.facultyId);
            const consent = getConsent(sec.id);
            const status = consent?.[tab.key] ?? 'not_requested';
            const isApplying = applying[`${sec.id}-${tab.key}`];
            const canRequest = status === 'not_requested' || status === 'denied';

            return (
              <Card key={sec.id} className={`border-l-4 ${status === 'approved' ? 'border-l-green-500' : status === 'pending' ? 'border-l-yellow-400' : status === 'denied' ? 'border-l-red-400' : 'border-l-gray-300'}`}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-semibold text-primary text-sm">{course?.code}</span>
                        <span className="text-sm font-medium truncate">{course?.title}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
                        <p>Section {sec.sectionCode} • {faculty?.name ?? 'TBA'} • {sec.enrolled}/{sec.slots} slots</p>
                        <p>{sec.schedule.days.join('')} {sec.schedule.startTime}–{sec.schedule.endTime} • {sec.schedule.room}</p>
                        {sec.labSchedule && <p>Lab: {sec.labSchedule.days.join('')} {sec.labSchedule.startTime}–{sec.labSchedule.endTime}</p>}
                        {(course?.prerequisites?.length ?? 0) > 0 && (
                          <p>Prereq: {course!.prerequisites!.map(id => state.courses.find(c => c.id === id)?.code ?? id).join(', ')}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <StatusBadge s={status} />
                      {canRequest && !isApplying && (
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-primary text-primary-foreground gap-1"
                          onClick={() => setApplying(prev => ({ ...prev, [`${sec.id}-${tab.key}`]: true }))}
                        >
                          <FileText className="w-3 h-3" />
                          {status === 'denied' ? 'Re-apply' : 'Apply'}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Apply form */}
                  {isApplying && (
                    <div className="mt-3 pt-3 border-t border-dashed space-y-2">
                      <Label className="text-xs text-muted-foreground">Reason / Justification (optional)</Label>
                      <Textarea
                        className="text-xs min-h-16"
                        placeholder={`State your reason for requesting ${tab.short} consent…`}
                        value={reasons[`${sec.id}-${tab.key}`] ?? ''}
                        onChange={e => setReasons(prev => ({ ...prev, [`${sec.id}-${tab.key}`]: e.target.value }))}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => setApplying(prev => ({ ...prev, [`${sec.id}-${tab.key}`]: false }))}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-primary text-primary-foreground gap-1"
                          onClick={() => handleRequest(sec.id, tab.key)}
                        >
                          <FileText className="w-3 h-3" />
                          Submit Request
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    );
  };

  // Summary counts per tab
  const getCounts = (tab: ConsentTab) => {
    if (!activeTerm) return { total: 0, pending: 0 };
    const relevant = state.sections.filter(sec => {
      if (sec.termId !== activeTerm.id) return false;
      const course = state.courses.find(c => c.id === sec.courseId);
      return course?.[tab.requiresField] === true;
    });
    const pending = relevant.filter(sec => {
      const consent = getConsent(sec.id);
      return (consent?.[tab.key] ?? 'not_requested') === 'pending';
    }).length;
    return { total: relevant.length, pending };
  };

  return (
    <PortalLayout title="Consent Management">
      <div className="space-y-5">
        {/* Flow banner */}
        <div className="flex items-start gap-3 p-4 rounded-lg bg-accent border border-accent-foreground/10">
          <Info className="w-4 h-4 text-accent-foreground mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-accent-foreground">Consent Flow</p>
            <p className="text-xs text-accent-foreground/80 mt-0.5">
              Apply for required consents before you can enlist in that course.
              <span className="mx-1 font-medium text-amber-700">COI</span>→
              <span className="mx-1 font-medium text-orange-700">Dept Consent</span>→
              <span className="mx-1 font-medium text-red-700">OCS Consent</span>.
              Each must be approved before you can enlist.
            </p>
          </div>
        </div>

        <Tabs defaultValue="coiStatus">
          <TabsList className="grid grid-cols-3 w-full">
            {TABS.map(tab => {
              const { pending } = getCounts(tab);
              return (
                <TabsTrigger key={tab.key} value={tab.key} className="gap-2">
                  <span className={tab.color + ' font-semibold'}>{tab.label}</span>
                  {pending > 0 && <Badge className="bg-yellow-100 text-yellow-800 text-xs h-4 px-1">{pending}</Badge>}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {TABS.map(tab => (
            <TabsContent key={tab.key} value={tab.key} className="mt-4">
              {renderTab(tab)}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </PortalLayout>
  );
}
