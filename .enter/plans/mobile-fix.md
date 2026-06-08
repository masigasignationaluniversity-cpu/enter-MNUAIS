# Mobile Interaction Fix Plan

## Root Cause Analysis

### Issue 1 (CRITICAL): Dual Idle Timers Block Mobile Interactions
The app has TWO idle logout systems running simultaneously:

- **App.tsx `IdleLogout`**: 5-minute timeout, warns at 4 minutes → shows `fixed inset-0 z-[9999] bg-black/50` overlay
- **PortalLayout.tsx**: 30-minute timeout, warns at 28 minutes → shows a Dialog

The App.tsx overlay fires after ONLY 4 MINUTES of inactivity. On mobile:
- Students reading the enlistment requirements for >4 min get a full-screen black overlay
- The overlay text says "Move your mouse or press any key" — desktop-centric
- The overlay blocks ALL touch interactions with the page content
- Students tap the screen, nothing responds → think the app is broken

### Issue 2: Missing Mobile CSS
- No `touch-action: manipulation` on buttons/inputs → 300ms tap delay on iOS
- No `-webkit-tap-highlight-color: transparent` → gray flash on tap

### Issue 3: Vercel Build Uses Development Mode
`"build": "NODE_ENV=development vite build --mode development"` is the default build script. Vercel runs this, producing a non-optimized dev bundle.

## Fixes

### Fix 1: Consolidate to ONE idle logout system (App.tsx only)
- **Remove all idle timeout code from `PortalLayout.tsx`**: delete the IDLE_MS/WARN_MS constants, `lastActivityRef`, `showIdleWarning`/`idleCountdown` state, `resetIdleTimer` callback, both idle useEffects, and the idle warning Dialog at the bottom of the JSX
- **Extend App.tsx timeout from 5 min to 30 min** (IDLE_TIMEOUT_MS = 30 * 60 * 1000)
- **Make overlay dismissable by tap**: add `onClick={resetTimer}` to the outer `fixed inset-0` div
- **Fix the warning text**: change "Move your mouse or press any key" to "Tap anywhere or press any key to stay logged in"

### Fix 2: Global mobile CSS in index.css
Add to `@layer base`:
```css
button, [role="button"], input, select, textarea, a {
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
```

### Fix 3: Add `buildCommand` to vercel.json  
Point Vercel to the production build command:
```json
{
  "buildCommand": "pnpm run build:prod",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

## Files to Modify

1. `src/App.tsx` — extend idle timeout to 30min, add onClick to overlay, fix text
2. `src/components/shared/PortalLayout.tsx` — remove entire duplicate idle timeout system
3. `src/index.css` — add global touch-action and tap highlight CSS
4. `vercel.json` — add buildCommand and outputDirectory
