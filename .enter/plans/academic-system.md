# Google SSO Plan

## Context
Add "Sign in with Google" to the login page. Users whose Gmail is stored in the `email` field of their profile (set by admin) can authenticate via Google OAuth. The app uses a **custom auth system** (not Supabase Auth), so Google OAuth is used only to verify the email — then we bridge to the existing custom session mechanism.

## Approach

### How it works
1. User clicks "Sign in with Google" → `supabase.auth.signInWithOAuth({ provider: 'google' })` → redirected to Google
2. Google redirects back → Supabase Auth captures the token from URL hash → fires `onAuthStateChange`
3. App extracts `session.user.email`, queries `profiles` table for `email = googleEmail`
4. If match found → create custom session (same flow as `login()`) → sign out from Supabase Auth (only needed for email verification)
5. If no match → store error in `sessionStorage`, show on login page

### Requirement: Google OAuth must be enabled in the Supabase dashboard
The user must configure `Google` as an Auth provider in their Supabase project settings (Auth → Providers → Google), providing a Google Cloud OAuth Client ID & Secret.

---

## Files to modify

### 1. `src/contexts/AppContext.tsx`
- Add `loginWithGoogle: () => Promise<void>` to interface (line ~28)
- Add `loginWithGoogle` implementation using `supabase.auth.signInWithOAuth`
- Update mount `useEffect` (line ~438): add `else` branch for when `state.currentUser` is null — checks `supabase.auth.getSession()` for Google OAuth callback, processes it by:
  - Signing out of Supabase Auth
  - Querying `profiles` by email (case-insensitive)
  - Creating custom session token (same as `login()`)
  - Loading all data (`loadSections`, etc.)
  - Storing `sso_error` in `sessionStorage` if email not found
- Export `loginWithGoogle` in context value

### 2. `src/pages/Login.tsx`
- Import `loginWithGoogle` from `useApp()`
- On mount: read `sessionStorage.getItem('sso_error')` and display as error, then clear it
- Add Google sign-in button below the form (with divider "or")
- Show loading state while Google OAuth redirects

### 3. `src/pages/admin/AdminUsers.tsx`
- Update Email field label to clarify: "Email (used for Google SSO login)"

---

## Key reuse
- `profileToUser()` (line 8, AppContext) — reuse to map profile to User
- `saveCurrentUser()` (store.ts) — reuse for persisting user
- `SESSION_KEY`, `sessionRef` — reuse existing session mechanism
- `loadSections/Courses/Enrollments/Grades/Prerogatives/AppSettings` — reuse post-login data loads
- `roleRedirects` map (Login.tsx) — reuse for post-SSO navigation

---

## Verification
1. Admin creates a user with their Gmail in the Email field
2. User clicks "Sign in with Google" on login page
3. Google OAuth flow completes → user is logged in and redirected to their portal
4. If Gmail not registered → error shown on login page
5. If Google OAuth not configured in Supabase → graceful error message
