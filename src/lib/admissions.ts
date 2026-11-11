import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AdmissionStatus =
  | "submitted"
  | "under_review"
  | "accepted"
  | "waitlisted"
  | "rejected";

export type AdmissionApplication = {
  id: string;
  application_no: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  email: string;
  phone: string;
  program: string;
  intake_term: string;
  previous_school: string;
  personal_statement: string;
  tracking_token_hash: string;
  status: AdmissionStatus;
  review_notes: string | null;
  reviewed_by: string | null;
  decision_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ApplicationStatusResult = Pick<
  AdmissionApplication,
  "application_no" | "status" | "program" | "created_at"
>;

type AdmissionsTable = {
  Row: AdmissionApplication;
  Insert: Omit<
    AdmissionApplication,
    | "id"
    | "application_no"
    | "status"
    | "review_notes"
    | "reviewed_by"
    | "decision_at"
    | "created_at"
    | "updated_at"
  > & {
    id?: string;
    application_no?: string;
    status?: AdmissionStatus;
    review_notes?: string | null;
    reviewed_by?: string | null;
    decision_at?: string | null;
    created_at?: string;
    updated_at?: string;
  };
  Update: Partial<AdmissionApplication>;
  Relationships: [];
};

type PublicSchema = Database["public"];
type AdmissionsDatabase = Omit<Database, "public"> & {
  public: Omit<PublicSchema, "Tables" | "Functions"> & {
    Tables: PublicSchema["Tables"] & {
      admission_applications: AdmissionsTable;
    };
    Functions: PublicSchema["Functions"] & {
      submit_admission_application: {
        Args: {
          p_first_name: string;
          p_last_name: string;
          p_date_of_birth: string;
          p_email: string;
          p_phone: string;
          p_program: string;
          p_intake_term: string;
          p_previous_school: string;
          p_personal_statement: string;
          p_tracking_token_hash: string;
        };
        Returns: string;
      };
      lookup_admission_status: {
        Args: {
          p_application_no: string;
          p_tracking_token: string;
        };
        Returns: ApplicationStatusResult[];
      };
    };
  };
};

export const admissionsSupabase = supabase as unknown as SupabaseClient<AdmissionsDatabase>;

export const admissionStatusLabels: Record<AdmissionStatus, string> = {
  submitted: "Submitted",
  under_review: "Under review",
  accepted: "Accepted",
  waitlisted: "Waitlisted",
  rejected: "Not accepted",
};

export function createTrackingToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function hashTrackingToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function isAdmissionsStaff(user: { app_metadata?: Record<string, unknown> } | null | undefined) {
  const role = user?.app_metadata?.admissions_role;
  return role === "admin" || role === "staff";
}

export function formatAdmissionDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
