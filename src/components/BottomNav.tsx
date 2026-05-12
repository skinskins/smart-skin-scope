import { Home, Stethoscope, Sparkles, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const tabs = [
  { path: "/dashboard", icon: Home, label: "Accueil" },
  { path: "/routine", icon: Sparkles, label: "Routine" },
  { path: "/diagnosis", icon: Stethoscope, label: "Diagnostic" },
  { path: "/profile", icon: User, label: "Profil" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const hiddenRoutes = ["/onboarding", "/login", "/signup", "/checkin", "/post-signup", "/setup-routine", "/rgpd", "/", "/reset-password", "/callback", "/strava-connect", "/pricing-value", "/pricing-plan"];
  if (hiddenRoutes.includes(location.pathname)) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-xl border-t border-border z-50">
      <div className="max-w-lg mx-auto flex items-center justify-around py-2 px-4">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all ${isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <tab.icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className="text-[11px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
