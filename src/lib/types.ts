export type Role = 'admin' | 'ocs' | 'faculty' | 'student';

export interface User {
  id: string;
  username: string;
  password?: string; // not stored client-side after Supabase auth migration
  role: Role;
  name: string;
  email: string;
  department?: string;
  studentNumber?: string;
  employeeId?: string;
  yearLevel?: number;
  program?: string;
  status?: 'active' | 'inactive' | 'transferred';
}

export interface Term {
  id: string;
  name: string;
  academicYear: string;
  semester: '1st' | '2nd' | 'Summer';
  isActive: boolean;
  dropDeadline?: string; // ISO date string
  maxUnits?: number;     // max regular units per student (excl PE/NSTP)
  controls: {
    enlistmentOpen: boolean;
    enrollmentOpen: boolean;
    ficEvalOpen: boolean;
    gradeSubmissionOpen: boolean;
    prerogativeOpen: boolean;
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
  prerequisites?: string[]; // course IDs
  corequisites?: string[];  // course IDs
}

export type Day = 'M' | 'T' | 'W' | 'Th' | 'F' | 'S';

export interface Schedule {
  days: Day[];
  startTime: string;
  endTime: string;
  room: string;
}

export interface Section {
  id: string;
  courseId: string;
  termId: string;
  sectionCode: string;
  facultyId: string;
  slots: number;
  enrolled: number;
  schedule: Schedule;
  labSchedule?: Schedule;
}

export type GradeValue = '1.0' | '1.25' | '1.5' | '1.75' | '2.0' | '2.25' | '2.5' | '2.75' | '3.0' | '4' | '5' | 'INC' | 'DRP' | 'P' | 'F';

export interface Grade {
  id: string;
  studentId: string;
  sectionId: string;
  termId: string;
  grade: GradeValue | null;
  removalGrade?: GradeValue | null;
  removalSubmitted?: boolean;
  submitted: boolean;
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
  rating: number;
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

// Prerogative: student requests to enlist in a full section; faculty accepts/denies
export type PrerogativeStatus = 'pending' | 'approved' | 'denied';

export interface Prerogative {
  id: string;
  studentId: string;
  sectionId: string;
  termId: string;
  reason: string;
  status: PrerogativeStatus;
  requestedAt: string;
  processedAt?: string;
  processedBy?: string; // facultyId
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
  prerogatives: Prerogative[];
  currentUser: User | null;
}
