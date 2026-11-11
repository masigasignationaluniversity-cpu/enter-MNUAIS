import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import DOMPurify from 'dompurify';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import {
  Eye, EyeOff, AlertCircle, KeyRound, CheckCircle, GraduationCap, Megaphone, Info,
  BookOpen, ClipboardCheck, Award, ShieldCheck,
} from 'lucide-react';

const REMEMBER_EMAIL_KEY = 'ais_remembered_email';
const LEGACY_PASSWORD_KEY = 'ais_remembered_password';

const roleRedirects: Record<string, string> = {
  admin: '/admin/dashboard',
  ocs: '/ocs/dashboard',
  faculty: '/faculty/dashboard',
  student: '/student/dashboard',
  department_head: '/depthead/dashboard',
};

export default function Login() {
  const { login, signUp, resetPassword, state } = useApp();
  const navigate = useNavigate();
  const ps = state.portalSettings;

  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const [aboutOpen, setAboutOpen] = useState(false);
  const [fpOpen, setFpOpen] = useState(false);
  const [fpEmail, setFpEmail] = useState('');
  const [fpError, setFpError] = useState('');
  const [fpSent, setFpSent] = useState(false);
  const [fpLoading, setFpLoading] = useState(false);

  useEffect(() => {
    if (state.currentUser) navigate(roleRedirects[state.currentUser.role] ?? '/student/dashboard');
  }, [state.currentUser, navigate]);

  useEffect(() => {
    const savedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (savedEmail) {
      setEmail(savedEmail);
      setRemember(true);
    }
    localStorage.removeItem(LEGACY_PASSWORD_KEY);

    const reason = localStorage.getItem('ais_logout_reason');
    if (reason === 'session_expired') {
      setError('Your session expired. Please sign in again.');
      localStorage.removeItem('ais_logout_reason');
    } else if (reason === 'idle_timeout') {
      setError('You were automatically signed out due to inactivity. Please sign in again.');
      localStorage.removeItem('ais_logout_reason');
    }
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();

    try {
      if (mode === 'sign-up') {
        const normalizedUsername = username.trim().toLowerCase();
        if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(normalizedUsername)) {
          throw new Error('Choose a username with 3–32 letters, numbers, dots, dashes, or underscores.');
        }
        const result = await signUp({
          email: normalizedEmail,
          password,
          username: normalizedUsername,
          displayName: displayName.trim(),
        });
        if (remember) localStorage.setItem(REMEMBER_EMAIL_KEY, normalizedEmail);
        else localStorage.removeItem(REMEMBER_EMAIL_KEY);

        if (result.confirmationRequired) {
          setNotice('If this email can be registered, a confirmation link is on its way. Confirm your email before signing in.');
          setMode('sign-in');
          setPassword('');
          return;
        }
        if (result.user) navigate(roleRedirects[result.user.role] ?? '/student/dashboard');
        return;
      }

      const user = await login(normalizedEmail, password);
      if (remember) localStorage.setItem(REMEMBER_EMAIL_KEY, normalizedEmail);
      else localStorage.removeItem(REMEMBER_EMAIL_KEY);
      navigate(roleRedirects[user.role] ?? '/student/dashboard');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openForgot = () => {
    setFpEmail(email);
    setFpError('');
    setFpSent(false);
    setFpOpen(true);
  };

  const closeFp = () => {
    setFpOpen(false);
    setFpError('');
    setFpSent(false);
  };

  const handlePasswordReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFpError('');
    setFpLoading(true);
    try {
      await resetPassword(fpEmail);
      setFpSent(true);
    } catch (resetError) {
      setFpError(resetError instanceof Error ? resetError.message : 'We could not send a reset link. Try again.');
    } finally {
      setFpLoading(false);
    }
  };

  const hasAnnouncements = ps.announcements && ps.announcements.trim().length > 0;
  const hasWelcome = ps.welcomeTitle || ps.welcomeMessage;

  return (
    <div className="flex" style={{ minHeight: '100vh' }}>

      {/* ── LEFT — White branding + form ── */}
      <div className="flex-1 flex flex-col overflow-y-auto" style={{ backgroundColor: '#ffffff' }}>
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
          <div className="w-full max-w-[340px]">

            {/* Seal / Logo */}
            <div className="flex justify-center mb-6">
              {ps.logoUrl ? (
                <img
                  src={ps.logoUrl}
                  alt={ps.institutionName}
                  className="w-32 h-32 rounded-full object-cover shadow-md"
                  style={{ border: '4px solid hsl(var(--primary) / 0.15)' }}
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="w-32 h-32 rounded-full flex items-center justify-center shadow-md"
                  style={{ background: 'var(--gradient-hero)' }}>
                  <GraduationCap size={52} className="text-white" />
                </div>
              )}
            </div>

            {/* Institution name */}
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-center mb-1"
              style={{ color: 'hsl(var(--muted-foreground))' }}>
              Welcome to the
            </p>
            <h1 className="text-3xl font-extrabold text-center mb-1 leading-tight"
              style={{ color: 'hsl(var(--primary))' }}>
              {ps.institutionName || ps.portalName}
            </h1>
            <p className="text-sm font-semibold text-center mb-8"
              style={{ color: 'hsl(var(--foreground))' }}>
              {ps.portalTagline || 'Academic Information System'}
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {mode === 'sign-up' && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="display-name" className="text-sm font-medium">Full name</Label>
                    <Input id="display-name" autoComplete="name" placeholder="Enter your name" value={displayName} onChange={event => setDisplayName(event.target.value)} required className="h-11 bg-gray-50 border-gray-200" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="username" className="text-sm font-medium">Username</Label>
                    <Input id="username" autoComplete="username" placeholder="Choose a username" value={username} onChange={event => setUsername(event.target.value)} minLength={3} maxLength={32} required className="h-11 bg-gray-50 border-gray-200" />
                  </div>
                </>
              )}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
                <Input id="email" type="email" autoComplete="email" placeholder="you@university.edu" value={email} onChange={event => setEmail(event.target.value)} autoFocus required className="h-11 bg-gray-50 border-gray-200" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPass ? 'text' : 'password'} autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'} placeholder={mode === 'sign-up' ? 'At least 8 characters' : 'Enter your password'} value={password} onChange={event => setPassword(event.target.value)} minLength={mode === 'sign-up' ? 8 : undefined} required className="h-11 pr-10 bg-gray-50 border-gray-200" />
                  <button type="button" aria-label={showPass ? 'Hide password' : 'Show password'} aria-pressed={showPass} className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'hsl(var(--muted-foreground))' }} onClick={() => setShowPass(value => !value)}>
                    {showPass ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
                  </button>
                </div>
              </div>

              {mode === 'sign-in' && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input id="remember" type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} className="size-3.5 cursor-pointer rounded" style={{ accentColor: 'hsl(var(--primary))' }} />
                    <Label htmlFor="remember" className="cursor-pointer select-none text-sm font-normal" style={{ color: 'hsl(var(--muted-foreground))' }}>Remember email</Label>
                  </div>
                  <button type="button" onClick={openForgot} className="text-sm font-medium transition-colors hover:underline" style={{ color: 'hsl(var(--primary))' }}>Forgot password?</button>
                </div>
              )}

              {mode === 'sign-up' && <p className="text-xs text-muted-foreground">New accounts start with student access. A portal administrator assigns staff roles.</p>}
              {error && <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm text-destructive" role="alert"><AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" /><span>{error}</span></div>}
              {notice && <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm text-foreground" role="status"><CheckCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" /><span>{notice}</span></div>}

              <button type="submit" disabled={loading} className="h-11 w-full rounded-full text-[15px] font-semibold text-white shadow-sm transition-opacity disabled:opacity-70" style={{ background: 'hsl(var(--primary))' }}>
                {loading ? <span className="flex items-center justify-center gap-2"><span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />{mode === 'sign-up' ? 'Creating account…' : 'Signing in…'}</span> : mode === 'sign-up' ? 'Create account' : 'Sign in'}
              </button>
            </form>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              {mode === 'sign-in' ? 'New to the portal?' : 'Already have an account?'}{' '}
              <button type="button" className="font-semibold text-primary hover:underline" onClick={() => { setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); setError(''); setNotice(''); setPassword(''); }}>
                {mode === 'sign-in' ? 'Create an account' : 'Sign in'}
              </button>
            </p>

            <p className="mt-8 text-xs text-center"
              style={{ color: 'hsl(var(--muted-foreground) / 0.6)' }}>
              &copy; {new Date().getFullYear()} {ps.institutionName || ps.portalName}
            </p>
          </div>
        </div>
      </div>

      {/* ── RIGHT — Maroon announcements panel ── */}
      <div
        className="hidden lg:flex flex-col items-center justify-center w-[62%] flex-shrink-0 p-10 relative"
        style={{ background: 'hsl(var(--primary))' }}
      >
        {/* Subtle dot texture */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        {/* White card */}
        <div className="relative z-10 w-full max-w-[720px] bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col"
          style={{ minHeight: '420px', maxHeight: '680px' }}>

          {/* Card header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0"
            style={{ borderBottom: '1px solid hsl(var(--border) / 0.5)' }}>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-semibold"
              style={{ background: 'hsl(var(--secondary))' }}>
              <Megaphone size={14} />
              Announcements
            </div>
            <button
              type="button"
              onClick={() => setAboutOpen(true)}
              className="flex items-center gap-1.5 text-sm font-medium rounded-full px-3 py-1.5 transition-colors hover:bg-muted"
              style={{ color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))' }}
            >
              <Info size={13} />
              About {ps.portalName}
            </button>
          </div>

          {/* Card content */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {hasAnnouncements ? (
              <div
                className="prose prose-sm max-w-none text-foreground
                  [&_h1]:text-foreground [&_h1]:font-bold [&_h1]:text-lg [&_h1]:mt-3 [&_h1]:mb-1.5
                  [&_h2]:text-foreground [&_h2]:font-bold [&_h2]:text-base [&_h2]:mt-3 [&_h2]:mb-1.5
                  [&_h3]:text-foreground [&_h3]:font-semibold [&_h3]:text-sm [&_h3]:mt-2.5 [&_h3]:mb-1
                  [&_p]:text-sm [&_p]:text-foreground [&_p]:leading-relaxed [&_p]:my-1.5
                  [&_a]:text-primary [&_a]:underline [&_a]:hover:text-primary/80
                  [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1.5 [&_ul>li]:text-sm [&_ul>li]:text-foreground
                  [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1.5 [&_ol>li]:text-sm [&_ol>li]:text-foreground
                  [&_strong]:font-bold [&_em]:italic [&_u]:underline
                  [&_table]:w-full [&_table]:border-collapse [&_table]:my-2 [&_table]:text-sm
                  [&_th]:bg-secondary/20 [&_th]:text-foreground [&_th]:font-semibold [&_th]:border [&_th]:border-secondary/30 [&_th]:px-3 [&_th]:py-1.5 [&_th]:text-left
                  [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-1.5 [&_td]:text-foreground
                  [&_hr]:border-border [&_hr]:my-3
                  [&_blockquote]:border-l-4 [&_blockquote]:border-secondary [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(ps.announcements ?? '') }}
              />
            ) : hasWelcome ? (
              <div className="space-y-2">
                {ps.welcomeTitle && (
                  <h2 className="text-lg font-bold leading-snug"
                    style={{ color: 'hsl(var(--foreground))' }}>{ps.welcomeTitle}</h2>
                )}
                {ps.welcomeMessage && (
                  <p className="text-sm leading-relaxed"
                    style={{ color: 'hsl(var(--muted-foreground))' }}>{ps.welcomeMessage}</p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-10 text-center">
                <Megaphone size={32} className="mb-3" style={{ color: 'hsl(var(--border))' }} />
                <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  No announcements at this time.
                </p>
              </div>
            )}
          </div>


        </div>
      </div>

      {/* ── ABOUT MODAL ── */}
      <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info size={18} className="text-primary" />
              About {ps.portalName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-border">
              <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm"
                style={{ background: 'var(--gradient-hero)' }}>
                {ps.logoUrl
                  ? <img src={ps.logoUrl} alt={ps.institutionName} className="w-full h-full object-cover" crossOrigin="anonymous" />
                  : <GraduationCap size={22} className="text-white" />
                }
              </div>
              <div>
                <p className="font-bold text-foreground leading-tight">{ps.institutionName || ps.portalName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{ps.portalTagline || 'Academic Information System'}</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              {ps.portalName} is the official Academic Information System used to manage academic records,
              course enlistment, grading, and student services for {ps.institutionName || 'the institution'} — bringing
              students, faculty, and administrative staff together on one platform.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: <BookOpen size={16} />, label: 'Course Enlistment', desc: 'Search, enlist, and manage class schedules' },
                { icon: <Award size={16} />, label: 'Grades & GWA', desc: 'View grades and track academic standing' },
                { icon: <ClipboardCheck size={16} />, label: 'Consents & Requests', desc: 'Submit and process academic requests' },
                { icon: <ShieldCheck size={16} />, label: 'Secure Access', desc: 'Role-based portals for every user type' },
              ].map(f => (
                <div key={f.label} className="flex items-start gap-2 p-3 rounded-lg bg-muted/40 border border-border/50">
                  <div className="text-primary flex-shrink-0 mt-0.5">{f.icon}</div>
                  <div>
                    <p className="text-xs font-semibold text-foreground leading-tight">{f.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-center text-muted-foreground/70 pt-1">
              &copy; {new Date().getFullYear()} {ps.institutionName || ps.portalName}. All rights reserved.
            </p>

            <Button className="w-full" onClick={() => setAboutOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={fpOpen} onOpenChange={open => { if (!open) closeFp(); }}>
        <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Reset password</DialogTitle>
              <DialogDescription>Enter the email associated with your account. We’ll send a reset link if the account exists.</DialogDescription>
            </DialogHeader>
            {!fpSent ? (
              <form onSubmit={handlePasswordReset} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="reset-email">Email address</Label>
                  <Input id="reset-email" type="email" autoComplete="email" value={fpEmail} onChange={event => { setFpEmail(event.target.value); setFpError(''); }} required autoFocus />
                </div>
                {fpError && <p className="flex items-start gap-2 text-sm text-destructive" role="alert"><AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />{fpError}</p>}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={closeFp}>Cancel</Button>
                  <Button type="submit" className="flex-1" disabled={fpLoading}>{fpLoading ? 'Sending…' : 'Send reset link'}</Button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col items-center gap-3 py-4 text-center" role="status" aria-live="polite">
                <CheckCircle aria-hidden="true" className="size-10 text-primary" />
                <p className="text-sm text-muted-foreground">If the account exists, you&apos;ll receive a password reset link shortly.</p>
                <Button type="button" onClick={closeFp}>Back to sign in</Button>
              </div>
            )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
