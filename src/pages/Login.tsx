import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import {
  GraduationCap, Eye, EyeOff, AlertCircle, KeyRound, Ticket,
  CheckCircle, ArrowLeft, User, BookOpen, Award, Users, CalendarCheck,
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

const brandFeatures = [
  { icon: <BookOpen size={14} />, label: 'Course Enlistment' },
  { icon: <Award size={14} />, label: 'Grade Monitoring' },
  { icon: <GraduationCap size={14} />, label: 'Graduation Tracking' },
  { icon: <Users size={14} />, label: 'Multi-role Access' },
  { icon: <CalendarCheck size={14} />, label: 'Term Management' },
];

export default function Login() {
  const { login, submitPasswordResetTicket, lookupProfileForReset, state } = useApp();
  const navigate = useNavigate();
  const ps = state.portalSettings;
  const activeTerm = state.terms.find(t => t.isActive);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4 sm:p-6" style={{ background: 'var(--gradient-hero)' }}>
      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="portal-orb portal-orb-1" />
        <div className="portal-orb portal-orb-2" />
      </div>
      {/* Dot grid overlay */}
      <div className="fixed inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, hsl(0 0% 100% / 0.10) 1px, transparent 1px)', backgroundSize: '26px 26px' }} />

      {/* Card container */}
      <div className="relative z-10 w-full max-w-[920px] rounded-2xl overflow-hidden shadow-[0_40px_100px_hsl(0_0%_0%/0.45)] border border-white/10 flex min-h-[520px] animate-fade-in">

        {/* ── LEFT — Branding ── */}
        <div className="hidden lg:flex flex-col justify-between w-[42%] flex-shrink-0 p-10 relative overflow-hidden" style={{ background: 'linear-gradient(160deg, hsl(var(--primary) / 0.97) 0%, hsl(var(--secondary) / 0.96) 100%)' }}>
          {/* Inner light orb */}
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -bottom-16 -left-10 w-56 h-56 rounded-full bg-white/5 pointer-events-none" />

          {/* Logo + name */}
          <div className="flex items-center gap-3 relative z-10">
            {ps.logoUrl
              ? <img src={ps.logoUrl} alt="Logo" className="w-11 h-11 rounded-xl object-cover border-2 border-white/30 shadow-md" crossOrigin="anonymous" />
              : <div className="w-11 h-11 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shadow-md">
                  <GraduationCap size={22} className="text-white" />
                </div>
            }
            <div>
              <p className="text-white font-bold text-base leading-tight">{ps.portalName}</p>
              {ps.portalTagline && <p className="text-white/55 text-xs mt-0.5 leading-snug">{ps.portalTagline}</p>}
            </div>
          </div>

          {/* Hero text + features */}
          <div className="space-y-8 flex-1 flex flex-col justify-center py-8 relative z-10">
            <div>
              <h2 className="text-4xl font-extrabold text-white leading-[1.15] tracking-tight">
                Academic<br />Information<br /><span className="text-white/50">System</span>
              </h2>
              <p className="text-white/55 text-sm mt-3 leading-relaxed max-w-[200px]">
                Your complete portal for grades, enrollment, and academic tracking.
              </p>
            </div>
            <div className="space-y-2.5">
              {brandFeatures.map(f => (
                <div key={f.label} className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-white/12 border border-white/15 flex items-center justify-center text-white/70 flex-shrink-0">
                    {f.icon}
                  </div>
                  <span className="text-white/70 text-sm">{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Active term pill */}
          {activeTerm ? (
            <div className="bg-white/10 border border-white/15 rounded-xl px-4 py-3 relative z-10">
              <p className="text-white/45 text-[10px] uppercase tracking-widest font-semibold mb-0.5">Active Term</p>
              <p className="text-white font-semibold text-sm leading-tight">{activeTerm.name}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-300 text-xs">{activeTerm.academicYear} — {activeTerm.semester}</span>
              </div>
            </div>
          ) : (
            <div className="bg-white/8 border border-white/12 rounded-xl px-4 py-3 relative z-10">
              <p className="text-white/40 text-xs">No active term at this time.</p>
            </div>
          )}
        </div>

        {/* ── RIGHT — Login Form ── */}
        <div className="flex-1 bg-background flex flex-col justify-center px-7 sm:px-10 py-8">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            {ps.logoUrl
              ? <img src={ps.logoUrl} alt="Logo" className="w-10 h-10 rounded-lg object-cover border border-border" crossOrigin="anonymous" />
              : <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                  <GraduationCap size={20} className="text-primary-foreground" />
                </div>
            }
            <div>
              <p className="font-bold text-foreground leading-tight text-sm">{ps.portalName}</p>
              {ps.portalTagline && <p className="text-muted-foreground text-xs">{ps.portalTagline}</p>}
            </div>
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Welcome back</h1>
            <p className="text-muted-foreground text-sm mt-1">Sign in to access your academic portal</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-sm font-medium text-foreground">Username</Label>
              <Input
                id="username"
                placeholder="Enter your username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoFocus required
                className="h-11 bg-muted/40 border-border/70 focus:bg-background transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="h-11 pr-10 bg-muted/40 border-border/70 focus:bg-background transition-colors"
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

            <div className="flex items-center justify-between pt-0.5">
              <div className="flex items-center gap-2">
                <input
                  id="remember"
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  className="w-3.5 h-3.5 accent-primary cursor-pointer rounded"
                />
                <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer font-normal select-none">Remember me</Label>
              </div>
              <button
                type="button"
                onClick={openForgot}
                className="text-sm text-primary hover:text-primary/80 hover:underline font-medium transition-colors"
              >
                Forgot password?
              </button>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-destructive text-sm bg-destructive/8 border border-destructive/20 rounded-lg px-3 py-2.5 animate-fade-in">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 font-semibold text-[15px] mt-1 shadow-sm"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : 'Sign In'}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-border/40 flex items-center justify-between">
            <p className="text-xs text-muted-foreground/60">&copy; {new Date().getFullYear()} {ps.institutionName}</p>
            <p className="text-xs text-muted-foreground/60">{ps.portalName}</p>
          </div>
        </div>
      </div>

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
