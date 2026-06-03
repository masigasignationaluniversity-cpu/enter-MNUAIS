import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import type { AppState, User, Term, Course, Section, Grade, ConsentRecord, Enrollment, Evaluation, GradeValue, ConsentStatus, Prerogative, PrerogativeStatus, PortalSettings, College, Department, DegreeProgram, FinalizedEnlistment, Room, UnfinalizedRequest, UnfinalizedRequestStatus, ReconsiderationRequest, ReconsiderationRequestStatus, ReconsiderationRequestType, ChangeDropRequest, ChangeDropRequestStatus } from '../lib/types';
import { loadState, saveState, saveCurrentUser } from '../lib/store';
import { getPassedUnits, getYearClassification, getScholasticStanding, getEffectiveGradeWithRules, sortTermsChronologically, shouldAutoConvert40 } from '../lib/academic';
import { supabase } from '../integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function profileToUser(p: any): User {
  return {
    id: p.local_id ?? p.id,
    username: p.username,
    role: p.role,
    name: p.name,
    email: p.email ?? '',
    department: p.department ?? undefined,
    college: p.college ?? undefined,
    employeeId: p.employee_id ?? undefined,
    studentNumber: p.student_number ?? undefined,
    yearLevel: p.year_level ?? undefined,
    program: p.program ?? undefined,
    status: p.status ?? 'active',
  };
}

