import { useState } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Unlock, RefreshCw, Lock, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const statusCls: Record<string, string> = {
  pending:  'bg-yellow-100 text-yellow-800 border-yellow-200',
  approved: 'bg-green-100 text-green-800 border-green-200',
  denied:   'bg-red-100 text-red-800 border-red-200',
};

const StatusBadge = ({ s }: { s: string }) => {
  if (s === 'approved') return <Badge className="bg-green-100 text-green-800 border-green-200 gap-1 text-xs"><CheckCircle className="w-3 h-3" />Approved</Badge>;
  if (s === 'pending')  return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 gap-1 text-xs"><Clock className="w-3 h-3" />Pending</Badge>;
  if (s === 'denied')   return <Badge className="bg-red-100 text-red-800 border-red-200 gap-1 text-xs"><XCircle className="w-3 h-3" />Denied</Badge>;
  return <Badge variant="outline" className="text-muted-foreground text-xs">—</Badge>;
};

export default function StudentPrerogatives() {
  const { state, requestPrerogative, cancelPrerogative, loadPrerogatives } = useApp();
  const { toast } = useToast();
  const student = state.currentUser;
  const activeTerm = state.terms.find(t => t.isActive);

  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [remarks, setRemarks] = useState('');

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
  const myPrerogatives = state.prerogatives.filter(p => p.studentId === student.id && p.termId === activeTerm.id);

  // All unique courses with sections in active term
  const availableCourses = Array.from(
    new Map(
      state.sections
        .filter(s => s.termId === activeTerm.id)
        .map(s => state.courses.find(c => c.id === s.courseId))
        .filter((c): c is NonNullable<typeof c> => !!c)
        .map(c => [c.id, c])
    ).values()
  );

  // Sections for selected course
  const sectionsForCourse = selectedCourseId
    ? state.sections.filter(s => s.termId === activeTerm.id && s.courseId === selectedCourseId)
    : [];

  const selSection = state.sections.find(s => s.id === selectedSectionId);
  const selCourse = state.courses.find(c => c.id === selectedCourseId);
  const selFaculty = selSection ? state.users.find(u => u.id === selSection.facultyId) : undefined;
  const isFull = selSection ? selSection.enrolled >= selSection.slots : false;
  const alreadyEnlisted = !!myEnrollments.find(e => e.sectionId === selectedSectionId);
  const existingPrerog = myPrerogatives.find(p => p.sectionId === selectedSectionId);
  const fic_accepting = selSection?.prerogativeAccepting !== false;

  const canSubmit = !isFinalized && prerogativeOpen && selectedSectionId && isFull && !alreadyEnlisted && !existingPrerog && fic_accepting && remarks.trim().length > 0;

  const getActionLabel = () => {
    if (!selectedSectionId) return { text: 'Unavailable', color: 'text-muted-foreground' };
    if (alreadyEnlisted)    return { text: 'Already Enlisted', color: 'text-green-600' };
    if (existingPrerog)     return { text: existingPrerog.status.charAt(0).toUpperCase() + existingPrerog.status.slice(1), color: existingPrerog.status === 'approved' ? 'text-green-600' : existingPrerog.status === 'denied' ? 'text-red-500' : 'text-yellow-600' };
    if (!isFull)            return { text: 'Section Not Full', color: 'text-blue-500' };
    if (!fic_accepting)     return { text: 'FIC Closed', color: 'text-orange-500' };
    if (!prerogativeOpen)   return { text: 'Window Closed', color: 'text-red-500' };
    if (!remarks.trim())    return { text: 'Add Remarks', color: 'text-muted-foreground' };
    return null; // means show Submit button
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    requestPrerogative(student.id, selectedSectionId, activeTerm.id, remarks.trim());
    toast({ title: 'Prerogative requested', description: 'Your request has been sent to the faculty for review.' });
    setSelectedCourseId('');
    setSelectedSectionId('');
    setRemarks('');
  };

  return (
    <PortalLayout role="student" userName={student.name}>
      <div className="space-y-4">

        {/* Page header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Unlock className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> Prerogatives
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Request enlistment in full sections for {activeTerm.name}</p>
        </div>

        {/* Status banner */}
        {prerogativeOpen
          ? <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">
              <Unlock className="w-4 h-4 flex-shrink-0" />
              <span>Prerogative window is <strong>open</strong>. You may submit requests to full sections below.</span>
            </div>
          : <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
              <Lock className="w-4 h-4 flex-shrink-0" />
              <span>Prerogative window is currently <strong>closed</strong>. Requests cannot be submitted at this time.</span>
            </div>
        }

        {isFinalized && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-green-50 border border-green-300 text-green-800 text-sm">
            <Lock className="w-4 h-4 flex-shrink-0" />
            <span>Your enlistment is finalized. Prerogative requests are no longer accepted.</span>
          </div>
        )}

        {/* Search Full Sections */}
        {!isFinalized && (
          <div className="rounded-md overflow-hidden border border-border">
            <div className="bg-primary text-primary-foreground px-4 py-2.5 font-bold text-sm">
              Search Full Sections
            </div>
            <div className="bg-background">
              <p className="px-4 pt-3 pb-1 text-xs text-muted-foreground">
                Select a course and section below. The faculty-in-charge will review your request.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-t border-b bg-muted/20">
                      <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Course</th>
                      <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Section</th>
                      <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Description</th>
                      <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Faculty-in-Charge</th>
                      <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Consent</th>
                      <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Status</th>
                      <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Remarks/Appeal</th>
                      <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b bg-background hover:bg-muted/10">
                      {/* Course */}
                      <td className="px-3 py-2 align-top">
                        <Select
                          value={selectedCourseId || '__none__'}
                          onValueChange={v => { setSelectedCourseId(v === '__none__' ? '' : v); setSelectedSectionId(''); setRemarks(''); }}
                        >
                          <SelectTrigger className="h-8 text-xs w-36">
                            <SelectValue placeholder="" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">— Select Course —</SelectItem>
                            {availableCourses.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      {/* Section */}
                      <td className="px-3 py-2 align-top">
                        <Select
                          value={selectedSectionId || '__none__'}
                          onValueChange={v => { setSelectedSectionId(v === '__none__' ? '' : v); setRemarks(''); }}
                          disabled={!selectedCourseId}
                        >
                          <SelectTrigger className="h-8 text-xs w-36">
                            <SelectValue placeholder="Choose a section" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Choose a section</SelectItem>
                            {sectionsForCourse.map(s => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.sectionCode} ({s.enrolled}/{s.slots})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      {/* Description */}
                      <td className="px-3 py-2 align-top text-xs text-muted-foreground max-w-[150px]">
                        {selCourse ? <span className="line-clamp-2">{selCourse.title}</span> : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      {/* FIC */}
                      <td className="px-3 py-2 align-top text-xs text-muted-foreground whitespace-nowrap">
                        {selFaculty?.name ?? <span className="text-muted-foreground/40">—</span>}
                      </td>
                      {/* Consent */}
                      <td className="px-3 py-2 align-top">
                        <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs">Prerogative</Badge>
                      </td>
                      {/* Status */}
                      <td className="px-3 py-2 align-top">
                        {selectedSectionId && isFull
                          ? <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">FULL</Badge>
                          : selectedSectionId
                            ? <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs">Available</Badge>
                            : <span className="text-muted-foreground/40 text-xs">—</span>}
                      </td>
                      {/* Remarks */}
                      <td className="px-3 py-2 align-top w-52">
                        <Textarea
                          className="text-xs min-h-[60px] resize-none"
                          placeholder="limit to 280 characters"
                          maxLength={280}
                          value={remarks}
                          onChange={e => setRemarks(e.target.value)}
                          disabled={!selectedSectionId}
                        />
                        {remarks.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5 text-right">{remarks.length}/280</p>
                        )}
                      </td>
                      {/* Action */}
                      <td className="px-3 py-2 align-top whitespace-nowrap">
                        {(() => {
                          const lbl = getActionLabel();
                          if (!lbl) {
                            return (
                              <Button size="sm" className="h-7 text-xs bg-purple-700 hover:bg-purple-800 text-white" onClick={handleSubmit}>
                                Submit
                              </Button>
                            );
                          }
                          return <span className={`text-xs italic ${lbl.color}`}>{lbl.text}</span>;
                        })()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* My Prerogative Requests */}
        <div className="rounded-md overflow-hidden border border-border">
          <div className="bg-primary text-primary-foreground px-4 py-2.5 font-bold text-sm flex items-center justify-between">
            <span>My Prerogative Requests</span>
            <Button size="sm" variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10 h-7 text-xs gap-1"
              onClick={() => loadPrerogatives()}>
              <RefreshCw className="w-3 h-3" /> Refresh
            </Button>
          </div>
          <div className="bg-background">
            {myPrerogatives.length === 0 ? (
              <div className="py-12 text-center">
                <Unlock className="w-8 h-8 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground font-medium">No prerogative requests yet.</p>
                <p className="text-muted-foreground text-sm mt-1">Search for a full section above to submit a request.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/20">
                      <th className="text-left font-bold px-3 py-2.5 text-xs">Course</th>
                      <th className="text-left font-bold px-3 py-2.5 text-xs">Section</th>
                      <th className="text-left font-bold px-3 py-2.5 text-xs">Description</th>
                      <th className="text-left font-bold px-3 py-2.5 text-xs">Faculty-in-Charge</th>
                      <th className="text-left font-bold px-3 py-2.5 text-xs">Consent</th>
                      <th className="text-left font-bold px-3 py-2.5 text-xs">Status</th>
                      <th className="text-left font-bold px-3 py-2.5 text-xs">Remarks/Appeal</th>
                      <th className="text-left font-bold px-3 py-2.5 text-xs">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myPrerogatives.map(prg => {
                      const sec = state.sections.find(s => s.id === prg.sectionId);
                      const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
                      const fac = sec ? state.users.find(u => u.id === sec.facultyId) : null;
                      return (
                        <tr key={prg.id} className="border-b last:border-0 hover:bg-muted/10">
                          <td className="px-3 py-2 text-xs font-mono font-semibold text-primary">{course?.code ?? '—'}</td>
                          <td className="px-3 py-2 text-xs">{sec?.sectionCode ?? '—'}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground max-w-[150px]">
                            <span className="line-clamp-2">{course?.title ?? '—'}</span>
                          </td>
                          <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{fac?.name ?? 'TBA'}</td>
                          <td className="px-3 py-2">
                            <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs">Prerogative</Badge>
                          </td>
                          <td className="px-3 py-2"><StatusBadge s={prg.status} /></td>
                          <td className="px-3 py-2 text-xs italic text-muted-foreground max-w-[180px]">
                            {prg.reason ? `"${prg.reason}"` : '—'}
                          </td>
                          <td className="px-3 py-2 text-xs whitespace-nowrap">
                            {prg.status === 'approved' ? (
                              <span className="text-green-600 font-medium">Go to Enlistment</span>
                            ) : prg.status === 'pending' ? (
                              <Button size="sm" variant="outline" className="h-6 text-xs border-red-300 text-red-600 hover:bg-red-50"
                                onClick={() => cancelPrerogative(prg.id)}>Cancel</Button>
                            ) : (
                              <span className="text-muted-foreground italic">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </PortalLayout>
  );
}
