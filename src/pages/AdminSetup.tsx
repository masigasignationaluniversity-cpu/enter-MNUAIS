import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, GraduationCap } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '../components/ui/field';

type SetupResponse = { error?: string; message?: string };

export default function AdminSetup() {
  const [setupSecret, setSetupSecret] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const response = await fetch('/api/admin/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ setupSecret, name: name.trim(), username: username.trim() }),
      });
      const result = await response.json().catch(() => null) as SetupResponse | null;
      if (!response.ok) throw new Error(result?.error || 'Unable to send the administrator invitation.');
      setSent(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to send the administrator invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-border bg-background p-7 shadow-lg sm:p-9" aria-labelledby="admin-setup-title">
        <div className="mb-6 flex justify-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <GraduationCap aria-hidden="true" className="size-7" />
          </div>
        </div>

        {sent ? (
          <div className="flex flex-col gap-4 text-center" role="status" aria-live="polite">
            <h1 id="admin-setup-title" className="text-2xl font-semibold tracking-tight">Invitation sent</h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Check the administrator email configured by the portal owner for a secure link to set your password. The link expires for your protection.
            </p>
            <Button asChild className="mt-2 w-full">
              <Link to="/login">Return to sign in</Link>
            </Button>
          </div>
        ) : (
          <>
            <h1 id="admin-setup-title" className="text-center text-2xl font-semibold tracking-tight">Set up the first administrator</h1>
            <p className="mt-2 text-center text-sm leading-6 text-muted-foreground">
              This one-time setup requires the private code configured by the portal owner. The invitation goes to the configured administrator email; administrators invite all other users.
            </p>

            <form onSubmit={handleSubmit} className="mt-7">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="admin-setup-code">One-time setup code</FieldLabel>
                  <Input id="admin-setup-code" type="password" autoComplete="off" required minLength={32} maxLength={256} value={setupSecret} onChange={event => setSetupSecret(event.target.value)} />
                  <FieldDescription>Use the exact 32+ character code set by the portal owner.</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="admin-name">Full name</FieldLabel>
                  <Input id="admin-name" autoComplete="name" required minLength={2} maxLength={160} value={name} onChange={event => setName(event.target.value)} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="admin-username">Username</FieldLabel>
                  <Input id="admin-username" autoComplete="username" required minLength={3} maxLength={32} pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,31}" aria-describedby="admin-username-help" value={username} onChange={event => setUsername(event.target.value)} />
                  <FieldDescription id="admin-username-help">Use 3–32 letters, numbers, dots, dashes, or underscores.</FieldDescription>
                </Field>
              </FieldGroup>
              {error && <p className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm text-destructive" role="alert">{error}</p>}
              <Button type="submit" disabled={submitting} className="mt-5 w-full">
                {submitting ? 'Sending invitation…' : 'Send administrator invitation'}
              </Button>
            </form>
          </>
        )}

        <Link to="/login" className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
