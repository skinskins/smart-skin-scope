import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

// Meme liste que BottomNav.tsx — la bulle ne doit apparaitre que sur les ecrans principaux
// de l'app, jamais pendant l'onboarding, l'auth, ou un flow deja focus sur le check-in.
const HIDDEN_ROUTES = [
  "/onboarding", "/login", "/signup", "/checkin", "/post-signup", "/setup-routine",
  "/rgpd", "/about", "/", "/reset-password", "/callback", "/strava-connect",
  "/routine-player", "/daily-conversation", "/weekly-plan", "/onboarding/factors", "/profile/feedback",
];

// Temps avant repli automatique en icone seule — assez long pour se faire lire, assez
// court pour ne pas gener la lecture du reste de l'ecran.
const COLLAPSE_DELAY_MS = 4500;

const toLocalISODate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const DailyCheckinBubble = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // null = pas encore verifie (on ne montre rien pour eviter un flash), false = a repondre,
  // true = deja repondu aujourd'hui.
  const [checkinDone, setCheckinDone] = useState<boolean | null>(null);
  const [expanded, setExpanded] = useState(true);
  const collapseTimer = useRef<ReturnType<typeof setTimeout>>();

  const checkTodayCheckin = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { setCheckinDone(null); return; }
    const today = toLocalISODate(new Date());
    const { data } = await (supabase as any)
      .from("daily_checkins")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("date", today)
      .maybeSingle();
    setCheckinDone(!!data);
  }, []);

  // Re-verifie a chaque changement de page : couvre le retour depuis /daily-conversation
  // (bulle qui disparait juste apres avoir repondu) sans dependre d'un evenement dedie.
  useEffect(() => { checkTodayCheckin(); }, [checkTodayCheckin, location.pathname]);

  // Se depeplie (avec son intitule) a chaque fois qu'elle redevient pertinente, puis se
  // replie en icone seule au bout de quelques secondes — le sens n'est explicite qu'a
  // l'apparition, pas en permanence.
  useEffect(() => {
    if (checkinDone !== false) return;
    setExpanded(true);
    collapseTimer.current = setTimeout(() => setExpanded(false), COLLAPSE_DELAY_MS);
    return () => clearTimeout(collapseTimer.current);
  }, [checkinDone, location.pathname]);

  if (checkinDone !== false) return null;
  if (HIDDEN_ROUTES.includes(location.pathname) || location.pathname.startsWith("/passport")) return null;

  return (
    <motion.button
      layout
      onClick={() => navigate("/daily-conversation")}
      aria-label="Répondre au check-in du jour pour affiner tes conseils"
      initial={{ opacity: 0, y: 12, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className="fixed bottom-24 right-4 z-40 flex items-center gap-2 rounded-full bg-primary text-primary-foreground premium-shadow py-3.5 pl-3.5 pr-3.5 transition-transform active:scale-95"
    >
      <span className="relative shrink-0 flex items-center justify-center w-[22px] h-[22px]">
        <MessageCircle size={22} strokeWidth={2} />
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-white ring-2 ring-primary" />
      </span>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.span
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "auto", opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden whitespace-nowrap text-[12.5px] font-semibold pr-0.5"
          >
            Check-in du jour
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

export default DailyCheckinBubble;