interface AppContextType {
  state: AppState;
  authReady: boolean;
  login: (username: string, password: string) => Promise<User>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  // Term
  addTerm: (term: Omit<Term, 'id'>) => void;
  deleteTerm: (termId: string) => void;
  updateTermControls: (termId: string, controls: Partial<Term['controls']>) => void;
  updateTermSettings: (termId: string, updates: Partial<Term>) => void;
  setActiveTerm: (termId: string) => void;
  // Courses
  addCourse: (course: Omit<Course, 'id'>) => void;
  updateCourse: (courseId: string, updates: Partial<Course>) => void;
  deleteCourse: (courseId: string) => void;
  // Courses (DB)
  loadCourses: () => Promise<void>;
  // Sections
  loadSections: () => Promise<void>;
  loadPrerogatives: () => Promise<void>;
  loadAppSettings: () => Promise<void>;
  addSection: (section: Omit<Section, 'id'>) => void;
  updateSection: (sectionId: string, updates: Partial<Section>) => void;
  deleteSection: (sectionId: string) => void;
  // Enrollment
  enlistSection: (studentId: string, sectionId: string, termId: string, cartSectionIds?: string[]) => Promise<{ success: boolean; message: string }>;
  enlistWithPrerogative: (studentId: string, sectionId: string, termId: string) => void;
  dropSection: (studentId: string, sectionId: string, termId: string) => { success: boolean; message: string };
  removeSection: (studentId: string, sectionId: string, termId: string) => { success: boolean; message: string };
  // Grades
  submitGrade: (gradeId: string, grade: GradeValue) => void;
  submitGradesBatch: (sectionId: string) => void;
  submitRemovalGrade: (gradeId: string, removalGrade: GradeValue) => void;
  submitRemovalGradesBatch: (sectionId: string) => void;
  submitRemovalGradeFinal: (gradeId: string, removalGrade: GradeValue) => void;
  // Consents
  updateConsentStatus: (consentId: string, field: 'coiStatus' | 'deptConsentStatus' | 'ocsConsentStatus', status: ConsentStatus) => void;
  requestConsent: (studentId: string, sectionId: string, termId: string, field: 'coiStatus' | 'deptConsentStatus' | 'ocsConsentStatus', reason?: string, ocsConsentType?: string, ocsAttachmentName?: string, ocsAttachmentDataUrl?: string) => void;
  // Evaluations
  submitEvaluation: (evaluation: Omit<Evaluation, 'id' | 'submittedAt' | 'overallRating'>) => void;  // Prerogatives
  requestPrerogative: (studentId: string, sectionId: string, termId: string, reason: string) => void;
  cancelPrerogative: (prerogativeId: string) => void;
  processPrerogative: (prerogativeId: string, status: PrerogativeStatus, facultyId: string) => void;
  // Finalize Enlistment
  finalizeEnlistment: (studentId: string, termId: string) => void;
  unfinalizeEnlistment: (studentId: string, termId: string) => void;
  // Users (Admin)
  addUser: (user: Omit<User, 'id'> & { password: string }) => Promise<void>;
  updateUser: (userId: string, updates: Partial<User> & { newPassword?: string }) => Promise<void>;
  removeUser: (userId: string) => Promise<void>;
  syncUsersToCloud: () => Promise<{ synced: number; failed: number }>;
  promoteStudents: (studentIds: string[]) => void;
  transferStudent: (studentId: string, program: string) => void;
  // Portal settings (Admin)
  updatePortalSettings: (settings: Partial<PortalSettings>) => void;
  // Academic Units (Admin)
  addCollege: (college: Omit<College, 'id'>) => void;
  updateCollege: (id: string, updates: Partial<College>) => void;
  deleteCollege: (id: string) => void;
  addDepartment: (dept: Omit<Department, 'id'>) => void;
  updateDepartment: (id: string, updates: Partial<Department>) => void;
  deleteDepartment: (id: string) => void;
  addDegreeProgram: (prog: Omit<DegreeProgram, 'id'>) => void;
  updateDegreeProgram: (id: string, updates: Partial<DegreeProgram>) => void;
  deleteDegreeProgram: (id: string) => void;
  // Rooms (Admin)
  addRoom: (room: Omit<Room, 'id'>) => void;
  updateRoom: (roomId: string, updates: Partial<Room>) => void;
  deleteRoom: (roomId: string) => void;
  // Unfinalized requests
  submitUnfinalizedRequest: (studentId: string, termId: string, reason: string) => Promise<void>;
  processUnfinalizedRequest: (requestId: string, status: UnfinalizedRequestStatus, processedBy: string, response?: string) => Promise<void>;
  dropUnfinalizedCourses: (termId: string) => Promise<void>;
  // Reconsideration requests (Permanent Disqualification)
  submitReconsiderationRequest: (studentId: string, termId: string, reason: string, requestType?: ReconsiderationRequestType) => Promise<void>;
  processReconsiderationRequest: (requestId: string, status: ReconsiderationRequestStatus, processedBy: string, response?: string) => Promise<void>;
  loadReconsiderationRequests: () => Promise<void>;
  // Change/Drop after finalization requests
  submitChangeDropRequest: (studentId: string, termId: string, reason: string, addSections?: string[], dropSections?: string[]) => Promise<void>;
  processChangeDropRequest: (requestId: string, status: ChangeDropRequestStatus, processedBy: string, response?: string) => Promise<void>;
  loadChangeDropRequests: () => Promise<void>;
  // OCS Grade & Enrollment Management
  ocsUpdateGrade: (studentId: string, sectionId: string, termId: string, grade: GradeValue | null) => void;
  ocsManualEnroll: (studentId: string, sectionId: string, termId: string) => Promise<{ success: boolean; message: string }>;
  ocsManualAddCourse: (studentId: string, courseId: string, termId: string) => Promise<{ success: boolean; message: string }>;
  ocsRemoveEnrollment: (studentId: string, sectionId: string, termId: string) => { success: boolean; message: string };
  setStudentMaxUnitsOverride: (termId: string, studentId: string, units: number | null) => void;
  setAllStudentsMaxUnitsOverride: (termId: string, units: number) => void;
  // Utils
  getActiveTerm: () => Term | undefined;
  getStudentEnrollments: (studentId: string, termId: string) => Enrollment[];
  getStudentGrades: (studentId: string, termId: string) => Array<{ grade: Grade; section: Section; course: Course }>;
  canStudentViewGrades: (studentId: string, termId: string) => boolean;
  computeGWA: (studentId: string, termId?: string) => { gwa: number; perTerm: Array<{ term: Term; gwa: number }> };
  getFacultyEvaluations: (facultyId: string, termId: string) => Evaluation[];
  getCurrentUnits: (studentId: string, termId: string) => number;
  checkPrerequisites: (studentId: string, courseId: string) => { passed: boolean; missing: string[] };
  checkCorequisites: (studentId: string, courseId: string, termId: string, cartSectionIds?: string[]) => { passed: boolean; missing: string[] };
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => {
    const s = loadState();
    if (!s.prerogatives) s.prerogatives = [];
    if (!s.finalizedEnlistments) s.finalizedEnlistments = [];
    if (!s.colleges) s.colleges = [];
    if (!s.departments) s.departments = [];
    if (!s.degreePrograms) s.degreePrograms = [];
    if (!s.rooms) s.rooms = [];
    if (!s.unfinalizedRequests) s.unfinalizedRequests = [];
    if (!s.reconsiderationRequests) s.reconsiderationRequests = [];
    if (!s.changeDropRequests) s.changeDropRequests = [];
    // Normalize prerequisites/corequisites: convert legacy flat string[] → string[][]
    s.courses = s.courses.map(c => ({
      ...c,
      prerequisites: Array.isArray(c.prerequisites) && c.prerequisites.length > 0 && typeof c.prerequisites[0] === 'string'
        ? [(c.prerequisites as unknown as string[])]
        : (c.prerequisites ?? []) as string[][],
      corequisites: Array.isArray(c.corequisites) && c.corequisites.length > 0 && typeof c.corequisites[0] === 'string'
        ? [(c.corequisites as unknown as string[])]
        : (c.corequisites ?? []) as string[][],
    }));
    // Backfill requestType for legacy records
    s.reconsiderationRequests = s.reconsiderationRequests.map(r =>
      r.requestType ? r : { ...r, requestType: 'pd_reconsideration' as const }
    );
    if (!s.portalSettings) s.portalSettings = {
      portalName: 'University AIS',
      portalTagline: 'Academic Information System',
      institutionName: 'University',
      logoUrl: '',
    };
    // Backfill new dashboard content fields
    if (!s.portalSettings.welcomeTitle) s.portalSettings.welcomeTitle = `Welcome to ${s.portalSettings.portalName}`;
    if (s.portalSettings.announcements === undefined) s.portalSettings.announcements = '';
    s.terms = s.terms.map(t => ({
      ...t,
      dropDeadline: t.dropDeadline ?? '',
      maxUnits: t.maxUnits ?? 21,
      controls: { prerogativeOpen: false, ...t.controls },
    }));
    s.courses = s.courses.map(c => ({
      requiresCOI: false,
      requiresDeptConsent: false,
      requiresOCSConsent: false,
      ...c,
      prerequisites: c.prerequisites ?? [],
      corequisites: c.corequisites ?? [],
    }));
    // Normalize section schedules: ensure days is always an array (guards against cached {})
    s.sections = s.sections.map(sec => ({
      ...sec,
      schedule: {
        days: Array.isArray(sec.schedule?.days) ? sec.schedule.days : [],
        startTime: sec.schedule?.startTime ?? '',
        endTime: sec.schedule?.endTime ?? '',
        room: sec.schedule?.room ?? '',
      },
      labSchedule: sec.labSchedule ? {
        days: Array.isArray(sec.labSchedule?.days) ? sec.labSchedule.days : [],
        startTime: sec.labSchedule?.startTime ?? '',
        endTime: sec.labSchedule?.endTime ?? '',
        room: sec.labSchedule?.room ?? '',
      } : undefined,
      isManualGrade: sec.isManualGrade ?? (sec.sectionCode === '__MANUAL__'),
    }));
    return s;
  });
  const [authReady, setAuthReady] = useState(true); // Always ready — no async auth check needed
  const hasRunInitAutoDropRef = React.useRef(false);

  // Session token — persisted in localStorage under 'ais_session'
  const SESSION_KEY = 'ais_session';
  const sessionRef = React.useRef<{ username: string; token: string } | null>(null);

  // Load all active profiles from DB (no auth required — public read policy)
  const loadProfiles = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').neq('status', 'inactive');
    if (data) {
      // Use update (not setState) so the result is also saved to localStorage
      setState(prev => {
        const next = { ...prev, users: data.map(profileToUser) };
        saveState(next);
        return next;
      });
    }
  }, []);

  // Inline normalization for raw DB/storage values: flat string[] → [[...]], string[][] stays as-is
  const toGroups = (val: unknown): string[][] => {
    if (!Array.isArray(val) || val.length === 0) return [];
    if (typeof val[0] === 'string') return [val as string[]];
    return val as string[][];
  };

  // Load courses from DB and replace local state
  const loadCourses = useCallback(async () => {
    const { data } = await supabase.from('courses').select('*');
    if (data) {
      const courses = data.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        code: row.code as string,
        title: row.title as string,
        units: row.units as number,
        labUnits: row.lab_units as number | undefined,
        type: row.type as Course['type'],
        department: row.department as string,
        isPE: row.is_pe as boolean,
        isNSTP: row.is_nstp as boolean,
        prerequisites: toGroups(row.prerequisites),
        corequisites: toGroups(row.corequisites),
        requiresCOI: row.requires_coi as boolean | undefined,
        requiresDeptConsent: row.requires_dept_consent as boolean | undefined,
        requiresOCSConsent: row.requires_ocs_consent as boolean | undefined,
        minUnitsRequired: row.min_units_required as number | undefined,
        minYearStanding: row.min_year_standing as Course['minYearStanding'] | undefined,
      }));
      setState(prev => {
        const next = { ...prev, courses };
        saveState(next);
        return next;
      });
    }
  }, []);

  // Load sections from DB and replace local state
  const loadSections = useCallback(async () => {
    const [{ data }, { data: enrollRows }] = await Promise.all([
      supabase.from('sections').select('*'),
      supabase.from('enrollments').select('section_id, status'),
    ]);
    if (data) {
      // Compute actual enrolled count from enrollment records (guards against stale DB counter)
      const countMap = new Map<string, number>();
      (enrollRows ?? []).forEach((e: { section_id: string; status: string }) => {
        if (e.status !== 'dropped') {
          countMap.set(e.section_id, (countMap.get(e.section_id) ?? 0) + 1);
        }
      });
      const sections = data.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        courseId: row.course_id as string,
        sectionCode: row.section_code as string,
        facultyId: (row.faculty_id as string) || '',
        facultyHidden: (row.faculty_hidden as boolean) ?? false,
        termId: row.term_id as string,
        enrolled: countMap.get(row.id as string) ?? 0,  // Use real count, not stale counter
        slots: row.slots as number,
        schedule: (() => {
          const raw = row.schedule as { days?: string[]; startTime?: string; endTime?: string; room?: string } | null | undefined;
          return {
            days: Array.isArray(raw?.days) ? raw!.days : [],
            startTime: raw?.startTime ?? '',
            endTime: raw?.endTime ?? '',
            room: raw?.room ?? '',
          };
        })(),
        labSchedule: (() => {
          const raw = row.lab_schedule as { days?: string[]; startTime?: string; endTime?: string; room?: string } | null | undefined;
          if (!raw) return undefined;
          return {
            days: Array.isArray(raw?.days) ? raw!.days : [],
            startTime: raw?.startTime ?? '',
            endTime: raw?.endTime ?? '',
            room: raw?.room ?? '',
          };
        })(),
        prerogativeAccepting: row.prerogative_accepting as boolean | undefined,
        isManualGrade: (row.section_code as string) === '__MANUAL__',
      }));
      setState(prev => {
        const next = { ...prev, sections };
        saveState(next);
        return next;
      });
    }
  }, []);

  const loadEnrollments = useCallback(async () => {
    const { data } = await supabase.from('enrollments').select('*');
    if (data) {
      const enrollments: Enrollment[] = data.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        studentId: row.student_id as string,
        sectionId: row.section_id as string,
        termId: row.term_id as string,
        status: row.status as Enrollment['status'],
        enlistedAt: (row.enlisted_at as string) ?? '',
        droppedAt: row.dropped_at as string | undefined,
      }));
      setState(prev => { const next = { ...prev, enrollments }; saveState(next); return next; });
    }
  }, []);

  const loadGrades = useCallback(async () => {
    const { data } = await supabase.from('grades').select('*');
    if (data) {
      const rawGrades: Grade[] = data.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        studentId: row.student_id as string,
        sectionId: row.section_id as string,
        termId: row.term_id as string,
        grade: row.grade as Grade['grade'] ?? null,
        submitted: row.submitted as boolean,
        removalGrade: row.removal_grade as Grade['removalGrade'] ?? undefined,
        removalSubmitted: row.removal_submitted as boolean ?? false,
        removalPostedAt: (row.removal_posted_at ?? (row.removal_submitted ? row.created_at : undefined)) as string ?? undefined,
      }));
      // Auto-convert expired 4.0 grades (purely time-based: 3+ terms after grade = 5.0)
      let gradesToPersist: Grade[] = [];
      setState(prev => {
        const sorted = sortTermsChronologically(prev.terms);
        const refTerm = sorted.find(t => t.isActive) ?? sorted[sorted.length - 1];
        let grades = rawGrades;
        if (refTerm) {
          const removalPostedAt = new Date().toISOString();
          const expired = rawGrades.filter(g =>
            g.grade === '4' && g.submitted && !g.removalSubmitted &&
            shouldAutoConvert40(g, rawGrades, prev.sections, sorted, refTerm.id)
          );
          if (expired.length) {
            gradesToPersist = expired;
            grades = rawGrades.map(g =>
              expired.some(e => e.id === g.id)
                ? { ...g, removalGrade: '5' as GradeValue, removalSubmitted: true, removalPostedAt }
                : g
            );
          }
        }
        const next = { ...prev, grades };
        saveState(next);
        return next;
      });
      // Persist auto-conversions to DB so all portals stay in sync (fire-and-forget)
      if (gradesToPersist.length) {
        const now = new Date().toISOString();
        gradesToPersist.forEach(g => {
          supabase.from('grades').update({
            removal_grade: '5',
            removal_submitted: true,
            removal_posted_at: now,
          }).eq('id', g.id).then(({ error }) => {
            if (error) console.error('Auto-convert 4.0→5.0 error:', error.message);
          });
        });
      }
    }
  }, []);

  const loadPrerogatives = useCallback(async () => {
    const { data } = await supabase.from('prerogatives').select('*');
    if (data) {
      const prerogatives: Prerogative[] = data.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        studentId: row.student_id as string,
        sectionId: row.section_id as string,
        termId: row.term_id as string,
        reason: row.reason as string,
        status: row.status as Prerogative['status'],
        requestedAt: row.requested_at as string,
        processedAt: row.processed_at as string | undefined,
        processedBy: row.processed_by as string | undefined,
      }));
      setState(prev => { const next = { ...prev, prerogatives }; saveState(next); return next; });
    }
  }, []);

  // Save a key to app_settings in DB (for cross-device sync)
  const saveAppSetting = useCallback(async (key: string, value: unknown) => {
    await supabase.from('app_settings').upsert(
      { key, value, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );
  }, []);

  // Load synced settings from DB (terms, portal settings, academic units)
  const loadAppSettings = useCallback(async () => {
    const { data } = await supabase.from('app_settings').select('key, value');
    if (!data || data.length === 0) return;
    const map: Record<string, unknown> = {};
    data.forEach((row: { key: string; value: unknown }) => { map[row.key] = row.value; });

    setState(prev => {
      const next = { ...prev } as AppState;
      if (map.terms) next.terms = map.terms as AppState['terms'];
      if (map.portal_settings) next.portalSettings = map.portal_settings as AppState['portalSettings'];
      if (map.academic_units) {
        const au = map.academic_units as { colleges: AppState['colleges']; departments: AppState['departments']; degreePrograms: AppState['degreePrograms'] };
        next.colleges = au.colleges ?? prev.colleges;
        next.departments = au.departments ?? prev.departments;
        next.degreePrograms = au.degreePrograms ?? prev.degreePrograms;
      }
      if (map.finalized_enlistments) next.finalizedEnlistments = map.finalized_enlistments as AppState['finalizedEnlistments'];
      if (map.rooms) next.rooms = map.rooms as AppState['rooms'];
      if (map.unfinalized_requests) next.unfinalizedRequests = map.unfinalized_requests as AppState['unfinalizedRequests'];
      if (map.reconsideration_requests) next.reconsiderationRequests = map.reconsideration_requests as AppState['reconsiderationRequests'];
      if (map.change_drop_requests) next.changeDropRequests = map.change_drop_requests as AppState['changeDropRequests'];
      // Critical: consents, evaluations are localStorage-only without these
      if (map.consents) next.consents = map.consents as AppState['consents'];
      else if (prev.consents.length > 0) {
        saveAppSetting('consents', prev.consents);
      }
      if (map.evaluations) next.evaluations = map.evaluations as AppState['evaluations'];
      else if (prev.evaluations.length > 0) {
        saveAppSetting('evaluations', prev.evaluations);
      }
      saveState(next);
      return next;
    });
  }, [saveAppSetting]);

  // On mount: handle Google OAuth callback OR validate saved custom session
  useEffect(() => {
    // Always load portal & app settings — needed so login page shows admin-configured branding
    // on any device, even before the user has ever logged in on that device.
    loadAppSettings();

    if (state.currentUser) {
      supabase.from('profiles')
        .select('local_id, status')
        .eq('local_id', state.currentUser.id)
        .neq('status', 'inactive')
        .maybeSingle()
        .then(({ data: profile }) => {
          if (!profile) {
            // User no longer exists or inactive in DB — clear session
            setState(prev => {
              const next = { ...prev, currentUser: null, users: [] };
              saveState(next);
              return next;
            });
          } else {
            loadProfiles();
            loadSections();
            loadCourses();
            loadEnrollments();
            loadGrades();
            loadPrerogatives();
            loadAppSettings();
          }
        });
    } else {
      // No custom session — check if returning from Google OAuth
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (!session?.user?.email) return;
        const email = session.user.email;
        // Sign out of Supabase Auth immediately — we only needed it for email verification
        await supabase.auth.signOut();

        // Find matching AIS profile by email (case-insensitive)
        const { data: profiles } = await supabase.from('profiles')
          .select('*')
          .ilike('email', email)
          .neq('status', 'inactive')
          .limit(1);

        if (!profiles || profiles.length === 0) {
          sessionStorage.setItem('sso_error',
            `Google account (${email}) is not registered in the system. Ask your admin to add your Gmail to your account profile.`
          );
          return;
        }

        const user = profileToUser(profiles[0]);
        const token = crypto.randomUUID();
        const sesh = { username: user.username, token };
        sessionRef.current = sesh;
        localStorage.setItem(SESSION_KEY, JSON.stringify(sesh));
        supabase.rpc('set_session_token', { p_username: user.username, p_token: token }).then(() => {});

        setState(prev => {
          const next = { ...prev, currentUser: user };
          saveState(next);
          return next;
        });
        saveCurrentUser(user);
        loadProfiles();
        loadSections();
        loadCourses();
        loadEnrollments();
        loadGrades();
        loadPrerogatives();
        loadAppSettings();
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-drop: run once per session after sections are loaded — drops enlisted-but-not-finalized students when deadline has passed
  useEffect(() => {
    if (!state.currentUser || hasRunInitAutoDropRef.current) return;
    if (state.sections.length === 0) return; // wait for DB load
    hasRunInitAutoDropRef.current = true;
    const now = new Date();
    state.terms.forEach(term => {
      if (term.unfinalizedDeadline && now >= new Date(term.unfinalizedDeadline)) {
        dropUnfinalizedCourses(term.id);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentUser?.id, state.sections.length]);

  // Periodic refresh every 60 seconds to keep all portals in sync across devices
  useEffect(() => {
    if (!state.currentUser) return;
    // Reload session token from localStorage (needed after page refresh)
    if (!sessionRef.current) {
      try { const raw = localStorage.getItem(SESSION_KEY); if (raw) sessionRef.current = JSON.parse(raw); } catch (_e) { /* ignore */ }
    }
    const interval = setInterval(async () => {
      // Verify session token — if another device logged in, invalidate this session
      const session = sessionRef.current;
      if (session) {
        const { data: valid } = await supabase.rpc('verify_session_token', {
          p_username: session.username,
          p_token: session.token,
        });
        if (!valid) {
          sessionRef.current = null;
          localStorage.removeItem(SESSION_KEY);
          saveCurrentUser(null);
          localStorage.setItem('ais_logout_reason', 'session_expired');
          setState(prev => { const next = { ...prev, currentUser: null, users: [] }; saveState(next); return next; });
          window.location.href = '/login';
          return;
        }
      }
      loadProfiles();
      loadSections();
      loadCourses();
      loadEnrollments();
      loadGrades();
      loadPrerogatives();
      loadAppSettings();
    }, 60000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentUser?.id]);

  // Always-on realtime: push portal_settings changes to all devices/tabs immediately
  // This ensures admin branding updates are reflected on the login page in real-time.
  useEffect(() => {
    const channel = supabase
      .channel('portal_settings_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_settings', filter: 'key=eq.portal_settings' },
        (payload) => {
          const newVal = (payload.new as { value?: AppState['portalSettings'] })?.value;
          if (newVal) {
            setState(prev => {
              const next = { ...prev, portalSettings: { ...prev.portalSettings, ...newVal } };
              saveState(next);
              return next;
            });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Realtime subscription: watch app_settings for change_drop_requests updates — push to all portals instantly
  useEffect(() => {
    if (!state.currentUser) return;
    const channel = supabase
      .channel('change_drop_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_settings', filter: 'key=eq.change_drop_requests' },
        () => { loadAppSettings(); }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'app_settings', filter: 'key=eq.reconsideration_requests' },
        () => { loadAppSettings(); }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'app_settings', filter: 'key=eq.finalized_enlistments' },
        () => { loadAppSettings(); }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'app_settings', filter: 'key=eq.consents' },
        () => { loadAppSettings(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'prerogatives' },
        () => { loadPrerogatives(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'courses' },
        () => { loadCourses(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sections' },
        () => { loadSections(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'grades' },
        () => { loadGrades(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentUser?.id]);

  const update = useCallback((updater: (prev: AppState) => AppState) => {
    setState(prev => {
      const next = updater(prev);
      saveState(next);
      return next;
    });
  }, []);

  // LOGIN: Direct RPC call — fast, no edge function cold start
  const login = useCallback(async (username: string, password: string): Promise<User> => {
    const { data, error } = await supabase.rpc('authenticate_user', {
      p_username: username.trim(),
      p_password: password,
    });

    if (error) throw new Error(error.message || 'Login failed');
    if (!data || data.length === 0) throw new Error('Invalid username or password.');

    const currentUser = profileToUser(data[0]);

    // Set currentUser immediately and persist to dedicated localStorage key (never overwritten by background loads)
    setState(prev => {
      const next = { ...prev, currentUser };
      saveState(next);
      return next;
    });
    saveCurrentUser(currentUser); // separate key — immune to cross-tab race conditions

    // Generate a unique session token — ensures only one active session per account
    const token = crypto.randomUUID();
    const session = { username: currentUser.username, token };
    sessionRef.current = session;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    supabase.rpc('set_session_token', { p_username: currentUser.username, p_token: token }).then(() => {});

    // Load all profiles + sections in background (non-blocking)
    supabase.from('profiles').select('*').neq('status', 'inactive').then(({ data: allProfiles }) => {
      if (allProfiles) {
        setState(prev => {
          const next = { ...prev, users: allProfiles.map(profileToUser) };
          saveState(next);
          return next;
        });
      }
    });
    loadSections();
    loadCourses();
    loadEnrollments();
    loadGrades();
    loadPrerogatives();
    loadAppSettings();

    return currentUser;
  }, [loadSections, loadCourses, loadEnrollments, loadGrades, loadPrerogatives, loadAppSettings]);

  // Google SSO — redirects to Google; callback is handled on return in the mount effect
  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) throw new Error(error.message || 'Google sign-in failed. Make sure Google OAuth is enabled in the project settings.');
  };

  // LOGOUT — clear state only (no Supabase Auth session to end)
  const logout = useCallback(async () => {
    // Invalidate session token in DB so other devices are kicked out
    const session = sessionRef.current;
    if (session) {
      supabase.rpc('set_session_token', { p_username: session.username, p_token: '' }).then(() => {});
      sessionRef.current = null;
    }
    localStorage.removeItem(SESSION_KEY);
    saveCurrentUser(null); // clear dedicated currentUser key
    setState(prev => {
      const next = { ...prev, currentUser: null, users: [] };
      saveState(next); // clear currentUser from localStorage so refresh doesn't auto-login
      return next;
    });
  }, []);

  const getActiveTerm = useCallback(() => state.terms.find(t => t.isActive), [state.terms]);

  const setActiveTerm = useCallback((termId: string) => {
    update(s => {
      const next = { ...s, terms: s.terms.map(t => ({ ...t, isActive: t.id === termId })) };
      saveAppSetting('terms', next.terms);
      return next;
    });
  }, [update, saveAppSetting]);

  const addTerm = useCallback((term: Omit<Term, 'id'>) => {
    const id = `term-${Date.now()}`;
    update(s => {
      const next = { ...s, terms: [...s.terms, { ...term, id }] };
      saveAppSetting('terms', next.terms);
      return next;
    });
  }, [update, saveAppSetting]);

  const deleteTerm = useCallback((termId: string) => {
    // 1. Delete term-specific records from Supabase
    supabase.from('sections').delete().eq('term_id', termId).then(() => {});
    supabase.from('enrollments').delete().eq('term_id', termId).then(() => {});
    supabase.from('grades').delete().eq('term_id', termId).then(() => {});
    supabase.from('prerogatives').delete().eq('term_id', termId).then(() => {});

    // 2. Cascade local state
    update(s => {
      const remainingSections = s.sections.filter(sec => sec.termId !== termId);
      // Courses that have NO sections in any remaining term are now orphaned — delete them too
      const coursesWithRemainingSections = new Set(remainingSections.map(sec => sec.courseId));
      const orphanedCourseIds = s.courses
        .filter(c => !coursesWithRemainingSections.has(c.id))
        .map(c => c.id);
      if (orphanedCourseIds.length > 0) {
        supabase.from('courses').delete().in('id', orphanedCourseIds)
          .then(({ error }) => { if (error) console.error('deleteTerm orphan courses DB error:', error.message); });
      }

      const next = {
        ...s,
        terms:                  s.terms.filter(t => t.id !== termId),
        sections:               remainingSections,
        courses:                s.courses.filter(c => !orphanedCourseIds.includes(c.id)),
        grades:                 s.grades.filter(g => g.termId !== termId),
        enrollments:            s.enrollments.filter(e => e.termId !== termId),
        consents:               s.consents.filter(c => c.termId !== termId),
        prerogatives:           s.prerogatives.filter(p => p.termId !== termId),
        evaluations:            s.evaluations.filter(ev => ev.termId !== termId),
        finalizedEnlistments:   s.finalizedEnlistments.filter(f => f.termId !== termId),
        unfinalizedRequests:    s.unfinalizedRequests.filter(r => r.termId !== termId),
        reconsiderationRequests: s.reconsiderationRequests.filter(r => r.termId !== termId),
      };
      saveAppSetting('terms', next.terms);
      saveAppSetting('consents', next.consents);
      saveAppSetting('evaluations', next.evaluations);
      saveAppSetting('finalized_enlistments', next.finalizedEnlistments);
      saveAppSetting('unfinalized_requests', next.unfinalizedRequests);
      saveAppSetting('reconsideration_requests', next.reconsiderationRequests);
      return next;
    });
  }, [update, saveAppSetting]);

  const updateTermControls = useCallback((termId: string, controls: Partial<Term['controls']>) => {
    update(s => {
      const next = { ...s, terms: s.terms.map(t => t.id === termId ? { ...t, controls: { ...t.controls, ...controls } } : t) };
      saveAppSetting('terms', next.terms);
      return next;
    });
  }, [update, saveAppSetting]);

  const updateTermSettings = useCallback((termId: string, updates: Partial<Term>) => {
    update(s => {
      const next = { ...s, terms: s.terms.map(t => t.id === termId ? { ...t, ...updates } : t) };
      saveAppSetting('terms', next.terms);
      return next;
    });
  }, [update, saveAppSetting]);

  const addCourse = useCallback((course: Omit<Course, 'id'>) => {
    const id = `c-${Date.now()}`;
    const newCourse = { ...course, id };
    update(s => ({ ...s, courses: [...s.courses, newCourse] }));
    supabase.from('courses').insert({
      id,
      code: course.code,
      title: course.title,
      units: course.units,
      lab_units: course.labUnits ?? null,
      type: course.type,
      department: course.department,
      is_pe: course.isPE,
      is_nstp: course.isNSTP,
      prerequisites: course.prerequisites ?? [],
      corequisites: course.corequisites ?? [],
      requires_coi: course.requiresCOI ?? false,
      requires_dept_consent: course.requiresDeptConsent ?? false,
      requires_ocs_consent: course.requiresOCSConsent ?? false,
      min_units_required: course.minUnitsRequired ?? null,
      min_year_standing: course.minYearStanding ?? null,
    }).then(({ error }) => { if (error) console.error('addCourse DB error:', error.message); });
  }, [update]);

  const updateCourse = useCallback((courseId: string, updates: Partial<Course>) => {
    update(s => ({
      ...s,
      courses: s.courses.map(c => c.id === courseId ? { ...c, ...updates } : c),
    }));
    const dbUpdates: Record<string, unknown> = {};
    if (updates.code !== undefined) dbUpdates.code = updates.code;
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.units !== undefined) dbUpdates.units = updates.units;
    // labUnits, minUnitsRequired, minYearStanding can be cleared (undefined → NULL in DB)
    if ('labUnits' in updates) dbUpdates.lab_units = updates.labUnits ?? null;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.department !== undefined) dbUpdates.department = updates.department;
    if (updates.isPE !== undefined) dbUpdates.is_pe = updates.isPE;
    if (updates.isNSTP !== undefined) dbUpdates.is_nstp = updates.isNSTP;
    if (updates.prerequisites !== undefined) dbUpdates.prerequisites = updates.prerequisites;
    if (updates.corequisites !== undefined) dbUpdates.corequisites = updates.corequisites;
    if (updates.requiresCOI !== undefined) dbUpdates.requires_coi = updates.requiresCOI;
    if (updates.requiresDeptConsent !== undefined) dbUpdates.requires_dept_consent = updates.requiresDeptConsent;
    if (updates.requiresOCSConsent !== undefined) dbUpdates.requires_ocs_consent = updates.requiresOCSConsent;
    // Always include these — even undefined means "clear to NULL"
    if ('minUnitsRequired' in updates) dbUpdates.min_units_required = updates.minUnitsRequired ?? null;
    if ('minYearStanding' in updates) dbUpdates.min_year_standing = updates.minYearStanding ?? null;
    if (Object.keys(dbUpdates).length > 0) {
      supabase.from('courses').update(dbUpdates).eq('id', courseId)
        .then(({ error }) => { if (error) console.error('updateCourse DB error:', error.message); });
    }
  }, [update]);

  const deleteCourse = useCallback((courseId: string) => {
    update(s => {
      const affectedSectionIds = s.sections.filter(sec => sec.courseId === courseId).map(sec => sec.id);
      // Cascade: delete dependents from DB
      if (affectedSectionIds.length > 0) {
        supabase.from('grades').delete().in('section_id', affectedSectionIds).then(({ error }) => {
          if (error) console.error('deleteCourse grades cascade error:', error.message);
        });
        supabase.from('enrollments').delete().in('section_id', affectedSectionIds).then(({ error }) => {
          if (error) console.error('deleteCourse enrollments cascade error:', error.message);
        });
        supabase.from('prerogatives').delete().in('section_id', affectedSectionIds).then(({ error }) => {
          if (error) console.error('deleteCourse prerogatives cascade error:', error.message);
        });
        supabase.from('sections').delete().in('id', affectedSectionIds).then(({ error }) => {
          if (error) console.error('deleteCourse sections cascade error:', error.message);
        });
      }
      supabase.from('courses').delete().eq('id', courseId)
        .then(({ error }) => { if (error) console.error('deleteCourse DB error:', error.message); });
      return {
        ...s,
        courses: s.courses.filter(c => c.id !== courseId),
        sections: s.sections.filter(sec => sec.courseId !== courseId),
        enrollments: s.enrollments.filter(e => !affectedSectionIds.includes(e.sectionId)),
        grades: s.grades.filter(g => !affectedSectionIds.includes(g.sectionId)),
        prerogatives: s.prerogatives.filter(p => !affectedSectionIds.includes(p.sectionId)),
      };
    });
  }, [update]);

  const addSection = useCallback((section: Omit<Section, 'id'>) => {
    const id = `sec-${Date.now()}`;
    const newSection = { ...section, id };
    update(s => ({ ...s, sections: [...s.sections, newSection] }));
    // Sync to DB
    supabase.from('sections').insert({
      id,
      course_id: section.courseId,
      section_code: section.sectionCode,
      faculty_id: section.facultyId || null,
      faculty_hidden: section.facultyHidden ?? false,
      term_id: section.termId,
      enrolled: section.enrolled,
      slots: section.slots,
      schedule: section.schedule,
      lab_schedule: section.labSchedule || null,
      prerogative_accepting: section.prerogativeAccepting ?? true,
    }).then(({ error }) => { if (error) console.error('addSection DB error:', error.message); });
  }, [update]);

  const updateSection = useCallback((sectionId: string, updates: Partial<Section>) => {
    update(s => ({
      ...s,
      sections: s.sections.map(sec => sec.id === sectionId ? { ...sec, ...updates } : sec),
    }));
    // Sync to DB (build snake_case update)
    const dbUpdates: Record<string, unknown> = {};
    if (updates.courseId !== undefined) dbUpdates.course_id = updates.courseId;
    if (updates.sectionCode !== undefined) dbUpdates.section_code = updates.sectionCode;
    if (updates.facultyId !== undefined) dbUpdates.faculty_id = updates.facultyId || null;
    if (updates.facultyHidden !== undefined) dbUpdates.faculty_hidden = updates.facultyHidden;
    if (updates.termId !== undefined) dbUpdates.term_id = updates.termId;
    if (updates.enrolled !== undefined) dbUpdates.enrolled = updates.enrolled;
    if (updates.slots !== undefined) dbUpdates.slots = updates.slots;
    if (updates.schedule !== undefined) dbUpdates.schedule = updates.schedule;
    if (updates.labSchedule !== undefined) dbUpdates.lab_schedule = updates.labSchedule || null;
    if (updates.prerogativeAccepting !== undefined) dbUpdates.prerogative_accepting = updates.prerogativeAccepting;
    if (Object.keys(dbUpdates).length > 0) {
      supabase.from('sections').update(dbUpdates).eq('id', sectionId)
        .then(({ error }) => { if (error) console.error('updateSection DB error:', error.message); });
    }
  }, [update]);

  const deleteSection = useCallback((sectionId: string) => {
    update(s => ({ ...s, sections: s.sections.filter(sec => sec.id !== sectionId) }));
    supabase.from('sections').delete().eq('id', sectionId)
      .then(({ error }) => { if (error) console.error('deleteSection DB error:', error.message); });
  }, [update]);

  // Normalize prereq/coreq: handles both flat string[] (old) and string[][] (new)
  const normalizeGroups = (val: string[][] | undefined): string[][] => {
    if (!val || val.length === 0) return [];
    if (typeof (val as unknown[])[0] === 'string') return [(val as unknown as string[])];
    return val;
  };

  const checkPrerequisites = useCallback((studentId: string, courseId: string) => {
    const course = state.courses.find(c => c.id === courseId);
    if (!course) return { passed: true, missing: [] };
    const groups = normalizeGroups(course.prerequisites);
    if (groups.length === 0) return { passed: true, missing: [] };

    const isPrereqPassed = (prereqId: string) => {
      const grade = state.grades.find(g => {
        if (g.studentId !== studentId || !g.submitted) return false;
        const sec = state.sections.find(s => s.id === g.sectionId);
        return sec?.courseId === prereqId;
      });
      if (!grade) return false;
      // Use removal grade if officially submitted (removal exam passed), else original grade
      const effective = (grade.removalSubmitted && grade.removalGrade) ? grade.removalGrade : grade.grade;
      return !!(effective && !['4', '5', 'INC', 'DRP', 'F'].includes(effective));
    };

    // Pass if ANY group is fully satisfied (OR between groups)
    for (const group of groups) {
      if (group.every(id => isPrereqPassed(id))) return { passed: true, missing: [] };
    }

    // Build readable missing list across all groups
    const missing = [...new Set(groups.flat().filter(id => !isPrereqPassed(id)).map(id => state.courses.find(c => c.id === id)?.code ?? id))];
    return { passed: false, missing };
  }, [state]);

  const checkCorequisites = useCallback((studentId: string, courseId: string, termId: string, cartSectionIds?: string[]) => {
    const course = state.courses.find(c => c.id === courseId);
    if (!course) return { passed: true, missing: [] };
    const groups = normalizeGroups(course.corequisites);
    if (groups.length === 0) return { passed: true, missing: [] };

    const isCoreqEnrolled = (coreqId: string) => {
      // Check actual enrollments
      const inEnrollments = state.enrollments.some(e => {
        if (e.studentId !== studentId || e.termId !== termId || e.status === 'dropped') return false;
        const sec = state.sections.find(s => s.id === e.sectionId);
        return sec?.courseId === coreqId;
      });
      if (inEnrollments) return true;
      // Also check the cart (sections about to be enlisted together)
      if (cartSectionIds?.length) {
        return cartSectionIds.some(sid => {
          const sec = state.sections.find(s => s.id === sid);
          return sec?.courseId === coreqId;
        });
      }
      return false;
    };

    for (const group of groups) {
      if (group.every(id => isCoreqEnrolled(id))) return { passed: true, missing: [] };
    }

    const missing = [...new Set(groups.flat().filter(id => !isCoreqEnrolled(id)).map(id => state.courses.find(c => c.id === id)?.code ?? id))];
    return { passed: false, missing };
  }, [state]);

  const getCurrentUnits = useCallback((studentId: string, termId: string) => {
    return state.enrollments
      .filter(e => e.studentId === studentId && e.termId === termId && e.status !== 'dropped')
      .reduce((sum, e) => {
        const sec = state.sections.find(s => s.id === e.sectionId);
        const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
        if (!course || course.isPE || course.isNSTP) return sum;
        return sum + course.units + (course.labUnits ?? 0);
      }, 0);
  }, [state]);

  const enlistSection = useCallback(async (studentId: string, sectionId: string, termId: string, cartSectionIds?: string[]): Promise<{ success: boolean; message: string }> => {
    const already = state.enrollments.find(e => e.studentId === studentId && e.sectionId === sectionId && e.termId === termId && e.status !== 'dropped');
    if (already) return { success: false, message: 'Already enlisted in this section.' };

    // Course-level duplicate check: block enrolling in multiple sections of the same course
    const sec0 = state.sections.find(s => s.id === sectionId);
    if (sec0) {
      const courseAlready = state.enrollments.find(e =>
        e.studentId === studentId && e.termId === termId && e.status !== 'dropped' &&
        state.sections.find(s => s.id === e.sectionId)?.courseId === sec0.courseId
      );
      if (courseAlready) return { success: false, message: 'Already enrolled in a section of this course.' };
    }

    // Permanent disqualification check — covers admin-set status AND grade-based PD
    const studentUser = state.users.find(u => u.id === studentId);
    const isStudentPDByStatus = studentUser?.status === 'permanently_disqualified' ||
      (state.currentUser?.id === studentId && state.currentUser?.status === 'permanently_disqualified');
    const isStudentPDByGrades = state.terms.some(t =>
      getScholasticStanding(studentId, t.id, state.grades, state.sections, state.courses)?.standing === 'Permanent Disqualification'
    );
    // Check if student has an approved PD reconsideration for the active term
    const activeTermForPD = state.terms.find(t => t.isActive);
    const hasApprovedPDRecon = activeTermForPD && (state.reconsiderationRequests ?? []).some(
      r => r.studentId === studentId && r.termId === activeTermForPD.id &&
           (!r.requestType || r.requestType === 'pd_reconsideration') &&
           r.status === 'approved'
    );
    const isStudentPD = (isStudentPDByStatus || isStudentPDByGrades) && !hasApprovedPDRecon;
    if (isStudentPD) {
      return { success: false, message: 'Enlistment is blocked: your account has been permanently disqualified. Please submit a reconsideration request to the OCS.' };
    }

    const sec = state.sections.find(s => s.id === sectionId);
    if (!sec) return { success: false, message: 'Section not found.' };

    // Check if student has an approved prerogative for this section (bypasses slot limit)
    const hasApprovedPrerog = state.prerogatives.some(
      p => p.studentId === studentId && p.sectionId === sectionId && p.status === 'approved'
    );
    // Slot check is handled atomically by the DB RPC (enlist_student_atomic).
    // hasApprovedPrerog bypasses the slot limit — passed to the RPC as p_bypass_slot.

    const course = state.courses.find(c => c.id === sec.courseId);
    if (!course) return { success: false, message: 'Course not found.' };

    // Already-passed course check — strictly block re-enlisting in any previously passed course
    const alreadyPassedCourse = state.grades.some(g => {
      if (g.studentId !== studentId || !g.submitted) return false;
      const gradeSec = state.sections.find(s => s.id === g.sectionId);
      if (!gradeSec || gradeSec.courseId !== course.id) return false;
      // Use effective grade (consider removal/completion grades)
      const effectiveGrade = (g.removalSubmitted && g.removalGrade) ? g.removalGrade : g.grade;
      if (!effectiveGrade) return false;
      const failGrades = ['4', '5', 'INC', 'DRP', 'F'];
      return !failGrades.includes(String(effectiveGrade));
    });
    if (alreadyPassedCourse) {
      return { success: false, message: `You have already passed ${course.code}. Re-enlisting in a previously passed course is strictly not permitted.` };
    }

    // Duplicate course check — already enlisted in a DIFFERENT section of the same course
    const duplicateCourse = state.enrollments.some(e => {
      if (e.studentId !== studentId || e.termId !== termId || e.status === 'dropped') return false;
      const s = state.sections.find(x => x.id === e.sectionId);
      return s?.courseId === sec.courseId;
    });
    if (duplicateCourse) return { success: false, message: `You are already enlisted in ${course.code}. You cannot enlist two sections of the same course.` };

    const term = state.terms.find(t => t.id === termId);
    if (term?.maxUnits && !course.isPE && !course.isNSTP) {
      const currentUnits = state.enrollments
        .filter(e => e.studentId === studentId && e.termId === termId && e.status !== 'dropped')
        .reduce((sum, e) => {
          const s = state.sections.find(x => x.id === e.sectionId);
          const c = s ? state.courses.find(x => x.id === s.courseId) : null;
          if (!c || c.isPE || c.isNSTP) return sum;
          return sum + c.units + (c.labUnits ?? 0);
        }, 0);
      const addingUnits = course.units + (course.labUnits ?? 0);
      if (currentUnits + addingUnits > term.maxUnits) {
        return { success: false, message: `Exceeds maximum unit load of ${term.maxUnits} units.` };
      }
    }

    // Minimum passed units check (not applicable for PE/NSTP)
    if (course.minUnitsRequired != null && !course.isPE && !course.isNSTP) {
      const passedUnits = getPassedUnits(studentId, state.grades, state.sections, state.courses, state.enrollments);
      if (passedUnits < course.minUnitsRequired) {
        return { success: false, message: `This course requires at least ${course.minUnitsRequired} passed units. You currently have ${passedUnits}.` };
      }
    }

    // Minimum year standing check (not applicable for PE/NSTP)
    if (course.minYearStanding && !course.isPE && !course.isNSTP) {
      const student = state.users.find(u => u.id === studentId);
      const prog = state.degreePrograms.find(p => p.name === student?.program);
      const totalProgramUnits = prog?.totalUnits ?? 0;
      if (totalProgramUnits > 0) {
        const passedUnits = getPassedUnits(studentId, state.grades, state.sections, state.courses, state.enrollments);
        const studentYearClass = getYearClassification(passedUnits, totalProgramUnits);
        const yearRank: Record<string, number> = { Freshman: 0, Sophomore: 1, Junior: 2, Senior: 3 };
        if ((yearRank[studentYearClass] ?? 0) < (yearRank[course.minYearStanding] ?? 0)) {
          return { success: false, message: `This course requires at least ${course.minYearStanding} standing. Your current classification is ${studentYearClass}.` };
        }
      }
    }

    // Always look up consent record — students can apply OCS Waiver of Pre-requisite on any course
    const consentRecord = state.consents.find(c => c.studentId === studentId && c.sectionId === sectionId && c.termId === termId);

    // Consent check — must happen before prereq check so waiver can bypass prereqs
    if (course.requiresCOI && consentRecord?.coiStatus !== 'approved') {
      return { success: false, message: 'This course requires an approved Consent of Instructor (COI) before enlisting.' };
    }
    if (course.requiresDeptConsent && consentRecord?.deptConsentStatus !== 'approved') {
      return { success: false, message: 'This course requires an approved Department Consent before enlisting.' };
    }
    if (course.requiresOCSConsent && consentRecord?.ocsConsentStatus !== 'approved') {
      return { success: false, message: 'This course requires an approved OCS Consent before enlisting.' };
    }
    // OCS "Waiver of Pre-requisite" bypasses the prerequisite check regardless of requiresOCSConsent flag
    const hasOCSPrereqWaiver =
      consentRecord?.ocsConsentStatus === 'approved' &&
      consentRecord?.ocsConsentType === 'Waiver of Pre-requisite';

    const prereqCheck = (() => {
      if (hasOCSPrereqWaiver) return { passed: true, missing: [] };
      const groups = normalizeGroups(course.prerequisites);
      if (groups.length === 0) return { passed: true, missing: [] };

      const isPrereqPassed = (prereqId: string) => {
        const grade = state.grades.find(g => {
          if (g.studentId !== studentId || !g.submitted) return false;
          const s = state.sections.find(x => x.id === g.sectionId);
          return s?.courseId === prereqId;
        });
        if (!grade) return false;
        const effective = (grade.removalSubmitted && grade.removalGrade) ? grade.removalGrade : grade.grade;
        return !!(effective && !['4', '5', 'INC', 'DRP', 'F'].includes(effective));
      };

      for (const group of groups) {
        if (group.every(id => isPrereqPassed(id))) return { passed: true, missing: [] };
      }
      const missing = [...new Set(groups.flat().filter(id => !isPrereqPassed(id)).map(id => state.courses.find(c => c.id === id)?.code ?? id))];
      return { passed: false, missing };
    })();

    if (!prereqCheck.passed) {
      return { success: false, message: `Prerequisites not satisfied: ${prereqCheck.missing.join(', ')}` };
    }
    const coreqCheck = (() => {
      const groups = normalizeGroups(course.corequisites);
      if (groups.length === 0) return { passed: true, missing: [] };

      const isCoreqEnrolled = (coreqId: string) => {
        const inEnrollments = state.enrollments.some(e => {
          if (e.studentId !== studentId || e.termId !== termId || e.status === 'dropped') return false;
          const s = state.sections.find(x => x.id === e.sectionId);
          return s?.courseId === coreqId;
        });
        if (inEnrollments) return true;
        // Also accept cart items as satisfying corequisites (being enlisted together)
        return !!cartSectionIds?.some(sid => {
          const s = state.sections.find(x => x.id === sid);
          return s?.courseId === coreqId;
        });
      };

      for (const group of groups) {
        if (group.every(id => isCoreqEnrolled(id))) return { passed: true, missing: [] };
      }
      const missing = [...new Set(groups.flat().filter(id => !isCoreqEnrolled(id)).map(id => state.courses.find(c => c.id === id)?.code ?? id))];
      return { passed: false, missing };
    })();
    if (!coreqCheck.passed) {
      return { success: false, message: `Corequisites not satisfied — you must also enlist: ${coreqCheck.missing.join(', ')}` };
    }

    const studentSections = state.enrollments
      .filter(e => e.studentId === studentId && e.termId === termId && e.status !== 'dropped')
      .map(e => state.sections.find(s => s.id === e.sectionId))
      .filter(Boolean) as Section[];

    const hasOverlap = studentSections.some(existing =>
      schedulesOverlap(existing.schedule, sec.schedule) ||
      (sec.labSchedule && schedulesOverlap(existing.schedule, sec.labSchedule)) ||
      (existing.labSchedule && schedulesOverlap(existing.labSchedule, sec.schedule))
    );
    if (hasOverlap) return { success: false, message: 'Schedule conflict detected.' };

    const enrollment: Enrollment = {
      id: `enr-${Date.now()}`,
      studentId, sectionId, termId,
      status: 'enlisted',   // slot reserved — NOT yet officially enrolled
      enlistedAt: new Date().toISOString().split('T')[0],
    };
    // Atomic DB call — locks section row, verifies slots, inserts enrollment (FCFS guarantee)
    const { data: rpcData, error: rpcError } = await supabase.rpc('enlist_student_atomic', {
      p_enrollment_id: enrollment.id,
      p_student_id:    studentId,
      p_section_id:    sectionId,
      p_term_id:       termId,
      p_enlisted_at:   enrollment.enlistedAt,
      p_bypass_slot:   hasApprovedPrerog,
    });
    if (rpcError || !rpcData?.success) {
      const msg = rpcData?.message ?? rpcError?.message ?? 'Enlistment failed. Please try again.';
      return { success: false, message: msg };
    }
    const newEnrolled: number = rpcData.new_enrolled ?? (sec.enrolled + 1);
    // NOTE: Grade records are created only when the student FINALIZES their enlistment
    update(s => ({
      ...s,
      enrollments: [...s.enrollments, enrollment],
      sections: s.sections.map(sec => sec.id === sectionId ? { ...sec, enrolled: newEnrolled } : sec),
    }));
    return { success: true, message: 'Successfully enlisted. Finalize your enlistment to officially enroll.' };
  }, [state, update]);

  const enlistWithPrerogative = useCallback((studentId: string, sectionId: string, termId: string) => {
    const already = state.enrollments.find(e => e.studentId === studentId && e.sectionId === sectionId && e.termId === termId && e.status !== 'dropped');
    if (already) return;
    const enrollment: Enrollment = {
      id: `enr-${Date.now()}`,
      studentId, sectionId, termId,
      status: 'enlisted',
      enlistedAt: new Date().toISOString().split('T')[0],
    };
    const grade: Grade = {
      id: `gr-${Date.now()}`,
      studentId, sectionId, termId,
      grade: null, submitted: false,
    };
    update(s => ({
      ...s,
      enrollments: [...s.enrollments, enrollment],
      grades: [...s.grades, grade],
      sections: s.sections.map(sec => sec.id === sectionId ? { ...sec, enrolled: sec.enrolled + 1 } : sec),
    }));
  }, [state, update]);

  // DROP with deadline enforcement
  const dropSection = useCallback((studentId: string, sectionId: string, termId: string): { success: boolean; message: string } => {
    const term = state.terms.find(t => t.id === termId);
    // Check drop deadline only if one is explicitly set
    if (term?.dropDeadline) {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      const deadline = new Date(term.dropDeadline);
      if (today > deadline) {
        return { success: false, message: `Drop deadline has passed (${term.dropDeadline}).` };
      }
    }
    // No enlistmentOpen gate here — dropping is allowed any time before finalization
    // (finalization check is enforced in the student portal UI)

    // Prepare DRP grade — update existing or create new
    const existingGrade = state.grades.find(g => g.studentId === studentId && g.sectionId === sectionId && g.termId === termId);
    const drpGradeId = existingGrade?.id ?? `gr-drp-${Date.now()}`;

    update(s => {
      const existingG = s.grades.find(g => g.studentId === studentId && g.sectionId === sectionId && g.termId === termId);
      const newGrades = existingG
        ? s.grades.map(g => g.id === existingG.id ? { ...g, grade: 'DRP' as GradeValue, submitted: true } : g)
        : [...s.grades, { id: drpGradeId, studentId, sectionId, termId, grade: 'DRP' as GradeValue, submitted: true }];
      return {
        ...s,
        enrollments: s.enrollments.map(e =>
          e.studentId === studentId && e.sectionId === sectionId && e.termId === termId
            ? { ...e, status: 'dropped' }
            : e
        ),
        sections: s.sections.map(sec =>
          sec.id === sectionId ? { ...sec, enrolled: Math.max(0, sec.enrolled - 1) } : sec
        ),
        grades: newGrades,
      };
    });
    // Sync to DB using atomic RPC (avoids stale-state race on enrolled counter)
    const droppedAt = new Date().toISOString().split('T')[0];
    supabase.rpc('drop_section_atomic', {
      p_student_id: studentId,
      p_section_id: sectionId,
      p_term_id:    termId,
      p_dropped_at: droppedAt,
    }).then(({ error }) => { if (error) console.error('drop_section_atomic error:', error.message); });
    // Persist DRP grade to DB (upsert by natural key)
    supabase.from('grades').upsert({
      id: drpGradeId, student_id: studentId, section_id: sectionId, term_id: termId,
      grade: 'DRP', submitted: true,
    }, { onConflict: 'student_id,section_id,term_id' }).then(({ error }) => { if (error) console.error('dropSection DRP grade DB error:', error.message); });
    return { success: true, message: 'Successfully dropped.' };
  }, [state.terms, state.grades, update]);

  // removeSection: pre-finalization un-enlist (no DRP grade assigned)
  const removeSection = useCallback((studentId: string, sectionId: string, termId: string): { success: boolean; message: string } => {
    update(s => ({
      ...s,
      enrollments: s.enrollments.filter(e => !(e.studentId === studentId && e.sectionId === sectionId && e.termId === termId)),
      sections: s.sections.map(sec => sec.id === sectionId ? { ...sec, enrolled: Math.max(0, sec.enrolled - 1) } : sec),
    }));
    supabase.from('enrollments').delete()
      .eq('student_id', studentId).eq('section_id', sectionId).eq('term_id', termId)
      .then(({ error }) => { if (error) console.error('removeSection DB error:', error.message); });
    return { success: true, message: 'Course removed from your enlistment.' };
  }, [update]);

  const submitGrade = useCallback((gradeId: string, grade: GradeValue) => {
    update(s => ({ ...s, grades: s.grades.map(g => g.id === gradeId ? { ...g, grade } : g) }));
    supabase.from('grades').update({ grade }).eq('id', gradeId)
      .then(({ error }) => { if (error) console.error('submitGrade DB error:', error.message); });
  }, [update]);

  const submitGradesBatch = useCallback((sectionId: string) => {
    update(s => ({
      ...s,
      grades: s.grades.map(g => g.sectionId === sectionId ? { ...g, submitted: true } : g),
    }));
    supabase.from('grades').update({ submitted: true }).eq('section_id', sectionId)
      .then(({ error }) => { if (error) console.error('submitGradesBatch DB error:', error.message); });
  }, [update]);

  const submitRemovalGrade = useCallback((gradeId: string, removalGrade: GradeValue) => {
    update(s => ({ ...s, grades: s.grades.map(g => g.id === gradeId ? { ...g, removalGrade } : g) }));
    // Sync to DB
    supabase.from('grades').update({ removal_grade: removalGrade }).eq('id', gradeId)
      .then(({ error }) => { if (error) console.error('submitRemovalGrade DB error:', error.message); });
  }, [update]);

  const submitRemovalGradesBatch = useCallback((sectionId: string) => {
    update(s => ({
      ...s,
      grades: s.grades.map(g =>
        g.sectionId === sectionId && g.removalGrade ? { ...g, removalSubmitted: true } : g
      ),
    }));
    // Sync to DB: mark removal_submitted=true for all rows in section that have a removal_grade set
    supabase.from('grades')
      .update({ removal_submitted: true })
      .eq('section_id', sectionId)
      .not('removal_grade', 'is', null)
      .then(({ error }) => { if (error) console.error('submitRemovalGradesBatch DB error:', error.message); });
  }, [update]);

  const submitRemovalGradeFinal = useCallback((gradeId: string, removalGrade: GradeValue) => {
    const removalPostedAt = new Date().toISOString();
    update(s => ({ ...s, grades: s.grades.map(g => g.id === gradeId ? { ...g, removalGrade, removalSubmitted: true, removalPostedAt } : g) }));
    supabase.from('grades').update({ removal_grade: removalGrade, removal_submitted: true, removal_posted_at: removalPostedAt }).eq('id', gradeId)
      .then(({ error }) => { if (error) console.error('submitRemovalGradeFinal DB error:', error.message); });
  }, [update]);

  const updateConsentStatus = useCallback((consentId: string, field: 'coiStatus' | 'deptConsentStatus' | 'ocsConsentStatus', status: ConsentStatus) => {
    update(s => {
      const next = { ...s, consents: s.consents.map(c => c.id === consentId ? { ...c, [field]: status } : c) };
      // NOTE: OCS consent approval does NOT auto-enlist. Student must manually add the section.
      saveAppSetting('consents', next.consents);
      return next;
    });
  }, [update, saveAppSetting]);

  const requestConsent = useCallback((studentId: string, sectionId: string, termId: string, field: 'coiStatus' | 'deptConsentStatus' | 'ocsConsentStatus', reason?: string, ocsConsentType?: string, ocsAttachmentName?: string, ocsAttachmentDataUrl?: string) => {
    const existing = state.consents.find(c => c.studentId === studentId && c.sectionId === sectionId && c.termId === termId);
    if (existing) {
      update(s => {
        const extra = field === 'ocsConsentStatus' ? { ocsConsentType: ocsConsentType as ConsentRecord['ocsConsentType'], ocsAttachmentName, ocsAttachmentDataUrl } : {};
        const next = {
          ...s,
          consents: s.consents.map(c =>
            c.id === existing.id
              ? { ...c, [field]: 'pending', [`${field.replace('Status', '')}Reason`]: reason, ...extra }
              : c
          ),
        };
        saveAppSetting('consents', next.consents);
        return next;
      });
    } else {
      const extra = field === 'ocsConsentStatus' ? { ocsConsentType: ocsConsentType as ConsentRecord['ocsConsentType'], ocsAttachmentName, ocsAttachmentDataUrl } : {};
      const newConsent: ConsentRecord = {
        id: `con-${Date.now()}`,
        studentId, sectionId, termId,
        coiStatus: field === 'coiStatus' ? 'pending' : 'not_requested',
        deptConsentStatus: field === 'deptConsentStatus' ? 'pending' : 'not_requested',
        ocsConsentStatus: field === 'ocsConsentStatus' ? 'pending' : 'not_requested',
        ...extra,
      };
      update(s => {
        const next = { ...s, consents: [...s.consents, newConsent] };
        saveAppSetting('consents', next.consents);
        return next;
      });
    }
  }, [state.consents, update, saveAppSetting]);

  const submitEvaluation = useCallback((evalData: Omit<Evaluation, 'id' | 'submittedAt' | 'overallRating'>) => {
    const overallRating = evalData.responses.reduce((sum, r) => sum + r.rating, 0) / evalData.responses.length;
    const evaluation: Evaluation = {
      ...evalData,
      id: `ev-${Date.now()}`,
      submittedAt: new Date().toISOString().split('T')[0],
      overallRating: Math.round(overallRating * 10) / 10,
    };
    update(s => {
      const next = { ...s, evaluations: [...s.evaluations, evaluation] };
      saveAppSetting('evaluations', next.evaluations);
      return next;
    });
  }, [update, saveAppSetting]);

  const requestPrerogative = useCallback((studentId: string, sectionId: string, termId: string, reason: string) => {
    const existing = state.prerogatives.find(p => p.studentId === studentId && p.sectionId === sectionId && p.termId === termId);
    if (existing) return;
    // Check if the section is accepting prerogatives (FIC toggle)
    const sec = state.sections.find(s => s.id === sectionId);
    if (sec && sec.prerogativeAccepting === false) return; // FIC closed prerog for this section
    const prg: Prerogative = {
      id: `prg-${Date.now()}`,
      studentId, sectionId, termId, reason,
      status: 'pending',
      requestedAt: new Date().toISOString().split('T')[0],
    };
    update(s => ({ ...s, prerogatives: [...s.prerogatives, prg] }));
    supabase.from('prerogatives').insert({
      id: prg.id, student_id: prg.studentId, section_id: prg.sectionId,
      term_id: prg.termId, reason: prg.reason, status: 'pending',
      requested_at: prg.requestedAt,
    }).then(({ error }) => { if (error) console.error('requestPrerogative DB error:', error.message); });
  }, [state.prerogatives, state.sections, update]);

  const cancelPrerogative = useCallback((prerogativeId: string) => {
    update(s => ({ ...s, prerogatives: s.prerogatives.filter(p => p.id !== prerogativeId) }));
    supabase.from('prerogatives').delete().eq('id', prerogativeId)
      .then(({ error }) => { if (error) console.error('cancelPrerogative DB error:', error.message); });
  }, [update]);

  const processPrerogative = useCallback((prerogativeId: string, status: PrerogativeStatus, facultyId: string) => {
    const prg = state.prerogatives.find(p => p.id === prerogativeId);
    const processedAt = new Date().toISOString().split('T')[0];
    update(s => ({
      ...s,
      prerogatives: s.prerogatives.map(p =>
        p.id === prerogativeId
          ? { ...p, status, processedAt, processedBy: facultyId }
          : p
      ),
    }));
    // Sync status update to DB
    supabase.from('prerogatives').update({ status, processed_at: processedAt, processed_by: facultyId })
      .eq('id', prerogativeId)
      .then(({ error }) => { if (error) console.error('processPrerogative DB error:', error.message); });
    // NOTE: Approved prerogatives do NOT auto-enlist students.
    // The student must manually go to Course Bin and enlist the section themselves.
    // The slot limit bypass in enlistSection handles the approved prerogative case.
  }, [state, update]);

  const finalizeEnlistment = useCallback((studentId: string, termId: string) => {
    const already = state.finalizedEnlistments.find(f => f.studentId === studentId && f.termId === termId);
    if (already) return;
    update(s => {
      // Upgrade all 'enlisted' enrollments to 'enrolled' and create grade records
      const enlistedNow = s.enrollments.filter(
        e => e.studentId === studentId && e.termId === termId && e.status === 'enlisted'
      );
      const newGrades: Grade[] = enlistedNow
        .filter(e => !s.grades.find(g => g.studentId === studentId && g.sectionId === e.sectionId && g.termId === termId))
        .map(e => ({
          id: `gr-${Date.now()}-${e.sectionId}`,
          studentId, sectionId: e.sectionId, termId,
          grade: null, submitted: false,
        }));
      const next = {
        ...s,
        enrollments: s.enrollments.map(e =>
          e.studentId === studentId && e.termId === termId && e.status === 'enlisted'
            ? { ...e, status: 'enrolled' as const }
            : e
        ),
        grades: [...s.grades, ...newGrades],
        finalizedEnlistments: [...s.finalizedEnlistments, { studentId, termId, finalizedAt: new Date().toISOString() }],
        // Auto-delete any pending prerogatives for this student/term (not approved = not enlisted)
        prerogatives: s.prerogatives.filter(p => !(p.studentId === studentId && p.termId === termId && p.status === 'pending')),
      };
      saveAppSetting('finalized_enlistments', next.finalizedEnlistments);
      // Sync enrollments status to DB
      supabase.from('enrollments')
        .update({ status: 'enrolled' })
        .eq('student_id', studentId).eq('term_id', termId).eq('status', 'enlisted')
        .then(({ error }) => { if (error) console.error('finalizeEnlistment DB error:', error.message); });
      // Insert grade records to DB
      if (newGrades.length > 0) {
        supabase.from('grades').insert(
          newGrades.map(g => ({ id: g.id, student_id: g.studentId, section_id: g.sectionId, term_id: g.termId, grade: null, submitted: false }))
        ).then(({ error }) => { if (error) console.error('finalize grades DB error:', error.message); });
      }
      // Delete pending prerogatives for this student/term from DB
      supabase.from('prerogatives')
        .delete()
        .eq('student_id', studentId).eq('term_id', termId).eq('status', 'pending')
        .then(({ error }) => { if (error) console.error('finalize delete prerogatives DB error:', error.message); });
      return next;
    });
  }, [state.finalizedEnlistments, update, saveAppSetting]);

  // UNFINALIZE ENLISTMENT — OCS removes a student's finalization so they can still add/drop
  const unfinalizeEnlistment = useCallback((studentId: string, termId: string) => {
    update(s => {
      const next = {
        ...s,
        enrollments: s.enrollments.map(e =>
          e.studentId === studentId && e.termId === termId && e.status === 'enrolled'
            ? { ...e, status: 'enlisted' as const }
            : e
        ),
        grades: s.grades.filter(g => !(g.studentId === studentId && g.termId === termId)),
        finalizedEnlistments: s.finalizedEnlistments.filter(f => !(f.studentId === studentId && f.termId === termId)),
      };
      saveAppSetting('finalized_enlistments', next.finalizedEnlistments);
      // Sync to DB
      supabase.from('enrollments')
        .update({ status: 'enlisted' })
        .eq('student_id', studentId).eq('term_id', termId).eq('status', 'enrolled')
        .then(({ error }) => { if (error) console.error('unfinalizeEnlistment DB error:', error.message); });
      supabase.from('grades')
        .delete()
        .eq('student_id', studentId).eq('term_id', termId)
        .then(({ error }) => { if (error) console.error('unfinalize grades DB error:', error.message); });
      return next;
    });
  }, [update, saveAppSetting]);

  // ADD USER — calls Edge Function, then reloads profiles
  const addUser = useCallback(async (user: Omit<User, 'id'> & { password: string }) => {
    const localId = `u-${Date.now()}`;
    // Hash the password via SECURITY DEFINER RPC (bypasses edge function env issues)
    const { data: hashData, error: hashErr } = await supabase.rpc('hash_password', { p_password: user.password });
    if (hashErr) throw new Error('Password hashing failed: ' + hashErr.message);
    // Insert profile via SECURITY DEFINER RPC (bypasses RLS)
    const { error: insertErr } = await supabase.rpc('create_profile_admin', {
      p_id: crypto.randomUUID(),
      p_local_id: localId,
      p_username: user.username,
      p_role: user.role,
      p_name: user.name,
      p_email: user.email || (user.username + '@ais.local'),
      p_contact_email: user.email || null,
      p_department: user.department || null,
      p_college: user.college || null,
      p_program: user.program || null,
      p_year_level: user.yearLevel ?? null,
      p_student_number: user.studentNumber || null,
      p_employee_id: user.employeeId || null,
      p_password_hash: hashData,
    });
    if (insertErr) throw new Error(insertErr.message);
    await loadProfiles();
  }, [loadProfiles]);

  // UPDATE USER — updates profile table, optionally updates credentials
  const updateUser = useCallback(async (userId: string, updates: Partial<User> & { newPassword?: string }) => {
    const { newPassword, password: _p, ...profileUpdates } = updates;
    const callerLocalId = state.currentUser?.id;

    // Update profiles table (non-credential fields)
    const dbUpdates: Record<string, unknown> = {};
    if (profileUpdates.name) dbUpdates.name = profileUpdates.name;
    if (profileUpdates.email) dbUpdates.email = profileUpdates.email;
    if (profileUpdates.department !== undefined) dbUpdates.department = profileUpdates.department;
    if (profileUpdates.college !== undefined) dbUpdates.college = profileUpdates.college;
    if (profileUpdates.program !== undefined) dbUpdates.program = profileUpdates.program;
    if (profileUpdates.yearLevel !== undefined) dbUpdates.year_level = profileUpdates.yearLevel;
    if (profileUpdates.studentNumber !== undefined) dbUpdates.student_number = profileUpdates.studentNumber;
    if (profileUpdates.employeeId !== undefined) dbUpdates.employee_id = profileUpdates.employeeId;
    if (profileUpdates.status !== undefined) dbUpdates.status = profileUpdates.status;

    if (Object.keys(dbUpdates).length > 0) {
      await supabase.from('profiles').update(dbUpdates).eq('local_id', userId);
    }

    // Handle credential updates via Edge Function
    if (profileUpdates.username || newPassword) {
      await supabase.functions.invoke('admin-manage-user', {
        body: {
          action: 'update_credentials',
          caller_local_id: callerLocalId,
          local_id: userId,
          new_username: profileUpdates.username,
          new_password: newPassword,
        },
      });
    }

    // Update local state immediately
    setState(prev => ({
      ...prev,
      users: prev.users.map(u => u.id === userId ? { ...u, ...profileUpdates } : u),
      currentUser: prev.currentUser?.id === userId ? { ...prev.currentUser, ...profileUpdates } : prev.currentUser,
    }));
  }, [state.currentUser?.id]);

  // REMOVE USER — hard-deletes from DB (profiles + user_credentials) + all related data
  const removeUser = useCallback(async (userId: string) => {
    // 1. Delete user auth record
    await supabase.functions.invoke('admin-manage-user', {
      body: { action: 'delete', caller_local_id: state.currentUser?.id, local_id: userId },
    });

    // 2. Delete related records from Supabase tables
    await supabase.from('enrollments').delete().eq('student_id', userId);
    await supabase.from('grades').delete().eq('student_id', userId);
    await supabase.from('prerogatives').delete().eq('student_id', userId);

    // 3. Cascade local state + persist affected app_settings keys
    setState(prev => {
      const next = {
        ...prev,
        users:                  prev.users.filter(u => u.id !== userId),
        enrollments:            prev.enrollments.filter(e => e.studentId !== userId),
        grades:                 prev.grades.filter(g => g.studentId !== userId),
        consents:               prev.consents.filter(c => c.studentId !== userId),
        prerogatives:           prev.prerogatives.filter(p => p.studentId !== userId),
        evaluations:            prev.evaluations.filter(ev => ev.studentId !== userId && ev.facultyId !== userId),
        finalizedEnlistments:   prev.finalizedEnlistments.filter(f => f.studentId !== userId),
        unfinalizedRequests:    prev.unfinalizedRequests.filter(r => r.studentId !== userId),
        reconsiderationRequests: prev.reconsiderationRequests.filter(r => r.studentId !== userId),
      };
      saveAppSetting('consents', next.consents);
      saveAppSetting('evaluations', next.evaluations);
      saveAppSetting('finalized_enlistments', next.finalizedEnlistments);
      saveAppSetting('unfinalized_requests', next.unfinalizedRequests);
      saveAppSetting('reconsideration_requests', next.reconsiderationRequests);
      saveState(next);
      return next;
    });
  }, [state.currentUser, saveAppSetting]);

  // SYNC ALL USERS to cloud DB (only users with a stored password — seed users)
  const syncUsersToCloud = useCallback(async (): Promise<{ synced: number; failed: number }> => {
    const usersToSync = state.users
      .filter(u => !!u.password) // only sync users that have a stored plaintext password
      .map(u => ({
        local_id: u.id,
        username: u.username,
        password: u.password!,
        role: u.role,
        name: u.name,
        email: u.email ?? '',
        department: u.department ?? '',
        program: u.program ?? '',
        year_level: u.yearLevel,
        student_number: u.studentNumber ?? '',
        employee_id: u.employeeId ?? '',
        status: u.status ?? 'active',
      }));
    if (usersToSync.length === 0) return { synced: 0, failed: 0 };
    const { data, error } = await supabase.functions.invoke('admin-manage-user', {
      body: { action: 'bulk_sync', caller_local_id: state.currentUser?.id, users: usersToSync },
    });
    if (error) throw new Error(error.message);
    const failed = (data?.failed ?? []).length;
    const synced = usersToSync.length - failed;
    return { synced, failed };
  }, [state.users, state.currentUser?.id]);

  const promoteStudents = useCallback((studentIds: string[]) => {
    // Update local state + Supabase profiles
    setState(prev => ({
      ...prev,
      users: prev.users.map(u =>
        studentIds.includes(u.id) && u.role === 'student' && u.yearLevel
          ? { ...u, yearLevel: u.yearLevel + 1 }
          : u
      ),
    }));
    // Async update to Supabase
    studentIds.forEach(async (id) => {
      const user = state.users.find(u => u.id === id);
      if (user?.yearLevel) {
        await supabase.from('profiles').update({ year_level: user.yearLevel + 1 }).eq('local_id', id);
      }
    });
  }, [state.users]);

  const transferStudent = useCallback((studentId: string, program: string) => {
    setState(prev => ({
      ...prev,
      users: prev.users.map(u => u.id === studentId ? { ...u, program, status: 'transferred' } : u),
    }));
    supabase.from('profiles').update({ program, status: 'transferred' }).eq('local_id', studentId);
  }, []);

  const updatePortalSettings = useCallback((settings: Partial<PortalSettings>) => {
    update(s => {
      const next = { ...s, portalSettings: { ...s.portalSettings, ...settings } };
      saveAppSetting('portal_settings', next.portalSettings);
      return next;
    });
  }, [update, saveAppSetting]);

  // Helper to sync academic units to DB
  const syncAcademicUnits = useCallback((s: AppState) => {
    saveAppSetting('academic_units', { colleges: s.colleges, departments: s.departments, degreePrograms: s.degreePrograms });
  }, [saveAppSetting]);

  // Academic Units CRUD
  const addCollege = useCallback((college: Omit<College, 'id'>) => {
    update(s => { const next = { ...s, colleges: [...s.colleges, { ...college, id: `col-${Date.now()}` }] }; syncAcademicUnits(next); return next; });
  }, [update, syncAcademicUnits]);
  const updateCollege = useCallback((id: string, updates: Partial<College>) => {
    update(s => { const next = { ...s, colleges: s.colleges.map(c => c.id === id ? { ...c, ...updates } : c) }; syncAcademicUnits(next); return next; });
  }, [update, syncAcademicUnits]);
  const deleteCollege = useCallback((id: string) => {
    update(s => {
      // Cascade: all departments in this college → courses in those departments
      const deptsToDel = s.departments.filter(d => d.collegeId === id);
      const deptNamesToDel = new Set(deptsToDel.map(d => d.name));
      const deptIdsToDel = new Set(deptsToDel.map(d => d.id));

      const coursesToDel = s.courses.filter(c => deptNamesToDel.has(c.department));
      const courseIdsToDel = new Set(coursesToDel.map(c => c.id));
      const sectionsToDel = s.sections.filter(sec => courseIdsToDel.has(sec.courseId));
      const sectionIdsToDel = sectionsToDel.map(sec => sec.id);

      if (sectionIdsToDel.length > 0) {
        supabase.from('grades').delete().in('section_id', sectionIdsToDel)
          .then(({ error }) => { if (error) console.error('deleteCollege grades cascade error:', error.message); });
        supabase.from('enrollments').delete().in('section_id', sectionIdsToDel)
          .then(({ error }) => { if (error) console.error('deleteCollege enrollments cascade error:', error.message); });
        supabase.from('prerogatives').delete().in('section_id', sectionIdsToDel)
          .then(({ error }) => { if (error) console.error('deleteCollege prerogatives cascade error:', error.message); });
        supabase.from('sections').delete().in('id', sectionIdsToDel)
          .then(({ error }) => { if (error) console.error('deleteCollege sections cascade error:', error.message); });
      }
      if (courseIdsToDel.size > 0) {
        supabase.from('courses').delete().in('id', [...courseIdsToDel])
          .then(({ error }) => { if (error) console.error('deleteCollege courses cascade error:', error.message); });
      }

      const sectionIdSet = new Set(sectionIdsToDel);
      const next = {
        ...s,
        colleges:     s.colleges.filter(c => c.id !== id),
        departments:  s.departments.filter(d => d.collegeId !== id),
        degreePrograms: s.degreePrograms.filter(p => !deptIdsToDel.has(p.departmentId)),
        courses:      s.courses.filter(c => !courseIdsToDel.has(c.id)),
        sections:     s.sections.filter(sec => !courseIdsToDel.has(sec.courseId)),
        grades:       s.grades.filter(g => !sectionIdSet.has(g.sectionId)),
        enrollments:  s.enrollments.filter(e => !sectionIdSet.has(e.sectionId)),
        prerogatives: s.prerogatives.filter(p => !sectionIdSet.has(p.sectionId)),
      };
      syncAcademicUnits(next);
      return next;
    });
  }, [update, syncAcademicUnits]);

  const addDepartment = useCallback((dept: Omit<Department, 'id'>) => {
    update(s => { const next = { ...s, departments: [...s.departments, { ...dept, id: `dept-${Date.now()}` }] }; syncAcademicUnits(next); return next; });
  }, [update, syncAcademicUnits]);
  const updateDepartment = useCallback((id: string, updates: Partial<Department>) => {
    update(s => { const next = { ...s, departments: s.departments.map(d => d.id === id ? { ...d, ...updates } : d) }; syncAcademicUnits(next); return next; });
  }, [update, syncAcademicUnits]);
  const deleteDepartment = useCallback((id: string) => {
    update(s => {
      const dept = s.departments.find(d => d.id === id);
      const deptName = dept?.name ?? '';
      // Cascade: delete all courses in this department and their sections/grades/enrollments
      const coursesToDel = s.courses.filter(c => c.department === deptName);
      const courseIdsToDel = new Set(coursesToDel.map(c => c.id));
      const sectionsToDel = s.sections.filter(sec => courseIdsToDel.has(sec.courseId));
      const sectionIdsToDel = sectionsToDel.map(sec => sec.id);

      if (sectionIdsToDel.length > 0) {
        supabase.from('grades').delete().in('section_id', sectionIdsToDel)
          .then(({ error }) => { if (error) console.error('deleteDepartment grades cascade error:', error.message); });
        supabase.from('enrollments').delete().in('section_id', sectionIdsToDel)
          .then(({ error }) => { if (error) console.error('deleteDepartment enrollments cascade error:', error.message); });
        supabase.from('prerogatives').delete().in('section_id', sectionIdsToDel)
          .then(({ error }) => { if (error) console.error('deleteDepartment prerogatives cascade error:', error.message); });
        supabase.from('sections').delete().in('id', sectionIdsToDel)
          .then(({ error }) => { if (error) console.error('deleteDepartment sections cascade error:', error.message); });
      }
      if (courseIdsToDel.size > 0) {
        supabase.from('courses').delete().in('id', [...courseIdsToDel])
          .then(({ error }) => { if (error) console.error('deleteDepartment courses cascade error:', error.message); });
      }

      const sectionIdSet = new Set(sectionIdsToDel);
      const next = {
        ...s,
        departments:  s.departments.filter(d => d.id !== id),
        degreePrograms: s.degreePrograms.filter(p => p.departmentId !== id),
        courses:      s.courses.filter(c => !courseIdsToDel.has(c.id)),
        sections:     s.sections.filter(sec => !courseIdsToDel.has(sec.courseId)),
        grades:       s.grades.filter(g => !sectionIdSet.has(g.sectionId)),
        enrollments:  s.enrollments.filter(e => !sectionIdSet.has(e.sectionId)),
        prerogatives: s.prerogatives.filter(p => !sectionIdSet.has(p.sectionId)),
      };
      syncAcademicUnits(next);
      return next;
    });
  }, [update, syncAcademicUnits]);

  const addDegreeProgram = useCallback((prog: Omit<DegreeProgram, 'id'>) => {
    update(s => { const next = { ...s, degreePrograms: [...s.degreePrograms, { ...prog, id: `prog-${Date.now()}` }] }; syncAcademicUnits(next); return next; });
  }, [update, syncAcademicUnits]);
  const updateDegreeProgram = useCallback((id: string, updates: Partial<DegreeProgram>) => {
    update(s => { const next = { ...s, degreePrograms: s.degreePrograms.map(p => p.id === id ? { ...p, ...updates } : p) }; syncAcademicUnits(next); return next; });
  }, [update, syncAcademicUnits]);
  const deleteDegreeProgram = useCallback((id: string) => {
    update(s => { const next = { ...s, degreePrograms: s.degreePrograms.filter(p => p.id !== id) }; syncAcademicUnits(next); return next; });
  }, [update, syncAcademicUnits]);

  const addRoom = useCallback((room: Omit<Room, 'id'>) => {
    const id = `room-${Date.now()}`;
    const newRoom = { ...room, id };
    update(s => ({ ...s, rooms: [...s.rooms, newRoom] }));
    saveAppSetting('rooms', [...state.rooms, newRoom]);
    supabase.from('rooms').insert({ id, name: room.name, capacity: room.capacity ?? null, college_id: room.collegeId, building: room.building ?? null })
      .then(({ error }) => { if (error) console.error('addRoom DB error:', error.message); });
  }, [state.rooms, update, saveAppSetting]);

  const updateRoom = useCallback((roomId: string, updates: Partial<Room>) => {
    update(s => ({ ...s, rooms: s.rooms.map(r => r.id === roomId ? { ...r, ...updates } : r) }));
    const newRooms = state.rooms.map(r => r.id === roomId ? { ...r, ...updates } : r);
    saveAppSetting('rooms', newRooms);
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.capacity !== undefined) dbUpdates.capacity = updates.capacity ?? null;
    if (updates.collegeId !== undefined) dbUpdates.college_id = updates.collegeId;
    if (updates.building !== undefined) dbUpdates.building = updates.building ?? null;
    if (Object.keys(dbUpdates).length > 0) {
      supabase.from('rooms').update(dbUpdates).eq('id', roomId)
        .then(({ error }) => { if (error) console.error('updateRoom DB error:', error.message); });
    }
  }, [state.rooms, update, saveAppSetting]);

  const deleteRoom = useCallback((roomId: string) => {
    update(s => ({ ...s, rooms: s.rooms.filter(r => r.id !== roomId) }));
    saveAppSetting('rooms', state.rooms.filter(r => r.id !== roomId));
    supabase.from('rooms').delete().eq('id', roomId)
      .then(({ error }) => { if (error) console.error('deleteRoom DB error:', error.message); });
  }, [state.rooms, update, saveAppSetting]);

  const submitUnfinalizedRequest = useCallback(async (studentId: string, termId: string, reason: string) => {
    // Check if already has a pending/approved request
    const existing = state.unfinalizedRequests.find(r => r.studentId === studentId && r.termId === termId && r.status !== 'denied');
    if (existing) return;
    const req: UnfinalizedRequest = {
      id: `ureq-${Date.now()}`,
      studentId, termId, reason,
      status: 'pending',
      requestedAt: new Date().toISOString(),
    };
    update(s => ({ ...s, unfinalizedRequests: [...s.unfinalizedRequests, req] }));
    const newRequests = [...state.unfinalizedRequests, req];
    saveAppSetting('unfinalized_requests', newRequests);
    await supabase.from('unfinalized_requests').insert({
      id: req.id, student_id: req.studentId, term_id: req.termId,
      reason: req.reason, status: req.status, requested_at: req.requestedAt,
    }).then(({ error }) => { if (error) console.error('submitUnfinalizedRequest DB error:', error.message); });
  }, [state.unfinalizedRequests, update, saveAppSetting]);

  const processUnfinalizedRequest = useCallback(async (requestId: string, status: UnfinalizedRequestStatus, processedBy: string, response?: string) => {
    const processedAt = new Date().toISOString();
    update(s => ({
      ...s,
      unfinalizedRequests: s.unfinalizedRequests.map(r =>
        r.id === requestId ? { ...r, status, processedAt, processedBy, response } : r
      ),
    }));
    const newRequests = state.unfinalizedRequests.map(r =>
      r.id === requestId ? { ...r, status, processedAt, processedBy, response } : r
    );
    saveAppSetting('unfinalized_requests', newRequests);
    await supabase.from('unfinalized_requests').update({ status, processed_at: processedAt, processed_by: processedBy, response: response ?? null })
      .eq('id', requestId)
      .then(({ error }) => { if (error) console.error('processUnfinalizedRequest DB error:', error.message); });
  }, [state.unfinalizedRequests, update, saveAppSetting]);

  const submitReconsiderationRequest = useCallback(async (studentId: string, termId: string, reason: string, requestType: ReconsiderationRequestType = 'pd_reconsideration') => {
    // Only allow one pending/approved request per student per term per type
    const existing = (state.reconsiderationRequests ?? []).find(
      r => r.studentId === studentId && r.termId === termId && r.requestType === requestType && r.status !== 'denied'
    );
    if (existing) return;
    const req: ReconsiderationRequest = {
      id: `rreq-${Date.now()}`,
      studentId, termId, reason, requestType,
      status: 'pending',
      requestedAt: new Date().toISOString(),
    };
    const newRequests = [...(state.reconsiderationRequests ?? []), req];
    update(s => ({ ...s, reconsiderationRequests: newRequests }));
    saveAppSetting('reconsideration_requests', newRequests);
    await supabase.from('reconsideration_requests').insert({
      id: req.id, student_id: req.studentId, term_id: req.termId,
      reason: req.reason, status: req.status, requested_at: req.requestedAt,
      request_type: req.requestType,
    }).then(({ error }) => { if (error) console.error('submitReconsiderationRequest DB error:', error.message); });
  }, [state.reconsiderationRequests, update, saveAppSetting]);

  const processReconsiderationRequest = useCallback(async (requestId: string, status: ReconsiderationRequestStatus, processedBy: string, response?: string) => {
    const req = (state.reconsiderationRequests ?? []).find(r => r.id === requestId);
    if (!req) return;
    const processedAt = new Date().toISOString();
    // If approved AND this is a PD reconsideration → reinstate student to active
    if (status === 'approved' && (!req.requestType || req.requestType === 'pd_reconsideration')) {
      update(s => ({
        ...s,
        users: s.users.map(u => u.id === req.studentId ? { ...u, status: 'active' as const } : u),
        currentUser: s.currentUser?.id === req.studentId ? { ...s.currentUser, status: 'active' as const } : s.currentUser,
      }));
      await supabase.from('profiles').update({ status: 'active' }).eq('local_id', req.studentId)
        .then(({ error }) => { if (error) console.error('processReconsideration reinstate DB error:', error.message); });
    }
    const newRequests = (state.reconsiderationRequests ?? []).map(r =>
      r.id === requestId ? { ...r, status, processedAt, processedBy, response } : r
    );
    update(s => ({ ...s, reconsiderationRequests: newRequests }));
    saveAppSetting('reconsideration_requests', newRequests);
    await supabase.from('reconsideration_requests').update({
      status, processed_at: processedAt, processed_by: processedBy, response: response ?? null,
    }).eq('id', requestId)
      .then(({ error }) => { if (error) console.error('processReconsiderationRequest DB error:', error.message); });
  }, [state.reconsiderationRequests, update, saveAppSetting]);

  const loadReconsiderationRequests = useCallback(async () => {
    const { data } = await supabase.from('reconsideration_requests').select('*');
    if (data) {
      const requests: ReconsiderationRequest[] = data.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        studentId: row.student_id as string,
        termId: row.term_id as string,
        reason: row.reason as string,
        requestType: (row.request_type as ReconsiderationRequestType | undefined) ?? 'pd_reconsideration',
        status: row.status as ReconsiderationRequestStatus,
        requestedAt: row.requested_at as string,
        processedAt: row.processed_at as string | undefined,
        processedBy: row.processed_by as string | undefined,
        response: row.response as string | undefined,
      }));
      update(s => ({ ...s, reconsiderationRequests: requests }));
      saveAppSetting('reconsideration_requests', requests);
    }
  }, [update, saveAppSetting]);

  const submitChangeDropRequest = useCallback(async (studentId: string, termId: string, reason: string, addSections?: string[], dropSections?: string[]) => {
    const existing = (state.changeDropRequests ?? []).find(
      r => r.studentId === studentId && r.termId === termId && r.status === 'pending'
    );
    if (existing) return;
    const req: ChangeDropRequest = {
      id: `cdreq-${Date.now()}`,
      studentId, termId, reason,
      status: 'pending',
      requestedAt: new Date().toISOString(),
      addSections,
      dropSections,
    };
    const newRequests = [...(state.changeDropRequests ?? []), req];
    update(s => ({ ...s, changeDropRequests: newRequests }));
    await saveAppSetting('change_drop_requests', newRequests);
  }, [state.changeDropRequests, update, saveAppSetting]);

  const processChangeDropRequest = useCallback(async (requestId: string, status: ChangeDropRequestStatus, processedBy: string, response?: string) => {
    const req = (state.changeDropRequests ?? []).find(r => r.id === requestId);
    if (!req) return;
    const processedAt = new Date().toISOString();
    const newRequests = (state.changeDropRequests ?? []).map(r =>
      r.id === requestId ? { ...r, status, processedAt, processedBy, response } : r
    );
    const isNewStyle = req.addSections !== undefined || req.dropSections !== undefined;

    if (status === 'approved' && isNewStyle) {
      // New-style: apply add/drop changes directly, keep enrollment finalized
      const dropIds = state.enrollments
        .filter(e => (req.dropSections ?? []).includes(e.sectionId) && e.studentId === req.studentId && e.termId === req.termId)
        .map(e => e.id);

      const addEnrollments = (req.addSections ?? []).map(sectionId => ({
        id: `enr-${Date.now()}-${sectionId}`,
        studentId: req.studentId,
        sectionId,
        termId: req.termId,
        status: 'enrolled' as const,
      }));

      // Prepare DRP grade records for each dropped section
      const drpGrades: Grade[] = (req.dropSections ?? []).map(sectionId => {
        const existing = state.grades.find(
          g => g.studentId === req.studentId && g.sectionId === sectionId && g.termId === req.termId
        );
        return existing
          ? { ...existing, grade: 'DRP' as GradeValue, submitted: true }
          : { id: `gr-drp-${Date.now()}-${sectionId}`, studentId: req.studentId, sectionId, termId: req.termId, grade: 'DRP' as GradeValue, submitted: true };
      });

      // Prepare grade records for newly ADDED sections (null grade, unsubmitted — faculty needs to encode)
      const addGrades: Grade[] = (req.addSections ?? [])
        .filter(sectionId => !state.grades.find(g => g.studentId === req.studentId && g.sectionId === sectionId && g.termId === req.termId))
        .map(sectionId => ({ id: `gr-auto-${req.studentId}-${sectionId}`, studentId: req.studentId, sectionId, termId: req.termId, grade: null, submitted: false }));

      update(s => {
        // Replace existing grade records for dropped sections or add new ones
        let updatedGrades = s.grades.map(g => {
          const drp = drpGrades.find(d => d.studentId === g.studentId && d.sectionId === g.sectionId && d.termId === g.termId);
          return drp ? { ...g, grade: 'DRP' as GradeValue, submitted: true } : g;
        });
        const existingKeys = new Set(s.grades.map(g => `${g.studentId}|${g.sectionId}|${g.termId}`));
        const newDrpGrades = drpGrades.filter(d => !existingKeys.has(`${d.studentId}|${d.sectionId}|${d.termId}`));
        // Also add grade records for new sections (filtered to not already exist)
        const newAddKeys = new Set(s.grades.map(g => `${g.studentId}|${g.sectionId}|${g.termId}`));
        const freshAddGrades = addGrades.filter(g => !newAddKeys.has(`${g.studentId}|${g.sectionId}|${g.termId}`));
        updatedGrades = [...updatedGrades, ...newDrpGrades, ...freshAddGrades];

        return {
          ...s,
          enrollments: [
            ...s.enrollments.map(e => dropIds.includes(e.id) ? { ...e, status: 'dropped' as const } : e),
            ...addEnrollments,
          ],
          sections: s.sections.map(sec => {
            const isAdded = addEnrollments.some(e => e.sectionId === sec.id);
            const isDropped = (req.dropSections ?? []).includes(sec.id);
            if (isAdded) return { ...sec, enrolled: sec.enrolled + 1 };
            if (isDropped) return { ...sec, enrolled: Math.max(0, sec.enrolled - 1) };
            return sec;
          }),
          grades: updatedGrades,
          changeDropRequests: newRequests,
        };
      });

      // Persist enrollment changes to DB
      if (dropIds.length) {
        supabase.from('enrollments').update({ status: 'dropped' }).in('id', dropIds)
          .then(({ error }) => { if (error) console.error('processChangeDrop drop DB error:', error.message); });
      }
      for (const e of addEnrollments) {
        supabase.from('enrollments').insert({
          id: e.id, student_id: e.studentId, section_id: e.sectionId, term_id: e.termId, status: e.status,
        }).then(({ error }) => { if (error) console.error('processChangeDrop add DB error:', error.message); });
      }
      // Persist DRP grades to DB
      for (const g of drpGrades) {
        supabase.from('grades').upsert({
          id: g.id, student_id: g.studentId, section_id: g.sectionId, term_id: g.termId,
          grade: 'DRP', submitted: true,
        }, { onConflict: 'student_id,section_id,term_id' }).then(({ error }) => { if (error) console.error('processChangeDrop DRP grade DB error:', error.message); });
      }
      // Persist new grade records for added sections to DB (faculty will encode these)
      for (const g of addGrades) {
        supabase.from('grades').upsert({
          id: g.id, student_id: g.studentId, section_id: g.sectionId, term_id: g.termId,
          grade: null, submitted: false,
        }, { onConflict: 'student_id,section_id,term_id' }).then(({ error }) => { if (error) console.error('processChangeDrop addGrade DB error:', error.message); });
      }
      // Recalculate enrolled counts
      const affectedSectionIds = [...(req.dropSections ?? []), ...(req.addSections ?? [])];
      if (affectedSectionIds.length) {
        supabase.rpc('recalculate_enrolled_for_sections', { p_section_ids: affectedSectionIds })
          .then(({ error }) => { if (error) console.error('recalculate_enrolled error:', error.message); });
      }
    } else if (status === 'approved' && !isNewStyle) {
      // Old-style: un-finalize so student can re-enlist
      const updatedFinalized = state.finalizedEnlistments.filter(
        f => !(f.studentId === req.studentId && f.termId === req.termId)
      );
      update(s => ({
        ...s,
        finalizedEnlistments: updatedFinalized,
        changeDropRequests: newRequests,
      }));
      await saveAppSetting('finalized_enlistments', updatedFinalized);
      await supabase.from('finalized_enlistments')
        .delete()
        .eq('student_id', req.studentId)
        .eq('term_id', req.termId)
        .then(({ error }) => { if (error) console.error('processChangeDrop unfinalize DB error:', error.message); });
    } else {
      update(s => ({ ...s, changeDropRequests: newRequests }));
    }
    await saveAppSetting('change_drop_requests', newRequests);
  }, [state.changeDropRequests, state.finalizedEnlistments, state.enrollments, state.grades, update, saveAppSetting]);

  const loadChangeDropRequests = useCallback(async () => {
    await loadAppSettings();
  }, [loadAppSettings]);

  // OCS: manually update or create a grade record (bypasses faculty workflow)
  const ocsUpdateGrade = useCallback((studentId: string, sectionId: string, termId: string, grade: GradeValue | null) => {
    const existing = state.grades.find(g => g.studentId === studentId && g.sectionId === sectionId && g.termId === termId);
    if (existing) {
      update(s => ({
        ...s,
        grades: s.grades.map(g => g.id === existing.id ? { ...g, grade, submitted: grade !== null } : g),
      }));
      supabase.from('grades').update({ grade, submitted: grade !== null }).eq('id', existing.id)
        .then(({ error }) => { if (error) console.error('ocsUpdateGrade DB error:', error.message); });
    } else {
      const newGrade: Grade = {
        id: `gr-ocs-${Date.now()}-${sectionId}`,
        studentId, sectionId, termId, grade, submitted: grade !== null,
      };
      update(s => ({ ...s, grades: [...s.grades, newGrade] }));
      supabase.from('grades').upsert({
        id: newGrade.id, student_id: studentId, section_id: sectionId, term_id: termId,
        grade, submitted: grade !== null,
      }, { onConflict: 'student_id,section_id,term_id' })
        .then(({ error }) => { if (error) console.error('ocsUpdateGrade create DB error:', error.message); });
    }
  }, [state.grades, update]);

  // OCS: manually enroll a student in a section (no restriction checks)
  const ocsManualEnroll = useCallback(async (studentId: string, sectionId: string, termId: string): Promise<{ success: boolean; message: string }> => {
    const already = state.enrollments.find(e => e.studentId === studentId && e.sectionId === sectionId && e.termId === termId && e.status !== 'dropped');
    if (already) return { success: false, message: 'Student is already enrolled in this section.' };
    const enrollment: Enrollment = {
      id: `enr-ocs-${Date.now()}-${sectionId}`,
      studentId, sectionId, termId, status: 'enrolled',
      enlistedAt: new Date().toISOString().split('T')[0],
    };
    const existingGrade = state.grades.find(g => g.studentId === studentId && g.sectionId === sectionId && g.termId === termId);
    const newGrade: Grade = { id: `gr-ocs-${Date.now()}-${sectionId}`, studentId, sectionId, termId, grade: null, submitted: false };
    update(s => ({
      ...s,
      enrollments: [...s.enrollments, enrollment],
      grades: existingGrade ? s.grades : [...s.grades, newGrade],
      sections: s.sections.map(sec => sec.id === sectionId ? { ...sec, enrolled: sec.enrolled + 1 } : sec),
    }));
    // Increment enrolled counter in DB
    const sec = state.sections.find(s => s.id === sectionId);
    if (sec) {
      supabase.from('sections').update({ enrolled: sec.enrolled + 1 }).eq('id', sectionId)
        .then(({ error }) => { if (error) console.error('ocsManualEnroll section enrolled DB error:', error.message); });
    }
    await supabase.from('enrollments').insert({
      id: enrollment.id, student_id: studentId, section_id: sectionId, term_id: termId,
      status: 'enrolled', enlisted_at: enrollment.enlistedAt,
    }).then(({ error }) => { if (error) console.error('ocsManualEnroll enrollment DB error:', error.message); });
    if (!existingGrade) {
      await supabase.from('grades').upsert({
        id: newGrade.id, student_id: studentId, section_id: sectionId, term_id: termId,
        grade: null, submitted: false,
      }, { onConflict: 'student_id,section_id,term_id' })
        .then(({ error }) => { if (error) console.error('ocsManualEnroll grade DB error:', error.message); });
    }
    return { success: true, message: 'Student successfully enrolled.' };
  }, [state.enrollments, state.grades, state.sections, update]);

  // OCS: add a course as a manual grade entry (phantom section — no section code / faculty)
  const ocsManualAddCourse = useCallback(async (studentId: string, courseId: string, termId: string): Promise<{ success: boolean; message: string }> => {
    // Prevent duplicates: check if a manual-grade entry for this course+term already exists
    const existingManual = state.sections.find(sec =>
      sec.courseId === courseId && sec.termId === termId && sec.sectionCode === '__MANUAL__'
    );
    if (existingManual) {
      const alreadyEnrolled = state.enrollments.find(e =>
        e.studentId === studentId && e.sectionId === existingManual.id && e.termId === termId && e.status !== 'dropped'
      );
      if (alreadyEnrolled) return { success: false, message: 'This course is already added for this student.' };
    }

    const phantomId = `sec-manual-${Date.now()}-${courseId.slice(-6)}`;
    const phantomSection: Section = {
      id: phantomId, courseId, termId, sectionCode: '__MANUAL__',
      facultyId: '', slots: 999, enrolled: 0,
      schedule: { days: [], startTime: '', endTime: '', room: '' },
      isManualGrade: true,
    };
    const enrollment: Enrollment = {
      id: `enr-ocs-${Date.now()}-${courseId.slice(-6)}`,
      studentId, sectionId: phantomId, termId, status: 'enrolled',
      enlistedAt: new Date().toISOString().split('T')[0],
    };
    const newGrade: Grade = {
      id: `gr-ocs-${Date.now()}-${courseId.slice(-6)}`,
      studentId, sectionId: phantomId, termId, grade: null, submitted: false,
    };

    update(s => ({
      ...s,
      sections: [...s.sections, phantomSection],
      enrollments: [...s.enrollments, enrollment],
      grades: [...s.grades, newGrade],
    }));

    await supabase.from('sections').insert({
      id: phantomId, course_id: courseId, term_id: termId, section_code: '__MANUAL__',
      faculty_id: null, slots: 999, enrolled: 0,
      schedule: { days: [], startTime: '', endTime: '', room: '' },
      prerogative_accepting: false,
    }).then(({ error }) => { if (error) console.error('ocsManualAddCourse section DB error:', error.message); });
    await supabase.from('enrollments').insert({
      id: enrollment.id, student_id: studentId, section_id: phantomId, term_id: termId,
      status: 'enrolled', enlisted_at: enrollment.enlistedAt,
    }).then(({ error }) => { if (error) console.error('ocsManualAddCourse enrollment DB error:', error.message); });
    await supabase.from('grades').insert({
      id: newGrade.id, student_id: studentId, section_id: phantomId, term_id: termId,
      grade: null, submitted: false,
    }).then(({ error }) => { if (error) console.error('ocsManualAddCourse grade DB error:', error.message); });

    return { success: true, message: 'Course added for manual grade entry.' };
  }, [state.sections, state.enrollments, update]);

  // OCS: remove an enrollment AND its grade record (hard delete — bypasses drop flow)
  const ocsRemoveEnrollment = useCallback((studentId: string, sectionId: string, termId: string): { success: boolean; message: string } => {
    // If the section is a manual-grade phantom section, also delete the section itself
    const sec = state.sections.find(s => s.id === sectionId);
    const isManual = sec?.sectionCode === '__MANUAL__';
    update(s => ({
      ...s,
      enrollments: s.enrollments.filter(e => !(e.studentId === studentId && e.sectionId === sectionId && e.termId === termId)),
      grades: s.grades.filter(g => !(g.studentId === studentId && g.sectionId === sectionId && g.termId === termId)),
      sections: isManual
        ? s.sections.filter(sec => sec.id !== sectionId)
        : s.sections.map(sec => sec.id === sectionId ? { ...sec, enrolled: Math.max(0, sec.enrolled - 1) } : sec),
    }));
    supabase.from('enrollments').delete()
      .eq('student_id', studentId).eq('section_id', sectionId).eq('term_id', termId)
      .then(({ error }) => { if (error) console.error('ocsRemoveEnrollment enrollment DB error:', error.message); });
    supabase.from('grades').delete()
      .eq('student_id', studentId).eq('section_id', sectionId).eq('term_id', termId)
      .then(({ error }) => { if (error) console.error('ocsRemoveEnrollment grade DB error:', error.message); });
    if (isManual) {
      supabase.from('sections').delete().eq('id', sectionId)
        .then(({ error }) => { if (error) console.error('ocsRemoveEnrollment phantom section DB error:', error.message); });
    } else {
      // Decrement the enrolled counter in the DB (local state already decremented above)
      const newCount = Math.max(0, (sec?.enrolled ?? 1) - 1);
      supabase.from('sections').update({ enrolled: newCount }).eq('id', sectionId)
        .then(({ error }) => { if (error) console.error('ocsRemoveEnrollment section enrolled DB error:', error.message); });
    }
    return { success: true, message: 'Enrollment and grade record removed.' };
  }, [state.sections, update]);

  // OCS: set a per-student max units override for a specific term
  const setStudentMaxUnitsOverride = useCallback((termId: string, studentId: string, units: number | null) => {
    update(s => {
      const terms = s.terms.map(t => {
        if (t.id !== termId) return t;
        const overrides = { ...(t.studentMaxUnitsOverrides ?? {}) };
        if (units === null) delete overrides[studentId];
        else overrides[studentId] = units;
        return { ...t, studentMaxUnitsOverrides: overrides };
      });
      saveAppSetting('terms', terms);
      return { ...s, terms };
    });
  }, [update, saveAppSetting]);

  // OCS: set the same max units override for ALL students in a term at once
  const setAllStudentsMaxUnitsOverride = useCallback((termId: string, units: number) => {
    update(s => {
      const allStudentIds = s.users.filter(u => u.role === 'student').map(u => u.id);
      const terms = s.terms.map(t => {
        if (t.id !== termId) return t;
        const overrides = { ...(t.studentMaxUnitsOverrides ?? {}) };
        allStudentIds.forEach(id => { overrides[id] = units; });
        return { ...t, studentMaxUnitsOverrides: overrides };
      });
      saveAppSetting('terms', terms);
      return { ...s, terms };
    });
  }, [update, saveAppSetting]);

  const dropUnfinalizedCourses = useCallback(async (termId: string) => {
    const term = state.terms.find(t => t.id === termId);
    if (!term?.unfinalizedDeadline) return;
    const now = new Date();
    if (now < new Date(term.unfinalizedDeadline)) return;
    // Find all students with enlisted (not finalized) enrollments for this term
    const finalizedStudentIds = new Set(
      state.finalizedEnlistments.filter(f => f.termId === termId).map(f => f.studentId)
    );
    // Students with approved unfinalized requests should NOT be auto-dropped
    const approvedRequestStudentIds = new Set(
      state.unfinalizedRequests
        .filter(r => r.termId === termId && r.status === 'approved')
        .map(r => r.studentId)
    );
    const enlistedEnrollments = state.enrollments.filter(
      e => e.termId === termId && e.status === 'enlisted' &&
        !finalizedStudentIds.has(e.studentId) &&
        !approvedRequestStudentIds.has(e.studentId)
    );
    if (enlistedEnrollments.length === 0) return;
    const affectedSectionIds = new Set(enlistedEnrollments.map(e => e.sectionId));
    update(s => ({
      ...s,
      enrollments: s.enrollments.map(e =>
        e.termId === termId && e.status === 'enlisted' &&
        !finalizedStudentIds.has(e.studentId) &&
        !approvedRequestStudentIds.has(e.studentId)
          ? { ...e, status: 'dropped' as const }
          : e
      ),
      sections: s.sections.map(sec =>
        affectedSectionIds.has(sec.id)
          ? { ...sec, enrolled: Math.max(0, sec.enrolled - enlistedEnrollments.filter(e => e.sectionId === sec.id).length) }
          : sec
      ),
    }));
    // Sync to DB — update enrollment status
    for (const enr of enlistedEnrollments) {
      await supabase.from('enrollments').update({ status: 'dropped' })
        .eq('id', enr.id)
        .then(({ error }) => { if (error) console.error('dropUnfinalizedCourses DB error:', error.message); });
    }
    // Recalculate sections.enrolled in DB for all affected sections
    await supabase.rpc('recalculate_enrolled_for_sections', {
      p_section_ids: [...affectedSectionIds],
    }).then(({ error }) => { if (error) console.error('recalculate_enrolled_for_sections error:', error.message); });
  }, [state, update]);

  const getStudentEnrollments = useCallback((studentId: string, termId: string) => {
    return state.enrollments.filter(e => e.studentId === studentId && e.termId === termId && e.status !== 'dropped');
  }, [state.enrollments]);

  const getStudentGrades = useCallback((studentId: string, termId: string) => {
    return state.grades
      .filter(g => g.studentId === studentId && g.termId === termId)
      .map(grade => {
        const section = state.sections.find(s => s.id === grade.sectionId);
        const course = section ? state.courses.find(c => c.id === section.courseId) : undefined;
        return section && course ? { grade, section, course } : null;
      })
      .filter(Boolean) as Array<{ grade: Grade; section: Section; course: Course }>;
  }, [state]);

  const canStudentViewGrades = useCallback((studentId: string, termId: string) => {
    // Exclude manual grade entries (__MANUAL__ sections) — they have no faculty and don't require SET
    const enrollments = state.enrollments.filter(e => {
      if (e.studentId !== studentId || e.termId !== termId || e.status === 'dropped') return false;
      const sec = state.sections.find(s => s.id === e.sectionId);
      return sec?.sectionCode !== '__MANUAL__';
    });
    if (enrollments.length === 0) return true;  // no real courses → allow grade view
    // Grades unlock once student submits ALL faculty evaluations — faculty submission is not required
    const submittedEvals = state.evaluations.filter(e => e.studentId === studentId && e.termId === termId);
    return submittedEvals.length >= enrollments.length;
  }, [state]);

  const computeGWA = useCallback((studentId: string, termId?: string) => {
    const terms = termId ? state.terms.filter(t => t.id === termId) : state.terms;
    let totalWeighted = 0;
    let totalUnits = 0;
    const perTerm: Array<{ term: Term; gwa: number }> = [];

    terms.forEach(term => {
      const termGrades = state.grades.filter(g =>
        g.studentId === studentId && g.termId === term.id && g.submitted && g.grade !== null
      );
      let tw = 0, tu = 0;
      termGrades.forEach(g => {
        const section = state.sections.find(s => s.id === g.sectionId);
        const course = section ? state.courses.find(c => c.id === section.courseId) : undefined;
        if (!course || course.isPE || course.isNSTP || /^HK\b/i.test(course.code)) return;
        // Skip grades for enrollments that were officially dropped (change/drop approved)
        const enrollment = state.enrollments.find(
          e => e.studentId === studentId && e.sectionId === g.sectionId && e.termId === term.id
        );
        if (enrollment?.status === 'dropped') return;
        // Apply academic rules: auto-converts 4.0→5.0 if prescription expired
        const effectiveGrade = getEffectiveGradeWithRules(g, state.grades, state.sections, state.terms);
        const numGrade = parseFloat(effectiveGrade as string);
        if (isNaN(numGrade)) return; // skip INC, DRP, P, F etc.
        tw += numGrade * course.units;
        tu += course.units;
      });
      if (tu > 0) {
        const gwa = Math.round((tw / tu) * 100) / 100;
        perTerm.push({ term, gwa });
        totalWeighted += tw;
        totalUnits += tu;
      }
    });

    return {
      gwa: totalUnits > 0 ? Math.round((totalWeighted / totalUnits) * 100) / 100 : 0,
      perTerm,
    };
  }, [state]);

  const getFacultyEvaluations = useCallback((facultyId: string, termId: string) => {
    return state.evaluations.filter(e => e.facultyId === facultyId && e.termId === termId);
  }, [state.evaluations]);

  // ── Date-based controls: recompute every 30 seconds ──────────────────────
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNowTick(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const isWithinWindow = useCallback((from?: string, until?: string): boolean => {
    const now = new Date(nowTick);
    if (!from && !until) return false;
    if (from && now < new Date(from)) return false;
    if (until && now > new Date(until)) return false;
    return true;
  }, [nowTick]);

  const computedState = useMemo(() => ({
    ...state,
    terms: state.terms.map(term => ({
      ...term,
      controls: {
        enlistmentOpen: isWithinWindow(term.enlistmentFrom, term.enlistmentUntil),
        enrollmentOpen: isWithinWindow(term.enrollmentFrom, term.enrollmentUntil),
        ficEvalOpen: isWithinWindow(term.evaluationFrom, term.evaluationUntil),
        gradeSubmissionOpen: isWithinWindow(term.encodingFrom, term.encodingUntil),
        prerogativeOpen: isWithinWindow(term.prerogativeFrom, term.prerogativeUntil),
      },
    })),
  }), [state, isWithinWindow]);

  return (
    <AppContext.Provider value={{
      state: computedState, authReady,
      login, loginWithGoogle, logout,
      addTerm, deleteTerm, updateTermControls, updateTermSettings, setActiveTerm,
      addCourse, updateCourse, deleteCourse,
      addSection, updateSection, deleteSection,
      loadSections, loadCourses, loadPrerogatives, loadAppSettings,
      enlistSection, enlistWithPrerogative, dropSection, removeSection,
      submitGrade, submitGradesBatch, submitRemovalGrade, submitRemovalGradesBatch, submitRemovalGradeFinal,
      updateConsentStatus, requestConsent,
      submitEvaluation,
      requestPrerogative, cancelPrerogative, processPrerogative,
      finalizeEnlistment, unfinalizeEnlistment,
      addUser, updateUser, removeUser, syncUsersToCloud, promoteStudents, transferStudent,
      updatePortalSettings,
      addCollege, updateCollege, deleteCollege,
      addDepartment, updateDepartment, deleteDepartment,
      addDegreeProgram, updateDegreeProgram, deleteDegreeProgram,
      addRoom, updateRoom, deleteRoom,
      submitUnfinalizedRequest, processUnfinalizedRequest, dropUnfinalizedCourses,
      submitReconsiderationRequest, processReconsiderationRequest, loadReconsiderationRequests,
      submitChangeDropRequest, processChangeDropRequest, loadChangeDropRequests,
      ocsUpdateGrade, ocsManualEnroll, ocsManualAddCourse, ocsRemoveEnrollment, setStudentMaxUnitsOverride, setAllStudentsMaxUnitsOverride,
      getActiveTerm: () => computedState.terms.find(t => t.isActive),
      getStudentEnrollments, getStudentGrades,
      canStudentViewGrades, computeGWA,
      getFacultyEvaluations, getCurrentUnits,
      checkPrerequisites, checkCorequisites,
    }}>
      {children}
    </AppContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

function schedulesOverlap(a: { days: string[]; startTime: string; endTime: string }, b: { days: string[]; startTime: string; endTime: string }): boolean {
  const sharedDays = a.days.some(d => b.days.includes(d));
  if (!sharedDays) return false;
  const toMinutes = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  return toMinutes(a.startTime) < toMinutes(b.endTime) && toMinutes(a.endTime) > toMinutes(b.startTime);
}
