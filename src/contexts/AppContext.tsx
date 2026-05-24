import React, { createContext, useContext, useState, useCallback } from 'react';
import type { AppState, User, Term, Course, Section, Grade, ConsentRecord, Enrollment, Evaluation, GradeValue, ConsentStatus, Prerogative, PrerogativeStatus } from '../lib/types';
import { loadState, saveState } from '../lib/store';

interface AppContextType {
  state: AppState;
  login: (username: string, password: string) => User | null;
  logout: () => void;
  // Term
  addTerm: (term: Omit<Term, 'id'>) => void;
  updateTermControls: (termId: string, controls: Partial<Term['controls']>) => void;
  updateTermSettings: (termId: string, updates: Partial<Term>) => void;
  setActiveTerm: (termId: string) => void;
  // Courses
  addCourse: (course: Omit<Course, 'id'>) => void;
  updateCourse: (courseId: string, updates: Partial<Course>) => void;
  deleteCourse: (courseId: string) => void;
  // Sections
  addSection: (section: Omit<Section, 'id'>) => void;
  updateSection: (sectionId: string, updates: Partial<Section>) => void;
  deleteSection: (sectionId: string) => void;
  // Enrollment
  enlistSection: (studentId: string, sectionId: string, termId: string) => { success: boolean; message: string };
  enlistWithPrerogative: (studentId: string, sectionId: string, termId: string) => void;
  dropSection: (studentId: string, sectionId: string, termId: string) => void;
  // Grades
  submitGrade: (gradeId: string, grade: GradeValue) => void;
  submitGradesBatch: (sectionId: string) => void;
  submitRemovalGrade: (gradeId: string, removalGrade: GradeValue) => void;
  submitRemovalGradesBatch: (sectionId: string) => void;
  // Consents
  updateConsentStatus: (consentId: string, field: 'coiStatus' | 'deptConsentStatus' | 'ocsConsentStatus', status: ConsentStatus) => void;
  requestConsent: (studentId: string, sectionId: string, termId: string, field: 'coiStatus' | 'deptConsentStatus' | 'ocsConsentStatus', reason?: string) => void;
  // Evaluations
  submitEvaluation: (evaluation: Omit<Evaluation, 'id' | 'submittedAt' | 'overallRating'>) => void;
  // Prerogatives
  requestPrerogative: (studentId: string, sectionId: string, termId: string, reason: string) => void;
  processPrerogative: (prerogativeId: string, status: PrerogativeStatus, facultyId: string) => void;
  // Users (Admin)
  addUser: (user: Omit<User, 'id'>) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  removeUser: (userId: string) => void;
  promoteStudents: (studentIds: string[]) => void;
  transferStudent: (studentId: string, program: string) => void;
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
    // Migrate: ensure prerogatives array and new term fields exist
    if (!s.prerogatives) s.prerogatives = [];
    s.terms = s.terms.map(t => ({
      ...t,
      dropDeadline: t.dropDeadline ?? '',
      maxUnits: t.maxUnits ?? 21,
      controls: { prerogativeOpen: false, ...t.controls },
    }));
    s.courses = s.courses.map(c => ({
      ...c,
      prerequisites: c.prerequisites ?? [],
      corequisites: c.corequisites ?? [],
    }));
    return s;
  });

  const update = useCallback((updater: (prev: AppState) => AppState) => {
    setState(prev => {
      const next = updater(prev);
      saveState(next);
      return next;
    });
  }, []);

  const login = useCallback((username: string, password: string): User | null => {
    const user = state.users.find(u => u.username === username && u.password === password);
    if (!user) return null;
    update(s => ({ ...s, currentUser: user }));
    return user;
  }, [state.users, update]);

  const logout = useCallback(() => {
    update(s => ({ ...s, currentUser: null }));
  }, [update]);

  const getActiveTerm = useCallback(() => state.terms.find(t => t.isActive), [state.terms]);

  const setActiveTerm = useCallback((termId: string) => {
    update(s => ({ ...s, terms: s.terms.map(t => ({ ...t, isActive: t.id === termId })) }));
  }, [update]);

  const addTerm = useCallback((term: Omit<Term, 'id'>) => {
    const id = `term-${Date.now()}`;
    update(s => ({ ...s, terms: [...s.terms, { ...term, id }] }));
  }, [update]);

  const updateTermControls = useCallback((termId: string, controls: Partial<Term['controls']>) => {
    update(s => ({
      ...s,
      terms: s.terms.map(t => t.id === termId ? { ...t, controls: { ...t.controls, ...controls } } : t),
    }));
  }, [update]);

  const updateTermSettings = useCallback((termId: string, updates: Partial<Term>) => {
    update(s => ({
      ...s,
      terms: s.terms.map(t => t.id === termId ? { ...t, ...updates } : t),
    }));
  }, [update]);

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
    update(s => ({ ...s, sections: [...s.sections, { ...section, id }] }));
  }, [update]);

  const updateSection = useCallback((sectionId: string, updates: Partial<Section>) => {
    update(s => ({
      ...s,
      sections: s.sections.map(sec => sec.id === sectionId ? { ...sec, ...updates } : sec),
    }));
  }, [update]);

  const deleteSection = useCallback((sectionId: string) => {
    update(s => ({ ...s, sections: s.sections.filter(sec => sec.id !== sectionId) }));
  }, [update]);

  // Check prerequisites: student must have PASSED (grade 1.0-3.0 or P) the prerequisite courses
  const checkPrerequisites = useCallback((studentId: string, courseId: string) => {
    const course = state.courses.find(c => c.id === courseId);
    if (!course || !course.prerequisites?.length) return { passed: true, missing: [] };
    const missing: string[] = [];
    for (const prereqId of course.prerequisites) {
      const prereqCourse = state.courses.find(c => c.id === prereqId);
      if (!prereqCourse) continue;
      // Find a submitted grade for this course (any term)
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

  // Check corequisites: student must be currently enrolled (not dropped) in coreq course this term
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

  // Get current enrolled units for a student this term (excl PE/NSTP)
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
    if (sec.enrolled >= sec.slots) return { success: false, message: 'Section is full. Request a prerogative if open.' };

    const course = state.courses.find(c => c.id === sec.courseId);
    if (!course) return { success: false, message: 'Course not found.' };

    // Unit limit check
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

    // Prerequisites check
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

    // Schedule overlap
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
    return { success: true, message: 'Successfully enlisted.' };
  }, [state, update]);

  // Enlist bypassing slot limit (after prerogative approved)
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

  const dropSection = useCallback((studentId: string, sectionId: string, termId: string) => {
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
  }, [update]);

  const submitGrade = useCallback((gradeId: string, grade: GradeValue) => {
    update(s => ({ ...s, grades: s.grades.map(g => g.id === gradeId ? { ...g, grade } : g) }));
  }, [update]);

  const submitGradesBatch = useCallback((sectionId: string) => {
    update(s => ({
      ...s,
      grades: s.grades.map(g => g.sectionId === sectionId ? { ...g, submitted: true } : g),
    }));
  }, [update]);

  const submitRemovalGrade = useCallback((gradeId: string, removalGrade: GradeValue) => {
    update(s => ({ ...s, grades: s.grades.map(g => g.id === gradeId ? { ...g, removalGrade } : g) }));
  }, [update]);

  const submitRemovalGradesBatch = useCallback((sectionId: string) => {
    update(s => ({
      ...s,
      grades: s.grades.map(g =>
        g.sectionId === sectionId && g.removalGrade ? { ...g, removalSubmitted: true } : g
      ),
    }));
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
    const prg: Prerogative = {
      id: `prg-${Date.now()}`,
      studentId, sectionId, termId, reason,
      status: 'pending',
      requestedAt: new Date().toISOString().split('T')[0],
    };
    update(s => ({ ...s, prerogatives: [...s.prerogatives, prg] }));
  }, [state.prerogatives, update]);

  const processPrerogative = useCallback((prerogativeId: string, status: PrerogativeStatus, facultyId: string) => {
    const prg = state.prerogatives.find(p => p.id === prerogativeId);
    update(s => ({
      ...s,
      prerogatives: s.prerogatives.map(p =>
        p.id === prerogativeId
          ? { ...p, status, processedAt: new Date().toISOString().split('T')[0], processedBy: facultyId }
          : p
      ),
    }));
    // If approved, auto-enlist
    if (status === 'approved' && prg) {
      const already = state.enrollments.find(e => e.studentId === prg.studentId && e.sectionId === prg.sectionId && e.termId === prg.termId && e.status !== 'dropped');
      if (!already) {
        const enrollment: Enrollment = {
          id: `enr-${Date.now()}`,
          studentId: prg.studentId, sectionId: prg.sectionId, termId: prg.termId,
          status: 'enlisted',
          enlistedAt: new Date().toISOString().split('T')[0],
        };
        const grade: Grade = {
          id: `gr-${Date.now()}`,
          studentId: prg.studentId, sectionId: prg.sectionId, termId: prg.termId,
          grade: null, submitted: false,
        };
        update(s => ({
          ...s,
          enrollments: [...s.enrollments, enrollment],
          grades: [...s.grades, grade],
          sections: s.sections.map(sec => sec.id === prg.sectionId ? { ...sec, enrolled: sec.enrolled + 1 } : sec),
        }));
      }
    }
  }, [state, update]);

  const addUser = useCallback((user: Omit<User, 'id'>) => {
    const id = `u-${Date.now()}`;
    update(s => ({ ...s, users: [...s.users, { ...user, id }] }));
  }, [update]);

  const updateUser = useCallback((userId: string, updates: Partial<User>) => {
    update(s => ({
      ...s,
      users: s.users.map(u => u.id === userId ? { ...u, ...updates } : u),
    }));
  }, [update]);

  const removeUser = useCallback((userId: string) => {
    update(s => ({
      ...s,
      users: s.users.map(u => u.id === userId ? { ...u, status: 'inactive' } : u),
    }));
  }, [update]);

  const promoteStudents = useCallback((studentIds: string[]) => {
    update(s => ({
      ...s,
      users: s.users.map(u =>
        studentIds.includes(u.id) && u.role === 'student' && u.yearLevel
          ? { ...u, yearLevel: u.yearLevel + 1 }
          : u
      ),
    }));
  }, [update]);

  const transferStudent = useCallback((studentId: string, program: string) => {
    update(s => ({
      ...s,
      users: s.users.map(u => u.id === studentId ? { ...u, program, status: 'transferred' } : u),
    }));
  }, [update]);

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
        const numGrade = parseFloat(g.grade as string);
        if (isNaN(numGrade)) return;
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
      state,
      login, logout,
      addTerm, updateTermControls, updateTermSettings, setActiveTerm,
      addCourse, updateCourse, deleteCourse,
      addSection, updateSection, deleteSection,
      enlistSection, enlistWithPrerogative, dropSection,
      submitGrade, submitGradesBatch, submitRemovalGrade, submitRemovalGradesBatch,
      updateConsentStatus, requestConsent,
      submitEvaluation,
      requestPrerogative, processPrerogative,
      addUser, updateUser, removeUser, promoteStudents, transferStudent,
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
