import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error('Supabase server credentials are not configured.');
}

export const portalAdmin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export class PortalApiError extends Error {
  constructor(message: string, readonly statusCode: number) {
    super(message);
    this.name = 'PortalApiError';
  }
}

const optionalText = z.string().trim().max(500).optional();

export const invitationSchema = z.object({
  email: z.string().trim().email().max(254).transform(value => value.toLowerCase()),
  name: z.string().trim().min(2).max(160),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9._-]{2,31}$/),
  role: z.enum(['admin', 'ocs', 'faculty', 'student', 'department_head']),
  department: optionalText,
  college: optionalText,
  program: optionalText,
  yearLevel: z.number().int().min(1).max(12).optional(),
  studentNumber: optionalText,
  employeeId: optionalText,
  presentAddress: optionalText,
  presentAddressTel: optionalText,
  employer: optionalText,
  employerTel: optionalText,
  emergencyContact: optionalText,
  emergencyContactTel: optionalText,
  sex: optionalText,
  civilStatus: optionalText,
  countryOfCitizenship: optionalText,
  isEmployed: z.boolean().optional(),
  entranceCredential: optionalText,
  idNumber: optionalText,
  yearAdmitted: optionalText,
  lastSchoolAttended: optionalText,
  lastSchoolYear: optionalText,
  specialOrderNumber: optionalText,
  dateConferred: optionalText,
}).superRefine((user, context) => {
  const requiredByRole: Partial<Record<typeof user.role, Array<[keyof typeof user, string]>>> = {
    ocs: [['college', 'College is required for OCS users.']],
    faculty: [['college', 'College is required for faculty.'], ['department', 'Department is required for faculty.']],
    department_head: [['college', 'College is required for department heads.'], ['department', 'Department is required for department heads.']],
    student: [
      ['studentNumber', 'Student number is required.'],
      ['college', 'College is required for students.'],
      ['program', 'Degree program is required for students.'],
      ['presentAddress', 'Present address is required for students.'],
      ['presentAddressTel', 'Present address phone is required for students.'],
      ['emergencyContact', 'Emergency contact is required for students.'],
      ['emergencyContactTel', 'Emergency contact phone is required for students.'],
    ],
  };

  for (const [field, message] of requiredByRole[user.role] ?? []) {
    const value = user[field];
    if (!value || (typeof value === 'string' && !value.trim())) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: [field], message });
    }
  }
});

export type InvitationInput = z.infer<typeof invitationSchema>;

export function getRedirectUrl(request: VercelRequest) {
  const configuredRedirect = process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL;
  if (configuredRedirect) return configuredRedirect;

  const forwardedHost = request.headers['x-forwarded-host'];
  const host = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) || request.headers.host;
  if (!host) throw new PortalApiError('The invitation redirect is not configured.', 500);
  const protocol = host.startsWith('localhost') ? 'http' : 'https';
  return `${protocol}://${host}/auth/callback`;
}

export async function requireActiveAdmin(request: VercelRequest) {
  const authorization = request.headers.authorization;
  const token = typeof authorization === 'string' ? authorization.match(/^Bearer\s+(.+)$/i)?.[1] : undefined;
  if (!token) throw new PortalApiError('Sign in as an administrator to invite users.', 401);

  const { data: authData, error: authError } = await portalAdmin.auth.getUser(token);
  if (authError || !authData.user) throw new PortalApiError('Your session is invalid. Sign in again.', 401);

  const { data: profile, error: profileError } = await portalAdmin
    .from('portal_auth_profiles')
    .select('role, status')
    .eq('user_id', authData.user.id)
    .maybeSingle();

  if (profileError) throw new PortalApiError('Unable to verify administrator access.', 500);
  if (profile?.role !== 'admin' || profile.status !== 'active') {
    throw new PortalApiError('Only an active administrator can invite users.', 403);
  }

  return authData.user;
}

export async function getActiveAdminCount() {
  const { count, error } = await portalAdmin
    .from('portal_auth_profiles')
    .select('user_id', { count: 'exact', head: true })
    .eq('role', 'admin')
    .eq('status', 'active');

  if (error) throw new PortalApiError('Unable to verify initial administrator setup.', 500);
  return count ?? 0;
}

