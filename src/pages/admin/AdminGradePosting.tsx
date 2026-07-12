import { useState, useMemo } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Search, ClipboardCheck, Layers, ListChecks } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import type { GradePostingType } from '@/lib/types';

export default function AdminGradePosting() {
  const { state, updateSection } = useApp();
  const activeTerm = state.terms.find(t => t.isActive);
  const [selectedTermId, setSelectedTermId] = useState(activeTerm?.id ?? state.terms[0]?.id ?? '');
  const [search, setSearch] = useState('');

  const termSections = useMemo(() => {
    // Exclude manual-grade phantom sections and lab/rec children (posting type is set on the lecture/parent only)
    const q = search.trim().toLowerCase();
    return state.sections
      .filter(s => s.termId === selectedTermId && s.sectionCode !== '__MANUAL__' && !s.parentSectionId)
      .map(s => {
        const course = state.courses.find(c => c.id === s.courseId);
        const faculty = state.users.find(u => u.id === s.facultyId);
        // Compute enrolled count live from actual enrollment records (excluding deleted
        // students) instead of trusting the stored counter, which can drift.
        const liveEnrolled = state.enrollments.filter(e =>
          e.sectionId === s.id && e.status !== 'dropped' && state.users.some(u => u.id === e.studentId)
        ).length;
        return { section: s, course, faculty, liveEnrolled };
      })
      .filter(r => r.course)
      .filter(r => {
        if (!q) return true;
        return r.course!.code.toLowerCase().includes(q) || r.course!.title.toLowerCase().includes(q) || r.section.sectionCode.toLowerCase().includes(q) || (r.faculty?.name ?? '').toLowerCase().includes(q);
      })
      .sort((a, b) => a.course!.code.localeCompare(b.course!.code) || a.section.sectionCode.localeCompare(b.section.sectionCode));
  }, [state.sections, state.courses, state.users, state.enrollments, selectedTermId, search]);

  const handleSetPostingType = (sectionId: string, postingType: GradePostingType) => {
    updateSection(sectionId, { postingType });
    toast.success(`Posting type set to ${postingType === 'batch' ? 'Batch Post' : 'Partial Post'}.`);
  };

  const batchCount = termSections.filter(r => (r.section.postingType ?? 'batch') === 'batch').length;
  const partialCount = termSections.filter(r => r.section.postingType === 'partial').length;

  return (
    <PortalLayout>
      <div className="space-y-5">
        <div className="portal-panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-bold text-lg text-foreground flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-primary" /> Grade Posting Settings
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Choose whether each class uses Batch Post (all grades released at once) or Partial Post (grades can be released individually). Default is Batch Post.
            </p>
          </div>
          <SearchableSelect
            value={selectedTermId}
            onValueChange={setSelectedTermId}
            triggerClassName="w-48 h-9"
            placeholder="Select term..."
            options={state.terms.map(t => ({ value: t.id, label: t.name }))}
          />
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Total Classes', value: termSections.length, color: 'bg-primary/10 text-primary' },
            { label: 'Batch Post', value: batchCount, color: 'bg-blue-100 text-blue-700' },
            { label: 'Partial Post', value: partialCount, color: 'bg-amber-100 text-amber-700' },
          ].map(({ label, value, color }) => (
            <div key={label} className="portal-panel p-4 text-center">
              <div className={`text-2xl font-bold ${color} rounded-xl px-2 py-1 inline-block`}>{value}</div>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by course code, title, section, or faculty..." className="pl-9 h-9 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Class list */}
        <div className="portal-panel divide-y divide-border">
          {termSections.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No classes found for this term.</p>
          ) : termSections.map(({ section, course, faculty, liveEnrolled }) => {
            const postingType: GradePostingType = section.postingType ?? 'batch';
            return (
              <div key={section.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-foreground">{course!.code} — {course!.title}</span>
                    <Badge variant="outline" className="text-[10px]">Sec {section.sectionCode}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {faculty?.name ?? 'TBA'} · {liveEnrolled} enrolled
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    variant={postingType === 'batch' ? 'default' : 'outline'}
                    className="h-8 text-xs gap-1.5"
                    onClick={() => handleSetPostingType(section.id, 'batch')}
                  >
                    <Layers className="w-3.5 h-3.5" /> Batch Post
                  </Button>
                  <Button
                    size="sm"
                    variant={postingType === 'partial' ? 'default' : 'outline'}
                    className="h-8 text-xs gap-1.5"
                    onClick={() => handleSetPostingType(section.id, 'partial')}
                  >
                    <ListChecks className="w-3.5 h-3.5" /> Partial Post
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PortalLayout>
  );
}
