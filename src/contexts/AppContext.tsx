import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { AppState, User, Term, Course, Section, Grade, ConsentRecord, Enrollment, Evaluation, GradeValue, ConsentStatus, Prerogative, PrerogativeStatus, PortalSettings, College, Department, DegreeProgram, FinalizedEnlistment, Room, UnfinalizedRequest, UnfinalizedRequestStatus } from '../lib/types';
import { loadState, saveState } from '../lib/store';
import { getPassedUnits, getYearClassification } from '../lib/academic';
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
  // Sections
  loadSections: () => Promise<void>;
  loadPrerogatives: () => Promise<void>;
  loadAppSettings: () => Promise<void>;
  addSection: (section: Omit<Section, 'id'>) => void;
  updateSection: (sectionId: string, updates: Partial<Section>) => void;
  deleteSection: (sectionId: string) => void;
  // Enrollment
  enlistSection: (studentId: string, sectionId: string, termId: string) => { success: boolean; message: string };
  enlistWithPrerogative: (studentId: string, sectionId: string, termId: string) => void;
  dropSection: (studentId: string, sectionId: string, termId: string) => { success: boolean; message: string };
  // Grades
  submitGrade: (gradeId: string, grade: GradeValue) => void;
  submitGradesBatch: (sectionId: string) => void;
  submitRemovalGrade: (gradeId: string, removalGrade: GradeValue) => void;
  submitRemovalGradesBatch: (sectionId: string) => void;
  // Consents
  updateConsentStatus: (consentId: string, field: 'coiStatus' | 'deptConsentStatus' | 'ocsConsentStatus', status: ConsentStatus) => void;
  requestConsent: (studentId: string, sectionId: string, termId: string, field: 'coiStatus' | 'deptConsentStatus' | 'ocsConsentStatus', reason?: string) => void;
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
  // Utils
  getActiveTerm: () => Term | undefined;
  getStudentEnrollments: (studentId: string, termId: string) => Enrollment[];
  getStudentGrades: (studentId: string, termId: string) => Array<{ grade: Grade; section: Section; course: Course }>;
  canStudentViewGrades: (studentId: string, termId: string) => boolean;
  computeGWA: (studentId: string, termId?: string) => { gwa: number; perTerm: Array<{ term: Term; gwa: number }> };
  getFacultyEvaluations: (facultyId: string, termId: string) => Evaluation[];
  getCurrentUnits: (studentId: string, termId: string) => number;
  checkPrerequisites: (studentId: string, courseId: string) => { passed: boolean; missing: string[] };
  checkCorequisites: (studentId: string, courseId: string, termId: string) => { passed: boolean; missing: string[] };
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
    if (!s.portalSettings) s.portalSettings = {
      portalName: 'University AIS',
      portalTagline: 'Academic Information System',
      institutionName: 'University',
    };
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
    return s;
  });
  const [authReady, setAuthReady] = useState(true); // Always ready — no async auth check needed

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

  // Load sections from DB and replace local state
  const loadSections = useCallback(async () => {
    const { data } = await supabase.from('sections').select('*');
    if (data) {
      const sections = data.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        courseId: row.course_id as string,
        sectionCode: row.section_code as string,
        facultyId: (row.faculty_id as string) || '',
        termId: row.term_id as string,
        enrolled: row.enrolled as number,
        slots: row.slots as number,
        schedule: row.schedule as Section['schedule'],
        labSchedule: row.lab_schedule as Section['labSchedule'] | undefined,
        prerogativeAccepting: row.prerogative_accepting as boolean | undefined,
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
      const grades: Grade[] = data.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        studentId: row.student_id as string,
        sectionId: row.section_id as string,
        termId: row.term_id as string,
        grade: row.grade as Grade['grade'] ?? null,
        submitted: row.submitted as boolean,
        removalGrade: row.removal_grade as Grade['removalGrade'] ?? undefined,
        removalSubmitted: row.removal_submitted as boolean ?? false,
      }));
      setState(prev => { const next = { ...prev, grades }; saveState(next); return next; });
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
      saveState(next);
      return next;
    });
  }, []);

  // On mount: validate saved session against DB; if invalid, force logout
  useEffect(() => {
    if (state.currentUser) {
      supabase.from('profiles')
        .select('local_id, status')
        .eq('local_id', state.currentUser.id)
        .eq('status', 'active')
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
            loadEnrollments();
            loadGrades();
            loadPrerogatives();
            loadAppSettings();
          }
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    // Set currentUser immediately and persist to localStorage
    setState(prev => {
      const next = { ...prev, currentUser };
      saveState(next);
      return next;
    });

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
    loadEnrollments();
    loadGrades();
    loadPrerogatives();
    loadAppSettings();

    return currentUser;
  }, [loadSections, loadEnrollments, loadGrades, loadPrerogatives, loadAppSettings]);

  // LOGOUT — clear state only (no Supabase Auth session to end)
  const logout = useCallback(async () => {
    setState(prev => ({ ...prev, currentUser: null, users: [] }));
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
    update(s => {
      const next = { ...s, terms: s.terms.filter(t => t.id !== termId) };
      saveAppSetting('terms', next.terms);
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
    update(s => ({ ...s, courses: [...s.courses, { ...course, id }] }));
  }, [update]);

  const updateCourse = useCallback((courseId: string, updates: Partial<Course>) => {
    update(s => ({
      ...s,
      courses: s.courses.map(c => c.id === courseId ? { ...c, ...updates } : c),
    }));
  }, [update]);

  const deleteCourse = useCallback((courseId: string) => {
    update(s => ({ ...s, courses: s.courses.filter(c => c.id !== courseId) }));
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

  const checkPrerequisites = useCallback((studentId: string, courseId: string) => {
    const course = state.courses.find(c => c.id === courseId);
    if (!course || !course.prerequisites?.length) return { passed: true, missing: [] };
    const missing: string[] = [];
    for (const prereqId of course.prerequisites) {
      const prereqCourse = state.courses.find(c => c.id === prereqId);
      if (!prereqCourse) continue;
      const prereqGrade = state.grades.find(g => {
        if (g.studentId !== studentId || !g.submitted) return false;
        const sec = state.sections.find(s => s.id === g.sectionId);
        return sec?.courseId === prereqId;
      });
      const passed = prereqGrade && prereqGrade.grade &&
        !['4', '5', 'INC', 'DRP', 'F'].includes(prereqGrade.grade);
      if (!passed) missing.push(prereqCourse.code);
    }
    return { passed: missing.length === 0, missing };
  }, [state]);

  const checkCorequisites = useCallback((studentId: string, courseId: string, termId: string) => {
    const course = state.courses.find(c => c.id === courseId);
    if (!course || !course.corequisites?.length) return { passed: true, missing: [] };
    const missing: string[] = [];
    for (const coreqId of course.corequisites) {
      const coreqCourse = state.courses.find(c => c.id === coreqId);
      if (!coreqCourse) continue;
      const enrolled = state.enrollments.some(e => {
        if (e.studentId !== studentId || e.termId !== termId || e.status === 'dropped') return false;
        const sec = state.sections.find(s => s.id === e.sectionId);
        return sec?.courseId === coreqId;
      });
      if (!enrolled) missing.push(coreqCourse.code);
    }
    return { passed: missing.length === 0, missing };
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

  const enlistSection = useCallback((studentId: string, sectionId: string, termId: string): { success: boolean; message: string } => {
    const already = state.enrollments.find(e => e.studentId === studentId && e.sectionId === sectionId && e.termId === termId && e.status !== 'dropped');
    if (already) return { success: false, message: 'Already enlisted in this section.' };

    const sec = state.sections.find(s => s.id === sectionId);
    if (!sec) return { success: false, message: 'Section not found.' };

    // Check if student has an approved prerogative for this section (bypasses slot limit)
    const hasApprovedPrerog = state.prerogatives.some(
      p => p.studentId === studentId && p.sectionId === sectionId && p.status === 'approved'
    );
    if (!hasApprovedPrerog && sec.enrolled >= sec.slots) return { success: false, message: 'Section is full. Request a prerogative if open.' };

    const course = state.courses.find(c => c.id === sec.courseId);
    if (!course) return { success: false, message: 'Course not found.' };

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
      const passedUnits = getPassedUnits(studentId, state.grades, state.sections, state.courses);
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
        const passedUnits = getPassedUnits(studentId, state.grades, state.sections, state.courses);
        const studentYearClass = getYearClassification(passedUnits, totalProgramUnits);
        const yearRank: Record<string, number> = { Freshman: 0, Sophomore: 1, Junior: 2, Senior: 3 };
        if ((yearRank[studentYearClass] ?? 0) < (yearRank[course.minYearStanding] ?? 0)) {
          return { success: false, message: `This course requires at least ${course.minYearStanding} standing. Your current classification is ${studentYearClass}.` };
        }
      }
    }

    const prereqCheck = (() => {
      if (!course.prerequisites?.length) return { passed: true, missing: [] };
      const missing: string[] = [];
      for (const prereqId of course.prerequisites) {
        const prereqCourse = state.courses.find(c => c.id === prereqId);
        if (!prereqCourse) continue;
        const prereqGrade = state.grades.find(g => {
          if (g.studentId !== studentId || !g.submitted) return false;
          const s = state.sections.find(x => x.id === g.sectionId);
          return s?.courseId === prereqId;
        });
        const passed = prereqGrade && prereqGrade.grade &&
          !['4', '5', 'INC', 'DRP', 'F'].includes(prereqGrade.grade);
        if (!passed) missing.push(prereqCourse.code);
      }
      return { passed: missing.length === 0, missing };
    })();

    if (!prereqCheck.passed) {
      return { success: false, message: `Prerequisites not satisfied: ${prereqCheck.missing.join(', ')}` };
    }

    // Corequisite check — must be enrolled in corequisite course this same term
    const coreqCheck = (() => {
      if (!course.corequisites?.length) return { passed: true, missing: [] };
      const missing: string[] = [];
      for (const coreqId of course.corequisites) {
        const coreqCourse = state.courses.find(c => c.id === coreqId);
        if (!coreqCourse) continue;
        const coreqEnrolled = state.enrollments.some(e => {
          if (e.studentId !== studentId || e.termId !== termId || e.status === 'dropped') return false;
          const s = state.sections.find(x => x.id === e.sectionId);
          return s?.courseId === coreqId;
        });
        if (!coreqEnrolled) missing.push(coreqCourse.code);
      }
      return { passed: missing.length === 0, missing };
    })();
    if (!coreqCheck.passed) {
      return { success: false, message: `Corequisites not satisfied — you must also enlist: ${coreqCheck.missing.join(', ')}` };
    }
    if (course.requiresCOI || course.requiresDeptConsent || course.requiresOCSConsent) {
      const consentRecord = state.consents.find(c => c.studentId === studentId && c.sectionId === sectionId && c.termId === termId);
      if (course.requiresCOI && consentRecord?.coiStatus !== 'approved') {
        return { success: false, message: 'This course requires an approved Consent of Instructor (COI) before enlisting.' };
      }
      if (course.requiresDeptConsent && consentRecord?.deptConsentStatus !== 'approved') {
        return { success: false, message: 'This course requires an approved Department Consent before enlisting.' };
      }
      if (course.requiresOCSConsent && consentRecord?.ocsConsentStatus !== 'approved') {
        return { success: false, message: 'This course requires an approved OCS Consent before enlisting.' };
      }
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
    // NOTE: Grade records are created only when the student FINALIZES their enlistment
    update(s => ({
      ...s,
      enrollments: [...s.enrollments, enrollment],
      sections: s.sections.map(sec => sec.id === sectionId ? { ...sec, enrolled: sec.enrolled + 1 } : sec),
    }));
    // Sync to DB
    supabase.from('enrollments').insert({
      id: enrollment.id, student_id: studentId, section_id: sectionId, term_id: termId,
      status: 'enlisted', enlisted_at: enrollment.enlistedAt,
    }).then(({ error }) => { if (error) console.error('enlistSection DB error:', error.message); });
    supabase.from('sections').update({ enrolled: (sec.enrolled + 1) }).eq('id', sectionId)
      .then(({ error }) => { if (error) console.error('sections enrolled update error:', error.message); });
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
    // Check drop deadline
    if (term?.dropDeadline) {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      const deadline = new Date(term.dropDeadline);
      if (today > deadline) {
        return { success: false, message: `Drop deadline has passed (${term.dropDeadline}).` };
      }
    } else if (!term?.controls.enlistmentOpen) {
      return { success: false, message: 'Enlistment/dropping is currently closed.' };
    }

    update(s => ({
      ...s,
      enrollments: s.enrollments.map(e =>
        e.studentId === studentId && e.sectionId === sectionId && e.termId === termId
          ? { ...e, status: 'dropped' }
          : e
      ),
      sections: s.sections.map(sec =>
        sec.id === sectionId ? { ...sec, enrolled: Math.max(0, sec.enrolled - 1) } : sec
      ),
    }));
    // Sync to DB
    const droppedAt = new Date().toISOString().split('T')[0];
    supabase.from('enrollments').update({ status: 'dropped', dropped_at: droppedAt })
      .eq('student_id', studentId).eq('section_id', sectionId).eq('term_id', termId)
      .then(({ error }) => { if (error) console.error('dropSection DB error:', error.message); });
    const sec2 = state.sections.find(s => s.id === sectionId);
    if (sec2) {
      supabase.from('sections').update({ enrolled: Math.max(0, sec2.enrolled - 1) }).eq('id', sectionId)
        .then(({ error }) => { if (error) console.error('sections drop enrolled update error:', error.message); });
    }
    return { success: true, message: 'Successfully dropped.' };
  }, [state, update]);

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

  const updateConsentStatus = useCallback((consentId: string, field: 'coiStatus' | 'deptConsentStatus' | 'ocsConsentStatus', status: ConsentStatus) => {
    update(s => ({
      ...s,
      consents: s.consents.map(c => c.id === consentId ? { ...c, [field]: status } : c),
    }));
  }, [update]);

  const requestConsent = useCallback((studentId: string, sectionId: string, termId: string, field: 'coiStatus' | 'deptConsentStatus' | 'ocsConsentStatus', reason?: string) => {
    const existing = state.consents.find(c => c.studentId === studentId && c.sectionId === sectionId && c.termId === termId);
    if (existing) {
      update(s => ({
        ...s,
        consents: s.consents.map(c =>
          c.id === existing.id
            ? { ...c, [field]: 'pending', [`${field.replace('Status', '')}Reason`]: reason }
            : c
        ),
      }));
    } else {
      const newConsent: ConsentRecord = {
        id: `con-${Date.now()}`,
        studentId, sectionId, termId,
        coiStatus: field === 'coiStatus' ? 'pending' : 'not_requested',
        deptConsentStatus: field === 'deptConsentStatus' ? 'pending' : 'not_requested',
        ocsConsentStatus: field === 'ocsConsentStatus' ? 'pending' : 'not_requested',
      };
      update(s => ({ ...s, consents: [...s.consents, newConsent] }));
    }
  }, [state.consents, update]);

  const submitEvaluation = useCallback((evalData: Omit<Evaluation, 'id' | 'submittedAt' | 'overallRating'>) => {
    const overallRating = evalData.responses.reduce((sum, r) => sum + r.rating, 0) / evalData.responses.length;
    const evaluation: Evaluation = {
      ...evalData,
      id: `ev-${Date.now()}`,
      submittedAt: new Date().toISOString().split('T')[0],
      overallRating: Math.round(overallRating * 10) / 10,
    };
    update(s => ({ ...s, evaluations: [...s.evaluations, evaluation] }));
  }, [update]);

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
    const { error } = await supabase.functions.invoke('admin-manage-user', {
      body: {
        action: 'create',
        caller_local_id: state.currentUser?.id,
        email: user.email,
        password: user.password,
        username: user.username,
        role: user.role,
        name: user.name,
        local_id: localId,
        department: user.department,
        college: user.college,
        program: user.program,
        year_level: user.yearLevel,
        student_number: user.studentNumber,
        employee_id: user.employeeId,
      },
    });
    if (error) throw new Error(error.message);
    await loadProfiles();
  }, [loadProfiles, state.currentUser]);

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

  // REMOVE USER — hard-deletes from DB (profiles + user_credentials)
  const removeUser = useCallback(async (userId: string) => {
    await supabase.functions.invoke('admin-manage-user', {
      body: { action: 'delete', caller_local_id: state.currentUser?.id, local_id: userId },
    });
    setState(prev => ({
      ...prev,
      users: prev.users.filter(u => u.id !== userId),
    }));
  }, [state.currentUser]);

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
    update(s => { const next = { ...s, colleges: s.colleges.filter(c => c.id !== id) }; syncAcademicUnits(next); return next; });
  }, [update, syncAcademicUnits]);

  const addDepartment = useCallback((dept: Omit<Department, 'id'>) => {
    update(s => { const next = { ...s, departments: [...s.departments, { ...dept, id: `dept-${Date.now()}` }] }; syncAcademicUnits(next); return next; });
  }, [update, syncAcademicUnits]);
  const updateDepartment = useCallback((id: string, updates: Partial<Department>) => {
    update(s => { const next = { ...s, departments: s.departments.map(d => d.id === id ? { ...d, ...updates } : d) }; syncAcademicUnits(next); return next; });
  }, [update, syncAcademicUnits]);
  const deleteDepartment = useCallback((id: string) => {
    update(s => { const next = { ...s, departments: s.departments.filter(d => d.id !== id) }; syncAcademicUnits(next); return next; });
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

  // Auto-drop enlisted (non-finalized) courses for students whose request is not approved
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
    // Sync to DB
    for (const enr of enlistedEnrollments) {
      await supabase.from('enrollments').update({ status: 'dropped' })
        .eq('id', enr.id)
        .then(({ error }) => { if (error) console.error('dropUnfinalizedCourses DB error:', error.message); });
    }
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
    const enrollments = state.enrollments.filter(e => e.studentId === studentId && e.termId === termId && e.status !== 'dropped');
    if (enrollments.length === 0) return false;
    const allGradesSubmitted = enrollments.every(enr => {
      const grade = state.grades.find(g => g.studentId === studentId && g.sectionId === enr.sectionId && g.termId === termId);
      return grade?.submitted === true;
    });
    if (!allGradesSubmitted) return false;
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
        if (!course || course.isPE || course.isNSTP) return;
        // Use removal/completion grade if it was officially submitted, otherwise use original grade
        const effectiveGrade = (g.removalSubmitted && g.removalGrade) ? g.removalGrade : g.grade;
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

  return (
    <AppContext.Provider value={{
      state, authReady,
      login, logout,
      addTerm, deleteTerm, updateTermControls, updateTermSettings, setActiveTerm,
      addCourse, updateCourse, deleteCourse,
      addSection, updateSection, deleteSection,
      loadSections, loadPrerogatives, loadAppSettings,
      enlistSection, enlistWithPrerogative, dropSection,
      submitGrade, submitGradesBatch, submitRemovalGrade, submitRemovalGradesBatch,
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
      getActiveTerm,
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
