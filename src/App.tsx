import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Dashboard from "./pages/Dashboard";
import Diagnosis from "./pages/Diagnosis";
import Tips from "./pages/Tips";
import Progress from "./pages/Progress";
import NotFound from "./pages/NotFound";
import Onboarding from "./pages/Onboarding";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import Routine from "./pages/Routine";
import Signup from "./pages/Signup";
import BottomNav from "./components/BottomNav";
import PricingValueScreen from "./pages/PricingValueScreen";
import PricingPlanScreen from "./pages/PricingPlanScreen";
import RoutineSetupOnboarding from "./pages/RoutineSetupOnboarding";
import ResetPassword from "./pages/ResetPassword";

import DailyCheckin from "./pages/DailyCheckin";
import RGPD from "./pages/RGPD";
import StravaConnect from "./pages/StravaConnect";
import Callback from "./pages/Callback";
import PassportPreview from "./features/passport/pages/PassportPreview";
import PassportScreen2 from "./features/passport/pages/PassportScreen2";
import PassportScreen3 from "./features/passport/pages/PassportScreen3";
import PassportScreen4 from "./features/passport/pages/PassportScreen4";
import PassportScreen5 from "./features/passport/pages/PassportScreen5";



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

  const isGuest = localStorage.getItem('guestProfile') !== null;

  if (!session && !isGuest) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

const PublicOnlyGuard = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (session) {
        const { data } = await supabase
          .from('profiles')
          .select('skin_goals')
          .eq('id', session.user.id)
          .single();

        const profile = data as any;
        const complete = !!(profile && profile.skin_goals && profile.skin_goals.length > 0);
        setIsProfileComplete(complete);
      }
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="h-screen flex items-center justify-center bg-background"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  // If guest exists, redirect away from public pages to dashboard
  const isGuest = localStorage.getItem('guestProfile') !== null;
  if (!session && isGuest && (location.pathname === "/onboarding" || location.pathname === "/login" || location.pathname === "/signup")) {
    return <Navigate to="/dashboard" replace />;
  }

  // If connected and profile is complete, redirect to dashboard
  if (session && isProfileComplete) {
    return <Navigate to="/dashboard" replace />;
  }

  // If connected but profile incomplete, allow only /signup
  if (session && !isProfileComplete && !location.pathname.startsWith('/signup')) {
    return <Navigate to="/signup" replace />;
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
          <Route path="/" element={<Navigate to="/onboarding" replace />} />
          <Route path="/dashboard" element={<AuthGuard><Dashboard /></AuthGuard>} />
          <Route path="/diagnosis" element={<AuthGuard><Diagnosis /></AuthGuard>} />
          <Route path="/tips" element={<AuthGuard><Tips /></AuthGuard>} />
          <Route path="/progress" element={<AuthGuard><Progress /></AuthGuard>} />
          <Route path="/profile" element={<AuthGuard><Profile /></AuthGuard>} />
          <Route path="/routine" element={<AuthGuard><Routine /></AuthGuard>} />
          <Route path="/setup-routine" element={<AuthGuard><RoutineSetupOnboarding /></AuthGuard>} />

          <Route path="/onboarding" element={<PublicOnlyGuard><Onboarding /></PublicOnlyGuard>} />
          <Route path="/login" element={<PublicOnlyGuard><Login /></PublicOnlyGuard>} />
          <Route path="/signup" element={<PublicOnlyGuard><Signup /></PublicOnlyGuard>} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/strava-connect" element={<StravaConnect />} />
          <Route path="/callback" element={<Callback />} />
          <Route path="/rgpd" element={<RGPD />} />
          
          <Route path="/passport/preview" element={<AuthGuard><PassportPreview /></AuthGuard>} />
          <Route path="/passport/symptoms" element={<AuthGuard><PassportScreen2 /></AuthGuard>} />
          <Route path="/passport/factors" element={<AuthGuard><PassportScreen3 /></AuthGuard>} />
          <Route path="/passport/visual" element={<AuthGuard><PassportScreen4 /></AuthGuard>} />
          <Route path="/passport/details" element={<AuthGuard><PassportScreen5 /></AuthGuard>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
        <BottomNav />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
