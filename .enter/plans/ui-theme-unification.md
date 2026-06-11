# UI Theme Unification: Loading Screen + Dialog Polish

## Context
The app has a plain session-loading screen (simple pulse icon) and 21+ dialogs across the codebase that use bare `Dialog`/`AlertDialog` with no consistent styling — no backdrop blur, flat `rounded-lg` corners, and no intent-based visual hierarchy (warning vs danger vs confirm vs info).

The user wants:
1. A polished loading animation during session init
2. All pop-up warnings and confirmations improved app-wide with theme-consistent styling

## Approach

### Layer 1 — Base component upgrades (affects all 21 files instantly, zero per-file changes)
- **`src/components/ui/dialog.tsx`**: 
  - Overlay: `bg-black/80` → `bg-black/50 backdrop-blur-sm`
  - Content: `sm:rounded-lg` → `rounded-2xl`, upgrade shadow to `shadow-2xl`
- **`src/components/ui/alert-dialog.tsx`**: same overlay and rounding improvements

### Layer 2 — Reusable `AppDialog` component
New file: `src/components/ui/app-dialog.tsx`

Props:
```
intent: 'default' | 'warning' | 'danger' | 'success' | 'info'
icon: ReactNode (auto-provided per intent if omitted)
title: string
description: ReactNode
children: ReactNode (optional extra content like inputs)
confirmLabel: string (default "Confirm")
cancelLabel: string (default "Cancel")
onConfirm: () => void
disabled: boolean
open / onOpenChange
```

Visual structure:
- Colored accent strip across the top (gradient per intent)
- Icon badge centered below the strip
- Title + description + children
- Footer with cancel + confirm buttons (confirm button color matches intent)

Intent color map:
- `default` → primary (maroon gradient)
- `warning` → amber
- `danger` → destructive/red
- `success` → secondary (green)
- `info` → sky blue

### Layer 3 — Apply `AppDialog` to StudentEnlistment.tsx dialogs
Replace the 3 key dialogs with `AppDialog`:
1. Warning dialog ("Cannot Enlist") → `intent="danger"`
2. Bulk failures dialog → `intent="danger"`
3. Finalize enlistment confirmation → `intent="warning"`

Other dialogs (forms, filters, lookup) keep plain `Dialog` — they benefit from Layer 1.

### Layer 4 — Improved loading screen (App.tsx)
Replace the simple pulse icon with:
- Animated spinning ring (CSS conic-gradient animation on outer ring)
- Logo icon centered inside
- Shimmer text "Initializing..." with animated dot sequence  
- Subtle scale-in entry animation

### Layer 5 — Animation tokens
Add to `tailwind.config.ts`:
- `spin-ring`: custom keyframe for 1.4s conic rotation

Add to `index.css`:
- `@keyframes dot-bounce` for loading dots stagger

## Files to Modify
1. `src/App.tsx` — loading screen replacement
2. `src/components/ui/dialog.tsx` — base overlay + content improvements
3. `src/components/ui/alert-dialog.tsx` — same improvements
4. `src/components/ui/app-dialog.tsx` — NEW reusable component
5. `src/pages/student/StudentEnlistment.tsx` — apply AppDialog to 3 dialogs
6. `tailwind.config.ts` — add spin-ring keyframe
7. `src/index.css` — add dot-bounce keyframe

## Verification
- Visit the app before login — should see polished animated spinner
- Open any dialog (e.g., add user, filter) — should see blur backdrop, 2xl rounding
- In student enlistment, try to enlist a conflicting course → warning dialog should have red/danger themed header
- Click "Finalize Enlistment" → amber-themed confirmation dialog
