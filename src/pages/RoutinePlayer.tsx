import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRoutineProducts, type RoutineProduct } from "@/hooks/useRoutineProducts";
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

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const FACTORS = [
  { category: "Alimentation",          pills: ["Sucré/gras", "Alcool", "Peu d'eau"] },
  { category: "Stress & sommeil",      pills: ["Stress élevé", "Mauvaise nuit"] },
  { category: "Corps & environnement", pills: ["Sport intense", "Médicament", "Voyage", "Exposition solaire"] },
];

const RoutinePlayer = () => {
  const navigate = useNavigate();
  const { morning, evening, loading } = useRoutineProducts();
  const [currentStep, setCurrentStep] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [completionStep, setCompletionStep] = useState<1 | 2 | 3>(1);
  const [selectedFactors, setSelectedFactors] = useState<Set<string>>(new Set());
  const [factorsSaved, setFactorsSaved] = useState(false);
  const [checkinAlreadyFilled, setCheckinAlreadyFilled] = useState(false);

  const steps = useMemo<Step[]>(() =>
    evening
      .filter(p => p.frequency === "daily")
      .map(p => ({ ...p, order: getOrder(p.product_type), durationMin: getDuration(p.product_type) }))
      .sort((a, b) => a.order - b.order),
    [evening]
  );

  const morningSteps = useMemo(() =>
    morning
      .filter(p => p.frequency === "daily")
      .map(p => ({ ...p, order: getOrder(p.product_type), durationMin: getDuration(p.product_type) }))
      .sort((a, b) => a.order - b.order),
    [morning]
  );
  const totalMorningMin = morningSteps.reduce((acc, s) => acc + s.durationMin, 0);

  const toggleFactor = (pill: string) => {
    setSelectedFactors(prev => {
      const next = new Set(prev);
      if (next.has(pill)) next.delete(pill); else next.add(pill);
      return next;
    });
  };

  const saveFactors = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setCompletionStep(3); return; }
    const today = new Date().toISOString().split("T")[0];
    await (supabase as any).from("daily_checkins").upsert(
      {
        user_id:         session.user.id,
        date:            today,
        food_quality:    selectedFactors.has("Sucré/gras")   ? "Grasses / Sucrées" : null,
        alcohol_drinks:  selectedFactors.has("Alcool")        ? 1                   : null,
        water_glasses:   selectedFactors.has("Peu d'eau")     ? 2                   : null,
        stress_level:    selectedFactors.has("Stress élevé")  ? 4                   : null,
        sleep_hours:     selectedFactors.has("Mauvaise nuit") ? 5                   : null,
        did_sport:       selectedFactors.has("Sport intense"),
        sport_intensity: selectedFactors.has("Sport intense") ? "Intense"           : null,
        product_change:  selectedFactors.has("Nouveau produit"),
        extra_factors: {
          medication:   selectedFactors.has("Médicament"),
          travel:       selectedFactors.has("Voyage"),
          sun_exposure: selectedFactors.has("Exposition solaire"),
          new_product:  selectedFactors.has("Nouveau produit"),
        },
      },
      { onConflict: "user_id,date" }
    );
    setFactorsSaved(true);
    setTimeout(() => setCompletionStep(3), 800);
  };

  // Initialise le timer sur la première étape une fois les données chargées
  useEffect(() => {
    if (!loading && steps.length > 0) setTimeLeft(steps[0].durationMin * 60);
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (completed || steps.length === 0 || timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, [timeLeft, completed, steps.length]);

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
          { user_id: session.user.id, date: today, evening_routine_done: true },
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
        <p className="text-lg font-display text-foreground mb-2">Aucun produit du soir</p>
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

  if (completed && completionStep === 1) {
    return (
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
          <p className="text-base text-muted-foreground mb-12 leading-relaxed">
            Bonne nuit — ta perle de demain se prépare.
          </p>
        </motion.div>
        <motion.button
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          onClick={() => setCompletionStep(checkinAlreadyFilled ? 3 : 2)}
          className="w-full max-w-xs h-14 bg-primary text-primary-foreground rounded-2xl font-bold text-sm tracking-wide"
        >
          Continuer
        </motion.button>
      </motion.div>
    );
  }

  if (completed && completionStep === 2) {
    return (
      <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
        className="min-h-screen bg-[#F0EBE3] flex flex-col px-6 pt-16 pb-10"
      >
        <div className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Facteurs du jour</p>
          <h2 className="text-2xl font-display text-foreground">Quelque chose à noter ?</h2>
        </div>
        <div className="flex-1 space-y-6 mb-8">
          {FACTORS.map(({ category, pills }) => (
            <div key={category}>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">{category}</p>
              <div className="flex flex-wrap gap-2">
                {pills.map(pill => {
                  const active = selectedFactors.has(pill);
                  return (
                    <button key={pill} onClick={() => toggleFactor(pill)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
                        active ? "bg-primary text-primary-foreground border-primary"
                               : "bg-white border-border/40 text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {pill}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <AnimatePresence mode="wait">
            {factorsSaved ? (
              <motion.div key="saved" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="w-full h-12 flex items-center justify-center gap-2 bg-primary/10 rounded-full">
                <Check size={16} className="text-primary" />
                <span className="text-sm font-bold text-primary">Noté !</span>
              </motion.div>
            ) : (
              <motion.button key="save" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                onClick={saveFactors} disabled={selectedFactors.size === 0}
                className="w-full h-12 bg-primary text-primary-foreground rounded-full font-bold uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Enregistrer
              </motion.button>
            )}
          </AnimatePresence>
          <button onClick={() => setCompletionStep(3)}
            className="w-full h-10 text-[12px] text-muted-foreground/70 hover:text-foreground transition-colors"
          >
            Rien à noter aujourd'hui
          </button>
        </div>
      </motion.div>
    );
  }

  if (completed && completionStep === 3) {
    return (
      <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
        className="min-h-screen bg-[#F0EBE3] flex flex-col px-6 pt-16 pb-10"
      >
        <div className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Demain matin</p>
          <h2 className="text-2xl font-display text-foreground">Prépare ta routine</h2>
          {totalMorningMin > 0 && (
            <p className="text-sm text-muted-foreground mt-1">{totalMorningMin} min estimées</p>
          )}
        </div>
        {morningSteps.length > 0 ? (
          <div className="flex-1 space-y-2 mb-8">
            {morningSteps.map((step, i) => (
              <div key={step.id} className="bg-white rounded-2xl p-4 flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-muted/30 flex items-center justify-center text-[11px] font-bold text-muted-foreground flex-shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{step.product_name}</p>
                  {step.brand && <p className="text-[11px] text-muted-foreground">{step.brand}</p>}
                </div>
                <span className="text-[11px] text-muted-foreground flex-shrink-0">{step.durationMin} min</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="flex-1 text-sm text-muted-foreground italic">Aucun produit du matin configuré.</p>
        )}
        <button onClick={() => navigate("/dashboard")}
          className="w-full h-14 bg-primary text-primary-foreground rounded-2xl font-bold text-sm tracking-wide"
        >
          Fermer
        </button>
      </motion.div>
    );
  }

  const step = steps[currentStep];
  const timerProgress = timeLeft / (step.durationMin * 60);
  const totalMin = steps.reduce((acc, s) => acc + s.durationMin, 0);

  return (
    <div className="min-h-screen bg-[#F0EBE3] flex flex-col max-w-lg mx-auto">

      {/* Header */}
      <div className="px-5 pt-12 pb-4 flex items-center gap-3">
        <button
          onClick={() => navigate("/dashboard")}
          className="w-9 h-9 rounded-full bg-white/70 flex items-center justify-center"
        >
          <ArrowLeft size={18} strokeWidth={2} className="text-foreground" />
        </button>
        <p className="flex-1 text-xs text-muted-foreground font-medium uppercase tracking-widest">
          Routine du soir
        </p>
        <p className="text-xs text-muted-foreground">{totalMin} min</p>
      </div>

      {/* Progress bar */}
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

      {/* Step card */}
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
              <p className="text-sm text-muted-foreground mb-8">{step.brand}</p>
            )}

            {/* Circular timer */}
            <div className="relative w-36 h-36 mb-8">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60" cy="60" r={RADIUS}
                  fill="none" stroke="#F0EBE3" strokeWidth="6"
                />
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
              onClick={goNext}
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
