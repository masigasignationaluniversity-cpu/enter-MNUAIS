import { Navigate } from 'react-router-dom';

/**
 * Synchronous auth guard — reads ais_current_user from localStorage directly.
 *
 * Why localStorage instead of React context?
 * login() writes saveCurrentUser() synchronously BEFORE calling navigate().
 * React's setState (which updates context) is batched and may not propagate
 * until the next render cycle, AFTER the new route has already rendered.
 * Reading localStorage here bypasses that batching delay.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const hasUser = (() => {
    try {
      return !!localStorage.getItem('ais_current_user');
    } catch {
      return false;
    }
  })();

  if (!hasUser) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
