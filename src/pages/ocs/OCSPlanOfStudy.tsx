import { useState, useMemo, useEffect } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Search, GraduationCap, Plus, Save } from 'lucide-react';
import { toast } from 'sonner';
import type { GraduationRequirements, CourseCategory } from '@/lib/types';

// OCS picks specific courses for these categories
const COURSE_PICKER_CATEGORIES: CourseCategory[] = ['Major', 'Thesis'];
const COURSE_PICKER_LABELS: Record<string, string> = {
  'Major': 'Major Courses',
  'Thesis': 'Thesis',
};

function emptyReq(collegeId: string): GraduationRequirements {
  return {
    collegeId,
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

function getCategoryIds(req: GraduationRequirements, cat: CourseCategory): string[] {
  if (cat === 'Major') return req.requiredMajorCourseIds;
  if (cat === 'Thesis') return req.requiredThesisCourseIds;
  return [];
}

function setCategoryIds(req: GraduationRequirements, cat: CourseCategory, ids: string[]): GraduationRequirements {
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

export default function OCSPlanOfStudy() {
  const { state, saveGraduationRequirements, loadGraduationRequirements } = useApp();
  const [search, setSearch] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<GraduationRequirements | null>(null);

  // Fetch fresh requirements on mount
  useEffect(() => { loadGraduationRequirements(); }, [loadGraduationRequirements]);

  // Resolve OCS user's college ID (handles both stored-as-ID and stored-as-name)
  const ocsCollegeId = useMemo(() => {
    const user = state.currentUser;
    if (!user?.college) return '';
    const byId = state.colleges.find(c => c.id === user.college);
    if (byId) return byId.id;
    const byName = state.colleges.find(c => c.name === user.college);
    return byName?.id ?? user.college;
  }, [state.colleges, state.currentUser]);

  const collegeInfo = useMemo(() => state.colleges.find(c => c.id === ocsCollegeId), [state.colleges, ocsCollegeId]);

  // Auto-load draft whenever college or requirements change
  useEffect(() => {
    if (!ocsCollegeId) return;
    const existing = state.graduationRequirements.find(r => r.collegeId === ocsCollegeId);
    setDraft(existing ? { ...existing } : emptyReq(ocsCollegeId));
  }, [ocsCollegeId, state.graduationRequirements]);

  const handleAddCourse = (cat: CourseCategory, courseId: string) => {
    if (!draft) return;
    const ids = getCategoryIds(draft, cat);
    if (ids.includes(courseId)) return;
    setDraft(prev => prev ? setCategoryIds(prev, cat, [...ids, courseId]) : prev);
  };

  const handleRemoveCourse = (cat: CourseCategory, courseId: string) => {
    if (!draft) return;
    const ids = getCategoryIds(draft, cat);
    setDraft(prev => prev ? setCategoryIds(prev, cat, ids.filter(id => id !== courseId)) : prev);
  };

  const handleSetMax = (cat: CourseCategory, val: string) => {
    if (!draft) return;
    const n = parseInt(val) || 0;
    setDraft(prev => prev ? setMaxCount(prev, cat, n) : prev);
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    await saveGraduationRequirements(draft);
    setSaving(false);
    toast.success('Graduation requirements saved.');
  };

  return (
    <PortalLayout role="ocs" userName={state.currentUser?.name ?? ''}>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              Plan of Study Configuration
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {collegeInfo
                ? <>Configuring graduation requirements for <strong>{collegeInfo.name}</strong>.</>
                : 'Configure required courses and unit requirements for graduation.'}
            </p>
          </div>
          {draft && (
            <Button className="gap-2 bg-primary text-white shrink-0" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Requirements'}
            </Button>
          )}
        </div>

        {!draft && (
          <div className="portal-panel">
            <div className="p-12 text-center text-muted-foreground">
              <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Your college information is not set. Please contact the administrator to assign your college.</p>
            </div>
          </div>
        )}

        {draft && (
          <Tabs defaultValue="courses">
            <TabsList>
              <TabsTrigger value="courses">Required Courses</TabsTrigger>
              <TabsTrigger value="units">Unit Requirements</TabsTrigger>
              <TabsTrigger value="max">Max Course Counts</TabsTrigger>
            </TabsList>

            {/* Course Pickers (Major & Thesis only) */}
            <TabsContent value="courses" className="space-y-4 mt-4">
              <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                Pick the specific courses students must complete for <strong>Major</strong> and <strong>Thesis</strong> requirements.
                For <strong>Elective GE</strong> and <strong>Specialized</strong>, students choose freely — set unit targets in the "Unit Requirements" tab.
              </div>
              {COURSE_PICKER_CATEGORIES.map(cat => {
                const ids = getCategoryIds(draft, cat);
                const courses = ids.map(id => state.courses.find(c => c.id === id)).filter(Boolean);
                const catSearch = search[cat] ?? '';
                const catCourses = state.courses.filter(c =>
                  c.category === cat &&
                  !ids.includes(c.id) &&
                  (c.code.toLowerCase().includes(catSearch.toLowerCase()) ||
                    c.title.toLowerCase().includes(catSearch.toLowerCase()))
                );

                return (
                  <div key={cat} className="portal-panel">
                    <div className="portal-panel-header flex items-center justify-between">
                      <span>{COURSE_PICKER_LABELS[cat]}</span>
                      <Badge className="text-xs">{ids.length} required</Badge>
                    </div>
                    <div className="p-4 space-y-3">
                      {courses.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {courses.map(c => c && (
                            <div key={c.id} className="flex items-center gap-1 bg-muted rounded-md px-2 py-1 text-xs">
                              <span className="font-mono font-semibold text-primary">{c.code}</span>
                              <span className="text-muted-foreground">{c.title}</span>
                              <button onClick={() => handleRemoveCourse(cat, c.id)} className="ml-1 text-muted-foreground hover:text-destructive transition-colors">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {courses.length === 0 && (
                        <p className="text-xs text-muted-foreground italic">No required courses added yet.</p>
                      )}
                      <div className="border rounded-md p-2">
                        <div className="relative mb-2">
                          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            className="pl-8 h-8 text-xs"
                            placeholder={`Search ${COURSE_PICKER_LABELS[cat]} to add...`}
                            value={catSearch}
                            onChange={e => setSearch(s => ({ ...s, [cat]: e.target.value }))}
                          />
                        </div>
                        {catSearch && catCourses.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-2">
                            No courses found. Make sure courses are categorized as "{cat}" in OCS Courses.
                          </p>
                        )}
                        {catSearch && catCourses.length > 0 && (
                          <div className="max-h-40 overflow-y-auto space-y-1">
                            {catCourses.slice(0, 20).map(c => (
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
                        {!catSearch && (
                          <p className="text-xs text-muted-foreground text-center py-1">Type to search and add courses.</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </TabsContent>

            {/* Unit Requirements for Elective GE & Specialized */}
            <TabsContent value="units" className="mt-4">
              <div className="portal-panel">
                <div className="portal-panel-header">
                  Free-Choice Unit Requirements
                  {collegeInfo && <span className="font-normal ml-1 opacity-70">— {collegeInfo.name}</span>}
                </div>
                <div className="p-4 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Students freely pick any course tagged with <strong>Elective GE</strong> or <strong>Specialized</strong> category.
                    Set how many total units they must pass in each category.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold">Elective GE — Required Units</label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number" min={0} max={99}
                          value={draft.maxElectiveGe || ''}
                          placeholder="0"
                          onChange={e => setDraft(d => d ? { ...d, maxElectiveGe: parseInt(e.target.value) || 0 } : d)}
                          className="w-28"
                        />
                        <span className="text-sm text-muted-foreground">units</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Students must pass at least this many units from any <strong>Elective GE</strong> course.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Available: {state.courses.filter(c => c.category === 'Elective GE').length} courses tagged as Elective GE
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold">Specialized — Required Units</label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number" min={0} max={99}
                          value={draft.maxSpecialized || ''}
                          placeholder="0"
                          onChange={e => setDraft(d => d ? { ...d, maxSpecialized: parseInt(e.target.value) || 0 } : d)}
                          className="w-28"
                        />
                        <span className="text-sm text-muted-foreground">units</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Students must pass at least this many units from any <strong>Specialized</strong> course.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Available: {state.courses.filter(c => c.category === 'Specialized').length} courses tagged as Specialized
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Max Counts for Major & Thesis */}
            <TabsContent value="max" className="mt-4">
              <div className="portal-panel">
                <div className="portal-panel-header">
                  Maximum Courses Counting Toward Graduation
                  {collegeInfo && <span className="font-normal ml-1 opacity-70">— {collegeInfo.name}</span>}
                </div>
                <div className="p-4 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    For Major and Thesis, set the maximum number of courses from the required list that count toward graduation.
                    Set to 0 to require ALL listed courses.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {COURSE_PICKER_CATEGORIES.map(cat => (
                      <div key={cat} className="space-y-1">
                        <label className="text-sm font-medium">Max {COURSE_PICKER_LABELS[cat]}</label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number" min={0} max={200}
                            value={getMaxCount(draft, cat) || ''}
                            placeholder="0 = all required"
                            onChange={e => handleSetMax(cat, e.target.value)}
                            className="w-32"
                          />
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
          </Tabs>
        )}
      </div>
    </PortalLayout>
  );
}
