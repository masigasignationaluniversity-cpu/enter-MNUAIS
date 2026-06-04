import type { AppState } from './types';

export const EVAL_QUESTIONS = [
  { id: 'q1', text: 'Explains the objectives, expectations & various requirements of the course' },
  { id: 'q2', text: 'Encourages students to think critically and/or creatively' },
  { id: 'q3', text: 'Communicates clearly' },
  { id: 'q4', text: 'Answers students questions clearly & adequately' },
  { id: 'q5', text: 'Is able to help students understand complex ideas related to the subject matter' },
  { id: 'q6', text: 'Uses engaging and helpful learning exercises/activities' },
  { id: 'q7', text: 'Relates the subject matter to issues and developments in the discipline and/or real-life concerns' },
  { id: 'q8', text: 'Encourages students to participate in discussions/activites' },
  { id: 'q9', text: 'Makes himself/herself available for consultation' },
  { id: 'q10', text: 'Encourages students to express their ideas & viewpoints' },
  { id: 'q11', text: 'Communicates/interacts with students in a positive way' },
  { id: 'q12', text: 'Shows respect for student diversity & individual differences' },
  { id: 'q13', text: 'Makes full use of the required hours for learning' },
  { id: 'q14', text: 'Provides fair & timely feedback on student performance' },
  { id: 'q15', text: 'Uses clear criteria to evaluate student performance' },
];

// All data (users, courses, sections, etc.) comes exclusively from the database.
// The initialState is intentionally empty — no mock data — to ensure the admin
// portal is always the single source of truth and deletions are reflected everywhere.
export const initialState: AppState = {
  users: [],
  terms: [],
  courses: [],
  sections: [],
  grades: [],
  consents: [],
  enrollments: [],
  evaluations: [],
  prerogatives: [],
  finalizedEnlistments: [],
  currentUser: null,
  changeDropRequests: [],
  reconsiderationRequests: [],
  unfinalizedRequests: [],
  rooms: [],
  colleges: [],
  departments: [],
  degreePrograms: [],
  graduationRequirements: [],
  graduationApplications: [],
  portalSettings: {
    portalName: 'University AIS',
    portalTagline: 'Academic Information System',
    institutionName: 'University',
    logoUrl: '',
  },
};
