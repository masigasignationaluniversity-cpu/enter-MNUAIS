import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import {
  Eye, EyeOff, AlertCircle, KeyRound, Ticket,
  CheckCircle, ArrowLeft, User, GraduationCap, Megaphone, Info,
  BookOpen, ClipboardCheck, Award, ShieldCheck,
} from 'lucide-react';

const REMEMBER_KEY = 'ais_remembered_username';
const REMEMBER_PASS_KEY = 'ais_remembered_password';

const roleRedirects: Record<string, string> = {
  admin: '/admin/dashboard',
  ocs: '/ocs/dashboard',
  faculty: '/faculty/dashboard',
  student: '/student/dashboard',
  department_head: '/depthead/dashboard',
};

const roleLabels: Record<string, string> = {
  admin: 'Administrator',
  ocs: 'OCS Staff',
  faculty: 'Faculty',
  student: 'Student',
  department_head: 'Department Head',
};

function maskEmail(email: string): string {
  if (!email) return '(no email on file)';
  const [user, domain] = email.split('@');
  if (!domain) return email;
  const maskedUser = user.length <= 2 ? user[0] + '***' : user[0] + '*'.repeat(Math.max(user.length - 2, 1)) + user[user.length - 1];
  const [domainName, ...rest] = domain.split('.');
  const maskedDomain = domainName[0] + '*'.repeat(Math.max(domainName.length - 1, 1)) + '.' + rest.join('.');
  return `${maskedUser}@${maskedDomain}`;
}

