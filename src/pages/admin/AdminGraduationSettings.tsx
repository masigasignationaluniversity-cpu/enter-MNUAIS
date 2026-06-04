import { useState } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X, Search, GraduationCap, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { GraduationRequirements } from '@/lib/types';

function emptyGlobal(): GraduationRequirements {
  return {
    collegeId: 'global',
    requiredGeCourseIds: [],
    requiredHkPeNstpCourseIds: [],
    requiredElectiveGeCourseIds: [],
    maxElectiveGe: 0,
    requiredMajorCourseIds: [],
    maxMajor: 0,
    requiredSpecializedCourseIds: [],
    maxSpecialized: 0,
    requiredThesisCourseIds: [],
    maxThesis: 0,
  };
}

export default function AdminGraduationSettings() {
  const { state, saveGraduationRequirements } = useApp();
  const globalReq = state.graduationRequirements.find(r => r.collegeId === 'global') ?? emptyGlobal();

  const [draft, setDraft] = useState<GraduationRequirements>({ ...globalReq });
  const [geSearch, setGeSearch] = useState('');
  const [hkSearch, setHkSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // Clean stale IDs before saving
    const cleanDraft = {
      ...draft,
      requiredGeCourseIds: draft.requiredGeCourseIds.filter(id => state.courses.find(c => c.id === id)),
      requiredHkPeNstpCourseIds: draft.requiredHkPeNstpCourseIds.filter(id => state.courses.find(c => c.id === id)),
    };
    await saveGraduationRequirements(cleanDraft);
    setDraft(cleanDraft);
    setSaving(false);
    toast.success('Global graduation requirements saved.');
  };

  const geCandidates = state.courses.filter(c =>
    c.category === 'GE' &&
    !draft.requiredGeCourseIds.includes(c.id) &&
    (c.code.toLowerCase().includes(geSearch.toLowerCase()) ||
     c.title.toLowerCase().includes(geSearch.toLowerCase()))
  );

  const hkCandidates = state.courses.filter(c =>
    c.category === 'HK/PE/NSTP' &&
    !draft.requiredHkPeNstpCourseIds.includes(c.id) &&
    (c.code.toLowerCase().includes(hkSearch.toLowerCase()) ||
     c.title.toLowerCase().includes(hkSearch.toLowerCase()))
  );

  const addGE = (id: string) => setDraft(d => ({ ...d, requiredGeCourseIds: [...d.requiredGeCourseIds, id] }));
  const removeGE = (id: string) => setDraft(d => ({ ...d, requiredGeCourseIds: d.requiredGeCourseIds.filter(x => x !== id) }));
  const addHK = (id: string) => setDraft(d => ({ ...d, requiredHkPeNstpCourseIds: [...d.requiredHkPeNstpCourseIds, id] }));
  const removeHK = (id: string) => setDraft(d => ({ ...d, requiredHkPeNstpCourseIds: d.requiredHkPeNstpCourseIds.filter(x => x !== id) }));

  const validGeIds = draft.requiredGeCourseIds.filter(id => state.courses.find(c => c.id === id));
  const validHkIds = draft.requiredHkPeNstpCourseIds.filter(id => state.courses.find(c => c.id === id));

  const CoursePicker = ({
    search, setSearch, candidates, onAdd, placeholder,
  }: {
    search: string; setSearch: (s: string) => void;
    candidates: typeof state.courses; onAdd: (id: string) => void;
    placeholder: string;
  }) => (
    <div className="border rounded-md p-2 mt-3">
      <div className="relative mb-2">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8 h-8 text-xs"
          placeholder={placeholder}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      {search && candidates.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          No matching courses. Make sure courses have the correct category set in OCS Courses.
        </p>
      )}
      {search && candidates.length > 0 && (
        <div className="max-h-48 overflow-y-auto space-y-1">
          {candidates.slice(0, 20).map(c => (
            <button
              key={c.id}
              onClick={() => { onAdd(c.id); setSearch(''); }}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-accent rounded-sm text-left"
            >
              <Plus className="w-3 h-3 text-primary shrink-0" />
              <span className="font-mono font-semibold text-primary">{c.code}</span>
              <span className="text-muted-foreground truncate">{c.title}</span>
              <span className="ml-auto text-muted-foreground shrink-0">{c.units}u</span>
            </button>
          ))}
        </div>
      )}
      {!search && (
        <p className="text-xs text-muted-foreground text-center py-1">Type to search and add courses.</p>
      )}
    </div>
  );

  const CourseTable = ({
    ids, onRemove, emptyText,
  }: {
    ids: string[]; onRemove: (id: string) => void; emptyText: string;
  }) => {
    if (ids.length === 0) return (
      <p className="text-xs text-muted-foreground italic text-center py-4">{emptyText}</p>
    );
    return (
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wide">#</th>
              <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wide">Code</th>
              <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wide">Course Title</th>
              <th className="text-center px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wide">Units</th>
              <th className="text-center px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wide">Category</th>
              <th className="px-3 py-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {ids.map((id, i) => {
              const c = state.courses.find(co => co.id === id);
              if (!c) return null;
              return (
                <tr key={id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-3 py-2.5 text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-2.5 font-mono font-bold text-primary">{c.code}</td>
                  <td className="px-3 py-2.5 text-foreground">{c.title}</td>
                  <td className="px-3 py-2.5 text-center font-semibold">{c.units}</td>
                  <td className="px-3 py-2.5 text-center">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{c.category}</Badge>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <button
                      onClick={() => onRemove(id)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-0.5 rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <PortalLayout role="admin" userName={state.currentUser?.name ?? ''}>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              Graduation Requirements
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Configure required General Education and HK/PE/NSTP courses for all students.
            </p>
          </div>
          <Button className="gap-2 bg-primary text-white shrink-0" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* GE Courses */}
          <div className="portal-panel">
            <div className="portal-panel-header flex items-center justify-between">
              <span>Required General Education Courses</span>
              <Badge className="text-xs">{validGeIds.length} courses</Badge>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                These GE courses are required for ALL students regardless of college. Set the category of a course to "GE" in OCS Courses first.
              </p>
              <CourseTable ids={validGeIds} onRemove={removeGE} emptyText="No GE courses added yet." />
              <CoursePicker
                search={geSearch}
                setSearch={setGeSearch}
                candidates={geCandidates}
                onAdd={addGE}
                placeholder="Search GE courses to add..."
              />
            </div>
          </div>

          {/* HK / PE / NSTP */}
          <div className="portal-panel">
            <div className="portal-panel-header flex items-center justify-between">
              <span>Required HK / PE / NSTP</span>
              <Badge className="text-xs">{validHkIds.length} courses</Badge>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                These HK, PE, and NSTP courses are required for ALL students. Set the category to "HK/PE/NSTP" in OCS Courses first.
              </p>
              <CourseTable ids={validHkIds} onRemove={removeHK} emptyText="No HK/PE/NSTP courses added yet." />
              <CoursePicker
                search={hkSearch}
                setSearch={setHkSearch}
                candidates={hkCandidates}
                onAdd={addHK}
                placeholder="Search HK/PE/NSTP courses to add..."
              />
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}


function emptyGlobal(): GraduationRequirements {
  return {
    collegeId: 'global',
    requiredGeCourseIds: [],
    requiredHkPeNstpCourseIds: [],
    requiredElectiveGeCourseIds: [],
    maxElectiveGe: 0,
    requiredMajorCourseIds: [],
    maxMajor: 0,
    requiredSpecializedCourseIds: [],
    maxSpecialized: 0,
    requiredThesisCourseIds: [],
    maxThesis: 0,
  };
}

export default function AdminGraduationSettings() {
  const { state, saveGraduationRequirements } = useApp();
  const globalReq = state.graduationRequirements.find(r => r.collegeId === 'global') ?? emptyGlobal();

  const [draft, setDraft] = useState<GraduationRequirements>({ ...globalReq });
  const [geSearch, setGeSearch] = useState('');
  const [hkSearch, setHkSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await saveGraduationRequirements(draft);
    setSaving(false);
    toast.success('Global graduation requirements saved.');
  };

  const geCandidates = state.courses.filter(c =>
    c.category === 'GE' &&
    !draft.requiredGeCourseIds.includes(c.id) &&
    (c.code.toLowerCase().includes(geSearch.toLowerCase()) ||
     c.title.toLowerCase().includes(geSearch.toLowerCase()))
  );

  const hkCandidates = state.courses.filter(c =>
    c.category === 'HK/PE/NSTP' &&
    !draft.requiredHkPeNstpCourseIds.includes(c.id) &&
    (c.code.toLowerCase().includes(hkSearch.toLowerCase()) ||
     c.title.toLowerCase().includes(hkSearch.toLowerCase()))
  );

  const addGE = (id: string) => setDraft(d => ({ ...d, requiredGeCourseIds: [...d.requiredGeCourseIds, id] }));
  const removeGE = (id: string) => setDraft(d => ({ ...d, requiredGeCourseIds: d.requiredGeCourseIds.filter(x => x !== id) }));
  const addHK = (id: string) => setDraft(d => ({ ...d, requiredHkPeNstpCourseIds: [...d.requiredHkPeNstpCourseIds, id] }));
  const removeHK = (id: string) => setDraft(d => ({ ...d, requiredHkPeNstpCourseIds: d.requiredHkPeNstpCourseIds.filter(x => x !== id) }));

  const CourseChip = ({ id, onRemove }: { id: string; onRemove: () => void }) => {
    const c = state.courses.find(c => c.id === id);
    if (!c) return null;
    return (
      <div className="flex items-center gap-1 bg-muted rounded-md px-2 py-1 text-xs">
        <span className="font-mono font-semibold text-primary">{c.code}</span>
        <span className="text-muted-foreground">{c.title}</span>
        <span className="ml-1 text-muted-foreground">({c.units}u)</span>
        <button onClick={onRemove} className="ml-1 text-muted-foreground hover:text-destructive transition-colors">
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  };

  const CoursePicker = ({
    search, setSearch, candidates, onAdd, placeholder,
  }: {
    search: string; setSearch: (s: string) => void;
    candidates: typeof state.courses; onAdd: (id: string) => void;
    placeholder: string;
  }) => (
    <div className="border rounded-md p-2 mt-3">
      <div className="relative mb-2">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8 h-8 text-xs"
          placeholder={placeholder}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      {search && candidates.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          No matching courses. Make sure courses have the correct category set in OCS Courses.
        </p>
      )}
      {search && candidates.length > 0 && (
        <div className="max-h-48 overflow-y-auto space-y-1">
          {candidates.slice(0, 20).map(c => (
            <button
              key={c.id}
              onClick={() => { onAdd(c.id); setSearch(''); }}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-accent rounded-sm text-left"
            >
              <Plus className="w-3 h-3 text-primary shrink-0" />
              <span className="font-mono font-semibold text-primary">{c.code}</span>
              <span className="text-muted-foreground truncate">{c.title}</span>
              <span className="ml-auto text-muted-foreground shrink-0">{c.units}u</span>
            </button>
          ))}
        </div>
      )}
      {!search && (
        <p className="text-xs text-muted-foreground text-center py-1">Type to search and add courses.</p>
      )}
    </div>
  );

  return (
    <PortalLayout role="admin" userName={state.currentUser?.name ?? ''}>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              Graduation Requirements
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Configure required General Education and HK/PE/NSTP courses for all students.
            </p>
          </div>
          <Button className="gap-2 bg-primary text-white shrink-0" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* GE Courses */}
          <div className="portal-panel">
            <div className="portal-panel-header flex items-center justify-between">
              <span>Required General Education Courses</span>
              <Badge className="text-xs">{draft.requiredGeCourseIds.filter(id => state.courses.find(c => c.id === id)).length} courses</Badge>
            </div>
            <div className="p-4">
              <p className="text-xs text-muted-foreground mb-3">
                These GE courses are required for ALL students regardless of college. Set the category of a course to "GE" in OCS Courses first.
              </p>
              <div className="flex flex-wrap gap-2 min-h-[2rem]">
                {draft.requiredGeCourseIds.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">No GE courses added yet.</p>
                )}
                {draft.requiredGeCourseIds.filter(id => state.courses.find(c => c.id === id)).map(id => (
                  <CourseChip key={id} id={id} onRemove={() => removeGE(id)} />
                ))}
              </div>
              <CoursePicker
                search={geSearch}
                setSearch={setGeSearch}
                candidates={geCandidates}
                onAdd={addGE}
                placeholder='Search GE courses to add...'
              />
            </div>
          </div>

          {/* HK / PE / NSTP */}
          <div className="portal-panel">
            <div className="portal-panel-header flex items-center justify-between">
              <span>Required HK / PE / NSTP</span>
              <Badge className="text-xs">{draft.requiredHkPeNstpCourseIds.filter(id => state.courses.find(c => c.id === id)).length} courses</Badge>
            </div>
            <div className="p-4">
              <p className="text-xs text-muted-foreground mb-3">
                These HK, PE, and NSTP courses are required for ALL students. Set the category to "HK/PE/NSTP" in OCS Courses first.
              </p>
              <div className="flex flex-wrap gap-2 min-h-[2rem]">
                {draft.requiredHkPeNstpCourseIds.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">No HK/PE/NSTP courses added yet.</p>
                )}
                {draft.requiredHkPeNstpCourseIds.filter(id => state.courses.find(c => c.id === id)).map(id => (
                  <CourseChip key={id} id={id} onRemove={() => removeHK(id)} />
                ))}
              </div>
              <CoursePicker
                search={hkSearch}
                setSearch={setHkSearch}
                candidates={hkCandidates}
                onAdd={addHK}
                placeholder='Search HK/PE/NSTP courses to add...'
              />
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
