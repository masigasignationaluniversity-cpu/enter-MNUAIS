import { useState } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, Clock, Unlock, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { PrerogativeStatus } from '@/lib/types';

const statusBadge = (s: PrerogativeStatus) => {
  const map = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    approved: 'bg-green-100 text-green-800 border-green-200',
    denied: 'bg-red-100 text-red-800 border-red-200',
  };
  return <Badge className={`text-xs ${map[s]}`}>{s.toUpperCase()}</Badge>;
};

export default function FacultyPrerogatives() {
  const { state, processPrerogative, updateSection } = useApp();
  const { toast } = useToast();
  const faculty = state.currentUser;
  if (!faculty) return null;

  // Sections assigned to this faculty
  const mySections = state.sections.filter(s => s.facultyId === faculty.id);
  const mySectionIds = mySections.map(s => s.id);
  const activeTerm = state.terms.find(t => t.isActive);

  const myPrerogatives = state.prerogatives.filter(p => mySectionIds.includes(p.sectionId));
  const pending = myPrerogatives.filter(p => p.status === 'pending');
  const processed = myPrerogatives.filter(p => p.status !== 'pending');

  const prerogOpen = activeTerm?.controls.prerogativeOpen ?? false;

  const handleTogglePrerogativeAccepting = (sectionId: string, currentValue: boolean | undefined) => {
    const newValue = currentValue === false ? true : false;
    updateSection(sectionId, { prerogativeAccepting: newValue });
    toast({
      title: newValue ? 'Prerogative requests opened' : 'Prerogative requests closed',
      description: newValue
        ? 'Students can now submit prerogative requests for this section.'
        : 'Students can no longer submit prerogative requests for this section.',
    });
  };

  const getStudent = (id: string) => state.users.find(u => u.id === id);
  const getSection = (id: string) => state.sections.find(s => s.id === id);
  const getCourse = (secId: string) => {
    const sec = state.sections.find(s => s.id === secId);
    return sec ? state.courses.find(c => c.id === sec.courseId) : undefined;
  };

  const PrgCard = ({ prg, canAct }: { prg: typeof myPrerogatives[0]; canAct: boolean }) => {
    const student = getStudent(prg.studentId);
    const section = getSection(prg.sectionId);
    const course = getCourse(prg.sectionId);
    if (!student || !section || !course) return null;
    return (
      <Card className="portal-card">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
                  {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <p className="font-semibold">{student.name}</p>
                  <p className="text-xs text-gray-500">{student.studentNumber} • {student.program}</p>
                </div>
              </div>
              <p className="text-sm font-medium text-primary">{course.code} — {course.title}</p>
              <p className="text-xs text-gray-500">Section {section.sectionCode} • Slots: {section.enrolled}/{section.slots}</p>
              <div className="mt-2 p-2 bg-gray-50 rounded text-sm italic text-gray-700 border-l-2 border-primary">
                "{prg.reason}"
              </div>
              <p className="text-xs text-gray-400 mt-1">Requested: {prg.requestedAt}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {statusBadge(prg.status)}
              {canAct && prg.status === 'pending' && prerogOpen && (
                <div className="flex gap-2">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1 h-8"
                    onClick={() => processPrerogative(prg.id, 'approved', faculty.id)}>
                    <CheckCircle className="w-3 h-3" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 gap-1 h-8"
                    onClick={() => processPrerogative(prg.id, 'denied', faculty.id)}>
                    <XCircle className="w-3 h-3" /> Deny
                  </Button>
                </div>
              )}
              {prg.status === 'pending' && !prerogOpen && (
                <p className="text-xs text-red-500">Prerogatives closed</p>
              )}
              {prg.processedAt && (
                <p className="text-xs text-gray-400">Processed: {prg.processedAt}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <PortalLayout role="faculty" userName={faculty.name}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Unlock className="w-6 h-6 text-primary" /> Prerogatives
            </h1>
            <p className="text-gray-600 mt-1">Review student requests to enlist in your full sections</p>
          </div>
          {prerogOpen
            ? <Badge className="bg-green-100 text-green-800 text-sm px-3 py-1">Prerogatives Open</Badge>
            : <Badge className="bg-red-100 text-red-800 text-sm px-3 py-1">Prerogatives Closed</Badge>}
        </div>

        {/* Per-section prerogative accepting toggles */}
        {mySections.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary" />
                Section Prerogative Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                Control whether students can submit prerogative requests for each of your sections. When closed, no new requests will be accepted even if the global prerogative window is open.
              </p>
              <div className="space-y-2">
                {mySections.map(sec => {
                  const course = state.courses.find(c => c.id === sec.courseId);
                  const term = state.terms.find(t => t.id === sec.termId);
                  const isAccepting = sec.prerogativeAccepting !== false; // default true if undefined
                  return (
                    <div key={sec.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                      <div>
                        <p className="text-sm font-medium">{course?.code} — Section {sec.sectionCode}</p>
                        <p className="text-xs text-muted-foreground">{term?.name} · {sec.enrolled}/{sec.slots} slots</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-medium ${isAccepting ? 'text-green-600' : 'text-red-500'}`}>
                          {isAccepting ? 'Accepting' : 'Closed'}
                        </span>
                        <Switch
                          checked={isAccepting}
                          onCheckedChange={() => handleTogglePrerogativeAccepting(sec.id, sec.prerogativeAccepting)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Pending', count: pending.length, color: 'text-yellow-600 bg-yellow-50', icon: Clock },
            { label: 'Approved', count: processed.filter(p => p.status === 'approved').length, color: 'text-green-600 bg-green-50', icon: CheckCircle },
            { label: 'Denied', count: processed.filter(p => p.status === 'denied').length, color: 'text-red-600 bg-red-50', icon: XCircle },
          ].map(s => (
            <Card key={s.label} className={`${s.color} border-0`}>
              <CardContent className="pt-4 pb-4 text-center">
                <p className={`text-2xl font-bold ${s.color.split(' ')[0]}`}>{s.count}</p>
                <p className="text-xs text-gray-600 mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">
              Pending {pending.length > 0 && <Badge className="ml-2 bg-yellow-500 text-white text-xs">{pending.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="all">All ({myPrerogatives.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4 space-y-3">
            {pending.length === 0
              ? <p className="text-gray-400 text-center py-8">No pending prerogative requests for your sections.</p>
              : pending.map(p => <PrgCard key={p.id} prg={p} canAct />)
            }
          </TabsContent>

          <TabsContent value="all" className="mt-4 space-y-3">
            {myPrerogatives.length === 0
              ? <p className="text-gray-400 text-center py-8">No prerogative records for your sections.</p>
              : myPrerogatives.map(p => <PrgCard key={p.id} prg={p} canAct={p.status === 'pending'} />)
            }
          </TabsContent>
        </Tabs>
      </div>
    </PortalLayout>
  );
}
