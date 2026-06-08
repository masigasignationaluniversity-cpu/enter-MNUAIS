import { useState, useMemo, useEffect } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { StatusBanner } from '@/components/shared/StatusBanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { X, Search, GraduationCap, Plus, Save, Wand2, BookOpen, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import type { GraduationRequirements, CourseCategory, DegreeProgram } from '@/lib/types';

// OCS picks specific courses for these categories
const COURSE_PICKER_CATEGORIES: CourseCategory[] = ['Major', 'Thesis'];
const COURSE_PICKER_LABELS: Record<string, string> = {
  'Major': 'Major Courses',
  'Thesis': 'Thesis',
};

function emptyReq(collegeId: string, programId: string): GraduationRequirements {
  return {
    collegeId,
    programId,
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

function getCategoryIds(req: GraduationRequirements, cat: CourseCategory | 'AdditionalGE'): string[] {
  if (cat === 'AdditionalGE' || cat === 'GE') return req.requiredGeCourseIds;
  if (cat === 'Major') return req.requiredMajorCourseIds;
  if (cat === 'Thesis') return req.requiredThesisCourseIds;
  return [];
}

function setCategoryIds(req: GraduationRequirements, cat: CourseCategory | 'AdditionalGE', ids: string[]): GraduationRequirements {
  if (cat === 'AdditionalGE' || cat === 'GE') return { ...req, requiredGeCourseIds: ids };
  if (cat === 'Major') return { ...req, requiredMajorCourseIds: ids };
  if (cat === 'Thesis') return { ...req, requiredThesisCourseIds: ids };
  return req;
}

function getMaxCount(req: GraduationRequirements, cat: CourseCategory): number {
  if (cat === 'Major') return req.maxMajor;
  if (cat === 'Thesis') return req.maxThesis;
  return 0;
}

function setMaxCount(req: GraduationRequirements, cat: CourseCategory, max: number): GraduationRequirements {
  if (cat === 'Major') return { ...req, maxMajor: max };
  if (cat === 'Thesis') return { ...req, maxThesis: max };
  return req;
}

// ── Program POS Editor ────────────────────────────────────────────────────────

interface ProgramEditorProps {
  program: DegreeProgram;
  collegeId: string;
  collegeName: string;
}

function ProgramEditor({ program, collegeId, collegeName }: ProgramEditorProps) {
  const { state, saveGraduationRequirements, loadGraduationRequirements } = useApp();
  const [search, setSearch] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<GraduationRequirements | null>(null);

  // Global admin GE course IDs (to exclude from college-specific GE picker)
  const globalGeIds = useMemo(() => {
    const globalReq = state.graduationRequirements.find(r => r.collegeId === 'global' && !r.programId);
    return new Set(globalReq?.requiredGeCourseIds ?? []);
  }, [state.graduationRequirements]);

  // Global admin HK/PE/NSTP course IDs (to exclude from college-specific Additional GE picker)
  const globalHkIds = useMemo(() => {
    const globalReq = state.graduationRequirements.find(r => r.collegeId === 'global' && !r.programId);
    return new Set(globalReq?.requiredHkPeNstpCourseIds ?? []);
  }, [state.graduationRequirements]);

  // Load draft whenever the program or requirements change
  useEffect(() => {
    const existing = state.graduationRequirements.find(r => r.programId === program.id);
    setDraft(existing ? { ...existing } : emptyReq(collegeId, program.id));
  }, [program.id, collegeId, state.graduationRequirements]);

  const handleAddCourse = (cat: CourseCategory | 'AdditionalGE', courseId: string) => {
    if (!draft) return;
    const ids = getCategoryIds(draft, cat);
    if (ids.includes(courseId)) return;
    setDraft(prev => prev ? setCategoryIds(prev, cat, [...ids, courseId]) : prev);
  };

  const handleRemoveCourse = (cat: CourseCategory | 'AdditionalGE', courseId: string) => {
    if (!draft) return;
    const ids = getCategoryIds(draft, cat);
    setDraft(prev => prev ? setCategoryIds(prev, cat, ids.filter(id => id !== courseId)) : prev);
  };

  const handleSetMax = (cat: CourseCategory, val: string) => {
    if (!draft) return;
    const n = parseInt(val) || 0;
    setDraft(prev => prev ? setMaxCount(prev, cat, n) : prev);
  };

  // Auto-fill Major courses: all Major-category courses in the same college
  // Build a set of all department name/ID values that belong to this college
  const collegeDeptMatches = useMemo(() => {
    const depts = state.departments.filter(d => d.collegeId === collegeId);
    const s = new Set<string>();
    depts.forEach(d => { if (d.name) s.add(d.name); if (d.id) s.add(d.id); });
    return s;
  }, [state.departments, collegeId]);

  const handleAutoFill = (cat: CourseCategory) => {
    if (!draft) return;
    // First try to match by college departments; fall back to all courses of that category
    let fillIds: string[];
    if (collegeDeptMatches.size > 0) {
      fillIds = state.courses
        .filter(c => c.category === cat && collegeDeptMatches.has(c.department))
        .map(c => c.id);
    } else {
      fillIds = [];
    }
    // If nothing matched departments, fall back to ALL courses of this category
    if (fillIds.length === 0) {
      fillIds = state.courses.filter(c => c.category === cat).map(c => c.id);
    }
    const existingIds = getCategoryIds(draft, cat);
    const merged = [...new Set([...existingIds, ...fillIds])];
    setDraft(prev => prev ? setCategoryIds(prev, cat, merged) : prev);
    const added = merged.length - existingIds.length;
    const label = COURSE_PICKER_LABELS[cat];
    if (added > 0) toast.success(`Auto-filled ${added} ${label.toLowerCase()} from college.`);
    else toast.info(`All college ${label.toLowerCase()} already added.`);
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    await saveGraduationRequirements(draft);
    await loadGraduationRequirements();
    setSaving(false);
    toast.success(`POS saved for ${program.name}.`);
  };

  if (!draft) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-primary" />
            {program.name}
            <Badge className="ml-1 text-xs bg-primary/10 text-primary border-0">{program.abbreviation}</Badge>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">{collegeName} · Plan of Study</p>
        </div>
        <Button className="gap-2 bg-primary text-primary-foreground shrink-0" onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save POS'}
        </Button>
      </div>

      <Tabs defaultValue="courses">
        <TabsList>
          <TabsTrigger value="courses">Required Courses</TabsTrigger>
          {program.degreeType !== 'associate_certificate' && (
            <TabsTrigger value="units">Unit Requirements</TabsTrigger>
          )}
          {program.degreeType !== 'associate_certificate' && (
            <TabsTrigger value="max">Max Course Counts</TabsTrigger>
          )}
        </TabsList>

        {/* Course Pickers (Major & Thesis only) */}
        <TabsContent value="courses" className="space-y-4 mt-4">
          <StatusBanner type="info" title="Course Picker Instructions">
            Pick the specific courses students must complete for <strong>Major</strong>
            {program.degreeType !== 'associate_certificate' && <> and <strong>Thesis</strong></>}.
            For <strong>Elective GE</strong> and <strong>Specialized</strong>, students choose freely — set unit targets in "Unit Requirements".
          </StatusBanner>

          {COURSE_PICKER_CATEGORIES
            .filter(cat => !(program.degreeType === 'associate_certificate' && cat === 'Thesis'))
            .map(cat => {
            const ids = getCategoryIds(draft, cat);
            const courses = ids.map(id => state.courses.find(c => c.id === id)).filter(Boolean);
            const catSearch = search[cat] ?? '';
            // Only show results when user has typed something; filter by course code only
            const catCourses = catSearch.trim().length === 0 ? [] : state.courses.filter(c =>
              c.category === cat &&
              !ids.includes(c.id) &&
              c.code.toLowerCase().includes(catSearch.toLowerCase())
            );
            return (
              <div key={cat} className="portal-panel">
                <div className="portal-panel-header flex items-center justify-between">
                  <span>{COURSE_PICKER_LABELS[cat]}</span>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline"
                      className="h-6 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/5"
                      onClick={() => handleAutoFill(cat)}>
                      <Wand2 className="w-3 h-3" /> Auto-fill from College
                    </Button>
                    <Badge className="text-xs">{ids.length} required</Badge>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {courses.length > 0 && (
                    <div className="overflow-x-auto border rounded">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="text-xs py-2 font-bold">Course Code</TableHead>
                            <TableHead className="text-xs py-2 font-bold">Title</TableHead>
                            <TableHead className="text-xs py-2 font-bold text-center w-[60px]">Units</TableHead>
                            <TableHead className="text-xs py-2 w-[48px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {courses.map(c => c && (
                            <TableRow key={c.id}>
                              <TableCell className="text-xs font-mono font-semibold text-primary py-1.5">{c.code}</TableCell>
                              <TableCell className="text-xs py-1.5">{c.title}</TableCell>
                              <TableCell className="text-xs py-1.5 text-center">{c.units}</TableCell>
                              <TableCell className="py-1.5">
                                <button onClick={() => handleRemoveCourse(cat, c.id)}
                                  className="text-muted-foreground hover:text-destructive transition-colors">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  {courses.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">No required courses added yet.</p>
                  )}
                  <div className="border rounded-md p-2">
                    <div className="relative mb-2">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input className="pl-8 h-8 text-xs"
                        placeholder={`Search ${COURSE_PICKER_LABELS[cat]} to add...`}
                        value={catSearch}
                        onChange={e => setSearch(s => ({ ...s, [cat]: e.target.value }))} />
                    </div>
                    {catCourses.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        {catSearch.trim().length === 0 ? 'Type a course code to search...' : `No "${cat}" courses matching "${catSearch}".`}
                      </p>
                    )}
                    {catCourses.length > 0 && (
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {catCourses.slice(0, 50).map(c => (
                          <button key={c.id} onClick={() => handleAddCourse(cat, c.id)}
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-accent rounded-sm text-left">
                            <Plus className="w-3 h-3 text-primary shrink-0" />
                            <span className="font-mono font-semibold text-primary">{c.code}</span>
                            <span className="text-muted-foreground truncate">{c.title}</span>
                            <span className="ml-auto text-muted-foreground shrink-0">{c.units}u</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Additional Required Courses (Program-Specific) */}
          {(() => {
            const geIds = getCategoryIds(draft, 'AdditionalGE');
            const geCourses = geIds.map(id => state.courses.find(c => c.id === id)).filter(Boolean);
            const geSearch2 = search['AdditionalGE'] ?? '';
            // Exclude: already added, admin GE set, admin HK/PE/NSTP, college major, college HK/PE/NSTP
            const excludedIds = new Set([
              ...geIds,
              ...Array.from(globalGeIds),
              ...Array.from(globalHkIds),
              ...(draft.requiredMajorCourseIds ?? []),
              ...(draft.requiredHkPeNstpCourseIds ?? []),
            ]);
            const geCandidates = geSearch2.trim().length === 0 ? [] : state.courses.filter(c =>
              !excludedIds.has(c.id) &&
              c.code.toLowerCase().includes(geSearch2.toLowerCase())
            );
            return (
              <div className="portal-panel border-blue-200">
                <div className="portal-panel-header flex items-center justify-between bg-blue-600 text-white">
                  <span>Additional Required Courses</span>
                  <Badge className="text-xs bg-white/20 text-white border-0">{geIds.length} added</Badge>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Add any courses required specifically for <strong>{program.name}</strong> students (any type or category).
                  </p>
                  {geCourses.length > 0 && (
                    <div className="overflow-x-auto border rounded">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-blue-50">
                            <TableHead className="text-xs py-2 font-bold">Course Code</TableHead>
                            <TableHead className="text-xs py-2 font-bold">Title</TableHead>
                            <TableHead className="text-xs py-2 font-bold text-center w-[60px]">Units</TableHead>
                            <TableHead className="text-xs py-2 w-[48px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {geCourses.map(c => c && (
                            <TableRow key={c.id}>
                              <TableCell className="text-xs font-mono font-semibold text-primary py-1.5">{c.code}</TableCell>
                              <TableCell className="text-xs py-1.5">{c.title}</TableCell>
                              <TableCell className="text-xs py-1.5 text-center">{c.units}</TableCell>
                              <TableCell className="py-1.5">
                                <button onClick={() => handleRemoveCourse('AdditionalGE', c.id)}
                                  className="text-muted-foreground hover:text-destructive transition-colors">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  {geCourses.length === 0 && <p className="text-xs text-muted-foreground italic">No additional required courses added yet.</p>}
                  <div className="border rounded-md p-2">
                    <div className="relative mb-2">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input className="pl-8 h-8 text-xs" placeholder="Search courses to add..."
                        value={geSearch2} onChange={e => setSearch(s => ({ ...s, 'AdditionalGE': e.target.value }))} />
                    </div>
                    {geCandidates.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        {geSearch2.trim().length === 0 ? 'Type a course code to search...' : 'No courses matching that code.'}
                      </p>
                    )}
                    {geCandidates.length > 0 && (
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {geCandidates.slice(0, 50).map(c => (
                          <button key={c.id} onClick={() => handleAddCourse('AdditionalGE', c.id)}
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-accent rounded-sm text-left">
                            <Plus className="w-3 h-3 text-blue-600 shrink-0" />
                            <span className="font-mono font-semibold text-blue-600">{c.code}</span>
                            <span className="text-muted-foreground truncate">{c.title}</span>
                            <span className="ml-auto text-xs text-muted-foreground shrink-0">{c.category}</span>
                            <span className="text-muted-foreground shrink-0">{c.units}u</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </TabsContent>

        {/* Unit Requirements for Elective GE & Specialized */}
        {program.degreeType !== 'associate_certificate' && (
        <TabsContent value="units" className="mt-4">
          <div className="portal-panel">
            <div className="portal-panel-header">
              Free-Choice Unit Requirements
              <span className="font-normal ml-1 opacity-70">— {program.abbreviation}</span>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Students freely pick any course tagged with <strong>Elective GE</strong> or <strong>Specialized</strong>.
                Set how many total units they must pass in each category.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {program.degreeType !== 'associate_certificate' && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Elective GE — Required Units</label>
                    <div className="flex items-center gap-2">
                      <Input type="number" min={0} max={99} value={draft.maxElectiveGe || ''} placeholder="0"
                        onChange={e => setDraft(d => d ? { ...d, maxElectiveGe: parseInt(e.target.value) || 0 } : d)}
                        className="w-28" />
                      <span className="text-sm text-muted-foreground">units</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Available: {state.courses.filter(c => c.category === 'Elective GE').length} Elective GE courses
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Specialized — Required Units</label>
                  <div className="flex items-center gap-2">
                    <Input type="number" min={0} max={99} value={draft.maxSpecialized || ''} placeholder="0"
                      onChange={e => setDraft(d => d ? { ...d, maxSpecialized: parseInt(e.target.value) || 0 } : d)}
                      className="w-28" />
                    <span className="text-sm text-muted-foreground">units</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Available: {state.courses.filter(c => c.category === 'Specialized').length} Specialized courses
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
        )}

        {/* Max Counts for Major & Thesis */}
        {program.degreeType !== 'associate_certificate' && (
        <TabsContent value="max" className="mt-4">
          <div className="portal-panel">
            <div className="portal-panel-header">
              Maximum Courses Counting Toward Graduation
              <span className="font-normal ml-1 opacity-70">— {program.abbreviation}</span>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Set the maximum number of courses from the required list that count toward graduation.
                Set to 0 to require ALL listed courses.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {COURSE_PICKER_CATEGORIES
                  .filter(cat => !(program.degreeType === 'associate_certificate' && cat === 'Thesis'))
                  .map(cat => (
                  <div key={cat} className="space-y-1">
                    <label className="text-sm font-medium">Max {COURSE_PICKER_LABELS[cat]}</label>
                    <div className="flex items-center gap-2">
                      <Input type="number" min={0} max={200}
                        value={getMaxCount(draft, cat) || ''} placeholder="0 = all required"
                        onChange={e => handleSetMax(cat, e.target.value)} className="w-32" />
                      <span className="text-xs text-muted-foreground">courses</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {getCategoryIds(draft, cat).length} course{getCategoryIds(draft, cat).length !== 1 ? 's' : ''} in list
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

// ── Main OCSPlanOfStudy page ──────────────────────────────────────────────────

export default function OCSPlanOfStudy() {
  const { state, loadGraduationRequirements } = useApp();
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);

  // Fetch fresh requirements on mount
  useEffect(() => { loadGraduationRequirements(); }, [loadGraduationRequirements]);

  // Resolve OCS user's college ID
  const ocsCollegeId = useMemo(() => {
    const user = state.currentUser;
    if (!user?.college) return '';
    const byId = state.colleges.find(c => c.id === user.college);
    if (byId) return byId.id;
    const byName = state.colleges.find(c => c.name === user.college);
    return byName?.id ?? user.college;
  }, [state.colleges, state.currentUser]);

  const collegeInfo = useMemo(
    () => state.colleges.find(c => c.id === ocsCollegeId),
    [state.colleges, ocsCollegeId]
  );

  // Degree programs offered by this college
  const collegePrograms = useMemo(
    () => state.degreePrograms.filter(p => p.collegeId === ocsCollegeId),
    [state.degreePrograms, ocsCollegeId]
  );

  // Default to first program
  useEffect(() => {
    if (collegePrograms.length > 0 && !selectedProgramId) {
      setSelectedProgramId(collegePrograms[0].id);
    }
  }, [collegePrograms, selectedProgramId]);

  const selectedProgram = collegePrograms.find(p => p.id === selectedProgramId) ?? null;

  // Build summary row for each program (shows configured status)
  const getProgramStatus = (prog: DegreeProgram) => {
    const req = state.graduationRequirements.find(r => r.programId === prog.id);
    if (!req) return { configured: false, majorCount: 0 };
    const majorCount = req.requiredMajorCourseIds.length;
    return { configured: majorCount > 0 || req.requiredThesisCourseIds.length > 0 || req.maxElectiveGe > 0, majorCount };
  };

  return (
    <PortalLayout role="ocs" userName={state.currentUser?.name ?? ''}>
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            Plan of Study Configuration
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {collegeInfo
              ? <>Configure graduation requirements per degree program — <strong>{collegeInfo.name}</strong></>
              : 'Configure graduation requirements per degree program.'}
          </p>
        </div>

        {!ocsCollegeId && (
          <div className="portal-panel">
            <div className="p-12 text-center text-muted-foreground">
              <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Your college is not set. Please contact the administrator.</p>
            </div>
          </div>
        )}

        {ocsCollegeId && collegePrograms.length === 0 && (
          <div className="portal-panel">
            <div className="p-12 text-center text-muted-foreground">
              <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No degree programs found for {collegeInfo?.name ?? 'your college'}.</p>
              <p className="text-xs mt-1">Ask the administrator to add degree programs under this college.</p>
            </div>
          </div>
        )}

        {ocsCollegeId && collegePrograms.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 items-start">
            {/* Program list sidebar */}
            <div className="portal-panel sticky top-4">
              <div className="portal-panel-header flex items-center justify-between">
                <span>Programs</span>
                <Badge className="text-xs">{collegePrograms.length}</Badge>
              </div>
              <div className="divide-y divide-border">
                {collegePrograms.map(prog => {
                  const { configured, majorCount } = getProgramStatus(prog);
                  const isActive = prog.id === selectedProgramId;
                  return (
                    <button
                      key={prog.id}
                      onClick={() => setSelectedProgramId(prog.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/60 ${
                        isActive ? 'bg-primary/8 border-l-2 border-primary' : ''
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${isActive ? 'text-primary' : 'text-foreground'}`}>
                          {prog.abbreviation}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{prog.name}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {configured
                          ? <Badge className="text-xs bg-emerald-100 text-emerald-700 border-0">{majorCount} major</Badge>
                          : <Badge className="text-xs bg-muted text-muted-foreground border-0">Not set</Badge>
                        }
                        <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Program editor */}
            <div>
              {selectedProgram ? (
                <ProgramEditor
                  key={selectedProgram.id}
                  program={selectedProgram}
                  collegeId={ocsCollegeId}
                  collegeName={collegeInfo?.name ?? ''}
                />
              ) : (
                <div className="portal-panel">
                  <div className="p-12 text-center text-muted-foreground">
                    <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>Select a program to configure its Plan of Study.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