export default function Login() {
  const { login, submitPasswordResetTicket, lookupProfileForReset, state } = useApp();
  const navigate = useNavigate();
  const ps = state.portalSettings;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // About modal
  const [aboutOpen, setAboutOpen] = useState(false);

  // Forgot password modal — 3 steps
  const [fpOpen, setFpOpen] = useState(false);
  const [fpStep, setFpStep] = useState<1 | 2 | 3>(1);
  const [fpUsername, setFpUsername] = useState('');
  const [fpProfile, setFpProfile] = useState<{ name: string; email: string; role: string } | null>(null);
  const [fpTicketNumber, setFpTicketNumber] = useState('');
  const [fpError, setFpError] = useState('');
  const [fpLoading, setFpLoading] = useState(false);

  useEffect(() => {
    if (state.currentUser) navigate(roleRedirects[state.currentUser.role] ?? '/');
  }, [state.currentUser, navigate]);

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    const savedPass = localStorage.getItem(REMEMBER_PASS_KEY);
    if (saved) { setUsername(saved); setRemember(true); if (savedPass) setPassword(savedPass); }
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
        localStorage.setItem(REMEMBER_PASS_KEY, password);
      } else {
        localStorage.removeItem(REMEMBER_KEY);
        localStorage.removeItem(REMEMBER_PASS_KEY);
      }
      navigate(roleRedirects[user.role] ?? '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const openForgot = () => { setFpOpen(true); setFpStep(1); setFpUsername(''); setFpProfile(null); setFpTicketNumber(''); setFpError(''); };
  const closeFp = () => { setFpOpen(false); setFpStep(1); setFpProfile(null); setFpError(''); };

  const handleFpLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setFpError('');
    setFpLoading(true);
    try {
      const profile = await lookupProfileForReset(fpUsername);
      if (!profile) { setFpError('Username not found. Please check and try again.'); return; }
      setFpProfile(profile);
      setFpStep(2);
    } catch { setFpError('Something went wrong. Please try again.'); }
    finally { setFpLoading(false); }
  };

  const handleFpConfirm = async () => {
    setFpError('');
    setFpLoading(true);
    try {
      const { ticketNumber } = await submitPasswordResetTicket(fpUsername);
      setFpTicketNumber(ticketNumber);
      setFpStep(3);
    } catch (err) {
      setFpError(err instanceof Error ? err.message : 'Failed to submit request. Please try again.');
    } finally { setFpLoading(false); }
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

            {/* Login form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-sm font-medium">Username</Label>
                <Input
                  id="username"
                  placeholder="Enter your username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoFocus required
                  className="h-11 bg-gray-50 border-gray-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="h-11 pr-10 bg-gray-50 border-gray-200"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: 'hsl(var(--muted-foreground))' }}
                    onClick={() => setShowPass(v => !v)}
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    id="remember"
                    type="checkbox"
                    checked={remember}
                    onChange={e => setRemember(e.target.checked)}
                    className="w-3.5 h-3.5 cursor-pointer rounded"
                    style={{ accentColor: 'hsl(var(--primary))' }}
                  />
                  <Label htmlFor="remember" className="text-sm cursor-pointer font-normal select-none"
                    style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Remember me
                  </Label>
                </div>
                <button
                  type="button"
                  onClick={openForgot}
                  className="text-sm font-medium transition-colors hover:underline"
                  style={{ color: 'hsl(var(--primary))' }}
                >
                  Forgot password?
                </button>
              </div>

              {error && (
                <div className="flex items-start gap-2 text-sm rounded-lg px-3 py-2.5"
                  style={{ color: 'hsl(var(--destructive))', background: 'hsl(var(--destructive) / 0.08)', border: '1px solid hsl(var(--destructive) / 0.2)' }}>
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 font-semibold text-[15px] rounded-full shadow-sm transition-opacity disabled:opacity-70 text-white"
                style={{ background: 'hsl(var(--primary))' }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </span>
                ) : 'Sign In'}
              </button>
            </form>

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
                dangerouslySetInnerHTML={{ __html: ps.announcements! }}
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

      {/* ── FORGOT PASSWORD MODAL ── */}
      <Dialog open={fpOpen} onOpenChange={o => { if (!o) closeFp(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound size={18} className="text-primary" />
              Forgot Password
              {fpStep > 1 && (
                <span className="ml-auto text-xs font-normal text-muted-foreground">Step {fpStep} of 3</span>
              )}
            </DialogTitle>
          </DialogHeader>

          {fpStep === 1 && (
            <form onSubmit={handleFpLookup} className="space-y-4">
              <p className="text-sm text-muted-foreground">Enter your username to look up your account details.</p>
              <div className="space-y-1.5">
                <Label>Username</Label>
                <Input placeholder="Enter your username" value={fpUsername} onChange={e => { setFpUsername(e.target.value); setFpError(''); }} required autoFocus />
              </div>
              {fpError && (
                <div className="flex items-start gap-2 text-destructive text-sm bg-destructive/10 rounded-lg px-3 py-2.5">
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" /><span>{fpError}</span>
                </div>
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={closeFp}>Cancel</Button>
                <Button type="submit" className="flex-1" disabled={fpLoading}>{fpLoading ? 'Looking up…' : 'Continue'}</Button>
              </div>
            </form>
          )}

          {fpStep === 2 && fpProfile && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Please verify that this is your account before submitting a reset request.</p>
              <div className="border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{fpProfile.name}</p>
                    <p className="text-xs text-muted-foreground">{roleLabels[fpProfile.role] ?? fpProfile.role}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm pt-1 border-t border-border/50">
                  <div><p className="text-xs text-muted-foreground">Username</p><p className="font-medium font-mono">{fpUsername}</p></div>
                  <div><p className="text-xs text-muted-foreground">Registered Email</p><p className="font-medium">{maskEmail(fpProfile.email)}</p></div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Is this you? Confirm to submit a password reset request. An administrator will review and approve it.</p>
              {fpError && (
                <div className="flex items-start gap-2 text-destructive text-sm bg-destructive/10 rounded-lg px-3 py-2.5">
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" /><span>{fpError}</span>
                </div>
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="gap-1.5" onClick={() => { setFpStep(1); setFpError(''); }}>
                  <ArrowLeft size={14} /> Not me
                </Button>
                <Button className="flex-1" onClick={handleFpConfirm} disabled={fpLoading}>
                  {fpLoading ? 'Submitting…' : 'Yes, submit reset request'}
                </Button>
              </div>
            </div>
          )}

          {fpStep === 3 && (
            <div className="space-y-4 text-center py-2">
              <div className="w-14 h-14 rounded-full bg-secondary/15 flex items-center justify-center mx-auto">
                <Ticket size={28} className="text-secondary" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-lg mb-1">Request Submitted!</p>
                <p className="text-sm text-muted-foreground">Your password reset request has been submitted. Please note your ticket number:</p>
              </div>
              <div className="bg-muted rounded-xl px-6 py-4 inline-block mx-auto">
                <p className="text-xs text-muted-foreground mb-1">Ticket Number</p>
                <p className="font-mono font-bold text-2xl text-foreground tracking-widest">{fpTicketNumber}</p>
              </div>
              <p className="text-sm text-muted-foreground">Present this ticket number to the administrator. Once approved, the system will generate a new password for you.</p>
              <Button className="w-full" onClick={closeFp}>
                <CheckCircle size={15} className="mr-1.5" /> Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
