# Forgot Password / Password Reset Ticket Feature

## Overview
Users who forget their password submit a ticket from the login page. Admin sees all tickets, sets a new password to resolve each one. The user then checks their ticket status and sees the new password assigned by the admin.

---

## 1. Database Migration

**New table: `password_reset_tickets`**
```sql
CREATE TABLE password_reset_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',  -- 'pending' | 'resolved'
  new_password text,                        -- plain text; set by admin on resolve
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);
ALTER TABLE password_reset_tickets ENABLE ROW LEVEL SECURITY;
-- Anyone can insert (submit a ticket) — no auth needed
CREATE POLICY "Anyone can submit" ON password_reset_tickets FOR INSERT WITH CHECK (true);
-- Public can read (for status check on login page)
CREATE POLICY "Anyone can read own" ON password_reset_tickets FOR SELECT USING (true);
-- Only service_role can update (done via edge function or RPC)
```

---

## 2. AppContext additions

**Interface additions (line ~30):**
```typescript
submitPasswordResetTicket: (username: string) => Promise<{ id: string }>;
checkPasswordResetTicket: (username: string) => Promise<{ status: string; newPassword: string | null } | null>;
getPasswordResetTickets: () => Promise<PasswordResetTicket[]>;
resolvePasswordResetTicket: (ticketId: string, newPassword: string, username: string) => Promise<void>;
```

**Type added to `src/lib/types.ts`:**
```typescript
export interface PasswordResetTicket {
  id: string;
  username: string;
  name: string;
  status: 'pending' | 'resolved';
  newPassword?: string;
  createdAt: string;
  resolvedAt?: string;
}
```

**Implementations:**
- `submitPasswordResetTicket(username)`: Query profiles to get name; insert row into `password_reset_tickets`
- `checkPasswordResetTicket(username)`: Select most recent ticket for username; return `{ status, newPassword }` or null
- `getPasswordResetTickets()`: Select all tickets ordered by `created_at desc`
- `resolvePasswordResetTicket(ticketId, newPassword, username)`:
  1. Update `password_reset_tickets` set status='resolved', new_password=newPassword, resolved_at=now() where id=ticketId
  2. Call `supabase.rpc('update_user_password', { p_username: username, p_password: newPassword })` — new RPC that does `UPDATE profiles SET password_hash = crypt(p_password, gen_salt('bf')) WHERE username = p_username`

---

## 3. New DB Function

```sql
CREATE OR REPLACE FUNCTION update_user_password(p_username text, p_password text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles SET password_hash = crypt(p_password, gen_salt('bf'))
  WHERE username = p_username;
END;
$$;
```

---

## 4. Login.tsx changes

Add below the Sign In button:
- `"Forgot password?"` text button → opens `ForgotPasswordModal`

**`ForgotPasswordModal` (new component, same file or separate):**
- **Tab 1 — Submit Request**: Username input + "Submit" button. On success: "Your request has been submitted. Please check back later for your new password."
- **Tab 2 — Check Status**: Username input + "Check" button. Shows:
  - Pending: "Your request is pending. Please wait for admin approval."
  - Resolved: "Your new password is: **[password]**. Please log in and change it."

---

## 5. New Admin Page: `AdminPasswordTickets.tsx`

Route: `/admin/password-tickets`

**Features:**
- Table of tickets: Name, Username, Status badge, Date
- Filter: All / Pending / Resolved
- Pending count badge on nav item
- Click row → resolve dialog: input for new password + "Set Password & Resolve" button

---

## 6. Router + Nav updates

**`src/router.tsx`:** Add `import AdminPasswordTickets` + route `{ path: "/admin/password-tickets", element: <AdminPasswordTickets /> }`

**`src/components/shared/PortalLayout.tsx`:** Add nav item to admin array:
```typescript
{ label: 'Password Tickets', path: '/admin/password-tickets', icon: <KeyRound size={16} /> }
```

---

## Files to modify
1. `supabase/migrations/` — new migration for `password_reset_tickets` table + `update_user_password` function
2. `src/lib/types.ts` — add `PasswordResetTicket` interface
3. `src/contexts/AppContext.tsx` — add 4 new functions
4. `src/pages/Login.tsx` — add forgot password modal
5. `src/pages/admin/AdminPasswordTickets.tsx` — **new file**
6. `src/router.tsx` — add new route
7. `src/components/shared/PortalLayout.tsx` — add nav item

---

## Verification
- Submit a ticket from login page with a valid username → ticket appears in admin portal
- Invalid username → error shown in modal
- Admin opens ticket, enters new password, clicks resolve → ticket status changes to resolved
- User checks ticket status → sees new password
- User logs in with new password → success
