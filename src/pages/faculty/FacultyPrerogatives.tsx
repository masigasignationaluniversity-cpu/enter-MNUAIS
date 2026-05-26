import { useState } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, Clock, Unlock, Settings, BookOpen, ChevronDown, ChevronUp, Users } from 'lucide-react';
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

  const activeTerm = state.terms.find(t => t.isActive);
  const [termFilter, setTermFilter] = useState(activeTerm?.id ?? state.terms[0]?.id ?? '');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  if (!faculty) return null;

  const toggleSection = (id: string) =>
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });

  // Sections assigned to this faculty in the selected term
  const mySections = state.sections.filter(
    s => s.facultyId === faculty.id && s.termId === termFilter
  );

  const selectedTerm = state.terms.find(t => t.id === termFilter);
  const prerogOpen = selectedTerm?.controls.prerogativeOpen ?? false;

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

  // Get prerogatives for a given section
  const getSectionPrerogatives = (sectionId: string) =>
    state.prerogatives.filter(p => p.sectionId === sectionId);

  // Summary counts for the selected term
  const termSectionIds = new Set(mySections.map(s => s.id));
  const termPrerogatives = state.prerogatives.filter(p => termSectionIds.has(p.sectionId));
  const totalPending = termPrerogatives.filter(p => p.status === 'pending').length;
  const totalApproved = termPrerogatives.filter(p => p.status === 'approved').length;
  const totalDenied = termPrerogatives.filter(p => p.status === 'denied').length;

  interface SectionCardProps {
    sectionId: string;
  }

  const SectionCard = ({ sectionId }: SectionCardProps) => {
    const sec = state.sections.find(s => s.id === sectionId);
    if (!sec) return null;
    const course = state.courses.find(c => c.id === sec.courseId);
    if (!course) return null;

    const progs = getSectionPrerogatives(sectionId);
    const pendingCount = progs.filter(p => p.status === 'pending').length;
    const isExpanded = expandedSections.has(sectionId);
    const isAccepting = sec.prerogativeAccepting !== false;

    return (
      <Card className="portal-card">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-start gap-3">
            {/* Collapsible header */}
            <button
              className="flex items-center gap-3 flex-1 text-left min-w-0"
              onClick={() => toggleSection(sectionId)}
            >
              <BookOpen className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-foreground">{course.code}</span>
                  <Badge variant="outline" className="text-xs">{sec.sectionCode}</Badge>
                  {pendingCount > 0 && (
                    <Badge className="text-xs bg-yellow-100 text-yellow-800 border-yellow-200">
                      {pendingCount} pending
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{course.title}</p>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{sec.enrolled}/{sec.slots} slots</span>
                  <span>{course.units} unit{course.units !== 1 ? 's' : ''}</span>
                  <span>{progs.length} request{progs.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
              {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
            </button>
            {/* Toggle switch */}
            <div className="flex items-center gap-2 flex-shrink-0 ml-1">
              <span className={`text-xs font-medium ${isAccepting ? 'text-green-600' : 'text-red-500'}`}>
                {isAccepting ? 'Accepting' : 'Closed'}
              </span>
              <Switch
                checked={isAccepting}
                onCheckedChange={() => handleTogglePrerogativeAccepting(sectionId, sec.prerogativeAccepting)}
              />
            </div>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="px-4 pt-0 pb-3">
            {progs.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No prerogative requests for this section.
              </p>
            ) : (
              <div className="space-y-3">
                {/* Pending first */}
                {[...progs].sort((a, b) => (a.status === 'pending' ? -1 : 1) - (b.status === 'pending' ? -1 : 1)).map(prg => {
                  const student = getStudent(prg.studentId);
                  if (!student) return null;
                  return (
                    <div key={prg.id} className="flex items-start gap-3 py-3 border-b last:border-0 flex-wrap">
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {student.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm text-foreground">{student.name}</p>
                          <p className="text-xs text-muted-foreground">{student.studentNumber ?? student.username}</p>
                        </div>
                        {student.program && <p className="text-xs text-muted-foreground truncate">{student.program}</p>}
                        <div className="mt-1.5 px-2 py-1 bg-muted/40 rounded text-xs italic text-muted-foreground border-l-2 border-primary">
                          "{prg.reason}"
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Requested: {prg.requestedAt}</p>
                        {prg.processedAt && (
                          <p className="text-xs text-muted-foreground">Processed: {prg.processedAt}</p>
                        )}
                      </div>
                      {/* Status + actions */}
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        {statusBadge(prg.status)}
                        {prg.status === 'pending' && prerogOpen && isAccepting && (
                          <div className="flex gap-1.5">
                            <Button size="sm" className="h-6 px-2 bg-green-600 text-white hover:bg-green-700 gap-1 text-xs"
                              onClick={() => processPrerogative(prg.id, 'approved', faculty.id)}>
                              <CheckCircle className="w-3 h-3" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" className="h-6 px-2 border-red-300 text-red-600 hover:bg-red-50 gap-1 text-xs"
                              onClick={() => processPrerogative(prg.id, 'denied', faculty.id)}>
                              <XCircle className="w-3 h-3" /> Deny
                            </Button>
                          </div>
                        )}
                        {prg.status === 'pending' && !prerogOpen && (
                          <p className="text-xs text-red-500">Window closed</p>
                        )}
                        {prg.status === 'pending' && prerogOpen && !isAccepting && (
                          <p className="text-xs text-orange-500">Section closed</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <PortalLayout role="faculty" userName={faculty.name}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start sm:items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <Unlock className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> Prerogatives
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Review student requests to enlist in your full sections
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap w-full sm:w-auto">
            {prerogOpen
              ? <Badge className="bg-green-100 text-green-800 text-xs px-3 py-1">Prerogatives Open</Badge>
              : <Badge className="bg-red-100 text-red-800 text-xs px-3 py-1">Prerogatives Closed</Badge>}
            <Select value={termFilter} onValueChange={v => { setTermFilter(v); setExpandedSections(new Set()); }}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Select semester" />
              </SelectTrigger>
              <SelectContent>
                {state.terms.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}{t.isActive ? ' (Active)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Pending', count: totalPending, color: 'text-yellow-600', bg: 'bg-yellow-50', Icon: Clock },
            { label: 'Approved', count: totalApproved, color: 'text-green-600', bg: 'bg-green-50', Icon: CheckCircle },
            { label: 'Denied', count: totalDenied, color: 'text-red-600', bg: 'bg-red-50', Icon: XCircle },
          ].map(s => (
            <Card key={s.label} className={`${s.bg} border-0`}>
              <CardContent className="pt-3 pb-3 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Section Prerogative Settings info */}
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-muted/40 border text-xs text-muted-foreground">
          <Settings className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-primary" />
          <span>Use the <strong>Accepting / Closed</strong> toggle on each section card to control whether students can submit prerogative requests, even when the global window is open.</span>
        </div>

        {/* Course sections */}
        {mySections.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <BookOpen className="w-8 h-8 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground font-medium">No sections assigned for this semester.</p>
              <p className="text-muted-foreground text-sm mt-1">Select a different semester or contact admin to assign sections.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {mySections.map(s => (
              <SectionCard key={s.id} sectionId={s.id} />
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
