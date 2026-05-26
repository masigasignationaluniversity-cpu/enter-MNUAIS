import React, { useState } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Unlock, RefreshCw, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function StudentPrerogatives() {
  const { state, requestPrerogative, cancelPrerogative, loadPrerogatives } = useApp();
  const { toast } = useToast();
  const student = state.currentUser;
  const activeTerm = state.terms.find(t => t.isActive);

  const [prgSearch, setPrgSearch] = useState('');
  const [requestingPrgSectionId, setRequestingPrgSectionId] = useState<string | null>(null);
  const [prgReason, setPrgReason] = useState('');

  if (!student) return null;
  if (!activeTerm) {
    return (
      <PortalLayout role="student" userName={student.name}>
        <div className="text-center text-muted-foreground py-12">No active term found.</div>
      </PortalLayout>
    );
  }

  const isFinalized = !!state.finalizedEnlistments.find(f => f.studentId === student.id && f.termId === activeTerm.id);
  const prerogativeOpen = activeTerm.controls.prerogativeOpen;
  const myEnrollments = state.enrollments.filter(e => e.studentId === student.id && e.termId === activeTerm.id && e.status !== 'dropped');
  const availableSections = state.sections.filter(s => s.termId === activeTerm.id);
  const myPrerogatives = state.prerogatives.filter(p => p.studentId === student.id && p.termId === activeTerm.id);

  const handlePrerogative = () => {
    if (!requestingPrgSectionId || !prgReason.trim()) return;
    requestPrerogative(student.id, requestingPrgSectionId, activeTerm.id, prgReason.trim());
    toast({ title: 'Prerogative requested', description: 'Your request has been sent to the faculty for review.' });
    setRequestingPrgSectionId(null);
    setPrgReason('');
  };

  const statusMap: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    approved: 'bg-green-100 text-green-800 border-green-200',
    denied: 'bg-red-100 text-red-800 border-red-200',
  };

  // Filtered sections for search
  const filteredSections = prgSearch.trim()
    ? availableSections.filter(s => {
        const course = state.courses.find(c => c.id === s.courseId);
        const q = prgSearch.toLowerCase();
        return course?.code.toLowerCase().includes(q) || course?.title.toLowerCase().includes(q) || s.sectionCode.toLowerCase().includes(q);
      })
    : [];

  return (
    <PortalLayout role="student" userName={student.name}>
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Unlock className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> Prerogatives
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Request enlistment in full sections for {activeTerm.name}</p>
        </div>

        {/* Status banner */}
        {prerogativeOpen
          ? <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm"><Unlock className="w-4 h-4 flex-shrink-0" /><span>Prerogative window is <strong>open</strong>. You may submit requests to full sections below.</span></div>
          : <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm"><Lock className="w-4 h-4 flex-shrink-0" /><span>Prerogative window is currently <strong>closed</strong>. Requests cannot be submitted at this time.</span></div>
        }

        {isFinalized && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-300 text-green-800 text-sm">
            <Lock className="w-4 h-4 flex-shrink-0" /><span>Your enlistment is finalized. Prerogative requests are no longer accepted.</span>
          </div>
        )}

        {/* Search full sections */}
        {!isFinalized && (
          <div className="space-y-3">
            <div className="bg-primary text-primary-foreground px-4 py-2 font-bold rounded-t-md">
              Search Full Sections
            </div>
            <div className="border border-t-0 rounded-b-md p-4 space-y-3">
              <p className="text-sm text-muted-foreground">Search for a section that is full to submit a prerogative request. The faculty-in-charge will review your request.</p>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by course code, title, or section..."
                  className="pl-9"
                  value={prgSearch}
                  onChange={e => { setPrgSearch(e.target.value); setRequestingPrgSectionId(null); }}
                />
              </div>

              {filteredSections.length === 0 && prgSearch.trim() && (
                <p className="text-center text-muted-foreground py-4 text-sm">No sections found for "{prgSearch}"</p>
              )}

              {filteredSections.length > 0 && (
                <div className="overflow-x-auto border rounded">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="font-bold">Course</TableHead>
                        <TableHead className="font-bold">Sec</TableHead>
                        <TableHead className="font-bold">Faculty</TableHead>
                        <TableHead className="font-bold">Schedule</TableHead>
                        <TableHead className="font-bold text-center">Slots</TableHead>
                        <TableHead className="font-bold">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSections.map(sec => {
                        const course = state.courses.find(c => c.id === sec.courseId);
                        const fac = state.users.find(u => u.id === sec.facultyId);
                        const isFull = sec.enrolled >= sec.slots;
                        const alreadyEnlisted = !!myEnrollments.find(e => e.sectionId === sec.id);
                        const existingPrerog = state.prerogatives.find(p => p.studentId === student.id && p.sectionId === sec.id && p.termId === activeTerm.id);
                        const isRequesting = requestingPrgSectionId === sec.id;
                        if (!course) return null;

                        return (
                          <React.Fragment key={sec.id}>
                            <TableRow className={isFull ? 'bg-red-50/30' : ''}>
                              <TableCell>
                                <p className="font-mono font-semibold text-primary text-sm">{course.code}</p>
                                <p className="text-xs text-muted-foreground max-w-[150px] truncate">{course.title}</p>
                              </TableCell>
                              <TableCell className="font-mono text-sm">{sec.sectionCode}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                <span className="truncate block max-w-[110px]">{fac?.name.split(' ').slice(-1)[0]}</span>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {sec.schedule.days.join('')} {sec.schedule.startTime}–{sec.schedule.endTime}
                              </TableCell>
                              <TableCell className="text-center">
                                <span className={`text-sm font-semibold ${isFull ? 'text-red-600' : 'text-foreground'}`}>{sec.enrolled}/{sec.slots}</span>
                                {isFull && <p className="text-xs text-red-500">FULL</p>}
                              </TableCell>
                              <TableCell>
                                {alreadyEnlisted ? (
                                  <Badge className="bg-green-100 text-green-800 text-xs border-green-200">Enlisted</Badge>
                                ) : existingPrerog ? (
                                  <Badge className={`text-xs border ${statusMap[existingPrerog.status]}`}>
                                    Req {existingPrerog.status.toUpperCase()}
                                  </Badge>
                                ) : !isFull ? (
                                  <Badge className="bg-blue-50 text-blue-700 text-xs border border-blue-200">Has slots — use Enlistment</Badge>
                                ) : sec.prerogativeAccepting === false ? (
                                  <Badge className="bg-gray-100 text-gray-600 text-xs border border-gray-300">FIC Closed</Badge>
                                ) : prerogativeOpen ? (
                                  <Button size="sm" className="h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white gap-1"
                                    onClick={() => { setRequestingPrgSectionId(isRequesting ? null : sec.id); setPrgReason(''); }}>
                                    <Unlock className="w-3 h-3" />{isRequesting ? 'Cancel' : 'Request'}
                                  </Button>
                                ) : (
                                  <Badge className="bg-gray-100 text-gray-500 text-xs">Closed</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                            {isRequesting && (
                              <TableRow className="bg-purple-50/50">
                                <TableCell colSpan={6} className="py-3 px-4">
                                  <div className="space-y-2 max-w-lg">
                                    <Label className="text-sm font-medium text-purple-900">Reason for Prerogative Request <span className="text-red-500">*</span></Label>
                                    <Textarea rows={2} className="text-sm" placeholder="e.g. This is the only section that fits my schedule..."
                                      value={prgReason} onChange={e => setPrgReason(e.target.value)} />
                                    <div className="flex gap-2">
                                      <Button size="sm" className="bg-purple-700 hover:bg-purple-800 text-white gap-1 h-8"
                                        disabled={!prgReason.trim()} onClick={handlePrerogative}>
                                        <Unlock className="w-3 h-3" /> Submit Request
                                      </Button>
                                      <Button size="sm" variant="outline" className="h-8"
                                        onClick={() => { setRequestingPrgSectionId(null); setPrgReason(''); }}>Cancel</Button>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* My Prerogative Requests */}
        <div className="space-y-3">
          <div className="bg-primary text-primary-foreground px-4 py-2 font-bold rounded-t-md flex items-center justify-between">
            <span>My Prerogative Requests</span>
            <Button size="sm" variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10 h-7 text-xs gap-1"
              onClick={() => loadPrerogatives()}>
              <RefreshCw className="w-3 h-3" /> Refresh
            </Button>
          </div>
          <div className="border border-t-0 rounded-b-md">
            {myPrerogatives.length === 0 ? (
              <div className="py-10 text-center">
                <Unlock className="w-8 h-8 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No prerogative requests yet.</p>
                <p className="text-muted-foreground text-sm mt-1">Search for a full section above to submit a request.</p>
              </div>
            ) : (
              <div className="divide-y">
                {myPrerogatives.map(prg => {
                  const sec = state.sections.find(s => s.id === prg.sectionId);
                  const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
                  const fac = sec ? state.users.find(u => u.id === sec.facultyId) : null;
                  return (
                    <div key={prg.id} className="flex items-start justify-between gap-3 px-4 py-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{course?.code} — {course?.title}</p>
                        <p className="text-xs text-muted-foreground">Section {sec?.sectionCode} • {fac?.name}</p>
                        <p className="text-xs text-muted-foreground">Slots: {sec?.enrolled}/{sec?.slots}</p>
                        <p className="text-xs italic text-muted-foreground mt-1">"{prg.reason}"</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Requested: {prg.requestedAt}</p>
                        {prg.processedAt && <p className="text-xs text-muted-foreground">Processed: {prg.processedAt}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge className={`text-xs border ${statusMap[prg.status]}`}>{prg.status.toUpperCase()}</Badge>
                        {prg.status === 'approved' && (
                          <p className="text-xs text-green-600 font-medium">Approved — go to Enlistment to enlist</p>
                        )}
                        {prg.status === 'pending' && (
                          <Button size="sm" variant="outline" className="h-6 text-xs border-red-300 text-red-600 hover:bg-red-50"
                            onClick={() => cancelPrerogative(prg.id)}>Cancel Request</Button>
                        )}
                      </div>
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
