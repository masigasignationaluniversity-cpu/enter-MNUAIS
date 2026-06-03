import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { GraduationCap, Eye, EyeOff, AlertCircle } from 'lucide-react';

const REMEMBER_KEY = 'ais_remembered_username';
const REMEMBER_PASS_KEY = 'ais_remembered_password';

const roleRedirects: Record<string, string> = {
  admin: '/admin/dashboard',
  ocs: '/ocs/dashboard',
  faculty: '/faculty/dashboard',
  student: '/student/dashboard',
  department_head: '/depthead/dashboard',
};

// Minimal Google "G" SVG logo
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

export default function Login() {
  const { login, loginWithGoogle, state } = useApp();
  const navigate = useNavigate();
  const ps = state.portalSettings;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (state.currentUser) {
      navigate(roleRedirects[state.currentUser.role] ?? '/');
    }
  }, [state.currentUser, navigate]);

  // Prefill remembered username + password on mount + check for forced logout / SSO errors
  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    const savedPass = localStorage.getItem(REMEMBER_PASS_KEY);
    if (saved) {
      setUsername(saved);
      setRemember(true);
      if (savedPass) setPassword(savedPass);
    }
    const reason = localStorage.getItem('ais_logout_reason');
    if (reason === 'session_expired') {
      setError('Your session was ended because your account was signed in from another device. Please sign in again.');
      localStorage.removeItem('ais_logout_reason');
    } else if (reason === 'idle_timeout') {
      setError('You were automatically signed out due to inactivity. Please sign in again.');
      localStorage.removeItem('ais_logout_reason');
    }
    // Check for SSO error from Google OAuth callback
    const ssoErr = sessionStorage.getItem('sso_error');
    if (ssoErr) {
      setError(ssoErr);
      sessionStorage.removeItem('sso_error');
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
        localStorage.setItem(REMEMBER_PASS_KEY, password);
      } else {
        localStorage.removeItem(REMEMBER_KEY);
        localStorage.removeItem(REMEMBER_PASS_KEY);
      }
      const path = roleRedirects[user.role] ?? '/';
      navigate(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      // Page will redirect to Google; loading spinner stays visible until redirect
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in unavailable. Ensure Google OAuth is configured.');
      setGoogleLoading(false);
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
          <div className="flex flex-col justify-center h-full gap-5">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-foreground">Welcome</h2>
              <p className="text-muted-foreground text-sm mt-1">Sign in with your account to continue</p>
            </div>

            {/* Google SSO button */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-10 gap-2.5 border-border text-foreground font-medium"
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading}
            >
              {googleLoading ? (
                <span className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              {googleLoading ? 'Redirecting to Google…' : 'Sign in with Google'}
            </Button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground font-medium">or sign in with credentials</span>
              <div className="flex-1 h-px bg-border" />
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
                <div className="flex items-start gap-2 text-destructive text-sm bg-destructive/10 rounded-lg px-3 py-2">
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold mt-1"
                disabled={loading || googleLoading}
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
