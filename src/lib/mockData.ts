import type { AppState, User, Term, Course, Section, Grade, ConsentRecord, Enrollment, Evaluation, Prerogative } from './types';

export const EVAL_QUESTIONS = [
  { id: 'q1', text: 'The instructor presented topics clearly and in an organized manner.' },
  { id: 'q2', text: 'The instructor was available for consultation and responded to student questions.' },
  { id: 'q3', text: 'The instructor graded fairly and provided timely feedback.' },
  { id: 'q4', text: 'The instructor demonstrated mastery of the subject matter.' },
  { id: 'q5', text: 'Overall, I am satisfied with the teaching performance of this instructor.' },
];

const users: User[] = [
  { id: 'u-admin1', username: 'admin', password: 'admin123', role: 'admin', name: 'System Administrator', email: 'admin@university.edu', status: 'active' },
  { id: 'u-ocs1', username: 'ocs1', password: 'ocs123', role: 'ocs', name: 'Maria Santos', email: 'ocs1@university.edu', department: 'Office of the College Secretary', status: 'active' },
  { id: 'u-ocs2', username: 'ocs2', password: 'ocs123', role: 'ocs', name: 'Jose Reyes', email: 'ocs2@university.edu', department: 'Office of the College Secretary', status: 'active' },
  { id: 'u-fac1', username: 'faculty1', password: 'faculty123', role: 'faculty', name: 'Dr. Ricardo Cruz', email: 'rcruz@university.edu', department: 'Computer Science', employeeId: 'EMP-001', status: 'active' },
  { id: 'u-fac2', username: 'faculty2', password: 'faculty123', role: 'faculty', name: 'Prof. Elena Morales', email: 'emorales@university.edu', department: 'Mathematics', employeeId: 'EMP-002', status: 'active' },
  { id: 'u-fac3', username: 'faculty3', password: 'faculty123', role: 'faculty', name: 'Dr. Andres Lim', email: 'alim@university.edu', department: 'Computer Science', employeeId: 'EMP-003', status: 'active' },
  { id: 'u-stu1', username: 'student1', password: 'student123', role: 'student', name: 'Anna dela Cruz', email: 'adelacruz@student.edu', studentNumber: '2021-10001', yearLevel: 3, program: 'BS Computer Science', status: 'active' },
  { id: 'u-stu2', username: 'student2', password: 'student123', role: 'student', name: 'Marco Reyes', email: 'mreyes@student.edu', studentNumber: '2021-10002', yearLevel: 3, program: 'BS Computer Science', status: 'active' },
  { id: 'u-stu3', username: 'student3', password: 'student123', role: 'student', name: 'Sofia Tan', email: 'stan@student.edu', studentNumber: '2022-10001', yearLevel: 2, program: 'BS Computer Science', status: 'active' },
  { id: 'u-stu4', username: 'student4', password: 'student123', role: 'student', name: 'Luis Garcia', email: 'lgarcia@student.edu', studentNumber: '2022-10002', yearLevel: 2, program: 'BS Computer Science', status: 'active' },
  { id: 'u-stu5', username: 'student5', password: 'student123', role: 'student', name: 'Bianca Torres', email: 'btorres@student.edu', studentNumber: '2023-10001', yearLevel: 1, program: 'BS Computer Science', status: 'active' },
  { id: 'u-stu6', username: 'student6', password: 'student123', role: 'student', name: 'Rafael Ong', email: 'rong@student.edu', studentNumber: '2023-10002', yearLevel: 1, program: 'BS Computer Science', status: 'active' },
];

const terms: Term[] = [
  {
    id: 'term-1',
    name: '1st Semester 2024-2025',
    academicYear: '2024-2025',
    semester: '1st',
    isActive: false,
    dropDeadline: '2024-09-30',
    maxUnits: 21,
    controls: { enlistmentOpen: false, enrollmentOpen: false, ficEvalOpen: false, gradeSubmissionOpen: false, prerogativeOpen: false },
  },
  {
    id: 'term-2',
    name: '2nd Semester 2024-2025',
    academicYear: '2024-2025',
    semester: '2nd',
    isActive: true,
    dropDeadline: '2025-03-15',
    maxUnits: 21,
    controls: { enlistmentOpen: true, enrollmentOpen: true, ficEvalOpen: true, gradeSubmissionOpen: true, prerogativeOpen: true },
  },
];

