export type Role = 'admin' | 'ocs' | 'faculty' | 'student';

export interface User {
  id: string;
  username: string;
  password: string;
  role: Role;
  name: string;
  email: string;
  department?: string;
  studentNumber?: string;
  employeeId?: string;
  yearLevel?: number;
  program?: string;
}

export interface Term {
  id: string;
  name: string; // e.g. "1st Semester 2024-2025"
  academicYear: string;
  semester: '1st' | '2nd' | 'Summer';
  isActive: boolean;
  controls: {
    enlistmentOpen: boolean;
    enrollmentOpen: boolean;
    ficEvalOpen: boolean;
    gradeSubmissionOpen: boolean;
  };
}

export type CourseType = 'Lec' | 'Lab' | 'Recitation' | 'Lec+Lab';

export interface Course {
  id: string;
  code: string;
  title: string;
  units: number;
  labUnits?: number;
  type: CourseType;
  department: string;
  isPE: boolean;
  isNSTP: boolean;
}

export type Day = 'M' | 'T' | 'W' | 'Th' | 'F' | 'S';

export interface Schedule {
  days: Day[];
  startTime: string; // "07:30"
  endTime: string;   // "09:00"
  room: string;
}

export interface Section {
  id: string;
  courseId: string;
  termId: string;
  sectionCode: string; // e.g. "A", "B", "Lab1"
  facultyId: string;
  slots: number;
  enrolled: number;
  schedule: Schedule;
  labSchedule?: Schedule; // for Lec+Lab
}

export type GradeValue = '1.0' | '1.25' | '1.5' | '1.75' | '2.0' | '2.25' | '2.5' | '2.75' | '3.0' | '4' | '5' | 'INC' | 'DRP' | 'P' | 'F';

export interface Grade {
  id: string;
  studentId: string;
  sectionId: string;
  termId: string;
  grade: GradeValue | null;
  removalGrade?: GradeValue | null;
  submitted: boolean; // faculty submitted grades to students
  remarks?: string;
}

export type ConsentStatus = 'not_requested' | 'pending' | 'approved' | 'denied';

export interface ConsentRecord {
  id: string;
  studentId: string;
  sectionId: string;
  termId: string;
  coiStatus: ConsentStatus;
  deptConsentStatus: ConsentStatus;
  ocsConsentStatus: ConsentStatus;
  coiReason?: string;
  deptReason?: string;
  ocsReason?: string;
}

export interface Enrollment {
  id: string;
  studentId: string;
  sectionId: string;
  termId: string;
  status: 'enlisted' | 'enrolled' | 'dropped';
  enlistedAt: string;
}

export interface EvaluationQuestion {
  id: string;
  text: string;
}

export interface EvaluationResponse {
  questionId: string;
  rating: number; // 1-5
}

export interface Evaluation {
  id: string;
  studentId: string;
  facultyId: string;
  sectionId: string;
  termId: string;
  responses: EvaluationResponse[];
  submittedAt: string;
  overallRating: number;
}

export interface AppState {
  users: User[];
  terms: Term[];
  courses: Course[];
  sections: Section[];
  grades: Grade[];
  consents: ConsentRecord[];
  enrollments: Enrollment[];
  evaluations: Evaluation[];
  currentUser: User | null;
}
