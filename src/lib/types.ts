export type Role = 'admin' | 'ocs' | 'faculty' | 'student' | 'department_head';

export interface PasswordResetTicket {
  id: string;
  username: string;
  name: string;
  status: 'pending' | 'approved';
  ticketNumber?: string;
  newPassword?: string;
  createdAt: string;
  resolvedAt?: string;
}

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
  day: number;          // 1–4 within the phase
  phase: 1 | 2 | 3;    // 1 = Pre-registration, 2 = General Registration, 3 = Change of Matriculation
  date: string;         // ISO date 'YYYY-MM-DD'
  idPrefixes: string[]; // empty array = all students eligible (Day 4)
  startTime?: string;   // HH:MM — enlistment opens at this time (optional; null = all day)
  endTime?: string;     // HH:MM — enlistment closes at this time (optional; null = all day)
}

export interface TermFeeSchedule {
  tuitionPerUnit: number;       // Tuition per academic unit
  nstpTuition: number;
  admissionFees: number;
  entranceFees: number;
  registrationFees: number;
  libraryFees: number;
  labFeePerUnit: number;        // Lab fee per lab-unit (applied to course.labUnits)
  computerFees: number;
  athleticFees: number;
  culturalFees: number;
  medicalDentalFees: number;
  guidanceFees: number;
  handbookFees: number;
  schoolIdFees: number;
  developmentFees: number;
  edf: number;
  changeOfMatriculation: number;
  depositFee: number;
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
  lateEnrollmentFrom?: string;   // ISO datetime: when Late Enrollment banner/appeal opens
  lateEnrollmentUntil?: string;  // ISO datetime: when Late Enrollment appeal closes
  changeDropFrom?: string;       // ISO datetime: Change/Drop after finalization window opens
  changeDropUntil?: string;      // ISO datetime: Change/Drop appeal deadline
  requestDeadline?: string;      // ISO datetime: after this date OCS cannot approve/deny any student requests
  specializationFrom?: string;         // ISO datetime: specialization application window opens
  specializationUntil?: string;        // ISO datetime: specialization application window closes
  specializationChangeUntil?: string;  // ISO datetime: last day students can request specialization change
  specializationApprovalUntil?: string; // ISO datetime: last day OCS can approve/deny specialization requests
  geElectiveFrom?: string;             // ISO datetime: GE elective application window opens
  geElectiveUntil?: string;            // ISO datetime: GE elective application window closes
  geElectiveChangeUntil?: string;      // ISO datetime: last day students can request GE elective change
  geElectiveApprovalUntil?: string;    // ISO datetime: last day OCS can approve/deny GE elective requests
  underloadFrom?: string;              // ISO datetime: underload application window opens (after enlistment)
  underloadUntil?: string;             // ISO datetime: underload application window closes
  underloadApprovalUntil?: string;     // ISO datetime: last day OCS can approve/deny underload applications
  graduationFrom?: string;             // ISO datetime: graduation application window opens
  graduationUntil?: string;            // ISO datetime: graduation application window closes
  consentWindows?: Record<string, { from?: string; until?: string }>; // per consent type
  studentMaxUnitsOverrides?: Record<string, number>; // studentId → custom max units (overrides term default)
  feeSchedule?: TermFeeSchedule; // Admin-configured fee amounts for this term
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

export type CourseType = 'Lec' | 'Lab' | 'Recitation' | 'Lec+Lab' | 'Lec+Rec' | 'Thesis' | 'Thesis 1' | 'Thesis 2' | 'Internship' | 'Seminar';

export type CourseCategory = 'GE' | 'Elective GE' | 'HK/PE/NSTP' | 'Major' | 'Specialized' | 'Thesis' | 'Seminar';

export interface Course {
  id: string;
  code: string;
  title: string;
  units: number;
  labUnits?: number;
  type: CourseType;
  category?: CourseCategory;
  department: string;
  isPE: boolean;
  isNSTP: boolean;
  /**
   * Prerequisite groups — OR between groups, AND within each group.
   * e.g. [["A"], ["B","C"]] means "A  OR  (B AND C)"
   * Backward compat: a flat string[] is treated as a single group.
   */
  prerequisites?: string[][];
  corequisites?: string[][];
  requiresCOI?: boolean;
  requiresDeptConsent?: boolean;
  requiresOCSConsent?: boolean;
  // Conditional consents — required ONLY when prerequisites are not satisfied
  coiIfUnsatisfied?: boolean;
  deptConsentIfUnsatisfied?: boolean;
  ocsConsentIfUnsatisfied?: boolean;
  minUnitsRequired?: number;
  minYearStanding?: 'Freshman' | 'Sophomore' | 'Junior' | 'Senior';
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
  facultyHidden?: boolean;   // when true, students see "TBA" instead of faculty name
  slots: number;
  enrolled: number;
  schedule: Schedule;
  labSchedule?: Schedule;
  prerogativeAccepting?: boolean;
  /** Links lab/recitation child sections back to their parent lecture section */
  parentSectionId?: string;
  /** 'lecture' = parent; 'lab' | 'recitation' = child; undefined = legacy single-section */
  sectionType?: 'lecture' | 'lab' | 'recitation';
  /** When true, this is a phantom section created by OCS for manual grade entry only.
   *  It is hidden from enlistment, has no faculty, and its sectionCode is '__MANUAL__'. */
  isManualGrade?: boolean;
}

export type GradeValue = '1.0' | '1.25' | '1.5' | '1.75' | '2.0' | '2.25' | '2.5' | '2.75' | '3.0' | '4' | '5' | 'INC' | 'DRP' | 'P' | 'F' | 'S' | 'U';

export interface Grade {
  id: string;
  studentId: string;
  sectionId: string;
  termId: string;
  grade: GradeValue | null;
  removalGrade?: GradeValue | null;
  removalSubmitted?: boolean;
  removalPostedAt?: string;
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
  ocsAttachmentDataUrl?: string;
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
  logoUrl?: string;         // URL for the institution logo shown on login page
  welcomeTitle?: string;    // Headline shown on portal dashboards
  welcomeMessage?: string;  // Paragraph shown below greeting on dashboards
  announcements?: string;   // Rich HTML content rendered in announcements panel
  showEnrollmentFormPdf?: boolean; // Admin toggle: show "Download Enrollment Form" button on finalized banner
}

export interface Room {
  id: string;
  name: string;
  capacity?: number;
  collegeId: string;
  building?: string;
}

export interface GraduationRequirements {
  collegeId: string;
  /** When set, these requirements apply to a specific degree program only */
  programId?: string;
  requiredGeCourseIds: string[];
  requiredHkPeNstpCourseIds: string[];
  requiredElectiveGeCourseIds: string[];
  maxElectiveGe: number;
  requiredMajorCourseIds: string[];
  maxMajor: number;
  requiredSpecializedCourseIds: string[];
  maxSpecialized: number;
  requiredThesisCourseIds: string[];
  maxThesis: number;
  requiredSeminarCourseIds: string[];
  maxSeminar: number;
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

export type ChangeDropRequestStatus = 'pending' | 'approved' | 'denied';
export interface ChangeDropRequest {
  id: string;
  studentId: string;
  termId: string;
  reason: string;
  status: ChangeDropRequestStatus;
  requestedAt: string;
  processedAt?: string;
  processedBy?: string;
  response?: string;
  addSections?: string[];    // section IDs to enroll (change/add)
  dropSections?: string[];   // section IDs to drop
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
  /** Direct link to college (replaced departmentId) */
  collegeId: string;
  /** @deprecated use collegeId — kept for backward-compat migration of old data */
  departmentId?: string;
  totalUnits?: number; // total academic units required to graduate (used for year classification)
  degreeType?: 'bachelors' | 'masters' | 'doctorate' | 'associate_certificate';
}

export type SpecializationRequestStatus = 'pending' | 'approved' | 'denied';

export interface SpecializationRequest {
  id: string;
  studentId: string;
  courseIds: string[];
  totalUnits: number;
  status: SpecializationRequestStatus;
  requestedAt: string;
  termId?: string;
  processedAt?: string;
  processedBy?: string;
  response?: string;
  isChangeRequest?: boolean;
  previousRequestId?: string;
}

export type GeElectiveRequestStatus = 'pending' | 'approved' | 'denied';

export interface GeElectiveRequest {
  id: string;
  studentId: string;
  courseIds: string[];
  totalUnits: number;
  status: GeElectiveRequestStatus;
  requestedAt: string;
  termId?: string;
  processedAt?: string;
  processedBy?: string;
  response?: string;
  isChangeRequest?: boolean;
  previousRequestId?: string;
}

export type GraduationApplicationStatus = 'pending' | 'approved' | 'denied';

export interface GraduationApplication {
  id: string;
  studentId: string;
  collegeId: string;
  programId?: string;
  termId?: string;
  status: GraduationApplicationStatus;
  submittedAt: string;
  processedAt?: string;
  processedBy?: string;
  response?: string;
}

export type UnderloadApplicationStatus = 'pending' | 'approved' | 'denied';
export interface UnderloadApplication {
  id: string;
  studentId: string;
  termId: string;
  reason: string;
  status: UnderloadApplicationStatus;
  requestedAt: string;
  processedAt?: string;
  processedBy?: string;
  response?: string;
}

export type EnrollmentPaymentStatus = 'unpaid' | 'paid' | 'free_tuition';
export interface EnrollmentPayment {
  id: string;
  studentId: string;
  termId: string;
  status: EnrollmentPaymentStatus;
  freeTuition: boolean;        // RA 10931 — Universal Access to Quality Tertiary Education Act
  otherFeesSubsidy: boolean;   // Other school fees also covered by subsidy
  stCode?: string;             // Scholarship/discount code: '33' | '60' | '80' | '100'
  amountPaid: number;
  orNumber?: string;           // OR number of the most recent payment transaction
  notes?: string;
  processedBy?: string;
  processedAt?: string;
  createdAt: string;
}

export interface PaymentTransaction {
  id: string;
  studentId: string;
  termId: string;
  orNumber: string;
  amount: number;
  notes?: string;
  processedBy?: string;
  processedAt: string;
  createdAt: string;
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
  changeDropRequests: ChangeDropRequest[];
  graduationRequirements: GraduationRequirements[];
  graduationApplications: GraduationApplication[];
  specializationRequests: SpecializationRequest[];
  geElectiveRequests: GeElectiveRequest[];
  underloadApplications: UnderloadApplication[];
  enrollmentPayments: EnrollmentPayment[];
  paymentTransactions: PaymentTransaction[];
}