const courses: Course[] = [
  { id: 'c-1', code: 'CS 301', title: 'Data Structures and Algorithms', units: 3, type: 'Lec', department: 'Computer Science', isPE: false, isNSTP: false, prerequisites: ['c-11'], corequisites: [] },
  { id: 'c-2', code: 'CS 302', title: 'Operating Systems', units: 3, type: 'Lec', department: 'Computer Science', isPE: false, isNSTP: false, prerequisites: ['c-1'], corequisites: [] },
  { id: 'c-3', code: 'CS 303', title: 'Database Systems', units: 3, labUnits: 1, type: 'Lec+Lab', department: 'Computer Science', isPE: false, isNSTP: false, prerequisites: ['c-1'], corequisites: [] },
  { id: 'c-4', code: 'CS 304', title: 'Software Engineering', units: 3, type: 'Lec', department: 'Computer Science', isPE: false, isNSTP: false, prerequisites: ['c-1'], corequisites: [] },
  { id: 'c-5', code: 'MATH 201', title: 'Discrete Mathematics', units: 3, type: 'Lec', department: 'Mathematics', isPE: false, isNSTP: false, prerequisites: [], corequisites: [] },
  { id: 'c-6', code: 'MATH 202', title: 'Linear Algebra', units: 3, type: 'Lec', department: 'Mathematics', isPE: false, isNSTP: false, prerequisites: ['c-5'], corequisites: [] },
  { id: 'c-7', code: 'CS 305', title: 'Computer Networks', units: 3, type: 'Lec', department: 'Computer Science', isPE: false, isNSTP: false, prerequisites: ['c-2'], corequisites: [] },
  { id: 'c-8', code: 'CS 310', title: 'Database Lab', units: 1, type: 'Lab', department: 'Computer Science', isPE: false, isNSTP: false, prerequisites: [], corequisites: [] },
  { id: 'c-9', code: 'PE 101', title: 'Physical Education 1', units: 2, type: 'Lec', department: 'Physical Education', isPE: true, isNSTP: false, prerequisites: [], corequisites: [] },
  { id: 'c-10', code: 'NSTP 101', title: 'National Service Training Program 1', units: 3, type: 'Lec', department: 'NSTP', isPE: false, isNSTP: true, prerequisites: [], corequisites: [] },
  { id: 'c-11', code: 'CS 201', title: 'Object-Oriented Programming', units: 3, labUnits: 1, type: 'Lec+Lab', department: 'Computer Science', isPE: false, isNSTP: false, prerequisites: [], corequisites: [] },
  { id: 'c-12', code: 'CS 401', title: 'Machine Learning', units: 3, type: 'Lec', department: 'Computer Science', isPE: false, isNSTP: false, prerequisites: ['c-1', 'c-5'], corequisites: [] },
];

const sections: Section[] = [
  { id: 's-1', courseId: 'c-1', termId: 'term-2', sectionCode: 'A', facultyId: 'u-fac1', slots: 35, enrolled: 28, schedule: { days: ['M', 'W', 'F'], startTime: '07:30', endTime: '08:30', room: 'CS-101' } },
  { id: 's-2', courseId: 'c-1', termId: 'term-2', sectionCode: 'B', facultyId: 'u-fac1', slots: 35, enrolled: 35, schedule: { days: ['T', 'Th'], startTime: '09:00', endTime: '10:30', room: 'CS-101' } },
  { id: 's-3', courseId: 'c-2', termId: 'term-2', sectionCode: 'A', facultyId: 'u-fac3', slots: 40, enrolled: 35, schedule: { days: ['T', 'Th'], startTime: '07:30', endTime: '09:00', room: 'CS-201' } },
  { id: 's-4', courseId: 'c-3', termId: 'term-2', sectionCode: 'A', facultyId: 'u-fac1', slots: 30, enrolled: 25, schedule: { days: ['M', 'W', 'F'], startTime: '10:00', endTime: '11:00', room: 'CS-301' }, labSchedule: { days: ['W'], startTime: '13:00', endTime: '16:00', room: 'CS-Lab1' } },
  { id: 's-5', courseId: 'c-4', termId: 'term-2', sectionCode: 'A', facultyId: 'u-fac3', slots: 40, enrolled: 32, schedule: { days: ['M', 'W', 'F'], startTime: '09:00', endTime: '10:00', room: 'CS-401' } },
  { id: 's-6', courseId: 'c-5', termId: 'term-2', sectionCode: 'A', facultyId: 'u-fac2', slots: 45, enrolled: 40, schedule: { days: ['T', 'Th'], startTime: '10:30', endTime: '12:00', room: 'MATH-101' } },
  { id: 's-7', courseId: 'c-6', termId: 'term-2', sectionCode: 'A', facultyId: 'u-fac2', slots: 45, enrolled: 38, schedule: { days: ['M', 'W', 'F'], startTime: '13:00', endTime: '14:00', room: 'MATH-201' } },
  { id: 's-8', courseId: 'c-7', termId: 'term-2', sectionCode: 'A', facultyId: 'u-fac3', slots: 35, enrolled: 35, schedule: { days: ['T', 'Th'], startTime: '13:00', endTime: '14:30', room: 'CS-201' } },
  { id: 's-9', courseId: 'c-9', termId: 'term-2', sectionCode: 'A', facultyId: 'u-fac2', slots: 30, enrolled: 25, schedule: { days: ['F'], startTime: '15:00', endTime: '17:00', room: 'Gym' } },
  { id: 's-10', courseId: 'c-12', termId: 'term-2', sectionCode: 'A', facultyId: 'u-fac1', slots: 30, enrolled: 18, schedule: { days: ['M', 'W', 'F'], startTime: '14:30', endTime: '15:30', room: 'CS-401' } },
  { id: 's-p1', courseId: 'c-11', termId: 'term-1', sectionCode: 'A', facultyId: 'u-fac1', slots: 35, enrolled: 30, schedule: { days: ['M', 'W', 'F'], startTime: '08:00', endTime: '09:00', room: 'CS-101' }, labSchedule: { days: ['T'], startTime: '13:00', endTime: '16:00', room: 'CS-Lab1' } },
  { id: 's-p2', courseId: 'c-5', termId: 'term-1', sectionCode: 'A', facultyId: 'u-fac2', slots: 45, enrolled: 40, schedule: { days: ['T', 'Th'], startTime: '10:30', endTime: '12:00', room: 'MATH-101' } },
  { id: 's-p3', courseId: 'c-9', termId: 'term-1', sectionCode: 'A', facultyId: 'u-fac2', slots: 30, enrolled: 28, schedule: { days: ['F'], startTime: '15:00', endTime: '17:00', room: 'Gym' } },
];

