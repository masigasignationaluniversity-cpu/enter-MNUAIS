import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  GraduationCap,
  LockKeyhole,
  SearchCheck,
  ShieldCheck,
} from "lucide-react";
import { admissionsSupabase, admissionStatusLabels, createTrackingToken, formatAdmissionDate, hashTrackingToken, type AdmissionStatus, type ApplicationStatusResult } from "@/lib/admissions";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type AdmissionsApplyProps = {
  initialMode?: "apply" | "track";
};

type Receipt = {
  applicationNo: string;
  trackingToken: string;
};

const statusStyles: Record<AdmissionStatus, string> = {
  submitted: "border-sky-200 bg-sky-50 text-sky-800",
  under_review: "border-amber-200 bg-amber-50 text-amber-800",
  accepted: "border-emerald-200 bg-emerald-50 text-emerald-800",
  waitlisted: "border-violet-200 bg-violet-50 text-violet-800",
  rejected: "border-rose-200 bg-rose-50 text-rose-800",
};

function StatusPill({ status }: { status: AdmissionStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${statusStyles[status]}`}>
      {admissionStatusLabels[status]}
    </span>
  );
}

function textValue(data: FormData, key: string) {
  const value = data.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export default function AdmissionsApply({ initialMode = "apply" }: AdmissionsApplyProps) {
  const [mode, setMode] = useState<"apply" | "track">(initialMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applicationError, setApplicationError] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [copyMessage, setCopyMessage] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [statusResult, setStatusResult] = useState<ApplicationStatusResult | null>(null);

  const handleApplicationSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setApplicationError("");

    const form = event.currentTarget;
    const data = new FormData(form);
    if (textValue(data, "website")) return;
    if (!admissionsSupabase) {
      setApplicationError("The admissions database is not available right now. Please try again later.");
      return;
    }

    setIsSubmitting(true);
    try {
      const trackingToken = createTrackingToken();
      const trackingTokenHash = await hashTrackingToken(trackingToken);
      const { data: applicationNo, error } = await admissionsSupabase.rpc("submit_admission_application", {
        p_first_name: textValue(data, "first_name"),
        p_last_name: textValue(data, "last_name"),
        p_date_of_birth: textValue(data, "date_of_birth"),
        p_email: textValue(data, "email"),
        p_phone: textValue(data, "phone"),
        p_program: textValue(data, "program"),
        p_intake_term: textValue(data, "intake_term"),
        p_previous_school: textValue(data, "previous_school"),
        p_personal_statement: textValue(data, "personal_statement"),
        p_tracking_token_hash: trackingTokenHash,
      });

      if (error || !applicationNo) {
        setApplicationError("We couldn't submit your application. Check the information and try again.");
        return;
      }

      setReceipt({ applicationNo, trackingToken });
      setCopyMessage("");
      form.reset();
    } catch {
      setApplicationError("We couldn't submit your application. Please try again in a moment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusLookup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLookupError("");
    setStatusResult(null);

    if (!admissionsSupabase) {
      setLookupError("The admissions database is not available right now. Please try again later.");
      return;
    }

    const data = new FormData(event.currentTarget);
    const applicationNo = textValue(data, "application_no").toUpperCase();
    const trackingToken = textValue(data, "tracking_token");
    setIsLookingUp(true);

    try {
      const { data: results, error } = await admissionsSupabase.rpc("lookup_admission_status", {
        p_application_no: applicationNo,
        p_tracking_token: trackingToken,
      });
      if (error) {
        setLookupError("We couldn't check your status right now. Please try again.");
      } else if (!results?.length) {
        setLookupError("We couldn't find a match. Check your application number and private access key.");
      } else {
        setStatusResult(results[0]);
      }
    } catch {
      setLookupError("We couldn&apos;t check your status right now. Please try again.");
    } finally {
      setIsLookingUp(false);
    }
  };

  const copyReceiptValue = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyMessage(`${label} copied`);
    } catch {
      setCopyMessage("Copy is unavailable here. Select the value and copy it manually.");
    }
  };

  const startNewApplication = () => {
    setReceipt(null);
    setApplicationError("");
    setMode("apply");
  };

  return (
    <div className="min-h-screen bg-muted/30 text-foreground">
      <header className="border-b border-border/70 bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/admissions/apply" className="flex min-w-0 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <GraduationCap aria-hidden="true" className="size-6" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold tracking-wide text-foreground sm:text-base">MNU Admissions</span>
              <span className="block truncate text-xs text-muted-foreground">Academic Information System</span>
            </span>
          </Link>
          <nav aria-label="Admissions navigation" className="flex shrink-0 items-center gap-2 sm:gap-4">
            <Link to="/admissions/staff" className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline">Staff access</Link>
            <Link to="/login" className="rounded-md px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Portal sign in</Link>
          </nav>
        </div>
      </header>

      <section className="relative isolate overflow-hidden bg-primary text-primary-foreground">
        <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 82% 12%, white 0, transparent 28%), radial-gradient(circle at 12% 110%, white 0, transparent 35%)" }} />
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:px-8 lg:py-20">
          <div className="max-w-2xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground/90">
              <BookOpenCheck aria-hidden="true" className="size-4" /> Admissions portal
            </p>
            <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Your next chapter starts here.</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-primary-foreground/80 sm:text-lg">
              Share your academic interests with the admissions team and keep a private key to check your application status anytime.
            </p>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm text-primary-foreground/85">
              <span className="inline-flex items-center gap-2"><ShieldCheck aria-hidden="true" className="size-4" /> Private status access</span>
              <span className="inline-flex items-center gap-2"><ClipboardCheck aria-hidden="true" className="size-4" /> Reviewable by admissions staff</span>
            </div>
          </div>
          <div className="hidden justify-self-end lg:block">
            <div className="grid size-56 place-items-center rounded-full border border-white/20 bg-white/10 shadow-2xl shadow-black/10">
              <div className="grid size-40 place-items-center rounded-full border border-white/25 bg-white/10">
                <GraduationCap aria-hidden="true" className="size-20 stroke-[1.2]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[0.72fr_1.28fr] lg:gap-12 lg:px-8 lg:py-12">
        <aside className="space-y-6 lg:pt-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Start here</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">A clear path to apply</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">Complete the form with accurate information. Your application number and private access key will appear once it is submitted.</p>
          </div>
          <ol className="space-y-4">
            <li className="flex gap-3 rounded-xl border border-border/70 bg-background p-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">1</span>
              <span><span className="block text-sm font-semibold">Tell us about yourself</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">Contact, school, and program details.</span></span>
            </li>
            <li className="flex gap-3 rounded-xl border border-border/70 bg-background p-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">2</span>
              <span><span className="block text-sm font-semibold">Save your access key</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">It is shown once and is needed to check status.</span></span>
            </li>
            <li className="flex gap-3 rounded-xl border border-border/70 bg-background p-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">3</span>
              <span><span className="block text-sm font-semibold">Follow your application</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">Return to the status page with both credentials.</span></span>
            </li>
          </ol>
          <div className="flex gap-3 rounded-xl border border-border/70 bg-background p-4">
            <LockKeyhole aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
            <p className="text-xs leading-5 text-muted-foreground">Your application details are only available to authorized admissions staff. Your private access key is never stored in readable form.</p>
          </div>
        </aside>

        <section className="min-w-0 rounded-2xl border border-border bg-background shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-5 sm:px-7">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Admissions</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">{receipt ? "Application received" : mode === "apply" ? "Start an application" : "Check application status"}</h2>
            </div>
            {!receipt && (
              <div role="tablist" aria-label="Admissions options" className="inline-flex rounded-lg bg-muted p-1">
                <button type="button" role="tab" aria-selected={mode === "apply"} onClick={() => { setMode("apply"); setLookupError(""); setStatusResult(null); }} className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${mode === "apply" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>Apply</button>
                <button type="button" role="tab" aria-selected={mode === "track"} onClick={() => { setMode("track"); setApplicationError(""); }} className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${mode === "track" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>Track status</button>
              </div>
            )}
          </div>

          <div className="p-5 sm:p-7">
            {receipt ? (
              <div className="mx-auto max-w-xl py-3 text-center">
                <span className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-50 text-emerald-700"><CheckCircle2 aria-hidden="true" className="size-7" /></span>
                <h3 className="mt-4 text-2xl font-semibold">Your application is in.</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Keep both values below. Your access key is private and will not be shown again after you leave this page.</p>
                <div className="mt-6 space-y-3 text-left">
                  <div className="rounded-xl border border-border bg-muted/40 p-4">
                    <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Application number</span>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <code className="break-all text-base font-bold tracking-wide text-foreground">{receipt.applicationNo}</code>
                      <Button type="button" size="sm" variant="outline" onClick={() => void copyReceiptValue(receipt.applicationNo, "Application number")} aria-label="Copy application number"><Copy aria-hidden="true" className="size-4" /></Button>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/40 p-4">
                    <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Private access key</span>
                    <div className="mt-2 flex items-start justify-between gap-3">
                      <code className="break-all text-xs leading-6 text-foreground sm:text-sm">{receipt.trackingToken}</code>
                      <Button type="button" size="sm" variant="outline" onClick={() => void copyReceiptValue(receipt.trackingToken, "Access key")} aria-label="Copy private access key"><Copy aria-hidden="true" className="size-4" /></Button>
                    </div>
                  </div>
                </div>
                <p aria-live="polite" className="mt-3 min-h-5 text-sm text-primary">{copyMessage}</p>
                <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
                  <Button type="button" onClick={() => { setReceipt(null); setMode("track"); }} className="gap-2">Check your status <ArrowRight aria-hidden="true" className="size-4" /></Button>
                  <Button type="button" variant="outline" onClick={startNewApplication}>Start another application</Button>
                </div>
              </div>
            ) : mode === "apply" ? (
              <form onSubmit={handleApplicationSubmit} className="space-y-7">
                <div>
                  <h3 className="font-semibold">Personal information</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Use the name and contact information you want the admissions team to use.</p>
                </div>
                <FieldGroup className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="first_name">First name <span aria-hidden="true" className="text-destructive">*</span></FieldLabel>
                    <Input id="first_name" name="first_name" autoComplete="given-name" maxLength={100} required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="last_name">Last name <span aria-hidden="true" className="text-destructive">*</span></FieldLabel>
                    <Input id="last_name" name="last_name" autoComplete="family-name" maxLength={100} required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="date_of_birth">Date of birth <span aria-hidden="true" className="text-destructive">*</span></FieldLabel>
                    <Input id="date_of_birth" name="date_of_birth" type="date" autoComplete="bday" required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="phone">Phone number <span aria-hidden="true" className="text-destructive">*</span></FieldLabel>
                    <Input id="phone" name="phone" type="tel" autoComplete="tel" minLength={7} maxLength={30} required />
                  </Field>
                  <Field className="sm:col-span-2">
                    <FieldLabel htmlFor="email">Email address <span aria-hidden="true" className="text-destructive">*</span></FieldLabel>
                    <Input id="email" name="email" type="email" autoComplete="email" maxLength={254} required />
                  </Field>
                </FieldGroup>

                <div className="border-t border-border pt-6">
                  <h3 className="font-semibold">Academic interests</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Share the program and intake you are interested in.</p>
                </div>
                <FieldGroup className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="program">Program of interest <span aria-hidden="true" className="text-destructive">*</span></FieldLabel>
                    <Input id="program" name="program" maxLength={160} placeholder="Enter your preferred program" required />
                    <FieldDescription>Use the program name from the university&apos;s current catalog.</FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="intake_term">Intake term <span aria-hidden="true" className="text-destructive">*</span></FieldLabel>
                    <Input id="intake_term" name="intake_term" maxLength={80} placeholder="e.g. First semester, 2027" required />
                  </Field>
                  <Field className="sm:col-span-2">
                    <FieldLabel htmlFor="previous_school">Previous school <span aria-hidden="true" className="text-destructive">*</span></FieldLabel>
                    <Input id="previous_school" name="previous_school" autoComplete="organization" maxLength={180} required />
                  </Field>
                  <Field className="sm:col-span-2">
                    <FieldLabel htmlFor="personal_statement">Why are you interested in this program? <span aria-hidden="true" className="text-destructive">*</span></FieldLabel>
                    <Textarea id="personal_statement" name="personal_statement" minLength={50} maxLength={3000} rows={5} placeholder="Tell us about your interests, goals, or experience (50–3,000 characters)." required />
                    <FieldDescription>At least 50 characters. Your statement is visible to authorized admissions staff.</FieldDescription>
                  </Field>
                </FieldGroup>

                <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
                  <label htmlFor="website">Leave this field empty</label>
                  <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
                </div>

                <Field>
                  <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/30 p-4">
                    <input id="consent" name="consent" type="checkbox" required className="mt-1 size-4 accent-primary" />
                    <FieldLabel htmlFor="consent" className="cursor-pointer text-sm font-normal leading-6 text-muted-foreground">I confirm that the information above is accurate and consent to its use for admissions review.</FieldLabel>
                  </div>
                </Field>

                {applicationError && <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{applicationError}</p>}
                <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-5 text-muted-foreground">Required fields are marked with an asterisk.</p>
                  <Button type="submit" disabled={isSubmitting} className="gap-2">
                    {isSubmitting ? "Submitting…" : "Submit application"}
                    {!isSubmitting && <ArrowRight aria-hidden="true" className="size-4" />}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="mx-auto max-w-lg">
                <div className="mb-6 flex items-start gap-3 rounded-xl border border-primary/15 bg-primary/5 p-4">
                  <SearchCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
                  <p className="text-sm leading-6 text-muted-foreground">Enter the application number and private access key you received after submitting. Neither value alone is enough to view a status.</p>
                </div>
                <form onSubmit={handleStatusLookup}>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="application_no">Application number</FieldLabel>
                      <Input id="application_no" name="application_no" placeholder="MNU-2026-XXXXXXXX" autoCapitalize="characters" autoComplete="off" required />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="tracking_token">Private access key</FieldLabel>
                      <Input id="tracking_token" name="tracking_token" type="password" autoComplete="off" required />
                      <FieldDescription>This key was shown once after your application was submitted.</FieldDescription>
                    </Field>
                    {lookupError && <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{lookupError}</p>}
                    <Button type="submit" className="w-full gap-2" disabled={isLookingUp}>
                      {isLookingUp ? "Checking…" : "Check status"}
                      {!isLookingUp && <SearchCheck aria-hidden="true" className="size-4" />}
                    </Button>
                  </FieldGroup>
                </form>
                {statusResult && (
                  <div role="status" className="mt-6 rounded-xl border border-border bg-muted/30 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{statusResult.application_no}</p>
                        <h3 className="mt-1 text-lg font-semibold">Application status</h3>
                      </div>
                      <StatusPill status={statusResult.status} />
                    </div>
                    <dl className="mt-4 grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-2">
                      <div><dt className="text-muted-foreground">Program</dt><dd className="mt-1 font-medium">{statusResult.program}</dd></div>
                      <div><dt className="text-muted-foreground">Submitted</dt><dd className="mt-1 font-medium">{formatAdmissionDate(statusResult.created_at)}</dd></div>
                    </dl>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>Academic Information System · Admissions</span>
          <span>Need staff access? <Link to="/admissions/staff" className="font-semibold text-primary underline-offset-4 hover:underline">Sign in here</Link></span>
        </div>
      </footer>
    </div>
  );
}
