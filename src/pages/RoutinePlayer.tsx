import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { type RoutineProduct } from "@/hooks/useRoutineProducts";
import { FactorsModal } from "@/components/FactorsModal";
import { supabase } from "@/integrations/supabase/client";

type Step = RoutineProduct & {
  order: number;
  durationMin: number;
};

const TYPE_ORDER: Record<string, number> = {
  "démaquillant": 1, "makeup remover": 1, "makeup_remover": 1, "démaquillage": 1,
  "nettoyant": 2, "cleanser": 2, "gel nettoyant": 2,
  "tonique": 3, "toner": 3, "eau tonique": 3, "lotion tonique": 3,
  "sérum": 4, "serum": 4,
  "contour yeux": 5, "eye cream": 5, "eye_cream": 5, "soin contour yeux": 5,
  "hydratant": 6, "moisturizer": 6, "crème hydratante": 6, "crème": 6,
  "huile": 7, "oil": 7, "face oil": 7, "huile visage": 7,
  "spf": 8, "solaire": 8, "sunscreen": 8, "protection solaire": 8,
};

const TYPE_DURATION: Record<string, number> = {
  "démaquillant": 2, "makeup remover": 2, "makeup_remover": 2, "démaquillage": 2,
  "nettoyant": 1, "cleanser": 1, "gel nettoyant": 1,
  "tonique": 1, "toner": 1, "eau tonique": 1, "lotion tonique": 1,
  "sérum": 3, "serum": 3,
  "contour yeux": 2, "eye cream": 2, "eye_cream": 2, "soin contour yeux": 2,
  "hydratant": 2, "moisturizer": 2, "crème hydratante": 2, "crème": 2,
  "huile": 2, "oil": 2, "face oil": 2, "huile visage": 2,
  "spf": 1, "solaire": 1, "sunscreen": 1, "protection solaire": 1,
};

const getOrder = (type: string | null): number =>
  type ? (TYPE_ORDER[type.toLowerCase().trim()] ?? 99) : 99;

const getDuration = (type: string | null): number =>
  type ? (TYPE_DURATION[type.toLowerCase().trim()] ?? 2) : 2;