const grades: Grade[] = [
  { id: 'g-1', studentId: 'u-stu1', sectionId: 's-p1', termId: 'term-1', grade: '1.5', submitted: true },
  { id: 'g-2', studentId: 'u-stu1', sectionId: 's-p2', termId: 'term-1', grade: '1.75', submitted: true },
  { id: 'g-3', studentId: 'u-stu1', sectionId: 's-p3', termId: 'term-1', grade: 'P', submitted: true },
  { id: 'g-4', studentId: 'u-stu2', sectionId: 's-p1', termId: 'term-1', grade: '2.0', submitted: true },
  { id: 'g-5', studentId: 'u-stu2', sectionId: 's-p2', termId: 'term-1', grade: '4', submitted: true },
  { id: 'g-6', studentId: 'u-stu2', sectionId: 's-p3', termId: 'term-1', grade: 'P', submitted: true },
  { id: 'g-7', studentId: 'u-stu1', sectionId: 's-1', termId: 'term-2', grade: null, submitted: false },
  { id: 'g-8', studentId: 'u-stu1', sectionId: 's-6', termId: 'term-2', grade: null, submitted: false },
  { id: 'g-9', studentId: 'u-stu1', sectionId: 's-5', termId: 'term-2', grade: null, submitted: false },
  { id: 'g-10', studentId: 'u-stu2', sectionId: 's-1', termId: 'term-2', grade: null, submitted: false },
  { id: 'g-11', studentId: 'u-stu2', sectionId: 's-3', termId: 'term-2', grade: null, submitted: false },
  { id: 'g-12', studentId: 'u-stu3', sectionId: 's-4', termId: 'term-2', grade: null, submitted: false },
  { id: 'g-13', studentId: 'u-stu3', sectionId: 's-6', termId: 'term-2', grade: null, submitted: false },
];

const enrollments: Enrollment[] = [
  { id: 'e-1', studentId: 'u-stu1', sectionId: 's-1', termId: 'term-2', status: 'enrolled', enlistedAt: '2025-01-10' },
  { id: 'e-2', studentId: 'u-stu1', sectionId: 's-6', termId: 'term-2', status: 'enrolled', enlistedAt: '2025-01-10' },
  { id: 'e-3', studentId: 'u-stu1', sectionId: 's-5', termId: 'term-2', status: 'enrolled', enlistedAt: '2025-01-10' },
  { id: 'e-4', studentId: 'u-stu1', sectionId: 's-p1', termId: 'term-1', status: 'enrolled', enlistedAt: '2024-08-01' },
  { id: 'e-5', studentId: 'u-stu1', sectionId: 's-p2', termId: 'term-1', status: 'enrolled', enlistedAt: '2024-08-01' },
  { id: 'e-6', studentId: 'u-stu1', sectionId: 's-p3', termId: 'term-1', status: 'enrolled', enlistedAt: '2024-08-01' },
  { id: 'e-7', studentId: 'u-stu2', sectionId: 's-1', termId: 'term-2', status: 'enrolled', enlistedAt: '2025-01-10' },
  { id: 'e-8', studentId: 'u-stu2', sectionId: 's-3', termId: 'term-2', status: 'enrolled', enlistedAt: '2025-01-10' },
  { id: 'e-9', studentId: 'u-stu2', sectionId: 's-p1', termId: 'term-1', status: 'enrolled', enlistedAt: '2024-08-01' },
  { id: 'e-10', studentId: 'u-stu2', sectionId: 's-p2', termId: 'term-1', status: 'enrolled', enlistedAt: '2024-08-01' },
  { id: 'e-11', studentId: 'u-stu2', sectionId: 's-p3', termId: 'term-1', status: 'enrolled', enlistedAt: '2024-08-01' },
  { id: 'e-12', studentId: 'u-stu3', sectionId: 's-4', termId: 'term-2', status: 'enrolled', enlistedAt: '2025-01-10' },
  { id: 'e-13', studentId: 'u-stu3', sectionId: 's-6', termId: 'term-2', status: 'enrolled', enlistedAt: '2025-01-10' },
];

