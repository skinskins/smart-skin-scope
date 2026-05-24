import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, Check, AlertTriangle, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRoutineProducts, type RoutineProduct } from "@/hooks/useRoutineProducts";
import { FactorsModal } from "@/components/FactorsModal";
import { supabase } from "@/integrations/supabase/client";
import { calculateCyclePhase } from "@/utils/cycle";

type Step = RoutineProduct & {
  order: number;
  durationMin: number;
};

type Incompatibility = {
  product_name: string;
  verdict: "danger" | "warning";
  reason: string;
  rule: string;
  product_id: string | null; // résolu au chargement, pas au clic
};

type AnalysisState = "idle" | "loading" | "done" | "error";

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

const RoutinePlayer = () => {
  const navigate = useNavigate();
  const { morning, evening, loading } = useRoutineProducts();
  const [currentStep, setCurrentStep] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [completionStep, setCompletionStep] = useState<1 | 3>(1);
  const [showFactorsModal, setShowFactorsModal] = useState(false);
  const [checkinAlreadyFilled, setCheckinAlreadyFilled] = useState(false);

  // INCI analysis states
  const [analysisState, setAnalysisState] = useState<AnalysisState>("idle");
  const [incompatibilities, setIncompatibilities] = useState<Incompatibility[]>([]);
  const [excludedProductIds, setExcludedProductIds] = useState<Set<string>>(new Set());
  const [decisions, setDecisions] = useState<Record<string, "remove" | "keep">>({});
  const [warningsReviewed, setWarningsReviewed] = useState(false);

  const steps = useMemo<Step[]>(() =>
    evening
      .filter(p => p.frequency === "daily")
      .map(p => ({ ...p, order: getOrder(p.product_type), durationMin: getDuration(p.product_type) }))
      .sort((a, b) => a.order - b.order),
    [evening]
  );

  const filteredSteps = useMemo<Step[]>(
    () => steps.filter(s => !excludedProductIds.has(s.id)),
    [steps, excludedProductIds]
  );

  const morningSteps = useMemo(() =>
    morning
      .filter(p => p.frequency === "daily")
      .map(p => ({ ...p, order: getOrder(p.product_type), durationMin: getDuration(p.product_type) }))
      .sort((a, b) => a.order - b.order),
    [morning]
  );
  const totalMorningMin = morningSteps.reduce((acc, s) => acc + s.durationMin, 0);

  const showPlayer = useMemo(
    () =>
      (analysisState === "done" || analysisState === "error") &&
      (incompatibilities.length === 0 || warningsReviewed),
    [analysisState, incompatibilities.length, warningsReviewed]
  );

  // Trigger INCI analysis once products are loaded
  useEffect(() => {
    if (!loading && steps.length > 0 && analysisState === "idle") {
      runInciAnalysis();
    }
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-proceed to player once every incompatibility has a decision
  useEffect(() => {
    if (
      incompatibilities.length > 0 &&
      incompatibilities.every(inc => decisions[inc.product_name])
    ) {
      setWarningsReviewed(true);
    }
  }, [decisions, incompatibilities]);

  // Initialize timer when player becomes ready
  useEffect(() => {
    if (showPlayer && filteredSteps.length > 0) {
      setTimeLeft(filteredSteps[0].durationMin * 60);
    }
  }, [showPlayer]); // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown timer
  useEffect(() => {
    if (completed || filteredSteps.length === 0 || timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, [timeLeft, completed, filteredSteps.length]);

  const runInciAnalysis = async () => {
    setAnalysisState("loading");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setAnalysisState("done"); return; }

      const today = new Date().toISOString().split("T")[0];

      // Morning products used today
      const { data: morningLogs } = await (supabase as any)
        .from("routine_product_logs")
        .select("product_id")
        .eq("user_id", session.user.id)
        .eq("date", today)
        .eq("period", "morning");

      let morningProducts: Array<{ product_name: string; brand: string }> = [];
      if (morningLogs?.length > 0) {
        const { data: mProds } = await (supabase as any)
          .from("user_products")
          .select("product_name, brand")
          .in("id", morningLogs.map((l: any) => l.product_id));
        morningProducts = mProds ?? [];
      }

      // Cycle phase from profiles
      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("last_period_date, cycle_duration, period_duration")
        .eq("id", session.user.id)
        .single();

      const { phase: cyclePhase } = calculateCyclePhase(
        profile?.last_period_date ?? null,
        profile?.cycle_duration ?? 28,
        profile?.period_duration ?? 5
      );

      // UV index from daily_weather
      const { data: weather } = await (supabase as any)
        .from("daily_weather")
        .select("uv")
        .eq("user_id", session.user.id)
        .eq("date", today)
        .maybeSingle();

      // Evening products with INCI
      const eveningProducts = steps.map(s => ({
        product_name: s.product_name,
        brand: s.brand,
        ingredients: s.ingredients,
      }));

      const { data: result, error } = await (supabase as any).functions.invoke("inci-analysis", {
        body: {
          eveningProducts,
          morningProducts,
          cyclePhase,
          uvIndex: weather?.uv ?? null,
        },
      });

      if (error || !result) {
        console.error("[inci-analysis] error:", error);
        setAnalysisState("error");
        return;
      }

      const rawIncompats: Omit<Incompatibility, "product_id">[] = result.incompatibilities ?? [];

      // Résolution product_id au chargement avec fuzzy match (Claude peut tronquer les noms)
      const incompats: Incompatibility[] = rawIncompats.map(inc => {
        const b = inc.product_name.toLowerCase().trim();
        const matched = steps.find(s => {
          const a = s.product_name.toLowerCase().trim();
          return a === b || a.includes(b) || b.includes(a);
        });
        return { ...inc, product_id: matched?.id ?? null };
      });

      // Fire-and-forget — nécessite RLS INSERT sur daily_inci_verdicts
      incompats.forEach(inc => {
        (supabase as any).from("daily_inci_verdicts").insert({
          user_id: session.user.id,
          date: today,
          product_id: inc.product_id,
          product_name: inc.product_name,
          verdict: inc.verdict,
          reason: inc.reason,
          rule_id: inc.rule,
        });
      });

      setIncompatibilities(incompats);
      setAnalysisState("done");
    } catch (err) {
      console.error("[inci-analysis] runInciAnalysis error:", err);
      setAnalysisState("error");
    }
  };

  // Fuzzy match : exact insensible à la casse, puis contains dans les deux sens
  const getProductIdByName = (name: string): string | undefined => {
    const b = name.toLowerCase().trim();
    return steps.find(s => {
      const a = s.product_name.toLowerCase().trim();
      return a === b || a.includes(b) || b.includes(a);
    })?.id;
  };

  const handleRemoveProduct = (productName: string) => {
    // product_id résolu au chargement — pas de risque de mismatch au clic
    const inc = incompatibilities.find(i => i.product_name === productName);
    const id = inc?.product_id ?? getProductIdByName(productName);
    if (id) {
      setExcludedProductIds(prev => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    }
    setDecisions(prev => ({ ...prev, [productName]: "remove" }));
  };

  const handleKeepProduct = (productName: string) => {
    const inc = incompatibilities.find(i => i.product_name === productName);
    const id = inc?.product_id ?? getProductIdByName(productName);
    if (id) {
      setExcludedProductIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
    setDecisions(prev => ({ ...prev, [productName]: "keep" }));
  };

  const goNext = async () => {
    if (currentStep < filteredSteps.length - 1) {
      const next = currentStep + 1;
      setCurrentStep(next);
      setTimeLeft(filteredSteps[next].durationMin * 60);
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
        const alreadyFilled = !!checkin;
        setCheckinAlreadyFilled(alreadyFilled);
      }
      setCompleted(true);
    }
  };

  // ── Loading screens ────────────────────────────────────────────────────────

  if (loading || analysisState === "loading") {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#F0EBE3] gap-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        {analysisState === "loading" && (
          <p className="text-xs text-muted-foreground font-medium">Analyse de compatibilité INCI…</p>
        )}
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

  // ── Incompatibilities screen ───────────────────────────────────────────────

  if (incompatibilities.length > 0 && !warningsReviewed) {
    const dangerCount = incompatibilities.filter(i => i.verdict === "danger").length;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-[#F0EBE3] flex flex-col max-w-lg mx-auto"
      >
        {/* Header */}
        <div className="px-5 pt-12 pb-4 flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="w-9 h-9 rounded-full bg-white/70 flex items-center justify-center"
          >
            <ArrowLeft size={18} strokeWidth={2} className="text-foreground" />
          </button>
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Analyse INCI
            </p>
            <h2 className="text-xl font-display text-foreground leading-tight">
              Points d'attention
            </h2>
          </div>
          {dangerCount > 0 && (
            <ShieldAlert size={22} className="text-red-400 flex-shrink-0" />
          )}
        </div>

        <div className="flex-1 px-5 pb-6 overflow-y-auto space-y-3">
          {incompatibilities.map((inc, i) => {
            const decision = decisions[inc.product_name];
            const isDanger = inc.verdict === "danger";

            return (
              <div
                key={i}
                className={`bg-white rounded-2xl p-4 border-l-4 ${
                  isDanger ? "border-red-400" : "border-amber-400"
                }`}
              >
                <div className="flex items-start gap-2 mb-3">
                  <AlertTriangle
                    size={15}
                    className={`flex-shrink-0 mt-0.5 ${isDanger ? "text-red-400" : "text-amber-400"}`}
                  />
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${
                      isDanger ? "text-red-500" : "text-amber-500"
                    }`}>
                      {isDanger ? "Incompatible" : "Attention"}
                    </p>
                    <p className="text-sm font-bold text-foreground">{inc.product_name}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{inc.reason}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleRemoveProduct(inc.product_name)}
                    className={`flex-1 h-9 rounded-xl text-[11px] font-bold transition-all ${
                      decision === "remove"
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    Retirer ce soir
                  </button>
                  <button
                    onClick={() => handleKeepProduct(inc.product_name)}
                    className={`flex-1 h-9 rounded-xl text-[11px] font-bold border transition-all ${
                      decision === "keep"
                        ? "bg-white border-primary/40 text-primary"
                        : "bg-white border-border/40 text-muted-foreground"
                    }`}
                  >
                    Garder quand même
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-5 pb-10">
          <button
            onClick={() => setWarningsReviewed(true)}
            className="w-full h-14 bg-primary text-primary-foreground rounded-2xl font-bold text-sm tracking-wide"
          >
            Commencer ma routine
          </button>
        </div>
      </motion.div>
    );
  }

  // ── Completion screens ─────────────────────────────────────────────────────

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
          onClick={() => { if (!checkinAlreadyFilled) setShowFactorsModal(true); else setCompletionStep(3); }}
          className="w-full max-w-xs h-14 bg-primary text-primary-foreground rounded-2xl font-bold text-sm tracking-wide"
        >
          Continuer
        </motion.button>
      </motion.div>
      <FactorsModal
        open={showFactorsModal}
        onClose={() => { setShowFactorsModal(false); setCompletionStep(3); }}
        onSaved={() => { setShowFactorsModal(false); setCompletionStep(3); }}
      />
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

  // ── Player ─────────────────────────────────────────────────────────────────

  if (filteredSteps.length === 0) {
    return (
      <div className="min-h-screen bg-[#F0EBE3] flex flex-col items-center justify-center px-6 text-center">
        <p className="text-lg font-display text-foreground mb-2">Tous les produits ont été retirés</p>
        <p className="text-sm text-muted-foreground mb-8">
          Aucun produit compatible ce soir. Ta peau te remercie !
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

  const step = filteredSteps[currentStep];
  const timerProgress = timeLeft / (step.durationMin * 60);
  const totalMin = filteredSteps.reduce((acc, s) => acc + s.durationMin, 0);

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
            animate={{ width: `${((currentStep + 1) / filteredSteps.length) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <p className="text-[11px] text-muted-foreground">
            Étape {currentStep + 1}/{filteredSteps.length}
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
              {currentStep < filteredSteps.length - 1 ? (
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