const fmt = (s: number | null) => {
  if (s === null) return "0:00";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const RoutinePlayer = () => {
  const navigate = useNavigate();
  const isMorning = new Date().getHours() < 18;
  const [currentStep, setCurrentStep] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [completed, setCompleted] = useState(false);
  const [showFactorsModal, setShowFactorsModal] = useState(false);
  const [checkinAlreadyFilled, setCheckinAlreadyFilled] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const alarmFiredRef = useRef(false);
  const goNextRef = useRef<() => Promise<void>>();
  const [steps, setSteps] = useState<Step[]>([]);
  const [stepsReady, setStepsReady] = useState(false);
  const loading = !stepsReady;


  // Initialisation séquentielle : daily_routine_log → fallback user_products
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setStepsReady(true); return; }

      const today = new Date().toISOString().split("T")[0];
      const period = isMorning ? "morning" : "evening";

      // Priorité : routine générée par DailyConversation
      const { data: logData } = await (supabase as any)
        .from("daily_routine_log")
        .select("product_ids")
        .eq("user_id", session.user.id)
        .eq("date", today)
        .eq("period", period)
        .maybeSingle();

      if (logData?.product_ids?.length > 0) {
        const { data: products } = await (supabase as any)
          .from("user_products")
          .select("id, product_name, brand, product_type, photo_url, morning_use, evening_use, frequency, ingredients")
          .in("id", logData.product_ids);
        const hydrated: Step[] = (products ?? [])
          .map((p: any) => ({ ...p, order: getOrder(p.product_type), durationMin: getDuration(p.product_type) }))
          .sort((a: Step, b: Step) => a.order - b.order);
        setSteps(hydrated);
        setStepsReady(true);
        return;
      }

      // Fallback : produits quotidiens habituels
      const { data: fallback } = await (supabase as any)
        .from("user_products")
        .select("id, product_name, brand, product_type, photo_url, morning_use, evening_use, frequency, ingredients")
        .eq("user_id", session.user.id)
        .eq(isMorning ? "morning_use" : "evening_use", true)
        .eq("frequency", "daily");
      const fallbackSteps: Step[] = (fallback ?? [])
        .map((p: any) => ({ ...p, order: getOrder(p.product_type), durationMin: getDuration(p.product_type) }))
        .sort((a: Step, b: Step) => a.order - b.order);
      setSteps(fallbackSteps);
      setStepsReady(true);
    };
    init();
  }, []); // eslint-disable-line

  useEffect(() => {
    if (stepsReady && steps.length > 0 && timeLeft === null) {
      setTimeLeft(steps[0].durationMin * 60);
    }
  }, [stepsReady, steps, timeLeft]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (completed || steps.length === 0 || timeLeft === null || timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft(t => t !== null ? Math.max(0, t - 1) : null), 1000);
    return () => clearInterval(id);
  }, [timeLeft, completed, steps.length]);

  useEffect(() => { goNextRef.current = goNext; });

  useEffect(() => {
    alarmFiredRef.current = false;
    setWarningMessage(null);
  }, [currentStep]);

  useEffect(() => {
    if (completed || steps.length === 0 || timeLeft === null) return;
    if (timeLeft === 0) { goNextRef.current?.(); return; }
    if (timeLeft === 20 && !alarmFiredRef.current) {
      alarmFiredRef.current = true;
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      setWarningMessage("Prochaine étape dans 20s");
      const id = setTimeout(() => setWarningMessage(null), 5000);
      return () => clearTimeout(id);
    }
  }, [timeLeft, completed, steps.length]);

  const goToNextCompletionStep = () => {
    if (!checkinAlreadyFilled) setShowFactorsModal(true);
    else navigate("/dashboard");
  };

  const goNext = async () => {
    if (currentStep < steps.length - 1) {
      const next = currentStep + 1;
      setCurrentStep(next);
      setTimeLeft(steps[next].durationMin * 60);
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const today = new Date().toISOString().split("T")[0];
        await (supabase as any).from("routine_logs").upsert(
          { user_id: session.user.id, date: today, [isMorning ? "morning_routine_done" : "evening_routine_done"]: true },
          { onConflict: "user_id,date" }
        );
        const { data: checkin } = await (supabase as any)
          .from("daily_checkins")
          .select("user_id")
          .eq("user_id", session.user.id)
          .eq("date", today)
          .maybeSingle();
        setCheckinAlreadyFilled(!!checkin);
      }
      setCompleted(true);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#F0EBE3]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (steps.length === 0) {
    return (
      <div className="min-h-screen bg-[#F0EBE3] flex flex-col items-center justify-center px-6 text-center">
        <p className="text-lg font-display text-foreground mb-2">Aucun produit du {isMorning ? "matin" : "soir"}</p>
        <p className="text-sm text-muted-foreground mb-8">
          Ajoute des produits à ta routine du soir dans la Vanity.
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          className="h-12 px-8 bg-primary text-primary-foreground rounded-full font-bold text-sm"
        >
          Retour
        </button>
      </div>
    );
  }

  // ── Completion screen ──────────────────────────────────────────────────────

  if (completed) {
    return (
      <>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="min-h-screen bg-[#F0EBE3] flex flex-col items-center justify-center px-6 text-center"
        >
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-8"
          >
            <Check size={44} strokeWidth={2} className="text-primary" />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <h2 className="text-3xl font-display text-foreground mb-3">Routine terminée</h2>
            <p className="text-base text-muted-foreground mb-10 leading-relaxed">
              {isMorning ? "Belle journée ✨ Ta peau te remercie." : "Bonne nuit ✨ Ta perle de demain se prépare."}
            </p>
          </motion.div>

          <motion.button
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            onClick={goToNextCompletionStep}
            className="w-full max-w-xs h-14 bg-primary text-primary-foreground rounded-2xl font-bold text-sm tracking-wide"
          >
            Continuer
          </motion.button>
        </motion.div>
        <FactorsModal
          open={showFactorsModal}
          onClose={() => { setShowFactorsModal(false); navigate("/dashboard"); }}
          onSaved={() => { setShowFactorsModal(false); navigate("/dashboard"); }}
        />
      </>
    );
  }

  // ── Player ─────────────────────────────────────────────────────────────────

  const step = steps[currentStep];
  const timerProgress = timeLeft !== null && step ? timeLeft / (step.durationMin * 60) : 1;
  const totalMin = steps.reduce((acc, s) => acc + s.durationMin, 0);

  return (
    <div className="min-h-screen bg-[#F0EBE3] flex flex-col max-w-lg mx-auto">

      <div className="px-5 pt-12 pb-4 flex items-center gap-3">
        <button
          onClick={(e) => { e.stopPropagation(); navigate("/dashboard"); }}
          className="w-9 h-9 rounded-full bg-white/70 flex items-center justify-center"
        >
          <ArrowLeft size={18} strokeWidth={2} className="text-foreground" />
        </button>
        <p className="flex-1 text-xs text-muted-foreground font-medium uppercase tracking-widest">
          Routine du {isMorning ? "matin" : "soir"}
        </p>
        <p className="text-xs text-muted-foreground">{totalMin} min</p>
      </div>

      <div className="px-5 mb-6">
        <div className="h-1 bg-white/50 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <p className="text-[11px] text-muted-foreground">
            Étape {currentStep + 1}/{steps.length}
          </p>
          <p className="text-[11px] text-muted-foreground">{step.durationMin} min</p>
        </div>
      </div>

      <div className="flex-1 px-5 flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-3xl p-8 flex flex-col items-center text-center flex-1 justify-center"
          >
            {step.product_type && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4 bg-muted/20 px-3 py-1 rounded-full">
                {step.product_type}
              </span>
            )}

            <h2 className="text-2xl font-display text-foreground mb-1 leading-tight">
              {step.product_name}
            </h2>
            {step.brand && (
              <p className="text-sm text-muted-foreground mb-6">{step.brand}</p>
            )}

            {warningMessage && (
              <p className="text-xs text-muted-foreground mb-4 px-4 py-1.5 bg-muted/20 rounded-full">
                {warningMessage}
              </p>
            )}

            <div className="relative w-36 h-36 mb-8">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="#F0EBE3" strokeWidth="6" />
                <motion.circle
                  cx="60" cy="60" r={RADIUS}
                  fill="none"
                  stroke="#2C1810"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={CIRCUMFERENCE * (1 - timerProgress)}
                  transition={{ duration: 1, ease: "linear" }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold text-foreground">{fmt(timeLeft)}</span>
              </div>
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              className="w-full h-14 bg-primary text-primary-foreground rounded-2xl font-bold text-sm tracking-wide flex items-center justify-center gap-2"
            >
              {currentStep < steps.length - 1 ? (
                <>Étape suivante <ChevronRight size={18} /></>
              ) : (
                <>Terminer la routine <Check size={18} /></>
              )}
            </button>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="h-10" />
    </div>
  );
};

export default RoutinePlayer;
