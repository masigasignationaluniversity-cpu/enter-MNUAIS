import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Admin
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminTermControl from "./pages/admin/AdminTermControl";
import AdminUsers from "./pages/admin/AdminUsers";

// OCS
import OCSLogin from "./pages/ocs/OCSLogin";
import OCSDashboard from "./pages/ocs/OCSDashboard";
import OCSCourses from "./pages/ocs/OCSCourses";
import OCSSections from "./pages/ocs/OCSSections";
import OCSConsents from "./pages/ocs/OCSConsents";

// Faculty
import FacultyLogin from "./pages/faculty/FacultyLogin";
import FacultyDashboard from "./pages/faculty/FacultyDashboard";
import FacultyClasses from "./pages/faculty/FacultyClasses";
import FacultyGradeEncoding from "./pages/faculty/FacultyGradeEncoding";
import FacultyEvaluations from "./pages/faculty/FacultyEvaluations";

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

  // Admin
  { path: "/admin", name: "admin-login", element: <AdminLogin /> },
  { path: "/admin/dashboard", name: "admin-dashboard", element: <AdminDashboard /> },
  { path: "/admin/terms", name: "admin-terms", element: <AdminTermControl /> },
  { path: "/admin/users", name: "admin-users", element: <AdminUsers /> },

  // OCS
  { path: "/ocs", name: "ocs-login", element: <OCSLogin /> },
  { path: "/ocs/dashboard", name: "ocs-dashboard", element: <OCSDashboard /> },
  { path: "/ocs/courses", name: "ocs-courses", element: <OCSCourses /> },
  { path: "/ocs/sections", name: "ocs-sections", element: <OCSSections /> },
  { path: "/ocs/consents", name: "ocs-consents", element: <OCSConsents /> },

  // Faculty
  { path: "/faculty", name: "faculty-login", element: <FacultyLogin /> },
  { path: "/faculty/dashboard", name: "faculty-dashboard", element: <FacultyDashboard /> },
  { path: "/faculty/classes", name: "faculty-classes", element: <FacultyClasses /> },
  { path: "/faculty/grades", name: "faculty-grades", element: <FacultyGradeEncoding /> },
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
