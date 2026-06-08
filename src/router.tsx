import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import { Navigate } from "react-router-dom";
import UserGuide from "./pages/shared/UserGuide";
import { ProtectedRoute } from "./components/shared/ProtectedRoute";

// Admin
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminTermControl from "./pages/admin/AdminTermControl";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminReportCard from "./pages/admin/AdminReportCard";
import AdminPortalSettings from "./pages/admin/AdminPortalSettings";
import AdminAcademicUnits from "./pages/admin/AdminAcademicUnits";
import AdminRooms from "./pages/admin/AdminRooms";
import AdminDashboardContent from "./pages/admin/AdminDashboardContent";
import AdminPasswordTickets from "./pages/admin/AdminPasswordTickets";
import AdminGraduationSettings from "./pages/admin/AdminGraduationSettings";

// OCS
import OCSDashboard from "./pages/ocs/OCSDashboard";
import OCSCourses from "./pages/ocs/OCSCourses";
import OCSSections from "./pages/ocs/OCSSections";
import OCSConsents from "./pages/ocs/OCSConsents";
import OCSStudents from "./pages/ocs/OCSStudents";
import OCSReconsideration from "./pages/ocs/OCSReconsideration";
import OCSChangeDrop from "./pages/ocs/OCSChangeDrop";
import OCSCourseOverview from "./pages/ocs/OCSCourseOverview";
import OCSGradeManagement from "./pages/ocs/OCSGradeManagement";
import OCSPlanOfStudy from "./pages/ocs/OCSPlanOfStudy";
import OCSGraduationApplications from "./pages/ocs/OCSGraduationApplications";
import OCSSpecialization from "./pages/ocs/OCSSpecialization";
import OCSGeElective from "./pages/ocs/OCSGeElective";
import OCSUnderload from "./pages/ocs/OCSUnderload";

// Faculty
import FacultyDashboard from "./pages/faculty/FacultyDashboard";
import FacultyClasses from "./pages/faculty/FacultyClasses";
import FacultyTimetable from "./pages/faculty/FacultyTimetable";
import FacultyGradeEncoding from "./pages/faculty/FacultyGradeEncoding";
import FacultyEvaluations from "./pages/faculty/FacultyEvaluations";
import FacultyPrerogatives from "./pages/faculty/FacultyPrerogatives";
import FacultyConsents from "./pages/faculty/FacultyConsents";
import FacultyRemovalGrades from "./pages/faculty/FacultyRemovalGrades";

// Department Head
import DeptHeadDashboard from "./pages/depthead/DeptHeadDashboard";
import DeptHeadConsents from "./pages/depthead/DeptHeadConsents";
import DeptHeadCourses from "./pages/depthead/DeptHeadCourses";
import DeptHeadSections from "./pages/depthead/DeptHeadSections";

// Student
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentEnlistment from "./pages/student/StudentEnlistment";
import StudentConsent from "./pages/student/StudentConsent";
import StudentGrades from "./pages/student/StudentGrades";
import StudentEvaluation from "./pages/student/StudentEvaluation";
import StudentProfile from "./pages/student/StudentProfile";
import StudentPrerogatives from "./pages/student/StudentPrerogatives";
import StudentPlanOfStudy from "./pages/student/StudentPlanOfStudy";
import StudentSpecialization from "./pages/student/StudentSpecialization";
import StudentGeElective from "./pages/student/StudentGeElective";

function p(element: JSX.Element) {
  return <ProtectedRoute>{element}</ProtectedRoute>;
}

