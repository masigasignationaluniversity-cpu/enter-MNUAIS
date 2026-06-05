import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { routers } from "./router";
import { AppProvider, useApp } from "./contexts/AppContext";
import { GraduationCap } from "lucide-react";

const queryClient = new QueryClient();
const router = createBrowserRouter(routers);

// Apply dark mode from localStorage before first paint
const saved = localStorage.getItem('theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
if (saved === 'dark' || (!saved && prefersDark)) {
  document.documentElement.classList.add('dark');
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
