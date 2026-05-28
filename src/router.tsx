import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import { Navigate } from "react-router-dom";

// Admin
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminTermControl from "./pages/admin/AdminTermControl";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminReportCard from "./pages/admin/AdminReportCard";
import AdminPortalSettings from "./pages/admin/AdminPortalSettings";
import AdminAcademicUnits from "./pages/admin/AdminAcademicUnits";
import AdminRooms from "./pages/admin/AdminRooms";
import AdminDashboardContent from "./pages/admin/AdminDashboardContent";

// OCS
import OCSDashboard from "./pages/ocs/OCSDashboard";
import OCSCourses from "./pages/ocs/OCSCourses";
import OCSSections from "./pages/ocs/OCSSections";
import OCSConsents from "./pages/ocs/OCSConsents";
import OCSStudents from "./pages/ocs/OCSStudents";
import OCSReconsideration from "./pages/ocs/OCSReconsideration";
import OCSChangeDrop from "./pages/ocs/OCSChangeDrop";
import OCSCourseOverview from "./pages/ocs/OCSCourseOverview";

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

export const routers = [
  { path: "/", name: "home", element: <Login /> },
  { path: "/login", name: "login", element: <Login /> },

  // Old role-specific login paths → redirect to unified login
  { path: "/admin", name: "admin-login", element: <Navigate to="/login" replace /> },
  { path: "/ocs", name: "ocs-login", element: <Navigate to="/login" replace /> },
  { path: "/faculty", name: "faculty-login", element: <Navigate to="/login" replace /> },
  { path: "/student", name: "student-login", element: <Navigate to="/login" replace /> },

  // Admin
  { path: "/admin/dashboard", name: "admin-dashboard", element: <AdminDashboard /> },
  { path: "/admin/terms", name: "admin-terms", element: <AdminTermControl /> },
  { path: "/admin/users", name: "admin-users", element: <AdminUsers /> },
  { path: "/admin/reportcard", name: "admin-reportcard", element: <AdminReportCard /> },
  { path: "/admin/portal-settings", name: "admin-portal-settings", element: <AdminPortalSettings /> },
  { path: "/admin/academic-units", name: "admin-academic-units", element: <AdminAcademicUnits /> },
  { path: "/admin/rooms", name: "admin-rooms", element: <AdminRooms /> },
  { path: "/admin/dashboard-content", name: "admin-dashboard-content", element: <AdminDashboardContent /> },

  // OCS
  { path: "/ocs/dashboard", name: "ocs-dashboard", element: <OCSDashboard /> },
  { path: "/ocs/course-overview", name: "ocs-course-overview", element: <OCSCourseOverview /> },
  { path: "/ocs/courses", name: "ocs-courses", element: <OCSCourses /> },
  { path: "/ocs/sections", name: "ocs-sections", element: <OCSSections /> },
  { path: "/ocs/consents", name: "ocs-consents", element: <OCSConsents /> },
  { path: "/ocs/students", name: "ocs-students", element: <OCSStudents /> },
  { path: "/ocs/reconsideration", name: "ocs-reconsideration", element: <OCSReconsideration /> },
  { path: "/ocs/change-drop", name: "ocs-change-drop", element: <OCSChangeDrop /> },

  // Faculty
  { path: "/faculty/dashboard", name: "faculty-dashboard", element: <FacultyDashboard /> },
  { path: "/faculty/classes", name: "faculty-classes", element: <FacultyClasses /> },
  { path: "/faculty/timetable", name: "faculty-timetable", element: <FacultyTimetable /> },
  { path: "/faculty/grades", name: "faculty-grades", element: <FacultyGradeEncoding /> },
  { path: "/faculty/prerogatives", name: "faculty-prerogatives", element: <FacultyPrerogatives /> },
  { path: "/faculty/consents", name: "faculty-consents", element: <FacultyConsents /> },
  { path: "/faculty/evaluations", name: "faculty-evaluations", element: <FacultyEvaluations /> },
  { path: "/faculty/removal-grades", name: "faculty-removal-grades", element: <FacultyRemovalGrades /> },

  // Department Head
  { path: "/depthead/dashboard", name: "depthead-dashboard", element: <DeptHeadDashboard /> },
  { path: "/depthead/consents", name: "depthead-consents", element: <DeptHeadConsents /> },
  { path: "/depthead/courses", name: "depthead-courses", element: <DeptHeadCourses /> },
  { path: "/depthead/sections", name: "depthead-sections", element: <DeptHeadSections /> },

  // Student
  { path: "/student/dashboard", name: "student-dashboard", element: <StudentDashboard /> },
  { path: "/student/enlistment", name: "student-enlistment", element: <StudentEnlistment /> },
  { path: "/student/consent", name: "student-consent", element: <StudentConsent /> },
  { path: "/student/grades", name: "student-grades", element: <StudentGrades /> },
  { path: "/student/evaluation", name: "student-evaluation", element: <StudentEvaluation /> },
  { path: "/student/profile", name: "student-profile", element: <StudentProfile /> },
  { path: "/student/prerogatives", name: "student-prerogatives", element: <StudentPrerogatives /> },

  /* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */
  { path: "*", name: "404", element: <NotFound /> },
];

declare global {
  interface Window {
    __routers__: typeof routers;
  }
}

window.__routers__ = routers;


declare global {
  interface Window {
    __routers__: typeof routers;
  }
}

window.__routers__ = routers;
