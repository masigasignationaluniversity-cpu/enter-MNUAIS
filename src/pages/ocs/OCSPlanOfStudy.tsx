import { useState, useMemo } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Search, GraduationCap, Plus, Save } from 'lucide-react';
import { toast } from 'sonner';
import type { GraduationRequirements, CourseCategory } from '@/lib/types';

const CATEGORY_LABELS: Record<string, string> = {
  'Elective GE': 'Elective General Education',
  'Major': 'Major Courses',
  'Specialized': 'Specialized Courses',
  'Thesis': 'Thesis',
};

const OCS_MANAGED_CATEGORIES: CourseCategory[] = ['Elective GE', 'Major', 'Specialized', 'Thesis'];

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
  if (cat === 'Elective GE') return req.requiredElectiveGeCourseIds;
  if (cat === 'Major') return req.requiredMajorCourseIds;
  if (cat === 'Specialized') return req.requiredSpecializedCourseIds;
  if (cat === 'Thesis') return req.requiredThesisCourseIds;
  return [];
}

function setCategoryIds(req: GraduationRequirements, cat: CourseCategory, ids: string[]): GraduationRequirements {
  if (cat === 'Elective GE') return { ...req, requiredElectiveGeCourseIds: ids };
  if (cat === 'Major') return { ...req, requiredMajorCourseIds: ids };
  if (cat === 'Specialized') return { ...req, requiredSpecializedCourseIds: ids };
  if (cat === 'Thesis') return { ...req, requiredThesisCourseIds: ids };
  return req;
}

function getMaxCount(req: GraduationRequirements, cat: CourseCategory): number {
  if (cat === 'Elective GE') return req.maxElectiveGe;
  if (cat === 'Major') return req.maxMajor;
  if (cat === 'Specialized') return req.maxSpecialized;
  if (cat === 'Thesis') return req.maxThesis;
  return 0;
}

function setMaxCount(req: GraduationRequirements, cat: CourseCategory, max: number): GraduationRequirements {
  if (cat === 'Elective GE') return { ...req, maxElectiveGe: max };
  if (cat === 'Major') return { ...req, maxMajor: max };
  if (cat === 'Specialized') return { ...req, maxSpecialized: max };
  if (cat === 'Thesis') return { ...req, maxThesis: max };
  return req;
}

export default function OCSPlanOfStudy() {
  const { state, saveGraduationRequirements } = useApp();
  const [selectedCollegeId, setSelectedCollegeId] = useState<string>('');
  const [search, setSearch] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Local editable state for the selected college
  const [draft, setDraft] = useState<GraduationRequirements | null>(null);

  const colleges = state.colleges;

  const handleSelectCollege = (id: string) => {
    setSelectedCollegeId(id);
    const existing = state.graduationRequirements.find(r => r.collegeId === id);
    setDraft(existing ? { ...existing } : emptyReq(id));
    setSearch({});
  };

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

  const collegeInfo = useMemo(() => {
    return colleges.find(c => c.id === selectedCollegeId);
  }, [colleges, selectedCollegeId]);

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
              Configure required courses and max counts per college for graduation.
            </p>
          </div>
          {draft && (
            <Button
              className="gap-2 bg-primary text-white shrink-0"
              onClick={handleSave}
              disabled={saving}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Requirements'}
            </Button>
          )}
        </div>

        {/* College Selector */}
        <div className="portal-panel">
          <div className="portal-panel-header">Select College</div>
          <div className="p-4">
            <Select value={selectedCollegeId} onValueChange={handleSelectCollege}>
              <SelectTrigger className="w-full sm:w-80">
                <SelectValue placeholder="— Choose a college —" />
              </SelectTrigger>
              <SelectContent>
                {colleges.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!draft && (
          <div className="portal-panel">
            <div className="p-12 text-center text-muted-foreground">
              <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Select a college above to configure its graduation requirements.</p>
            </div>
          </div>
        )}

        {draft && (
          <Tabs defaultValue="courses">
            <TabsList>
              <TabsTrigger value="courses">Required Courses</TabsTrigger>
              <TabsTrigger value="max">Max Counts</TabsTrigger>
            </TabsList>

            <TabsContent value="courses" className="space-y-4 mt-4">
              {OCS_MANAGED_CATEGORIES.map(cat => {
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
                      <span>{CATEGORY_LABELS[cat]}</span>
                      <Badge className="text-xs">{ids.length} required</Badge>
                    </div>
                    <div className="p-4 space-y-3">
                      {/* Current required courses */}
                      {courses.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {courses.map(c => c && (
                            <div key={c.id} className="flex items-center gap-1 bg-muted rounded-md px-2 py-1 text-xs">
                              <span className="font-mono font-semibold text-primary">{c.code}</span>
                              <span className="text-muted-foreground">{c.title}</span>
                              <button
                                onClick={() => handleRemoveCourse(cat, c.id)}
                                className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {courses.length === 0 && (
                        <p className="text-xs text-muted-foreground italic">No required courses added yet.</p>
                      )}

                      {/* Course picker */}
                      <div className="border rounded-md p-2">
                        <div className="relative mb-2">
                          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            className="pl-8 h-8 text-xs"
                            placeholder={`Search ${cat} courses to add...`}
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
                              <button
                                key={c.id}
                                onClick={() => handleAddCourse(cat, c.id)}
                                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-accent rounded-sm text-left"
                              >
                                <Plus className="w-3 h-3 text-primary shrink-0" />
                                <span className="font-mono font-semibold text-primary">{c.code}</span>
                                <span className="text-muted-foreground truncate">{c.title}</span>
                                <span className="ml-auto text-muted-foreground shrink-0">{c.units} u</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {!catSearch && (
                          <p className="text-xs text-muted-foreground text-center py-1">
                            Type to search and add courses.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </TabsContent>

            <TabsContent value="max" className="mt-4">
              <div className="portal-panel">
                <div className="portal-panel-header">
                  Maximum Courses Counting Toward Graduation
                  {collegeInfo && <span className="font-normal ml-1 opacity-70">— {collegeInfo.name}</span>}
                </div>
                <div className="p-4 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Set the maximum number of courses in each category that count toward graduation requirements.
                    Set to 0 to require ALL courses in the list.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {OCS_MANAGED_CATEGORIES.map(cat => (
                      <div key={cat} className="space-y-1">
                        <label className="text-sm font-medium">Max {CATEGORY_LABELS[cat]}</label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            max={200}
                            value={getMaxCount(draft, cat) || ''}
                            placeholder="0 = all required"
                            onChange={e => handleSetMax(cat, e.target.value)}
                            className="w-32"
                          />
                          <span className="text-xs text-muted-foreground">
                            courses
                          </span>
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
