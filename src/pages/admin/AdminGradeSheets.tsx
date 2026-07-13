import { useMemo, useState } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatChip } from '@/components/shared/StatChip';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { FileSpreadsheet, Layers, Building2, GraduationCap, Download, CheckCircle2, Info } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { buildGradeSheetBlock, printGradeSheets } from '@/lib/gradeSheet';
import type { GradeWorkflowStatus } from '@/lib/types';

type ScopeType = 'all' | 'college' | 'program';

function effectiveStatus(status: GradeWorkflowStatus | undefined, submitted: boolean): GradeWorkflowStatus {
  return status ?? (submitted ? 'posted' : 'draft');
}

export default function AdminGradeSheets() {
  const { state } = useApp();
  const activeTerm = state.terms.find(t => t.isActive);

  const [scope, setScope] = useState<ScopeType>('all');
  const [collegeId, setCollegeId] = useState<string>('');
  const [programId, setProgramId] = useState<string>('');

  // Course IDs allowed for the selected College — via Department → College resolution
  const collegeCourseIds = useMemo(() => {
    if (scope !== 'college' || !collegeId) return null;
    const deptNames = state.departments.filter(d => d.collegeId === collegeId).map(d => d.name);
    return new Set(state.courses.filter(c => deptNames.includes(c.department)).map(c => c.id));
  }, [scope, collegeId, state.departments, state.courses]);

  // Course IDs allowed for the selected Program — via that program's GraduationRequirements
  const programCourseIds = useMemo(() => {
    if (scope !== 'program' || !programId) return null;
    const ids = new Set<string>();
    (state.graduationRequirements ?? [])
      .filter(r => r.programId === programId)
      .forEach(r => {
        r.requiredMajorCourseIds.forEach(id => ids.add(id));
        r.requiredSpecializedCourseIds.forEach(id => ids.add(id));
        r.requiredThesisCourseIds.forEach(id => ids.add(id));
        r.requiredSeminarCourseIds.forEach(id => ids.add(id));
        r.requiredInternshipCourseIds.forEach(id => ids.add(id));
      });
    return ids;
  }, [scope, programId, state.graduationRequirements]);

  const programHasNoCurriculum = scope === 'program' && !!programId && (programCourseIds?.size ?? 0) === 0;

  // Qualifying sections: active term, not manual/phantom, not a lecture-parent with lab/rec children,
  // at least one posted (finished) grade, and within the selected college/program scope.
  const qualifyingSections = useMemo(() => {
    if (!activeTerm) return [];
    return state.sections
      .filter(s => s.termId === activeTerm.id && s.sectionCode !== '__MANUAL__')
      .filter(s => !state.sections.some(cs => cs.parentSectionId === s.id && cs.termId === s.termId))
      .map(s => {
        const course = state.courses.find(c => c.id === s.courseId);
        const faculty = state.users.find(u => u.id === s.facultyId);
        const grades = state.grades.filter(g => g.sectionId === s.id && state.users.some(u => u.id === g.studentId));
        const postedCount = grades.filter(g => effectiveStatus(g.status, g.submitted) === 'posted').length;
        return { section: s, course, faculty, grades, postedCount };
      })
      .filter(r => !!r.course)
      .filter(r => r.postedCount > 0)
      .filter(r => {
        if (scope === 'college') return collegeCourseIds ? collegeCourseIds.has(r.course!.id) : false;
        if (scope === 'program') return programCourseIds ? programCourseIds.has(r.course!.id) : false;
        return true;
      })
      .sort((a, b) => a.course!.code.localeCompare(b.course!.code) || a.section.sectionCode.localeCompare(b.section.sectionCode));
  }, [activeTerm, state.sections, state.courses, state.users, state.grades, scope, collegeCourseIds, programCourseIds]);

  const totalPostedGrades = qualifyingSections.reduce((sum, r) => sum + r.postedCount, 0);

  const handleGenerate = () => {
    if (!activeTerm || qualifyingSections.length === 0) return;
    const inst = state.portalSettings?.institutionName || state.portalSettings?.portalName || 'University';
    const blocks = qualifyingSections
      .map(r => buildGradeSheetBlock(
        r.section, r.course, activeTerm, state.grades, state.users, state.colleges, inst,
        state.degreePrograms, state.graduationRequirements, state.enrollments, state.sections, state.courses,
      ))
      .join('');
    const opened = printGradeSheets(`Grade Sheets — ${activeTerm.name}`, blocks);
    if (!opened) toast.error('Popup blocked — allow popups and try again.');
  };

  const scopeLabel =
    scope === 'college' ? (state.colleges.find(c => c.id === collegeId)?.name ?? 'Select a college')
    : scope === 'program' ? (state.degreePrograms.find(p => p.id === programId)?.name ?? 'Select a program')
    : 'All Colleges & Programs';

  return (
    <PortalLayout title="Grade Sheets">
      <div className="space-y-4">
        <div className="portal-panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-bold text-lg text-foreground flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" /> Grade Sheets
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Generate the official Grade Sheet (PDF) for every class with finished (posted) grades in the active term.
            </p>
          </div>
          <Badge variant="outline" className="text-xs flex-shrink-0">
            {activeTerm ? activeTerm.name : 'No Active Term'}
          </Badge>
        </div>

        {!activeTerm ? (
          <div className="portal-panel">
            <div className="py-12 text-center text-muted-foreground bg-background">
              <Info className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No active term is set.</p>
              <p className="text-sm mt-1">Set an active term in Term Control to generate grade sheets.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Scope filter */}
            <div className="portal-panel p-4 space-y-3">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Scope</p>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex gap-1.5 rounded-lg bg-muted/50 p-1">
                  {([
                    { value: 'all', label: 'All', icon: Layers },
                    { value: 'college', label: 'By College', icon: Building2 },
                    { value: 'program', label: 'By Program', icon: GraduationCap },
                  ] as const).map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setScope(opt.value)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        scope === opt.value ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <opt.icon className="w-3.5 h-3.5" /> {opt.label}
                    </button>
                  ))}
                </div>

                {scope === 'college' && (
                  <SearchableSelect
                    value={collegeId}
                    onValueChange={setCollegeId}
                    triggerClassName="w-64 h-9"
                    placeholder="Select a college..."
                    options={state.colleges.map(c => ({ value: c.id, label: c.name }))}
                  />
                )}
                {scope === 'program' && (
                  <SearchableSelect
                    value={programId}
                    onValueChange={setProgramId}
                    triggerClassName="w-64 h-9"
                    placeholder="Select a program..."
                    options={state.degreePrograms.map(p => ({ value: p.id, label: p.name }))}
                  />
                )}
              </div>
              {programHasNoCurriculum && (
                <p className="text-xs text-amber-600 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 flex-shrink-0" />
                  No program-specific curriculum configured for this program yet — try "By College" or "All" instead.
                </p>
              )}
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-3">
              <StatChip icon={Layers} value={qualifyingSections.length} label="Classes in Scope" />
              <StatChip icon={CheckCircle2} value={totalPostedGrades} label="Posted Grades" colorClass="bg-green-100 text-green-700" />
            </div>

            {/* Preview list */}
            <div className="portal-panel">
              <div className="portal-panel-header">
                <span className="flex items-center gap-2"><FileSpreadsheet className="w-4 h-4" /> Classes to Include</span>
                <span className="text-white/70 text-xs font-normal">{scopeLabel}</span>
              </div>
              {qualifyingSections.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground bg-background">
                  <FileSpreadsheet className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No classes with finished grades found for this scope.</p>
                  <p className="text-sm mt-1">Only classes with at least one posted grade are included.</p>
                </div>
              ) : (
                <div className="dash-list">
                  {qualifyingSections.map(({ section, course, faculty, grades, postedCount }) => (
                    <div key={section.id} className="dash-list-row">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground">
                          <span className="text-primary font-bold">{course?.code}</span>
                          {course?.title ? ` — ${course.title}` : ''}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Sec {section.sectionCode} &bull; {faculty?.name ?? 'TBA'}
                        </p>
                      </div>
                      <Badge className="bg-secondary/10 text-secondary border-secondary/30 text-xs flex-shrink-0">
                        {postedCount}/{grades.length} posted
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              className="w-full sm:w-auto gap-2"
              disabled={qualifyingSections.length === 0}
              onClick={handleGenerate}
            >
              <Download className="w-4 h-4" /> Download Grade Sheets (PDF)
            </Button>
          </>
        )}
      </div>
    </PortalLayout>
  );
}
