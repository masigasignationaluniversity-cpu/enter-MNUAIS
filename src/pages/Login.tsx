import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { GraduationCap, Eye, EyeOff, AlertCircle } from 'lucide-react';

const REMEMBER_KEY = 'ais_remembered_username';

const roleRedirects: Record<string, string> = {
  admin: '/admin/dashboard',
  ocs: '/ocs/dashboard',
  faculty: '/faculty/dashboard',
  student: '/student/dashboard',
  department_head: '/depthead/dashboard',
};

export default function Login() {
  const { login, state } = useApp();
  const navigate = useNavigate();
  const ps = state.portalSettings;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Prefill remembered username on mount + check for forced logout reason
  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      setUsername(saved);
      setRemember(true);
    }
    const reason = localStorage.getItem('ais_logout_reason');
    if (reason === 'session_expired') {
      setError('Your session was ended because your account was signed in from another device. Please sign in again.');
      localStorage.removeItem('ais_logout_reason');
    } else if (reason === 'idle_timeout') {
      setError('You were automatically signed out due to inactivity. Please sign in again.');
      localStorage.removeItem('ais_logout_reason');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(username, password);
      if (remember) {
        localStorage.setItem(REMEMBER_KEY, username);
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
      const path = roleRedirects[user.role] ?? '/';
      navigate(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: 'hsl(0 0% 93%)' }}
    >
      {/* Main card */}
      <div className="w-full max-w-3xl rounded-xl overflow-hidden shadow-2xl flex flex-row min-h-[440px]">

        {/* ── LEFT PANEL ─────────────────────────────────────────── */}
        <div
          className="w-[42%] flex-shrink-0 flex flex-col items-center justify-center px-8 py-10 gap-5"
          style={{ background: 'var(--gradient-hero)' }}
        >
          {/* Logo */}
          <div className="flex-shrink-0">
            {ps.logoUrl ? (
              <img
                src={ps.logoUrl}
                alt="Institution Logo"
                className="w-28 h-28 rounded-full object-cover border-4 border-white/30 shadow-lg"
                crossOrigin="anonymous"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-white/15 border-4 border-white/30 flex items-center justify-center shadow-lg">
                <GraduationCap size={52} className="text-white/90" />
              </div>
            )}
          </div>

          {/* Portal name */}
          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-white tracking-wide leading-tight">
              {ps.portalName}
            </h1>
            {ps.portalTagline && (
              <p className="text-white/75 text-sm mt-1.5 leading-snug max-w-[200px] mx-auto font-medium">
                {ps.portalTagline}
              </p>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL ────────────────────────────────────────── */}
        <div className="flex-1 bg-white flex flex-col justify-between px-10 py-8">
          {/* Top: heading + form */}
          <div className="flex flex-col justify-center h-full gap-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-foreground">Welcome</h2>
              <p className="text-muted-foreground text-sm mt-1">Sign in with your account to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username */}
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-foreground/80">Username</Label>
                <Input
                  id="username"
                  placeholder="Enter your username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoFocus
                  required
                  className="h-10"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-foreground/80">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="h-10 pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPass(v => !v)}
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Remember password */}
              <div className="flex items-center gap-2 pt-0.5">
                <input
                  id="remember"
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  className="w-3.5 h-3.5 accent-primary cursor-pointer"
                />
                <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer font-normal">
                  Remember password
                </Label>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg px-3 py-2">
                  <AlertCircle size={14} className="flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold mt-1"
                disabled={loading}
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </Button>
            </form>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-border/50 mt-4">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} {ps.institutionName}
            </p>
            <p className="text-xs text-muted-foreground">
              {ps.portalName}
            </p>
          </div>
        </div>
      </div>

      {/* Version label */}
      <p className="text-xs text-muted-foreground/60 mt-3">Academic Information System</p>
    </div>
  );
}
