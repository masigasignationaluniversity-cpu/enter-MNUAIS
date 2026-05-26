export type Role = 'admin' | 'ocs' | 'faculty' | 'student';

export interface User {
  id: string;
  username: string;
  password?: string; // not stored client-side after Supabase auth migration
  role: Role;
  name: string;
  email: string;
  department?: string;
  college?: string;
  studentNumber?: string;
  employeeId?: string;
  yearLevel?: number;
  program?: string;
  status?: 'active' | 'inactive' | 'transferred' | 'permanently_disqualified';
}

export interface EnrollmentSlot {
  day: number;        // 1–4
  date: string;       // ISO date 'YYYY-MM-DD'
  idPrefixes: string[]; // first 4 digits of student number
}

export interface Term {
  id: string;
  name: string;
  academicYear: string;
  semester: '1st' | '2nd' | 'Mid-Term';
  isActive: boolean;
  dropDeadline?: string;
  maxUnits?: number;
  enrollmentSchedule?: { slots: EnrollmentSlot[] };
  finalizeWindowStart?: string;  // ISO datetime: when finalize button appears
  finalizeWindowEnd?: string;    // ISO datetime: when finalize button disappears
  enlistmentFrom?: string;       // ISO datetime: enlistment window opens
  enlistmentUntil?: string;      // ISO datetime: enlistment window closes
  enrollmentFrom?: string;       // ISO datetime: enrollment window opens
  enrollmentUntil?: string;      // ISO datetime: enrollment window closes
  evaluationFrom?: string;       // ISO datetime: FIC evaluation window opens
  evaluationUntil?: string;      // ISO datetime: FIC evaluation window closes
  encodingFrom?: string;         // ISO datetime: grade submission opens
  encodingUntil?: string;        // ISO datetime: grade submission closes
  prerogativeFrom?: string;      // ISO datetime: prerogative window opens
  prerogativeUntil?: string;     // ISO datetime: prerogative window closes
  unfinalizedDeadline?: string;  // ISO datetime: auto-drop deadline for non-finalized students
  consentWindows?: Record<string, { from?: string; until?: string }>; // per consent type
  controls: {
    enlistmentOpen: boolean;
    enrollmentOpen: boolean;
    ficEvalOpen: boolean;
    gradeSubmissionOpen: boolean;
    prerogativeOpen: boolean;
  };
}

export interface FinalizedEnlistment {
  studentId: string;
  termId: string;
  finalizedAt: string;
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
  requiresCOI?: boolean;
  requiresDeptConsent?: boolean;
  requiresOCSConsent?: boolean;
  minUnitsRequired?: number; // minimum total units a student must have before enlisting (ignored for PE/NSTP)
  minYearStanding?: 'Freshman' | 'Sophomore' | 'Junior' | 'Senior'; // minimum year classification required (ignored for PE/NSTP)
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
  prerogativeAccepting?: boolean; // FIC toggle — defaults to true if undefined
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

export const OCS_CONSENT_TYPES = [
  'Waiver of Pre-requisite',
  'Substitution of Pre-requisite',
  'Satisfaction of Pre-requisite',
  'OCS Controlled Class',
] as const;

export type OCSConsentType = typeof OCS_CONSENT_TYPES[number];

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
  ocsConsentType?: OCSConsentType;
  ocsAttachmentName?: string;
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
  comment?: string;
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

export interface PortalSettings {
  portalName: string;       // e.g. "University AIS"
  portalTagline: string;    // e.g. "Academic Information System"
  institutionName: string;  // e.g. "University"
}

export interface Room {
  id: string;
  name: string;
  capacity?: number;
  collegeId: string;
  building?: string;
}

export type UnfinalizedRequestStatus = 'pending' | 'approved' | 'denied';
export interface UnfinalizedRequest {
  id: string;
  studentId: string;
  termId: string;
  reason: string;
  status: UnfinalizedRequestStatus;
  requestedAt: string;
  processedAt?: string;
  processedBy?: string;
  response?: string;
}

export type ReconsiderationRequestStatus = 'pending' | 'approved' | 'denied';
export type ReconsiderationRequestType = 'pd_reconsideration' | 'late_enlistment';
export interface ReconsiderationRequest {
  id: string;
  studentId: string;
  termId: string; // the active term when the request was submitted
  reason: string;
  requestType: ReconsiderationRequestType;
  status: ReconsiderationRequestStatus;
  requestedAt: string;
  processedAt?: string;
  processedBy?: string;
  response?: string;
}

export interface College {
  id: string;
  name: string;
  abbreviation: string;
}

export interface Department {
  id: string;
  name: string;
  abbreviation: string;
  collegeId: string;
}

export interface DegreeProgram {
  id: string;
  name: string;
  abbreviation: string;
  departmentId: string;
  totalUnits?: number; // total academic units required to graduate (used for year classification)
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
  finalizedEnlistments: FinalizedEnlistment[];
  currentUser: User | null;
  portalSettings: PortalSettings;
  colleges: College[];
  departments: Department[];
  degreePrograms: DegreeProgram[];
  rooms: Room[];
  unfinalizedRequests: UnfinalizedRequest[];
  reconsiderationRequests: ReconsiderationRequest[];
}
