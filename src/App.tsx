import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { useEffect } from "react";
import { routers } from "./router";
import { AppProvider, useApp } from "./contexts/AppContext";
import { supabase } from "./integrations/supabase/client";
import { GraduationCap } from "lucide-react";

const queryClient = new QueryClient();
const router = createBrowserRouter(routers);

function AppContent() {
  const { authReady } = useApp();

  // Ensure admin password is set via Supabase Admin API on app startup
  useEffect(() => {
    supabase.functions.invoke('reset-admin-password').catch(() => {
      // silent — will retry on next load if needed
    });
  }, []);

  if (!authReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: 'var(--gradient-hero)' }}>
        <div className="w-16 h-16 rounded-2xl bg-primary-foreground/20 border border-primary-foreground/30 flex items-center justify-center animate-pulse">
          <GraduationCap size={28} className="text-primary-foreground" />
        </div>
        <p className="text-primary-foreground/70 text-sm font-medium">Loading Academic Information System...</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <RouterProvider router={router} />
    </TooltipProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppProvider>
      <AppContent />
    </AppProvider>
  </QueryClientProvider>
);

export default App;