const consents: ConsentRecord[] = [
  { id: 'con-1', studentId: 'u-stu1', sectionId: 's-1', termId: 'term-2', coiStatus: 'approved', deptConsentStatus: 'approved', ocsConsentStatus: 'approved' },
  { id: 'con-2', studentId: 'u-stu1', sectionId: 's-6', termId: 'term-2', coiStatus: 'approved', deptConsentStatus: 'approved', ocsConsentStatus: 'approved' },
  { id: 'con-3', studentId: 'u-stu1', sectionId: 's-5', termId: 'term-2', coiStatus: 'approved', deptConsentStatus: 'approved', ocsConsentStatus: 'approved' },
  { id: 'con-4', studentId: 'u-stu2', sectionId: 's-1', termId: 'term-2', coiStatus: 'approved', deptConsentStatus: 'approved', ocsConsentStatus: 'approved' },
  { id: 'con-5', studentId: 'u-stu2', sectionId: 's-3', termId: 'term-2', coiStatus: 'approved', deptConsentStatus: 'approved', ocsConsentStatus: 'approved' },
  { id: 'con-6', studentId: 'u-stu3', sectionId: 's-4', termId: 'term-2', coiStatus: 'approved', deptConsentStatus: 'pending', ocsConsentStatus: 'not_requested', deptReason: 'Need consent for late enrollment' },
  { id: 'con-7', studentId: 'u-stu3', sectionId: 's-6', termId: 'term-2', coiStatus: 'approved', deptConsentStatus: 'approved', ocsConsentStatus: 'pending', ocsReason: 'Request for additional class' },
];

const evaluations: Evaluation[] = [
  {
    id: 'ev-1', studentId: 'u-stu1', facultyId: 'u-fac1', sectionId: 's-p1', termId: 'term-1',
    responses: [
      { questionId: 'q1', rating: 5 }, { questionId: 'q2', rating: 4 }, { questionId: 'q3', rating: 5 },
      { questionId: 'q4', rating: 5 }, { questionId: 'q5', rating: 5 },
    ],
    submittedAt: '2024-11-20', overallRating: 4.8,
  },
  {
    id: 'ev-2', studentId: 'u-stu1', facultyId: 'u-fac2', sectionId: 's-p2', termId: 'term-1',
    responses: [
      { questionId: 'q1', rating: 4 }, { questionId: 'q2', rating: 4 }, { questionId: 'q3', rating: 3 },
      { questionId: 'q4', rating: 4 }, { questionId: 'q5', rating: 4 },
    ],
    submittedAt: '2024-11-20', overallRating: 3.8,
  },
  {
    id: 'ev-3', studentId: 'u-stu1', facultyId: 'u-fac2', sectionId: 's-p3', termId: 'term-1',
    responses: [
      { questionId: 'q1', rating: 3 }, { questionId: 'q2', rating: 3 }, { questionId: 'q3', rating: 4 },
      { questionId: 'q4', rating: 3 }, { questionId: 'q5', rating: 3 },
    ],
    submittedAt: '2024-11-21', overallRating: 3.2,
  },
];

const prerogatives: Prerogative[] = [
  {
    id: 'prg-1', studentId: 'u-stu4', sectionId: 's-2', termId: 'term-2',
    reason: 'The only section available for my schedule. Please allow me to enlist.',
    status: 'pending', requestedAt: '2025-01-12',
  },
  {
    id: 'prg-2', studentId: 'u-stu5', sectionId: 's-8', termId: 'term-2',
    reason: 'Need to take this subject for my program requirements.',
    status: 'pending', requestedAt: '2025-01-13',
  },
];

export const initialState: AppState = {
  users,
  terms,
  courses,
  sections,
  grades,
  consents,
  enrollments,
  evaluations,
  prerogatives,
  currentUser: null,
};
