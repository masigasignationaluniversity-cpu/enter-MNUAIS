import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { admissionsSupabase, admissionStatusLabels, formatAdmissionDate, isAdmissionsStaff, type AdmissionStatus } from "@/lib/admissions";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const statusStyles: Record<AdmissionStatus, string> = {
  submitted: "border-sky-200 bg-sky-50 text-sky-800",
  under_review: "border-amber-200 bg-amber-50 text-amber-800",
  accepted: "border-emerald-200 bg-emerald-50 text-emerald-800",
  waitlisted: "border-violet-200 bg-violet-50 text-violet-800",
  rejected: "border-rose-200 bg-rose-50 text-rose-800",
};

const statusOptions: AdmissionStatus[] = ["submitted", "under_review", "accepted", "waitlisted", "rejected"];

function StatusPill({ status }: { status: AdmissionStatus }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[status]}`}>
      {admissionStatusLabels[status]}
    </span>
  );
}

function loginErrorMessage(status?: number) {
  if (status === 429) return "Too many attempts. Please wait a moment before trying again.";
  return "We couldn't sign you in. Check your email and password, then try again.";
}

export default function AdmissionsStaff() {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signInError, setSignInError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AdmissionStatus | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<AdmissionStatus>("submitted");
  const [draftNotes, setDraftNotes] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  useEffect(() => {
    const { data: { subscription } } = admissionsSupabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthReady(true);
    });

    void admissionsSupabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const authorized = isAdmissionsStaff(session?.user);
  const applicationsQuery = useQuery({
    queryKey: ["admissions", "applications", session?.user.id],
    enabled: Boolean(authorized && admissionsSupabase),
    queryFn: async () => {
      const { data, error } = await admissionsSupabase
        .from("admission_applications")
        .select("id, application_no, first_name, last_name, date_of_birth, email, phone, program, intake_term, previous_school, personal_statement, status, review_notes, reviewed_by, decision_at, created_at, updated_at")
        .order("created_at", { ascending: false });
      if (error) throw new Error("Applications could not be loaded. Your admissions access may need to be checked.");
      return data;
    },
  });

  const saveReview = useMutation({
    mutationFn: async () => {
      if (!selectedApplication || !session?.user.id) {
        throw new Error("Choose an application before saving a review.");
      }
      const isDecision = ["accepted", "waitlisted", "rejected"].includes(draftStatus);
      const { error } = await admissionsSupabase
        .from("admission_applications")
        .update({
          status: draftStatus,
          review_notes: draftNotes.trim() || null,
          reviewed_by: session.user.id,
          decision_at: isDecision ? new Date().toISOString() : null,
        })
        .eq("id", selectedApplication.id);
      if (error) throw new Error("Your review could not be saved. Check your staff access and try again.");
    },
    onSuccess: async () => {
      setSaveError("");
      setSaveSuccess("Review saved.");
      await queryClient.invalidateQueries({ queryKey: ["admissions", "applications", session?.user.id] });
    },
    onError: (error) => {
      setSaveSuccess("");
      setSaveError(error instanceof Error ? error.message : "Your review could not be saved.");
    },
  });

  const applications = useMemo(() => applicationsQuery.data ?? [], [applicationsQuery.data]);
  const filteredApplications = useMemo(() => {
    const query = search.trim().toLowerCase();
    return applications.filter((application) => {
      const matchesStatus = statusFilter === "all" || application.status === statusFilter;
      const matchesSearch = !query || [
        application.application_no,
        application.first_name,
        application.last_name,
        application.email,
        application.program,
      ].some((value) => value.toLowerCase().includes(query));
      return matchesStatus && matchesSearch;
    });
  }, [applications, search, statusFilter]);

  const selectedApplication = applications.find((application) => application.id === selectedId) ?? null;

  useEffect(() => {
    if (selectedApplication) {
      setDraftStatus(selectedApplication.status);
      setDraftNotes(selectedApplication.review_notes ?? "");
      setSaveError("");
      setSaveSuccess("");
    }
  }, [selectedApplication]);

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSignInError("");
    const { data, error } = await admissionsSupabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setSignInError(loginErrorMessage(error.status));
      return;
    }

    if (!isAdmissionsStaff(data.user)) {
      await admissionsSupabase.auth.signOut();
      setSignInError("This account does not have an admissions role. Ask an administrator to assign the admin or staff role in Supabase Auth app metadata.");
      return;
    }

    setPassword("");
  };

  const handleSignOut = async () => {
    await admissionsSupabase.auth.signOut();
    setSelectedId(null);
    setSearch("");
    setStatusFilter("all");
    await queryClient.removeQueries({ queryKey: ["admissions", "applications"] });
  };

  const handleSaveReview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveError("");
    setSaveSuccess("");
    saveReview.mutate();
  };

  return (
    <div className="min-h-screen bg-muted/30 text-foreground">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/admissions/apply" className="flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground"><GraduationCap aria-hidden="true" className="size-5" /></span>
            <span><span className="block text-sm font-bold">MNU Admissions</span><span className="block text-xs text-muted-foreground">Staff review console</span></span>
          </Link>
          {authorized && <Button type="button" variant="outline" size="sm" onClick={() => void handleSignOut()} className="gap-2"><LogOut aria-hidden="true" className="size-4" /> Sign out</Button>}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        {!authReady ? (
          <div className="grid min-h-[50vh] place-items-center"><p role="status" className="text-sm text-muted-foreground">Restoring secure staff session…</p></div>
        ) : !authorized ? (
          <div className="mx-auto grid max-w-5xl overflow-hidden rounded-2xl border border-border bg-background shadow-sm lg:grid-cols-[0.9fr_1.1fr]">
            <div className="hidden flex-col justify-between bg-primary p-8 text-primary-foreground lg:flex">
              <div>
                <span className="grid size-12 place-items-center rounded-2xl border border-white/20 bg-white/10"><ShieldCheck aria-hidden="true" className="size-6" /></span>
                <h1 className="mt-8 text-3xl font-semibold leading-tight">A secure workspace for admissions review.</h1>
                <p className="mt-4 text-sm leading-6 text-primary-foreground/80">Sign in with an institution-managed Supabase Auth account to review and update applicant records.</p>
              </div>
              <p className="text-xs text-primary-foreground/70">Access is enforced again by database row-level security.</p>
            </div>
            <div className="p-6 sm:p-9">
              <Link to="/admissions/apply" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft aria-hidden="true" className="size-4" /> Public admissions page</Link>
              <div className="mt-8">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Staff access</p>
                <h2 className="mt-2 text-2xl font-semibold">Sign in to review applications</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Use your admissions staff email and password. Applicant accounts are not created here.</p>
              </div>
              <form onSubmit={handleSignIn} className="mt-7">
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="staff-email">Email address</FieldLabel>
                    <Input id="staff-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="staff-password">Password</FieldLabel>
                    <Input id="staff-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
                  </Field>
                  {signInError && <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{signInError}</p>}
                  <Button type="submit" className="w-full">Sign in</Button>
                  <FieldDescription>Access requires an administrator-assigned <code className="rounded bg-muted px-1 py-0.5 text-xs">admissions_role</code> value of <code className="rounded bg-muted px-1 py-0.5 text-xs">admin</code> or <code className="rounded bg-muted px-1 py-0.5 text-xs">staff</code> in Supabase Auth app metadata.</FieldDescription>
                </FieldGroup>
              </form>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Admissions office</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">Application review</h1>
                <p className="mt-2 text-sm text-muted-foreground">Review applicant information and record decisions securely.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground"><ShieldCheck aria-hidden="true" className="size-4 text-emerald-600" /> Signed in as {session?.user.email}</span>
                <Button type="button" variant="outline" size="sm" onClick={() => void applicationsQuery.refetch()} disabled={applicationsQuery.isFetching} className="gap-2"><RefreshCw aria-hidden="true" className={`size-4 ${applicationsQuery.isFetching ? "animate-spin" : ""}`} /> Refresh</Button>
              </div>
            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-3">
              {([
                ["Total applications", applications.length, ClipboardList],
                ["Awaiting review", applications.filter((application) => application.status === "submitted").length, Search],
                ["Accepted", applications.filter((application) => application.status === "accepted").length, CheckCircle2],
              ] as const).map(([label, count, Icon]) => (
                <div key={label} className="flex items-center gap-4 rounded-xl border border-border bg-background p-4 shadow-sm">
                  <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><Icon aria-hidden="true" className="size-5" /></span>
                  <span><span className="block text-2xl font-semibold tabular-nums">{count}</span><span className="text-sm text-muted-foreground">{label}</span></span>
                </div>
              ))}
            </div>

            <div className="mt-6 grid min-w-0 gap-6 xl:grid-cols-[1fr_0.85fr]">
              <section className="min-w-0 rounded-2xl border border-border bg-background shadow-sm">
                <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div><h2 className="font-semibold">Applicant queue</h2><p className="mt-1 text-xs text-muted-foreground">{filteredApplications.length} of {applications.length} applications</p></div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <label className="relative block min-w-0 sm:w-56">
                      <span className="sr-only">Search applications</span>
                      <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search applicants" className="pl-9" />
                    </label>
                    <label className="block sm:w-44">
                      <span className="sr-only">Filter by status</span>
                      <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as AdmissionStatus | "all")} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <option value="all">All statuses</option>
                        {statusOptions.map((status) => <option key={status} value={status}>{admissionStatusLabels[status]}</option>)}
                      </select>
                    </label>
                  </div>
                </div>
                {applicationsQuery.isPending ? (
                  <p role="status" className="p-8 text-center text-sm text-muted-foreground">Loading applications…</p>
                ) : applicationsQuery.isError ? (
                  <div role="alert" className="m-5 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">{applicationsQuery.error instanceof Error ? applicationsQuery.error.message : "Applications could not be loaded."}</div>
                ) : filteredApplications.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <span className="mx-auto grid size-12 place-items-center rounded-full bg-muted text-muted-foreground"><ClipboardList aria-hidden="true" className="size-5" /></span>
                    <p className="mt-3 font-medium">No applications found</p>
                    <p className="mt-1 text-sm text-muted-foreground">Try another search or status filter.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[620px] text-left text-sm">
                      <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                        <tr><th scope="col" className="px-5 py-3 font-semibold">Applicant</th><th scope="col" className="px-5 py-3 font-semibold">Program</th><th scope="col" className="px-5 py-3 font-semibold">Status</th><th scope="col" className="px-5 py-3 font-semibold">Received</th></tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredApplications.map((application) => (
                          <tr key={application.id} className={selectedId === application.id ? "bg-primary/5" : "hover:bg-muted/30"}>
                            <td className="px-5 py-4">
                              <button type="button" onClick={() => setSelectedId(application.id)} className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                <span className="block font-semibold text-foreground">{application.first_name} {application.last_name}</span>
                                <span className="mt-1 block font-mono text-xs text-muted-foreground">{application.application_no}</span>
                              </button>
                            </td>
                            <td className="max-w-[190px] truncate px-5 py-4 text-muted-foreground" title={application.program}>{application.program}</td>
                            <td className="px-5 py-4"><StatusPill status={application.status} /></td>
                            <td className="whitespace-nowrap px-5 py-4 text-xs text-muted-foreground">{new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(application.created_at))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section aria-label="Application details" className="min-w-0 rounded-2xl border border-border bg-background shadow-sm">
                {selectedApplication ? (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-5">
                      <div>
                        <p className="font-mono text-xs text-muted-foreground">{selectedApplication.application_no}</p>
                        <h2 className="mt-1 text-xl font-semibold">{selectedApplication.first_name} {selectedApplication.last_name}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">Received {formatAdmissionDate(selectedApplication.created_at)}</p>
                      </div>
                      <Button type="button" variant="ghost" size="sm" className="xl:hidden" onClick={() => setSelectedId(null)}>Close</Button>
                    </div>
                    <div className="max-h-[74vh] space-y-6 overflow-y-auto p-5">
                      <dl className="grid gap-x-4 gap-y-4 text-sm sm:grid-cols-2">
                        <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</dt><dd className="mt-1 break-all font-medium"><a href={`mailto:${selectedApplication.email}`} className="underline decoration-border underline-offset-4 hover:text-primary">{selectedApplication.email}</a></dd></div>
                        <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phone</dt><dd className="mt-1 font-medium">{selectedApplication.phone}</dd></div>
                        <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date of birth</dt><dd className="mt-1 font-medium">{new Intl.DateTimeFormat(undefined, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${selectedApplication.date_of_birth}T00:00:00Z`))}</dd></div>
                        <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Intake term</dt><dd className="mt-1 font-medium">{selectedApplication.intake_term}</dd></div>
                        <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Program of interest</dt><dd className="mt-1 font-medium">{selectedApplication.program}</dd></div>
                        <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Previous school</dt><dd className="mt-1 font-medium">{selectedApplication.previous_school}</dd></div>
                        <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Personal statement</dt><dd className="mt-2 whitespace-pre-wrap rounded-lg bg-muted/40 p-3 leading-6 text-muted-foreground">{selectedApplication.personal_statement}</dd></div>
                      </dl>
                      <form onSubmit={handleSaveReview} className="border-t border-border pt-5">
                        <h3 className="font-semibold">Review decision</h3>
                        <FieldGroup className="mt-4">
                          <Field>
                            <FieldLabel htmlFor="review-status">Application status</FieldLabel>
                            <select id="review-status" value={draftStatus} onChange={(event) => setDraftStatus(event.target.value as AdmissionStatus)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                              {statusOptions.map((status) => <option key={status} value={status}>{admissionStatusLabels[status]}</option>)}
                            </select>
                          </Field>
                          <Field>
                            <FieldLabel htmlFor="review-notes">Internal review notes</FieldLabel>
                            <Textarea id="review-notes" value={draftNotes} onChange={(event) => setDraftNotes(event.target.value)} maxLength={4000} rows={4} placeholder="Add notes for authorized admissions staff" />
                            <FieldDescription>Notes are not shown to applicants. Maximum 4,000 characters.</FieldDescription>
                          </Field>
                          {saveError && <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{saveError}</p>}
                          {saveSuccess && <p role="status" className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700"><CheckCircle2 aria-hidden="true" className="size-4" /> {saveSuccess}</p>}
                          <Button type="submit" disabled={saveReview.isPending} className="w-full">{saveReview.isPending ? "Saving review…" : "Save review"}</Button>
                        </FieldGroup>
                      </form>
                    </div>
                  </>
                ) : (
                  <div className="grid min-h-80 place-items-center p-8 text-center">
                    <div className="max-w-xs">
                      <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary/10 text-primary"><ArrowUpRight aria-hidden="true" className="size-5" /></span>
                      <h2 className="mt-4 font-semibold">Choose an application</h2>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">Select an applicant from the queue to review their information and record a decision.</p>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
