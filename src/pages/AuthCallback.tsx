import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, GraduationCap, LoaderCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { portalAuthClient } from '../integrations/supabase/portalAuthClient';

type CallbackState = 'loading' | 'confirmed' | 'recovery' | 'updated' | 'error';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [view, setView] = useState<CallbackState>('loading');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const url = new URL(window.location.href);
    const flowType = url.searchParams.get('type');
    window.history.replaceState(null, document.title, url.pathname);

    const finishCallback = async () => {
      if (url.searchParams.has('error') || url.searchParams.has('error_code')) {
        if (active) {
          setError('This link is invalid or has expired. Request a new email and try again.');
          setView('error');
        }
        return;
      }

      const code = url.searchParams.get('code');
      let authError: { message: string } | null = null;

      if (code) {
        const { error: exchangeError } = await portalAuthClient.auth.exchangeCodeForSession(code);
        authError = exchangeError;
      } else {
        const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (!accessToken || !refreshToken) {
          authError = { message: 'Missing authorization code.' };
        } else {
          const { error: sessionError } = await portalAuthClient.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          authError = sessionError;
        }
      }

      if (!active) return;
      if (authError) {
        setError('This link is invalid or has expired. Request a new email and try again.');
        setView('error');
        return;
      }

      setView(flowType === 'recovery' || flowType === 'invite' ? 'recovery' : 'confirmed');
    };

    void finishCallback().catch(() => {
      if (active) {
        setError('We could not verify this link. Request a new email and try again.');
        setView('error');
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const handlePasswordUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Use a password with at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      const { error: updateError } = await portalAuthClient.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message.toLowerCase().includes('password')
          ? 'Choose a stronger password and try again.'
          : 'We could not update your password. Request a new reset link and try again.');
        return;
      }
      await portalAuthClient.auth.signOut({ scope: 'local' });
      setView('updated');
    } catch {
      setError('We could not update your password. Request a new reset link and try again.');
    } finally {
      setSaving(false);
    }
  };

  const heading = view === 'recovery'
    ? 'Choose a new password'
    : view === 'updated'
      ? 'Password updated'
      : view === 'confirmed'
        ? 'Email confirmed'
        : view === 'error'
          ? 'Link unavailable'
          : 'Verifying your link';

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-border bg-background p-7 shadow-lg sm:p-9">
        <div className="mb-6 flex items-center justify-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <GraduationCap aria-hidden="true" className="size-7" />
          </div>
        </div>
        <h1 className="text-center text-2xl font-bold tracking-tight text-foreground">{heading}</h1>

        {view === 'loading' && (
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground" role="status">
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            Checking your secure link…
          </div>
        )}

        {view === 'recovery' && (
          <form onSubmit={handlePasswordUpdate} className="mt-6 flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">Set a new password for your portal account.</p>
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-password">New password</Label>
              <Input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={event => setPassword(event.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input id="confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} />
            </div>
            {error && <p className="flex items-start gap-2 text-sm text-destructive" role="alert"><AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />{error}</p>}
            <Button type="submit" disabled={saving}>{saving ? 'Updating password…' : 'Update password'}</Button>
          </form>
        )}

        {(view === 'confirmed' || view === 'updated') && (
          <div className="mt-5 flex flex-col items-center gap-4 text-center">
            <CheckCircle2 aria-hidden="true" className="size-9 text-primary" />
            <p className="text-sm text-muted-foreground">
              {view === 'updated' ? 'Your password has been changed. Sign in with your new password.' : 'Your email is confirmed. Continue to the portal to sign in.'}
            </p>
            <Button className="w-full" onClick={() => navigate('/login', { replace: true })}>Continue to sign in</Button>
          </div>
        )}

        {view === 'error' && (
          <div className="mt-5 flex flex-col items-center gap-4 text-center">
            <AlertCircle aria-hidden="true" className="size-9 text-destructive" />
            <p className="text-sm text-muted-foreground" role="alert">{error}</p>
            <Button variant="outline" className="w-full" onClick={() => navigate('/login', { replace: true })}>Return to sign in</Button>
          </div>
        )}
      </section>
    </main>
  );
}
