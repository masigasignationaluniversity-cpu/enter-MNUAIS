import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

// Admin
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminTermControl from "./pages/admin/AdminTermControl";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminReportCard from "./pages/admin/AdminReportCard";
import AdminPortalSettings from "./pages/admin/AdminPortalSettings";
import AdminAcademicUnits from "./pages/admin/AdminAcademicUnits";
import AdminRooms from "./pages/admin/AdminRooms";

// OCS
import OCSLogin from "./pages/ocs/OCSLogin";
import OCSDashboard from "./pages/ocs/OCSDashboard";
import OCSCourses from "./pages/ocs/OCSCourses";
import OCSSections from "./pages/ocs/OCSSections";
import OCSConsents from "./pages/ocs/OCSConsents";
import OCSUnfinalize from "./pages/ocs/OCSUnfinalize";
import OCSStudents from "./pages/ocs/OCSStudents";
import OCSReconsideration from "./pages/ocs/OCSReconsideration";

// Faculty
import FacultyLogin from "./pages/faculty/FacultyLogin";
import FacultyDashboard from "./pages/faculty/FacultyDashboard";
import FacultyClasses from "./pages/faculty/FacultyClasses";
import FacultyTimetable from "./pages/faculty/FacultyTimetable";
import FacultyGradeEncoding from "./pages/faculty/FacultyGradeEncoding";
import FacultyEvaluations from "./pages/faculty/FacultyEvaluations";
import FacultyPrerogatives from "./pages/faculty/FacultyPrerogatives";
import FacultyConsents from "./pages/faculty/FacultyConsents";

// Student
import StudentLogin from "./pages/student/StudentLogin";
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentEnlistment from "./pages/student/StudentEnlistment";
import StudentConsent from "./pages/student/StudentConsent";
import StudentGrades from "./pages/student/StudentGrades";
import StudentEvaluation from "./pages/student/StudentEvaluation";
import StudentProfile from "./pages/student/StudentProfile";

export const routers = [
  { path: "/", name: "home", element: <Index /> },
  { path: "/login", name: "login", element: <Login /> },

  // Admin
  { path: "/admin", name: "admin-login", element: <AdminLogin /> },
  { path: "/admin/dashboard", name: "admin-dashboard", element: <AdminDashboard /> },
  { path: "/admin/terms", name: "admin-terms", element: <AdminTermControl /> },
  { path: "/admin/users", name: "admin-users", element: <AdminUsers /> },
  { path: "/admin/reportcard", name: "admin-reportcard", element: <AdminReportCard /> },
  { path: "/admin/portal-settings", name: "admin-portal-settings", element: <AdminPortalSettings /> },
  { path: "/admin/academic-units", name: "admin-academic-units", element: <AdminAcademicUnits /> },
  { path: "/admin/rooms", name: "admin-rooms", element: <AdminRooms /> },

  // OCS
  { path: "/ocs", name: "ocs-login", element: <OCSLogin /> },
  { path: "/ocs/dashboard", name: "ocs-dashboard", element: <OCSDashboard /> },
  { path: "/ocs/courses", name: "ocs-courses", element: <OCSCourses /> },
  { path: "/ocs/sections", name: "ocs-sections", element: <OCSSections /> },
  { path: "/ocs/consents", name: "ocs-consents", element: <OCSConsents /> },
  { path: "/ocs/unfinalize", name: "ocs-unfinalize", element: <OCSUnfinalize /> },
  { path: "/ocs/students", name: "ocs-students", element: <OCSStudents /> },
  { path: "/ocs/reconsideration", name: "ocs-reconsideration", element: <OCSReconsideration /> },

  // Faculty
  { path: "/faculty", name: "faculty-login", element: <FacultyLogin /> },
  { path: "/faculty/dashboard", name: "faculty-dashboard", element: <FacultyDashboard /> },
  { path: "/faculty/classes", name: "faculty-classes", element: <FacultyClasses /> },
  { path: "/faculty/timetable", name: "faculty-timetable", element: <FacultyTimetable /> },
  { path: "/faculty/grades", name: "faculty-grades", element: <FacultyGradeEncoding /> },
  { path: "/faculty/prerogatives", name: "faculty-prerogatives", element: <FacultyPrerogatives /> },
  { path: "/faculty/consents", name: "faculty-consents", element: <FacultyConsents /> },
  { path: "/faculty/evaluations", name: "faculty-evaluations", element: <FacultyEvaluations /> },

  // Student
  { path: "/student", name: "student-login", element: <StudentLogin /> },
  { path: "/student/dashboard", name: "student-dashboard", element: <StudentDashboard /> },
  { path: "/student/enlistment", name: "student-enlistment", element: <StudentEnlistment /> },
  { path: "/student/consent", name: "student-consent", element: <StudentConsent /> },
  { path: "/student/grades", name: "student-grades", element: <StudentGrades /> },
  { path: "/student/evaluation", name: "student-evaluation", element: <StudentEvaluation /> },
  { path: "/student/profile", name: "student-profile", element: <StudentProfile /> },

  /* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */
  { path: "*", name: "404", element: <NotFound /> },
];

declare global {
  interface Window {
    __routers__: typeof routers;
  }
}

window.__routers__ = routers;
