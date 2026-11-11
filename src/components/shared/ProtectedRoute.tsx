import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';

const roleRoutes = [
  { prefix: '/admin', role: 'admin' },
  { prefix: '/ocs', role: 'ocs' },
  { prefix: '/faculty', role: 'faculty' },
  { prefix: '/student', role: 'student' },
  { prefix: '/depthead', role: 'department_head' },
];

const roleHomes: Record<string, string> = {
  admin: '/admin/dashboard',
  ocs: '/ocs/dashboard',
  faculty: '/faculty/dashboard',
  student: '/student/dashboard',
  department_head: '/depthead/dashboard',
};

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { state, authReady } = useApp();
  const location = useLocation();

  if (!authReady) return null;
  if (!state.currentUser) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  const route = roleRoutes.find(({ prefix }) => location.pathname === prefix || location.pathname.startsWith(`${prefix}/`));
  if (route && route.role !== state.currentUser.role) {
    return <Navigate to={roleHomes[state.currentUser.role] ?? '/login'} replace />;
  }

  return <>{children}</>;
}
