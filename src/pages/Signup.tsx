import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Replaced by OnboardingFlow — redirects /signup → /onboarding
export default function Signup() {
  const navigate = useNavigate();
  useEffect(() => { navigate("/onboarding", { replace: true }); }, [navigate]);
  return null;
}
