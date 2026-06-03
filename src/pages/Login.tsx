import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { GraduationCap, Eye, EyeOff, AlertCircle, ArrowLeft } from 'lucide-react';

const roleRedirects: Record<string, string> = {
  admin: '/admin/dashboard',
  ocs: '/ocs/dashboard',
  faculty: '/faculty/dashboard',
  student: '/student/dashboard',
  department_head: '/depthead/dashboard',
};

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}

export default function Login() {
  const { loginWithEmail, lookupProfileByEmail, state } = useApp();
  const navigate = useNavigate();
  const ps = state.portalSettings;

  // step 1 = email entry, step 2 = password entry
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [foundName, setFoundName] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (state.currentUser) {
      navigate(roleRedirects[state.currentUser.role] ?? '/');
    }
  }, [state.currentUser, navigate]);

  // Check for forced logout reason on mount
  useEffect(() => {
    const reason = localStorage.getItem('ais_logout_reason');
    if (reason === 'session_expired') {
      setError('Your session was ended because your account was signed in from another device. Please sign in again.');
      localStorage.removeItem('ais_logout_reason');
    } else if (reason === 'idle_timeout') {
      setError('You were automatically signed out due to inactivity. Please sign in again.');
      localStorage.removeItem('ais_logout_reason');
    }
  }, []);

  // Auto-focus password when advancing to step 2
  useEffect(() => {
    if (step === 2) setTimeout(() => passwordRef.current?.focus(), 80);
  }, [step]);

  // ── Step 1: check email ───────────────────────────────────────
  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const profile = await lookupProfileByEmail(email);
      if (!profile) {
        setError('This email is not registered. Contact your administrator.');
        return;
      }
      setFoundName(profile.name);
      setStep(2);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: sign in ───────────────────────────────────────────
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await loginWithEmail(email, password);
      navigate(roleRedirects[user.role] ?? '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Incorrect password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep(1);
    setPassword('');
    setError('');
    setTimeout(() => emailRef.current?.focus(), 80);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: 'hsl(0 0% 93%)' }}
    >
      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Top brand strip */}
        <div
          className="flex items-center gap-3 px-8 py-5"
          style={{ background: 'var(--gradient-hero)' }}
        >
          {ps.logoUrl ? (
            <img
              src={ps.logoUrl}
              alt="Logo"
              className="w-9 h-9 rounded-full object-cover border-2 border-white/40"
              crossOrigin="anonymous"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/40">
              <GraduationCap size={18} className="text-white" />
            </div>
          )}
          <span className="text-white font-bold text-base tracking-wide">{ps.portalName}</span>
        </div>

        {/* Body */}
        <div className="px-8 py-8">

          {/* ── STEP 1 ─────────────────────────────────────────── */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-1">Sign in</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Use your {ps.institutionName || 'institutional'} account
              </p>

              <form onSubmit={handleContinue} className="space-y-4">
                <div className="relative">
                  <Input
                    ref={emailRef}
                    id="email"
                    type="email"
                    placeholder=" "
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(''); }}
                    required
                    autoFocus
                    className="peer h-14 pt-5 pb-2 px-4 text-base border-2 border-border focus:border-primary rounded-lg transition-colors"
                  />
                  <label
                    htmlFor="email"
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-base pointer-events-none transition-all peer-focus:top-3.5 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-3.5 peer-[:not(:placeholder-shown)]:text-xs"
                  >
                    Email address
                  </label>
                </div>

                {error && (
                  <div className="flex items-start gap-2 text-destructive text-sm bg-destructive/10 rounded-lg px-3 py-2.5">
                    <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    className="px-8 h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                    disabled={loading}
                  >
                    {loading ? 'Checking…' : 'Continue'}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* ── STEP 2 ─────────────────────────────────────────── */}
          {step === 2 && (
            <div>
              {/* User chip */}
              <div className="flex items-center gap-3 border border-border rounded-full px-3 py-2 w-fit mb-6 cursor-pointer hover:bg-muted/50 transition-colors" onClick={handleBack}>
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold flex-shrink-0">
                  {getInitials(foundName)}
                </div>
                <div className="leading-none">
                  <p className="text-sm font-medium text-foreground">{foundName}</p>
                  <p className="text-xs text-muted-foreground">{email}</p>
                </div>
                <ArrowLeft size={14} className="text-muted-foreground ml-1" />
              </div>

              <h2 className="text-2xl font-bold text-foreground mb-1">Welcome</h2>
              <p className="text-sm text-muted-foreground mb-6">Enter your password to continue</p>

              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="relative">
                  <Input
                    ref={passwordRef}
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    placeholder=" "
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    required
                    className="peer h-14 pt-5 pb-2 px-4 pr-12 text-base border-2 border-border focus:border-primary rounded-lg transition-colors"
                  />
                  <label
                    htmlFor="password"
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-base pointer-events-none transition-all peer-focus:top-3.5 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-3.5 peer-[:not(:placeholder-shown)]:text-xs"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPass(v => !v)}
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {error && (
                  <div className="flex items-start gap-2 text-destructive text-sm bg-destructive/10 rounded-lg px-3 py-2.5">
                    <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="text-sm text-primary font-medium hover:underline"
                  >
                    Use a different account
                  </button>
                  <Button
                    type="submit"
                    className="px-8 h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                    disabled={loading}
                  >
                    {loading ? 'Signing in…' : 'Sign In'}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-8 py-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground">{ps.institutionName}</p>
          <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()}</p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground/60 mt-4">Academic Information System</p>
    </div>
  );
}