export const routers = [
  { path: "/", name: "home", element: <Login /> },
  { path: "/login", name: "login", element: <Login /> },

  // Old role-specific login paths → redirect to unified login
  { path: "/admin", name: "admin-login", element: <Navigate to="/login" replace /> },
  { path: "/ocs", name: "ocs-login", element: <Navigate to="/login" replace /> },
  { path: "/faculty", name: "faculty-login", element: <Navigate to="/login" replace /> },
  { path: "/student", name: "student-login", element: <Navigate to="/login" replace /> },

  // Admin
  { path: "/admin/dashboard", name: "admin-dashboard", element: p(<AdminDashboard />) },
  { path: "/admin/terms", name: "admin-terms", element: p(<AdminTermControl />) },
  { path: "/admin/users", name: "admin-users", element: p(<AdminUsers />) },
  { path: "/admin/reportcard", name: "admin-reportcard", element: p(<AdminReportCard />) },
  { path: "/admin/portal-settings", name: "admin-portal-settings", element: p(<AdminPortalSettings />) },
  { path: "/admin/academic-units", name: "admin-academic-units", element: p(<AdminAcademicUnits />) },
  { path: "/admin/rooms", name: "admin-rooms", element: p(<AdminRooms />) },
  { path: "/admin/dashboard-content", name: "admin-dashboard-content", element: p(<AdminDashboardContent />) },
  { path: "/admin/password-tickets", name: "admin-password-tickets", element: p(<AdminPasswordTickets />) },
  { path: "/admin/graduation-settings", name: "admin-graduation-settings", element: p(<AdminGraduationSettings />) },

  // OCS
  { path: "/ocs/dashboard", name: "ocs-dashboard", element: p(<OCSDashboard />) },
  { path: "/ocs/course-overview", name: "ocs-course-overview", element: p(<OCSCourseOverview />) },
  { path: "/ocs/courses", name: "ocs-courses", element: p(<OCSCourses />) },
  { path: "/ocs/sections", name: "ocs-sections", element: p(<OCSSections />) },
  { path: "/ocs/consents", name: "ocs-consents", element: p(<OCSConsents />) },
  { path: "/ocs/students", name: "ocs-students", element: p(<OCSStudents />) },
  { path: "/ocs/reconsideration", name: "ocs-reconsideration", element: p(<OCSReconsideration />) },
  { path: "/ocs/change-drop", name: "ocs-change-drop", element: p(<OCSChangeDrop />) },
  { path: "/ocs/grade-management", name: "ocs-grade-management", element: p(<OCSGradeManagement />) },
  { path: "/ocs/plan-of-study", name: "ocs-plan-of-study", element: p(<OCSPlanOfStudy />) },
  { path: "/ocs/graduation-applications", name: "ocs-graduation-applications", element: p(<OCSGraduationApplications />) },
  { path: "/ocs/specialization", name: "ocs-specialization", element: p(<OCSSpecialization />) },
  { path: "/ocs/ge-elective", name: "ocs-ge-elective", element: p(<OCSGeElective />) },
  { path: "/ocs/underload", name: "ocs-underload", element: p(<OCSUnderload />) },

  // Faculty
  { path: "/faculty/dashboard", name: "faculty-dashboard", element: p(<FacultyDashboard />) },
  { path: "/faculty/classes", name: "faculty-classes", element: p(<FacultyClasses />) },
  { path: "/faculty/timetable", name: "faculty-timetable", element: p(<FacultyTimetable />) },
  { path: "/faculty/grades", name: "faculty-grades", element: p(<FacultyGradeEncoding />) },
  { path: "/faculty/prerogatives", name: "faculty-prerogatives", element: p(<FacultyPrerogatives />) },
  { path: "/faculty/consents", name: "faculty-consents", element: p(<FacultyConsents />) },
  { path: "/faculty/evaluations", name: "faculty-evaluations", element: p(<FacultyEvaluations />) },
  { path: "/faculty/removal-grades", name: "faculty-removal-grades", element: p(<FacultyRemovalGrades />) },

  // Department Head
  { path: "/depthead/dashboard", name: "depthead-dashboard", element: p(<DeptHeadDashboard />) },
  { path: "/depthead/consents", name: "depthead-consents", element: p(<DeptHeadConsents />) },
  { path: "/depthead/courses", name: "depthead-courses", element: p(<DeptHeadCourses />) },
  { path: "/depthead/sections", name: "depthead-sections", element: p(<DeptHeadSections />) },

  // Student
  { path: "/student/dashboard", name: "student-dashboard", element: p(<StudentDashboard />) },
  { path: "/student/enlistment", name: "student-enlistment", element: p(<StudentEnlistment />) },
  { path: "/student/consent", name: "student-consent", element: p(<StudentConsent />) },
  { path: "/student/grades", name: "student-grades", element: p(<StudentGrades />) },
  { path: "/student/evaluation", name: "student-evaluation", element: p(<StudentEvaluation />) },
  { path: "/student/profile", name: "student-profile", element: p(<StudentProfile />) },
  { path: "/student/prerogatives", name: "student-prerogatives", element: p(<StudentPrerogatives />) },
  { path: "/student/plan-of-study", name: "student-plan-of-study", element: p(<StudentPlanOfStudy />) },
  { path: "/student/specialization", name: "student-specialization", element: p(<StudentSpecialization />) },
  { path: "/student/ge-elective", name: "student-ge-elective", element: p(<StudentGeElective />) },

  /* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */
  { path: "/guide", name: "user-guide", element: <UserGuide /> },
  { path: "*", name: "404", element: <NotFound /> },
];

declare global {
  interface Window {
    __routers__: typeof routers;
  }
}

window.__routers__ = routers;