function invitationError(error: { code?: string; message?: string }) {
  const message = (error.message || '').toLowerCase();
  if (error.code === 'email_exists' || message.includes('already registered') || message.includes('already been registered')) {
    return new PortalApiError('An account with this email already exists. Ask an administrator to review the account.', 409);
  }
  return new PortalApiError('The invitation could not be sent. Check email delivery configuration and try again.', 502);
}

export async function createInvitedUser(input: InvitationInput, request: VercelRequest) {
  const { data: usernameMatch, error: usernameError } = await portalAdmin
    .from('portal_auth_profiles')
    .select('user_id')
    .eq('username', input.username)
    .maybeSingle();

  if (usernameError) throw new PortalApiError('Unable to verify the requested username.', 500);
  if (usernameMatch) throw new PortalApiError('That username is already in use.', 409);

  const { data: invitation, error: inviteError } = await portalAdmin.auth.admin.inviteUserByEmail(input.email, {
    redirectTo: getRedirectUrl(request),
    data: {
      username: input.username,
      display_name: input.name,
    },
  });

  if (inviteError || !invitation.user) {
    throw invitationError(inviteError || { message: 'Invitation returned no user.' });
  }

  const userId = invitation.user.id;

  try {
    const { error: portalProfileError } = await portalAdmin
      .from('portal_auth_profiles')
      .upsert({
        user_id: userId,
        username: input.username,
        display_name: input.name,
        email: input.email,
        role: input.role,
        status: 'active',
      }, { onConflict: 'user_id' });

    if (portalProfileError) throw new PortalApiError('Unable to create the portal account profile.', 500);

    const { data: passwordHash, error: hashError } = await portalAdmin.rpc('hash_password', {
      p_password: randomBytes(48).toString('base64url'),
    });
    if (hashError || typeof passwordHash !== 'string') {
      throw new PortalApiError('Unable to prepare the account profile.', 500);
    }

    const { error: profileError } = await portalAdmin.rpc('create_profile_admin', {
      p_id: userId,
      p_local_id: userId,
      p_username: input.username,
      p_role: input.role,
      p_name: input.name,
      p_email: input.email,
      p_contact_email: input.email,
      p_department: input.department || null,
      p_college: input.college || null,
      p_program: input.program || null,
      p_year_level: input.yearLevel ?? null,
      p_student_number: input.studentNumber || null,
      p_employee_id: input.employeeId || null,
      p_password_hash: passwordHash,
    });
    if (profileError) throw new PortalApiError('Unable to create the account profile.', 500);

    const { error: extraFieldsError } = await portalAdmin.from('profiles').update({
      present_address: input.presentAddress || null,
      present_address_tel: input.presentAddressTel || null,
      employer: input.employer || null,
      employer_tel: input.employerTel || null,
      emergency_contact: input.emergencyContact || null,
      emergency_contact_tel: input.emergencyContactTel || null,
      sex: input.sex || null,
      civil_status: input.civilStatus || null,
      country_of_citizenship: input.countryOfCitizenship || 'Philippines',
      is_employed: input.isEmployed ?? false,
      entrance_credential: input.entranceCredential || null,
      id_number: input.idNumber || null,
      year_admitted: input.yearAdmitted || null,
      last_school_attended: input.lastSchoolAttended || null,
      last_school_year: input.lastSchoolYear || null,
      special_order_number: input.specialOrderNumber || null,
      date_conferred: input.dateConferred || null,
    }).eq('local_id', userId);

    if (extraFieldsError) throw new PortalApiError('Unable to save additional account details.', 500);
  } catch (error) {
    await portalAdmin.auth.admin.deleteUser(userId);
    throw error;
  }
}

export function sendApiError(response: VercelResponse, error: unknown) {
  if (error instanceof PortalApiError) {
    return response.status(error.statusCode).json({ error: error.message });
  }
  return response.status(500).json({ error: 'The request could not be completed. Try again later.' });
}
