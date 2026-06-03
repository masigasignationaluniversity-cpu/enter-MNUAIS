import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { GraduationCap, Eye, EyeOff, AlertCircle, KeyRound, Ticket, CheckCircle, ArrowLeft, User } from 'lucide-react';

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

  const openForgot = () => {
    setFpOpen(true);
    setFpStep(1);
    setFpUsername('');
    setFpProfile(null);
    setFpTicketNumber('');
    setFpError('');
  };

  // Step 1 → Step 2: look up profile details
  const handleFpLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setFpError('');
    setFpLoading(true);
    try {
      const profile = await lookupProfileForReset(fpUsername);
      if (!profile) {
        setFpError('Username not found. Please check and try again.');
        return;
      }
      setFpProfile(profile);
      setFpStep(2);
    } catch {
      setFpError('Something went wrong. Please try again.');
    } finally {
      setFpLoading(false);
    }
  };

  // Step 2 → Step 3: submit ticket
  const handleFpConfirm = async () => {
    setFpError('');
    setFpLoading(true);
    try {
      const { ticketNumber } = await submitPasswordResetTicket(fpUsername);
      setFpTicketNumber(ticketNumber);
      setFpStep(3);
    } catch (err) {
      setFpError(err instanceof Error ? err.message : 'Failed to submit request. Please try again.');
    } finally {
      setFpLoading(false);
    }
  };

  const closeFp = () => {
    setFpOpen(false);
    setFpStep(1);
    setFpProfile(null);
    setFpError('');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: 'hsl(0 0% 93%)' }}>
      <div className="w-full max-w-3xl rounded-xl overflow-hidden shadow-2xl flex flex-row min-h-[440px]">

        {/* LEFT */}
        <div className="w-[42%] flex-shrink-0 flex flex-col items-center justify-center px-8 py-10 gap-5" style={{ background: 'var(--gradient-hero)' }}>
          <div className="flex-shrink-0">
            {ps.logoUrl ? (
              <img src={ps.logoUrl} alt="Institution Logo" className="w-28 h-28 rounded-full object-cover border-4 border-white/30 shadow-lg" crossOrigin="anonymous" />
            ) : (
              <div className="w-28 h-28 rounded-full bg-white/15 border-4 border-white/30 flex items-center justify-center shadow-lg">
                <GraduationCap size={52} className="text-white/90" />
              </div>
            )}
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-white tracking-wide leading-tight">{ps.portalName}</h1>
            {ps.portalTagline && <p className="text-white/75 text-sm mt-1.5 leading-snug max-w-[200px] mx-auto font-medium">{ps.portalTagline}</p>}
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex-1 bg-white flex flex-col justify-between px-10 py-8">
          <div className="flex flex-col justify-center h-full gap-5">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-foreground">Welcome</h2>
              <p className="text-muted-foreground text-sm mt-1">Sign in to your account to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-foreground/80">Username</Label>
                <Input id="username" placeholder="Enter your username" value={username} onChange={e => setUsername(e.target.value)} autoFocus required className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-foreground/80">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPass ? 'text' : 'password'} placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} required className="h-10 pr-10" />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setShowPass(v => !v)}>
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input id="remember" type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="w-3.5 h-3.5 accent-primary cursor-pointer" />
                  <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer font-normal">Remember password</Label>
                </div>
                <button type="button" onClick={openForgot} className="text-sm text-primary hover:underline font-medium">Forgot password?</button>
              </div>
              {error && (
                <div className="flex items-start gap-2 text-destructive text-sm bg-destructive/10 rounded-lg px-3 py-2">
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" /><span>{error}</span>
                </div>
              )}
              <Button type="submit" className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold mt-1" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign In'}
              </Button>
            </form>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border/50 mt-4">
            <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} {ps.institutionName}</p>
            <p className="text-xs text-muted-foreground">{ps.portalName}</p>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground/60 mt-3">Academic Information System</p>

      {/* ── FORGOT PASSWORD MODAL ─────────────────────────────── */}
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

          {/* ── STEP 1: Enter username ── */}
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

          {/* ── STEP 2: Verify details ── */}
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
                  <div>
                    <p className="text-xs text-muted-foreground">Username</p>
                    <p className="font-medium font-mono">{fpUsername}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Registered Email</p>
                    <p className="font-medium">{maskEmail(fpProfile.email)}</p>
                  </div>
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

          {/* ── STEP 3: Ticket confirmation ── */}
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

              <p className="text-sm text-muted-foreground">
                Present this ticket number to the administrator. Once approved, the system will generate a new password for you.
              </p>

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
