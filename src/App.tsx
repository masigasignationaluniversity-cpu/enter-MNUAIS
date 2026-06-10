import { useEffect, useRef, useState, useCallback } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { routers } from "./router";
import { AppProvider, useApp } from "./contexts/AppContext";
import { GraduationCap, LogOut, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

// Suppress benign ResizeObserver loop errors (triggered by charts/dynamic layouts)
window.addEventListener('error', (e: ErrorEvent) => {
  if (
    e.message === 'ResizeObserver loop completed with undelivered notifications.' ||
    e.message === 'ResizeObserver loop limit exceeded'
  ) {
    e.stopImmediatePropagation();
  }
});

const queryClient = new QueryClient();
const router = createBrowserRouter(routers);

const IDLE_TIMEOUT_MS  = 30 * 60 * 1000;  // 30 minutes
const WARN_BEFORE_MS   = 2  * 60 * 1000;  // warn 2 min before

/** Monitors inactivity and auto-logs out the user after 30 minutes. */
function IdleLogout() {
  const { state, logout } = useApp();
  const isLoggedIn = !!state.currentUser;
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showWarn, setShowWarn] = useState(false);
  const [countdown, setCountdown] = useState(120);
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const doLogout = useCallback(async () => {
    setShowWarn(false);
    if (countRef.current) clearInterval(countRef.current);
    localStorage.setItem('ais_logout_reason', 'idle_timeout');
    await logout();
  }, [logout]);

  const resetTimer = useCallback(() => {
    if (!isLoggedIn) return;
    setShowWarn(false);
    if (countRef.current) { clearInterval(countRef.current); countRef.current = null; }
    if (timerRef.current) clearTimeout(timerRef.current);
    if (warnRef.current)  clearTimeout(warnRef.current);

    warnRef.current = setTimeout(() => {
      setShowWarn(true);
      setCountdown(120);
      countRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) { clearInterval(countRef.current!); return 0; }
          return prev - 1;
        });
      }, 1000);
    }, IDLE_TIMEOUT_MS - WARN_BEFORE_MS);

    timerRef.current = setTimeout(doLogout, IDLE_TIMEOUT_MS);
  }, [isLoggedIn, doLogout]);

  // Start/restart on login state change
  useEffect(() => {
    if (!isLoggedIn) {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warnRef.current)  clearTimeout(warnRef.current);
      if (countRef.current) clearInterval(countRef.current);
      setShowWarn(false);
      return;
    }
    resetTimer();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  // Listen for user activity
  useEffect(() => {
    if (!isLoggedIn) return;
    const EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    EVENTS.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    return () => EVENTS.forEach(e => window.removeEventListener(e, resetTimer));
  }, [isLoggedIn, resetTimer]);

  if (!isLoggedIn || !showWarn) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={resetTimer}
    >
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center space-y-5" onClick={e => e.stopPropagation()}>
        <div className="w-16 h-16 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto">
          <Clock size={28} className="text-destructive" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Session Expiring Soon</h2>
          <p className="text-muted-foreground text-sm mt-1">
            You have been inactive. You will be automatically logged out in:
          </p>
        </div>
        <div className="text-5xl font-mono font-bold text-destructive tabular-nums">
          {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
        </div>
        <p className="text-xs text-muted-foreground">
          Tap anywhere or press any key to stay logged in.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={resetTimer}>
            Stay Logged In
          </Button>
          <Button variant="destructive" className="flex-1 gap-1.5" onClick={doLogout}>
            <LogOut size={14} /> Log Out Now
          </Button>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const { authReady } = useApp();

  if (!authReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: 'var(--gradient-hero)' }}>
        <div className="w-16 h-16 rounded-2xl bg-primary-foreground/20 border border-primary-foreground/30 flex items-center justify-center animate-pulse">
          <GraduationCap size={28} className="text-primary-foreground" />
        </div>
        <p className="text-primary-foreground/70 text-sm font-medium">Loading...</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Toaster richColors position="top-right" />
      <IdleLogout />
      <RouterProvider router={router} />
    </TooltipProvider>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;

