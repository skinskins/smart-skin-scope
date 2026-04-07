import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Dashboard from "./pages/Dashboard";
import Diagnosis from "./pages/Diagnosis";
import Tips from "./pages/Tips";
import Progress from "./pages/Progress";
import NotFound from "./pages/NotFound";
import Onboarding from "./pages/Onboarding";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import BottomNav from "./components/BottomNav";
import PostSignup from "./pages/PostSignup";
import RoutineSetupOnboarding from "./pages/RoutineSetupOnboarding";

import DailyCheckin from "./pages/DailyCheckin";

const queryClient = new QueryClient();

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="h-screen flex items-center justify-center bg-background"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!session) {
    return <Navigate to="/onboarding" />;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AuthGuard><Dashboard /></AuthGuard>} />
          <Route path="/checkin" element={<AuthGuard><DailyCheckin /></AuthGuard>} />
          <Route path="/diagnosis" element={<AuthGuard><Diagnosis /></AuthGuard>} />
          <Route path="/tips" element={<AuthGuard><Tips /></AuthGuard>} />
          <Route path="/progress" element={<AuthGuard><Progress /></AuthGuard>} />
          <Route path="/post-signup" element={<AuthGuard><PostSignup /></AuthGuard>} />
          <Route path="/setup-routine" element={<AuthGuard><RoutineSetupOnboarding /></AuthGuard>} />

          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <BottomNav />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
