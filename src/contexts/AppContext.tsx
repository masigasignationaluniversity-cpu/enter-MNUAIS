import React, { createContext, useContext, useState, useCallback } from 'react';
import type { AppState, User, Term, Course, Section, Grade, ConsentRecord, Enrollment, Evaluation, GradeValue, ConsentStatus } from '../lib/types';
import { loadState, saveState } from '../lib/store';

interface AppContextType {
  state: AppState;
  login: (username: string, password: string) => User | null;
  logout: () => void;
  // Term
  updateTermControls: (termId: string, controls: Partial<Term['controls']>) => void;
  setActiveTerm: (termId: string) => void;
  // Courses
  addCourse: (course: Omit<Course, 'id'>) => void;
  // Sections
  addSection: (section: Omit<Section, 'id'>) => void;
  updateSection: (sectionId: string, updates: Partial<Section>) => void;
  // Enrollment
  enlistSection: (studentId: string, sectionId: string, termId: string) => { success: boolean; message: string };
  dropSection: (studentId: string, sectionId: string, termId: string) => void;
  // Grades
  submitGrade: (gradeId: string, grade: GradeValue) => void;
  submitGradesBatch: (sectionId: string) => void;
  submitRemovalGrade: (gradeId: string, removalGrade: GradeValue) => void;
  // Consents
  updateConsentStatus: (consentId: string, field: 'coiStatus' | 'deptConsentStatus' | 'ocsConsentStatus', status: ConsentStatus) => void;
  requestConsent: (studentId: string, sectionId: string, termId: string, field: 'coiStatus' | 'deptConsentStatus' | 'ocsConsentStatus', reason?: string) => void;
  // Evaluations
  submitEvaluation: (evaluation: Omit<Evaluation, 'id' | 'submittedAt' | 'overallRating'>) => void;
  // Utils
  getActiveTerm: () => Term | undefined;
  getStudentEnrollments: (studentId: string, termId: string) => Enrollment[];
  getStudentGrades: (studentId: string, termId: string) => Array<{ grade: Grade; section: Section; course: Course }>;
  canStudentViewGrades: (studentId: string, termId: string) => boolean;
  computeGWA: (studentId: string, termId?: string) => { gwa: number; perTerm: Array<{ term: Term; gwa: number }> };
  getFacultyEvaluations: (facultyId: string, termId: string) => Evaluation[];
  addUser: (user: Omit<User, 'id'>) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState());

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

  const getActiveTerm = useCallback(() => {
    return state.terms.find(t => t.isActive);
  }, [state.terms]);

  const setActiveTerm = useCallback((termId: string) => {
    update(s => ({
      ...s,
      terms: s.terms.map(t => ({ ...t, isActive: t.id === termId })),
    }));
  }, [update]);

  const updateTermControls = useCallback((termId: string, controls: Partial<Term['controls']>) => {
    update(s => ({
      ...s,
      terms: s.terms.map(t => t.id === termId ? { ...t, controls: { ...t.controls, ...controls } } : t),
    }));
  }, [update]);

  const addCourse = useCallback((course: Omit<Course, 'id'>) => {
    const id = `c-${Date.now()}`;
    update(s => ({ ...s, courses: [...s.courses, { ...course, id }] }));
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

  const enlistSection = useCallback((studentId: string, sectionId: string, termId: string): { success: boolean; message: string } => {
    // Check already enlisted
    const already = state.enrollments.find(e => e.studentId === studentId && e.sectionId === sectionId && e.termId === termId && e.status !== 'dropped');
    if (already) return { success: false, message: 'Already enlisted in this section.' };

    const sec = state.sections.find(s => s.id === sectionId);
    if (!sec) return { success: false, message: 'Section not found.' };
    if (sec.enrolled >= sec.slots) return { success: false, message: 'Section is already full.' };

    // Check schedule overlap
    const studentSections = state.enrollments
      .filter(e => e.studentId === studentId && e.termId === termId && e.status !== 'dropped')
      .map(e => state.sections.find(s => s.id === e.sectionId))
      .filter(Boolean) as Section[];

    const hasOverlap = studentSections.some(existing => {
      return schedulesOverlap(existing.schedule, sec.schedule) ||
        (sec.labSchedule && schedulesOverlap(existing.schedule, sec.labSchedule)) ||
        (existing.labSchedule && schedulesOverlap(existing.labSchedule, sec.schedule));
    });

    if (hasOverlap) return { success: false, message: 'Schedule conflict detected with an existing class.' };

    const enrollment: Enrollment = {
      id: `enr-${Date.now()}`,
      studentId,
      sectionId,
      termId,
      status: 'enlisted',
      enlistedAt: new Date().toISOString().split('T')[0],
    };
    const grade: Grade = {
      id: `gr-${Date.now()}`,
      studentId,
      sectionId,
      termId,
      grade: null,
      submitted: false,
    };
    update(s => ({
      ...s,
      enrollments: [...s.enrollments, enrollment],
      grades: [...s.grades, grade],
      sections: s.sections.map(sec => sec.id === sectionId ? { ...sec, enrolled: sec.enrolled + 1 } : sec),
    }));
    return { success: true, message: 'Successfully enlisted.' };
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
    update(s => ({
      ...s,
      grades: s.grades.map(g => g.id === gradeId ? { ...g, grade } : g),
    }));
  }, [update]);

  const submitGradesBatch = useCallback((sectionId: string) => {
    update(s => ({
      ...s,
      grades: s.grades.map(g => g.sectionId === sectionId ? { ...g, submitted: true } : g),
    }));
  }, [update]);

  const submitRemovalGrade = useCallback((gradeId: string, removalGrade: GradeValue) => {
    update(s => ({
      ...s,
      grades: s.grades.map(g => g.id === gradeId ? { ...g, removalGrade } : g),
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
        studentId,
        sectionId,
        termId,
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
    const enrollments = state.enrollments.filter(
      e => e.studentId === studentId && e.termId === termId && e.status !== 'dropped'
    );
    if (enrollments.length === 0) return false;
    // All grades must be submitted first
    const allGradesSubmitted = enrollments.every(enr => {
      const grade = state.grades.find(g => g.studentId === studentId && g.sectionId === enr.sectionId && g.termId === termId);
      return grade?.submitted === true;
    });
    if (!allGradesSubmitted) return false;
    // Student must have submitted all evaluations
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

  const addUser = useCallback((user: Omit<User, 'id'>) => {
    const id = `u-${Date.now()}`;
    update(s => ({ ...s, users: [...s.users, { ...user, id }] }));
  }, [update]);

  return (
    <AppContext.Provider value={{
      state,
      login, logout,
      updateTermControls, setActiveTerm,
      addCourse, addSection, updateSection,
      enlistSection, dropSection,
      submitGrade, submitGradesBatch, submitRemovalGrade,
      updateConsentStatus, requestConsent,
      submitEvaluation,
      getActiveTerm,
      getStudentEnrollments, getStudentGrades,
      canStudentViewGrades, computeGWA,
      getFacultyEvaluations, addUser,
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

// Helper: check if two schedules overlap
function schedulesOverlap(a: { days: string[]; startTime: string; endTime: string }, b: { days: string[]; startTime: string; endTime: string }): boolean {
  const sharedDays = a.days.some(d => b.days.includes(d));
  if (!sharedDays) return false;
  const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const aStart = toMinutes(a.startTime);
  const aEnd = toMinutes(a.endTime);
  const bStart = toMinutes(b.startTime);
  const bEnd = toMinutes(b.endTime);
  return aStart < bEnd && aEnd > bStart;
}
